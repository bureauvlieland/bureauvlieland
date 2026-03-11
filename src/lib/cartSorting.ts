import type { CartItemDetail } from "@/types/buildingBlock";

const FERRY_HEEN_ID = "boot-enkel-heen";
const FERRY_TERUG_ID = "boot-enkel-terug";
const FIETS_ID = "fiets-huur";

/** Pin ferry heen + fiets to top on first day, ferry terug to bottom on last day */
export const sortCartItemsForDay = (
  items: CartItemDetail[],
  dayIndex: number,
  totalDays: number
): CartItemDetail[] => {
  const lastDay = Math.max(0, totalDays - 1);

  return [...items].sort((a, b) => {
    const rankA = getPinRank(a.blockId, dayIndex, lastDay);
    const rankB = getPinRank(b.blockId, dayIndex, lastDay);

    if (rankA !== rankB) return rankA - rankB;

    // Within same rank, sort by preferredTime
    if (!a.preferredTime && !b.preferredTime) return 0;
    if (!a.preferredTime) return 1;
    if (!b.preferredTime) return -1;
    return a.preferredTime.localeCompare(b.preferredTime);
  });
};

/** Returns sort rank: lower = higher in list. 50 = normal. */
function getPinRank(blockId: string, dayIndex: number, lastDay: number): number {
  // Ferry heen: pin to top on day 0
  if (blockId === FERRY_HEEN_ID && dayIndex === 0) return 0;
  // Fiets: pin just below ferry heen on day 0
  if (blockId === FIETS_ID && dayIndex === 0) return 1;
  // Ferry terug: pin to bottom on last day
  if (blockId === FERRY_TERUG_ID && dayIndex === lastDay) return 100;
  return 50;
}
