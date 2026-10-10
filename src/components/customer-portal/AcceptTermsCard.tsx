import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { ExternalLink, Loader2, FileText, PenLine } from "lucide-react";
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

const TermsLink = ({ href, label = "Bekijken" }: { href: string; label?: string }) => (
  <Button variant="link" size="sm" className="h-auto p-0" asChild>
    <a href={href} target="_blank" rel="noopener noreferrer">
      <FileText className="mr-1 h-3 w-3" aria-hidden="true" />
      {label}
      <ExternalLink className="ml-1 h-3 w-3" aria-hidden="true" />
    </a>
  </Button>
);

/**
 * Ondertekenen (klantportaal fase 3a): de voorwaarden die gelden, het
 * vinkje, de naam als handtekening en één primaire knop. De blokkade
 * (facturatiegegevens ontbreken) is een `Notice` met de weg ernaartoe.
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
  const [signatureTouched, setSignatureTouched] = useState(false);
  const [partnerTerms, setPartnerTerms] = useState<PartnerTermsInfo[]>([]);
  const [isLoadingPartners, setIsLoadingPartners] = useState(true);
  const [showAccommodationWarning, setShowAccommodationWarning] = useState(false);
  const [reservationAcknowledged, setReservationAcknowledged] = useState(false);

  const isMultiDay = selectedDates.length > 1;
  const hasSelectedAccommodation = accommodationQuotes.some((q) => q.status === "selected");

  useEffect(() => {
    const fetchPartnerTerms = async () => {
      const itemPartnerIds = items
        .filter((item) => item.block_type === "partner" && item.status !== "cancelled")
        .map((item) => item.provider_id);
      const selectedQuote = accommodationQuotes.find((q) => q.status === "selected");
      if (selectedQuote) itemPartnerIds.push(selectedQuote.partner_id);
      const uniquePartnerIds = [...new Set(itemPartnerIds)];
      if (uniquePartnerIds.length === 0) {
        setIsLoadingPartners(false);
        return;
      }
      const { data, error } = await supabase
        .from("partners_public")
        .select("id, name, terms_pdf_path, uses_default_terms")
        .in("id", uniquePartnerIds);
      if (!error && data) setPartnerTerms(data);
      setIsLoadingPartners(false);
    };
    fetchPartnerTerms();
  }, [items, accommodationQuotes]);

  const getPublicUrl = (path: string) => supabase.storage.from("partner-terms").getPublicUrl(path).data.publicUrl;

  const isUnderReservation = unconfirmedItems.length > 0;
  const signatureValid = signatureName.trim().length >= 2;
  const canSubmit = isChecked && isBillingComplete && signatureValid && (!isUnderReservation || reservationAcknowledged);

  const handleAcceptClick = () => {
    setSignatureTouched(true);
    if (!canSubmit) return;
    if (isMultiDay && !hasSelectedAccommodation) {
      setShowAccommodationWarning(true);
      return;
    }
    handleAccept();
  };

  const handleAccept = async () => {
    setIsSubmitting(true);
    try {
      await onAccept(signatureName.trim(), isUnderReservation);
    } finally {
      setIsSubmitting(false);
    }
  };

  const hasCateringItems = items.some((item) => item.block_category === "catering" && item.status !== "cancelled");
  const selectedQuote = accommodationQuotes.find((q) => q.status === "selected");
  const selectedAccommodationPartner = selectedQuote ? partnerTerms.find((p) => p.id === selectedQuote.partner_id) : null;
  const accommodationUsesDefaultTerms =
    !!selectedQuote && (!selectedAccommodationPartner?.terms_pdf_path || selectedAccommodationPartner?.uses_default_terms);
  const showUvhTerms = hasCateringItems || accommodationUsesDefaultTerms;

  const defaultPartners = partnerTerms.filter((p) => !p.terms_pdf_path || p.uses_default_terms);
  const customPartners = partnerTerms.filter((p) => p.terms_pdf_path && !p.uses_default_terms);

  // Deel-akkoord op de logiesvoorwaarden, gegeven bij het kiezen van het logies.
  const lodgingPartialAcceptedAt = selectedQuote?.customer_terms_accepted_at || null;
  const lodgingSignatureName = selectedQuote?.customer_signature_name || null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">{isUnderReservation ? "Ondertekenen onder voorbehoud" : "Ondertekenen"}</CardTitle>
        <p className="text-sm text-muted-foreground">
          {isUnderReservation
            ? `U legt uw programma en de voorwaarden nu vast. ${
                unconfirmedItems.length === 1 ? "Eén onderdeel wacht" : `${unconfirmedItems.length} onderdelen wachten`
              } nog op de aanbieder en blijft daarom onder voorbehoud.`
            : "De aanbieders hebben alle onderdelen bevestigd. Met uw handtekening wordt de boeking definitief."}
        </p>
      </CardHeader>
      <CardContent className="space-y-5">
        {!isBillingComplete && (
          <Notice tone="warning" title="Eerst uw facturatiegegevens">
            <p>Zonder bedrijfsnaam, adres en contactpersoon kunnen wij niet factureren.</p>
            <Button variant="outline" size="sm" className="mt-2" onClick={onOpenBilling}>
              Facturatiegegevens invullen
            </Button>
          </Notice>
        )}

        <div className="rounded-md bg-muted/50 p-4">
          <p className="mb-2 text-sm font-medium text-foreground">Voor dit programma gelden deze voorwaarden</p>
          <ul className="space-y-2 text-sm">
            <li className="flex flex-wrap items-center gap-x-2">
              <span className="font-medium">Bemiddelingsvoorwaarden Bureau Vlieland</span>
              <TermsLink href={BUREAU_TERMS_URL} />
            </li>
            {!isLoadingPartners && defaultPartners.length > 0 && (
              <li>
                <div className="flex flex-wrap items-center gap-x-2">
                  <span className="font-medium">Standaardvoorwaarden partneraanbod Bureau Vlieland</span>
                  <TermsLink href={DEFAULT_TERMS_URL} />
                </div>
                <p className="text-xs text-muted-foreground">Voor {defaultPartners.map((p) => p.name).join(", ")}</p>
              </li>
            )}
            {!isLoadingPartners &&
              customPartners.map((partner) => (
                <li key={partner.id} className="flex flex-wrap items-center gap-x-2">
                  <span className="font-medium">Voorwaarden {partner.name}</span>
                  <TermsLink href={getPublicUrl(partner.terms_pdf_path!)} />
                </li>
              ))}
            {!isLoadingPartners && showUvhTerms && (
              <li className="flex flex-wrap items-center gap-x-2">
                <span className="font-medium">Uniforme Voorwaarden Horeca 2024</span>
                <TermsLink href={UVH_TERMS_URL} label="Pdf" />
              </li>
            )}
          </ul>
        </div>

        {lodgingPartialAcceptedAt && (
          <Notice tone="success">
            De voorwaarden voor uw logies heeft u al geaccepteerd op{" "}
            {new Date(lodgingPartialAcceptedAt).toLocaleDateString("nl-NL")}
            {lodgingSignatureName ? ` (${lodgingSignatureName})` : ""}. Met deze ondertekening bevestigt u uw hele programma.
          </Notice>
        )}

        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <Checkbox
              id="terms-checkbox"
              checked={isChecked}
              onCheckedChange={(checked) => setIsChecked(checked === true)}
              disabled={!isBillingComplete}
              className="mt-0.5"
            />
            <Label htmlFor="terms-checkbox" className="cursor-pointer text-sm leading-relaxed">
              Ik ga akkoord met de bemiddelingsvoorwaarden van Bureau Vlieland
              {partnerTerms.length > 0 && " en met de voorwaarden van de aanbieders hierboven"}.
            </Label>
          </div>

          {isUnderReservation && (
            <div className="flex items-start gap-3">
              <Checkbox
                id="reservation-checkbox"
                checked={reservationAcknowledged}
                onCheckedChange={(checked) => setReservationAcknowledged(checked === true)}
                disabled={!isBillingComplete}
                className="mt-0.5"
              />
              <Label htmlFor="reservation-checkbox" className="cursor-pointer text-sm leading-relaxed">
                Ik begrijp dat {unconfirmedItems.length === 1 ? "dit onderdeel" : "deze onderdelen"} nog onder voorbehoud van de
                aanbieder {unconfirmedItems.length === 1 ? "staat" : "staan"}:{" "}
                <span className="font-medium">{unconfirmedItems.map((item) => item.block_name).join(", ")}</span>. Lukt een onderdeel niet,
                dan zoekt Bureau Vlieland een alternatief of vervalt het zonder kosten.
              </Label>
            </div>
          )}
        </div>

        <FormField
          label="Uw volledige naam, als handtekening"
          htmlFor="signature-name"
          required
          leading={<PenLine aria-hidden="true" />}
          help={
            isUnderReservation
              ? "Bevestigde onderdelen worden definitief gereserveerd. De annuleringsvoorwaarden gelden."
              : "Hiermee worden de reserveringen definitief. De annuleringsvoorwaarden gelden."
          }
          error={signatureTouched && !signatureValid ? "Typ uw volledige naam" : undefined}
        >
          <Input
            value={signatureName}
            onChange={(e) => setSignatureName(e.target.value)}
            onBlur={() => setSignatureTouched(true)}
            placeholder="Voor- en achternaam"
            autoComplete="name"
            disabled={!isChecked || !isBillingComplete}
          />
        </FormField>

        <Button onClick={handleAcceptClick} disabled={!canSubmit || isSubmitting} size="lg" className="w-full sm:w-auto">
          {isSubmitting ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <PenLine className="mr-2 h-4 w-4" aria-hidden="true" />
          )}
          {isSubmitting ? "Ondertekenen…" : isUnderReservation ? "Ondertekenen onder voorbehoud" : "Ondertekenen"}
        </Button>
      </CardContent>

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
    </Card>
  );
};
