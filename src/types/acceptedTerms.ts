// Types for the accepted terms log

export interface AcceptedTermsEntry {
  id: string;
  request_id: string;
  partner_id: string;
  partner_name: string;
  terms_type: "partner_custom" | "partner_default" | "bureau_vlieland" | "uvh_2024";
  terms_version: string;
  terms_pdf_path: string | null;
  accepted_at: string;
  created_at: string;
}
