import type { CartItemDetail } from "@/types/buildingBlock";
import { isHeenCrossingBlock, isTerugCrossingBlock, ALL_BIKE_BLOCK_IDS } from "@/lib/programWizardCart";

/** Pin crossing heen + fiets to top on first day, crossing terug to bottom on last day */
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
  // Overtocht heen (Doeksen, watertaxi, privévaart): pin to top on day 0
  if (isHeenCrossingBlock(blockId) && dayIndex === 0) return 0;
  // Fiets: pin just below the crossing on day 0
  if (ALL_BIKE_BLOCK_IDS.includes(blockId) && dayIndex === 0) return 1;
  // Overtocht terug: pin to bottom on last day
  if (isTerugCrossingBlock(blockId) && dayIndex === lastDay) return 100;
  return 50;
}
