import { Link, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Notice } from "@/components/system";

interface MissingPdfBannerProps {
  /** Aantal facturen zonder pdf (onderdelen en logies samen). */
  count: number;
  /** Toon de knop "Ga naar facturen" (uit op de facturatiepagina zelf). */
  showCta?: boolean;
}

/** Zolang een geregistreerde factuur geen pdf heeft, kan het bureau hem niet verwerken (partnerportaal fase 2: een Notice). */
export function MissingPdfBanner({ count, showCta = true }: MissingPdfBannerProps) {
  const [searchParams] = useSearchParams();
  const impersonate = searchParams.get("impersonate");
  if (count <= 0) return null;
  const meervoud = count !== 1;
  return (
    <Notice tone="danger" title={`${count} factu${meervoud ? "ren" : "ur"} zonder pdf`}>
      <p>
        Zonder de pdf kunnen wij uw factu{meervoud ? "ren" : "ur"} niet in behandeling nemen en niet doorsturen naar onze boekhouding. Voeg de pdf
        {meervoud ? "'s" : ""} toe onder Facturatie, tabblad Gefactureerd.
      </p>
      {showCta && (
        <Button asChild size="sm" variant="outline" className="mt-2">
          <Link to={`/partner/facturatie?tab=invoiced${impersonate ? `&impersonate=${impersonate}` : ""}`}>Naar de facturen</Link>
        </Button>
      )}
    </Notice>
  );
}
