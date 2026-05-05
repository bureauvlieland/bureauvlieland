import { useState } from "react";
import { Helmet } from "react-helmet";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { useKenBurns } from "@/hooks/use-ken-burns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Loader2, CheckCircle, ArrowRight, Users, Calendar as CalIcon, Building2, Heart, Sparkles, MessageSquareHeart } from "lucide-react";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { generateCustomerToken } from "@/types/programRequest";
import { trackProgramRequestSubmitted } from "@/lib/analytics";
import { getEntryPage } from "@/lib/entryPageTracker";
import { MultiDatePicker } from "@/components/configurator/MultiDatePicker";
import heroImage from "@/assets/beach-signs.jpg";

const formSchema = z.object({
  name: z.string().trim().min(2, "Vul uw naam in (min. 2 tekens)").max(100),
  email: z.string().trim().email("Vul een geldig e-mailadres in").max(255),
  phone: z.string().trim().min(10, "Vul een geldig telefoonnummer in").max(20),
  company: z.string().trim().max(100).optional(),
  wishes: z.string().trim().max(2000).optional(),
});

type ProgramType = "zakelijk" | "prive";

const ProgrammaOpMaat = () => {
  const kenBurns = useKenBurns();
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
          program_type: programType === "zakelijk" ? "maatwerk_zakelijk" : "maatwerk_prive",
          program_description: `Maatwerk ${programType}${wantsAccommodation ? " — logies gewenst" : ""}`,
          invoicing_mode: "bureau_central",
        })
        .select()
        .single();

      if (insertError) throw insertError;

      await supabase.from("program_request_history").insert({
        request_id: requestData.id,
        action: "created",
        actor: "customer",
        actor_name: formData.name,
        new_value: {
          type: "maatwerk",
          program_type: programType,
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
        {/* Hero */}
        <section className="relative h-[40vh] min-h-[320px] flex items-center justify-center overflow-hidden">
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${heroImage})`, ...kenBurns }}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-primary/80 via-primary/60 to-transparent" />
          </div>
          <div className="relative z-10 text-center text-primary-foreground px-4 max-w-4xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-sm text-sm mb-3">
              <MessageSquareHeart className="h-4 w-4" />
              Wij stellen het voor u samen
            </div>
            <h1 className="text-4xl md:text-5xl font-display font-bold mb-3">
              Programma op maat
            </h1>
            <p className="text-lg text-primary-foreground/90 max-w-2xl mx-auto">
              Liever niet zelf puzzelen? Laat uw wensen achter — wij sturen binnen één werkdag een persoonlijk voorstel.
            </p>
          </div>
        </section>

        <section className="py-10 md:py-14">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-3xl">
            {isSuccess ? (
              <div className="text-center py-12 animate-in fade-in slide-in-from-bottom-4 duration-300">
                <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
                <h2 className="text-2xl font-display font-bold mb-2">Aanvraag verzonden</h2>
                <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                  Bedankt! Wij nemen zo snel mogelijk contact met u op om uw programma te bespreken. Een bevestiging staat ook in uw inbox.
                </p>
                {customerToken && (
                  <Link to={`/mijn-programma/${customerToken}`}>
                    <Button size="lg">
                      Volg uw aanvraag
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                )}
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-8">
                {/* Type */}
                <Card>
                  <CardContent className="p-6 space-y-4">
                    <div>
                      <h2 className="font-display text-lg font-semibold">Type aanvraag</h2>
                      <p className="text-sm text-muted-foreground">Kies wat het beste past.</p>
                    </div>
                    <RadioGroup
                      value={programType}
                      onValueChange={(v) => setProgramType(v as ProgramType)}
                      className="grid sm:grid-cols-2 gap-3"
                    >
                      <Label
                        htmlFor="t-zakelijk"
                        className={`flex items-start gap-3 rounded-lg border p-4 cursor-pointer transition-colors ${
                          programType === "zakelijk" ? "border-primary bg-primary/5" : "border-border hover:bg-muted/40"
                        }`}
                      >
                        <RadioGroupItem id="t-zakelijk" value="zakelijk" className="mt-1" />
                        <div>
                          <div className="flex items-center gap-2 font-semibold">
                            <Building2 className="h-4 w-4" /> Zakelijk
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            Bedrijfsuitje, teambuilding, heisessie, incentive
                          </p>
                        </div>
                      </Label>
                      <Label
                        htmlFor="t-prive"
                        className={`flex items-start gap-3 rounded-lg border p-4 cursor-pointer transition-colors ${
                          programType === "prive" ? "border-primary bg-primary/5" : "border-border hover:bg-muted/40"
                        }`}
                      >
                        <RadioGroupItem id="t-prive" value="prive" className="mt-1" />
                        <div>
                          <div className="flex items-center gap-2 font-semibold">
                            <Heart className="h-4 w-4" /> Privé
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            Trouwen, jubileum, familie- of vriendenweekend
                          </p>
                        </div>
                      </Label>
                    </RadioGroup>
                  </CardContent>
                </Card>

                {/* Group + dates */}
                <Card>
                  <CardContent className="p-6 space-y-5">
                    <div>
                      <h2 className="font-display text-lg font-semibold">Wanneer en met hoeveel</h2>
                      <p className="text-sm text-muted-foreground">Datums zijn nog vrijblijvend en aanpasbaar.</p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="people" className="flex items-center gap-2">
                        <Users className="h-4 w-4" /> Aantal personen
                      </Label>
                      <Input
                        id="people"
                        type="number"
                        min={1}
                        max={500}
                        value={numberOfPeople}
                        onChange={(e) => setNumberOfPeople(Math.max(1, parseInt(e.target.value) || 1))}
                        className="w-32"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <CalIcon className="h-4 w-4" /> Datum(s)
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        Selecteer één of meerdere aaneensluitende dagen.
                      </p>
                      <MultiDatePicker
                        selectedDates={selectedDates}
                        onAddDate={handleAddDate}
                        onRemoveDate={handleRemoveDate}
                      />
                    </div>
                    {isMultiDay && (
                      <div className="flex items-start gap-3 p-4 bg-muted/40 rounded-lg">
                        <input
                          id="lodging"
                          type="checkbox"
                          checked={wantsAccommodation}
                          onChange={(e) => setWantsAccommodation(e.target.checked)}
                          className="mt-1 h-4 w-4"
                        />
                        <Label htmlFor="lodging" className="cursor-pointer">
                          <span className="font-medium block">Logies meenemen</span>
                          <span className="text-xs text-muted-foreground">Wij zoeken passende accommodatie voor uw groep.</span>
                        </Label>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Contact */}
                <Card>
                  <CardContent className="p-6 space-y-5">
                    <div>
                      <h2 className="font-display text-lg font-semibold">Uw gegevens</h2>
                      <p className="text-sm text-muted-foreground">Zodat wij contact met u kunnen opnemen.</p>
                    </div>
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
                        rows={5}
                      />
                    </div>
                  </CardContent>
                </Card>

                <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between pt-2">
                  <p className="text-xs text-muted-foreground">
                    Liever zelf samenstellen?{" "}
                    <Link to="/programma-samenstellen" className="text-primary underline inline-flex items-center gap-1">
                      <Sparkles className="h-3.5 w-3.5" /> Stel zelf uw programma samen
                    </Link>
                  </p>
                  <Button type="submit" size="lg" disabled={isSubmitting} className="gap-2">
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Verzenden...
                      </>
                    ) : (
                      <>
                        Vrijblijvend aanvragen
                        <ArrowRight className="h-4 w-4" />
                      </>
                    )}
                  </Button>
                </div>
              </form>
            )}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default ProgrammaOpMaat;
