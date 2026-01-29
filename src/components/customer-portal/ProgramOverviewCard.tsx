import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Users, BedDouble, Briefcase } from "lucide-react";
import type { AccommodationRequest, AccommodationQuote } from "@/types/accommodation";

interface ProgramOverviewCardProps {
  selectedDates: Date[];
  numberOfPeople: number;
  customerCompany?: string;
  accommodation: AccommodationRequest | null;
  accommodationQuotes: AccommodationQuote[];
}

export const ProgramOverviewCard = ({
  selectedDates,
  numberOfPeople,
  customerCompany,
  accommodation,
  accommodationQuotes,
}: ProgramOverviewCardProps) => {
  const isMultiDay = selectedDates.length > 1;
  const programType = isMultiDay ? "Meerdaags verblijf" : "Eendaags programma";

  // Determine accommodation status
  const getAccommodationStatus = () => {
    const hasSelectedQuote = accommodationQuotes.some(q => q.status === "selected");
    const hasSubmittedQuotes = accommodationQuotes.some(q => q.status === "submitted");

    if (hasSelectedQuote) {
      return { label: "Bevestigd", variant: "success" as const };
    }
    if (hasSubmittedQuotes) {
      return { label: "Offerte ontvangen", variant: "info" as const };
    }
    if (accommodation) {
      return { label: "In behandeling", variant: "warning" as const };
    }
    return { label: "Nog niet geregeld", variant: "muted" as const };
  };

  const accommodationStatus = getAccommodationStatus();

  // Format date range
  const formatDateRange = () => {
    if (selectedDates.length === 0) return "Geen datum geselecteerd";
    if (selectedDates.length === 1) {
      return format(selectedDates[0], "d MMMM yyyy", { locale: nl });
    }
    const firstDate = selectedDates[0];
    const lastDate = selectedDates[selectedDates.length - 1];
    return `${format(firstDate, "d", { locale: nl })} – ${format(lastDate, "d MMMM yyyy", { locale: nl })}`;
  };

  const getStatusBadgeVariant = (variant: "success" | "info" | "warning" | "muted") => {
    switch (variant) {
      case "success":
        return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300";
      case "info":
        return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300";
      case "warning":
        return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  return (
    <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
      <CardContent className="p-6">
        <div className="space-y-4">
          {/* Header */}
          <div>
            <h1 className="text-xl md:text-2xl font-semibold tracking-tight">
              Jouw zakelijke programma op Vlieland
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Wij stemmen activiteiten, logies en planning op elkaar af zodat alles klopt.
            </p>
          </div>

          {/* Info grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* Datum */}
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <Calendar className="h-4 w-4 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">Datum</p>
                <p className="font-medium text-sm truncate">{formatDateRange()}</p>
              </div>
            </div>

            {/* Groep */}
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <Users className="h-4 w-4 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">Groep</p>
                <p className="font-medium text-sm">{numberOfPeople} personen</p>
              </div>
            </div>

            {/* Type */}
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <Briefcase className="h-4 w-4 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">Type</p>
                <p className="font-medium text-sm">{programType}</p>
              </div>
            </div>

            {/* Logies - only show for multi-day */}
            {isMultiDay && (
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <BedDouble className="h-4 w-4 text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">Logies</p>
                  <Badge 
                    variant="secondary" 
                    className={`text-xs font-medium ${getStatusBadgeVariant(accommodationStatus.variant)}`}
                  >
                    {accommodationStatus.label}
                  </Badge>
                </div>
              </div>
            )}
          </div>

          {/* Company name if available */}
          {customerCompany && (
            <p className="text-sm text-muted-foreground pt-2 border-t">
              Programma voor <span className="font-medium text-foreground">{customerCompany}</span>
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
