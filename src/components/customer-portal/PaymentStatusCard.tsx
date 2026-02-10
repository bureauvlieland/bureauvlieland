import { Card, CardContent } from "@/components/ui/card";
import { FileCheck, Clock, CheckCircle2 } from "lucide-react";
import type { ProgramRequestItem } from "@/types/programRequest";

interface PaymentStatusCardProps {
  items: ProgramRequestItem[];
  termsAcceptedAt: string;
}

export const PaymentStatusCard = ({ items, termsAcceptedAt: _termsAcceptedAt }: PaymentStatusCardProps) => {
  const confirmedItems = items.filter(
    (item) => item.status !== "cancelled" && item.quoted_price
  );
  const executedItems = confirmedItems.filter((item) => item.executed_at);

  const allExecuted = confirmedItems.length > 0 && executedItems.length >= confirmedItems.length;
  const someExecuted = executedItems.length > 0 && !allExecuted;

  return (
    <Card className="border-green-200 dark:border-green-900 bg-green-50/50 dark:bg-green-950/20">
      <CardContent className="py-4">
        <div className="flex items-start gap-3">
          {allExecuted ? (
            <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
          ) : someExecuted ? (
            <FileCheck className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
          ) : (
            <Clock className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          )}
          <div>
            <p className="font-medium text-sm">
              {allExecuted
                ? "Alle activiteiten afgerond — facturen worden opgesteld"
                : someExecuted
                  ? `${executedItems.length}/${confirmedItems.length} activiteiten afgerond — facturen in voorbereiding`
                  : "Facturen worden voorbereid"}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {allExecuted
                ? "U ontvangt de facturen per e-mail zodra deze zijn opgesteld."
                : someExecuted
                  ? "De facturen worden opgesteld zodra alle activiteiten zijn uitgevoerd."
                  : "Na acceptatie van de voorwaarden worden de facturen zo snel mogelijk opgesteld en verstuurd."}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
