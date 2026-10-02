import { useState } from "react";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { Calendar, ChevronDown, ExternalLink, FileText, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Pill } from "@/components/system";
import { CompletionActions } from "@/components/admin/CompletionActions";
import {
  countUnforwardedInvoices,
  daysUntilEventEnd,
  formatRelativeDays,
  getEventRange,
} from "@/lib/adminInvoicingView";
import { formatCurrency } from "./formatCurrency";
import { InvoicingInvoiceRow } from "./InvoicingInvoiceRow";
import type { InvoicingRow } from "./types";

interface Props {
  row: InvoicingRow;
  onRegister: (row: InvoicingRow) => void;
}

const formatDates = (dates: string[]) => {
  const range = getEventRange(dates);
  if (!range) return "Geen datum";
  const start = format(range.first, "EEE d MMM", { locale: nl });
  if (range.first.getTime() === range.last.getTime()) return start;
  return `${start} – ${format(range.last, "EEE d MMM", { locale: nl })}`;
};

const SpecLine = ({ label, amount }: { label: string; amount: number }) =>
  amount > 0 ? (
    <div className="flex justify-between text-muted-foreground">
      <span>{label}</span>
      <span>{formatCurrency(amount)}</span>
    </div>
  ) : null;

/**
 * Compacte rij per project: wie, wanneer, wat staat er open. Specificatie en
 * facturen zitten achter een uitklapper (facturen standaard open als er een
 * nog niet naar de boekhouding is).
 */
export const InvoicingRequestCard = ({ row, onRegister }: Props) => {
  const { request, totals } = row;
  const unforwarded = countUnforwardedInvoices(request);
  const [open, setOpen] = useState(unforwarded > 0);
  const isCompleted = request.completion_status === "fully_invoiced";
  const days = daysUntilEventEnd(request.selected_dates);
  const eventPassed = days !== null && days < 0;
  const invoicedShare =
    totals.grandTotalInclVat > 0
      ? Math.min(100, Math.max(0, (totals.invoicedTotal / totals.grandTotalInclVat) * 100))
      : 0;

  return (
    <Card>
      <CardContent className="space-y-4 p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="truncate font-semibold text-foreground">
                {request.customer_company || request.customer_name}
              </h3>
              {request.reference_number && (
                <span className="text-xs text-muted-foreground">{request.reference_number}</span>
              )}
              {days !== null && !isCompleted && (
                <Pill tone={eventPassed ? "success" : "info"}>
                  {eventPassed ? "Evenement geweest" : "Nog te komen"} · {formatRelativeDays(days)}
                </Pill>
              )}
              {unforwarded > 0 && (
                <Pill tone="warning">
                  {unforwarded === 1 ? "1 factuur niet doorgestuurd" : `${unforwarded} facturen niet doorgestuurd`}
                </Pill>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
              {request.customer_company && <span>{request.customer_name}</span>}
              <span className="flex items-center gap-1.5">
                <Calendar className="h-4 w-4" />
                {formatDates(request.selected_dates)}
              </span>
              <span className="flex items-center gap-1.5">
                <Users className="h-4 w-4" />
                {request.number_of_people} personen
              </span>
            </div>
          </div>

          <div className="shrink-0 sm:text-right">
            <p className="text-xs text-muted-foreground">{isCompleted ? "Gefactureerd" : "Nog te factureren"}</p>
            <p className="text-2xl font-semibold tabular-nums text-foreground">
              {formatCurrency(isCompleted ? totals.invoicedTotal : totals.outstanding)}
            </p>
            <p className="text-xs text-muted-foreground">
              project totaal {formatCurrency(totals.grandTotalInclVat)} incl. BTW
            </p>
          </div>
        </div>

        {totals.invoicedTotal > 0 && !isCompleted && (
          <div className="space-y-1">
            <Progress value={invoicedShare} className="h-1.5" />
            <p className="text-xs text-muted-foreground">
              {formatCurrency(totals.invoicedTotal)} gefactureerd ({Math.round(invoicedShare)}%)
            </p>
          </div>
        )}

        <Collapsible open={open} onOpenChange={setOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="-ml-2 gap-1.5 text-muted-foreground">
              <ChevronDown className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`} />
              Specificatie en facturen ({request.invoices.length})
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-4 pt-2">
            <div className="space-y-1 rounded-md border p-3 text-sm">
              <SpecLine label="Programma-onderdelen" amount={totals.programItemsTotal} />
              <SpecLine label="Extra kostenposten" amount={totals.extraCostsTotal} />
              <SpecLine label="Logies" amount={totals.accommodationTotal} />
              <SpecLine label="Toeristenbelasting" amount={totals.touristTax} />
              <SpecLine label="Natuurbijdrage" amount={totals.natureContribution} />
              <SpecLine label="Centrale opslag" amount={totals.centralSurcharge} />
              <SpecLine label="Wijzigingsrondes" amount={totals.revisionFees} />
              <SpecLine label="Coördinatiekosten" amount={totals.coordinationFee} />
              <div className="flex justify-between border-t pt-1 font-medium">
                <span>Project totaal</span>
                <span>{formatCurrency(totals.grandTotalInclVat)}</span>
              </div>
            </div>

            {request.invoices.length > 0 ? (
              <div className="space-y-2">
                {request.invoices.map((invoice) => (
                  <InvoicingInvoiceRow key={invoice.id} requestId={request.id} invoice={invoice} />
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Nog geen facturen geregistreerd.</p>
            )}
          </CollapsibleContent>
        </Collapsible>

        <div className="flex flex-wrap items-center gap-2 border-t pt-4">
          {!isCompleted && (
            <Button className="gap-2" onClick={() => onRegister(row)}>
              <FileText className="h-4 w-4" />
              {totals.invoicedTotal > 0 ? "Restant factureren" : "Factuur registreren"}
            </Button>
          )}
          <Button variant="outline" asChild>
            <Link to={`/admin/aanvragen/${request.id}`} className="gap-2">
              <ExternalLink className="h-4 w-4" />
              Bekijk aanvraag
            </Link>
          </Button>
          <div className="ml-auto">
            <CompletionActions
              entityType="program"
              entityId={request.id}
              completionStatus={request.completion_status}
              outstanding={totals.outstanding}
              invalidateKeys={[["admin-invoicing-requests"], ["invoicing-ready-count"]]}
              completeVariant="outline"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
