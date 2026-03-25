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
import { Loader2, ArrowLeft, User, Mail, Phone, Building2, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { generateCustomerToken } from "@/types/programRequest";
import { trackProgramRequestSubmitted } from "@/lib/analytics";
import { getEntryPage, inferEventTypeFromPath } from "@/lib/entryPageTracker";
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const token = generateCustomerToken();

      const blocksWithDetails = cartItems.map((item) => {
        const block = getBlockById(allBlocks, item.blockId);
        return {
          id: block?.id || "",
          name: block?.name || "",
          category: block?.category || "",
          provider: block?.provider?.name || "Bureau Vlieland",
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

      const { data: requestData, error: insertError } = await supabase
        .from("program_requests")
        .insert({
          customer_token: token,
          customer_name: formData.name,
          customer_email: formData.email,
          customer_phone: formData.phone,
          customer_company: formData.company || null,
          number_of_people: numberOfPeople,
          selected_dates: isoDates,
          general_notes: formData.notes || null,
          program_type: "self_service",
          program_description: finalEventType,
          quote_status: "concept",
        })
        .select()
        .single();

      if (insertError) throw insertError;

      const itemsToInsert = blocksWithDetails.map((block) => {
        const fullBlock = getBlockById(allBlocks, block.id);
        return {
          request_id: requestData.id,
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
        };
      });

      const { error: itemsError } = await supabase
        .from("program_request_items")
        .insert(itemsToInsert);

      if (itemsError) throw itemsError;

      await supabase.from("program_request_history").insert({
        request_id: requestData.id,
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

      onSuccess(token);
    } catch (error: any) {
      console.error("Error sending program request:", error);
      toast({
        title: "Er ging iets mis",
        description:
          error.message || "Probeer het later opnieuw of neem direct contact met ons op.",
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

          <form onSubmit={handleSubmit} className="space-y-5">
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
    </div>
  );
};
