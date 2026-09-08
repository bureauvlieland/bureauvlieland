import type { MapActivity } from "@/hooks/useMapActivities";

/**
 * Beschikbaarheid van een MAP-activiteitstype op één dag, als informatie
 * voor de klant (docs/plan-activiteitenaanbieders.md, fase 3.2). Nooit een
 * blokkade: het bureau kan altijd bellen.
 */
export interface DayAvailability {
  /** Er zijn momenten gepland op deze dag (geannuleerde niet meegeteld). */
  hasMoments: boolean;
  /** Momenten met plek, gesorteerd op tijd: "10.00 (14 plaatsen)". */
  slots: { time: string; remaining: number }[];
  totalRemaining: number;
  /** Korte regel voor de kaart, of null als er niets te zeggen is. */
  summary: string | null;
}

const timeOf = (iso: string): string => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${String(d.getHours()).padStart(2, "0")}.${String(d.getMinutes()).padStart(2, "0")}`;
};

export function summarizeDayAvailability(
  activities: MapActivity[] | undefined,
  activityTypeId: number,
  dayIso: string,
  groupSize?: number | null,
): DayAvailability {
  const onDay = (activities ?? []).filter(
    (a) => a.ActivityTypeId === activityTypeId && !a.IsCancelled && a.IsActive !== false && a.Departure.slice(0, 10) === dayIso,
  );
  const slots = onDay
    .map((a) => ({ time: timeOf(a.Departure), remaining: Math.max(0, a.RemainingSlots ?? 0) }))
    .filter((s) => s.time)
    .sort((a, b) => a.time.localeCompare(b.time));
  const withRoom = slots.filter((s) => s.remaining > 0);
  const totalRemaining = withRoom.reduce((sum, s) => sum + s.remaining, 0);
  let summary: string | null = null;
  if (slots.length === 0) {
    summary = null; // geen momenten gepland; zegt niets over de mogelijkheid van een groepsboeking
  } else if (withRoom.length === 0) {
    summary = "Alle geplande momenten op deze dag zijn vol; wij vragen de aanbieder om een extra moment.";
  } else {
    const fits = typeof groupSize === "number" && groupSize > 0 ? withRoom.filter((s) => s.remaining >= groupSize) : withRoom;
    const list = (fits.length > 0 ? fits : withRoom)
      .slice(0, 4)
      .map((s) => `${s.time} (${s.remaining} ${s.remaining === 1 ? "plaats" : "plaatsen"})`)
      .join(" · ");
    summary = fits.length > 0
      ? `Beschikbaar op deze dag: ${list}`
      : `Op deze dag nog ${totalRemaining} losse plaatsen (${list}); voor uw groep vragen wij een eigen moment aan.`;
  }
  return { hasMoments: slots.length > 0, slots, totalRemaining, summary };
}
