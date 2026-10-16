/**
 * Commissie die Bureau Vlieland nog moet factureren over wat de partner al
 * factureerde: onderdelen en logies met een factuurnummer en
 * `commission_status = pending` (nog niet, of na crediteren niet meer, op een
 * commissiefactuur). Het bedrag is de momentopname van de registratie
 * (`commission_amount`, docs/plan-commissiefacturen.md); ontbreekt die, dan
 * grondslag × percentage. Op Facturatie staat dit als "verwacht" naast de
 * commissie over wat de partner zelf nog factureert.
 */
export interface PendingCommissionSource {
  invoiced_number: string | null;
  invoiced_amount: number | null;
  commission_percentage: number | null;
  commission_amount: number | null;
  commission_status: string | null;
}

export function isPendingCommission(source: Pick<PendingCommissionSource, "invoiced_number" | "commission_status">): boolean {
  return source.invoiced_number !== null && source.commission_status === "pending";
}

export function pendingCommissionAmount(source: PendingCommissionSource, defaultPercentage: number): number {
  if (!isPendingCommission(source)) return 0;
  if (source.commission_amount !== null) return Number(source.commission_amount) || 0;
  const percentage = source.commission_percentage ?? defaultPercentage;
  return ((Number(source.invoiced_amount) || 0) * percentage) / 100;
}

export function sumPendingCommission(sources: PendingCommissionSource[], defaultPercentage: number): number {
  return sources.reduce((sum, source) => sum + pendingCommissionAmount(source, defaultPercentage), 0);
}
