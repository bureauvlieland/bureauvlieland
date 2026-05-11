import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";

import { ChevronLeft, Loader2, CheckCircle, ArrowRight, Home } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { generateCustomerToken } from "@/types/programRequest";
import { trackProgramRequestSubmitted } from "@/lib/analytics";
import { getEntryPage } from "@/lib/entryPageTracker";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { Link } from "react-router-dom";
import { z } from "zod";

const formSchema = z.object({
  name: z.string().trim().min(2, "Vul uw naam in (min. 2 tekens)").max(100),
  email: z.string().trim().email("Vul een geldig e-mailadres in").max(255),
  phone: z.string().trim().min(10, "Vul een geldig telefoonnummer in").max(20),
  company: z.string().trim().max(100).optional(),
  wishes: z.string().trim().max(2000).optional(),
});

interface MaatwerkIntakeFormProps {
  programType: "zakelijk" | "prive";
  numberOfPeople: number;
  selectedDates: Date[];
  wantsAccommodation: boolean;
  templateInspiration: string | null;
  onBack: () => void;
}

export const MaatwerkIntakeForm = ({
  programType,
  numberOfPeople,
  selectedDates,
  wantsAccommodation,
  templateInspiration,
  onBack,
}: MaatwerkIntakeFormProps) => {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [customerToken, setCustomerToken] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    company: "",
    wishes: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const isMultiDay = selectedDates.length > 1;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const result = formSchema.safeParse(formData);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach((err) => {
        const field = err.path[0] as string;
        fieldErrors[field] = err.message;
      });
      setErrors(fieldErrors);
      return;
    }

    setIsSubmitting(true);

    try {
      const token = generateCustomerToken();
      const isoDates = selectedDates.map((d) => d.toISOString().split("T")[0]);
      const formattedDates = selectedDates.map((d) => format(d, "EEE d MMMM yyyy", { locale: nl }));

      // Build description with template inspiration + wishes
      const descriptionParts: string[] = [];
      if (templateInspiration) {
        descriptionParts.push(`Inspiratie: ${templateInspiration}`);
      }
      if (wantsAccommodation && isMultiDay) {
        descriptionParts.push("Logies gewenst: ja");
      }
      const programDescription = descriptionParts.length > 0 ? descriptionParts.join("\n") : null;

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
          general_notes: formData.wishes || null,
          origin: programType === "zakelijk" ? "maatwerk_zakelijk" : "maatwerk_prive",
          program_description: programDescription,
          invoicing_mode: "bureau_central",
        })
        .select()
        .single();

      if (insertError) throw insertError;

      // Log creation in history
      await supabase.from("program_request_history").insert({
        request_id: requestData.id,
        action: "created",
        actor: "customer",
        actor_name: formData.name,
        new_value: {
          type: "maatwerk",
          program_type: programType,
          template_inspiration: templateInspiration,
          wants_accommodation: wantsAccommodation,
        },
      });

      // Send emails
      await supabase.functions.invoke("send-program-request", {
        body: {
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          company: formData.company,
          notes: formData.wishes,
          numberOfPeople,
          selectedDate: formattedDates[0],
          selectedDates: formattedDates,
          numberOfDays: selectedDates.length,
          bureauFee: 0,
          blocks: [],
          customerToken: token,
          origin: window.location.origin,
        },
      });

      // Track analytics
      const entryPage = getEntryPage();
      trackProgramRequestSubmitted({
        value: 0,
        numberOfPeople,
        numberOfDays: selectedDates.length,
        eventType: `maatwerk_${programType}`,
        entryPage: entryPage?.path || "direct",
        utmSource: entryPage?.utm_source,
        utmMedium: entryPage?.utm_medium,
        utmCampaign: entryPage?.utm_campaign,
        items: [],
      });

      setCustomerToken(token);
      setIsSuccess(true);

      toast({
        title: "Aanvraag verzonden!",
        description: "U ontvangt een bevestigingsmail.",
      });
    } catch (error: any) {
      console.error("Error submitting maatwerk request:", error);
      toast({
        title: "Er ging iets mis",
        description: error.message || "Probeer het later opnieuw.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="max-w-lg mx-auto animate-in fade-in slide-in-from-bottom-4 duration-300">
        <div className="text-center py-8">
          <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-2xl font-display font-bold mb-2">Aanvraag verzonden!</h2>
          <p className="text-muted-foreground mb-6">
            Wij nemen zo snel mogelijk contact met u op om uw programma te bespreken.
            Check uw inbox voor de bevestigingsmail.
          </p>

          {customerToken && (
            <div className="bg-primary/10 border border-primary/20 rounded-lg p-4 mb-6 text-left">
              <p className="font-medium mb-2">Volg uw aanvraag</p>
              <p className="text-sm text-muted-foreground mb-3">
                Bekijk de status en voer eventuele wijzigingen door:
              </p>
              <Link to={`/mijn-programma/${customerToken}`}>
                <Button className="w-full">
                  Bekijk uw programma
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto animate-in fade-in slide-in-from-right-4 duration-300">
      <div className="text-center mb-8">
        <h2 className="text-2xl md:text-3xl font-display font-bold text-foreground mb-2">
          Vertel ons over uw wensen
        </h2>
        <p className="text-muted-foreground">
          Wij stellen een programma op maat voor u samen
        </p>
      </div>

      {/* Summary of previous choices */}
      <Card className="mb-6 bg-muted/30">
        <CardContent className="p-4 text-sm space-y-1">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Type</span>
            <span className="font-medium">{programType === "zakelijk" ? "Zakelijk" : "Privé"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Aantal personen</span>
            <span className="font-medium">{numberOfPeople}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Datum(s)</span>
            <span className="font-medium">
              {selectedDates.map((d) => format(d, "d MMM", { locale: nl })).join(", ")}
            </span>
          </div>
          {templateInspiration && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Inspiratie</span>
              <span className="font-medium">{templateInspiration}</span>
            </div>
          )}
        </CardContent>
      </Card>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="name">Naam *</Label>
            <Input
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="Uw volledige naam"
              className={errors.name ? "border-destructive" : ""}
            />
            {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="company">Bedrijf / Organisatie</Label>
            <Input
              id="company"
              name="company"
              value={formData.company}
              onChange={handleChange}
              placeholder="Optioneel"
            />
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="email">E-mailadres *</Label>
            <Input
              id="email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="uw@email.nl"
              className={errors.email ? "border-destructive" : ""}
            />
            {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Telefoonnummer *</Label>
            <Input
              id="phone"
              name="phone"
              type="tel"
              value={formData.phone}
              onChange={handleChange}
              placeholder="06 12345678"
              className={errors.phone ? "border-destructive" : ""}
            />
            {errors.phone && <p className="text-xs text-destructive">{errors.phone}</p>}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="wishes">Wensen en opmerkingen</Label>
          <Textarea
            id="wishes"
            name="wishes"
            value={formData.wishes}
            onChange={handleChange}
            placeholder="Vertel ons wat u voor ogen heeft. Denk aan: soort activiteiten, sfeer, bijzondere wensen, dieetwensen bij catering, etc."
            rows={4}
          />
        </div>

        {isMultiDay && (
          <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
            <div className="flex items-center gap-3">
              <Home className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm font-medium">Logies gewenst</p>
                <p className="text-xs text-muted-foreground">Wij zoeken passende accommodatie voor uw groep</p>
              </div>
            </div>
            <span className="text-sm font-medium text-primary">
              {wantsAccommodation ? "Ja" : "Nee"}
            </span>
          </div>
        )}

        <div className="flex justify-between pt-4">
          <Button variant="ghost" type="button" onClick={onBack} className="gap-2">
            <ChevronLeft className="h-4 w-4" />
            Terug
          </Button>
          <Button type="submit" size="lg" disabled={isSubmitting} className="gap-2">
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Verzenden...
              </>
            ) : (
              "Vrijblijvend aanvragen"
            )}
          </Button>
        </div>
      </form>
    </div>
  );
};
