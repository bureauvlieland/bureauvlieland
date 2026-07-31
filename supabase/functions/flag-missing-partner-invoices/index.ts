import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  buildReconciliationRows,
  type ReconRow,
} from "../_shared/commissionReconciliation.ts";
import { loadReconciliationInputs } from "../_shared/commissionReconciliationData.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const euro = (n: number) =>
  new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" }).format(n);

/**
 * Bepaalt of een rij oud genoeg is om te signaleren.
 * `ageDays` telt vanaf uitvoering (ontbrekende factuur) of registratie
 * (niet-gekoppelde factuur); rijen zonder datum worden niet gesignaleerd.
 */
export function shouldFlag(
  row: Pick<ReconRow, "status" | "ageDays">,
  cfg: { missingDays: number; unlinkedDays: number },
): boolean {
  if (row.ageDays === null || row.ageDays === undefined) return false;
  if (row.status === "missing_invoice") return row.ageDays >= cfg.missingDays;
  if (row.status === "unlinked_invoice") return row.ageDays >= cfg.unlinkedDays;
  return false;
}


Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabase = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const now = new Date();

    const { data: dayRows } = await supabase
      .from("app_settings")
      .select("id, value")
      .in("id", ["commission_missing_invoice_days", "commission_unlinked_invoice_days"]);
    const sMap = new Map((dayRows ?? []).map((r: any) => [r.id, r.value]));
    const num = (key: string, fallback: number) => {
      const raw = sMap.get(key);
      const n = typeof raw === "number" ? raw : parseFloat(String(raw ?? ""));
      return Number.isFinite(n) ? n : fallback;
    };
    const cfg = {
      missingDays: num("commission_missing_invoice_days", 14),
      unlinkedDays: num("commission_unlinked_invoice_days", 7),
    };

    // Eén gedeelde loader met de werklijst: logies-offertes tellen hier dus
    // net zo goed mee, zodat een gekoppelde logies-factuur nooit meer als
    // "niet gekoppeld" gesignaleerd wordt.
    const inputs = await loadReconciliationInputs(supabase, {
      skipCancelledAndSnoozed: true,
      now,
    });

    const rows = buildReconciliationRows({
      items: inputs.items,
      invoices: inputs.invoices,
      projects: inputs.projects,
      partners: inputs.partners,
      settings: inputs.settings,
      now,
    });

    const flagged = rows.filter((r) => shouldFlag(r, cfg));

    // Bestaande open todo's ophalen zodat we niets dubbel aanmaken.
    const { data: existing, error: existingError } = await supabase
      .from("admin_todos")
      .select("auto_type, auto_entity_id")
      .in("auto_type", ["commission_missing_invoice", "commission_unlinked_invoice"])
      .in("status", ["todo", "in_progress"]);
    if (existingError) throw existingError;

    const existingKeys = new Set(
      (existing ?? []).map((t: any) => `${t.auto_type}:${t.auto_entity_id}`),
    );

    const toInsert = flagged
      .map((r) => {
        const isMissing = r.status === "missing_invoice";
        // Literals bewust uitgeschreven: de contract-test grep't op
        // `auto_type: "..."` om drift met reconcile-admin-todos te voorkomen.
        const autoType = isMissing
          ? { auto_type: "commission_missing_invoice" as const }
          : { auto_type: "commission_unlinked_invoice" as const };

        const entityId = isMissing ? r.itemId : r.invoiceId;
        if (!entityId) return null;
        const key = `${autoType.auto_type}:${entityId}`;
        if (existingKeys.has(key)) return null;
        existingKeys.add(key);

        const project = r.projectReference ? ` (${r.projectReference})` : "";
        return {
          title: isMissing
            ? `Inkoopfactuur ontbreekt: ${r.partnerName} — ${r.label}${project}`
            : `Inkoopfactuur niet gekoppeld: ${r.partnerName} — factuur ${r.invoiceNumber ?? "?"}`,
          description: isMissing
            ? `Dit onderdeel is uitgevoerd (verkoopwaarde ${euro(r.salesExclVat ?? 0)} ex btw) maar er is geen inkoopfactuur van ${r.partnerName} geregistreerd. Zonder factuur wordt er geen commissie (${euro(r.commissionAtRisk)}) gefactureerd. Vraag de factuur op of factureer de commissie op verkoopwaarde.`
            : `Deze inkoopfactuur van ${r.partnerName} (${euro(r.purchaseExclVat ?? 0)} ex btw) is geregistreerd maar niet gekoppeld aan een programma-onderdeel of logies-offerte, waardoor de commissie (${euro(r.commissionAtRisk)}) buiten beeld blijft. Koppel de factuur of markeer hem commissievrij.`,
          priority: r.commissionAtRisk >= 250 ? "high" : "normal",
          status: "todo",
          related_request_id: r.projectId ?? null,
          related_partner_id: r.partnerId ?? null,
          ...autoType,
          auto_entity_id: entityId,
        };
      })
      .filter(Boolean) as Record<string, unknown>[];

    let created = 0;
    if (toInsert.length) {
      const { error: insertError, count } = await supabase
        .from("admin_todos")
        .insert(toInsert, { count: "exact" });
      if (insertError) throw insertError;
      created = count ?? toInsert.length;
    }

    const result = {
      scanned: rows.length,
      flagged: flagged.length,
      created,
      missingInvoice: flagged.filter((r) => r.status === "missing_invoice").length,
      unlinkedInvoice: flagged.filter((r) => r.status === "unlinked_invoice").length,
      commissionAtRisk: flagged.reduce((s, r) => s + r.commissionAtRisk, 0),
    };
    console.log("flag-missing-partner-invoices:", JSON.stringify(result));

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("flag-missing-partner-invoices error:", e);
    return new Response(JSON.stringify({ error: e?.message ?? "Onbekende fout" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
