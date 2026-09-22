import heroVlieland from "@/assets/hero-vlieland.jpg";
import type { ReferenceCaseContent } from "@/lib/referenceCases";
import { transformImageUrl } from "@/lib/supabaseImage";

/** Eyebrow boven elke referentiepagina. */
export const REFERENCE_EYEBROW = "Referentie";

/** De hero: de eerste foto van het programma, anders de vaste eilandfoto. */
export const heroImageFor = (item: Pick<ReferenceCaseContent, "photos">): string => {
  const first = item.photos[0];
  return first ? transformImageUrl(first.url, { width: 1800, quality: 80 }) : heroVlieland;
};
