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

  const touristTax = settings.touristTaxPerPersonPerDay * request.number_of_people * numberOfDays;
  const natureContribution = settings.natureContributionPerPerson * request.number_of_people;
  const centralSurcharge = request.invoicing_mode === "bureau_central"
    ? settings.bureauCentralSurchargePerPerson * request.number_of_people
    : 0;
  const accommodationTotal = Number(request.selected_accommodation_total ?? 0);

  const grandTotalInclVat =
    programItemsTotal +
    extraCostsTotal +
    settings.coordinationFee +
    touristTax +
    natureContribution +
    centralSurcharge +
    accommodationTotal;

  // Een eindfactuur ('final') is het totaalbedrag van het project; eerder verstuurde
  // deelfacturen (aanbetalingen) zijn daar al op in mindering gebracht en mogen
  // dus NIET nogmaals worden opgeteld. Credits trekken altijd af.
  const creditTotal = request.invoices
    .filter((inv) => inv.invoice_type === "credit")
    .reduce((sum, inv) => sum + getInvoiceInclVat(inv), 0);
  const finals = request.invoices.filter((inv) => inv.invoice_type === "final");
  const partials = request.invoices.filter((inv) => inv.invoice_type === "partial");
  const baseInvoiced = finals.length > 0
    ? finals.reduce((sum, inv) => sum + getInvoiceInclVat(inv), 0)
    : partials.reduce((sum, inv) => sum + getInvoiceInclVat(inv), 0);
  const invoicedTotal = baseInvoiced - creditTotal;

  return {
    programItemsTotal,
    extraCostsTotal,
    coordinationFee: settings.coordinationFee,
    touristTax,
    natureContribution,
    centralSurcharge,
    accommodationTotal,
    grandTotalInclVat,
    invoicedTotal,
    outstanding: Math.max(0, grandTotalInclVat - invoicedTotal),
  };
}