/**
 * De prijs op de publieke catalogus: de bouwstenenpagina, de detailpagina's
 * van bouwstenen en de cateringpagina.
 *
 * Alleen een direct boekbare bouwsteen toont een bedrag, want daar
 * reserveert de bezoeker meteen bij de aanbieder. Bij alle andere bouwstenen
 * staat de prijs in het voorstel: die hangt af van groepsgrootte, datum en
 * de rest van het programma, en een stuksprijs naast de naam van de
 * aanbieder geeft geen reden om via het bureau te gaan (besluit 26 oktober
 * 2026, zie roadmap). De programma-bouwer, het gedeelde programma en het
 * klantportaal zijn geen catalogus en tonen de prijs per onderdeel wel.
 */
import { BUREAU_PROMISE } from "@/content/promises";
import { formatBlockPrice, formatPriceNote, type BuildingBlock } from "@/types/buildingBlock";

/** Op een kaart of in een boekblok, in plaats van een bedrag. */
export const PRICE_IN_PROPOSAL = "Prijs in ons voorstel";

/** In een feitenlijst achter het label "Prijs". */
export const PRICE_IN_PROPOSAL_FACT = "In ons voorstel";

export interface PublicPrice {
  value: string;
  note?: string;
}

/** Prijs en toelichting voor een `CatalogCard` of boekblok. */
export const publicBlockPrice = (block: BuildingBlock, bookable: boolean): PublicPrice =>
  bookable
    ? { value: formatBlockPrice(block), note: formatPriceNote(block) || undefined }
    : { value: PRICE_IN_PROPOSAL, note: BUREAU_PROMISE.short };

/** Dezelfde prijs als één regel tekst, voor een `MediaCard`-voet of een feitenlijst. */
export const publicBlockPriceLine = (block: BuildingBlock, bookable: boolean): string =>
  bookable ? [formatBlockPrice(block), formatPriceNote(block)].filter(Boolean).join(" ") : PRICE_IN_PROPOSAL;
