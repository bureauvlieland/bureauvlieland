import { formatTimeHHmm, isTimeSlotBlocked, type TimeSlot } from "@/lib/timeUtils";

/**
 * Tijden die een partner altijd mag voorstellen bij "Andere tijd of prijs
 * voorstellen", ook als ze volgens de planningsregels (duur + half uur marge)
 * botsen met een ander onderdeel van dezelfde dag.
 *
 * Dat zijn de tijden die de klant nu al ziet: de gewenste tijd, de tijd die
 * de klant liever wil, de bevestigde tijd en het eigen eerdere voorstel. Een
 * partner die alleen de prijs wil aanpassen en de tijd laat staan, mag niet
 * geblokkeerd worden door een botsing die de klant zelf al heeft ingepland.
 */
export type ProposalTimeItem = {
  preferred_time: string | null;
  proposed_time: string | null;
  confirmed_time: string | null;
  customer_counter_time: string | null;
};

export const getAlwaysAllowedProposalTimes = (item: ProposalTimeItem): string[] => {
  const times = [item.customer_counter_time, item.confirmed_time, item.proposed_time, item.preferred_time]
    .map((t) => formatTimeHHmm(t))
    .filter((t): t is string => Boolean(t) && t!.toLowerCase() !== "flexibel");
  return Array.from(new Set(times));
};

/**
 * Of een voorgestelde tijd geweigerd moet worden omdat er al een ander
 * onderdeel staat. De tijden uit `getAlwaysAllowedProposalTimes` zijn vrijgesteld.
 */
export const isProposalTimeBlocked = (
  time: string,
  item: ProposalTimeItem & { duration: string | null },
  blockedSlots: TimeSlot[],
): boolean => {
  const normalized = formatTimeHHmm(time);
  if (normalized && getAlwaysAllowedProposalTimes(item).includes(normalized)) return false;
  return isTimeSlotBlocked(time, item.duration || null, blockedSlots);
};
