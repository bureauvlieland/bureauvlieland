import { RESPONSE_TIME } from "@/content/promises";
import { useEffect, useRef, useState } from "react";
import { Helmet } from "react-helmet";
import { Link, useSearchParams } from "react-router-dom";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Building2, Calendar as CalendarIcon, Heart, Mail, Phone, Tag, User, Users } from "lucide-react";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { generateCustomerToken } from "@/types/programRequest";
import { trackProgramRequestSubmitted, trackSubmitFailed } from "@/lib/analytics";
import { buildAttribution, getEntryPage } from "@/lib/entryPageTracker";
import { MultiDatePicker } from "@/components/configurator/MultiDatePicker";
import { useTemplateWithItems } from "@/hooks/useProgramTemplates";
import {
  describeRequest,
  EVENT_TYPES,
  NEEDS,
  needsFromTemplate,
  parseEventTypeParam,
  parseNeedsParam,
  summaryForNotes,
  wishesFromTemplate,
  type NeedKey,
} from "@/lib/requestForm";
import {
  Container,
  FormField,
  FunnelHead,
  Notice,
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
  // Minimaal 10 tekens: dat eist de bevestigingsmail (send-program-request) ook.
  phone: z.string().trim().min(10, "Vul een geldig telefoonnummer in").max(20).regex(/^[0-9+\s().-]+$/, "Vul een geldig telefoonnummer in"),
  company: z.string().trim().max(100).optional(),
  wishes: z.string().trim().max(2000).optional(),
});

type ProgramType = "zakelijk" | "prive";

const NO_EVENT_TYPE = "__geen";

/**
 * Het ene aanvraagformulier (plan klantreis en ondertekening, fase 2). Opent
 * vanuit elke "Start uw aanvraag"-knop, met voorinvulling via de URL:
 * `?template=<slug>` (voorbeeldprogramma als startpunt), `?nodig=eten,overnachting`
 * (vinkjes, ook via de oude paden voor catering en logies) en `?soort=heisessie`.
 */
const ProgrammaOpMaat = () => {
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const templateSlug = searchParams.get("template");
  const { data: template } = useTemplateWithItems(templateSlug);

  const [eventType, setEventType] = useState<string | null>(() => parseEventTypeParam(searchParams.get("soort")));
  const [programType, setProgramType] = useState<ProgramType>(
    () => EVENT_TYPES.find((t) => t.value === parseEventTypeParam(searchParams.get("soort")))?.programType ?? "zakelijk",
  );
  const [needs, setNeeds] = useState<NeedKey[]>(() => parseNeedsParam(searchParams.get("nodig")));
  const [numberOfPeople, setNumberOfPeople] = useState<number>(20);
  const [selectedDates, setSelectedDates] = useState<Date[]>([]);
  const [dateUnknown, setDateUnknown] = useState<boolean>(false);
  const [periodText, setPeriodText] = useState<string>("");
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

  // Voorbeeldprogramma als startpunt: wensen en vinkjes voorinvullen zodra het
  // voorbeeld geladen is, maar nooit over tekst heen die de bezoeker al typte.
  const wishesTouched = useRef(false);
  const prefilledTemplateId = useRef<string | null>(null);
  useEffect(() => {
    if (!template || prefilledTemplateId.current === template.id) return;
    prefilledTemplateId.current = template.id;
    if (!wishesTouched.current) {
      setFormData((prev) => ({ ...prev, wishes: wishesFromTemplate(template) }));
    }
    const fromTemplate = needsFromTemplate(template);
    setNeeds((prev) => NEEDS.map((n) => n.key).filter((k) => prev.includes(k) || fromTemplate.includes(k)));
  }, [template]);

  const handleAddDate = (date: Date): boolean => {
    if (selectedDates.length >= 7) return false;
    const ds = date.toDateString();
    if (selectedDates.some((d) => d.toDateString() === ds)) return false;
    setSelectedDates((prev) => [...prev, date].sort((a, b) => a.getTime() - b.getTime()));
    setDateUnknown(false);
    return true;
  };

  const handleRemoveDate = (i: number) => {
    setSelectedDates((prev) => prev.filter((_, idx) => idx !== i));
  };

  const toggleNeed = (key: NeedKey, on: boolean) => {
    setNeeds((prev) => NEEDS.map((n) => n.key).filter((k) => (k === key ? on : prev.includes(k))));
  };

  const handleEventType = (value: string) => {
    const next = value === NO_EVENT_TYPE ? null : value;
    setEventType(next);
    const mapped = EVENT_TYPES.find((t) => t.value === next)?.programType;
    if (mapped) setProgramType(mapped);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    if (name === "wishes") wishesTouched.current = true;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (selectedDates.length === 0 && !dateUnknown) {
      toast({
        title: "Wanneer wilt u komen?",
        description: "Kies een datum, of vink aan dat u de datum nog niet weet.",
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
      const dates = dateUnknown ? [] : selectedDates;
      const isoDates = dates.map((d) => format(d, "yyyy-MM-dd"));
      const formattedDates = dates.map((d) => format(d, "EEEE d MMMM yyyy", { locale: nl }));
      const summaryInput = {
        programType,
        eventType,
        needs,
        periodText: dateUnknown ? periodText : null,
        templateName: template?.name ?? null,
      };
      const summary = summaryForNotes(summaryInput);
      const notes = [summary, formData.wishes?.trim()].filter(Boolean).join("\n\n") || null;
      const attribution = {
        ...(buildAttribution() ?? {}),
        template_id: template?.id ?? templateSlug ?? null,
        needs,
        event_type: eventType,
        date_unknown: dateUnknown,
        period_text: dateUnknown && periodText.trim() ? periodText.trim() : null,
      };

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
          general_notes: notes,
          origin: programType === "zakelijk" ? "maatwerk_zakelijk" : "maatwerk_prive",
          program_description: describeRequest(summaryInput),
          invoicing_mode: "bureau_central",
          attribution,
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
          event_type: eventType,
          needs,
          wants_accommodation: needs.includes("overnachting"),
          date_unknown: dateUnknown,
          template_id: template?.id ?? null,
          source: "programma-op-maat-page",
        },
      });

      await supabase.functions.invoke("send-program-request", {
        body: {
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          company: formData.company,
          notes: (notes ?? "").slice(0, 2000),
          numberOfPeople,
          selectedDate: formattedDates[0] ?? (periodText.trim() ? `Nog niet bekend (${periodText.trim()})` : "Nog niet bekend"),
          selectedDates: formattedDates,
          numberOfDays: dates.length,
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
        numberOfDays: dates.length,
        eventType: eventType ?? `maatwerk_${programType}`,
        entryPage: entryPage?.path || "direct",
        utmSource: entryPage?.utm_source,
        utmMedium: entryPage?.utm_medium,
        utmCampaign: entryPage?.utm_campaign,
        items: [],
      });

      setCustomerToken(token);
      setIsSuccess(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err: unknown) {
      console.error("Error submitting maatwerk:", err);
      trackSubmitFailed({ formType: "maatwerk_intake", error: err, extra: { source: "programma_op_maat" } });
      toast({
        title: "Aanvraag niet verzonden",
        description: (err instanceof Error && err.message) || "Er ging iets mis. Probeer het opnieuw of bel ons op 0562 700 208.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Start uw aanvraag – Bureau Vlieland</title>
        <meta
          name="description"
          content="Vertel ons wat u zoekt voor uw groep op Vlieland. Wij stellen het programma samen en sturen binnen 5 werkdagen een vrijblijvend voorstel."
        />
        <link rel="canonical" href="https://bureauvlieland.nl/programma-op-maat" />
      </Helmet>
      <Navigation />

      <main id="main-content">
        {!isSuccess && (
          <FunnelHead
            eyebrow="Uw aanvraag"
            title="Vertel ons wat u zoekt"
            intro={`Wij stellen het programma voor u samen en sturen ${RESPONSE_TIME.within} een vrijblijvend voorstel, met prijzen per onderdeel. Twee minuten werk.`}
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
                {template && (
                  <Notice tone="info" title={`Voorbeeld als startpunt: ${template.name}`}>
                    De onderdelen van dit voorbeeld staan alvast bij uw wensen; pas ze gerust aan. Liever zelf puzzelen?{" "}
                    <Link to={`/programma-samenstellen?template=${template.id}`} className="underline underline-offset-2">
                      Open dit voorbeeld in de programma-bouwer
                    </Link>
                    .
                  </Notice>
                )}

                {/* Groep */}
                <Card className="p-5 sm:p-6">
                  <SectionHeader as="h2" size="md" weight="medium" title="Wat voor groep?" intro="Kies wat het beste past." className="mb-4" />
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
                      description="Jubileum, familie- of vriendenweekend"
                      icon={<Heart />}
                    />
                  </OptionGroup>
                  <div className="mt-5">
                    <FormField label="Soort uitje" htmlFor="maat-soort" leading={<Tag />} help="Optioneel, helpt ons meteen de juiste onderdelen te kiezen.">
                      <Select value={eventType ?? NO_EVENT_TYPE} onValueChange={handleEventType}>
                        <SelectTrigger id="maat-soort" className="sm:w-72">
                          <SelectValue placeholder="Kies een soort" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={NO_EVENT_TYPE}>Nog geen idee</SelectItem>
                          {EVENT_TYPES.map((t) => (
                            <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormField>
                  </div>
                </Card>

                {/* Wat heeft u nodig */}
                <Card className="p-5 sm:p-6">
                  <SectionHeader
                    as="h2"
                    size="md"
                    weight="medium"
                    title="Wat heeft u nodig?"
                    intro="Vink aan wat wij voor u mogen regelen. Twijfelt u? Laat het open, dan denken wij mee."
                    className="mb-4"
                  />
                  <div className="grid gap-3 sm:grid-cols-2">
                    {NEEDS.map((need) => {
                      const checked = needs.includes(need.key);
                      return (
                        <label
                          key={need.key}
                          htmlFor={`maat-nodig-${need.key}`}
                          className={`flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition-colors ${checked ? "border-primary bg-accent-soft" : "border-border"}`}
                        >
                          <Checkbox
                            id={`maat-nodig-${need.key}`}
                            checked={checked}
                            onCheckedChange={(v) => toggleNeed(need.key, v === true)}
                            className="mt-0.5"
                          />
                          <span>
                            <span className="block text-sm font-medium text-foreground">{need.label}</span>
                            <span className="block text-xs text-muted-foreground">{need.hint}</span>
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </Card>

                {/* Groep en datums */}
                <Card className="p-5 sm:p-6">
                  <SectionHeader
                    as="h2"
                    size="md"
                    weight="medium"
                    title="Wanneer en met hoeveel personen?"
                    intro="Datums zijn vrijblijvend en aanpasbaar. Weet u het nog niet, dan is een periode genoeg."
                    className="mb-4"
                  />
                  <div className="space-y-5">
                    <FormField label="Aantal personen" htmlFor="maat-personen" required leading={<Users />}>
                      <Input
                        id="maat-personen"
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
                      </Label>
                      <p className="text-xs text-muted-foreground">Selecteer één of meer aaneensluitende dagen.</p>
                      {!dateUnknown && (
                        <MultiDatePicker selectedDates={selectedDates} onAddDate={handleAddDate} onRemoveDate={handleRemoveDate} />
                      )}
                    </div>
                    <label htmlFor="maat-datum-onbekend" className="flex cursor-pointer items-start gap-3 rounded-lg border border-border p-4">
                      <Checkbox
                        id="maat-datum-onbekend"
                        checked={dateUnknown}
                        onCheckedChange={(v) => {
                          const on = v === true;
                          setDateUnknown(on);
                          if (on) setSelectedDates([]);
                        }}
                        className="mt-0.5"
                      />
                      <span>
                        <span className="block text-sm font-medium text-foreground">Ik weet de datum nog niet</span>
                        <span className="block text-xs text-muted-foreground">Geef dan een periode op, bijvoorbeeld "voorjaar 2027" of "een vrijdag in september".</span>
                      </span>
                    </label>
                    {dateUnknown && (
                      <FormField label="Welke periode ongeveer?" htmlFor="maat-periode" leading={<CalendarIcon />}>
                        <Input
                          id="maat-periode"
                          value={periodText}
                          onChange={(e) => setPeriodText(e.target.value)}
                          placeholder="Bijvoorbeeld: voorjaar 2027, twee dagen"
                          maxLength={120}
                        />
                      </FormField>
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
                        <Input id="name" name="name" value={formData.name} onChange={handleChange} placeholder="Uw volledige naam" autoComplete="name" maxLength={100} />
                      </FormField>
                      <FormField label="Bedrijf of organisatie" htmlFor="company" leading={<Building2 />}>
                        <Input id="company" name="company" value={formData.company} onChange={handleChange} placeholder="Optioneel" autoComplete="organization" maxLength={100} />
                      </FormField>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <FormField label="E-mailadres" htmlFor="email" required leading={<Mail />} error={errors.email}>
                        <Input id="email" name="email" type="email" value={formData.email} onChange={handleChange} placeholder="uw@email.nl" autoComplete="email" maxLength={255} />
                      </FormField>
                      <FormField label="Telefoonnummer" htmlFor="phone" required leading={<Phone />} error={errors.phone}>
                        <Input id="phone" name="phone" type="tel" value={formData.phone} onChange={handleChange} placeholder="06 12345678" autoComplete="tel" maxLength={20} />
                      </FormField>
                    </div>
                    <FormField label="Uw wensen" htmlFor="wishes">
                      <Textarea
                        id="wishes"
                        name="wishes"
                        value={formData.wishes}
                        onChange={handleChange}
                        placeholder="Vertel ons wat u voor ogen heeft: soort activiteiten, sfeer, budget, bijzondere wensen, dieetwensen."
                        rows={template ? 8 : 5}
                        maxLength={2000}
                      />
                    </FormField>
                  </div>
                </Card>

                <WizardFooter nextType="submit" nextLabel="Aanvraag versturen" nextLoading={isSubmitting} note={<SubmitNote />} />

                <p className="text-center text-sm text-muted-foreground">
                  Liever zelf samenstellen en direct prijzen zien?{" "}
                  <Link to="/programma-samenstellen" className="text-primary underline underline-offset-2">
                    Open de programma-bouwer
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
