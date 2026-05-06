// Client-side categorisatie van voorbeeldprogramma's op basis van naam.
// Tijdelijk totdat program_templates een eigen `theme` veld krijgt.

export type ProgramTheme =
  | "compleet"
  | "avontuur"
  | "wellness"
  | "culinair"
  | "chill";

export interface ProgramThemeMeta {
  id: ProgramTheme;
  label: string;
  className: string; // tailwind classes voor badge
}

export const THEME_META: Record<ProgramTheme, ProgramThemeMeta> = {
  compleet: { id: "compleet", label: "Compleet", className: "bg-primary/90 text-primary-foreground" },
  avontuur: { id: "avontuur", label: "Avontuur", className: "bg-orange-500/90 text-white" },
  wellness: { id: "wellness", label: "Wellness", className: "bg-emerald-600/90 text-white" },
  culinair: { id: "culinair", label: "Culinair", className: "bg-amber-600/90 text-white" },
  chill:    { id: "chill",    label: "Chill",    className: "bg-sky-600/90 text-white" },
};

export const inferTheme = (name: string, description?: string | null): ProgramTheme => {
  const t = `${name} ${description ?? ""}`.toLowerCase();
  if (t.includes("wellness")) return "wellness";
  if (t.includes("culinair") || t.includes("food")) return "culinair";
  if (t.includes("chill") || t.includes("rust")) return "chill";
  if (t.includes("actie") || t.includes("avontuur") || t.includes("sport")) return "avontuur";
  return "compleet";
};

export const durationBucket = (days: number): "1" | "2" | "3" | "4+" => {
  if (days <= 1) return "1";
  if (days === 2) return "2";
  if (days === 3) return "3";
  return "4+";
};
