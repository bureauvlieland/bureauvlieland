/**
 * Koppeling tussen bouwstenen (building_blocks) en direct boekbare
 * MAP-activiteiten (MijnActiviteitenPlanner).
 *
 * Matchen gebeurt in twee stappen:
 *  1. Handmatig vastgezet via `building_blocks.map_activity_type_id`.
 *  2. Automatisch op genormaliseerde naam, maar alleen binnen dezelfde partner
 *     (`provider_id`), zodat er geen valse matches over partners heen ontstaan.
 */

export interface BookableBundle {
  /** MAP ActivityTypeId */
  activityTypeId: number;
  /** Bureau-partner id (partners.id) */
  partnerId: string | null;
  partnerName: string | null;
  /** MAP tenant slug */
  partnerSlug: string | null;
  name: string;
  description: string | null;
  image: string | null;
  pricePerPerson: number | null;
  /** ISO datum/tijd van het eerstvolgende moment */
  nextDeparture: string;
  totalSlotsLeft: number;
  /** Aantal beschikbare momenten in het venster */
  momentCount: number;
}

/** Kleine letters, accenten en leestekens weg, dubbele spaties samengevoegd. */
export const normalizeActivityName = (value: string): string =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

interface BlockLike {
  id: string;
  name: string;
  provider_id: string | null;
  map_activity_type_id?: number | null;
}

/** Zoekt de MAP-bundel die bij deze bouwsteen hoort, of null. */
export const findBundleForBlock = (
  block: BlockLike,
  bundles: BookableBundle[],
): BookableBundle | null => {
  if (block.map_activity_type_id != null) {
    const byId = bundles.find((b) => b.activityTypeId === block.map_activity_type_id);
    if (byId) return byId;
  }
  if (!block.provider_id) return null;
  const target = normalizeActivityName(block.name);
  if (!target) return null;
  return (
    bundles.find(
      (b) => b.partnerId === block.provider_id && normalizeActivityName(b.name) === target,
    ) ?? null
  );
};

/**
 * Verdeelt de bundels: welke horen bij een bouwsteen (map van block.id → bundel)
 * en welke blijven over als losse MAP-kaart.
 */
export const matchBundlesToBlocks = (
  blocks: BlockLike[],
  bundles: BookableBundle[],
): { matched: Map<string, BookableBundle>; unmatched: BookableBundle[] } => {
  const matched = new Map<string, BookableBundle>();
  const used = new Set<number>();

  for (const block of blocks) {
    const bundle = findBundleForBlock(block, bundles);
    if (bundle && !matched.has(block.id)) {
      matched.set(block.id, bundle);
      used.add(bundle.activityTypeId);
    }
  }

  return {
    matched,
    unmatched: bundles.filter((b) => !used.has(b.activityTypeId)),
  };
};

/** Deeplink naar de boekpagina met activiteit en datum voorgeselecteerd. */
export const buildBookingLink = (bundle: BookableBundle): string => {
  const params = new URLSearchParams({ type: String(bundle.activityTypeId) });
  if (bundle.partnerSlug) params.set("partner", bundle.partnerSlug);
  const date = bundle.nextDeparture.slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(date)) params.set("date", date);
  return `/activiteiten-boeken?${params.toString()}`;
};
