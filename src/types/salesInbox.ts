export type SalesInboxScanStatus = "pending" | "scanning" | "scanned" | "failed";
export type SalesInboxStatus = "new" | "processed" | "discarded";

export interface SalesInboxScanResult {
  customer_name: string | null;
  customer_email: string | null;
  customer_phone: string | null;
  customer_company: string | null;
  number_of_people: number | null;
  preferred_dates: string[];
  program_type: string | null;
  wishes: string | null;
  budget_indication: string | null;
  source: string | null;
  confidence: number;
}

export interface SalesInboxAttachment {
  name: string;
  size: number;
  mime: string;
  path: string;
}

export interface SalesInboxItem {
  id: string;
  created_at: string;
  updated_at: string;
  received_at: string;
  recipient: string | null;
  from_email: string;
  from_name: string | null;
  subject: string | null;
  body_text: string | null;
  body_html: string | null;
  attachment_path: string | null;
  attachment_filename: string | null;
  attachment_size: number | null;
  attachments: SalesInboxAttachment[];
  raw_payload?: Record<string, unknown> | null;
  scan_status: SalesInboxScanStatus;
  scan_result: SalesInboxScanResult | null;
  scan_error: string | null;
  status: SalesInboxStatus;
  processed_request_id: string | null;
  processed_by: string | null;
  processed_at: string | null;
  notes: string | null;
}
