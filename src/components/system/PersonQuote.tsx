import { cn } from "@/lib/utils";

/**
 * Eén citaat van een klant, groot gezet in Fraunces (ontwerpsysteem fase
 * 3). Eén per pagina, op de plek waar twijfel ontstaat: na de inhoud, vóór
 * de keuze.
 */
interface PersonQuoteProps {
  text: string;
  author: string;
  company?: string;
  className?: string;
}

export const PersonQuote = ({ text, author, company, className }: PersonQuoteProps) => (
  <figure className={cn("mx-auto max-w-3xl text-center", className)}>
    <blockquote className="font-display text-display-md font-light leading-snug text-foreground">
      <span aria-hidden="true">“</span>
      {text}
      <span aria-hidden="true">”</span>
    </blockquote>
    <figcaption className="mt-5 text-sm text-muted-foreground">
      <span className="font-medium text-foreground">{author}</span>
      {company && <span> · {company}</span>}
    </figcaption>
  </figure>
);
