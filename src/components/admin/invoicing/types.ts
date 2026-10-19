import type { ProjectInvoiceSpec } from "@/lib/projectInvoiceSpec";

export interface AccommodationExtraForInvoicing {
  id: string;
  quote_id: string;
  name?: string | null;
  quantity: number;
  unit_price: number;
  pricing_type: string | null;
  vat_rate: number | null;
}

export interface InvoicingInvoice {
  id: string;
  invoice_number: string;
  invoice_date: string;
  amount_excl_vat: number;
  vat_amount: number;
  amount_incl_vat: number | null;
  invoice_type: string;
  description: string | null;
  status: string | null;
  forwarded_to_accounting_at: string | null;
  pdf_path: string | null;
}

export interface ProgramRequestWithItems {
  id: string;
  reference_number: string | null;
  linked_accommodation_id: string | null;
  invoicing_mode: string;
  customer_name: string;
  customer_company: string | null;
  customer_email: string;
  number_of_people: number;
  selected_dates: string[];
  selected_accommodation_total: number | null;
  excluded_fees?: string[] | null;
  completion_status: string | null;
  completion_manually_overridden?: boolean;
  completion_override_reason?: string | null;
  completion_override_outstanding?: number | null;
  terms_accepted_at: string | null;
  created_at: string;
  fee_snapshot?: unknown;
  invoice_spec_total_incl_vat?: number | null;
  /** Som van de aangevinkte wijzigingsrondes na klantakkoord. */
  revision_fees_total?: number;
  items: {
    id: string;
    block_id: string | null;
    day_index: number;
    block_name: string;
    block_type: string;
    provider_name: string;
    status: string;
    quoted_price: number | null;
    admin_price_override?: number | null;
    price_type?: string | null;
    override_people?: number | null;
    block_category?: string | null;
    vat_rate?: number | null;
  }[];
  invoices: InvoicingInvoice[];
  selected_accommodation_base_total?: number | null;
  selected_accommodation_vat_rate?: number | null;
  selected_accommodation_name?: string | null;
  selected_accommodation_extras?: AccommodationExtraForInvoicing[];
}

export interface InvoiceTotals {
  programItemsTotal: number;
  extraCostsTotal: number;
  coordinationFee: number;
  touristTax: number;
  natureContribution: number;
  centralSurcharge: number;
  revisionFees: number;
  accommodationTotal: number;
  grandTotalInclVat: number;
  invoicedTotal: number;
  outstanding: number;
}

/** Project plus eenmaal berekende specificatie en totalen, zodat kaarten niet zelf rekenen. */
export interface InvoicingRow {
  request: ProgramRequestWithItems;
  totals: InvoiceTotals;
  spec: ProjectInvoiceSpec;
}
