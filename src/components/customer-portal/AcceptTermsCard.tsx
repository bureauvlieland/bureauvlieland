import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { CheckCircle, ExternalLink, Loader2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface AcceptTermsCardProps {
  onAccept: () => Promise<boolean>;
  isBillingComplete: boolean;
  onOpenBilling: () => void;
}

export const AcceptTermsCard = ({
  onAccept,
  isBillingComplete,
  onOpenBilling,
}: AcceptTermsCardProps) => {
  const [isChecked, setIsChecked] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAccept = async () => {
    if (!isChecked || !isBillingComplete) return;

    setIsSubmitting(true);
    try {
      await onAccept();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="border-green-200 bg-green-50/50 dark:border-green-900 dark:bg-green-950/20">
      <CardContent className="p-6">
        <div className="flex items-start gap-4">
          <div className="p-2 rounded-full bg-green-100 dark:bg-green-900/50">
            <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
          </div>
          
          <div className="flex-1 space-y-4">
            <div>
              <h3 className="font-semibold text-lg">Alle activiteiten zijn bevestigd!</h3>
              <p className="text-sm text-muted-foreground mt-1">
                De aanbieders hebben alle activiteiten in je programma bevestigd. 
                Voordat de definitieve boeking ingaat, vragen we je akkoord op onze voorwaarden.
              </p>
            </div>

            {!isBillingComplete && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200">
                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                <div className="text-sm">
                  <p className="font-medium">Facturatiegegevens vereist</p>
                  <p className="text-amber-700 dark:text-amber-300">
                    Vul eerst je facturatiegegevens in voordat je kunt bevestigen.
                  </p>
                  <Button
                    variant="link"
                    className="h-auto p-0 text-amber-800 dark:text-amber-200 underline"
                    onClick={onOpenBilling}
                  >
                    Facturatiegegevens invullen →
                  </Button>
                </div>
              </div>
            )}

            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <Checkbox
                  id="terms-checkbox"
                  checked={isChecked}
                  onCheckedChange={(checked) => setIsChecked(checked === true)}
                  disabled={!isBillingComplete}
                  className={cn(!isBillingComplete && "opacity-50")}
                />
                <Label
                  htmlFor="terms-checkbox"
                  className={cn(
                    "text-sm cursor-pointer leading-relaxed",
                    !isBillingComplete && "opacity-50 cursor-not-allowed"
                  )}
                >
                  Ik ga akkoord met de{" "}
                  <a
                    href="https://bureauvlieland.nl/algemene-voorwaarden"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary underline hover:no-underline inline-flex items-center gap-1"
                    onClick={(e) => e.stopPropagation()}
                  >
                    algemene voorwaarden van Bureau Vlieland
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </Label>
              </div>

              <p className="text-xs text-muted-foreground pl-6">
                Let op: voor de activiteiten van partners zijn hun eigen algemene voorwaarden van toepassing. 
                Deze ontvang je bij de bevestigingsmail van de betreffende aanbieder.
              </p>
            </div>

            <Button
              onClick={handleAccept}
              disabled={!isChecked || !isBillingComplete || isSubmitting}
              className="w-full sm:w-auto"
            >
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Akkoord & Definitief bevestigen
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
