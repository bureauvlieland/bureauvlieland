import { getItemLineTotal as centralLineTotal } from "@/lib/portalPricing";

export interface AdminInvoicingItemLike {
  id: string;
  status: string;
  day_index: number;
  quoted_price: number | null;
  admin_price_override?: number | null;
  price_type?: string | null;
  override_people?: number | null;
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
    if (hasBillingLines(item)) return sumBillingLines(linesByItem[item.id]);
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

  const invoicedTotal = request.invoices.reduce((sum, invoice) => {
    const amountInclVat = getInvoiceInclVat(invoice);
    return invoice.invoice_type === "credit" ? sum - amountInclVat : sum + amountInclVat;
  }, 0);

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