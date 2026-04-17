export type InboxScanStatus = "pending" | "scanning" | "scanned" | "failed";
export type InboxStatus = "new" | "processed" | "discarded";

export interface InboxScanResult {
  invoice_number: string | null;
  invoice_date: string | null;
  supplier_name: string | null;
  amount_excl_vat: number | null;
  vat_rate: number | null;
  vat_amount: number | null;
  amount_incl_vat: number | null;
  description: string | null;
  vat_breakdown?: Array<{
    vat_rate: number;
    amount_excl: number;
    vat_amount: number;
  }>;
  line_items: Array<{
    description: string;
    quantity: number | null;
    unit_price: number | null;
    total_excl_vat: number | null;
    vat_rate?: number | null;
  }>;
}

export interface PurchaseInvoiceInboxItem {
  id: string;
  created_at: string;
  updated_at: string;
  from_email: string;
  from_name: string | null;
  subject: string | null;
  body_text: string | null;
  attachment_path: string | null;
  attachment_filename: string | null;
  attachment_size: number | null;
  scan_result: InboxScanResult | null;
  scan_status: InboxScanStatus;
  scan_error: string | null;
  status: InboxStatus;
  processed_invoice_id: string | null;
  processed_by: string | null;
  processed_at: string | null;
  notes: string | null;
  raw_payload?: Record<string, unknown> | null;
}
