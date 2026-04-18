// Purchase Invoice types for bureau_central invoicing mode

export type InvoicingMode = 'bureau_central';

export type PurchaseInvoiceStatus = 'pending' | 'forwarded' | 'paid';

export interface PurchaseInvoice {
  id: string;
  request_id: string;
  item_id: string | null;
  partner_id: string;
  invoice_number: string;
  invoice_date: string;
  amount_excl_vat: number;
  vat_rate: number;
  vat_amount: number;
  amount_incl_vat: number;
  description: string | null;
  file_path: string | null;
  status: PurchaseInvoiceStatus;
  registered_by: string;
  created_at: string;
  updated_at: string;
  approved_at: string | null;
  paid_at: string | null;
  forwarded_to_accounting_at: string | null;
  forwarded_by: string | null;
}

export interface PurchaseInvoiceWithRelations extends PurchaseInvoice {
  partner?: {
    id: string;
    name: string;
    email: string;
  };
  program_request?: {
    id: string;
    reference_number: string | null;
    customer_name: string;
    customer_company: string | null;
  };
  program_request_item?: {
    id: string;
    block_name: string;
  };
}

export interface PurchaseInvoiceLine {
  id?: string;
  invoice_id?: string;
  description: string;
  quantity: number;
  unit_price: number;
  amount_excl_vat: number;
  vat_rate: number;
  vat_amount: number;
  amount_incl_vat: number;
  sort_order: number;
}

export interface PurchaseInvoiceAllocation {
  id?: string;
  invoice_id?: string;
  item_id: string;
  amount_excl_vat: number;
  vat_rate: number;
  vat_amount: number;
  amount_incl_vat: number;
  notes?: string | null;
  sort_order: number;
}

export interface PurchaseInvoiceInsert {
  request_id: string;
  item_id?: string | null;
  partner_id: string;
  invoice_number: string;
  invoice_date: string;
  amount_excl_vat: number;
  vat_rate: number;
  vat_amount: number;
  amount_incl_vat: number;
  description?: string | null;
  file_path?: string | null;
  registered_by?: string;
  lines?: PurchaseInvoiceLine[];
  allocations?: PurchaseInvoiceAllocation[];
}

export interface PurchaseInvoiceUpdate {
  status?: PurchaseInvoiceStatus;
  paid_at?: string | null;
  forwarded_to_accounting_at?: string | null;
  forwarded_by?: string | null;
  file_path?: string | null;
}

export interface PurchaseInvoiceFilters {
  requestId?: string;
  partnerId?: string;
  status?: PurchaseInvoiceStatus | 'all';
  search?: string;
}

export interface PurchaseInvoiceStats {
  pending: number;
  forwarded: number;
  paid: number;
  totalAmount: number;
}
