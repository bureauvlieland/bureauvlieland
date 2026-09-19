import { RESPONSE_TIME } from "@/content/promises";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format, differenceInCalendarDays } from "date-fns";
import { nl } from "date-fns/locale";
import {
  Building2,
  CalendarIcon,
  Clock,
  Flame,
  GlassWater,
  Mail,
  MapPin,
  Phone,
  Sandwich,
  Sparkles,
  User,
  Users,
  UtensilsCrossed,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { buildAttribution } from "@/lib/entryPageTracker";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import {
  FormField,
  Notice,
  OptionCard,
  OptionGroup,
  SectionHeader,
  SubmitNote,
  SuccessScreen,
  WizardFooter,
} from "@/components/system";

interface CateringQuickRequestProps {
  initialType?: string | null;
}

const TYPES = [
  { key: "lunch", label: "Lunch", icon: Sandwich, desc: "Broodjes, soep of salade" },
  { key: "borrel", label: "Borrel en receptie", icon: GlassWater, desc: "Hapjes met drankpakket" },
  { key: "bbq", label: "BBQ op locatie", icon: Flame, desc: "Compleet verzorgd, op uw verblijf of buitenlocatie" },
  { key: "diner", label: "Diner", icon: UtensilsCrossed, desc: "3-gangen, buffet of walking dinner" },
  { key: "maatwerk", label: "Iets anders", icon: Sparkles, desc: "Vertel ons wat u in gedachten heeft" },
];

const LEAD_TIME_DAYS = 7;

export const CateringQuickRequest = ({ initialType = null }: CateringQuickRequestProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState<{ reference: string | null } | null>(null);

  const [type, setType] = useState<string>(initialType || "");
  const [date, setDate] = useState<Date | null>(null);
  const [startTime, setStartTime] = useState("");
  const [guests, setGuests] = useState<number>(20);
  const [locationText, setLocationText] = useState("");

  const [company, setCompany] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [dietary, setDietary] = useState("");

  const leadTimeWarning = date && differenceInCalendarDays(date, new Date()) < LEAD_TIME_DAYS;

  const canSubmit =
    !!type &&
    !!date &&
    guests > 0 &&
    locationText.trim().length > 0 &&
    name.trim().length > 0 &&
    email.trim().length > 0 &&
    phone.trim().length > 0;

  const handleSubmit = async () => {
    if (!date || !type) return;
    setIsSubmitting(true);
    try {
      const requestId = crypto.randomUUID();
      const token = crypto.randomUUID();
      const isoDate = date.toISOString().split("T")[0];

      const { error: insErr } = await supabase.from("program_requests").insert({
        id: requestId,
        customer_token: token,
        customer_name: name,
        customer_email: email,
        customer_phone: phone,
        customer_company: company || null,
        number_of_people: guests,
        selected_dates: [isoDate],
        general_notes: notes || null,
        dietary_notes: dietary || null,
        origin: "catering_only",
        program_description: `Catering: ${type}`,
        quote_status: "concept",
        catering_location_text: locationText,
        catering_start_time: startTime || null,
        attribution: buildAttribution(),
      } as any);
      if (insErr) throw insErr;

      await supabase.rpc("append_customer_program_history", {
        p_request_id: requestId,
        p_customer_token: token,
        p_action: "created",
        p_actor_name: name,
        p_new_value: { kind: "catering_only", quick_request: true },
      });

      const { data: refRow } = await supabase
        .from("program_requests")
        .select("reference_number")
        .eq("id", requestId)
        .maybeSingle();

      try {
        const { error: mailErr } = await supabase.functions.invoke("send-catering-request", {
          body: {
            requestId,
            referenceNumber: refRow?.reference_number || null,
            customerToken: token,
            cateringType: type,
            date: isoDate,
            startTime: startTime || null,
            locationText,
            hasHorecaOnSite: null,
            guests,
            contact: {
              name,
              company: company || "",
              email,
              phone,
              notes: notes || "",
              dietary: dietary || "",
            },
            items: [],
            indicativeTotal: null,
            // URL-origin voor test-modus-detectie in de edge function.
            // Het type "catering_only" zit al in program_requests.origin (regel hierboven).
            origin: window.location.origin,
          },
        });
        if (mailErr) console.error("send-catering-request invoke error", mailErr);
      } catch (mailEx) {
        console.error("send-catering-request exception", mailEx);
      }

      setSubmitted({ reference: refRow?.reference_number || null });
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e: any) {
      console.error("Catering submit error", e);
      toast({
        title: "Aanvraag niet verzonden",
        description: "Er ging iets mis. Probeer het opnieuw of bel ons op 0562 700 208.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <SuccessScreen
        title="Uw cateringaanvraag is verstuurd"
        intro={`U ontvangt direct een bevestiging per e-mail. ${RESPONSE_TIME.sentence}`}
        reference={submitted.reference}
        primary={{ label: "Terug naar de homepage", to: "/" }}
        secondary={{ label: "Stel ook een programma samen", to: "/programma-samenstellen" }}
      />
    );
  }

  return (
    <div className="space-y-8">
      <OptionGroup label="Wat heeft u in gedachten?" columns={2}>
        {TYPES.map((t) => {
          const Icon = t.icon;
          return (
            <OptionCard
              key={t.key}
              selected={type === t.key}
              onSelect={() => setType(t.key)}
              title={t.label}
              description={t.desc}
              icon={<Icon />}
            />
          );
        })}
      </OptionGroup>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="catering-datum" className="flex items-center gap-1">
            Datum
            <span className="text-destructive" aria-hidden="true">
              *
            </span>
          </Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                id="catering-datum"
                type="button"
                variant="outline"
                className={cn("w-full justify-start font-normal", !date && "text-muted-foreground")}
              >
                <CalendarIcon aria-hidden="true" />
                {date ? format(date, "EEEE d MMMM yyyy", { locale: nl }) : "Kies een datum"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={date || undefined}
                onSelect={(d) => setDate(d || null)}
                disabled={(d) => d < new Date(new Date().setHours(0, 0, 0, 0))}
                locale={nl}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>
        <FormField label="Starttijd" htmlFor="catering-starttijd" leading={<Clock />}>
          <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
        </FormField>
        <FormField label="Aantal personen" htmlFor="catering-personen" required leading={<Users />}>
          <Input type="number" min={1} value={guests} onChange={(e) => setGuests(Math.max(1, Number(e.target.value) || 0))} />
        </FormField>
        <FormField label="Locatie op Vlieland" htmlFor="catering-locatie" required leading={<MapPin />}>
          <Input
            placeholder="Bijvoorbeeld Brouwerij Fortuna, eigen vakantiehuis, strand"
            value={locationText}
            onChange={(e) => setLocationText(e.target.value)}
          />
        </FormField>
      </div>

      {leadTimeWarning && (
        <Notice tone="warning" title="Korte aanlooptijd">
          Wij vragen normaal minimaal {LEAD_TIME_DAYS} dagen vooraf aan te vragen. Bel ons even op{" "}
          <a href="tel:+31562700208" className="underline underline-offset-2">
            0562 700 208
          </a>{" "}
          om de haalbaarheid te bespreken.
        </Notice>
      )}

      <div className="space-y-4">
        <SectionHeader as="h2" size="md" weight="medium" title="Uw gegevens" />
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Naam" htmlFor="catering-naam" required leading={<User />}>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Uw volledige naam" autoComplete="name" />
          </FormField>
          <FormField label="Bedrijf of organisatie" htmlFor="catering-bedrijf" leading={<Building2 />}>
            <Input value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Optioneel" autoComplete="organization" />
          </FormField>
          <FormField label="E-mailadres" htmlFor="catering-email" required leading={<Mail />}>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="uw@email.nl" autoComplete="email" />
          </FormField>
          <FormField label="Telefoonnummer" htmlFor="catering-telefoon" required leading={<Phone />}>
            <Input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="06 12345678" autoComplete="tel" />
          </FormField>
        </div>
        <FormField label="Wensen, sfeer of details" htmlFor="catering-wensen">
          <Textarea
            rows={4}
            placeholder="Vertel ons over uw groep, de gelegenheid en uw wensen. Wij denken graag mee."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </FormField>
        <FormField label="Allergieën of dieetwensen" htmlFor="catering-dieet" help="Bijvoorbeeld 2x vegetarisch, 1x glutenvrij.">
          <Input value={dietary} onChange={(e) => setDietary(e.target.value)} />
        </FormField>
      </div>

      <WizardFooter
        onNext={handleSubmit}
        nextLabel="Aanvraag versturen"
        nextDisabled={!canSubmit}
        nextLoading={isSubmitting}
        note={<SubmitNote />}
      />
    </div>
  );
};
