/**
 * Helpers for the program configurator wizard — deciding which mandatory
 * bureau blocks (crossing, bikes) get pre-added to the cart based on the
 * user's situation and transport preferences.
 *
 * Bewust puur: geen React, geen supabase. Zie programWizardCart.test.ts.
 */

export const FERRY_HEEN_ID = "boot-enkel-heen";
export const FERRY_TERUG_ID = "boot-enkel-terug";
export const WATERTAXI_HEEN_ID = "watertaxi-harlingen-vlieland";
export const WATERTAXI_TERUG_ID = "watertaxi-vlieland-harlingen";
export const REGINA_HEEN_ID = "regina-andrea-prive-heen";
export const REGINA_TERUG_ID = "regina-andrea-prive-terug";
export const FIETS_STANDAARD_ID = "fiets-huur";
export const FIETS_EBIKE_ID = "fiets-huur-kopie-2";

/** Waar is de groep? Bepaalt welke stappen de wizard toont. */
export type GroupSituation = "vanaf_wal" | "op_vlieland";

/** Hoe komt de groep over? Alleen relevant bij "vanaf_wal". */
export type CrossingChoice = "doeksen" | "watertaxi" | "regina" | "eigen";

/** "eigen" = de groep heeft al fietsen (bijvoorbeeld bij een weekverblijf). */
export type BikeChoice = "standaard" | "ebike" | "eigen" | "geen";

export interface WizardSituation {
  situation: GroupSituation;
  /** Bij "op_vlieland": accommodatie of adres waar het programma begint. */
  startLocation: string | null;
  /** Bij "op_vlieland": begin van het tijdvak (HH:MM). */
  startTime: string | null;
  /** Bij "op_vlieland": einde van het tijdvak (HH:MM). */
  endTime: string | null;
}

export interface TransportPreferences {
  crossing: CrossingChoice;
  /** Bij "eigen": aankomsttijd op Vlieland (HH:MM). */
  arrivalTime: string | null;
  /** Bij "eigen": vertrektijd van Vlieland (HH:MM). */
  departureTime: string | null;
  bikeChoice: BikeChoice;
}

export const DEFAULT_WIZARD_SITUATION: WizardSituation = {
  situation: "vanaf_wal",
  startLocation: null,
  startTime: "10:00",
  endTime: "17:00",
};

export const DEFAULT_TRANSPORT_PREFERENCES: TransportPreferences = {
  crossing: "doeksen",
  arrivalTime: null,
  departureTime: null,
  bikeChoice: "standaard",
};

/** Capaciteit per boot, gebruikt als de bouwsteen zelf geen max_people heeft. */
export const WATERTAXI_DEFAULT_CAPACITY = 12;
/** Minimum groepsgrootte voor de privévaart, idem. */
export const REGINA_DEFAULT_MIN_PEOPLE = 30;

/** Aantal watertaxi's dat nodig is voor deze groep. */
export const watertaxiBoatsNeeded = (numberOfPeople: number, capacity = WATERTAXI_DEFAULT_CAPACITY): number =>
  Math.max(1, Math.ceil(Math.max(1, numberOfPeople) / Math.max(1, capacity)));

export const CROSSING_BLOCK_IDS: Record<Exclude<CrossingChoice, "eigen">, { heen: string; terug: string }> = {
  doeksen: { heen: FERRY_HEEN_ID, terug: FERRY_TERUG_ID },
  watertaxi: { heen: WATERTAXI_HEEN_ID, terug: WATERTAXI_TERUG_ID },
  regina: { heen: REGINA_HEEN_ID, terug: REGINA_TERUG_ID },
};

/** Alle bouwstenen die de wizard als "overtocht" beheert. */
export const ALL_CROSSING_BLOCK_IDS: string[] = Object.values(CROSSING_BLOCK_IDS).flatMap((c) => [c.heen, c.terug]);
export const ALL_BIKE_BLOCK_IDS: string[] = [FIETS_STANDAARD_ID, FIETS_EBIKE_ID];
/** Vervoer + fietsen: onderdelen die de wizard zelf plaatst en niet als "eigen keuze" telt. */
export const WIZARD_TRANSPORT_BLOCK_IDS = new Set<string>([...ALL_CROSSING_BLOCK_IDS, ...ALL_BIKE_BLOCK_IDS, "boot-retour"]);

export const isCrossingBlock = (blockId: string): boolean => ALL_CROSSING_BLOCK_IDS.includes(blockId);
export const isHeenCrossingBlock = (blockId: string): boolean =>
  Object.values(CROSSING_BLOCK_IDS).some((c) => c.heen === blockId);
export const isTerugCrossingBlock = (blockId: string): boolean =>
  Object.values(CROSSING_BLOCK_IDS).some((c) => c.terug === blockId);

export interface CartLike {
  blockId: string;
}

export interface PlannedCartOp {
  action: "add" | "remove";
  blockId: string;
  dayIndex: number;
  /** Alleen bij "add": vooraf ingevulde notitie op het onderdeel (bv. aantal boten). */
  notes?: string;
}

export interface PlanTransportOptions {
  /** Capaciteit van één watertaxi; standaard 12. */
  watertaxiCapacity?: number;
}

/**
 * Given the current cart contents, the situation, the transport preferences
 * and how many days the program spans, return the mutations required to bring
 * the cart in line with the preferences.
 *
 * The rules:
 * - Exactly the crossing blocks for the chosen crossing are in the cart
 *   (heen on day 0, terug on the last day); every other crossing block is
 *   removed. "eigen" and "op_vlieland" mean no crossing blocks at all.
 * - A watertaxi above its capacity gets a note with the number of boats.
 * - Bikes: at most one of standaard / ebike. "eigen" (already have bikes)
 *   and "geen" remove both.
 */
export function planTransportCartOps(
  cart: CartLike[],
  situation: GroupSituation,
  prefs: TransportPreferences,
  numberOfDays: number,
  numberOfPeople: number,
  options: PlanTransportOptions = {},
): PlannedCartOp[] {
  const ops: PlannedCartOp[] = [];
  const inCart = (id: string) => cart.some((c) => c.blockId === id);
  const lastDay = Math.max(0, numberOfDays - 1);

  const wanted =
    situation === "vanaf_wal" && prefs.crossing !== "eigen" ? CROSSING_BLOCK_IDS[prefs.crossing] : null;

  // Remove every crossing block that is not the wanted one
  for (const id of ALL_CROSSING_BLOCK_IDS) {
    const isWanted = wanted !== null && (id === wanted.heen || id === wanted.terug);
    if (!isWanted && inCart(id)) {
      ops.push({ action: "remove", blockId: id, dayIndex: isTerugCrossingBlock(id) ? lastDay : 0 });
    }
  }

  if (wanted) {
    const notes =
      prefs.crossing === "watertaxi"
        ? (() => {
            const boats = watertaxiBoatsNeeded(numberOfPeople, options.watertaxiCapacity);
            return boats > 1 ? `${boats} watertaxi's voor ${numberOfPeople} personen` : undefined;
          })()
        : undefined;
    if (!inCart(wanted.heen)) ops.push({ action: "add", blockId: wanted.heen, dayIndex: 0, ...(notes ? { notes } : {}) });
    if (!inCart(wanted.terug)) ops.push({ action: "add", blockId: wanted.terug, dayIndex: lastDay, ...(notes ? { notes } : {}) });
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

/**
 * Leid de vervoerskeuze af uit wat er in het programma zit, bijvoorbeeld na
 * het laden van een voorbeeldprogramma dat zelf een watertaxi of privévaart
 * bevat. Zonder overtocht in het programma blijft de huidige keuze staan.
 */
export function inferCrossingFromCart(cart: CartLike[], fallback: CrossingChoice): CrossingChoice {
  for (const [choice, ids] of Object.entries(CROSSING_BLOCK_IDS) as [Exclude<CrossingChoice, "eigen">, { heen: string; terug: string }][]) {
    if (cart.some((c) => c.blockId === ids.heen || c.blockId === ids.terug)) return choice;
  }
  return fallback;
}

/** Tijdvak waarin de groep op het eiland is, in HH:MM. Null als onbekend. */
export function availabilityWindow(
  situation: WizardSituation,
  prefs: TransportPreferences,
): { from: string | null; to: string | null } {
  if (situation.situation === "op_vlieland") {
    return { from: situation.startTime, to: situation.endTime };
  }
  if (prefs.crossing === "eigen") {
    return { from: prefs.arrivalTime, to: prefs.departureTime };
  }
  return { from: null, to: null };
}

const isHHMM = (v: string | null | undefined): v is string => !!v && /^([01]\d|2[0-3]):[0-5]\d$/.test(v);

/** Normaliseer een tijd uit een invoerveld naar HH:MM of null. */
export const normalizeWizardTime = (v: string | null | undefined): string | null => (isHHMM(v) ? v : null);
