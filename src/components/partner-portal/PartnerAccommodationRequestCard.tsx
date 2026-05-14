import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { format, differenceInDays } from "date-fns";
import { nl } from "date-fns/locale";
import {
  Calendar,
  Users,
  MapPin,
  Euro,
  Hotel,
  Home,
  Building2,
  Tent,
  HelpCircle,
  Clock,
  Check,
  X,
  Send,
  Eye,
  MessageSquare,
  FileText,
  Loader2,
} from "lucide-react";
import { LOCATION_PREFERENCES, BUDGET_RANGES, ACCOMMODATION_TYPES } from "@/types/accommodation";
import { PartnerAccommodationChatSheet } from "./PartnerAccommodationChatSheet";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const QUOTE_STATUS_CONFIG: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending: { label: "Te beantwoorden", variant: "secondary" },
  submitted: { label: "Offerte verstuurd", variant: "default" },
  selected: { label: "Geaccepteerd", variant: "default" },
  rejected: { label: "Niet gekozen", variant: "secondary" },
  expired: { label: "Verlopen", variant: "destructive" },
  declined: { label: "Afgewezen", variant: "destructive" },
};

const TYPE_ICONS: Record<string, React.ReactNode> = {
  hotel: <Hotel className="h-4 w-4" />,
  vacation_home: <Home className="h-4 w-4" />,
  group_accommodation: <Building2 className="h-4 w-4" />,
  camping: <Tent className="h-4 w-4" />,
  no_preference: <HelpCircle className="h-4 w-4" />,
};

interface AccommodationRequest {
  id: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  customer_company: string | null;
  arrival_date: string;
  departure_date: string;
  number_of_guests: number;
  accommodation_type: string;
  room_count: number | null;
  room_occupancy: string | null;
  room_types: string[];
  location_preference: string[];
  budget_range: string | null;
  special_requests: string | null;
  room_assignment?: string | null;
  guest_details_updated_at?: string | null;
  wants_activities: boolean;
  status: string;
  created_at: string;
  invoicingMode?: string | null;
  linked_program_id?: string | null;
}

import { AlertTriangle } from "lucide-react";

interface AccommodationQuote {
  id: string;
  status: string;
  price_total: number;
  submitted_at: string | null;
  valid_until: string;
  reset_reason?: string | null;
}

interface PartnerAccommodationRequestCardProps {
  request: AccommodationRequest;
  quote: AccommodationQuote | null;
  onSubmitQuote: () => void;
  invoicingMode?: string | null;
  partnerId: string;
  partnerName: string;
  partnerEmail: string;
  partnerToken?: string | null;
}

export const PartnerAccommodationRequestCard = ({
  request,
  quote,
  onSubmitQuote,
  invoicingMode,
  partnerId,
  partnerName,
  partnerEmail,
  partnerToken,
}: PartnerAccommodationRequestCardProps) => {
  const [showChat, setShowChat] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const { toast } = useToast();

  const handleDownloadProgram = async () => {
    if (!request.linked_program_id || !partnerToken) return;
    setIsDownloading(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-program-docx", {
        body: { request_id: request.linked_program_id, partner_token: partnerToken },
      });
      if (error) throw error;
      const blob = data instanceof Blob
        ? data
        : new Blob([data as ArrayBuffer], {
            type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          });
      const fileName = `Programma-${request.customer_company || request.customer_name}.docx`.replace(/\s+/g, "-");
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast({ title: "Programma gedownload", description: "Het programma is opgeslagen als .docx." });
    } catch (err: any) {
      console.error("docx download error:", err);
      toast({
        title: "Download mislukt",
        description: err?.message ?? "Kon het programma niet downloaden.",
        variant: "destructive",
      });
    } finally {
      setIsDownloading(false);
    }
  };
  const nights = differenceInDays(new Date(request.departure_date), new Date(request.arrival_date));
  const statusConfig = QUOTE_STATUS_CONFIG[quote?.status || "pending"];
  const typeConfig = ACCOMMODATION_TYPES.find(t => t.value === request.accommodation_type);
  const locationLabels = request.location_preference
    .map(loc => LOCATION_PREFERENCES.find(l => l.value === loc)?.label)
    .filter(Boolean);
  const budgetLabel = BUDGET_RANGES.find(b => b.value === request.budget_range)?.label;

  const isNew = !quote?.submitted_at && 
    new Date(request.created_at).getTime() > Date.now() - 24 * 60 * 60 * 1000;

  const canSubmit = quote?.status === "pending";
  const canEdit = quote?.status === "submitted";
  const isSelected = quote?.status === "selected";
  const isRejected = quote?.status === "rejected";

  return (
    <Card className={`relative transition-all ${isNew ? "ring-2 ring-primary/50" : ""}`}>
      {isNew && (
        <Badge className="absolute -top-2 -right-2 bg-primary">Nieuw</Badge>
      )}
      
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              {TYPE_ICONS[request.accommodation_type]}
              {request.customer_company || request.customer_name}
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {request.customer_name}
            </p>
          </div>
          <Badge variant={statusConfig.variant}>{statusConfig.label}</Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Key details */}
        <div className="grid grid-cols-2 gap-3">
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span>
              {format(new Date(request.arrival_date), "EEE d MMM", { locale: nl })} - {" "}
              {format(new Date(request.departure_date), "EEE d MMM", { locale: nl })}
            </span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span>{nights} nachten</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span>{request.number_of_guests} personen</span>
          </div>
          {request.room_count && (
            <div className="flex items-center gap-2 text-sm">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              <span>±{request.room_count} kamers</span>
            </div>
          )}
        </div>

        {/* Type */}
        {typeConfig && (
          <div className="flex items-center gap-2">
            <span className="text-xl">{typeConfig.icon}</span>
            <span className="text-sm font-medium">{typeConfig.label}</span>
          </div>
        )}

        {/* Location & Budget */}
        <div className="flex flex-wrap gap-2">
          {locationLabels.map((label, i) => (
            <Badge key={i} variant="outline" className="text-xs">
              <MapPin className="h-3 w-3 mr-1" />
              {label}
            </Badge>
          ))}
          {budgetLabel && (
            <Badge variant="outline" className="text-xs">
              <Euro className="h-3 w-3 mr-1" />
              {budgetLabel}
            </Badge>
          )}
        </div>

        {/* Special requests preview */}
        {request.special_requests && (
          <div className="text-sm text-muted-foreground bg-muted/50 p-2 rounded line-clamp-2">
            {request.special_requests}
          </div>
        )}

        {request.room_assignment && (
          <div className="text-sm bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 p-2 rounded">
            <p className="text-xs font-medium text-blue-800 dark:text-blue-300 uppercase tracking-wider mb-1">Kamerindeling van de klant</p>
            <p className="text-blue-900 dark:text-blue-200 whitespace-pre-wrap">{request.room_assignment}</p>
          </div>
        )}
        {quote?.status === "pending" && quote?.reset_reason && (
          <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg">
            <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
            <div className="text-sm">
              <p className="font-medium text-amber-800 dark:text-amber-300">Wijziging ontvangen</p>
              <p className="text-amber-700 dark:text-amber-400 mt-0.5">
                {quote.reset_reason}. Pas uw offerte aan en dien deze opnieuw in.
              </p>
            </div>
          </div>
        )}

        <Separator />

        {/* Quote info if submitted */}
        {quote?.submitted_at && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Uw offerte:</span>
            <span className="font-semibold">
              €{quote.price_total.toLocaleString("nl-NL", { minimumFractionDigits: 2 })}
            </span>
          </div>
        )}

        {/* Status-specific message */}
        {isSelected && (
          <div className="p-3 bg-green-50 dark:bg-green-950/20 rounded-lg space-y-2">
            <div className="flex items-center gap-2 text-green-700 dark:text-green-400 font-medium text-sm">
              <Check className="h-4 w-4" />
              <span>Uw offerte is geaccepteerd!</span>
            </div>
            <div className="text-sm text-muted-foreground space-y-1">
              <p>Bureau Vlieland verzorgt centraal de facturatie aan de klant. Na afloop van het verblijf:</p>
              <ol className="list-decimal list-inside space-y-0.5 text-xs">
                <li>Stuur uw factuur (voor de geoffreerde prijs) naar facturatie@bureauvlieland.nl</li>
                <li>Registreer de factuur hier in het portaal</li>
                <li>Bureau Vlieland factureert de klant en verrekent de commissie met u</li>
              </ol>
            </div>
          </div>
        )}

        {isRejected && (
          <div className="flex items-center gap-2 p-2 bg-red-50 text-red-700 rounded-lg text-sm">
            <X className="h-4 w-4" />
            <span>De klant heeft een andere accommodatie gekozen.</span>
          </div>
        )}

        {quote?.status === "declined" && (
          <div className="flex items-center gap-2 p-2 bg-muted text-muted-foreground rounded-lg text-sm">
            <X className="h-4 w-4" />
            <span>U heeft deze aanvraag afgewezen.</span>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex gap-2">
          {canSubmit && (
            <Button onClick={onSubmitQuote} className="flex-1">
              <Send className="h-4 w-4 mr-2" />
              Offerte indienen
            </Button>
          )}
          {canEdit && (
            <Button onClick={onSubmitQuote} variant="outline" className="flex-1">
              <Eye className="h-4 w-4 mr-2" />
              Bekijken / Aanpassen
            </Button>
          )}
          {(isSelected || isRejected || quote?.status === "declined") && (
            <Button onClick={onSubmitQuote} variant="ghost" className="flex-1">
              <Eye className="h-4 w-4 mr-2" />
              Details bekijken
            </Button>
          )}
          {quote && (
            <Button variant="ghost" size="icon" onClick={() => setShowChat(true)} title="Berichten">
              <MessageSquare className="h-4 w-4" />
            </Button>
          )}
          {isSelected && request.linked_program_id && partnerToken && (
            <Button
              variant="outline"
              size="icon"
              onClick={handleDownloadProgram}
              disabled={isDownloading}
              title="Download programma (.docx)"
            >
              {isDownloading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <FileText className="h-4 w-4" />
              )}
            </Button>
          )}
        </div>
      </CardContent>

      {/* Chat Sheet */}
      {quote && (
        <PartnerAccommodationChatSheet
          open={showChat}
          onOpenChange={setShowChat}
          accommodationId={request.id}
          quoteId={quote.id}
          partnerId={partnerId}
          partnerName={partnerName}
          partnerEmail={partnerEmail}
          referenceLabel={`Logiesaanvraag ${request.customer_company || request.customer_name}`}
        />
      )}
    </Card>
  );
};
