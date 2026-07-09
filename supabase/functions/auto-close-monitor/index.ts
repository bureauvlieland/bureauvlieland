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
// dan administratie@bureauvlieland.nl). Elke run wordt maar één keer
// gealert (alerted_at op de run-rij). Voor `missing_run` wordt een
// synthetische rij ingevoegd zodat we niet elke minuut mailen.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { sendMailjet } from "../_shared/mailjet-send.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const STALE_HOURS = 26; // verwachte cadans is ~dagelijks
const STUCK_MIN = 30;
const DEDUPE_HOURS = 12; // niet vaker mailen dan elke 12u over hetzelfde probleem

type Health = "healthy" | "missing_run" | "errors" | "stuck";

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
  return Deno.env.get("ADMIN_ALERT_EMAIL") ?? "administratie@bureauvlieland.nl";
}

function buildEmail(health: Health, run: RunRow | null): { subject: string; html: string } {
  const base = "Auto-close monitor · Bureau Vlieland";
  const url = "https://bureauvlieland.nl/admin/email-health";
  if (health === "missing_run") {
    return {
      subject: `[ALERT] ${base}: geen run in >${STALE_HOURS} uur`,
      html: `<p>De <code>auto-close-past-execution</code> cron heeft in de laatste ${STALE_HOURS} uur geen enkele run geregistreerd.</p>
             <p>Controleer de cron in de backend of draai de functie handmatig via <a href="${url}">${url}</a>.</p>`,
    };
  }
  if (health === "errors") {
    return {
      subject: `[ALERT] ${base}: laatste run had errors`,
      html: `<p>Laatste run (id <code>${run?.id}</code>, gestart ${run?.started_at}) eindigde met status <strong>${run?.status}</strong>.</p>
             <p><strong>Fout:</strong> ${run?.error_message ?? "(zie result JSON)"}</p>
             <pre style="background:#f5f5f5;padding:8px;font-size:12px;white-space:pre-wrap;">${
               JSON.stringify(run?.result ?? {}, null, 2)
             }</pre>
             <p>Bekijk details op <a href="${url}">${url}</a>.</p>`,
    };
  }
  if (health === "stuck") {
    return {
      subject: `[ALERT] ${base}: run staat vast op 'running'`,
      html: `<p>Run <code>${run?.id}</code> is gestart op ${run?.started_at} en staat al langer dan ${STUCK_MIN} minuten op status <strong>running</strong>.</p>
             <p>Waarschijnlijk is de edge function gecrasht zonder afronding. Check logs.</p>`,
    };
  }
  return { subject: "", html: "" };
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
        const { subject, html } = buildEmail(effectiveHealth, latest);
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
