import { useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAppSettings } from "@/hooks/useAppSettings";
import { usePricingStructures, useRevisionCharges } from "@/hooks/usePricing";
import { resolveFeeStructure } from "@/lib/feeEngine";
import {
  buildProjectInvoiceSpec,
  type ProjectInvoiceSpec,
  type SpecAccommodationInput,
  type SpecBillingLineInput,
  type SpecInvoiceInput,
  type SpecItemInput,
} from "@/lib/projectInvoiceSpec";
import { reportError } from "@/lib/errorReporting";

export interface SpecRequestRow {
  id: string;
  number_of_people: number;
  selected_dates?: unknown;
  invoicing_mode?: string | null;
  excluded_fees?: string[] | null;
  created_at?: string | null;
  reference_number?: string | null;
  fee_snapshot?: unknown;
  invoice_spec_total_incl_vat?: number | null;
}

interface UseProjectInvoiceSpecArgs {
  request: SpecRequestRow | null | undefined;
  items: SpecItemInput[];
  linesByItem: Record<string, SpecBillingLineInput[]>;
  blockVatRates: Record<string, number>;
  accommodation: SpecAccommodationInput | null | undefined;
  invoices: SpecInvoiceInput[];
  bundleExtras?: boolean;
}

/**
 * De ene berekening (`projectInvoiceSpec`) voor de beheerschermen: haalt
 * instellingen, feestructuur en wijzigingsrondes op en bouwt de specificatie.
 * `isReady` is pas waar als alle bronnen geladen zijn.
 */
export function useProjectInvoiceSpec({
  request,
  items,
  linesByItem,
  blockVatRates,
  accommodation,
  invoices,
  bundleExtras = true,
}: UseProjectInvoiceSpecArgs) {
  const { settings, isLoading: settingsLoading } = useAppSettings();
  const { activeStructure, isLoading: structuresLoading } = usePricingStructures();
  const { billableTotal: revisionFeesTotal } = useRevisionCharges(request?.id);

  const spec = useMemo<ProjectInvoiceSpec | null>(() => {
    if (!request) return null;
    const dates = Array.isArray(request.selected_dates) ? (request.selected_dates as string[]) : null;
    return buildProjectInvoiceSpec({
      request: {
        number_of_people: request.number_of_people,
        selected_dates: dates,
        invoicing_mode: request.invoicing_mode,
        excluded_fees: request.excluded_fees,
        created_at: request.created_at,
        reference_number: request.reference_number,
      },
      items,
      linesByItem,
      blockVatRates,
      accommodation: accommodation ?? null,
      settings,
      feeStructure: resolveFeeStructure(request.fee_snapshot, activeStructure),
      revisionFeesTotal,
      invoices,
      bundleExtras,
    });
  }, [request, items, linesByItem, blockVatRates, accommodation, invoices, settings, activeStructure, revisionFeesTotal, bundleExtras]);

  return { spec, isReady: Boolean(request) && !settingsLoading && !structuresLoading };
}

/** Laatst weggeschreven totaal per project, zodat een scherm dat nog de oude rij vasthoudt niet opnieuw schrijft. */
const lastWrittenTotals = new Map<string, number>();

/** Schrijft een gewijzigd projecttotaal naar `program_requests`; de SQL-trigger herrekent dan de voltooiingsstatus. */
export async function syncInvoiceSpecTotals(
  rows: Array<{ requestId: string; storedTotal: number | null | undefined; computedTotal: number }>,
): Promise<void> {
  const now = new Date().toISOString();
  for (const row of rows) {
    const computed = Math.round(row.computedTotal * 100) / 100;
    const known = lastWrittenTotals.get(row.requestId) ?? (row.storedTotal != null ? Number(row.storedTotal) : null);
    if (known != null && Math.abs(known - computed) < 0.005) continue;
    lastWrittenTotals.set(row.requestId, computed);
    const { error } = await supabase
      .from("program_requests")
      .update({ invoice_spec_total_incl_vat: computed, invoice_spec_updated_at: now })
      .eq("id", row.requestId);
    if (error) {
      lastWrittenTotals.delete(row.requestId);
      reportError(error, { where: "syncInvoiceSpecTotals" });
    }
  }
}

/**
 * Houdt `program_requests.invoice_spec_total_incl_vat` gelijk aan de
 * berekening zolang het scherm open staat. Schrijft alleen bij een verschil
 * en pas als alle bronnen geladen zijn (`enabled`).
 */
export function useSyncInvoiceSpecTotal(
  requestId: string | undefined,
  spec: ProjectInvoiceSpec | null,
  storedTotal: number | null | undefined,
  enabled: boolean,
) {
  const total = spec ? Math.round(spec.totals.inclVat * 100) / 100 : null;

  useEffect(() => {
    if (!enabled || !requestId || total == null) return;
    void syncInvoiceSpecTotals([{ requestId, storedTotal, computedTotal: total }]);
  }, [enabled, requestId, total, storedTotal]);
}
