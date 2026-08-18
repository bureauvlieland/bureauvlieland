import {
  BOARD_PREFERENCE_OPTIONS,
  ROOM_OCCUPANCY_OPTIONS,
  ROOM_TYPES,
  getBoardLabel,
} from "@/types/accommodation";

/**
 * Gestructureerde logieswensen: kamerbezetting + verzorging.
 *
 * Deze waarden staan op `accommodation_requests` (room_count, room_occupancy,
 * room_types, board_preference) en worden op drie plekken gebruikt: admin
 * (bewerken en aanmaken), klantportaal (zelf bijsturen) en de offerte-aanvraag
 * naar logiespartners. Eén bron van waarheid voorkomt dat die weergaven
 * uiteenlopen.
 */
export interface AccommodationSetup {
  room_count: number | null;
  room_occupancy: string | null;
  room_types: string[];
  board_preference: string | null;
}

export const EMPTY_ACCOMMODATION_SETUP: AccommodationSetup = {
  room_count: null,
  room_occupancy: null,
  room_types: [],
  board_preference: null,
};

function labelOf(
  options: readonly { value: string; label: string }[],
  value?: string | null,
): string | null {
  if (!value) return null;
  return options.find((o) => o.value === value)?.label ?? value;
}

export function getRoomOccupancyLabel(value?: string | null): string | null {
  return labelOf(ROOM_OCCUPANCY_OPTIONS, value);
}

export function getRoomTypeLabel(value?: string | null): string | null {
  return labelOf(ROOM_TYPES, value);
}

export function getBoardPreferenceLabel(value?: string | null): string | null {
  return getBoardLabel(value) ?? labelOf(BOARD_PREFERENCE_OPTIONS, value);
}

/** Korte samenvatting van de kamerwens, of null als er niets is vastgelegd. */
export function summarizeRooms(setup: Partial<AccommodationSetup> | null | undefined): string | null {
  if (!setup) return null;
  const parts: string[] = [];
  if (setup.room_count && setup.room_count > 0) {
    parts.push(`${setup.room_count} ${setup.room_count === 1 ? "kamer" : "kamers"}`);
  }
  const occupancy = getRoomOccupancyLabel(setup.room_occupancy);
  if (occupancy) parts.push(occupancy.toLowerCase());
  const types = (setup.room_types || [])
    .map((t) => getRoomTypeLabel(t))
    .filter((l): l is string => !!l);
  if (types.length > 0) parts.push(types.join(", "));
  return parts.length > 0 ? parts.join(" · ") : null;
}

/** Verzorgingslabel, of null als de klant nog geen voorkeur gaf. */
export function summarizeBoard(setup: Partial<AccommodationSetup> | null | undefined): string | null {
  return getBoardPreferenceLabel(setup?.board_preference ?? null);
}

/**
 * Regels voor de offerte-aanvraagmail naar de logiespartner. Alleen gevulde
 * wensen worden meegestuurd — een partner mag geen lege of gegokte regels zien.
 */
export function accommodationSetupEmailLines(
  setup: Partial<AccommodationSetup> | null | undefined,
): string[] {
  const lines: string[] = [];
  const rooms = summarizeRooms(setup);
  if (rooms) lines.push(`- Gewenste kamers: ${rooms}`);
  const board = summarizeBoard(setup);
  if (board) lines.push(`- Gewenste verzorging: ${board}`);
  return lines;
}

/**
 * Normaliseert formulierinvoer naar de databasevorm. Lege waarden worden null
 * (niet 0 of ""), zodat "niet ingevuld" onderscheidbaar blijft.
 */
export function normalizeAccommodationSetup(
  input: Partial<AccommodationSetup> | null | undefined,
): AccommodationSetup {
  const rawCount = input?.room_count;
  const count =
    rawCount === null || rawCount === undefined || Number.isNaN(Number(rawCount))
      ? null
      : Math.max(0, Math.floor(Number(rawCount)));
  const validTypes = new Set(ROOM_TYPES.map((t) => t.value as string));
  return {
    room_count: count && count > 0 ? count : null,
    room_occupancy: input?.room_occupancy?.trim() ? input.room_occupancy : null,
    room_types: Array.from(new Set((input?.room_types || []).filter((t) => validTypes.has(t)))),
    board_preference: input?.board_preference?.trim() ? input.board_preference : null,
  };
}

/**
 * Validatie: de invoer mag niet in tegenspraak zijn met het aantal gasten.
 * Meer kamers dan gasten of een bezetting die niet past is bijna altijd een
 * typefout — die willen we vóór het versturen naar partners tegenhouden.
 */
export function validateAccommodationSetup(
  setup: Partial<AccommodationSetup> | null | undefined,
  numberOfGuests?: number | null,
): string | null {
  const normalized = normalizeAccommodationSetup(setup);
  if (normalized.room_count !== null && normalized.room_count > 200) {
    return "Aantal kamers lijkt onrealistisch hoog";
  }
  if (
    normalized.room_count !== null &&
    numberOfGuests &&
    numberOfGuests > 0 &&
    normalized.room_count > numberOfGuests
  ) {
    return `Meer kamers (${normalized.room_count}) dan gasten (${numberOfGuests}) — controleer de invoer`;
  }
  const occ = normalized.room_occupancy;
  if (
    normalized.room_count !== null &&
    numberOfGuests &&
    numberOfGuests > 0 &&
    occ &&
    /^[0-9]+$/.test(occ)
  ) {
    const capacity = normalized.room_count * Number(occ);
    if (capacity < numberOfGuests) {
      return `${normalized.room_count} kamers × ${occ} personen = ${capacity} plaatsen, te weinig voor ${numberOfGuests} gasten`;
    }
  }
  const validBoards = new Set(BOARD_PREFERENCE_OPTIONS.map((b) => b.value as string));
  if (normalized.board_preference && !validBoards.has(normalized.board_preference)) {
    return "Kies een geldige verzorging";
  }
  return null;
}

/** True wanneer er iets is gewijzigd t.o.v. de opgeslagen waarden. */
export function accommodationSetupChanged(
  a: Partial<AccommodationSetup> | null | undefined,
  b: Partial<AccommodationSetup> | null | undefined,
): boolean {
  const x = normalizeAccommodationSetup(a);
  const y = normalizeAccommodationSetup(b);
  return (
    x.room_count !== y.room_count ||
    x.room_occupancy !== y.room_occupancy ||
    x.board_preference !== y.board_preference ||
    [...x.room_types].sort().join("|") !== [...y.room_types].sort().join("|")
  );
}
