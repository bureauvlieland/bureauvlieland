import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

interface MissingPdfBannerProps {
  /** Aantal facturen zonder PDF (items + accommodaties samen). */
  count: number;
  /** Toon de knop "Ga naar facturen" (uit op de financieel-pagina zelf). */
  showCta?: boolean;
}

export function MissingPdfBanner({ count, showCta = true }: MissingPdfBannerProps) {
  if (count <= 0) return null;
  return (
    <div
      role="alert"
      className="rounded-lg border-2 border-destructive/40 bg-destructive/5 p-4 flex flex-col sm:flex-row sm:items-center gap-3"
    >
      <div className="flex items-start gap-3 flex-1">
        <AlertTriangle className="h-5 w-5 text-destructive mt-0.5 shrink-0" />
        <div className="space-y-1">
          <p className="font-semibold text-destructive">
            Actie vereist — {count} factu{count === 1 ? "ur" : "ren"} zonder PDF
          </p>
          <p className="text-sm text-foreground/80">
            We kunnen je factu{count === 1 ? "ur" : "ren"} niet in behandeling nemen en
            niet doorsturen naar onze boekhouding zolang de PDF-bijlage ontbreekt.
            Voeg de PDF{count === 1 ? "" : "'s"} nu toe via Facturatie → Gefactureerd.
          </p>
        </div>
      </div>
      {showCta && (
        <Button asChild size="sm" variant="destructive" className="shrink-0">
          <Link to="/partner/financieel?missingPdf=1#gefactureerd">
            Ga naar facturen
          </Link>
        </Button>
      )}
    </div>
  );
}
