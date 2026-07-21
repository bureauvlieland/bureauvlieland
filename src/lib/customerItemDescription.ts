/**
 * Bepaalt welke beschrijving de klant onder een programma-onderdeel te zien
 * krijgt. Volgorde:
 *   1. `block_description` (afkomstig uit de bouwsteen) — leidend als aanwezig.
 *   2. `custom_briefing` — alléén als het item een maatwerk-item is en er
 *      nog geen bouwsteen-beschrijving is. Zo ziet de klant meteen waar het
 *      maatwerk over gaat, ook voordat admin een aparte klantbeschrijving heeft
 *      gevuld.
 *   3. `null` — geen beschrijving tonen.
 */
export function resolveCustomerItemDescription(item: {
  block_description?: string | null;
  is_custom_quote?: boolean | null;
  custom_briefing?: string | null;
}): string | null {
  if (item.block_description && item.block_description.trim() !== "") {
    return item.block_description;
  }
  if (item.is_custom_quote && item.custom_briefing && item.custom_briefing.trim() !== "") {
    return item.custom_briefing;
  }
  return null;
}
