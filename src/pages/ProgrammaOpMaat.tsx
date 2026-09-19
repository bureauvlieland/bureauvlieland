import { RESPONSE_TIME } from "@/content/promises";
import { useState } from "react";
import { Helmet } from "react-helmet";
import { Link } from "react-router-dom";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Building2, Calendar as CalendarIcon, Heart, Mail, Phone, User, Users } from "lucide-react";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { generateCustomerToken } from "@/types/programRequest";
import { trackProgramRequestSubmitted, trackSubmitFailed } from "@/lib/analytics";
import { getEntryPage } from "@/lib/entryPageTracker";
import { MultiDatePicker } from "@/components/configurator/MultiDatePicker";
import {
  Container,
  FormField,
  FunnelHead,
  OptionCard,
  OptionGroup,
  Section,
  SectionHeader,
  SubmitNote,
  SuccessScreen,
  WizardFooter,
} from "@/components/system";

const formSchema = z.object({
  name: z.string().trim().min(2, "Vul uw naam in (min. 2 tekens)").max(100),
  email: z.string().trim().email("Vul een geldig e-mailadres in").max(255),
  phone: z.string().trim().min(5, "Vul een geldig telefoonnummer in").max(20).regex(/^[0-9+\s().-]+$/, "Vul een geldig telefoonnummer in"),
  company: z.string().trim().max(100).optional(),
  wishes: z.string().trim().max(2000).optional(),
});

type ProgramType = "zakelijk" | "prive";

const ProgrammaOpMaat = () => {
  const { toast } = useToast();

  const [programType, setProgramType] = useState<ProgramType>("zakelijk");
  const [numberOfPeople, setNumberOfPeople] = useState<number>(20);
  const [selectedDates, setSelectedDates] = useState<Date[]>([]);
  const [wantsAccommodation, setWantsAccommodation] = useState<boolean>(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    company: "",
    wishes: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [customerToken, setCustomerToken] = useState<string | null>(null);

  const isMultiDay = selectedDates.length > 1;

  const handleAddDate = (date: Date): boolean => {
    if (selectedDates.length >= 7) return false;
    const ds = date.toDateString();
    if (selectedDates.some((d) => d.toDateString() === ds)) return false;
    setSelectedDates((prev) => [...prev, date].sort((a, b) => a.getTime() - b.getTime()));
    return true;
  };

  const handleRemoveDate = (i: number) => {
    setSelectedDates((prev) => prev.filter((_, idx) => idx !== i));
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (selectedDates.length === 0) {
      toast({
        title: "Datum ontbreekt",
        description: "Kies minstens één datum waarop u wilt komen.",
        variant: "destructive",
      });
      return;
    }
    if (numberOfPeople < 1) {
      toast({ title: "Aantal personen", description: "Vul een geldig aantal in.", variant: "destructive" });
      return;
    }

    const result = formSchema.safeParse(formData);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach((err) => {
        const f = err.path[0] as string;
        fieldErrors[f] = err.message;
      });
      setErrors(fieldErrors);
      return;
    }

    setIsSubmitting(true);
    try {
      const token = generateCustomerToken();
      const isoDates = selectedDates.map((d) => format(d, "yyyy-MM-dd"));
      const formattedDates = selectedDates.map((d) => format(d, "EEEE d MMMM yyyy", { locale: nl }));

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
          general_notes: formData.wishes || null,
          origin: programType === "zakelijk" ? "maatwerk_zakelijk" : "maatwerk_prive",
          program_description: `Maatwerk ${programType}${wantsAccommodation ? " — logies gewenst" : ""}`,
          invoicing_mode: "bureau_central",
        });

      if (insertError) throw insertError;

      await supabase.rpc("append_customer_program_history", {
        p_request_id: requestId,
        p_customer_token: token,
        p_action: "created",
        p_actor_name: formData.name,
        p_new_value: {
          type: "maatwerk",
          origin: programType,
          wants_accommodation: wantsAccommodation,
          source: "programma-op-maat-page",
        },
      });

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
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err: any) {
      console.error("Error submitting maatwerk:", err);
      trackSubmitFailed({ formType: 'maatwerk_intake', error: err, extra: { source: 'programma_op_maat' } });
      toast({
        title: "Aanvraag niet verzonden",
        description: err?.message || "Er ging iets mis. Probeer het opnieuw of bel ons op 0562 700 208.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Programma op maat – Bureau Vlieland</title>
        <meta
          name="description"
          content="Laat Bureau Vlieland uw programma op Vlieland samenstellen. Vrijblijvend en op basis van uw wensen."
        />
        <link rel="canonical" href="https://bureauvlieland.nl/programma-op-maat" />
      </Helmet>
      <Navigation />

      <main id="main-content">
        {!isSuccess && (
          <FunnelHead
            eyebrow="Programma op maat"
            title="Laat ons uw programma samenstellen"
            intro={`Liever niet zelf puzzelen? Vertel ons uw wensen, dan sturen wij ${RESPONSE_TIME.within} een persoonlijk voorstel.`}
          />
        )}

        <Section spacing="compact" className="pb-floating">
          <Container size="prose">
            {isSuccess ? (
              <SuccessScreen
                title="Uw aanvraag is verstuurd"
                intro={`Controleer uw inbox voor de bevestigingsmail. ${RESPONSE_TIME.sentence} Op uw programmapagina volgt u de stand van zaken.`}
                primary={customerToken ? { label: "Bekijk uw programmapagina", to: `/mijn-programma/${customerToken}` } : undefined}
                secondary={{ label: "Terug naar de homepage", to: "/" }}
              />
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Type */}
                <Card className="p-5 sm:p-6">
                  <SectionHeader as="h2" size="md" weight="medium" title="Type aanvraag" intro="Kies wat het beste past." className="mb-4" />
                  <OptionGroup name="Type aanvraag" columns={2}>
                    <OptionCard
                      selected={programType === "zakelijk"}
                      onSelect={() => setProgramType("zakelijk")}
                      title="Zakelijk"
                      description="Bedrijfsuitje, teambuilding, heisessie, incentive"
                      icon={<Building2 />}
                    />
                    <OptionCard
                      selected={programType === "prive"}
                      onSelect={() => setProgramType("prive")}
                      title="Privé"
                      description="Trouwen, jubileum, familie- of vriendenweekend"
                      icon={<Heart />}
                    />
                  </OptionGroup>
                </Card>

                {/* Groep en datums */}
                <Card className="p-5 sm:p-6">
                  <SectionHeader
                    as="h2"
                    size="md"
                    weight="medium"
                    title="Wanneer en met hoeveel personen?"
                    intro="Datums zijn nog vrijblijvend en aanpasbaar."
                    className="mb-4"
                  />
                  <div className="space-y-5">
                    <FormField label="Aantal personen" htmlFor="maat-personen" required leading={<Users />}>
                      <Input
                        type="number"
                        min={1}
                        max={500}
                        value={numberOfPeople}
                        onChange={(e) => setNumberOfPeople(Math.max(1, parseInt(e.target.value) || 1))}
                        className="w-40"
                      />
                    </FormField>
                    <div className="space-y-1.5">
                      <Label className="flex items-center gap-1">
                        <CalendarIcon className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                        Datum(s)
                        <span className="text-destructive" aria-hidden="true">
                          *
                        </span>
                      </Label>
                      <p className="text-xs text-muted-foreground">Selecteer één of meer aaneensluitende dagen.</p>
                      <MultiDatePicker selectedDates={selectedDates} onAddDate={handleAddDate} onRemoveDate={handleRemoveDate} />
                    </div>
                    {isMultiDay && (
                      <label htmlFor="maat-logies" className="flex cursor-pointer items-start gap-3 rounded-lg border border-border p-4">
                        <Checkbox
                          id="maat-logies"
                          checked={wantsAccommodation}
                          onCheckedChange={(v) => setWantsAccommodation(v === true)}
                          className="mt-0.5"
                        />
                        <span>
                          <span className="block text-sm font-medium text-foreground">Logies meenemen</span>
                          <span className="block text-xs text-muted-foreground">Wij zoeken passende accommodatie voor uw groep.</span>
                        </span>
                      </label>
                    )}
                  </div>
                </Card>

                {/* Contact */}
                <Card className="p-5 sm:p-6">
                  <SectionHeader
                    as="h2"
                    size="md"
                    weight="medium"
                    title="Uw gegevens"
                    intro="Zodat wij contact met u kunnen opnemen."
                    className="mb-4"
                  />
                  <div className="space-y-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <FormField label="Naam" htmlFor="name" required leading={<User />} error={errors.name}>
                        <Input name="name" value={formData.name} onChange={handleChange} placeholder="Uw volledige naam" autoComplete="name" maxLength={100} />
                      </FormField>
                      <FormField label="Bedrijf of organisatie" htmlFor="company" leading={<Building2 />}>
                        <Input name="company" value={formData.company} onChange={handleChange} placeholder="Optioneel" autoComplete="organization" maxLength={100} />
                      </FormField>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <FormField label="E-mailadres" htmlFor="email" required leading={<Mail />} error={errors.email}>
                        <Input name="email" type="email" value={formData.email} onChange={handleChange} placeholder="uw@email.nl" autoComplete="email" maxLength={255} />
                      </FormField>
                      <FormField label="Telefoonnummer" htmlFor="phone" required leading={<Phone />} error={errors.phone}>
                        <Input name="phone" type="tel" value={formData.phone} onChange={handleChange} placeholder="06 12345678" autoComplete="tel" maxLength={20} />
                      </FormField>
                    </div>
                    <FormField label="Wensen en opmerkingen" htmlFor="wishes">
                      <Textarea
                        name="wishes"
                        value={formData.wishes}
                        onChange={handleChange}
                        placeholder="Vertel ons wat u voor ogen heeft: soort activiteiten, sfeer, bijzondere wensen, dieetwensen bij catering."
                        rows={5}
                      />
                    </FormField>
                  </div>
                </Card>

                <WizardFooter nextType="submit" nextLabel="Aanvraag versturen" nextLoading={isSubmitting} note={<SubmitNote />} />

                <p className="text-center text-sm text-muted-foreground">
                  Liever zelf samenstellen?{" "}
                  <Link to="/programma-samenstellen" className="text-primary underline underline-offset-2">
                    Stel zelf uw programma samen
                  </Link>
                  .
                </p>
              </form>
            )}
          </Container>
        </Section>
      </main>

      <Footer />
    </div>
  );
};

export default ProgrammaOpMaat;
