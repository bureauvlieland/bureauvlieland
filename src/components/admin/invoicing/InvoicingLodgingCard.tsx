import { Link } from "react-router-dom";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { Calendar, ExternalLink, Hotel, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Pill } from "@/components/system";
import { CompletionActions } from "@/components/admin/CompletionActions";
import { formatCurrency } from "./formatCurrency";

export interface InvoicingLodgingRow {
  id: string;
  customer_name: string;
  customer_company: string | null;
  number_of_guests: number;
  arrival_date: string;
  departure_date: string;
  completion_status: string | null;
  completed_at: string | null;
  selected_quote: { accommodation_name: string | null } | null;
  total: number;
  invoiced: number;
  outstanding: number;
}

export const InvoicingLodgingCard = ({ item }: { item: InvoicingLodgingRow }) => (
  <Card>
    <CardContent className="space-y-4 p-4 sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <Hotel className="h-4 w-4 text-muted-foreground" />
            <h3 className="truncate font-semibold text-foreground">
              {item.customer_company || item.customer_name}
            </h3>
            {!item.selected_quote && <Pill tone="warning">Geen geselecteerde offerte</Pill>}
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
            {item.selected_quote?.accommodation_name && <span>{item.selected_quote.accommodation_name}</span>}
            <span className="flex items-center gap-1.5">
              <Calendar className="h-4 w-4" />
              {format(new Date(item.arrival_date), "d MMM", { locale: nl })} –{" "}
              {format(new Date(item.departure_date), "d MMM yyyy", { locale: nl })}
            </span>
            <span className="flex items-center gap-1.5">
              <Users className="h-4 w-4" />
              {item.number_of_guests} gasten
            </span>
          </div>
        </div>
        <div className="shrink-0 sm:text-right">
          <p className="text-xs text-muted-foreground">Nog te factureren</p>
          <p className="text-2xl font-semibold tabular-nums text-foreground">{formatCurrency(item.outstanding)}</p>
          <p className="text-xs text-muted-foreground">
            totaal {formatCurrency(item.total)}
            {item.invoiced > 0 && ` · gefactureerd ${formatCurrency(item.invoiced)}`}
          </p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2 border-t pt-4">
        <Button variant="outline" asChild>
          <Link to={`/admin/logies-aanvragen/${item.id}`} className="gap-2">
            <ExternalLink className="h-4 w-4" />
            Bekijk
          </Link>
        </Button>
        <div className="ml-auto">
          <CompletionActions
            entityType="accommodation"
            entityId={item.id}
            completionStatus={item.completion_status}
            completedAt={item.completed_at}
            outstanding={item.outstanding}
            invalidateKeys={[["admin-invoicing-standalone-lodging"], ["invoicing-ready-count"]]}
            completeVariant="outline"
          />
        </div>
      </div>
    </CardContent>
  </Card>
);
