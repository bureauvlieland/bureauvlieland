import { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Lightbulb, X, ArrowRight } from "lucide-react";
import type { CompletenessResult } from "@/lib/partnerCompleteness";

interface Props {
  completeness: CompletenessResult;
}

const STORAGE_KEY = "partner-completeness-banner-dismissed";

export const PartnerCompletenessBanner = ({ completeness }: Props) => {
  const [searchParams] = useSearchParams();
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    setDismissed(sessionStorage.getItem(STORAGE_KEY) === "1");
  }, []);

  if (dismissed) return null;
  if (completeness.score >= 80) return null;

  const impersonate = searchParams.get("impersonate");
  const suffix = impersonate ? `?impersonate=${impersonate}` : "";

  const handleDismiss = () => {
    sessionStorage.setItem(STORAGE_KEY, "1");
    setDismissed(true);
  };

  return (
    <Card className="border-accent/40 bg-accent/5">
      <CardContent className="p-4 sm:p-5">
        <div className="flex gap-3">
          <div className="shrink-0 mt-0.5">
            <div className="h-9 w-9 rounded-full bg-accent/15 flex items-center justify-center">
              <Lightbulb className="h-4 w-4 text-accent-foreground" />
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-semibold text-sm">
                  Maak uw aanbod aantrekkelijker voor klanten
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Profielen met mooie foto's, een duidelijke omschrijving en complete
                  prijzen worden vaker gekozen. <strong>Hotel Zeezicht</strong> en{" "}
                  <strong>Yoga Vlieland</strong> hebben hun aanbod compleet ingevuld —
                  zie hieronder hoe zij dat doen.
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleDismiss}
                className="h-7 w-7 -mt-1 -mr-1 shrink-0"
                aria-label="Sluiten"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="mt-3">
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="font-medium">Uw profiel is voor {completeness.score}% compleet</span>
                {completeness.missing.length > 0 && (
                  <span className="text-muted-foreground">
                    {completeness.missing.length}{" "}
                    {completeness.missing.length === 1 ? "tip" : "tips"} om te verbeteren
                  </span>
                )}
              </div>
              <Progress value={completeness.score} className="h-2" />
            </div>

            {completeness.missing.length > 0 && (
              <ul className="mt-3 space-y-1 text-xs text-muted-foreground">
                {completeness.missing.slice(0, 3).map((m) => (
                  <li key={m} className="flex items-start gap-1.5">
                    <span className="text-accent mt-1">•</span>
                    <span>{m}</span>
                  </li>
                ))}
              </ul>
            )}

            <div className="flex flex-wrap gap-2 mt-4">
              <Button asChild size="sm">
                <Link to={`/partner/profiel${suffix}`}>
                  Profiel verrijken
                  <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
                </Link>
              </Button>
              <Button asChild size="sm" variant="outline">
                <Link to={`/partner/aanbod${suffix}`}>Bouwstenen verbeteren</Link>
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
