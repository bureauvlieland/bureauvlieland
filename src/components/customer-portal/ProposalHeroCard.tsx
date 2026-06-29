import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  CheckCircle2,
  Loader2,
  Clock,
  Sparkles,
  MessageCircle,
  ArrowDown,
  AlertTriangle,
} from "lucide-react";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface ProposalHeroCardProps {
  quoteValidUntil?: string | null;
  hasUnapprovedItems: boolean;
  onAcceptQuoteProposal: () => Promise<boolean>;
  bureauItemCount: number;
  partnerItemCount: number;
}

/**
 * Eén centrale "voorstel-akkoord" kaart voor fase 2 (offerte_verstuurd).
 * Vervangt het oude duo ActionRequiredCard + ProgramIntroCard in deze fase.
 *
 * Doel: in één oogopslag duidelijk:
 *   1. Wat moet ik doen? → akkoord geven
 *   2. Wat als ik iets wil wijzigen? → zelf aanpassen of via chat
 *   3. Wat gebeurt er daarna? → wij vragen beschikbaarheid op
 */
export const ProposalHeroCard = ({
  quoteValidUntil,
  hasUnapprovedItems,
  onAcceptQuoteProposal,
  bureauItemCount,
  partnerItemCount,
}: ProposalHeroCardProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isChecked, setIsChecked] = useState(false);

  const validUntil = quoteValidUntil ? new Date(quoteValidUntil) : null;
  const isExpired = validUntil ? validUntil < new Date() : false;

  const handleAccept = async () => {
    setIsLoading(true);
    try {
      await onAcceptQuoteProposal();
    } finally {
      setIsLoading(false);
    }
  };

  const scrollToProgram = () => {
    document.getElementById("program")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const openChat = () => {
    window.dispatchEvent(new Event("customer-chat:open"));
  };

  if (isExpired && validUntil) {
    return (
      <Card className="border-destructive/30 bg-destructive/5 animate-fade-in">
        <CardContent className="p-5">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-destructive">Voorstel verlopen</p>
              <p className="text-sm text-muted-foreground mt-1">
                Dit voorstel is verlopen op {format(validUntil, "d MMMM yyyy", { locale: nl })}.
                Neem contact op met Bureau Vlieland voor een nieuw voorstel.
              </p>
              <div className="flex gap-2 mt-3">
                <a href="mailto:hallo@bureauvlieland.nl">
                  <Button variant="outline" size="sm">Contact opnemen</Button>
                </a>
                <Button variant="ghost" size="sm" onClick={openChat}>
                  <MessageCircle className="h-4 w-4 mr-1" />
                  Of via chat
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card
      className={cn(
        "relative overflow-hidden border-primary/30 animate-fade-in",
        "bg-gradient-to-br from-primary/10 via-primary/5 to-background"
      )}
    >
      {/* Decoratief sparkle accent */}
      <div className="absolute -top-6 -right-6 h-32 w-32 rounded-full bg-primary/10 blur-2xl pointer-events-none" />

      <CardContent className="relative p-6 space-y-5">
        {/* Titel */}
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
            <Sparkles className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-semibold text-foreground leading-tight">
              Uw programmavoorstel ligt klaar
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Bekijk hieronder uw programma met indicatieve prijzen.
              {bureauItemCount > 0 && (
                <>
                  {" "}
                  Onderdelen die wij zelf verzorgen zijn al bevestigd
                  <CheckCircle2 className="inline-block h-3.5 w-3.5 mx-0.5 text-emerald-600 align-text-bottom" />
                  .
                </>
              )}
              {partnerItemCount > 0 && (
                <>
                  {" "}
                  Voor de overige onderdelen vragen wij — zodra u deze goedkeurt —
                  beschikbaarheid en definitieve prijzen op bij onze aanbieders.
                </>
              )}
            </p>
          </div>
        </div>

        {/* CTA blok */}
        {hasUnapprovedItems && (
          <div className="rounded-lg bg-background/70 backdrop-blur-sm border border-primary/20 p-4 space-y-3">
            <div className="flex items-start gap-2">
              <Checkbox
                id="proposal-akkoord-checkbox"
                checked={isChecked}
                onCheckedChange={(v) => setIsChecked(!!v)}
                className="mt-0.5"
              />
              <Label
                htmlFor="proposal-akkoord-checkbox"
                className="text-sm cursor-pointer leading-snug"
              >
                Ik keur dit programmavoorstel met de getoonde indicatieve prijzen goed.
                <span className="block text-xs text-muted-foreground mt-0.5">
                  Definitieve boeking volgt pas na bevestiging door de aanbieders én ondertekening van de algemene voorwaarden.
                </span>
              </Label>
            </div>

            <Button
              onClick={handleAccept}
              disabled={isLoading || !isChecked}
              size="lg"
              className={cn(
                "w-full sm:w-auto transition-transform",
                isChecked && !isLoading && "hover:scale-[1.02] shadow-lg shadow-primary/20",
                isChecked && !isLoading && "animate-[pulse_2.5s_ease-in-out_infinite]"
              )}
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Verwerken…
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-5 w-5 mr-2" />
                  Programma goedkeuren
                </>
              )}
            </Button>
          </div>
        )}

        {/* Wijzigingen */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 text-sm text-muted-foreground">
          <span className="font-medium text-foreground">Wilt u iets wijzigen?</span>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <button
              type="button"
              onClick={scrollToProgram}
              className="inline-flex items-center gap-1 text-primary hover:underline story-link"
            >
              <ArrowDown className="h-3.5 w-3.5" />
              Pas het zelf aan hieronder
            </button>
            <span className="text-muted-foreground/60">of</span>
            <button
              type="button"
              onClick={openChat}
              className="inline-flex items-center gap-1 text-primary hover:underline story-link"
            >
              <MessageCircle className="h-3.5 w-3.5" />
              stel uw vraag via de chat
            </button>
          </div>
        </div>

        {validUntil && (
          <p className="text-xs text-muted-foreground flex items-center gap-1 pt-1 border-t border-primary/10">
            <Clock className="h-3 w-3" />
            Voorstel geldig tot {format(validUntil, "d MMMM yyyy", { locale: nl })}
          </p>
        )}
      </CardContent>
    </Card>
  );
};
