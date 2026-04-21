/**
 * Berekent het openstaande totaalbedrag voor een project (incl. BTW).
 *
 * Gebruikt dezelfde grootheden als FinancialOverviewCard:
 * programma-items + extra kostenposten + coördinatiefee + opslag +
 * toeristenbelasting + natuurbijdrage + logies, minus reeds gefactureerd
 * (en plus credits).
 *
 * Hierdoor toont de Voltooiingsstatus altijd hetzelfde "Openstaand"-bedrag
 * als het Financieel Overzicht.
 */
import { getItemLineTotal as centralLineTotal } from "@/lib/portalPricing";
import type { BureauInvoice } from "@/types/bureauInvoice";
import type { ProgramItemBillingLine } from "@/types/programItemBillingLine";

interface FinancialItem {
  id: string;
  block_name: string;
  block_type?: string;
  status: string;
  quoted_price: number | null;
  admin_price_override?: number | null;
  day_index: number;
  price_type?: string | null;
  override_people?: number | null;
}

interface CalculateOutstandingArgs {
  items: FinancialItem[];
  invoices: BureauInvoice[];
  numberOfPeople: number;
  numberOfDays?: number;
  coordinationFee: number;
  touristTax?: number;
  natureContribution?: number;
  centralSurcharge?: number;
  accommodationTotal?: number;
  linesByItem?: Record<string, ProgramItemBillingLine[]>;
}

const sumBillingLines = (lines: ProgramItemBillingLine[]) =>
  lines.reduce((sum, l) => sum + Number(l.amount_incl_vat || 0), 0);

export function calculateProjectGrandTotal({
  items,
  numberOfPeople,
  numberOfDays = 1,
  coordinationFee,
  touristTax = 0,
  natureContribution = 0,
  centralSurcharge = 0,
  accommodationTotal = 0,
  linesByItem = {},
}: Omit<CalculateOutstandingArgs, "invoices">): number {
  const programItems = items.filter(
    (i) => i.status !== "cancelled" && i.day_index !== -1
  );
  const extraCostItems = items.filter((i) => i.day_index === -1 && i.status !== "cancelled");

  const hasBillingLines = (item: FinancialItem) =>
    Array.isArray(linesByItem[item.id]) && linesByItem[item.id].length > 0;

  const getEffectiveItemTotal = (item: FinancialItem): number => {
    if (hasBillingLines(item)) return sumBillingLines(linesByItem[item.id]);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return centralLineTotal(item as any, numberOfPeople, numberOfDays) ?? 0;
  };

  const programTotal = programItems.reduce(
    (sum, item) => sum + getEffectiveItemTotal(item),
    0
  );
  const extraCostsTotal = extraCostItems.reduce((sum, item) => {
    if (hasBillingLines(item)) return sum + sumBillingLines(linesByItem[item.id]);
    return sum + (item.admin_price_override ?? 0);
  }, 0);

  return (
    programTotal +
    coordinationFee +
    extraCostsTotal +
    touristTax +
    natureContribution +
    centralSurcharge +
    accommodationTotal
  );
}

export function calculateProjectOutstandingAmount(args: CalculateOutstandingArgs): number {
  const grandTotalInclVat = calculateProjectGrandTotal(args);
  const invoicedInclVat = args.invoices
    .filter((inv) => inv.invoice_type !== "credit")
    .reduce((sum, inv) => sum + Number(inv.amount_incl_vat ?? 0), 0);
  const creditedInclVat = args.invoices
    .filter((inv) => inv.invoice_type === "credit")
    .reduce((sum, inv) => sum + Number(inv.amount_incl_vat ?? 0), 0);
  const netInvoicedInclVat = invoicedInclVat - creditedInclVat;
  return Math.max(0, grandTotalInclVat - netInvoicedInclVat);
}
