import { useEffect, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { FileText, Loader2, PenLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { FormField, Notice } from "@/components/system";
import { supabase } from "@/integrations/supabase/client";
import { AccommodationWarningDialog } from "./AccommodationWarningDialog";
import type { ProgramRequestItem } from "@/types/programRequest";

interface PartnerTermsInfo {
  id: string;
  name: string;
  terms_pdf_path: string | null;
  uses_default_terms: boolean;
}

interface AccommodationQuote {
  id: string;
  partner_id: string;
  status: string;
  customer_terms_accepted_at?: string | null;
  customer_signature_name?: string | null;
}

interface AcceptTermsCardProps {
  onAccept: (signatureName: string, underReservation?: boolean) => Promise<boolean>;
  isBillingComplete: boolean;
  onOpenBilling: () => void;
  items: ProgramRequestItem[];
  accommodationQuotes?: AccommodationQuote[];
  selectedDates?: Date[];
  /** Onderdelen die nog op bevestiging van de aanbieder wachten (ondertekenen onder voorbehoud). */
  unconfirmedItems?: ProgramRequestItem[];
}

const DEFAULT_TERMS_URL = "/partner-voorwaarden";
const BUREAU_TERMS_URL = "/algemene-voorwaarden";
const UVH_TERMS_URL = "https://assets.khn.nl/uploads/downloads/UVH_Nederlands_vanaf_2024_2024-10-18-082210_zkdv.pdf";

const TermLink = ({ href, children }: { href: string; children: ReactNode }) => (
  <a href={href} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 font-medium text-primary hover:underline">
    <FileText className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
    {children}
  </a>
);

/**
 * Het ondertekenen (klantportaal fase 3): de voorwaarden als links, de
 * facturatiegegevens als voorwaarde vooraf, één vinkje (en één extra bij
 * voorbehoud), de naam als handtekening en één knop.
 */
export const AcceptTermsCard = ({
  onAccept,
  isBillingComplete,
  onOpenBilling,
  items,
  accommodationQuotes = [],
  selectedDates = [],
  unconfirmedItems = [],
}: AcceptTermsCardProps) => {
  const navigate = useNavigate();
  const [isChecked, setIsChecked] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [signatureName, setSignatureName] = useState("");
  const [partnerTerms, setPartnerTerms] = useState<PartnerTermsInfo[]>([]);
  const [isLoadingPartners, setIsLoadingPartners] = useState(true);
  const [showAccommodationWarning, setShowAccommodationWarning] = useState(false);
  const [reservationAcknowledged, setReservationAcknowledged] = useState(false);

  const isMultiDay = selectedDates.length > 1;
  const hasSelectedAccommodation = accommodationQuotes.some((q) => q.status === "selected");

  // De aanbieders in het programma, plus de gekozen logies.
  useEffect(() => {
    const fetchPartnerTerms = async () => {
      const itemPartnerIds = items.filter((item) => item.block_type === "partner" && item.status !== "cancelled").map((item) => item.provider_id);
      const selectedQuote = accommodationQuotes.find((q) => q.status === "selected");
      if (selectedQuote) itemPartnerIds.push(selectedQuote.partner_id);
      const uniquePartnerIds = [...new Set(itemPartnerIds)];
      if (uniquePartnerIds.length === 0) {
        setIsLoadingPartners(false);
        return;
      }
      const { data, error } = await supabase.from("partners_public").select("id, name, terms_pdf_path, uses_default_terms").in("id", uniquePartnerIds);
      if (!error && data) setPartnerTerms(data);
      setIsLoadingPartners(false);
    };
    fetchPartnerTerms();
  }, [items, accommodationQuotes]);

  const getPublicUrl = (path: string) => supabase.storage.from("partner-terms").getPublicUrl(path).data.publicUrl;

  const isUnderReservation = unconfirmedItems.length > 0;
  const count = unconfirmedItems.length;
  const names = unconfirmedItems.map((item) => item.block_name).join(", ");

  const canSubmit = isChecked && isBillingComplete && signatureName.trim().length >= 2 && (!isUnderReservation || reservationAcknowledged);

  const handleAccept = async () => {
    setIsSubmitting(true);
    try {
      await onAccept(signatureName.trim(), isUnderReservation);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAcceptClick = () => {
    if (!canSubmit) return;
    if (isMultiDay && !hasSelectedAccommodation) {
      setShowAccommodationWarning(true);
      return;
    }
    handleAccept();
  };

  const defaultPartners = partnerTerms.filter((p) => !p.terms_pdf_path || p.uses_default_terms);
  const customPartners = partnerTerms.filter((p) => p.terms_pdf_path && !p.uses_default_terms);

  // UVH: bij catering, of bij gekozen logies zonder eigen voorwaarden.
  const hasCateringItems = items.some((item) => item.block_category === "catering" && item.status !== "cancelled");
  const selectedQuote = accommodationQuotes.find((q) => q.status === "selected");
  const selectedAccommodationPartner = selectedQuote ? partnerTerms.find((p) => p.id === selectedQuote.partner_id) : null;
  const accommodationUsesDefaultTerms = !!selectedQuote && (!selectedAccommodationPartner?.terms_pdf_path || selectedAccommodationPartner?.uses_default_terms);
  const showUvhTerms = hasCateringItems || accommodationUsesDefaultTerms;

  // Deel-akkoord op de logiesvoorwaarden, gegeven bij het kiezen.
  const lodgingPartialAcceptedAt = selectedQuote?.customer_terms_accepted_at || null;
  const lodgingSignatureName = selectedQuote?.customer_signature_name || null;

  return (
    <>
      <section className="rounded-lg border bg-card p-4 sm:p-6" aria-labelledby="ondertekenen-kop">
        <h2 id="ondertekenen-kop" className="font-display text-2xl font-medium leading-tight">
          {isUnderReservation ? "Ondertekenen onder voorbehoud" : "Ondertekenen"}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {isUnderReservation
            ? `U legt uw programma en de voorwaarden nu vast. ${count === 1 ? "Eén onderdeel wacht" : `${count} onderdelen wachten`} nog op bevestiging van de aanbieder en ${count === 1 ? "blijft" : "blijven"} onder voorbehoud.`
            : "De aanbieders hebben alle onderdelen bevestigd. Met uw handtekening wordt de boeking definitief."}
        </p>

        {!isBillingComplete && (
          <Notice tone="warning" title="Facturatiegegevens nodig" className="mt-4">
            <p>Vul eerst uw facturatiegegevens in; daarna kunt u ondertekenen.</p>
            <Button variant="outline" size="sm" className="mt-2" onClick={onOpenBilling}>
              Facturatiegegevens invullen
            </Button>
          </Notice>
        )}

        <div className="mt-5">
          <h3 className="text-eyebrow font-medium uppercase text-muted-foreground">Voorwaarden</h3>
          <ul className="mt-2 space-y-2 text-sm">
            <li>
              <TermLink href={BUREAU_TERMS_URL}>Bemiddelingsvoorwaarden Bureau Vlieland</TermLink>
            </li>
            {defaultPartners.length > 0 && (
              <li>
                <TermLink href={DEFAULT_TERMS_URL}>Standaardvoorwaarden Partneraanbod Bureau Vlieland</TermLink>
                <p className="text-xs text-muted-foreground">Van toepassing op {defaultPartners.map((p) => p.name).join(", ")}</p>
              </li>
            )}
            {customPartners.map((partner) => (
              <li key={partner.id}>
                <TermLink href={getPublicUrl(partner.terms_pdf_path!)}>Voorwaarden {partner.name}</TermLink>
              </li>
            ))}
            {showUvhTerms && (
              <li>
                <TermLink href={UVH_TERMS_URL}>Uniforme Voorwaarden Horeca 2024 (pdf)</TermLink>
              </li>
            )}
          </ul>
          {isLoadingPartners && <p className="mt-2 text-xs text-muted-foreground">De voorwaarden van de aanbieders worden geladen…</p>}
        </div>

        {lodgingPartialAcceptedAt && (
          <p className="mt-4 text-sm text-muted-foreground">
            De voorwaarden voor uw logies heeft u al geaccepteerd op {new Date(lodgingPartialAcceptedAt).toLocaleDateString("nl-NL")}
            {lodgingSignatureName ? ` (${lodgingSignatureName})` : ""}. Met deze ondertekening bevestigt u uw volledige programma.
          </p>
        )}

        <div className="mt-5 space-y-3">
          <div className="flex items-start gap-3">
            <Checkbox id="terms-checkbox" checked={isChecked} onCheckedChange={(checked) => setIsChecked(checked === true)} disabled={!isBillingComplete} className="mt-0.5" />
            <Label htmlFor="terms-checkbox" className="text-sm leading-relaxed">
              Ik ga akkoord met de bemiddelingsvoorwaarden van Bureau Vlieland{partnerTerms.length > 0 && " en de voorwaarden van de genoemde aanbieders"}.
            </Label>
          </div>
          {isUnderReservation && (
            <Notice tone="warning">
              <div className="flex items-start gap-3">
                <Checkbox
                  id="reservation-checkbox"
                  checked={reservationAcknowledged}
                  onCheckedChange={(checked) => setReservationAcknowledged(checked === true)}
                  disabled={!isBillingComplete}
                  className="mt-0.5"
                />
                <Label htmlFor="reservation-checkbox" className="text-sm leading-relaxed">
                  Ik begrijp dat {count === 1 ? "dit onderdeel" : "deze onderdelen"} nog onder voorbehoud van bevestiging door de aanbieder {count === 1 ? "staat" : "staan"}:{" "}
                  <strong className="font-medium">{names}</strong>. Lukt een onderdeel niet, dan zoekt Bureau Vlieland een alternatief of vervalt het zonder kosten.
                </Label>
              </div>
            </Notice>
          )}
        </div>

        <div className="mt-5">
          <FormField
            label="Volledige naam"
            htmlFor="signature-name"
            required
            help="Uw naam geldt als digitale handtekening. Reserveringen worden definitief en de annuleringsvoorwaarden zijn van toepassing."
          >
            <Input
              id="signature-name"
              value={signatureName}
              onChange={(e) => setSignatureName(e.target.value)}
              placeholder="Typ uw volledige naam"
              disabled={!isChecked || !isBillingComplete}
              autoComplete="name"
            />
          </FormField>
        </div>

        <div className="mt-5">
          <Button onClick={handleAcceptClick} disabled={!canSubmit || isSubmitting} className="w-full sm:w-auto">
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <PenLine className="h-4 w-4" aria-hidden="true" />}
            {isUnderReservation ? "Ondertekenen onder voorbehoud" : "Ondertekenen"}
          </Button>
        </div>
      </section>

      <AccommodationWarningDialog
        open={showAccommodationWarning}
        onOpenChange={setShowAccommodationWarning}
        onContinueWithAccommodation={() => {
          setShowAccommodationWarning(false);
          navigate("/logies-aanvragen");
        }}
        onContinueWithout={() => {
          setShowAccommodationWarning(false);
          handleAccept();
        }}
      />
    </>
  );
};
