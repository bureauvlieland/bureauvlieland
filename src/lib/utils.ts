import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

// tailwind-merge kent de eigen typeschaal, schaduwen en duren van het
// ontwerpsysteem niet. Zonder deze uitbreiding ziet het `text-display-lg`
// als een kleur en gooit het die weg zodra er ook `text-foreground` staat.
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      "font-size": [{ text: ["display-xl", "display-lg", "display-md", "eyebrow"] }],
      shadow: [{ shadow: ["soft", "medium", "dramatic", "glow"] }],
      duration: [{ duration: ["fast", "base", "slow"] }],
    },
  },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
