import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Loader2, Clock, AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import type { ProgramRequestWithItems } from "@/types/programRequest";
import { getProjectOrigin } from "@/lib/projectOrigin";

interface AcceptQuoteProposalCardProps {
  program: ProgramRequestWithItems;
  onAccept: () => Promise<boolean>;
}

export const AcceptQuoteProposalCard = ({
  program,
  onAccept,
}: AcceptQuoteProposalCardProps) => {
  const [isLoading, setIsLoading] = useState(false);

  // Check conditions
  if (getProjectOrigin(program) !== "quote") return null;
  if (program.quote_status !== "offerte_verstuurd") return null;

  const validUntil = program.quote_valid_until
    ? new Date(program.quote_valid_until)
    : null;
  const isExpired = validUntil ? validUntil < new Date() : false;

  // Count activities
  const activeItems = program.items.filter((item) => item.status !== "cancelled");
  const itemCount = activeItems.length;


  const handleAccept = async () => {
    setIsLoading(true);
    try {
      await onAccept();
    } finally {
      setIsLoading(false);
    }
  };

  // Expired state
  if (isExpired && validUntil) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className="h-12 w-12 rounded-full bg-red-100 flex items-center justify-center shrink-0">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-semibold text-red-800">
                Voorstel verlopen
              </h2>
              <p className="text-sm text-red-700 mt-1">
                Dit voorstel is verlopen op{" "}
                {format(validUntil, "EEE d MMMM yyyy", { locale: nl })}. Neem contact
                op met Bureau Vlieland voor een nieuw voorstel.
              </p>
              <div className="mt-4">
                <a href="mailto:hallo@bureauvlieland.nl">
                  <Button variant="outline" size="sm">
                    Contact opnemen
                  </Button>
                </a>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-background overflow-hidden">
      <CardContent className="p-6">
        <div className="flex flex-col md:flex-row md:items-center gap-6">
          {/* Icon */}
          <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <CheckCircle className="h-7 w-7 text-primary" />
          </div>

          {/* Content */}
          <div className="flex-1 space-y-3">
            <div>
              <h2 className="text-xl font-semibold">Uw maatwerkvoorstel</h2>
              <p className="text-muted-foreground text-sm mt-1">
                Bureau Vlieland heeft dit programma speciaal voor u samengesteld.
              </p>
            </div>

            {/* Summary badges */}
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary" className="text-sm">
                {itemCount} activiteit{itemCount !== 1 ? "en" : ""}
              </Badge>
              {validUntil && (
                <Badge variant="outline" className="text-sm flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  Geldig tot {format(validUntil, "EEE d MMM", { locale: nl })}
                </Badge>
              )}
            </div>

            {/* Explanation */}
            <p className="text-sm text-muted-foreground">
              Na uw akkoord worden de leveranciers benaderd voor definitieve
              bevestiging en beschikbaarheid.
            </p>
          </div>

          {/* Action */}
          <div className="flex flex-col items-stretch md:items-end gap-2 shrink-0">
            <Button
              size="lg"
              onClick={handleAccept}
              disabled={isLoading}
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
            <span className="text-xs text-muted-foreground text-center md:text-right">
              De leveranciers worden hierna benaderd
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
