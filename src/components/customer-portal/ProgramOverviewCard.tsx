import { format, isPast, differenceInDays } from "date-fns";
import { nl } from "date-fns/locale";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, Users, BedDouble, Briefcase, Sparkles, Clock, AlertTriangle, CheckCircle2, Pencil } from "lucide-react";
import type { AccommodationRequest, AccommodationQuote } from "@/types/accommodation";
import type { ProgramType, QuoteStatus } from "@/types/programRequest";
import { isMaatwerkProject } from "@/lib/projectOrigin";

interface ProgramOverviewCardProps {
  selectedDates: Date[];
  numberOfPeople: number;
  customerCompany?: string;
  accommodation: AccommodationRequest | null;
  accommodationQuotes: AccommodationQuote[];
  // Reference numbers
  referenceNumber?: string | null;
  accommodationReferenceNumber?: string | null;
  // Quote mode props
  programType?: ProgramType;
  /** Fase 5: opvolger van programType. Als beide gezet zijn wint origin. */
  origin?: string | null;
  quoteStatus?: QuoteStatus | null;
  quoteValidUntil?: string | null;
  termsAcceptedAt?: string | null;
  // Program description
  programDescription?: string | null;
  // Edit callback
  onEdit?: () => void;
  // Whether there are pending items (self-service)
  hasPendingItems?: boolean;
}

export const ProgramOverviewCard = ({
  selectedDates,
  numberOfPeople,
  customerCompany,
  accommodation,
  accommodationQuotes,
  referenceNumber,
  accommodationReferenceNumber,
  programType = "self_service",
  origin,
  quoteStatus,
  quoteValidUntil,
  termsAcceptedAt,
  programDescription,
  onEdit,
  hasPendingItems,
}: ProgramOverviewCardProps) => {
  const isMultiDay = selectedDates.length > 1;
  // Fase 5: alle projecten doorlopen dezelfde quote-pipeline. Het type-onderscheid
  // bestaat alleen nog voor micro-copy (maatwerk-varianten gebruiken iets andere woorden).
  const isMaatwerk = isMaatwerkProject({ origin, program_type: programType });

  // Calculate quote validity
  const validUntilDate = quoteValidUntil ? new Date(quoteValidUntil) : null;
  const isExpired = validUntilDate ? isPast(validUntilDate) : false;
  const daysUntilExpiry = validUntilDate ? differenceInDays(validUntilDate, new Date()) : null;

  // Determine program type label (status-driven, niet type-driven)
  const getProgramTypeLabel = () => {
    if (termsAcceptedAt) return "Boeking bevestigd";
    if (quoteStatus === "akkoord_ontvangen" || quoteStatus === "definitief_bevestigd") return "Akkoord gegeven";
    if (isMaatwerk) return "Maatwerk";
    return "Voorstel";
  };

  // Determine quote status for display
  const getQuoteDisplayStatus = () => {
    if (termsAcceptedAt) {
      return { label: "Definitief", variant: "success" as const, icon: CheckCircle2 };
    }
    if (quoteStatus === "akkoord_ontvangen" || quoteStatus === "definitief_bevestigd") {
      return { label: "Akkoord", variant: "success" as const, icon: CheckCircle2 };
    }
    if (isExpired) {
      return { label: "Verlopen", variant: "destructive" as const, icon: AlertTriangle };
    }
    if (quoteStatus === "offerte_verstuurd") {
      return { label: "Wacht op akkoord", variant: "warning" as const, icon: Clock };
    }
    return { label: "In voorbereiding", variant: "muted" as const, icon: Clock };
  };
  const quoteDisplayStatus = getQuoteDisplayStatus();

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
      return format(selectedDates[0], "EEE d MMMM yyyy", { locale: nl });
    }
    const firstDate = selectedDates[0];
    const lastDate = selectedDates[selectedDates.length - 1];
    return `${format(firstDate, "EEE d", { locale: nl })} – ${format(lastDate, "EEE d MMMM yyyy", { locale: nl })}`;
  };

  const getStatusBadgeVariant = (variant: "success" | "info" | "warning" | "muted" | "destructive") => {
    switch (variant) {
      case "success":
        return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300";
      case "info":
        return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300";
      case "warning":
        return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300";
      case "destructive":
        return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-amber-50/50 to-primary/5">
      <CardContent className="p-6">
        <div className="space-y-4">
        {/* Header */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl md:text-2xl font-semibold tracking-tight">
                  {isMaatwerk ? "Uw maatwerkprogramma" : "Uw voorstel"}
                </h1>
                {referenceNumber && (
                  <Badge variant="outline" className="font-mono text-xs">
                    #{referenceNumber}
                  </Badge>
                )}
                {accommodationReferenceNumber && (
                  <Badge variant="outline" className="font-mono text-xs border-primary/30">
                    <BedDouble className="h-3 w-3 mr-1" />
                    #{accommodationReferenceNumber}
                  </Badge>
                )}
                {isMaatwerk && (
                  <Badge variant="outline" className="gap-1 border-amber-500/30 bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-300">
                    <Sparkles className="h-3 w-3" />
                    Maatwerk
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                {isMaatwerk
                  ? "Bureau Vlieland stelt uw programma samen. Wij nemen contact met u op."
                  : "Dit voorstel is speciaal voor jullie samengesteld door Bureau Vlieland."
                }
              </p>
              
              {/* Program description */}
              {programDescription && (
                <div className="mt-4 p-4 bg-muted/50 rounded-lg border border-border/50">
                  <p className="text-sm italic text-foreground/90 whitespace-pre-line">
                    "{programDescription}"
                  </p>
                </div>
              )}
            </div>
            
            {/* Edit button + Quote status */}
            <div className="flex items-center gap-2 shrink-0">
              {onEdit && (
                <Button variant="outline" size="sm" onClick={onEdit} className="gap-1.5">
                  <Pencil className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Bewerken</span>
                </Button>
              )}
              {quoteDisplayStatus && (
                <Badge 
                  variant="secondary" 
                  className={`gap-1.5 ${getStatusBadgeVariant(quoteDisplayStatus.variant)}`}
                >
                  <quoteDisplayStatus.icon className="h-3.5 w-3.5" />
                  {quoteDisplayStatus.label}
                </Badge>
              )}
            </div>
          </div>

          {/* Quote validity warning */}
          {quoteStatus === "offerte_verstuurd" && validUntilDate && !termsAcceptedAt && (
            <div className={`flex items-center gap-2 p-3 rounded-lg ${isExpired ? "bg-red-50 dark:bg-red-900/20" : daysUntilExpiry !== null && daysUntilExpiry <= 3 ? "bg-amber-50 dark:bg-amber-900/20" : "bg-blue-50 dark:bg-blue-900/20"}`}>
              {isExpired ? (
                <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400 shrink-0" />
              ) : (
                <Clock className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
              )}
              <p className={`text-sm ${isExpired ? "text-red-700 dark:text-red-300" : "text-amber-700 dark:text-amber-300"}`}>
                {isExpired ? (
                  <>Dit voorstel is verlopen op {format(validUntilDate, "EEE d MMMM yyyy", { locale: nl })}. Neem contact op voor een nieuw voorstel.</>
                ) : daysUntilExpiry === 0 ? (
                  <>Dit voorstel is vandaag geldig. Geef vandaag nog akkoord om de beschikbaarheid te garanderen.</>
                ) : daysUntilExpiry === 1 ? (
                  <>Dit voorstel is nog 1 dag geldig (t/m {format(validUntilDate, "EEE d MMMM", { locale: nl })}).</>
                ) : (
                  <>Dit voorstel is geldig t/m {format(validUntilDate, "EEE d MMMM yyyy", { locale: nl })} ({daysUntilExpiry} dagen).</>
                )}
              </p>
            </div>
          )}

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
                <Sparkles className="h-4 w-4 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">Type</p>
                <p className="font-medium text-sm">{getProgramTypeLabel()}</p>
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
              {isQuoteMode ? "Voorstel voor" : "Programma voor"} <span className="font-medium text-foreground">{customerCompany}</span>
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
