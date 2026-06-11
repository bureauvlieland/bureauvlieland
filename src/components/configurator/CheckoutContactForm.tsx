import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { format, subHours } from "date-fns";
import { nl } from "date-fns/locale";
import type { CartItemDetail } from "@/types/buildingBlock";
import { usePublishedBuildingBlocks, getBlockById } from "@/hooks/useBuildingBlocks";
import { Loader2, ArrowLeft, User, Mail, Phone, Building2, AlertCircle, RotateCcw } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { generateCustomerToken } from "@/types/programRequest";
import { trackProgramRequestSubmitted, trackSubmitFailed } from "@/lib/analytics";
import { getEntryPage, inferEventTypeFromPath, buildAttribution } from "@/lib/entryPageTracker";
import { HowItWorksBlock } from "./HowItWorksBlock";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";

interface CheckoutContactFormProps {
  cartItems: CartItemDetail[];
  numberOfPeople: number;
  selectedDates: Date[];
  onBack: () => void;
  onSuccess: (customerToken: string) => void;
}

export const CheckoutContactForm = ({
  cartItems,
  numberOfPeople,
  selectedDates,
  onBack,
  onSuccess,
}: CheckoutContactFormProps) => {
  
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResendingLink, setIsResendingLink] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [duplicateWarningOpen, setDuplicateWarningOpen] = useState(false);
  const [existingRequest, setExistingRequest] = useState<{
    id: string;
    reference: string | null;
    quoteStatus: string | null;
    createdAt: string;
  } | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    company: "",
    notes: "",
  });

  const entryPage = getEntryPage();
  const inferredEventType = entryPage ? inferEventTypeFromPath(entryPage.path) : null;
  const { data: allBlocks = [] } = usePublishedBuildingBlocks();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  // Client-side dedup-hash op email + dates + cart. Voorkomt dat een dubbele
  // klik (of refresh + opnieuw verzenden) zelfs maar de DB-check bereikt.
  const buildSubmitHash = () => {
    const dateKey = selectedDates.map((d) => d.toISOString().split("T")[0]).sort().join(",");
    const cartKey = cartItems
      .map((i) => `${i.blockId}@${i.dayIndex ?? 0}`)
      .sort()
      .join("|");
    return `bv:submit:${formData.email.trim().toLowerCase()}:${dateKey}:${cartKey}`;
  };

  const checkClientDedup = (): { blocked: boolean; reason?: "in_flight" | "recent" } => {
    try {
      const key = buildSubmitHash();
      const raw = sessionStorage.getItem(key);
      if (!raw) return { blocked: false };
      const { ts, state } = JSON.parse(raw) as { ts: number; state: "in_flight" | "success" };
      const ageMs = Date.now() - ts;
      if (state === "in_flight" && ageMs < 60_000) return { blocked: true, reason: "in_flight" };
      if (state === "success" && ageMs < 60 * 60_000) return { blocked: true, reason: "recent" };
    } catch { /* sessionStorage unavailable: skip */ }
    return { blocked: false };
  };

  const markSubmit = (state: "in_flight" | "success") => {
    try {
      sessionStorage.setItem(buildSubmitHash(), JSON.stringify({ ts: Date.now(), state }));
    } catch { /* no-op */ }
  };

  const checkForDuplicateAndSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return; // belt-and-braces against double submit

    const dedup = checkClientDedup();
    if (dedup.blocked) {
      setSubmitError(
        dedup.reason === "in_flight"
          ? "Uw aanvraag wordt zojuist verstuurd. Een moment geduld — u krijgt binnen enkele seconden bevestiging."
          : "Deze aanvraag is zojuist al verstuurd. Controleer uw inbox en spam-folder. Bel ons gerust op 0562 700 208 als u geen bevestiging heeft ontvangen."
      );
      return;
    }


    const fiveMinutesAgo = subHours(new Date(), 0.0833).toISOString(); // 5 min
    const twentyFourHoursAgo = subHours(new Date(), 24).toISOString();

    try {
      // Hard block: same email + non-cancelled aanvraag in laatste 5 min
      const { data: recent } = await supabase
        .from("program_requests")
        .select("id, reference_number, created_at")
        .eq("customer_email", formData.email)
        .neq("status", "cancelled")
        .gte("created_at", fiveMinutesAgo)
        .order("created_at", { ascending: false })
        .limit(1);

      if (recent && recent.length > 0) {
        setSubmitError(
          `Uw aanvraag is zojuist al verstuurd (referentie ${recent[0].reference_number ?? "wordt aangemaakt"}). U ontvangt binnen enkele minuten een bevestiging per e-mail. Controleer uw inbox en spam-folder voordat u opnieuw verstuurt.`
        );
        return;
      }

      // Soft warning: zelfde email in laatste 24u (niet cancelled)
      const { data: existing } = await supabase
        .from("program_requests")
        .select("id, reference_number")
        .eq("customer_email", formData.email)
        .neq("status", "cancelled")
        .gte("created_at", twentyFourHoursAgo)
        .order("created_at", { ascending: false })
        .limit(1);

      if (existing && existing.length > 0) {
        setExistingReference(existing[0].reference_number ?? null);
        setDuplicateWarningOpen(true);
        return;
      }
    } catch {
      // Bij een check-fail laten we de submit gewoon doorgaan
    }

    await executeSubmit();
  };

  const executeSubmit = async () => {
    setDuplicateWarningOpen(false);
    setSubmitError(null);
    setIsSubmitting(true);
    markSubmit("in_flight");


    try {
      const token = generateCustomerToken();

      const blocksWithDetails = cartItems.map((item) => {
        const block = getBlockById(allBlocks, item.blockId);
        return {
          id: block?.id || "",
          name: block?.name || "",
          category: block?.category || "",
          provider: block?.provider?.name || (block?.block_type === "bureau" ? "Bureau Vlieland" : block?.provider_id || "Bureau Vlieland"),
          providerId: block?.provider_id || "",
          providerEmail: block?.provider?.email || "",
          blockType: block?.block_type || "partner",
          externalUrl: block?.external_url,
          preferredTime: item.preferredTime,
          itemNotes: item.notes,
          dayIndex: item.dayIndex ?? 0,
        };
      });

      const formattedDates = selectedDates.map((d) =>
        format(d, "d MMMM yyyy", { locale: nl })
      );
      const isoDates = selectedDates.map((d) => d.toISOString().split("T")[0]);

      const finalEventType = inferredEventType || "niet_gespecificeerd";

      const requestId = crypto.randomUUID();
      const { error: insertError } = await supabase
        .from("program_requests")
        .insert({
          id: requestId,
          customer_token: token,
          customer_name: formData.name,
          customer_email: formData.email,
          customer_phone: formData.phone,
          customer_company: formData.company || null,
          number_of_people: numberOfPeople,
          selected_dates: isoDates,
          general_notes: formData.notes || null,
          origin: "self_service",
          program_description: finalEventType,
          quote_status: "concept",
          attribution: buildAttribution(),
        });

      if (insertError) throw insertError;

      const itemsToInsert = blocksWithDetails.map((block) => {
        const fullBlock = getBlockById(allBlocks, block.id);
        return {
          request_id: requestId,
          block_id: block.id,
          block_name: block.name,
          block_category: block.category,
          provider_name: block.provider,
          provider_id: block.providerId,
          provider_email: block.providerEmail || null,
          block_type: block.blockType,
          price_indication: null,
          day_index: block.dayIndex,
          preferred_time: block.preferredTime || null,
          customer_notes: block.itemNotes || null,
          status: "pending",
          skip_partner_notification: true,
          price_type: fullBlock?.price_type || "per_person",
          external_url: block.externalUrl || null,
          admin_price_override: fullBlock?.price_adult ?? null,
          location_lat: fullBlock?.location_lat ?? null,
          location_lng: fullBlock?.location_lng ?? null,
          location_address: fullBlock?.location_address ?? null,
          admin_price_notes: fullBlock?.description || fullBlock?.short_description || null,
        };
      });

      const { error: itemsError } = await supabase
        .from("program_request_items")
        .insert(itemsToInsert);

      if (itemsError) throw itemsError;

      await supabase.from("program_request_history").insert({
        request_id: requestId,
        action: "created",
        actor: "customer",
        actor_name: formData.name,
        new_value: { items_count: blocksWithDetails.length },
      });

      const { error } = await supabase.functions.invoke("send-program-request", {
        body: {
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          company: formData.company,
          notes: formData.notes,
          numberOfPeople,
          selectedDate: formattedDates[0],
          selectedDates: formattedDates,
          numberOfDays: selectedDates.length,
          bureauFee: 0,
          blocks: blocksWithDetails,
          customerToken: token,
          origin: window.location.origin,
        },
      });

      if (error) throw error;

      trackProgramRequestSubmitted({
        value: 0,
        numberOfPeople,
        numberOfDays: selectedDates.length,
        eventType: finalEventType,
        entryPage: entryPage?.path || "direct",
        utmSource: entryPage?.utm_source,
        utmMedium: entryPage?.utm_medium,
        utmCampaign: entryPage?.utm_campaign,
        items: blocksWithDetails.map((b) => ({
          id: b.id,
          name: b.name,
          category: b.category,
          provider: b.provider,
        })),
      });

      toast({
        title: "Aanvraag verzonden!",
        description: "Check je inbox voor de bevestigingsmail.",
      });

      markSubmit("success");
      onSuccess(token);

    } catch (error: any) {
      console.error("Error sending program request:", error);
      // Clear in-flight lock zodat de gebruiker opnieuw kan proberen
      try { sessionStorage.removeItem(buildSubmitHash()); } catch { /* no-op */ }

      trackSubmitFailed({
        formType: 'program_request',
        error,
        extra: {
          number_of_people: numberOfPeople,
          items_count: cartItems.length,
        },
      });
      const friendly =
        "We konden uw aanvraag op dit moment niet versturen. Dit kan komen door een tijdelijke verbindingsstoring. Probeer het opnieuw, of bel ons direct op 0562 700 208 — dan helpen wij u meteen verder.";
      setSubmitError(friendly);
      toast({
        title: "Aanvraag niet verzonden",
        description: friendly,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const isFormValid = formData.name && formData.email && formData.phone;

  return (
    <div className="max-w-2xl mx-auto">
      <Button variant="ghost" onClick={onBack} className="mb-6 -ml-2 gap-2">
        <ArrowLeft className="h-4 w-4" />
        Terug naar programma
      </Button>

      <div className="space-y-8">
        {/* How it works */}
        <HowItWorksBlock />

        {/* Contact form */}
        <div className="bg-card border border-border rounded-xl p-6 md:p-8">
          <h2 className="text-xl font-display font-semibold mb-1">Uw gegevens</h2>
          <p className="text-sm text-muted-foreground mb-6">
            Vul uw contactgegevens in zodat wij u een voorstel kunnen sturen.
          </p>

          <form onSubmit={checkForDuplicateAndSubmit} className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Naam *</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    placeholder="Uw volledige naam"
                    className="pl-10"
                    maxLength={100}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="company">Bedrijf / Organisatie</Label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="company"
                    name="company"
                    value={formData.company}
                    onChange={handleChange}
                    placeholder="Optioneel"
                    className="pl-10"
                    maxLength={100}
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email">E-mailadres *</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    placeholder="uw@email.nl"
                    className="pl-10"
                    maxLength={255}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Telefoonnummer *</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="phone"
                    name="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={handleChange}
                    required
                    placeholder="+31 6 12345678"
                    className="pl-10"
                    maxLength={20}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Opmerkingen</Label>
              <Textarea
                id="notes"
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                placeholder="Bijzonderheden, wensen of vragen..."
                rows={3}
              />
            </div>

            {/* Privacy notice */}
            <div className="text-xs text-muted-foreground bg-muted/50 rounded-lg p-3">
              <p>
                Door deze aanvraag te versturen gaat u akkoord met onze{" "}
                <a href="/algemene-voorwaarden" target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground">
                  algemene voorwaarden
                </a>
                . Uw gegevens worden alleen gebruikt voor het verwerken van deze aanvraag.
              </p>
            </div>

            {submitError && (
              <Alert variant="destructive" className="flex flex-col gap-3 sm:flex-row sm:items-start">
                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                <div className="flex-1">
                  <AlertTitle>Aanvraag niet verzonden</AlertTitle>
                  <AlertDescription>{submitError}</AlertDescription>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => executeSubmit()}
                  disabled={isSubmitting}
                  className="gap-2 shrink-0"
                >
                  {isSubmitting ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <RotateCcw className="h-3.5 w-3.5" />
                  )}
                  Opnieuw proberen
                </Button>
              </Alert>
            )}

            <Button
              type="submit"
              size="lg"
              className="w-full"
              disabled={isSubmitting || !isFormValid}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Versturen...
                </>
              ) : (
                "Aanvraag versturen"
              )}
            </Button>
          </form>
        </div>
      </div>

      <AlertDialog open={duplicateWarningOpen} onOpenChange={setDuplicateWarningOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>U heeft al een aanvraag lopen</AlertDialogTitle>
            <AlertDialogDescription>
              Met dit e-mailadres is in de afgelopen 24 uur al een aanvraag ingediend
              {existingReference ? ` (referentie ${existingReference})` : ""}.
              Wij nemen daar op werkdagen binnen 1 dag contact over op.
              <br /><br />
              <strong>Wilt u die aanvraag aanpassen?</strong> Reageer dan op uw bevestigingsmail
              of bel ons op 0562 700 208. Alleen als dit een écht nieuwe aanvraag is voor een
              andere groep of datum, klik dan op "Nieuwe aanvraag versturen".
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuleren</AlertDialogCancel>
            <AlertDialogAction onClick={() => executeSubmit()}>
              Nieuwe aanvraag versturen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
