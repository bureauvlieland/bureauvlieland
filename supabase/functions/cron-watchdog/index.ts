// cron-watchdog
//
// WAAROM
// De cron-dashboards toonden tot nu toe alleen of een aanroep VERSTUURD was,
// niet of de functie erachter geslaagd is. Een edge function die met een 500
// crasht zag er dus groen uit. Sinds `cron_dispatch_log` leggen we de echte
// HTTP-uitkomst vast; deze watchdog beoordeelt die uitkomsten dagelijks en
// slaat alarm als een taak niet draait of stil faalt.
//
// Beoordeling per actieve taak (uit public.get_scheduled_job_health()):
//   nooit_gedraaid   → alarm
//   aanroep_mislukt  → alarm (pg_cron zelf faalde)
//   fout             → alarm (HTTP >= 400 of netwerkfout)
//   stil (geen run binnen 2x de verwachte cadans) → alarm
//   onbekend         → alleen melden, geen alarm (respons buiten bewaartermijn)
//
// Alarm = admin-todo (max 1 open per taak) + één verzamelmail naar het
// admin-adres, met dedupe van 12 uur.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { sendMailjet } from "../_shared/mailjet-send.ts";
import { logEmail } from "../_shared/email-logger.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const DEDUPE_HOURS = 12;
const HEALTH_URL = "https://bureauvlieland.nl/admin/email-health";

import { type JobHealth, judge, type Verdict } from "./logic.ts";

async function getAdminEmail(supabase: ReturnType<typeof createClient>): Promise<string> {
  try {
    const { data } = await supabase
      .from("app_settings")
      .select("value")
      .eq("id", "bureau_admin_email")
      .maybeSingle();
    const raw = (data as { value?: unknown } | null)?.value;
    const email = typeof raw === "string" ? raw : raw ? String(raw) : "";
    if (email) return email;
  } catch { /* ignore */ }
  return Deno.env.get("ADMIN_ALERT_EMAIL") ?? "hallo@bureauvlieland.nl";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    const { data, error } = await supabase.rpc("get_scheduled_job_health");
    if (error) throw new Error(`taakstatus ophalen: ${error.message}`);

    const jobs = (data ?? []) as JobHealth[];
    const now = Date.now();
    const verdicts = jobs
      .map((j) => judge(j, now))
      .filter((v): v is Verdict => v !== null);

    const alarms = verdicts.filter((v) => v.level === "alarm");
    const infos = verdicts.filter((v) => v.level === "info");

    // Admin-todo per falende taak (max één open).
    for (const alarm of alarms) {
      const { data: existing } = await supabase
        .from("admin_todos")
        .select("id")
        .eq("auto_type", "system_cron_failure")
        .eq("auto_entity_id", alarm.jobname)
        .neq("status", "done")
        .limit(1);
      if (existing && existing.length > 0) continue;

      await supabase.from("admin_todos").insert({
        auto_type: "system_cron_failure",
        auto_entity_id: alarm.jobname,
        title: `Automatische taak faalt: ${alarm.jobname}`,
        description: alarm.reason,
        priority: "high",
        status: "open",
      });
    }

    // Verzamelmail met dedupe.
    let mailed = false;
    if (alarms.length > 0) {
      const cutoff = new Date(now - DEDUPE_HOURS * 3600_000).toISOString();
      const { data: recent } = await supabase
        .from("email_log")
        .select("id")
        .eq("email_type", "cron_watchdog_alert")
        .gte("created_at", cutoff)
        .limit(1);

      if (!recent || recent.length === 0) {
        const to = await getAdminEmail(supabase);
        const rows = alarms
          .map((a) => `<li><strong>${a.jobname}</strong> — ${a.reason}</li>`)
          .join("");
        const subject = `[ALERT] ${alarms.length} automatische taak/taken falen`;
        const html =
          `<p>De volgende geplande taken draaien niet of eindigen met een fout:</p><ul>${rows}</ul>` +
          `<p>Bekijk de status op <a href="${HEALTH_URL}">${HEALTH_URL}</a>.</p>`;

        const send = await sendMailjet({
          source: "cron-watchdog",
          // Technisch alarm naar het eigen admin-adres: altijd doorlaten.
          checkSuppression: false,
          messages: [{
            From: {
              Email: Deno.env.get("MAILJET_FROM_EMAIL") ?? "noreply@bureauvlieland.nl",
              Name: "Bureau Vlieland Monitor",
            },
            To: [{ Email: to }],
            Subject: subject,
            HTMLPart: html,
            TextPart: html.replace(/<[^>]+>/g, ""),
          }],
        });

        await logEmail({
          email_type: "cron_watchdog_alert",
          subject,
          recipient_email: to,
          status: send.ok ? "sent" : "failed",
          error_message: send.ok ? undefined : send.error,
          mailjet_message_id: send.ok ? send.messageId ?? undefined : undefined,
          sent_by: "cron-watchdog",
          html_body: html,
          metadata: {
            template_name: "cron_watchdog_alert",
            actor: "system",
            jobs: alarms.map((a) => a.jobname),
          },
        });

        mailed = true;
      }
    }

    return new Response(
      JSON.stringify({
        ok: true,
        checked: jobs.length,
        alarms,
        infos,
        mailed,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("cron-watchdog error:", err);
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
