import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Kop van een sectie of pagina in de redactionele stijl van de homepage:
 * een kleine eyebrow (met optioneel sectienummer), een lichte Fraunces-kop
 * en een intro. Eén stijl voor alle marketingpagina's (besluit 2, 18
 * september 2026); de negen losse eyebrow-varianten verdwijnen hiermee.
 */
interface SectionHeaderProps {
  /** Kleine kop erboven, bijvoorbeeld "Bouwstenen". */
  eyebrow?: string;
  /** Sectienummer voor de eyebrow: "02" wordt "· 02 — Bouwstenen". */
  number?: string;
  title: ReactNode;
  intro?: ReactNode;
  align?: "left" | "center";
  /** `h1` op een pagina-hero, anders `h2`. */
  as?: "h1" | "h2" | "h3";
  /** Op een donkere sectie: lichte tekst en zand als eyebrow. */
  onDark?: boolean;
  className?: string;
}

export const SectionHeader = ({
  eyebrow,
  number,
  title,
  intro,
  align = "left",
  as: Tag = "h2",
  onDark = false,
  className,
}: SectionHeaderProps) => {
  const label = number ? `· ${number} — ${eyebrow ?? ""}`.trim() : eyebrow;
  return (
    <div className={cn("max-w-3xl", align === "center" && "mx-auto text-center", className)}>
      {label && (
        <p className={cn("mb-4 text-eyebrow font-medium uppercase", onDark ? "text-sand" : "text-primary")}>{label}</p>
      )}
      <Tag
        className={cn(
          "font-display font-light",
          Tag === "h1" ? "text-display-xl" : Tag === "h2" ? "text-display-lg" : "text-display-md",
          onDark ? "text-primary-foreground" : "text-foreground",
        )}
      >
        {title}
      </Tag>
      {intro && (
        <p className={cn("mt-5 text-lg leading-relaxed", onDark ? "text-sand/90" : "text-muted-foreground")}>{intro}</p>
      )}
    </div>
  );
};
