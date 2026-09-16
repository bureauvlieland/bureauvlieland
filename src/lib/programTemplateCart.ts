/**
 * Zet een voorbeeldprogramma om in cart-items voor de programma-wizard.
 * Bewust puur (geen React, geen supabase) zodat het gedrag getest kan worden.
 */
import type { CartItemDetail } from "@/types/buildingBlock";
import type { ProgramTemplate } from "@/types/programTemplate";

/** Vervoer dat de wizard zelf beheert; uit een voorbeeldprogramma slaan we het over. */
export const TEMPLATE_SKIP_BLOCK_IDS = new Set([
  "boot-enkel-heen",
  "boot-enkel-terug",
  "boot-retour",
  "fiets-huur",
]);

// Bouwstenen die zelf al een overtocht zijn (privévaart, watertaxi). Als een
// voorbeeldprogramma hier één van bevat, hoeft de standaard Doeksen-boot niet
// ook nog verplicht toegevoegd te worden.
export const ALTERNATIVE_CROSSING_BLOCK_IDS = new Set([
  "regina-andrea-prive-heen",
  "regina-andrea-prive-terug",
  "rescueboat",
  "rescueboat-kopie",
  "watertaxi-harlingen-vlieland",
  "watertaxi-vlieland-harlingen",
]);

export interface BuildCartFromTemplateOptions {
  /**
   * Is deze bouwsteen zichtbaar voor de klant? Een niet-gepubliceerde
   * bouwsteen in een voorbeeldprogramma is voor de klant onzichtbaar (RLS)
   * maar zou wél in het programma komen, en dan weigert het versturen
   * ("niet meer beschikbaar") zonder dat de klant iets kan weghalen.
   */
  isBlockAvailable: (blockId: string) => boolean;
  /**
   * Standaard Doeksen-boot en fietsen toevoegen (oud gedrag). Bij `false`
   * laat het programma vervoer aan de vervoerstap van de wizard over.
   */
  includeDefaultTransport?: boolean;
}

export const templateHasOwnCrossing = (template: Pick<ProgramTemplate, "items">): boolean =>
  (template.items ?? []).some((item) => ALTERNATIVE_CROSSING_BLOCK_IDS.has(item.block_id));

export function buildCartItemsFromTemplate(
  template: ProgramTemplate,
  { isBlockAvailable, includeDefaultTransport = true }: BuildCartFromTemplateOptions,
): CartItemDetail[] {
  const lastDay = Math.max(0, template.duration_days - 1);
  const items: CartItemDetail[] = [];

  if (includeDefaultTransport) {
    if (!templateHasOwnCrossing(template)) {
      items.push({ blockId: "boot-enkel-heen", preferredTime: null, notes: "", dayIndex: 0 });
      items.push({ blockId: "boot-enkel-terug", preferredTime: null, notes: "", dayIndex: lastDay });
    }
    items.push({ blockId: "fiets-huur", preferredTime: null, notes: "", dayIndex: 0 });
  }

  const sorted = [...(template.items ?? [])].sort((a, b) => {
    if (a.day_index !== b.day_index) return a.day_index - b.day_index;
    return a.sort_order - b.sort_order;
  });

  for (const item of sorted) {
    if (TEMPLATE_SKIP_BLOCK_IDS.has(item.block_id)) continue;
    if (items.some((i) => i.blockId === item.block_id)) continue;
    if (!isBlockAvailable(item.block_id)) continue;
    items.push({
      blockId: item.block_id,
      preferredTime: item.preferred_time || null,
      notes: item.notes || "",
      dayIndex: Math.min(item.day_index, lastDay),
    });
  }

  return items;
}
