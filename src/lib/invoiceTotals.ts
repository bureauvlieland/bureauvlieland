import { calculateAdminInvoicingTotals, type AdminInvoicingBillingLineLike } from "@/lib/adminInvoicingTotals";
import type { AppSettingsMap } from "@/types/appSettings";
import type { AccommodationQuoteExtra } from "@/types/accommodationExtras";

interface InvoiceTotalsItemLike {
  id: string;
  status: string;
  day_index: number;
  quoted_price: number | null;
  admin_price_override?: number | null;
  price_type?: string | null;
  override_people?: number | null;
}

interface InvoiceTotalsInvoiceLike {
  amount_excl_vat: number;
  vat_amount: number;
  amount_incl_vat: number | null;
  invoice_type: string;
}

interface InvoiceTotalsRequestLike {
  number_of_people: number;
  selected_dates: string[];
  invoicing_mode?: string | null;
}

interface InvoiceTotalsArgs {
  request: InvoiceTotalsRequestLike;
  items: InvoiceTotalsItemLike[];
  invoices?: InvoiceTotalsInvoiceLike[];
  appSettings: Pick<
    AppSettingsMap,
    "coordination_fee_tiers" | "tourist_tax_pp_per_day" | "nature_contribution_pp" | "bureau_central_surcharge_pp"
  >;
  selectedAccommodationTotal?: number | null;
  accommodationExtras?: AccommodationQuoteExtra[];
  linesByItem?: Record<string, AdminInvoicingBillingLineLike[]>;
}

export function calculateUnifiedInvoiceTotals({
  request,
  items,
  invoices = [],
  appSettings,
  selectedAccommodationTotal = 0,
  accommodationExtras = [],
  linesByItem = {},
}: InvoiceTotalsArgs) {
  const accommodationExtrasTotal = accommodationExtras.reduce((sum, extra) => {
    const quantity = extra.pricing_type === "fixed" ? 1 : Number(extra.quantity || 0);
    return sum + Number(extra.unit_price || 0) * quantity;
  }, 0);

  return calculateAdminInvoicingTotals(
    {
      ...request,
      items,
      invoices,
      selected_accommodation_total: Number(selectedAccommodationTotal || 0) + accommodationExtrasTotal,
    },
    {
      coordinationFee:
        [...appSettings.coordination_fee_tiers]
          .sort((a, b) => a.maxPeople - b.maxPeople)
          .find((tier) => request.number_of_people <= tier.maxPeople)?.fee ?? 0,
      touristTaxPerPersonPerDay: Number(appSettings.tourist_tax_pp_per_day || 0),
      natureContributionPerPerson: Number(appSettings.nature_contribution_pp || 0),
      bureauCentralSurchargePerPerson: Number(appSettings.bureau_central_surcharge_pp || 0),
    },
    linesByItem,
  );
}
