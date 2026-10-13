import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FactList, FormField, LoadingState, Notice } from "@/components/system";
import { KeyRound, Loader2, Save } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { PartnerTermsUpload } from "./PartnerTermsUpload";
import { PartnerUnavailabilityManager } from "./PartnerUnavailabilityManager";
import { SheetSection } from "./SheetSection";
import { PASSWORD_RULES_HINT, strongPasswordSchema } from "@/lib/passwordPolicy";
import { reportError } from "@/lib/errorReporting";

/**
 * Instellingen (partnerportaal fase 4, besluit 7): één formulier in secties
 * op `FormField` met één opslaanknop in een vaste voet (bedrijf, contact,
 * bank, beschikbaarheid, accommodatie). Daaronder de onderdelen met een
 * eigen actie: niet-beschikbare periodes, de commissie als `FactList`, de
 * voorwaarden en het wachtwoord.
 */
interface PartnerDetails {
  id: string;
  name: string;
  email: string;
  contact_email: string | null;
  phone: string | null;
  kvk_number: string | null;
  address_street: string | null;
  address_postal: string | null;
  address_city: string | null;
  commission_percentage: number;
  accommodation_commission_percentage: number | null;
  partner_type: string | null;
  terms_pdf_path: string | null;
  terms_uploaded_at: string | null;
  uses_default_terms: boolean | null;
  bank_iban: string | null;
  bank_account_name: string | null;
  booking_contact_name: string | null;
  booking_contact_phone: string | null;
  availability_notes: string | null;
  accommodation_description: string | null;
}

const EMPTY_FORM = {
  name: "",
  contact_email: "",
  phone: "",
  address_street: "",
  address_postal: "",
  address_city: "",
  bank_account_name: "",
  booking_contact_name: "",
  booking_contact_phone: "",
  availability_notes: "",
  accommodation_description: "",
};

export const PartnerSettingsForm = () => {
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const [partner, setPartner] = useState<PartnerDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [isImpersonating, setIsImpersonating] = useState(false);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [nameError, setNameError] = useState<string | null>(null);
  const [passwordData, setPasswordData] = useState({ newPassword: "", confirmPassword: "" });
  const [passwordErrors, setPasswordErrors] = useState<Record<string, string>>({});

  const fetchPartner = useCallback(async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) return;

    const impersonatePartnerId = searchParams.get("impersonate");
    let query = supabase.from("partners").select("*");
    let impersonating = false;
    if (impersonatePartnerId) {
      const { data: isAdmin } = await supabase.rpc("is_admin", { _user_id: session.user.id });
      if (isAdmin) {
        query = query.eq("id", impersonatePartnerId);
        impersonating = true;
      }
    }
    if (!impersonating) query = query.eq("auth_user_id", session.user.id).eq("is_active", true);

    const { data, error } = await query.single();
    if (data && !error) {
      const details = data as unknown as PartnerDetails;
      setPartner(details);
      setFormData({
        name: details.name || "",
        contact_email: details.contact_email || "",
        phone: details.phone || "",
        address_street: details.address_street || "",
        address_postal: details.address_postal || "",
        address_city: details.address_city || "",
        bank_account_name: details.bank_account_name || "",
        booking_contact_name: details.booking_contact_name || "",
        booking_contact_phone: details.booking_contact_phone || "",
        availability_notes: details.availability_notes || "",
        accommodation_description: details.accommodation_description || "",
      });
      setIsImpersonating(impersonating);
    }
    setIsLoading(false);
  }, [searchParams]);

  useEffect(() => {
    void fetchPartner();
  }, [fetchPartner]);

  const handleChange = (field: keyof typeof EMPTY_FORM, value: string) => setFormData((prev) => ({ ...prev, [field]: value }));

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!partner) return;
    if (!formData.name.trim()) {
      setNameError("De bedrijfsnaam is verplicht.");
      return;
    }
    setIsSaving(true);
    try {
      // IBAN en KvK-nummer beheert Bureau Vlieland centraal (RLS blokkeert een eigen wijziging).
      const { error } = await supabase
        .from("partners")
        .update({
          name: formData.name.trim(),
          contact_email: formData.contact_email || null,
          phone: formData.phone || null,
          address_street: formData.address_street || null,
          address_postal: formData.address_postal || null,
          address_city: formData.address_city || null,
          bank_account_name: formData.bank_account_name || null,
          booking_contact_name: formData.booking_contact_name || null,
          booking_contact_phone: formData.booking_contact_phone || null,
          availability_notes: formData.availability_notes || null,
          accommodation_description: formData.accommodation_description || null,
        })
        .eq("id", partner.id);
      if (error) throw error;
      toast({ title: "Instellingen opgeslagen" });
    } catch (err) {
      reportError(err, { where: "PartnerSettingsForm: Error saving partner details" });
      toast({ title: "Instellingen niet opgeslagen", description: "Kon de gegevens niet opslaan. Probeer het opnieuw.", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors: Record<string, string> = {};
    const parsed = strongPasswordSchema.safeParse(passwordData.newPassword);
    if (!parsed.success) errors.newPassword = parsed.error.errors[0]?.message ?? "Kies een sterker wachtwoord.";
    if (passwordData.newPassword !== passwordData.confirmPassword) errors.confirmPassword = "De wachtwoorden komen niet overeen.";
    setPasswordErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setIsChangingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: passwordData.newPassword });
      if (error) throw error;
      setPasswordData({ newPassword: "", confirmPassword: "" });
      toast({ title: "Wachtwoord gewijzigd" });
    } catch (err) {
      reportError(err, { where: "PartnerSettingsForm: Error changing password" });
      toast({ title: "Wachtwoord niet gewijzigd", description: err instanceof Error && err.message ? err.message : "Kon het wachtwoord niet wijzigen.", variant: "destructive" });
    } finally {
      setIsChangingPassword(false);
    }
  };

  if (isLoading) return <LoadingState label="Instellingen laden" />;
  if (!partner) return null;

  const isAccommodation = partner.partner_type === "accommodation" || partner.partner_type === "both";
  const isActivity = !partner.partner_type || partner.partner_type === "activity_provider" || partner.partner_type === "both";

  return (
    <div className="space-y-10">
      {isImpersonating && (
        <Notice tone="warning" title="U kijkt mee als beheerder">
          <p>Wijzigingen worden direct opgeslagen voor deze partner.</p>
        </Notice>
      )}

      <form onSubmit={(e) => void handleSave(e)} className="space-y-8">
        <SheetSection title="Bedrijf" help="Voor de communicatie en de facturen.">
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Bedrijfsnaam" htmlFor="inst-naam" required error={nameError}>
              <Input
                value={formData.name}
                onChange={(e) => {
                  handleChange("name", e.target.value);
                  setNameError(null);
                }}
              />
            </FormField>
            <FormField label="KvK-nummer" htmlFor="inst-kvk" help="Beheert Bureau Vlieland; neem contact op om het te wijzigen.">
              <Input value={partner.kvk_number ?? ""} readOnly disabled />
            </FormField>
          </div>
          <FormField label="Straat en huisnummer" htmlFor="inst-straat">
            <Input value={formData.address_street} onChange={(e) => handleChange("address_street", e.target.value)} />
          </FormField>
          <div className="grid gap-4 sm:grid-cols-[10rem_1fr]">
            <FormField label="Postcode" htmlFor="inst-postcode">
              <Input value={formData.address_postal} onChange={(e) => handleChange("address_postal", e.target.value)} maxLength={7} />
            </FormField>
            <FormField label="Plaats" htmlFor="inst-plaats">
              <Input value={formData.address_city} onChange={(e) => handleChange("address_city", e.target.value)} />
            </FormField>
          </div>
        </SheetSection>

        <SheetSection title="Contact">
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="E-mailadres om in te loggen" htmlFor="inst-login" help="Neem contact op met Bureau Vlieland om dit te wijzigen.">
              <Input value={partner.email} readOnly disabled />
            </FormField>
            <FormField label="E-mailadres voor berichten" htmlFor="inst-contact" help="Leeg: berichten gaan naar het inlogadres.">
              <Input type="email" value={formData.contact_email} onChange={(e) => handleChange("contact_email", e.target.value)} />
            </FormField>
            <FormField label="Telefoonnummer" htmlFor="inst-telefoon">
              <Input value={formData.phone} onChange={(e) => handleChange("phone", e.target.value)} placeholder="06 12345678" />
            </FormField>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Contactpersoon voor boekingen" htmlFor="inst-boeking-naam" help="Alleen als dat iemand anders is.">
              <Input value={formData.booking_contact_name} onChange={(e) => handleChange("booking_contact_name", e.target.value)} />
            </FormField>
            <FormField label="Telefoonnummer contactpersoon" htmlFor="inst-boeking-telefoon">
              <Input value={formData.booking_contact_phone} onChange={(e) => handleChange("booking_contact_phone", e.target.value)} placeholder="06 12345678" />
            </FormField>
          </div>
        </SheetSection>

        <SheetSection title="Bank" help="Voor de verrekening van de commissie.">
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="IBAN" htmlFor="inst-iban" help="Beheert Bureau Vlieland om fraude te voorkomen; neem contact op om het te wijzigen.">
              <Input value={partner.bank_iban ?? ""} readOnly disabled placeholder="NL00 BANK 0000 0000 00" />
            </FormField>
            <FormField label="Tenaamstelling" htmlFor="inst-tenaamstelling">
              <Input value={formData.bank_account_name} onChange={(e) => handleChange("bank_account_name", e.target.value)} />
            </FormField>
          </div>
        </SheetSection>

        <SheetSection title="Beschikbaarheid" help="Openingstijden, seizoen of andere opmerkingen voor Bureau Vlieland.">
          <FormField label="Toelichting" htmlFor="inst-beschikbaarheid">
            <Textarea value={formData.availability_notes} onChange={(e) => handleChange("availability_notes", e.target.value)} placeholder="Bijvoorbeeld: april tot en met oktober, dagelijks van 10.00 tot 18.00 uur, maandag gesloten." rows={3} />
          </FormField>
        </SheetSection>

        {isAccommodation && (
          <SheetSection title="Accommodatie" help="Deze tekst staat vooraf ingevuld in elke nieuwe logiesofferte.">
            <FormField label="Omschrijving" htmlFor="inst-accommodatie">
              <Textarea value={formData.accommodation_description} onChange={(e) => handleChange("accommodation_description", e.target.value)} placeholder="Bijvoorbeeld: familiehotel aan het strand met twintig kamers en een eigen restaurant, inclusief ontbijt." rows={4} />
            </FormField>
          </SheetSection>
        )}

        <div className="sticky bottom-0 flex justify-end border-t bg-background/95 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/80">
          <Button type="submit" disabled={isSaving}>
            {isSaving ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" aria-hidden="true" /> : <Save className="mr-1.5 h-4 w-4" aria-hidden="true" />}
            Instellingen opslaan
          </Button>
        </div>
      </form>

      <PartnerUnavailabilityManager partnerId={partner.id} />

      <FactList
        title="Commissie"
        summary="Neem contact op met Bureau Vlieland om een percentage aan te passen."
        items={[...(isActivity ? [{ label: "Activiteiten", value: `${partner.commission_percentage}%` }] : []), ...(isAccommodation ? [{ label: "Logies", value: `${partner.accommodation_commission_percentage ?? 10}%` }] : [])]}
      />

      <PartnerTermsUpload partnerId={partner.id} termsPdfPath={partner.terms_pdf_path} termsUploadedAt={partner.terms_uploaded_at} usesDefaultTerms={partner.uses_default_terms ?? false} onUpdate={fetchPartner} />

      {!isImpersonating && (
        <form onSubmit={(e) => void handleChangePassword(e)} className="space-y-4">
          <SheetSection title="Wachtwoord" help={PASSWORD_RULES_HINT}>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Nieuw wachtwoord" htmlFor="inst-wachtwoord" error={passwordErrors.newPassword}>
                <Input type="password" autoComplete="new-password" value={passwordData.newPassword} onChange={(e) => setPasswordData((p) => ({ ...p, newPassword: e.target.value }))} />
              </FormField>
              <FormField label="Herhaal het wachtwoord" htmlFor="inst-wachtwoord-herhaal" error={passwordErrors.confirmPassword}>
                <Input type="password" autoComplete="new-password" value={passwordData.confirmPassword} onChange={(e) => setPasswordData((p) => ({ ...p, confirmPassword: e.target.value }))} />
              </FormField>
            </div>
            <Button type="submit" variant="outline" disabled={isChangingPassword || !passwordData.newPassword}>
              {isChangingPassword ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" aria-hidden="true" /> : <KeyRound className="mr-1.5 h-4 w-4" aria-hidden="true" />}
              Wachtwoord wijzigen
            </Button>
          </SheetSection>
        </form>
      )}
    </div>
  );
};
