import { useState } from "react";
import { differenceInDays, format, parseISO } from "date-fns";
import { nl } from "date-fns/locale";
import { Building2, Calendar, FileText, Loader2, MessageSquare, Moon, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Notice, Pill } from "@/components/system";
import { ACCOMMODATION_TYPES, BUDGET_RANGES, LOCATION_PREFERENCES } from "@/types/accommodation";
import { PartnerAccommodationChatSheet } from "./PartnerAccommodationChatSheet";
import { ProjectDocumentsPanel } from "@/components/shared/ProjectDocumentsPanel";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { reportError } from "@/lib/errorReporting";
import { formatEuro } from "@/lib/formatEuro";
import { partnerQuoteAction, partnerQuoteStatus } from "@/lib/accommodationQuoteStatus";
import { usePartnerContext } from "@/lib/partnerPortalContext";
import { PURCHASE_INVOICE_INBOX } from "@/lib/bureauContact";
import { cn } from "@/lib/utils";

/**
 * De logiesaanvraag als kaart (partnerportaal fase 3): dezelfde opbouw als
 * de onderdeelkaart. Titel, één status-`Pill` uit de woordenlijst
 * (`partnerQuoteStatus`), de feiten op één regel, wat er nu speelt als
 * `Notice`, en één primaire knop. Reageren gebeurt in de offertesheet; de
 * kaart opent die.
 */
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
  /** Uit het gekoppelde programma (klantpagina). */
  program_guest_names?: string | null;
  program_dietary_notes?: string | null;
  wants_activities: boolean;
  status: string;
  created_at: string;
  invoicingMode?: string | null;
  linked_program_id?: string | null;
}

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
  /** Opent de offertesheet: indienen, aanpassen, verlengen of alleen bekijken. */
  onOpen: () => void;
  partnerId: string;
  partnerName: string;
  partnerEmail: string;
  partnerToken?: string | null;
}

export const PartnerAccommodationRequestCard = ({ request, quote, onOpen, partnerId, partnerName, partnerEmail, partnerToken }: PartnerAccommodationRequestCardProps) => {
  const [showChat, setShowChat] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const { toast } = useToast();
  // Op de referentiepagina wordt niets opgehaald.
  const isDemo = Boolean(usePartnerContext().demo);

  const handleDownloadProgram = async () => {
    if (!request.linked_program_id || !partnerToken) return;
    setIsDownloading(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-program-docx", {
        body: { request_id: request.linked_program_id, partner_token: partnerToken },
      });
      if (error) throw error;
      const blob =
        data instanceof Blob
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
    } catch (err) {
      reportError(err, { where: "PartnerAccommodationRequestCard: docx download error" });
      toast({ title: "Download mislukt", description: err instanceof Error && err.message ? err.message : "Kon het programma niet downloaden.", variant: "destructive" });
    } finally {
      setIsDownloading(false);
    }
  };

  const status = partnerQuoteStatus(quote?.status);
  const customerLabel = request.customer_company || request.customer_name;
  const nights = Math.max(1, differenceInDays(parseISO(request.departure_date), parseISO(request.arrival_date)));
  const typeLabel = ACCOMMODATION_TYPES.find((t) => t.value === request.accommodation_type)?.label;
  const locationLabels = request.location_preference.map((loc) => LOCATION_PREFERENCES.find((l) => l.value === loc)?.label).filter(Boolean) as string[];
  const budgetLabel = BUDGET_RANGES.find((b) => b.value === request.budget_range)?.label;
  const isNew = !quote?.submitted_at && new Date(request.created_at).getTime() > Date.now() - 24 * 60 * 60 * 1000;
  const closed = status.key === "declined" || status.key === "cancelled" || status.key === "not_selected";

  const dates = `${format(parseISO(request.arrival_date), "EEE d MMM", { locale: nl })} tot ${format(parseISO(request.departure_date), "EEE d MMM yyyy", { locale: nl })}`;
  const wishes = [...locationLabels, budgetLabel].filter(Boolean) as string[];

  // Eén primaire knop per status (regel 3: de kaart opent de sheet).
  const primary = partnerQuoteAction(quote?.status);

  return (
    <article
      id={`logies-${request.id}`}
      className={cn("flex flex-col rounded-lg border bg-card p-4 transition-colors duration-base", status.tone === "warning" && "border-warning/40", closed && "opacity-70")}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="break-words text-base font-medium leading-snug">{customerLabel}</h3>
          {request.customer_company && <p className="text-sm text-muted-foreground">{request.customer_name}</p>}
        </div>
        <div className="flex shrink-0 flex-wrap justify-end gap-1.5">
          {isNew && <Pill tone="brand">Nieuw</Pill>}
          <Pill tone={status.tone} title={status.hint}>
            {status.label}
          </Pill>
        </div>
      </div>

      <ul className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-sm text-muted-foreground">
        <li className="inline-flex items-center gap-1">
          <Calendar className="h-3.5 w-3.5" aria-hidden="true" />
          {dates}
        </li>
        <li className="inline-flex items-center gap-1">
          <Moon className="h-3.5 w-3.5" aria-hidden="true" />
          {nights === 1 ? "1 nacht" : `${nights} nachten`}
        </li>
        <li className="inline-flex items-center gap-1">
          <Users className="h-3.5 w-3.5" aria-hidden="true" />
          {request.number_of_guests} personen
        </li>
        {request.room_count ? (
          <li className="inline-flex items-center gap-1">
            <Building2 className="h-3.5 w-3.5" aria-hidden="true" />
            ongeveer {request.room_count} kamers
          </li>
        ) : null}
      </ul>
      {(typeLabel || wishes.length > 0) && <p className="mt-1 text-sm text-muted-foreground">{[typeLabel, ...wishes].filter(Boolean).join(" · ")}</p>}
      {request.special_requests && <p className="mt-2 text-sm">{request.special_requests}</p>}
      {quote?.submitted_at && quote.price_total > 0 && (
        <p className="mt-2 text-sm">
          <span className="font-semibold">{formatEuro(quote.price_total)}</span>
          <span className="ml-1 text-xs text-muted-foreground">uw offerte · geldig tot {format(parseISO(quote.valid_until), "d MMMM yyyy", { locale: nl })}</span>
        </p>
      )}

      <div className="mt-3 space-y-3">
        {request.room_assignment && (
          <Notice tone="info" title="Kamerindeling van de klant">
            <p className="whitespace-pre-wrap">{request.room_assignment}</p>
          </Notice>
        )}
        {request.program_dietary_notes && (
          <Notice tone="warning" title="Dieetwensen en allergieën">
            <p className="whitespace-pre-wrap">{request.program_dietary_notes}</p>
          </Notice>
        )}
        {request.program_guest_names && (
          <details className="rounded-md border bg-muted/30 text-sm">
            <summary className="cursor-pointer px-3 py-2 font-medium">Gastenlijst</summary>
            <p className="whitespace-pre-wrap border-t px-3 py-2">{request.program_guest_names}</p>
          </details>
        )}
        {status.key === "requested" && quote?.reset_reason && (
          <Notice tone="warning" title="Wijziging ontvangen">
            <p>{quote.reset_reason}. Pas uw offerte aan en dien hem opnieuw in.</p>
          </Notice>
        )}
        {status.key === "expired" && (
          <Notice tone="warning" title="De geldigheid is verstreken">
            <p>Verleng de offerte en hij staat weer open voor de klant.</p>
          </Notice>
        )}
        {status.key === "selected" && (
          <Notice tone="success" title="De klant heeft uw offerte gekozen">
            <p>Bureau Vlieland factureert de klant. Na het verblijf stuurt u uw factuur naar {PURCHASE_INVOICE_INBOX} of registreert u hem onder Facturatie; het bureau verrekent de commissie.</p>
          </Notice>
        )}
        {(status.key === "not_selected" || status.key === "declined" || status.key === "cancelled") && <p className="text-sm text-muted-foreground">{status.hint}</p>}
        {!isDemo && <ProjectDocumentsPanel accommodationRequestId={request.id} viewer="partner" canUpload={false} compact title="Documenten van Bureau Vlieland en de klant" emptyHint="Geen documenten gedeeld." />}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Button size="sm" variant={primary.variant} onClick={onOpen}>
          {primary.label}
        </Button>
        {quote && (
          <Button variant="ghost" size="sm" onClick={() => setShowChat(true)}>
            <MessageSquare className="mr-1.5 h-4 w-4" aria-hidden="true" />
            Berichten
          </Button>
        )}
        {status.key === "selected" && request.linked_program_id && partnerToken && (
          <Button variant="ghost" size="sm" onClick={handleDownloadProgram} disabled={isDownloading}>
            {isDownloading ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" aria-hidden="true" /> : <FileText className="mr-1.5 h-4 w-4" aria-hidden="true" />}
            Programma (.docx)
          </Button>
        )}
      </div>

      {quote && (
        <PartnerAccommodationChatSheet
          open={showChat}
          onOpenChange={setShowChat}
          accommodationId={request.id}
          quoteId={quote.id}
          partnerId={partnerId}
          partnerName={partnerName}
          partnerEmail={partnerEmail}
          referenceLabel={`Logiesaanvraag ${customerLabel}`}
        />
      )}
    </article>
  );
};
