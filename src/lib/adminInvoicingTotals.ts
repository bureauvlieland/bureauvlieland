import { getItemLineTotal as centralLineTotal } from "@/lib/portalPricing";

export interface AdminInvoicingItemLike {
  id: string;
  status: string;
  day_index: number;
  quoted_price: number | null;
  admin_price_override?: number | null;
  price_type?: string | null;
  override_people?: number | null;
  use_actual_costs?: boolean | null;
}

export interface AdminInvoicingInvoiceLike {
  amount_excl_vat: number;
  vat_amount: number;
  amount_incl_vat: number | null;
  invoice_type: string;
}

export interface AdminInvoicingBillingLineLike {
  item_id: string;
  amount_incl_vat: number;
}

export interface AdminInvoicingRequestLike {
  number_of_people: number;
  selected_dates: string[];
  invoicing_mode?: string | null;
  selected_accommodation_total?: number | null;
  /** Per-project uitgesloten automatische kostenposten (excluded_fees kolom). */
  excluded_fees?: string[] | null;
  items: AdminInvoicingItemLike[];
  invoices: AdminInvoicingInvoiceLike[];
}

export interface AdminInvoicingSettings {
  coordinationFee: number;
  touristTaxPerPersonPerDay: number;
  natureContributionPerPerson: number;
  bureauCentralSurchargePerPerson: number;
}

export interface AdminInvoicingTotals {
  programItemsTotal: number;
  extraCostsTotal: number;
  coordinationFee: number;
  touristTax: number;
  natureContribution: number;
  centralSurcharge: number;
  accommodationTotal: number;
  grandTotalInclVat: number;
  invoicedTotal: number;
  outstanding: number;
}

const sumBillingLines = (lines: AdminInvoicingBillingLineLike[]) =>
  lines.reduce((sum, line) => sum + Number(line.amount_incl_vat || 0), 0);

const getInvoiceInclVat = (invoice: AdminInvoicingInvoiceLike) =>
  Number(invoice.amount_incl_vat ?? Number(invoice.amount_excl_vat || 0) + Number(invoice.vat_amount || 0));

export function calculateAdminInvoicingTotals(
  request: AdminInvoicingRequestLike,
  settings: AdminInvoicingSettings,
  linesByItem: Record<string, AdminInvoicingBillingLineLike[]> = {},
): AdminInvoicingTotals {
  const numberOfDays = Math.max(request.selected_dates?.length ?? 0, 1);
  const hasBillingLines = (item: AdminInvoicingItemLike) =>
    Array.isArray(linesByItem[item.id]) && linesByItem[item.id].length > 0;

  const getEffectiveItemTotal = (item: AdminInvoicingItemLike) => {
    if (hasBillingLines(item) && item.use_actual_costs) return sumBillingLines(linesByItem[item.id]);
    return centralLineTotal(item as never, request.number_of_people, numberOfDays) ?? 0;
  };

  const programItemsTotal = request.items
    .filter((item) => item.status !== "cancelled" && item.day_index !== -1)
    .reduce((sum, item) => sum + getEffectiveItemTotal(item), 0);

  const extraCostsTotal = request.items
    .filter((item) => item.status !== "cancelled" && item.day_index === -1)
    .reduce((sum, item) => sum + getEffectiveItemTotal(item), 0);

  const isExcluded = (key: string) =>
    Array.isArray(request.excluded_fees) && request.excluded_fees.includes(key);

  const coordinationFee = isExcluded("coordination_fee") ? 0 : settings.coordinationFee;
  const touristTax = isExcluded("tourist_tax")
    ? 0
    : settings.touristTaxPerPersonPerDay * request.number_of_people * numberOfDays;
  const natureContribution = isExcluded("nature_contribution")
    ? 0
    : settings.natureContributionPerPerson * request.number_of_people;
  const centralSurcharge = request.invoicing_mode === "bureau_central" && !isExcluded("central_surcharge")
    ? settings.bureauCentralSurchargePerPerson * request.number_of_people
    : 0;
  const accommodationTotal = Number(request.selected_accommodation_total ?? 0);

  const grandTotalInclVat =
    programItemsTotal +
    extraCostsTotal +
    coordinationFee +
    touristTax +
    natureContribution +
    centralSurcharge +
    accommodationTotal;

  // Registraties zijn werkelijke factuurbedragen: deel- en eindfacturen tellen
  // beide mee, credits trekken af. Een eindfactuur uit een extern boekhoudpakket
  // kan immers alleen het restant na een aanbetaling bevatten.
  const invoicedTotal = request.invoices.reduce((sum, invoice) => {
    const amount = Math.abs(getInvoiceInclVat(invoice));
    return sum + (invoice.invoice_type === "credit" ? -amount : amount);
  }, 0);

  return {
    programItemsTotal,
    extraCostsTotal,
    coordinationFee,
    touristTax,
    natureContribution,
    centralSurcharge,
    accommodationTotal,
    grandTotalInclVat,
    invoicedTotal,
    outstanding: Math.max(0, grandTotalInclVat - invoicedTotal),
  };
}