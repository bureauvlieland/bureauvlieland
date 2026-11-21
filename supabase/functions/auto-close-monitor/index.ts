// auto-close-monitor
//
// Bewaakt de auto-close-past-execution cron. Roept `check` aan (GET of POST
// zonder body) om de gezondheid van de laatste run te bepalen:
//
//  - healthy       : laatste succesvolle run < STALE_HOURS geleden
//  - missing_run   : geen enkele run in de laatste STALE_HOURS uur
//  - errors        : laatste run had errors of eindigde in status='error'
//  - stuck         : laatste run staat > STUCK_MIN minuten op 'running'
//
// Bij een probleem wordt een e-mail gestuurd naar het admin-adres (
// `bureau_admin_email` uit app_settings, fallback ADMIN_ALERT_EMAIL env,
// dan het algemene bureauadres). De tekst staat in texts.ts: eerst wat het
// voor het bureau betekent en wat te doen, daaronder de techniek. Elke run
// wordt maar één keer
// gealert (alerted_at op de run-rij). Voor `missing_run` wordt een
// synthetische rij ingevoegd zodat we niet elke minuut mailen.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { sendMailjet } from "../_shared/mailjet-send.ts";
import { logEmail } from "../_shared/email-logger.ts";
import { GENERAL_CONTACT_EMAIL } from "../_shared/bureau-contact.ts";
import { buildAutoCloseEmail, type Health } from "./texts.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const STALE_HOURS = 26; // verwachte cadans is ~dagelijks
const STUCK_MIN = 30;
const DEDUPE_HOURS = 12; // niet vaker mailen dan elke 12u over hetzelfde probleem

interface RunRow {
  id: string;
  started_at: string;
  finished_at: string | null;
  status: "running" | "success" | "error";
  dry_run: boolean;
  triggered_by: string | null;
  result: Record<string, unknown> | null;
  error_message: string | null;
  alerted_at: string | null;
}

async function getAdminEmail(supabase: any): Promise<string> {
  try {
    const { data } = await supabase
      .from("app_settings")
      .select("value")
      .eq("id", "bureau_admin_email")
      .maybeSingle();
    const raw = data?.value;
    const email = typeof raw === "string" ? raw : raw ? String(raw) : "";
    if (email) return email;
  } catch {
    // ignore
  }
  // Eén terugvaladres voor alle systeemalarmen.
  return Deno.env.get("ADMIN_ALERT_EMAIL") ?? GENERAL_CONTACT_EMAIL;
}

async function alreadyAlertedForMissing(supabase: any): Promise<boolean> {
  const cutoff = new Date(Date.now() - DEDUPE_HOURS * 3600_000).toISOString();
  const { data } = await supabase
    .from("auto_close_run_log")
    .select("id")
    .eq("triggered_by", "monitor-missing")
    .gte("started_at", cutoff)
    .limit(1);
  return !!(data && data.length > 0);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    // Optionele forceer-flag om altijd een test-alert te sturen
    let forceAlert = false;
    if (req.method === "POST") {
      try {
        const body = await req.json();
        forceAlert = !!body?.testAlert;
      } catch { /* geen body */ }
    }

    const staleCutoff = new Date(Date.now() - STALE_HOURS * 3600_000).toISOString();
    const stuckCutoff = new Date(Date.now() - STUCK_MIN * 60_000).toISOString();

    const { data: rows, error } = await supabase
      .from("auto_close_run_log")
      .select("*")
      .eq("dry_run", false)
      .not("triggered_by", "eq", "monitor-missing")
      .order("started_at", { ascending: false })
      .limit(1);
    if (error) throw new Error(`load runs: ${error.message}`);

    const latest = (rows?.[0] ?? null) as RunRow | null;

    let health: Health = "healthy";
    if (!latest || latest.started_at < staleCutoff) {
      health = "missing_run";
    } else if (latest.status === "error" || (latest.result as any)?.errors?.length) {
      health = "errors";
    } else if (latest.status === "running" && latest.started_at < stuckCutoff) {
      health = "stuck";
    }

    let alertSent = false;
    let alertSkipped: string | null = null;

    if (health !== "healthy" || forceAlert) {
      const effectiveHealth: Health = forceAlert && health === "healthy" ? "errors" : health;

      // Dedupe
      if (!forceAlert) {
        if (effectiveHealth === "missing_run") {
          if (await alreadyAlertedForMissing(supabase)) {
            alertSkipped = "reeds binnen dedupe-venster gealert (missing_run)";
          }
        } else if (latest?.alerted_at) {
          alertSkipped = "run reeds gealert";
        }
      }

      if (!alertSkipped) {
        const to = await getAdminEmail(supabase);
        const { subject, html } = buildAutoCloseEmail(effectiveHealth, latest, {
          staleHours: STALE_HOURS,
          stuckMinutes: STUCK_MIN,
        });
        const finalSubject = forceAlert ? `[TEST] ${subject}` : subject;
        const send = await sendMailjet({
          source: "auto-close-monitor",
          checkSuppression: false,
          messages: [{
            From: {
              Email: Deno.env.get("MAILJET_FROM_EMAIL") ?? "noreply@bureauvlieland.nl",
              Name: "Bureau Vlieland Monitor",
            },
            To: [{ Email: to }],
            Subject: finalSubject,
            HTMLPart: html,
            TextPart: html.replace(/<[^>]+>/g, ""),
          }],
        });
        // Alarmmail in email_log, zodat het Berichtencentrum hem ook ziet.
        await logEmail({
          email_type: "auto_close_monitor_alert",
          subject: finalSubject,
          recipient_email: to,
          status: send.ok ? "sent" : "failed",
          error_message: send.ok ? undefined : send.error,
          mailjet_message_id: send.ok ? send.messageId ?? undefined : undefined,
          sent_by: "auto-close-monitor",
          html_body: html,
          metadata: {
            template_name: "auto_close_monitor_alert",
            actor: "system → bureau (auto-close monitor)",
            health: effectiveHealth,
            run_id: latest?.id ?? null,
            test_alert: forceAlert,
          },
        });
        if (send.ok) {
          alertSent = true;
          if (effectiveHealth === "missing_run") {
            await supabase.from("auto_close_run_log").insert({
              status: "error",
              dry_run: false,
              triggered_by: "monitor-missing",
              error_message: `Geen auto-close run in de laatste ${STALE_HOURS} uur`,
              finished_at: new Date().toISOString(),
              alerted_at: new Date().toISOString(),
            });
          } else if (latest?.id) {
            await supabase
              .from("auto_close_run_log")
              .update({ alerted_at: new Date().toISOString() })
              .eq("id", latest.id);
          }
        } else {
          alertSkipped = `mail faalde: ${send.error}`;
        }
      }
    }

    return new Response(
      JSON.stringify({
        ok: true,
        health,
        latest,
        alertSent,
        alertSkipped,
        thresholds: { staleHours: STALE_HOURS, stuckMinutes: STUCK_MIN, dedupeHours: DEDUPE_HOURS },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[auto-close-monitor] failed:", msg);
    return new Response(JSON.stringify({ ok: false, error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
