import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { CheckCircle, Loader2, Clock, AlertTriangle, Sparkles } from "lucide-react";
import { format } from "date-fns";
import { nl } from "date-fns/locale";

interface ProgramIntroCardProps {
  programType?: string;
  quoteStatus?: string | null;
  quoteValidUntil?: string | null;
  termsAcceptedAt?: string;
  itemCount?: number;
  isMaatwerkEmpty?: boolean;
  onAcceptQuoteProposal?: () => Promise<boolean>;
}

export const ProgramIntroCard = ({
  programType,
  quoteStatus,
  quoteValidUntil,
  termsAcceptedAt,
  itemCount,
  isMaatwerkEmpty,
  onAcceptQuoteProposal,
}: ProgramIntroCardProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isChecked, setIsChecked] = useState(false);

  const isQuoteMode = programType === "quote";
  const isAwaitingApproval = isQuoteMode && quoteStatus === "offerte_verstuurd";
  const isBeingPrepared = isQuoteMode && !!quoteStatus && ["concept", "in_afstemming"].includes(quoteStatus);
  const isConfirmed = !!termsAcceptedAt || quoteStatus === "definitief_bevestigd" || quoteStatus === "akkoord_ontvangen";

  const validUntil = quoteValidUntil ? new Date(quoteValidUntil) : null;
  const isExpired = validUntil ? validUntil < new Date() : false;

  const handleAccept = async () => {
    if (!onAcceptQuoteProposal) return;
    setIsLoading(true);
    try {
      await onAcceptQuoteProposal();
    } finally {
      setIsLoading(false);
    }
  };

  // Maatwerk in preparation — no items yet
  if (isMaatwerkEmpty) {
    return (
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="p-5">
          <div className="flex items-start gap-3">
            <Sparkles className="h-5 w-5 text-primary shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-medium text-foreground">Uw maatwerkprogramma wordt samengesteld</p>
              <p className="text-sm text-muted-foreground">
                Bureau Vlieland is bezig met het samenstellen van uw programma op maat.
                Zodra het programma klaar is, vindt u het hier terug. Wij nemen contact met u op om uw wensen te bespreken.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Quote being prepared by admin - ActionRequiredCard already shows this message
  if (isBeingPrepared) {
    return null;
  }

  // Expired quote
  if (isAwaitingApproval && isExpired && validUntil) {
    return (
      <Card className="border-destructive/30 bg-destructive/5">
        <CardContent className="p-5">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-destructive">Voorstel verlopen</p>
              <p className="text-sm text-muted-foreground mt-1">
                Dit voorstel is verlopen op {format(validUntil, "d MMMM yyyy", { locale: nl })}.
                Neem contact op met Bureau Vlieland voor een nieuw voorstel.
              </p>
              <a href="mailto:hallo@bureauvlieland.nl" className="mt-3 inline-block">
                <Button variant="outline" size="sm">Contact opnemen</Button>
              </a>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Quote awaiting approval
  if (isAwaitingApproval) {
    return (
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="p-5 space-y-4">
          <div className="space-y-2">
            <p className="text-sm text-foreground leading-relaxed">
              Hieronder vindt u het programma dat wij speciaal voor u hebben samengesteld. U kunt uiteraard nog wijzigingen aanbrengen — activiteiten verwijderen, tijden aanpassen of onderdelen toevoegen.
            </p>
            <p className="text-sm text-foreground leading-relaxed">
              Dat kunnen we natuurlijk ook samen doen. Neem in dat geval gewoon even contact op met Bureau Vlieland.
            </p>
            <p className="text-sm text-foreground leading-relaxed">
              Zodra u tevreden bent, kunt u het programma akkoord geven. Onze partners worden vervolgens per e-mail op de hoogte gesteld en bevestigen de definitieve reserveringen.
            </p>
            {validUntil && (
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Geldig tot {format(validUntil, "d MMMM yyyy", { locale: nl })}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2 pt-1">
            <Checkbox
              id="akkoord-checkbox"
              checked={isChecked}
              onCheckedChange={(v) => setIsChecked(!!v)}
            />
            <Label htmlFor="akkoord-checkbox" className="text-sm cursor-pointer">
              Ik ben akkoord met het programma
            </Label>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <Button
              variant="outline"
              onClick={handleAccept}
              disabled={isLoading || !isChecked}
              className="whitespace-nowrap"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Verwerken...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Akkoord, start reserveringen
                </>
              )}
            </Button>
            <span className="text-xs text-muted-foreground">
              De leveranciers worden hierna benaderd
            </span>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Confirmed / terms accepted
  if (isConfirmed) {
    return (
      <Card className="border-green-200/50 bg-green-50/30 dark:border-green-900/50 dark:bg-green-950/10">
        <CardContent className="p-5">
          <p className="text-sm text-foreground leading-relaxed">
            Uw programma is bevestigd. Hieronder vindt u het overzicht van alle onderdelen.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Self-service / default
  return (
    <Card className="border-muted bg-muted/30">
      <CardContent className="p-5">
        <p className="text-sm text-foreground leading-relaxed">
          Hieronder vindt u uw programma. Wij hebben de aanvragen verstuurd naar de aanbieders.
          Zodra zij reageren ontvangt u een e-mail. U kunt in de tussentijd onderdelen wijzigen,
          verwijderen of toevoegen.
        </p>
      </CardContent>
    </Card>
  );
};
