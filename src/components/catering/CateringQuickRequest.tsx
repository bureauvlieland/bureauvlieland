import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { format, differenceInCalendarDays } from "date-fns";
import { nl } from "date-fns/locale";
import {
  CalendarIcon,
  Sandwich,
  GlassWater,
  Flame,
  UtensilsCrossed,
  Sparkles,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { buildAttribution } from "@/lib/entryPageTracker";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

interface CateringQuickRequestProps {
  initialType?: string | null;
}

const TYPES = [
  { key: "lunch", label: "Lunch", icon: Sandwich, desc: "Broodjes, soep of salade" },
  { key: "borrel", label: "Borrel & receptie", icon: GlassWater, desc: "Hapjes met drankpakket" },
  { key: "bbq", label: "Beach Grill / BBQ", icon: Flame, desc: "Op het strand of op locatie" },
  { key: "diner", label: "Diner", icon: UtensilsCrossed, desc: "3-gangen, buffet of walking dinner" },
  { key: "maatwerk", label: "Iets anders", icon: Sparkles, desc: "Vertel ons wat u in gedachten heeft" },
];

const LEAD_TIME_DAYS = 7;

export const CateringQuickRequest = ({ initialType = null }: CateringQuickRequestProps) => {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);

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
  const [acceptTerms, setAcceptTerms] = useState(false);

  const leadTimeWarning = date && differenceInCalendarDays(date, new Date()) < LEAD_TIME_DAYS;

  const canSubmit =
    type &&
    date &&
    guests > 0 &&
    locationText.trim().length > 0 &&
    name.trim().length > 0 &&
    email.trim().length > 0 &&
    phone.trim().length > 0 &&
    acceptTerms &&
    !isSubmitting;

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

      await supabase.from("program_request_history").insert({
        request_id: requestId,
        action: "created",
        actor: "customer",
        actor_name: name,
        new_value: { kind: "catering_only", quick_request: true },
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
            origin: "catering_only",
          },
        });
        if (mailErr) console.error("send-catering-request invoke error", mailErr);
      } catch (mailEx) {
        console.error("send-catering-request exception", mailEx);
      }

      toast({
        title: "Aanvraag verzonden",
        description: "U ontvangt direct een bevestiging per e-mail. Wij nemen binnen 2 werkdagen contact met u op.",
      });
      navigate(`/?catering_submitted=1`);
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

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      {/* Type of catering */}
      <div>
        <Label className="text-base font-semibold mb-3 block">Wat heeft u in gedachten?</Label>
        <RadioGroup value={type} onValueChange={setType} className="grid sm:grid-cols-2 gap-3">
          {TYPES.map((t) => {
            const Icon = t.icon;
            const active = type === t.key;
            return (
              <Label
                key={t.key}
                htmlFor={`type-${t.key}`}
                className={cn(
                  "flex items-start gap-3 rounded-lg border-2 p-4 cursor-pointer transition-all",
                  active ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"
                )}
              >
                <RadioGroupItem value={t.key} id={`type-${t.key}`} className="mt-1" />
                <div className="flex-1">
                  <div className="flex items-center gap-2 font-medium text-foreground">
                    <Icon className="h-4 w-4 text-primary" /> {t.label}
                  </div>
                  <p className="text-sm text-muted-foreground mt-0.5">{t.desc}</p>
                </div>
              </Label>
            );
          })}
        </RadioGroup>
      </div>

      {/* Date + group size + start time */}
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <Label className="mb-2 block">Datum</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn("w-full justify-start text-left font-normal", !date && "text-muted-foreground")}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {date ? format(date, "EEEE d MMMM yyyy", { locale: nl }) : "Kies een datum"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={date || undefined}
                onSelect={(d) => setDate(d || null)}
                disabled={(d) => d < new Date(new Date().setHours(0, 0, 0, 0))}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>
        <div>
          <Label htmlFor="startTime" className="mb-2 block">Starttijd (optioneel)</Label>
          <Input
            id="startTime"
            type="time"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="guests" className="mb-2 block">Aantal personen</Label>
          <Input
            id="guests"
            type="number"
            min={1}
            value={guests}
            onChange={(e) => setGuests(Math.max(1, Number(e.target.value) || 0))}
          />
        </div>
        <div>
          <Label htmlFor="location" className="mb-2 block">Locatie op Vlieland</Label>
          <Input
            id="location"
            placeholder="Bijv. Brouwerij Fortuna, eigen vakantiehuis, strand…"
            value={locationText}
            onChange={(e) => setLocationText(e.target.value)}
          />
        </div>
      </div>

      {leadTimeWarning && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Korte aanlooptijd</AlertTitle>
          <AlertDescription>
            Wij vragen normaal minimaal {LEAD_TIME_DAYS} dagen vooraf aan te vragen. Bel ons even op
            0562 700 208 om de haalbaarheid te bespreken.
          </AlertDescription>
        </Alert>
      )}

      {/* Contact */}
      <div className="space-y-4">
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="name" className="mb-2 block">Naam</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="company" className="mb-2 block">Bedrijf (optioneel)</Label>
            <Input id="company" value={company} onChange={(e) => setCompany(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="email" className="mb-2 block">E-mail</Label>
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="phone" className="mb-2 block">Telefoon</Label>
            <Input id="phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
        </div>
        <div>
          <Label htmlFor="notes" className="mb-2 block">Wensen, sfeer of details (optioneel)</Label>
          <Textarea
            id="notes"
            rows={4}
            placeholder="Vertel ons over uw groep, de gelegenheid en wensen. Wij denken graag mee."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="dietary" className="mb-2 block">Allergieën / dieetwensen (optioneel)</Label>
          <Input
            id="dietary"
            placeholder="Bijv. 2x vegetarisch, 1x glutenvrij"
            value={dietary}
            onChange={(e) => setDietary(e.target.value)}
          />
        </div>
        <Label className="flex items-start gap-3 cursor-pointer">
          <Checkbox
            checked={acceptTerms}
            onCheckedChange={(v) => setAcceptTerms(v === true)}
            className="mt-0.5"
          />
          <span className="text-sm text-muted-foreground">
            Ik begrijp dat dit een vrijblijvende aanvraag is. Bureau Vlieland neemt binnen 2 werkdagen
            contact met mij op met een voorstel op maat.
          </span>
        </Label>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between pt-2 border-t">
        <p className="text-sm text-muted-foreground">
          Geen verplichting. Wij komen met een voorstel op maat.
        </p>
        <Button size="lg" onClick={handleSubmit} disabled={!canSubmit}>
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Versturen…
            </>
          ) : (
            "Verstuur aanvraag"
          )}
        </Button>
      </div>
    </div>
  );
};
