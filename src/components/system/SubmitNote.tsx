import { RESPONSE_TIME } from "@/content/promises";
import { cn } from "@/lib/utils";

/**
 * De regel onder een verstuurknop: vrijblijvend, de responstijd uit
 * `src/content/promises.ts`, en de voorwaarden. Eén tekst voor alle
 * aanvraagformulieren (ontwerpsysteem fase 2).
 */
interface SubmitNoteProps {
  /** Verwijs naar de algemene voorwaarden (standaard aan). */
  terms?: boolean;
  className?: string;
}

export const SubmitNote = ({ terms = true, className }: SubmitNoteProps) => (
  <p className={cn("text-xs leading-relaxed text-muted-foreground", className)}>
    Vrijblijvend. {RESPONSE_TIME.sentence}
    {terms && (
      <>
        {" "}
        Door te versturen gaat u akkoord met onze{" "}
        <a
          href="/algemene-voorwaarden"
          target="_blank"
          rel="noopener noreferrer"
          className="underline underline-offset-2 hover:text-foreground"
        >
          algemene voorwaarden
        </a>
        ; uw gegevens gebruiken wij alleen voor deze aanvraag.
      </>
    )}
  </p>
);
