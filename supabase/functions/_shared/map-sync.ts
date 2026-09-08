// Pure hulpfuncties voor map-sync-blocks: wat neemt een bouwsteen over uit
// zijn MAP-activiteitstype, en wat blijft van het bureau.

export interface MapActivityTypeLike {
  Id: number;
  Name: string;
  Description?: string | null;
  Duration?: number | null; // uren
  Image?: string | null;
}

export interface MapActivityLike {
  ActivityTypeId: number;
  Departure: string;
  PricePerPerson?: number | null;
  IsCancelled?: boolean;
  IsActive?: boolean;
}

export interface BlockLike {
  id: string;
  map_activity_type_id: number | null;
  map_sync_price: boolean;
  description: string | null;
  duration: string | null;
  price_adult: number | null;
}

/** 1 → "1 uur", 1.5 → "1,5 uur", 0.75 → "45 minuten", null → null. */
export function formatDurationHours(hours: number | null | undefined): string | null {
  if (typeof hours !== "number" || !Number.isFinite(hours) || hours <= 0) return null;
  if (hours < 1) return `${Math.round(hours * 60)} minuten`;
  const rounded = Math.round(hours * 4) / 4;
  const text = Number.isInteger(rounded) ? String(rounded) : String(rounded).replace(".", ",");
  return `${text} uur`;
}

/**
 * Prijs per persoon van het eerstvolgende niet-geannuleerde moment van dit
 * activiteitstype; null als er geen geplande momenten zijn.
 */
export function pickPricePerPerson(
  activities: MapActivityLike[],
  activityTypeId: number,
  now: Date = new Date(),
): number | null {
  const upcoming = activities
    .filter((a) => a.ActivityTypeId === activityTypeId && !a.IsCancelled && a.IsActive !== false)
    .filter((a) => typeof a.PricePerPerson === "number" && (a.PricePerPerson as number) > 0)
    .filter((a) => new Date(a.Departure).getTime() >= now.getTime())
    .sort((a, b) => a.Departure.localeCompare(b.Departure));
  return upcoming.length > 0 ? (upcoming[0].PricePerPerson as number) : null;
}

export interface BlockSyncUpdate {
  description?: string;
  duration?: string;
  price_adult?: number;
  /** MAP-bestandsreferentie van de foto; de aanroeper importeert die. */
  imageRef?: string;
}

/**
 * Wat er aan de bouwsteen verandert. Alleen velden met een echte waarde uit
 * MAP en die daadwerkelijk anders zijn; naam en overige velden blijven van
 * het bureau. Leeg object = niets te doen.
 */
export function buildBlockUpdate(
  block: BlockLike,
  type: MapActivityTypeLike,
  pricePerPerson: number | null,
): BlockSyncUpdate {
  const update: BlockSyncUpdate = {};
  const description = type.Description?.trim();
  if (description && description !== (block.description ?? "").trim()) update.description = description;
  const duration = formatDurationHours(type.Duration);
  if (duration && duration !== (block.duration ?? "").trim()) update.duration = duration;
  if (block.map_sync_price && pricePerPerson !== null && pricePerPerson !== block.price_adult) {
    update.price_adult = pricePerPerson;
  }
  const imageRef = type.Image?.trim();
  if (imageRef) update.imageRef = imageRef;
  return update;
}
