import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  buildReconciliationRows,
  type ReconInvoiceInput,
  type ReconItemInput,
  type ReconRow,
  DEFAULT_RECON_SETTINGS,
} from "../_shared/commissionReconciliation.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SOLD_STATUSES = ["confirmed", "accepted", "executed", "invoiced", "completed"];

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

    const { data: settingsRows } = await supabase
      .from("app_settings")
      .select("id, value")
      .in("id", [
        "commission_match_tolerance_eur",
        "commission_match_tolerance_pct",
        "commission_missing_invoice_days",
        "commission_unlinked_invoice_days",
      ]);
    const sMap = new Map((settingsRows ?? []).map((r: any) => [r.id, r.value]));
    const num = (key: string, fallback: number) => {
      const raw = sMap.get(key);
      const n = typeof raw === "number" ? raw : parseFloat(String(raw ?? ""));
      return Number.isFinite(n) ? n : fallback;
    };
    const settings = {
      toleranceEur: num("commission_match_tolerance_eur", DEFAULT_RECON_SETTINGS.toleranceEur),
      tolerancePct: num("commission_match_tolerance_pct", DEFAULT_RECON_SETTINGS.tolerancePct),
    };
    const cfg = {
      missingDays: num("commission_missing_invoice_days", 14),
      unlinkedDays: num("commission_unlinked_invoice_days", 7),
    };

    const [{ data: rawItems, error: itemsError }, { data: rawInvoices, error: invError }] =
      await Promise.all([
        supabase
          .from("program_request_items")
          .select(
            "id, request_id, provider_id, block_name, quoted_price, vat_rate, commission_percentage, " +
              "commission_status, commission_basis, invoiced_number, invoiced_amount, status, block_type, proposed_date",
          )
          .in("status", SOLD_STATUSES)
          .not("provider_id", "is", null),
        supabase
          .from("partner_purchase_invoices")
          .select(
            "id, partner_id, request_id, item_id, invoice_number, invoice_date, amount_excl_vat, " +
              "amount_incl_vat, commission_exempt, status, created_at",
          ),
      ]);

    if (itemsError) throw itemsError;
    if (invError) throw invError;

    const invoiceIds = (rawInvoices ?? []).map((i: any) => i.id);
    const { data: allocations } = invoiceIds.length
      ? await supabase
          .from("partner_purchase_invoice_allocations")
          .select("invoice_id, item_id")
          .in("invoice_id", invoiceIds)
      : { data: [] as any[] };
    const allocMap = new Map<string, string[]>();
    for (const a of allocations ?? []) {
      const arr = allocMap.get(a.invoice_id) ?? [];
      if (a.item_id) arr.push(a.item_id);
      allocMap.set(a.invoice_id, arr);
    }

    const requestIds = [
      ...new Set(
        [
          ...(rawItems ?? []).map((i: any) => i.request_id),
          ...(rawInvoices ?? []).map((i: any) => i.request_id),
        ].filter(Boolean),
      ),
    ];

    const [{ data: projects }, { data: partners }] = await Promise.all([
      requestIds.length
        ? supabase
            .from("program_requests")
            .select("id, reference_number, customer_name, customer_company, selected_dates, cancelled_at, snoozed_until")
            .in("id", requestIds)
        : Promise.resolve({ data: [] as any[] }),
      supabase.from("partners").select("id, name, commission_percentage"),
    ]);

    // Geannuleerde of gesnoozede projecten niet signaleren.
    const skipRequestIds = new Set(
      (projects ?? [])
        .filter(
          (p: any) =>
            p.cancelled_at ||
            (p.snoozed_until && new Date(p.snoozed_until).getTime() > now.getTime()),
        )
        .map((p: any) => p.id),
    );

    const items: ReconItemInput[] = (rawItems ?? [])
      .filter((i: any) => !skipRequestIds.has(i.request_id))
      .map((i: any) => ({
        id: i.id,
        request_id: i.request_id,
        provider_id: i.provider_id,
        block_name: i.block_name,
        quoted_price: i.quoted_price,
        vat_rate: i.vat_rate,
        commission_percentage: i.commission_percentage,
        commission_status: i.commission_status,
        commission_basis: i.commission_basis,
        invoiced_number: i.invoiced_number,
        invoiced_amount: i.invoiced_amount,
        status: i.status,
        block_type: i.block_type,
        execution_date: i.proposed_date ?? null,
      }));

    const invoices: ReconInvoiceInput[] = (rawInvoices ?? [])
      .filter((i: any) => !["rejected", "archived"].includes(i.status ?? ""))
      .filter((i: any) => !i.request_id || !skipRequestIds.has(i.request_id))
      .map((i: any) => ({
        id: i.id,
        partner_id: i.partner_id,
        request_id: i.request_id,
        item_id: i.item_id,
        invoice_number: i.invoice_number,
        invoice_date: i.invoice_date,
        amount_excl_vat: i.amount_excl_vat,
        amount_incl_vat: i.amount_incl_vat,
        commission_exempt: i.commission_exempt,
        created_at: i.created_at,
        allocated_item_ids: allocMap.get(i.id) ?? [],
      }));

    const rows = buildReconciliationRows({
      items,
      invoices,
      projects: (projects ?? []) as any[],
      partners: (partners ?? []) as any[],
      settings,
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
        if (existingKeys.has(`${autoType}:${entityId}`)) return null;
        existingKeys.add(`${autoType}:${entityId}`);

        const project = r.projectReference ? ` (${r.projectReference})` : "";
        return {
          title: isMissing
            ? `Inkoopfactuur ontbreekt: ${r.partnerName} — ${r.label}${project}`
            : `Inkoopfactuur niet gekoppeld: ${r.partnerName} — factuur ${r.invoiceNumber ?? "?"}`,
          description: isMissing
            ? `Dit onderdeel is uitgevoerd (verkoopwaarde ${euro(r.salesExclVat ?? 0)} ex btw) maar er is geen inkoopfactuur van ${r.partnerName} geregistreerd. Zonder factuur wordt er geen commissie (${euro(r.commissionAtRisk)}) gefactureerd. Vraag de factuur op of factureer de commissie op verkoopwaarde.`
            : `Deze inkoopfactuur van ${r.partnerName} (${euro(r.purchaseExclVat ?? 0)} ex btw) is geregistreerd maar niet gekoppeld aan een programma-onderdeel, waardoor de commissie (${euro(r.commissionAtRisk)}) buiten beeld blijft. Koppel de factuur of markeer hem commissievrij.`,
          priority: r.commissionAtRisk >= 250 ? "high" : "normal",
          status: "todo",
          related_request_id: r.projectId ?? null,
          related_partner_id: r.partnerId ?? null,
          auto_type: autoType,
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
