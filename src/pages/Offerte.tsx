import { RESPONSE_TIME } from "@/content/promises";
import { useState, useRef, useEffect } from "react";
import { Helmet } from "react-helmet";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { isDutchMobileNumber, DUTCH_MOBILE_PHONE_ERROR } from "@/lib/dutchMobilePhone";
import { supabase } from "@/integrations/supabase/client";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { RelatedLinks } from "@/components/RelatedLinks";
import { FaqSection } from "@/components/FaqSection";
import { trackQuoteRequestSubmitted } from "@/lib/analytics";
import { getEntryPage, inferEventTypeFromPath } from "@/lib/entryPageTracker";
import { reportError } from "@/lib/errorReporting";
import { Building2, Mail, Phone, User, Users } from "lucide-react";
import {
  Container,
  FormField,
  FunnelHead,
  Section,
  SectionHeader,
  SubmitNote,
  SuccessScreen,
  WizardFooter,
} from "@/components/system";

// Event type options for the dropdown
const EVENT_TYPE_OPTIONS = [
  { value: "bedrijfsuitje", label: "Bedrijfsuitje" },
  { value: "teamuitje", label: "Teamuitje / Teambuilding" },
  { value: "heisessie", label: "Heisessie / MT-dag" },
  { value: "incentive", label: "Incentive reis" },
  { value: "zakelijk_evenement", label: "Zakelijk evenement" },
  { value: "bruiloft", label: "Bruiloft" },
  { value: "familieweekend", label: "Familieweekend" },
  { value: "groepsweekend", label: "Groepsweekend" },
  { value: "jubileum", label: "Jubileum" },
  { value: "anders", label: "Anders" },
] as const;

const formSchema = z.object({
  name: z.string().min(2, "Naam is verplicht").max(100, "Maximaal 100 karakters"),
  company: z.string().max(100, "Maximaal 100 karakters").optional(),
  email: z.string().email("Vul een geldig e-mailadres in").max(255, "Maximaal 255 karakters"),
  phone: z.string().trim().max(20, "Maximaal 20 karakters").refine(isDutchMobileNumber, DUTCH_MOBILE_PHONE_ERROR),
  numberOfPeople: z.string().min(1, "Aantal personen is verplicht"),
  startDate: z.string().min(1, "Gewenste startdatum is verplicht"),
  numberOfDays: z.string().min(1, "Aantal dagen is verplicht"),
  budgetPerPerson: z.string().min(1, "Budgetindicatie is verplicht"),
  eventType: z.string().optional(),
  description: z.string().max(2000, "Maximaal 2000 karakters").optional(),
});

type FormValues = z.infer<typeof formSchema>;

const requiredMark = (
  <span className="text-destructive" aria-hidden="true">
    *
  </span>
);

export default function Offerte() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const formRef = useRef<HTMLDivElement>(null);

  // Get entry page data for attribution
  const entryPage = getEntryPage();
  const inferredEventType = entryPage ? inferEventTypeFromPath(entryPage.path) : null;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    mode: "onBlur",
    defaultValues: {
      name: "",
      company: "",
      email: "",
      phone: "",
      numberOfPeople: "",
      startDate: "",
      numberOfDays: "",
      budgetPerPerson: "",
      eventType: inferredEventType || "",
      description: "",
    },
  });
  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = form;

  // Check for chat summary from other pages
  useEffect(() => {
    const chatSummary = sessionStorage.getItem("chatSummary");
    if (chatSummary) {
      sessionStorage.removeItem("chatSummary");
      setTimeout(() => {
        formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
      toast({
        title: "Chatinformatie beschikbaar",
        description: "Vul het formulier in met uw contactgegevens en de details van uw evenement.",
      });
    }
  }, []);

  const onSubmit = async (data: FormValues) => {
    setIsSubmitting(true);

    try {
      const { error } = await supabase.functions.invoke("send-quote-request", {
        body: data,
      });

      if (error) throw error;

      // Track conversion event with event type and entry page
      const finalEventType = data.eventType || inferredEventType || "niet_gespecificeerd";
      trackQuoteRequestSubmitted({
        numberOfPeople: parseInt(data.numberOfPeople, 10) || 0,
        numberOfDays: data.numberOfDays,
        budgetPerPerson: data.budgetPerPerson,
        eventType: finalEventType,
        entryPage: entryPage?.path || "direct",
        utmSource: entryPage?.utm_source,
        utmMedium: entryPage?.utm_medium,
        utmCampaign: entryPage?.utm_campaign,
      });

      reset();
      setIsSuccess(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (error) {
      reportError(error, { where: "Offerte: Error submitting quote request" });
      toast({
        title: "Er ging iets mis",
        description: "Probeer het later opnieuw of bel ons op 0562 700 208.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Helmet>
        <title>Offerte aanvragen | Bureau Vlieland</title>
        <meta
          name="description"
          content={`Vraag een vrijblijvende offerte aan voor uw teamuitje, training, evenement of catering op Vlieland. ${RESPONSE_TIME.short}.`}
        />
      </Helmet>

      <Navigation />

      <main id="main-content">
        {!isSuccess && (
          <FunnelHead
            eyebrow="Offerte"
            title="Offerte aanvragen"
            intro={`Vertel ons kort over uw evenement. ${RESPONSE_TIME.sentence}`}
          />
        )}

        <Section spacing="compact">
          <Container size="prose">
            <div ref={formRef} className="scroll-mt-20">
              {isSuccess ? (
                <SuccessScreen
                  title="Uw offerteaanvraag is verstuurd"
                  intro={`Controleer uw inbox voor de bevestiging. ${RESPONSE_TIME.sentence} Heeft u tussendoor een vraag? Bel ons op 0562 700 208.`}
                  primary={{ label: "Terug naar de homepage", to: "/" }}
                  secondary={{ label: "Bekijk voorbeeldprogramma's", to: "/voorbeeldprogrammas" }}
                />
              ) : (
                <Card className="p-5 sm:p-8">
                  <form onSubmit={handleSubmit(onSubmit)} className="space-y-8" noValidate>
                    <div className="space-y-4">
                      <SectionHeader as="h2" size="md" weight="medium" title="Uw gegevens" />
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <FormField label="Naam" htmlFor="offerte-naam" required leading={<User />} error={errors.name?.message}>
                          <Input placeholder="Voor- en achternaam" autoComplete="name" {...register("name")} />
                        </FormField>
                        <FormField label="Bedrijf of organisatie" htmlFor="offerte-bedrijf" leading={<Building2 />} error={errors.company?.message}>
                          <Input placeholder="Optioneel" autoComplete="organization" {...register("company")} />
                        </FormField>
                        <FormField label="E-mailadres" htmlFor="offerte-email" required leading={<Mail />} error={errors.email?.message}>
                          <Input type="email" placeholder="naam@voorbeeld.nl" autoComplete="email" {...register("email")} />
                        </FormField>
                        <FormField label="Mobiel nummer (06)" htmlFor="offerte-telefoon" required leading={<Phone />} error={errors.phone?.message}>
                          <Input type="tel" placeholder="06 12345678" autoComplete="tel" {...register("phone")} />
                        </FormField>
                      </div>
                    </div>

                    <div className="space-y-4 border-t border-border pt-6">
                      <SectionHeader as="h2" size="md" weight="medium" title="Uw evenement" />
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <FormField label="Aantal personen" htmlFor="offerte-personen" required leading={<Users />} error={errors.numberOfPeople?.message}>
                          <Input type="number" min={1} placeholder="Bijvoorbeeld 25" {...register("numberOfPeople")} />
                        </FormField>
                        <FormField label="Gewenste startdatum" htmlFor="offerte-datum" required error={errors.startDate?.message}>
                          <Input type="date" {...register("startDate")} />
                        </FormField>
                        <Controller
                          control={control}
                          name="numberOfDays"
                          render={({ field }) => (
                            <div className="space-y-1.5">
                              <Label htmlFor="offerte-dagen" className="flex items-center gap-1">
                                Aantal dagen
                                {requiredMark}
                              </Label>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <SelectTrigger id="offerte-dagen" aria-invalid={errors.numberOfDays ? true : undefined}>
                                  <SelectValue placeholder="Kies het aantal dagen" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="1">1 dag</SelectItem>
                                  <SelectItem value="2">2 dagen</SelectItem>
                                  <SelectItem value="3">3 dagen</SelectItem>
                                  <SelectItem value="4">4 dagen</SelectItem>
                                  <SelectItem value="5+">5 dagen of meer</SelectItem>
                                </SelectContent>
                              </Select>
                              {errors.numberOfDays && (
                                <p className="text-sm font-medium text-destructive">{errors.numberOfDays.message}</p>
                              )}
                            </div>
                          )}
                        />
                        <FormField label="Budgetindicatie per persoon" htmlFor="offerte-budget" required error={errors.budgetPerPerson?.message}>
                          <Input placeholder="Bijvoorbeeld €150 per persoon" {...register("budgetPerPerson")} />
                        </FormField>
                      </div>
                      <Controller
                        control={control}
                        name="eventType"
                        render={({ field }) => (
                          <div className="space-y-1.5">
                            <Label htmlFor="offerte-type">Type uitje</Label>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <SelectTrigger id="offerte-type">
                                <SelectValue placeholder="Kies een type uitje" />
                              </SelectTrigger>
                              <SelectContent>
                                {EVENT_TYPE_OPTIONS.map((option) => (
                                  <SelectItem key={option.value} value={option.value}>
                                    {option.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        )}
                      />
                    </div>

                    <div className="space-y-4 border-t border-border pt-6">
                      <SectionHeader as="h2" size="md" weight="medium" title="Wensen" />
                      <FormField label="Omschrijving of bijzondere wensen" htmlFor="offerte-omschrijving" error={errors.description?.message}>
                        <Textarea
                          placeholder="Vertel ons meer over uw evenement, doelstellingen of bijzondere wensen"
                          className="min-h-[120px]"
                          {...register("description")}
                        />
                      </FormField>
                    </div>

                    <WizardFooter nextType="submit" nextLabel="Aanvraag versturen" nextLoading={isSubmitting} note={<SubmitNote />} />
                  </form>
                </Card>
              )}
            </div>
          </Container>
        </Section>
      </main>

      <FaqSection
        schemaId="offerte"
        items={[
          {
            question: "Hoe snel ontvang ik een offerte?",
            answer: `Na uw aanvraag nemen we contact op om de wensen door te nemen. ${RESPONSE_TIME.sentence}`,
          },
          {
            question: "Zitten er kosten aan een offerte?",
            answer: "Nee, het opstellen van een programmavoorstel is kosteloos en vrijblijvend.",
          },
          {
            question: "Hoe lang is een offerte geldig?",
            answer: "Op elke offerte staat een geldigheidsdatum. Daarna kunnen beschikbaarheid en tarieven van aanbieders wijzigen.",
          },
          {
            question: "Kan ik de offerte nog aanpassen?",
            answer: "Ja. Via uw persoonlijke klantpagina kunt u onderdelen laten toevoegen, wijzigen of verwijderen voordat u akkoord geeft.",
          },
        ]}
      />
      <RelatedLinks />
      <Footer />
    </>
  );
}
