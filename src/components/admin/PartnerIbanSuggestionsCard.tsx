import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Landmark, Check, X, Loader2 } from "lucide-react";
import {
  usePartnerIbanSuggestions,
  useRegisterPartnerIban,
} from "@/hooks/usePartnerIbanSuggestions";

/**
 * Shows IBAN suggestions extracted from bank statement counterparties for
 * partners that don't have an IBAN registered yet. Admin confirms with one click.
 */
export function PartnerIbanSuggestionsCard() {
  const { data: suggestions = [], isLoading } = usePartnerIbanSuggestions();
  const register = useRegisterPartnerIban();
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  const visible = suggestions.filter(
    (s) => !dismissed.has(`${s.partnerId}:${s.iban}`),
  );

  if (isLoading || visible.length === 0) return null;

  // Partners matching multiple IBANs → flag so admin picks carefully
  const ibansPerPartner = new Map<string, number>();
  for (const s of visible) {
    ibansPerPartner.set(s.partnerId, (ibansPerPartner.get(s.partnerId) ?? 0) + 1);
  }

  return (
    <Card className="border-blue-200 bg-blue-50/40">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Landmark className="h-4 w-4 text-blue-600" />
          IBAN-voorstellen uit bankafschriften
          <Badge className="bg-blue-600 text-white">{visible.length}</Badge>
        </CardTitle>
        <CardDescription>
          Deze partners hebben nog geen IBAN, maar in de afschriften staat een tegenrekening
          die op naam matcht. Bevestig om het IBAN te registreren voor SEPA-betaalbatches.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {visible.map((s) => {
          const key = `${s.partnerId}:${s.iban}`;
          const multiple = (ibansPerPartner.get(s.partnerId) ?? 0) > 1;
          return (
            <div
              key={key}
              className="flex items-center gap-3 rounded-lg border bg-background p-3"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-sm">{s.partnerName}</span>
                  <span className="font-mono text-sm">{s.iban}</span>
                  {multiple && (
                    <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-700 border-amber-200">
                      Meerdere IBAN&apos;s gevonden — controleer
                    </Badge>
                  )}
                </div>
                <div className="text-xs text-muted-foreground truncate">
                  Gevonden als &quot;{s.sourceNames.join('", "')}&quot; • {s.lineCount}{" "}
                  {s.lineCount === 1 ? "transactie" : "transacties"}
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Button
                  size="sm"
                  onClick={() => register.mutate({ partnerId: s.partnerId, iban: s.iban })}
                  disabled={register.isPending}
                >
                  {register.isPending ? (
                    <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                  ) : (
                    <Check className="h-3.5 w-3.5 mr-1" />
                  )}
                  Registreren
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8"
                  title="Verbergen"
                  onClick={() => setDismissed((prev) => new Set(prev).add(key))}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
