import type { SectionTone } from "@/components/system";

/**
 * Nummering en toonwisseling van de secties op een pagina: elke aanroep
 * geeft het volgende nummer ("01", "02", …) en wisselt tussen de tonen.
 */
export const sectionCounter = (tones: SectionTone[] = ["muted", "default"]) => {
  let n = 0;
  return () => {
    n += 1;
    return { number: String(n).padStart(2, "0"), tone: tones[(n - 1) % tones.length] };
  };
};
