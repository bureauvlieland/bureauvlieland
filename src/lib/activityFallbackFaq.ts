/**
 * Fallback-FAQ voor activiteitendetailpagina's zonder redactionele entry
 * in `activityContent`.
 *
 * Uitsluitend opgebouwd uit velden die daadwerkelijk in de database staan
 * (duur, prijs, groepsgrootte, locatie, aanbieder). Ontbreekt een veld, dan
 * vervalt de bijbehorende vraag — er wordt niets verzonnen.
 */
import type { FaqItem } from "@/components/FaqSection";
import type { BuildingBlock } from "@/types/buildingBlock";
import { formatBlockPrice, formatPriceNote } from "@/types/buildingBlock";
import { getProviderName } from "@/lib/buildingBlockUtils";

export const buildFallbackFaq = (block: BuildingBlock): FaqItem[] => {
  const items: FaqItem[] = [];
  const name = block.name;

  if (block.duration) {
    items.push({
      question: `Hoe lang duurt ${name.toLowerCase()} op Vlieland?`,
      answer: `${name} duurt ${block.duration}. Wij plannen de activiteit in uw programma zodat de tijden aansluiten op de boottijden en de rest van de dag.`,
    });
  }

  if (block.price_type !== "on_request" && block.price_adult != null) {
    const note = formatPriceNote(block);
    items.push({
      question: `Wat kost ${name.toLowerCase()}?`,
      answer: `De prijs is ${formatBlockPrice(block)}${note ? ` ${note}` : ""}. Prijzen zijn onder voorbehoud van beschikbaarheid; u ontvangt altijd één offerte en één factuur van Bureau Vlieland.`,
    });
  } else {
    items.push({
      question: `Wat kost ${name.toLowerCase()}?`,
      answer: `De prijs van ${name.toLowerCase()} stellen wij op aanvraag vast, omdat die afhangt van groepsgrootte en invulling. U ontvangt een offerte met één totaalprijs.`,
    });
  }

  if (block.min_people != null || block.max_people != null) {
    const parts: string[] = [];
    if (block.min_people != null) parts.push(`vanaf ${block.min_people} personen`);
    if (block.max_people != null) parts.push(`tot maximaal ${block.max_people} deelnemers`);
    items.push({
      question: `Kan ${name.toLowerCase()} met een groep?`,
      answer: `Ja. ${name} is te boeken ${parts.join(" ")}. Grotere gezelschappen verdelen wij in overleg over meerdere starttijden.`,
    });
  }

  if (block.location_address) {
    items.push({
      question: `Waar start ${name.toLowerCase()}?`,
      answer: `Het startpunt is ${block.location_address}. De exacte tijd en verzamelplek bevestigen wij in uw programma.`,
    });
  }

  items.push({
    question: `Hoe boek ik ${name.toLowerCase()} via Bureau Vlieland?`,
    answer: `U vraagt ${name.toLowerCase()} direct aan via deze pagina of voegt de activiteit toe aan uw programma. Wij regelen de reservering bij ${getProviderName(block)} en u ontvangt één bevestiging en één factuur.`,
  });

  return items;
};
