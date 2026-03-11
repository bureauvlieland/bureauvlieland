import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { BedDouble, ChevronRight, Users, Calendar } from "lucide-react";
import type { PartnerAccommodationQuote } from "@/types/partner";

interface PartnerAccommodationTableProps {
  quotes: PartnerAccommodationQuote[];
  emptyMessage: string;
  onSelectQuote: (quote: PartnerAccommodationQuote) => void;
}

const STATUS_CONFIG: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  pending: { label: "Te beantwoorden", variant: "default" },
  submitted: { label: "Offerte verstuurd", variant: "secondary" },
  selected: { label: "Gekozen", variant: "outline" },
  rejected: { label: "Niet gekozen", variant: "destructive" },
  expired: { label: "Verlopen", variant: "destructive" },
};

export const PartnerAccommodationTable = ({
  quotes,
  emptyMessage,
  onSelectQuote,
}: PartnerAccommodationTableProps) => {
  if (quotes.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          {emptyMessage}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Aanvraag</TableHead>
            <TableHead className="hidden sm:table-cell">Klant</TableHead>
            <TableHead className="hidden md:table-cell">Periode</TableHead>
            <TableHead className="hidden lg:table-cell text-center">Gasten</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="w-12"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {quotes.map((quote) => {
            const request = quote.accommodation_requests;
            const arrivalDate = new Date(request.arrival_date);
            const departureDate = new Date(request.departure_date);
            const statusConfig = STATUS_CONFIG[quote.status] || STATUS_CONFIG.pending;

            return (
              <TableRow
                key={quote.id}
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => onSelectQuote(quote)}
              >
                <TableCell>
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-lg bg-amber-100 dark:bg-amber-950 flex items-center justify-center">
                      <BedDouble className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">
                        {quote.accommodation_name || "Logies aanvraag"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {request.accommodation_type === "hotel" && "Hotel"}
                        {request.accommodation_type === "groepsaccommodatie" && "Groepsaccommodatie"}
                        {request.accommodation_type === "vakantiewoning" && "Vakantiewoning"}
                        {request.accommodation_type === "no_preference" && "Geen voorkeur"}
                      </p>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="hidden sm:table-cell">
                  <div>
                    <p className="font-medium text-sm">{request.customer_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {request.customer_company || ""}
                    </p>
                  </div>
                </TableCell>
                <TableCell className="hidden md:table-cell">
                  <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <Calendar className="h-3.5 w-3.5" />
                    <span>
                      {format(arrivalDate, "EEE d MMM", { locale: nl })} - {format(departureDate, "EEE d MMM", { locale: nl })}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="hidden lg:table-cell text-center">
                  <div className="flex items-center justify-center gap-1 text-sm text-muted-foreground">
                    <Users className="h-3.5 w-3.5" />
                    <span>{request.number_of_guests}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant={statusConfig.variant} className="text-xs">
                    {statusConfig.label}
                  </Badge>
                </TableCell>
                <TableCell>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </Card>
  );
};
