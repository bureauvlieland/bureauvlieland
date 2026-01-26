// Bureau Invoice types for Bureau Vlieland invoices to customers

export type InvoiceType = "partial" | "final" | "credit";

export interface BureauInvoice {
  id: string;
  request_id: string;
  invoice_number: string;
  invoice_date: string;
  amount_excl_vat: number;
  vat_amount: number;
  amount_incl_vat: number;
  invoice_type: InvoiceType;
  description: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface BureauInvoiceFormData {
  invoice_number: string;
  invoice_date: string;
  amount_excl_vat: number;
  vat_amount: number;
  invoice_type: InvoiceType;
  description: string;
}

// Invoice type labels for display
export const invoiceTypeLabels: Record<InvoiceType, string> = {
  partial: "Deelfactuur",
  final: "Eindfactuur",
  credit: "Creditnota",
};

// Completion status types
export type CompletionStatus = "in_progress" | "ready_for_invoice" | "partially_invoiced" | "fully_invoiced";

export const completionStatusLabels: Record<CompletionStatus, string> = {
  in_progress: "In behandeling",
  ready_for_invoice: "Klaar voor facturatie",
  partially_invoiced: "Deels gefactureerd",
  fully_invoiced: "Volledig gefactureerd",
};

export const completionStatusColors: Record<CompletionStatus, { bg: string; text: string }> = {
  in_progress: { bg: "bg-amber-100", text: "text-amber-800" },
  ready_for_invoice: { bg: "bg-blue-100", text: "text-blue-800" },
  partially_invoiced: { bg: "bg-purple-100", text: "text-purple-800" },
  fully_invoiced: { bg: "bg-green-100", text: "text-green-800" },
};

// Helper to calculate VAT from incl price
export const calculateVatFromInclusive = (priceIncl: number, vatRate: number): { excl: number; vat: number } => {
  const excl = priceIncl / (1 + vatRate / 100);
  const vat = priceIncl - excl;
  return { excl: Math.round(excl * 100) / 100, vat: Math.round(vat * 100) / 100 };
};

// Helper to calculate VAT from excl price
export const calculateVatFromExclusive = (priceExcl: number, vatRate: number): { incl: number; vat: number } => {
  const vat = priceExcl * (vatRate / 100);
  const incl = priceExcl + vat;
  return { incl: Math.round(incl * 100) / 100, vat: Math.round(vat * 100) / 100 };
};

// Simple VAT calculation helpers
export const calculateVatAmount = (amountExclVat: number, vatRate: number): number => {
  return Math.round(amountExclVat * (vatRate / 100) * 100) / 100;
};

export const calculateTotalInclVat = (amountExclVat: number, vatRate: number): number => {
  return Math.round((amountExclVat * (1 + vatRate / 100)) * 100) / 100;
};
