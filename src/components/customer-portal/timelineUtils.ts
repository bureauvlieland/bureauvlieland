import type { ProgramRequestItem } from "@/types/programRequest";

/** De tijd waarop de tijdlijn sorteert: bevestigd, anders het voorstel, anders de wens. */
export const effectiveTime = (item: ProgramRequestItem): string | null => {
  if (item.confirmed_time) return item.confirmed_time;
  if (item.proposed_time && (item.status === "confirmed" || item.status === "alternative")) return item.proposed_time;
  if (item.preferred_time && item.preferred_time !== "flexibel") return item.preferred_time;
  return null;
};

export const byEffectiveTime = (a: ProgramRequestItem, b: ProgramRequestItem) => {
  const ta = effectiveTime(a);
  const tb = effectiveTime(b);
  if (!ta && !tb) return 0;
  if (!ta) return 1;
  if (!tb) return -1;
  return ta.localeCompare(tb);
};
