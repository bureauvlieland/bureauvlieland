export interface DateChangeRow {
  index: number;
  oldDate: string | null;
  newDate: string | null;
}

/** Vergelijkt twee datumlijsten, ongeacht volgorde. */
export function sameDates(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const sa = [...a].sort();
  const sb = [...b].sort();
  return sa.every((d, i) => d === sb[i]);
}

/**
 * Koppelt oude en nieuwe datums dag-voor-dag (Dag 1 → Dag 1, ...). Onderdelen
 * hangen aan een dag-index, dus een verschuiving van 4+5 nov naar 5+6 nov
 * schuift alle onderdelen mee naar de nieuwe dag.
 */
export function describeDateChange(oldDates: string[], newDates: string[]): DateChangeRow[] {
  const o = [...oldDates].sort();
  const n = [...newDates].sort();
  const len = Math.max(o.length, n.length);
  return Array.from({ length: len }, (_, index) => ({
    index,
    oldDate: o[index] ?? null,
    newDate: n[index] ?? null,
  }));
}
