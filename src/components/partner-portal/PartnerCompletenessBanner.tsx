import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Notice } from "@/components/system";
import type { CompletenessResult } from "@/lib/partnerCompleteness";

interface Props {
  completeness: CompletenessResult;
}

const STORAGE_KEY = "partner-completeness-banner-dismissed";

/** Tip op de werkbank zolang het profiel onder de 80% zit; weg te klikken voor deze sessie (fase 2: een Notice). */
export const PartnerCompletenessBanner = ({ completeness }: Props) => {
  const [searchParams] = useSearchParams();
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    try {
      setDismissed(sessionStorage.getItem(STORAGE_KEY) === "1");
    } catch {
      setDismissed(false);
    }
  }, []);

  if (dismissed || completeness.score >= 80) return null;

  const impersonate = searchParams.get("impersonate");
  const suffix = impersonate ? `?impersonate=${impersonate}` : "";
  const handleDismiss = () => {
    try {
      sessionStorage.setItem(STORAGE_KEY, "1");
    } catch {
      // Zonder opslag blijft de tip zichtbaar; dat is niet erg.
    }
    setDismissed(true);
  };

  return (
    <Notice tone="info" title={`Uw profiel is voor ${completeness.score}% compleet`}>
      <p>Profielen met goede foto's, een duidelijke omschrijving en complete prijzen worden vaker gekozen.</p>
      <Progress value={completeness.score} className="mt-2 h-1.5" aria-label="Profielsterkte" />
      {completeness.missing.length > 0 && (
        <ul className="mt-2 list-disc space-y-0.5 pl-5 text-xs">
          {completeness.missing.slice(0, 3).map((m) => (
            <li key={m}>{m}</li>
          ))}
        </ul>
      )}
      <div className="mt-3 flex flex-wrap gap-2">
        <Button asChild size="sm" variant="outline">
          <Link to={`/partner/profiel${suffix}`}>Profiel aanvullen</Link>
        </Button>
        <Button asChild size="sm" variant="ghost">
          <Link to={`/partner/aanbod${suffix}`}>Naar uw aanbod</Link>
        </Button>
        {completeness.missing.some((m) => /kamertype/i.test(m)) && (
          <Button asChild size="sm" variant="ghost">
            <Link to={`/partner/kamersoorten${suffix}`}>Kamersoorten aanvullen</Link>
          </Button>
        )}
        <Button size="sm" variant="ghost" onClick={handleDismiss}>
          Verberg deze tip
        </Button>
      </div>
    </Notice>
  );
};
