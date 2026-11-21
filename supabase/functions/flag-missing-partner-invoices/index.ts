import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  buildReconciliationRows,
  type ReconRow,
} from "../_shared/commissionReconciliation.ts";
import { loadReconciliationInputs } from "../_shared/commissionReconciliationData.ts";
import { isPartnerInvoicingReleased } from "../_shared/partnerInvoicing.ts";

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
  row: Pick<ReconRow, "status" | "ageDays"> & Partial<Pick<ReconRow, "readiness" | "commissionExempt">>,
  cfg: { missingDays: number; unlinkedDays: number },
): boolean {
  // Commissievrij gemarkeerde regels en projecten die nog moeten plaatsvinden
  // (verwachte commissie) leveren geen taak op.
  if (row.commissionExempt) return false;
  if (row.readiness === "expected") return false;
  if (row.ageDays === null || row.ageDays === undefined) return false;
  if (row.status === "missing_invoice") return row.ageDays >= cfg.missingDays;
  if (row.status === "unlinked_invoice") return row.ageDays >= cfg.unlinkedDays;
  return false;
}

export type FlagTodoRow = Pick<
  ReconRow,
  | "status"
  | "itemId"
  | "invoiceId"
  | "partnerId"
  | "partnerName"
  | "label"
  | "projectReference"
  | "programRequestId"
  | "invoiceNumber"
  | "salesExclVat"
  | "purchaseExclVat"
  | "commissionAtRisk"
>;

/**
 * Mag de partner op dit programma al factureren? Pas na ondertekening door de
 * klant of vrijgave door het bureau (zelfde regel als
 * _shared/partnerInvoicing.ts). Zolang dat niet zo is krijgt de partner geen
 * herinneringen en is de taak voor het bureau: geef het project vrij.
 */
export function isInvoicingReleased(
  req: { terms_accepted_at?: string | null; completion_status?: string | null } | null | undefined,
): boolean {
  return isPartnerInvoicingReleased(req);
}

/** Herkent de variant "project nog niet vrijgegeven" aan de titel. */
export function isReleaseVariant(title: string | null | undefined): boolean {
  return String(title ?? "").includes("geef het project vrij");
}

/**
 * De taak voor een gesignaleerde regel, of null als er geen entiteit is om
 * de taak aan te hangen. `related_request_id` wijst altijd naar een
 * programma (`program_requests`): bij logies is dat het programma waar de
 * logiesaanvraag aan hangt, niet de logiesaanvraag zelf. Die laatste is geen
 * program_request, en de insert viel daar van 4 tot 15 oktober elke dag op
 * om (foreign key `admin_todos_related_request_id_fkey`).
 *
 * Eén taak per onderdeel: `commission_missing_invoice` vervangt sinds fase 3
 * ook de oude T+7-taak `post_execution_invoice_check` uit check-pending-items.
 * `invoicingReleased` (standaard true) kiest de variant: factuur ontbreekt
 * terwijl de partner al is herinnerd, óf het project is nog niet vrijgegeven
 * en de partner kán nog niet factureren.
 */
export function todoForRow(r: FlagTodoRow, opts: { invoicingReleased?: boolean } = {}) {
  const isMissing = r.status === "missing_invoice";
  const released = opts.invoicingReleased ?? true;
  // Literals bewust uitgeschreven: de contract-test grep't op
  // `auto_type: "..."` om drift met reconcile-admin-todos te voorkomen.
  const autoType = isMissing
    ? { auto_type: "commission_missing_invoice" as const }
    : { auto_type: "commission_unlinked_invoice" as const };

  const entityId = isMissing ? r.itemId : r.invoiceId;
  if (!entityId) return null;

  const project = r.projectReference ? ` (${r.projectReference})` : "";
  const missingTitle = released
    ? `Geen factuur ontvangen van ${r.partnerName} — ${r.label}${project}`
    : `${r.partnerName} kan nog niet factureren voor ${r.label}${project}: geef het project vrij`;
  const missingDescription = released
    ? `Dit onderdeel is uitgevoerd (verkoopwaarde ${euro(r.salesExclVat ?? 0)} ex btw), maar er is geen factuur van ${r.partnerName} ontvangen in de Inkoop-inbox. De partner is automatisch herinnerd (3, 7 en 14 dagen na uitvoering). Zonder factuur wordt er geen commissie (${euro(r.commissionAtRisk)}) gefactureerd: bel de partner om de factuur, of factureer de commissie op verkoopwaarde.`
    : `Dit onderdeel is uitgevoerd (verkoopwaarde ${euro(r.salesExclVat ?? 0)} ex btw), maar de klant heeft nog niet getekend en het project is niet vrijgegeven. ${r.partnerName} kan daardoor nog niet factureren en krijgt geen herinneringen. Gebruik "Markeer als klaar voor facturatie" op het project; daarna lopen de herinneringen en de commissie (${euro(r.commissionAtRisk)}) vanzelf.`;
  return {
    title: isMissing
      ? missingTitle
      : `Factuur niet gekoppeld: ${r.partnerName} — factuur ${r.invoiceNumber ?? "?"}`,
    description: isMissing
      ? missingDescription
      : `Deze factuur van ${r.partnerName} (${euro(r.purchaseExclVat ?? 0)} ex btw) is ontvangen maar niet gekoppeld aan een programma-onderdeel of logiesofferte, waardoor de commissie (${euro(r.commissionAtRisk)}) buiten beeld blijft. Koppel de factuur aan het juiste onderdeel of markeer hem commissievrij.`,
    priority: isMissing && !released ? "high" : r.commissionAtRisk >= 250 ? "high" : "normal",
    status: "todo",
    related_request_id: r.programRequestId ?? null,
    related_partner_id: r.partnerId ?? null,
    ...autoType,
    auto_entity_id: entityId,
  };
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
      .select("id, auto_type, auto_entity_id, title")
      .in("auto_type", ["commission_missing_invoice", "commission_unlinked_invoice"])
      .in("status", ["todo", "in_progress"]);
    if (existingError) throw existingError;

    const existingKeys = new Set(
      (existing ?? []).map((t: any) => `${t.auto_type}:${t.auto_entity_id}`),
    );
    const existingByKey = new Map(
      (existing ?? []).map((t: any) => [`${t.auto_type}:${t.auto_entity_id}`, t]),
    );

    // Vrijgave per programma: bepaalt de variant van de taak (factuur
    // ontbreekt vs. project nog niet vrijgegeven).
    const releaseByProgram = new Map<string, boolean>();
    {
      const programIds = [
        ...new Set(
          flagged
            .filter((r) => r.status === "missing_invoice" && r.programRequestId)
            .map((r) => r.programRequestId as string),
        ),
      ];
      if (programIds.length) {
        const { data: programs, error: programsError } = await supabase
          .from("program_requests")
          .select("id, terms_accepted_at, completion_status")
          .in("id", programIds);
        if (programsError) throw programsError;
        for (const p of (programs ?? []) as any[]) {
          releaseByProgram.set(p.id, isInvoicingReleased(p));
        }
      }
    }

    // Bestaande taak waarvan de variant omsloeg (project inmiddels vrijgegeven
    // of juist niet): tekst en prioriteit bijwerken in plaats van een tweede
    // taak aanmaken.
    const toUpdate: Array<{ id: string; title: string; description: string; priority: string }> = [];
    const toInsert = flagged
      .map((r) => {
        const todo = todoForRow(r, {
          invoicingReleased: r.programRequestId
            ? releaseByProgram.get(r.programRequestId) ?? true
            : true,
        });
        if (!todo) return null;
        const key = `${todo.auto_type}:${todo.auto_entity_id}`;
        if (existingKeys.has(key)) {
          const cur = existingByKey.get(key);
          if (cur && isReleaseVariant(cur.title) !== isReleaseVariant(todo.title)) {
            toUpdate.push({ id: cur.id, title: todo.title, description: todo.description, priority: todo.priority });
          }
          return null;
        }
        existingKeys.add(key);
        return todo;
      })
      .filter(Boolean) as Record<string, unknown>[];

    let updated = 0;
    for (const u of toUpdate) {
      const { error: updateError } = await supabase
        .from("admin_todos")
        .update({ title: u.title, description: u.description, priority: u.priority })
        .eq("id", u.id);
      if (updateError) throw updateError;
      updated++;
    }

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
      updated,
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
