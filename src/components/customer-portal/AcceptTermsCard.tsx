import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { ExternalLink, Loader2, FileText, PenLine, Building2 } from "lucide-react";
import { FormField, Notice } from "@/components/system";
import { supabase } from "@/integrations/supabase/client";
import { AccommodationWarningDialog } from "./AccommodationWarningDialog";
import type { ProgramRequestItem } from "@/types/programRequest";
import {
  EMPTY_BILLING_DETAILS,
  normalizeBillingDetails,
  validateBillingDetails,
  type BillingDetails,
  type BillingErrors,
} from "@/lib/billingDetails";

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
  /** "akkoord": akkoord op het voorstel en handtekening in één stap; "onderteken": alleen de handtekening. */
  mode?: "akkoord" | "onderteken";
  onAccept: (signatureName: string, underReservation?: boolean, billing?: BillingDetails) => Promise<boolean>;
  isBillingComplete: boolean;
  onOpenBilling: () => void;
  items: ProgramRequestItem[];
  accommodationQuotes?: AccommodationQuote[];
  selectedDates?: Date[];
  /** Onderdelen die nog op bevestiging van de aanbieder wachten (ondertekenen onder voorbehoud). */
  unconfirmedItems?: ProgramRequestItem[];
  customerName?: string | null;
  customerEmail?: string | null;
  /** Al bekende factuurgegevens, om voor te vullen. */
  billingDefaults?: Partial<BillingDetails>;
}

const DEFAULT_TERMS_URL = "/partner-voorwaarden";
const BUREAU_TERMS_URL = "/algemene-voorwaarden";
const UVH_TERMS_URL = "https://assets.khn.nl/uploads/downloads/UVH_Nederlands_vanaf_2024_2024-10-18-082210_zkdv.pdf";

/** De velden die bij het tekenen verplicht zijn (besluit 4): naam voor de factuur en adres. KvK en btw later. */
type EssentialField = "billing_company_name" | "billing_address_street" | "billing_address_postal" | "billing_address_city";
const ESSENTIAL_FIELDS: EssentialField[] = ["billing_company_name", "billing_address_street", "billing_address_postal", "billing_address_city"];

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
 * Akkoord en ondertekenen (plan klantreis en ondertekening, fase 4): de
 * voorwaarden die gelden, de factuurgegevens als die nog ontbreken
 * (bedrijfsnaam en adres verplicht, KvK en btw later bij Facturatie), het
 * vinkje, de naam als handtekening en één primaire knop. Staat er nog een
 * onderdeel open bij een aanbieder, dan tekent de klant onder voorbehoud.
 */
export const AcceptTermsCard = ({
  mode = "onderteken",
  onAccept,
  isBillingComplete,
  onOpenBilling,
  items,
  accommodationQuotes = [],
  selectedDates = [],
  unconfirmedItems = [],
  customerName,
  customerEmail,
  billingDefaults,
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
  const [billing, setBilling] = useState<BillingDetails>(() => ({
    ...EMPTY_BILLING_DETAILS,
    ...billingDefaults,
    billing_contact_name: billingDefaults?.billing_contact_name || customerName || "",
    billing_contact_email: billingDefaults?.billing_contact_email || customerEmail || "",
  }));
  const [billingErrors, setBillingErrors] = useState<BillingErrors>({});

  const isMultiDay = selectedDates.length > 1;
  const hasSelectedAccommodation = accommodationQuotes.some((q) => q.status === "selected");
  const isAkkoord = mode === "akkoord";

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
  const essentialsFilled = isBillingComplete || ESSENTIAL_FIELDS.every((f) => billing[f].trim().length > 0);
  const canSubmit = isChecked && signatureValid && essentialsFilled && (!isUnderReservation || reservationAcknowledged);

  const setBillingField = (field: EssentialField, value: string) => {
    setBilling((prev) => ({ ...prev, [field]: value }));
    if (billingErrors[field]) setBillingErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  /** De factuurgegevens die met de handtekening meegaan; null als ze al compleet zijn of niet kloppen. */
  const billingToSave = (): BillingDetails | null | false => {
    if (isBillingComplete) return null;
    const normalized = normalizeBillingDetails(billing);
    const errors = validateBillingDetails(normalized);
    const essentialErrors: BillingErrors = {};
    for (const f of ESSENTIAL_FIELDS) if (errors[f]) essentialErrors[f] = errors[f];
    if (Object.keys(essentialErrors).length > 0) {
      setBillingErrors(essentialErrors);
      return false;
    }
    return normalized;
  };

  const handleAcceptClick = () => {
    setSignatureTouched(true);
    if (!canSubmit) return;
    if (isMultiDay && !hasSelectedAccommodation && !isAkkoord) {
      setShowAccommodationWarning(true);
      return;
    }
    handleAccept();
  };

  const handleAccept = async () => {
    const billingPayload = billingToSave();
    if (billingPayload === false) return;
    setIsSubmitting(true);
    try {
      await onAccept(signatureName.trim(), isUnderReservation, billingPayload ?? undefined);
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

  const title = isAkkoord ? "Akkoord en ondertekenen" : isUnderReservation ? "Ondertekenen onder voorbehoud" : "Ondertekenen";
  const subtitle = isAkkoord
    ? "U geeft akkoord op het voorstel met de getoonde prijzen en ondertekent de voorwaarden. De aanbieders bevestigen daarna beschikbaarheid en definitieve prijs."
    : isUnderReservation
      ? `U legt uw programma en de voorwaarden nu vast. ${
          unconfirmedItems.length === 1 ? "Eén onderdeel wacht" : `${unconfirmedItems.length} onderdelen wachten`
        } nog op de aanbieder en blijft daarom onder voorbehoud.`
      : "De aanbieders hebben alle onderdelen bevestigd. Met uw handtekening wordt de boeking definitief.";
  const buttonLabel = isSubmitting
    ? "Bezig…"
    : isAkkoord
      ? "Akkoord en ondertekenen"
      : isUnderReservation
        ? "Ondertekenen onder voorbehoud"
        : "Ondertekenen";
  const reservationList =
    unconfirmedItems.length > 6
      ? `${unconfirmedItems.length} onderdelen`
      : unconfirmedItems.map((item) => item.block_name).join(", ");

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">{title}</CardTitle>
        <p className="text-sm text-muted-foreground">{subtitle}</p>
      </CardHeader>
      <CardContent className="space-y-5">
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

        {isBillingComplete ? (
          <p className="text-sm text-muted-foreground">
            De factuur gaat naar{" "}
            <span className="font-medium text-foreground">{billing.billing_company_name || "de opgegeven gegevens"}</span>.{" "}
            <button type="button" onClick={onOpenBilling} className="text-primary underline underline-offset-2">
              Gegevens wijzigen
            </button>
          </p>
        ) : (
          <div className="space-y-3 rounded-md border border-border p-4">
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              <p className="text-sm font-medium text-foreground">Aan wie sturen wij de factuur?</p>
            </div>
            <p className="text-xs text-muted-foreground">
              Bedrijfsnaam en adres zijn nodig voor de overeenkomst. KvK- en btw-nummer kunt u later aanvullen bij Facturatie.
            </p>
            <FormField label="Bedrijf of naam voor de factuur" htmlFor="sign-company" required error={billingErrors.billing_company_name}>
              <Input
                id="sign-company"
                value={billing.billing_company_name}
                onChange={(e) => setBillingField("billing_company_name", e.target.value)}
                autoComplete="organization"
                maxLength={120}
              />
            </FormField>
            <FormField label="Straat en huisnummer" htmlFor="sign-street" required error={billingErrors.billing_address_street}>
              <Input
                id="sign-street"
                value={billing.billing_address_street}
                onChange={(e) => setBillingField("billing_address_street", e.target.value)}
                autoComplete="street-address"
                maxLength={120}
              />
            </FormField>
            <div className="grid gap-3 sm:grid-cols-[10rem_1fr]">
              <FormField label="Postcode" htmlFor="sign-postal" required error={billingErrors.billing_address_postal}>
                <Input
                  id="sign-postal"
                  value={billing.billing_address_postal}
                  onChange={(e) => setBillingField("billing_address_postal", e.target.value)}
                  autoComplete="postal-code"
                  maxLength={12}
                />
              </FormField>
              <FormField label="Plaats" htmlFor="sign-city" required error={billingErrors.billing_address_city}>
                <Input
                  id="sign-city"
                  value={billing.billing_address_city}
                  onChange={(e) => setBillingField("billing_address_city", e.target.value)}
                  autoComplete="address-level2"
                  maxLength={80}
                />
              </FormField>
            </div>
          </div>
        )}

        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <Checkbox
              id="terms-checkbox"
              checked={isChecked}
              onCheckedChange={(checked) => setIsChecked(checked === true)}
              className="mt-0.5"
            />
            <Label htmlFor="terms-checkbox" className="cursor-pointer text-sm leading-relaxed">
              {isAkkoord ? "Ik geef akkoord op dit programmavoorstel en ga akkoord" : "Ik ga akkoord"} met de bemiddelingsvoorwaarden van Bureau Vlieland
              {partnerTerms.length > 0 && " en met de voorwaarden van de aanbieders hierboven"}.
            </Label>
          </div>

          {isUnderReservation && (
            <div className="flex items-start gap-3">
              <Checkbox
                id="reservation-checkbox"
                checked={reservationAcknowledged}
                onCheckedChange={(checked) => setReservationAcknowledged(checked === true)}
                className="mt-0.5"
              />
              <Label htmlFor="reservation-checkbox" className="cursor-pointer text-sm leading-relaxed">
                {isAkkoord
                  ? "Ik begrijp dat de onderdelen pas definitief zijn als de aanbieder beschikbaarheid en prijs bevestigt: "
                  : `Ik begrijp dat ${unconfirmedItems.length === 1 ? "dit onderdeel" : "deze onderdelen"} nog onder voorbehoud van de aanbieder ${unconfirmedItems.length === 1 ? "staat" : "staan"}: `}
                <span className="font-medium">{reservationList}</span>. Lukt een onderdeel niet, dan zoekt Bureau Vlieland een
                alternatief of vervalt het zonder kosten.
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
            id="signature-name"
            value={signatureName}
            onChange={(e) => setSignatureName(e.target.value)}
            onBlur={() => setSignatureTouched(true)}
            placeholder="Voor- en achternaam"
            autoComplete="name"
            disabled={!isChecked}
          />
        </FormField>

        <Button onClick={handleAcceptClick} disabled={!canSubmit || isSubmitting} size="lg" className="w-full sm:w-auto">
          {isSubmitting ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <PenLine className="mr-2 h-4 w-4" aria-hidden="true" />
          )}
          {buttonLabel}
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
