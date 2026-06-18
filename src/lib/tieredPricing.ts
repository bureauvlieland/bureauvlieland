// Tiered pricing — staffelprijs op groepsgrootte
// Wordt opgeslagen in building_blocks.price_extras.tiers (jsonb)

import type { BuildingBlock } from "@/types/buildingBlock";

export interface PriceTier {
  min_people: number;
  max_people: number;
  price: number;
}

export type TiersAboveMax = "highest" | "on_request";

export interface TieredPriceConfig {
  tiers: PriceTier[];
  tiers_above_max?: TiersAboveMax;
}

const isTier = (v: unknown): v is PriceTier =>
  !!v &&
  typeof v === "object" &&
  typeof (v as PriceTier).min_people === "number" &&
  typeof (v as PriceTier).max_people === "number" &&
  typeof (v as PriceTier).price === "number";

export const getTieredConfig = (block: Pick<BuildingBlock, "price_extras">): TieredPriceConfig => {
  const extras = (block.price_extras ?? {}) as Record<string, unknown>;
  const rawTiers = Array.isArray(extras.tiers) ? extras.tiers : [];
  const tiers = (rawTiers as unknown[])
    .filter(isTier)
    .slice()
    .sort((a, b) => a.min_people - b.min_people);
  const above = extras.tiers_above_max === "on_request" ? "on_request" : "highest";
  return { tiers, tiers_above_max: above };
};

export const isTieredBlock = (block: Pick<BuildingBlock, "price_type" | "price_extras">): boolean =>
  block.price_type === "tiered_total" && getTieredConfig(block).tiers.length > 0;

export const resolveTier = (tiers: PriceTier[], people: number): PriceTier | null => {
  if (tiers.length === 0) return null;
  const sorted = tiers.slice().sort((a, b) => a.min_people - b.min_people);
  // Onder de eerste tier → val terug op de eerste tier-prijs (zelden voorkomend; meeste lijsten beginnen bij 0)
  if (people < sorted[0].min_people) return sorted[0];
  const match = sorted.find((t) => people >= t.min_people && people <= t.max_people);
  return match ?? null;
};

/**
 * Bereken het totaalbedrag voor een tiered_total bouwsteen.
 * Retourneert `null` wanneer er geen tier matcht én `tiers_above_max = "on_request"`.
 */
export const calculateTieredTotal = (
  block: Pick<BuildingBlock, "price_type" | "price_extras">,
  numberOfPeople: number,
): number | null => {
  const cfg = getTieredConfig(block);
  if (cfg.tiers.length === 0) return null;
  const tier = resolveTier(cfg.tiers, numberOfPeople);
  if (tier) return tier.price;
  // Boven de hoogste tier
  if (cfg.tiers_above_max === "on_request") return null;
  const highest = cfg.tiers[cfg.tiers.length - 1];
  return highest.price;
};

/** "vanaf €750" voor cards/lijsten. */
export const formatTieredFromLabel = (block: Pick<BuildingBlock, "price_extras">): string | null => {
  const { tiers } = getTieredConfig(block);
  if (tiers.length === 0) return null;
  const min = Math.min(...tiers.map((t) => t.price));
  return `vanaf € ${min.toFixed(0).replace(".", ",")}`;
};

/** Parse "0-29  750" / "0-29 €750" regels naar tiers. */
export const parseTiersFromText = (text: string): PriceTier[] => {
  const result: PriceTier[] = [];
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;
    // matches "<min>-<max> [stuff] <price>"
    const m = line.match(/(\d+)\s*[-–]\s*(\d+)[^\d]*(\d+(?:[.,]\d+)?)/);
    if (!m) continue;
    const min_people = parseInt(m[1], 10);
    const max_people = parseInt(m[2], 10);
    const price = parseFloat(m[3].replace(/\./g, "").replace(",", "."));
    if (!Number.isFinite(min_people) || !Number.isFinite(max_people) || !Number.isFinite(price)) continue;
    result.push({ min_people, max_people, price });
  }
  return result.sort((a, b) => a.min_people - b.min_people);
};

export const validateTiers = (tiers: PriceTier[]): string | null => {
  if (tiers.length === 0) return "Voeg minimaal één staffel toe.";
  const sorted = tiers.slice().sort((a, b) => a.min_people - b.min_people);
  for (let i = 0; i < sorted.length; i++) {
    const t = sorted[i];
    if (t.max_people < t.min_people) return `Staffel ${i + 1}: t/m moet ≥ vanaf zijn.`;
    if (t.price < 0) return `Staffel ${i + 1}: prijs moet ≥ 0 zijn.`;
    if (i > 0 && t.min_people <= sorted[i - 1].max_people) {
      return `Staffel ${i + 1}: overlap met vorige staffel.`;
    }
  }
  return null;
};
