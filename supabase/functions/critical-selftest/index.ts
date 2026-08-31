// critical-selftest
//
// Dagelijkse zelftest op de kritieke publieke paden. Achtergrond: de RPC
// achter "programma samenstellen" was ruim twee maanden stuk (type-mismatch
// in de database) zonder dat wij iets zagen — de klant kreeg alleen een
// "tijdelijke storing". Unit-tests konden dit per definitie niet zien: de
// fout zat in de live database, niet in de code.
//
// Deze functie doet daarom wat een klant doet: ze roept de echte publieke
// RPC's, views en edge functions aan met de anon-sleutel, ruimt haar eigen
// testdata weer op, en meldt afwijkingen.
//
// Bij falen:
//  1. probeert `selftest_autofix()` de enige veilig automatiseerbare
//     categorie te herstellen (ontbrekende publieke rechten) en herhaalt
//     de gefaalde checks;
//  2. mailt het admin-adres met per check de fout + fix-hint;
//  3. zet een Werkbank-taak met hoge prioriteit (gededupliceerd per dag).
//
// Elke run wordt vastgelegd in `selftest_runs` en is zichtbaar op
// /admin/email-health.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { sendMailjet } from "../_shared/mailjet-send.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

export interface CheckResult {
  key: string;
  label: string;
  severity: "critical" | "warning";
  ok: boolean;
  detail: string;
  fixHint?: string;
  durationMs: number;
  /** true als de check pas slaagde ná een automatische herstelpoging */
  fixedByAutofix?: boolean;
}

const SELFTEST_EMAIL = "selftest@bureauvlieland.nl";
const SELFTEST_NAME = "ZELFTEST — niet verwerken";

/** Een fout die op ontbrekende rechten duidt kunnen we automatisch herstellen. */
export function isPermissionFailure(detail: string): boolean {
  return /permission denied|42501|not allowed to|must be owner|no privileges/i.test(detail);
}

/** Bepaalt de run-status uit de checks. */
export function deriveStatus(checks: CheckResult[]): "success" | "failed" {
  return checks.some((c) => !c.ok) ? "failed" : "success";
}

async function timed(
  key: string,
  label: string,
  severity: "critical" | "warning",
  fixHint: string,
  fn: () => Promise<string>,
): Promise<CheckResult> {
  const t0 = Date.now();
  try {
    const detail = await fn();
    return { key, label, severity, ok: true, detail, durationMs: Date.now() - t0 };
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    return { key, label, severity, ok: false, detail, fixHint, durationMs: Date.now() - t0 };
  }
}

function isoDate(offsetDays: number): string {
  const d = new Date(Date.now() + offsetDays * 86_400_000);
  return d.toISOString().slice(0, 10);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const admin = createClient(supabaseUrl, serviceKey);
  // Anon-client: exact het pad dat een bezoeker loopt.
  const anon = createClient(supabaseUrl, anonKey);

  let body: Record<string, unknown> = {};
  if (req.method === "POST") {
    body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  }
  const triggeredBy = typeof body.triggeredBy === "string" ? body.triggeredBy : "manual";
  const skipAlert = body.skipAlert === true;

  const { data: runRow } = await admin
    .from("selftest_runs")
    .insert({ triggered_by: triggeredBy, status: "running" })
    .select("id")
    .single();
  const runId = runRow?.id as string | undefined;

  const cleanupIds: string[] = [];

  // ---------------------------------------------------------------- checks
  const runChecks = async (): Promise<CheckResult[]> => {
    const results: CheckResult[] = [];

    // 1) De echte submit-RPC van "programma samenstellen" — de check die de
    //    storing van juni t/m augustus zou hebben gevangen.
    results.push(
      await timed(
        "self_service_submit",
        "Online aanvraag (programma samenstellen)",
        "critical",
        "Controleer public.submit_self_service_program_request: kolomtypen (selected_dates = jsonb) en de triggers op program_request_items.",
        async () => {
          const requestId = crypto.randomUUID();
          const token = `selftest${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}`;
          const { error } = await anon.rpc("submit_self_service_program_request", {
            p_request: {
              id: requestId,
              customer_token: token,
              customer_name: SELFTEST_NAME,
              customer_email: SELFTEST_EMAIL,
              customer_phone: "0000000000",
              number_of_people: 2,
              selected_dates: [isoDate(120)],
              general_notes: "Automatische dagelijkse zelftest — mag verwijderd worden.",
              origin: "self_service",
              quote_status: "concept",
            },
            p_items: [
              {
                block_name: "Zelftest-onderdeel",
                block_category: "activiteit",
                provider_name: "Zelftest",
                provider_id: "zelftest",
                block_type: "activity",
                day_index: 0,
                status: "pending",
                skip_partner_notification: true,
                price_type: "per_person",
              },
            ],
          });
          cleanupIds.push(requestId);
          if (error) throw new Error(`${error.code ?? ""} ${error.message}`.trim());

          const { data: check, error: checkErr } = await admin
            .from("program_requests")
            .select("id, program_request_items(id)")
            .eq("id", requestId)
            .maybeSingle();
          if (checkErr) throw new Error(`verificatie mislukt: ${checkErr.message}`);
          const itemCount = (check?.program_request_items as unknown[] | null)?.length ?? 0;
          if (!check || itemCount === 0) {
            throw new Error("aanvraag is opgeslagen zonder onderdelen");
          }
          return `aanvraag + ${itemCount} onderdeel opgeslagen en opgeruimd`;
        },
      ),
    );

    // 2) Publieke catalogus (bouwstenen / activiteitenpagina's)
    results.push(
      await timed(
        "public_building_blocks",
        "Publieke bouwstenen-catalogus",
        "critical",
        "Herstel leesrechten: GRANT SELECT ON public.building_blocks TO anon (autofix doet dit).",
        async () => {
          const { data, error } = await anon
            .from("building_blocks")
            .select("id")
            .eq("status", "published")
            .limit(1);
          if (error) throw new Error(`${error.code ?? ""} ${error.message}`.trim());
          if (!data || data.length === 0) throw new Error("geen gepubliceerde bouwstenen zichtbaar voor bezoekers");
          return `catalogus leesbaar (${data.length} rij gecontroleerd)`;
        },
      ),
    );

    // 3) Partnerdirectory-view
    results.push(
      await timed(
        "public_partners_view",
        "Publieke partnerdirectory",
        "warning",
        "Herstel leesrechten op public.partners_public (autofix doet dit).",
        async () => {
          const { data, error } = await anon.from("partners_public").select("id").limit(1);
          if (error) throw new Error(`${error.code ?? ""} ${error.message}`.trim());
          return `view leesbaar (${data?.length ?? 0} rij)`;
        },
      ),
    );

    // 4) Prijsstructuur (fee-engine op de site)
    results.push(
      await timed(
        "pricing_structures",
        "Prijsstructuur (organisatiefee)",
        "critical",
        "Herstel leesrechten op public.pricing_structures en controleer of er een actieve structuur is.",
        async () => {
          const { data, error } = await anon.from("pricing_structures").select("id").limit(1);
          if (error) throw new Error(`${error.code ?? ""} ${error.message}`.trim());
          if (!data || data.length === 0) throw new Error("geen prijsstructuur zichtbaar");
          return "prijsstructuur leesbaar";
        },
      ),
    );

    // 5) Klantpagina-token-pad (edge function moet net 4xx geven, geen 500)
    results.push(
      await timed(
        "customer_portal_token",
        "Klantpagina (token-controle)",
        "critical",
        "get-customer-program moet een nette 4xx geven bij een onbekend token; een 500 duidt op een SQL/kolomfout.",
        async () => {
          const res = await fetch(`${supabaseUrl}/functions/v1/get-customer-program`, {
            method: "POST",
            headers: { "Content-Type": "application/json", apikey: anonKey },
            body: JSON.stringify({ token: "selftest-onbekend-token" }),
          });
          await res.text();
          if (res.status >= 500) throw new Error(`onverwachte serverfout (HTTP ${res.status})`);
          return `nette afhandeling van onbekend token (HTTP ${res.status})`;
        },
      ),
    );

    // 6) Gedeeld programma-RPC
    results.push(
      await timed(
        "shared_program_rpc",
        "Gedeeld programma (deellink)",
        "warning",
        "Controleer public.get_shared_program(text) en de EXECUTE-rechten voor anon.",
        async () => {
          const { error } = await anon.rpc("get_shared_program", { _share_code: "selftest-onbekend" });
          if (error && !/not found|niet gevonden|no rows/i.test(error.message)) {
            throw new Error(`${error.code ?? ""} ${error.message}`.trim());
          }
          return "RPC bereikbaar en foutvrij";
        },
      ),
    );

    // 7) Live veerbootdata (Doeksen)
    results.push(
      await timed(
        "ferry_api",
        "Veerboottijden (Doeksen live API)",
        "warning",
        "Controleer get-ferry-departures en de Doeksen-API; zonder deze data vallen boot-onderdelen terug op leeg.",
        async () => {
          const res = await fetch(`${supabaseUrl}/functions/v1/get-ferry-departures`, {
            method: "POST",
            headers: { "Content-Type": "application/json", apikey: anonKey },
            body: JSON.stringify({ date: isoDate(3) }),
          });
          const text = await res.text();
          if (!res.ok) throw new Error(`HTTP ${res.status}: ${text.slice(0, 180)}`);
          return "veerbootdata opgehaald";
        },
      ),
    );

    // 8) Mailinfrastructuur aanwezig (geen mail versturen, alleen config)
    results.push(
      await timed(
        "mail_config",
        "Mailconfiguratie",
        "critical",
        "Zet MAILJET_API_KEY en MAILJET_SECRET_KEY als secret; zonder deze gaan er geen mails uit.",
        async () => {
          if (!Deno.env.get("MAILJET_API_KEY") || !Deno.env.get("MAILJET_SECRET_KEY")) {
            throw new Error("Mailjet-credentials ontbreken");
          }
          return "credentials aanwezig";
        },
      ),
    );

    // 9) Recente uitgaande mail niet massaal gefaald
    results.push(
      await timed(
        "recent_email_failures",
        "Uitgaande e-mail (laatste 24 uur)",
        "warning",
        "Bekijk /admin/email-health voor de gefaalde mails en de foutmelding per rij.",
        async () => {
          const since = new Date(Date.now() - 86_400_000).toISOString();
          const { count, error } = await admin
            .from("email_log")
            .select("id", { count: "exact", head: true })
            .gte("created_at", since)
            .eq("status", "failed");
          if (error) throw new Error(error.message);
          if ((count ?? 0) > 3) throw new Error(`${count} mails gefaald in de laatste 24 uur`);
          return `${count ?? 0} gefaalde mails in 24 uur`;
        },
      ),
    );

    return results;
  };

  const cleanup = async () => {
    for (const id of cleanupIds) {
      await admin.from("program_request_items").delete().eq("request_id", id);
      await admin.from("program_request_history").delete().eq("request_id", id);
      await admin.from("program_requests").delete().eq("id", id);
    }
    // Vangnet: eerdere zelftest-restanten
    await admin.from("program_requests").delete().eq("customer_email", SELFTEST_EMAIL);
    cleanupIds.length = 0;
  };

  try {
    let checks = await runChecks();
    await cleanup();

    // -------------------------------------------------------------- autofix
    const autofixes: Array<Record<string, unknown>> = [];
    const repairable = checks.filter((c) => !c.ok && isPermissionFailure(c.detail));
    if (repairable.length > 0) {
      const { data: fixData, error: fixError } = await admin.rpc("selftest_autofix");
      autofixes.push({
        attempted_for: repairable.map((c) => c.key),
        applied: fixError ? null : fixData,
        error: fixError?.message ?? null,
        at: new Date().toISOString(),
      });
      if (!fixError) {
        const retried = await runChecks();
        await cleanup();
        checks = retried.map((r) => {
          const before = checks.find((c) => c.key === r.key);
          return before && !before.ok && r.ok ? { ...r, fixedByAutofix: true } : r;
        });
      }
    }

    const failed = checks.filter((c) => !c.ok);
    const status = deriveStatus(checks);

    // ---------------------------------------------------------------- alert
    let alertSent = false;
    let alertSkipped: string | null = null;

    if (failed.length > 0 && !skipAlert) {
      // Dedupe: max 1 alert per 12 uur
      const cutoff = new Date(Date.now() - 12 * 3600_000).toISOString();
      const { data: recent } = await admin
        .from("selftest_runs")
        .select("id")
        .not("alerted_at", "is", null)
        .gte("alerted_at", cutoff)
        .limit(1);

      if (recent && recent.length > 0) {
        alertSkipped = "reeds gealert binnen 12 uur";
      } else {
        const { data: setting } = await admin
          .from("app_settings")
          .select("value")
          .eq("id", "bureau_admin_email")
          .maybeSingle();
        const rawTo = setting?.value;
        const to = (typeof rawTo === "string" ? rawTo : rawTo ? String(rawTo) : "") ||
          Deno.env.get("ADMIN_ALERT_EMAIL") || "administratie@bureauvlieland.nl";

        const rows = checks
          .map((c) => {
            const icon = c.ok ? (c.fixedByAutofix ? "🛠️" : "✅") : c.severity === "critical" ? "🛑" : "⚠️";
            return `<tr>
              <td style="padding:6px 8px;border-bottom:1px solid #eee;">${icon}</td>
              <td style="padding:6px 8px;border-bottom:1px solid #eee;"><strong>${c.label}</strong><br><span style="color:#666;font-size:12px;">${c.detail}</span>${
              c.ok ? "" : `<br><span style="color:#b45309;font-size:12px;">Fix: ${c.fixHint ?? "—"}</span>`
            }</td>
              <td style="padding:6px 8px;border-bottom:1px solid #eee;color:#666;font-size:12px;">${c.durationMs} ms</td>
            </tr>`;
          })
          .join("");

        const fixedCount = checks.filter((c) => c.fixedByAutofix).length;
        const html = `<p>De dagelijkse kritieke-pad-test vond <strong>${failed.length} probleem(en)</strong>.</p>
          ${fixedCount > 0 ? `<p>${fixedCount} probleem is automatisch hersteld (ontbrekende rechten).</p>` : ""}
          <table style="border-collapse:collapse;font-family:system-ui,sans-serif;font-size:14px;">${rows}</table>
          <p style="margin-top:16px;">Details: <a href="https://bureauvlieland.nl/admin/email-health">Systeemgezondheid in de admin</a></p>`;

        const send = await sendMailjet({
          source: "critical-selftest",
          checkSuppression: false,
          messages: [{
            From: {
              Email: Deno.env.get("MAILJET_FROM_EMAIL") ?? "noreply@bureauvlieland.nl",
              Name: "Bureau Vlieland Monitor",
            },
            To: [{ Email: to }],
            Subject: `[ALERT] Kritieke zelftest: ${failed.length} probleem(en) — ${
              failed.map((f) => f.label).slice(0, 2).join(", ")
            }`,
            HTMLPart: html,
            TextPart: html.replace(/<[^>]+>/g, " "),
          }],
        });
        if (send.ok) alertSent = true;
        else alertSkipped = `mail faalde: ${send.error}`;

        // Werkbank-taak (1 per dag)
        const autoEntityId = `selftest-${isoDate(0)}`;
        const { data: existingTodo } = await admin
          .from("admin_todos")
          .select("id")
          .eq("auto_type", "critical_selftest_failure")
          .eq("auto_entity_id", autoEntityId)
          .neq("status", "done")
          .maybeSingle();
        if (!existingTodo) {
          await admin.from("admin_todos").insert({
            title: `Kritieke zelftest faalt: ${failed.map((f) => f.label).join(", ")}`,
            description: failed
              .map((f) => `• ${f.label}: ${f.detail}\n  Fix: ${f.fixHint ?? "—"}`)
              .join("\n"),
            priority: "high",
            status: "todo",
            auto_type: "critical_selftest_failure",
            auto_entity_id: autoEntityId,
          });
        }
      }
    }

    if (runId) {
      await admin
        .from("selftest_runs")
        .update({
          finished_at: new Date().toISOString(),
          status,
          checks,
          failed_count: failed.length,
          autofixes,
          alerted_at: alertSent ? new Date().toISOString() : null,
        })
        .eq("id", runId);
    }

    return json({ ok: true, runId, status, checks, autofixes, alertSent, alertSkipped });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[critical-selftest] failed:", msg);
    await cleanup().catch(() => {});
    if (runId) {
      await admin
        .from("selftest_runs")
        .update({ finished_at: new Date().toISOString(), status: "error", error_message: msg })
        .eq("id", runId);
    }
    return json({ ok: false, error: msg }, 500);
  }
});
