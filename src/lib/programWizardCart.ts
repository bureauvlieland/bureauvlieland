/**
 * Helpers for the program configurator wizard — deciding which mandatory
 * bureau blocks (ferry, bikes) get pre-added to the cart based on the user's
 * transport preferences from the "Vervoer & fietsen" step.
 */

export const FERRY_HEEN_ID = "boot-enkel-heen";
export const FERRY_TERUG_ID = "boot-enkel-terug";
export const FIETS_STANDAARD_ID = "fiets-huur";
export const FIETS_EBIKE_ID = "fiets-huur-kopie-2";

export type BikeChoice = "geen" | "standaard" | "ebike";

export interface TransportPreferences {
  ferryIncluded: boolean;
  bikeChoice: BikeChoice;
}

export interface CartLike {
  blockId: string;
}

export interface PlannedCartOp {
  action: "add" | "remove";
  blockId: string;
  dayIndex: number;
}

/**
 * Given the current cart contents, the transport preferences, and how many
 * days the program spans, return the mutations required to bring the cart
 * in line with the preferences.
 *
 * The rules:
 * - Ferry heen is added on day 0, terug on the last day, only if `ferryIncluded`.
 *   If `ferryIncluded` is false, any existing ferry rows should be removed.
 * - Bikes: at most one of `fiets-huur` (standaard) or `fiets-huur-kopie-2` (ebike)
 *   is in the cart. If the user chose "geen", both are removed. When switching
 *   between types the previous choice is removed before adding the new one.
 */
export function planTransportCartOps(
  cart: CartLike[],
  prefs: TransportPreferences,
  numberOfDays: number,
): PlannedCartOp[] {
  const ops: PlannedCartOp[] = [];
  const inCart = (id: string) => cart.some((c) => c.blockId === id);
  const lastDay = Math.max(0, numberOfDays - 1);

  // Ferry
  if (prefs.ferryIncluded) {
    if (!inCart(FERRY_HEEN_ID)) ops.push({ action: "add", blockId: FERRY_HEEN_ID, dayIndex: 0 });
    if (!inCart(FERRY_TERUG_ID)) ops.push({ action: "add", blockId: FERRY_TERUG_ID, dayIndex: lastDay });
  } else {
    if (inCart(FERRY_HEEN_ID)) ops.push({ action: "remove", blockId: FERRY_HEEN_ID, dayIndex: 0 });
    if (inCart(FERRY_TERUG_ID)) ops.push({ action: "remove", blockId: FERRY_TERUG_ID, dayIndex: lastDay });
  }

  // Bikes — mutually exclusive
  const wantStandaard = prefs.bikeChoice === "standaard";
  const wantEbike = prefs.bikeChoice === "ebike";

  if (!wantStandaard && inCart(FIETS_STANDAARD_ID)) {
    ops.push({ action: "remove", blockId: FIETS_STANDAARD_ID, dayIndex: 0 });
  }
  if (!wantEbike && inCart(FIETS_EBIKE_ID)) {
    ops.push({ action: "remove", blockId: FIETS_EBIKE_ID, dayIndex: 0 });
  }
  if (wantStandaard && !inCart(FIETS_STANDAARD_ID)) {
    ops.push({ action: "add", blockId: FIETS_STANDAARD_ID, dayIndex: 0 });
  }
  if (wantEbike && !inCart(FIETS_EBIKE_ID)) {
    ops.push({ action: "add", blockId: FIETS_EBIKE_ID, dayIndex: 0 });
  }

  return ops;
}
