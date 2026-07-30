import type { InvoiceType } from "@/types/bureauInvoice";

const INVOICE_TYPE_TOLERANCE = 0.01;

interface ResolveBureauInvoiceTypeArgs {
  storedType?: string | null;
  invoiceAmountInclVat: number | null | undefined;
  projectTotalInclVat?: number | null;
  outstandingAmountInclVat?: number | null;
  alreadyInvoicedInclVat?: number | null;
}

const isKnownInvoiceType = (value: string | null | undefined): value is InvoiceType =>
  value === "partial" || value === "final" || value === "credit";

export function resolveBureauInvoiceType({
  storedType,
  invoiceAmountInclVat,
  projectTotalInclVat,
  outstandingAmountInclVat,
  alreadyInvoicedInclVat,
}: ResolveBureauInvoiceTypeArgs): InvoiceType {
  if (storedType === "credit" || storedType === "final") return storedType;

  const amount = Number(invoiceAmountInclVat ?? 0);
  const projectTotal = Number(projectTotalInclVat ?? 0);
  const outstanding = Number(outstandingAmountInclVat ?? 0);
  const alreadyInvoiced = Number(alreadyInvoicedInclVat ?? 0);

  if (amount <= INVOICE_TYPE_TOLERANCE) {
    return isKnownInvoiceType(storedType) ? storedType : "partial";
  }

  if (projectTotal > INVOICE_TYPE_TOLERANCE) {
    return amount >= projectTotal - INVOICE_TYPE_TOLERANCE ? "final" : "partial";
  }

  if (alreadyInvoiced <= INVOICE_TYPE_TOLERANCE && outstanding > INVOICE_TYPE_TOLERANCE) {
    return amount >= outstanding - INVOICE_TYPE_TOLERANCE ? "final" : "partial";
  }

  return isKnownInvoiceType(storedType) ? storedType : "partial";
}

interface ShouldShowFullSpecificationArgs {
  /** Type zoals afgeleid via resolveBureauInvoiceType. */
  resolvedType: InvoiceType;
  /** Som van reeds gefactureerde termijnen (excl. de huidige factuur), incl. BTW. */
  alreadyInvoicedInclVat?: number | null;
  /** Bedrag van deze factuur incl. BTW. */
  invoiceAmountInclVat?: number | null;
  /** Totaal van het project volgens de specificatie, incl. BTW. */
  projectTotalInclVat?: number | null;
}

/** Tolerantie waarbinnen factuurbedrag en specificatie mogen afwijken (€0,02). */
const SPECIFICATION_TOLERANCE = 0.02;

/**
 * Bepaalt of een factuur de volledige projectspecificatie mag tonen.
 * Alleen eindfacturen zonder eerdere termijnen waarvan het bedrag exact
 * overeenkomt met de specificatie; anders een compacte samenvattingsregel.
 */
export function shouldShowFullSpecification({
  resolvedType,
  alreadyInvoicedInclVat,
  invoiceAmountInclVat,
  projectTotalInclVat,
}: ShouldShowFullSpecificationArgs): boolean {
  if (resolvedType !== "final") return false;
  if (Math.abs(Number(alreadyInvoicedInclVat ?? 0)) > INVOICE_TYPE_TOLERANCE) return false;

  const amount = Number(invoiceAmountInclVat ?? 0);
  const projectTotal = Number(projectTotalInclVat ?? 0);
  if (projectTotal <= INVOICE_TYPE_TOLERANCE) return false;

  return Math.abs(amount - projectTotal) <= SPECIFICATION_TOLERANCE;
}
