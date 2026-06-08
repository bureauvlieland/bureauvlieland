import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { format, differenceInCalendarDays } from "date-fns";
import { nl } from "date-fns/locale";
import { CalendarIcon, Check, ChevronLeft, ChevronRight, Sandwich, GlassWater, Flame, UtensilsCrossed, Sparkles, AlertTriangle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { useCateringBlocks } from "@/hooks/useCateringBlocks";
import { CateringSummary, calculateTotal, type CateringSelection } from "./CateringSummary";
import type { BuildingBlock } from "@/types/buildingBlock";

interface CateringWizardProps {
  initialType?: string | null;
}

const TYPES = [
  { key: "lunch", label: "Lunch", icon: Sandwich, desc: "Broodjes, soep, salade — vanaf 8 personen" },
  { key: "borrel", label: "Borrel & receptie", icon: GlassWater, desc: "Hapjes met drankpakket" },
  { key: "bbq", label: "BBQ", icon: Flame, desc: "Op het strand of op locatie" },
  { key: "diner", label: "Diner", icon: UtensilsCrossed, desc: "3-gangen, buffet of walking dinner" },
];

const LEAD_TIME_DAYS = 7;

export const CateringWizard = ({ initialType = null }: CateringWizardProps) => {
  const navigate = useNavigate();
  const { data: blocks = [], isLoading } = useCateringBlocks();
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [sel, setSel] = useState<CateringSelection>({
    type: initialType,
    date: null,
    startTime: "",
    locationText: "",
    hasHorecaOnSite: null,
    guests: 20,
    mainBlockId: null,
    addonBlockIds: [],
  });

  const [contact, setContact] = useState({
    company: "",
    name: "",
    email: "",
    phone: "",
    notes: "",
    dietary: "",
    acceptTerms: false,
  });

  // Filter main arrangements by chosen type + group size
  const mainBlocks = useMemo(() => {
    if (!sel.type || sel.type === "maatwerk") return [];
    return blocks.filter((b: any) => {
      if (b.catering_role !== "hoofd") return false;
      if (b.catering_type !== sel.type) return false;
      if (b.min_people && sel.guests < b.min_people) return false;
      if (b.max_people && sel.guests > b.max_people) return false;
      return true;
    });
  }, [blocks, sel.type, sel.guests]);

  // Compute required + suggested addons
  const mainBlock = useMemo(
    () => blocks.find((b) => b.id === sel.mainBlockId) || null,
    [blocks, sel.mainBlockId]
  );

  const requiredAddons = useMemo(() => {
    if (!mainBlock?.required_with) return [] as BuildingBlock[];
    return (mainBlock.required_with as string[])
      .map((id) => blocks.find((b) => b.id === id))
      .filter(Boolean) as BuildingBlock[];
  }, [mainBlock, blocks]);

  const suggestedAddons = useMemo(() => {
    const ids = new Set<string>();
    (mainBlock?.suggested_addons as string[] | undefined)?.forEach((id) => ids.add(id));
    (mainBlock?.scaling_rules as any[] | undefined)?.forEach((r) => {
      if (r?.min_guests && sel.guests >= r.min_guests && r?.suggest) ids.add(r.suggest);
    });
    // Diner zonder horeca op locatie → suggesteer servies/meubilair/bediening + drank-tiers
    if (sel.type === "diner" && sel.hasHorecaOnSite === false) {
      ["servies-bestek-glaswerk-set", "bediening-diner", "meubilair-tent", "bezorging-catering",
        "drank-arrangement-basis", "drank-arrangement-uitgebreid", "drank-arrangement-premium"
      ].forEach((id) => ids.add(id));
    }
    // Borrel: drank-arrangementen altijd suggesteren (3 tiers)
    if (sel.type === "borrel") {
      ["drank-arrangement-basis", "drank-arrangement-uitgebreid", "drank-arrangement-premium"]
        .forEach((id) => ids.add(id));
    }
    return Array.from(ids)
      .map((id) => blocks.find((b) => b.id === id))
      .filter((b): b is BuildingBlock => !!b && b.id !== mainBlock?.id);
  }, [mainBlock, blocks, sel.guests, sel.type, sel.hasHorecaOnSite]);

  // Free catalog: all non-main catering items
  const freeCatalog = useMemo(() => {
    const taken = new Set([sel.mainBlockId, ...requiredAddons.map((b) => b.id), ...suggestedAddons.map((b) => b.id)]);
    return blocks.filter((b: any) => b.catering_role && b.catering_role !== "hoofd" && !taken.has(b.id));
  }, [blocks, sel.mainBlockId, requiredAddons, suggestedAddons]);

  // Auto-add required addons whenever main changes
  const ensureRequired = (mainId: string | null) => {
    const m = blocks.find((b) => b.id === mainId);
    const req = ((m?.required_with as string[] | undefined) || []).filter((id) => blocks.find((b) => b.id === id));
    setSel((s) => ({
      ...s,
      mainBlockId: mainId,
      addonBlockIds: Array.from(new Set([...s.addonBlockIds.filter((id) => !req.includes(id)), ...req])),
    }));
  };

  const toggleAddon = (id: string) => {
    setSel((s) => ({
      ...s,
      addonBlockIds: s.addonBlockIds.includes(id) ? s.addonBlockIds.filter((x) => x !== id) : [...s.addonBlockIds, id],
    }));
  };

  const leadTimeWarning = sel.date && differenceInCalendarDays(sel.date, new Date()) < LEAD_TIME_DAYS;

  const canNext = () => {
    if (step === 1) return sel.type && sel.date && sel.locationText.trim().length > 0 && sel.guests > 0;
    if (step === 2) return sel.type === "maatwerk" || !!sel.mainBlockId;
    if (step === 3) return true;
    if (step === 4) return true;
    if (step === 5) return contact.name && contact.email && contact.phone && contact.acceptTerms;
    return false;
  };

  const handleSubmit = async () => {
    if (!sel.date) return;
    setIsSubmitting(true);
    try {
      const requestId = crypto.randomUUID();
      const token = crypto.randomUUID();
      const isoDate = sel.date.toISOString().split("T")[0];

      const { error: insErr } = await supabase.from("program_requests").insert({
        id: requestId,
        customer_token: token,
        customer_name: contact.name,
        customer_email: contact.email,
        customer_phone: contact.phone,
        customer_company: contact.company || null,
        number_of_people: sel.guests,
        selected_dates: [isoDate],
        general_notes: contact.notes || null,
        dietary_notes: contact.dietary || null,
        origin: "catering_only",
        program_description: `Catering: ${sel.type}`,
        quote_status: "concept",
        catering_location_text: sel.locationText,
        catering_start_time: sel.startTime || null,
        has_horeca_on_site: sel.hasHorecaOnSite,
      } as any);
      if (insErr) throw insErr;

      const ids = [sel.mainBlockId, ...sel.addonBlockIds].filter(Boolean) as string[];
      const items = ids.map((id) => {
        const b = blocks.find((x) => x.id === id);
        if (!b) return null;
        return {
          request_id: requestId,
          block_id: b.id,
          block_name: b.name,
          block_category: b.category,
          provider_name: b.provider?.name || (b.block_type === "bureau" ? "Bureau Vlieland" : "Onbekend"),
          provider_id: b.provider_id || "bureau",
          provider_email: b.provider?.email || null,
          block_type: b.block_type,
          day_index: 0,
          preferred_time: sel.startTime || null,
          status: "pending",
          skip_partner_notification: true,
          price_type: b.price_type || "per_person",
          admin_price_override: b.price_adult ?? null,
          admin_price_notes: b.short_description || b.description || null,
        };
      }).filter(Boolean) as any[];

      if (items.length > 0) {
        const { error: itemsErr } = await supabase.from("program_request_items").insert(items);
        if (itemsErr) throw itemsErr;
      }

      await supabase.from("program_request_history").insert({
        request_id: requestId,
        action: "created",
        actor: "customer",
        actor_name: contact.name,
        new_value: { items_count: items.length, kind: "catering_only" },
      });

      // Fetch reference number assigned by DB trigger
      const { data: refRow } = await supabase
        .from("program_requests")
        .select("reference_number")
        .eq("id", requestId)
        .maybeSingle();

      const { total, hasIndicative } = calculateTotal(sel, blocks);

      const itemsPayload = ids.map((id) => {
        const b = blocks.find((x) => x.id === id);
        if (!b) return null;
        const isMain = id === sel.mainBlockId;
        const priceLabel = b.price_adult != null
          ? `${new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" }).format(b.price_adult)}${b.price_type === "per_person" || b.price_type === "per_person_per_day" ? " p.p." : b.price_type === "total" ? " totaal" : ""}`
          : (b.price_display_override || "Op aanvraag");
        return {
          name: b.name,
          role: isMain ? "hoofd" : ((b as any).catering_role || null),
          provider: b.provider?.name || "Bureau Vlieland",
          priceIndication: priceLabel,
        };
      }).filter(Boolean);

      // Fire-and-await emails; surface error but don't roll back the saved request
      try {
        const { error: mailErr } = await supabase.functions.invoke("send-catering-request", {
          body: {
            requestId,
            referenceNumber: refRow?.reference_number || null,
            customerToken: token,
            cateringType: sel.type || "maatwerk",
            date: isoDate,
            startTime: sel.startTime || null,
            locationText: sel.locationText,
            hasHorecaOnSite: sel.hasHorecaOnSite,
            guests: sel.guests,
            contact: {
              name: contact.name,
              company: contact.company || "",
              email: contact.email,
              phone: contact.phone,
              notes: contact.notes || "",
              dietary: contact.dietary || "",
            },
            items: itemsPayload,
            indicativeTotal: hasIndicative ? null : total,
            origin: "catering_only",
          },
        });
        if (mailErr) console.error("send-catering-request invoke error", mailErr);
      } catch (mailEx) {
        console.error("send-catering-request exception", mailEx);
      }

      toast({ title: "Aanvraag verzonden!", description: "U ontvangt direct een bevestiging per e-mail. We nemen binnen 2 werkdagen contact met u op." });
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

  if (isLoading) {
    return <div className="flex items-center justify-center py-24"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  }

  return (
    <div className="grid lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2 space-y-6">
        {/* Step header */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          {[1, 2, 3, 4, 5].map((n) => (
            <div key={n} className={cn("flex items-center gap-2")}>
              <div className={cn(
                "h-7 w-7 rounded-full grid place-items-center text-xs font-medium border",
                step === n ? "bg-primary text-primary-foreground border-primary" :
                step > n ? "bg-primary/10 border-primary/30" : "bg-muted border-border"
              )}>
                {step > n ? <Check className="h-3 w-3" /> : n}
              </div>
              {n < 5 && <div className="w-6 h-px bg-border" />}
            </div>
          ))}
          <span className="ml-3 text-foreground font-medium">
            {step === 1 && "Wat & wanneer"}
            {step === 2 && "Arrangement"}
            {step === 3 && "Extra's"}
            {step === 4 && "Wensen & dieet"}
            {step === 5 && "Contact & verzenden"}
          </span>
        </div>

        {/* STEP 1 */}
        {step === 1 && (
          <Card>
            <CardContent className="pt-6 space-y-6">
              <div>
                <Label className="text-base font-medium mb-3 block">Type catering</Label>
                <div className="grid sm:grid-cols-2 gap-3">
                  {TYPES.map((t) => {
                    const Icon = t.icon;
                    const active = sel.type === t.key;
                    return (
                      <button
                        key={t.key}
                        type="button"
                        onClick={() => setSel({ ...sel, type: t.key, mainBlockId: null, addonBlockIds: [] })}
                        className={cn(
                          "text-left p-4 rounded-lg border-2 transition-all hover:border-primary/50",
                          active ? "border-primary bg-primary/5" : "border-border"
                        )}
                      >
                        <Icon className="h-6 w-6 mb-2 text-primary" />
                        <div className="font-semibold">{t.label}</div>
                        <div className="text-xs text-muted-foreground mt-1">{t.desc}</div>
                      </button>
                    );
                  })}
                  <button
                    type="button"
                    onClick={() => setSel({ ...sel, type: "maatwerk", mainBlockId: null, addonBlockIds: [] })}
                    className={cn(
                      "text-left p-4 rounded-lg border-2 border-dashed transition-all hover:border-primary/50 sm:col-span-2",
                      sel.type === "maatwerk" ? "border-primary bg-primary/5" : "border-border"
                    )}
                  >
                    <Sparkles className="h-5 w-5 mb-2 text-primary" />
                    <div className="font-semibold">Anders / op maat</div>
                    <div className="text-xs text-muted-foreground mt-1">Vertel ons in stap 4 wat u nodig heeft.</div>
                  </button>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <Label className="mb-2 block">Datum</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !sel.date && "text-muted-foreground")}>
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {sel.date ? format(sel.date, "PPP", { locale: nl }) : "Kies een datum"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar mode="single" selected={sel.date ?? undefined} onSelect={(d) => setSel({ ...sel, date: d ?? null })} initialFocus className={cn("p-3 pointer-events-auto")} disabled={(d) => d < new Date(new Date().setHours(0, 0, 0, 0))} />
                    </PopoverContent>
                  </Popover>
                </div>
                <div>
                  <Label htmlFor="starttime" className="mb-2 block">Starttijd (bij benadering)</Label>
                  <Input id="starttime" type="time" value={sel.startTime} onChange={(e) => setSel({ ...sel, startTime: e.target.value })} />
                </div>
              </div>

              {leadTimeWarning && (
                <Alert variant="default" className="border-orange-300 bg-orange-50 text-orange-900 [&>svg]:text-orange-600 dark:bg-orange-950/30 dark:text-orange-100 dark:border-orange-900">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Krappe termijn</AlertTitle>
                  <AlertDescription>
                    Uw datum is binnen {LEAD_TIME_DAYS} dagen. We doen ons uiterste best, maar kunnen niet garanderen dat alles beschikbaar is. U kunt de aanvraag gewoon versturen — wij nemen direct contact op.
                  </AlertDescription>
                </Alert>
              )}

              <div>
                <Label htmlFor="location" className="mb-2 block">Locatie</Label>
                <Input
                  id="location"
                  placeholder="bijv. eigen accommodatie, strandlocatie…"
                  value={sel.locationText}
                  onChange={(e) => setSel({ ...sel, locationText: e.target.value })}
                />
              </div>

              <div>
                <Label className="mb-2 block">Is er horeca op locatie? (keuken, servies, bediening)</Label>
                <RadioGroup
                  value={sel.hasHorecaOnSite === null ? "" : sel.hasHorecaOnSite ? "yes" : "no"}
                  onValueChange={(v) => setSel({ ...sel, hasHorecaOnSite: v === "yes" })}
                  className="flex gap-6"
                >
                  <div className="flex items-center gap-2"><RadioGroupItem value="yes" id="h-yes" /><Label htmlFor="h-yes" className="cursor-pointer">Ja</Label></div>
                  <div className="flex items-center gap-2"><RadioGroupItem value="no" id="h-no" /><Label htmlFor="h-no" className="cursor-pointer">Nee</Label></div>
                  <div className="flex items-center gap-2"><RadioGroupItem value="" id="h-unk" /><Label htmlFor="h-unk" className="cursor-pointer">Weet ik nog niet</Label></div>
                </RadioGroup>
              </div>

              <div>
                <Label htmlFor="guests" className="mb-2 block">Aantal gasten</Label>
                <Input id="guests" type="number" min={1} value={sel.guests} onChange={(e) => setSel({ ...sel, guests: parseInt(e.target.value || "0") || 0 })} className="max-w-[160px]" />
              </div>
            </CardContent>
          </Card>
        )}

        {/* STEP 2 */}
        {step === 2 && (
          <Card>
            <CardContent className="pt-6 space-y-4">
              {sel.type === "maatwerk" ? (
                <div className="text-muted-foreground">
                  Maatwerk-aanvraag: geen arrangementkeuze nodig. Beschrijf uw wensen in stap 4.
                </div>
              ) : mainBlocks.length === 0 ? (
                <div className="text-muted-foreground">
                  Geen passend arrangement gevonden voor {sel.guests} gasten. Pas het aantal aan of kies 'Anders / op maat'.
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">Vanaf-prijzen zijn incl. BTW. Definitieve prijs altijd in offerte.</p>
                  <RadioGroup value={sel.mainBlockId || ""} onValueChange={(id) => ensureRequired(id)}>
                    {mainBlocks.map((b) => (
                      <label
                        key={b.id}
                        htmlFor={`m-${b.id}`}
                        className={cn(
                          "flex gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all",
                          sel.mainBlockId === b.id ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"
                        )}
                      >
                        <RadioGroupItem id={`m-${b.id}`} value={b.id} className="mt-1" />
                        <div className="flex-1">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <div className="font-semibold">{b.name}</div>
                              {b.short_description && <div className="text-sm text-muted-foreground mt-0.5">{b.short_description}</div>}
                              <div className="flex flex-wrap gap-2 mt-2 text-xs text-muted-foreground">
                                {b.provider?.name && <span>{b.provider.name}</span>}
                                {b.min_people && <span>· vanaf {b.min_people} pax</span>}
                                {b.duration && <span>· {b.duration}</span>}
                              </div>
                            </div>
                            <div className="text-right whitespace-nowrap">
                              <div className="font-semibold">
                                {b.price_adult != null
                                  ? `${b.is_from_price ? "vanaf " : ""}€ ${b.price_adult.toFixed(2).replace(".", ",")}`
                                  : b.price_display_override || "Op aanvraag"}
                              </div>
                              {b.price_adult != null && (
                                <div className="text-xs text-muted-foreground">
                                  {b.price_type === "total" ? "totaal" : "p.p."}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </label>
                    ))}
                  </RadioGroup>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* STEP 3 */}
        {step === 3 && (
          <Card>
            <CardContent className="pt-6 space-y-6">
              {requiredAddons.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Badge>Verplicht bij dit arrangement</Badge>
                  </div>
                  <div className="space-y-2">
                    {requiredAddons.map((b) => (
                      <AddonRow
                        key={b.id}
                        block={b}
                        checked={sel.addonBlockIds.includes(b.id)}
                        onToggle={() => toggleAddon(b.id)}
                        required
                      />
                    ))}
                  </div>
                </div>
              )}

              {suggestedAddons.length > 0 && (
                <div>
                  <Label className="text-base font-medium mb-3 block">Aanbevolen</Label>
                  <div className="space-y-2">
                    {suggestedAddons.map((b) => (
                      <AddonRow key={b.id} block={b} checked={sel.addonBlockIds.includes(b.id)} onToggle={() => toggleAddon(b.id)} />
                    ))}
                  </div>
                </div>
              )}

              {freeCatalog.length > 0 && (
                <div>
                  <Label className="text-base font-medium mb-3 block">Overige opties</Label>
                  <div className="space-y-2">
                    {freeCatalog.map((b) => (
                      <AddonRow key={b.id} block={b} checked={sel.addonBlockIds.includes(b.id)} onToggle={() => toggleAddon(b.id)} />
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* STEP 4 */}
        {step === 4 && (
          <Card>
            <CardContent className="pt-6 space-y-4">
              <div>
                <Label htmlFor="diet" className="mb-2 block">Dieetwensen & allergieën</Label>
                <Textarea
                  id="diet"
                  rows={3}
                  placeholder="bijv. 2 vegetariërs, 1 glutenvrij, 1 notenallergie…"
                  value={contact.dietary}
                  onChange={(e) => setContact({ ...contact, dietary: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="notes" className="mb-2 block">Overige opmerkingen / wensen</Label>
                <Textarea
                  id="notes"
                  rows={5}
                  placeholder={sel.type === "maatwerk" ? "Beschrijf uw maatwerkvraag zo concreet mogelijk." : "Bijzonderheden, sfeer, thema…"}
                  value={contact.notes}
                  onChange={(e) => setContact({ ...contact, notes: e.target.value })}
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* STEP 5 */}
        {step === 5 && (
          <Card>
            <CardContent className="pt-6 space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="company" className="mb-2 block">Bedrijf</Label>
                  <Input id="company" value={contact.company} onChange={(e) => setContact({ ...contact, company: e.target.value })} />
                </div>
                <div>
                  <Label htmlFor="name" className="mb-2 block">Naam *</Label>
                  <Input id="name" required value={contact.name} onChange={(e) => setContact({ ...contact, name: e.target.value })} />
                </div>
                <div>
                  <Label htmlFor="email" className="mb-2 block">E-mail *</Label>
                  <Input id="email" type="email" required value={contact.email} onChange={(e) => setContact({ ...contact, email: e.target.value })} />
                </div>
                <div>
                  <Label htmlFor="phone" className="mb-2 block">Telefoon *</Label>
                  <Input id="phone" type="tel" required value={contact.phone} onChange={(e) => setContact({ ...contact, phone: e.target.value })} />
                </div>
              </div>

              <Separator />

              <div className="rounded-lg bg-muted/40 p-4 text-sm space-y-2">
                <div className="font-medium">Indicatief totaal (incl. BTW)</div>
                <div className="text-2xl font-semibold">
                  {new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" }).format(calculateTotal(sel, blocks).total)}
                </div>
                <p className="text-xs text-muted-foreground">
                  Definitieve prijs altijd in offerte. Op items met 'p.m.' / 'op aanvraag' volgt een nacalculatie.
                </p>
              </div>

              {leadTimeWarning && (
                <Alert className="border-orange-300 bg-orange-50 text-orange-900 [&>svg]:text-orange-600 dark:bg-orange-950/30 dark:text-orange-100 dark:border-orange-900">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    Krappe termijn (&lt; {LEAD_TIME_DAYS} dagen) — verzenden mag, wij nemen direct contact op.
                  </AlertDescription>
                </Alert>
              )}

              <label className="flex items-start gap-2 cursor-pointer">
                <Checkbox checked={contact.acceptTerms} onCheckedChange={(v) => setContact({ ...contact, acceptTerms: !!v })} className="mt-1" />
                <span className="text-sm">
                  Ik ga akkoord met de{" "}
                  <a href="/algemene-voorwaarden" target="_blank" rel="noreferrer" className="underline">algemene voorwaarden</a>.
                </span>
              </label>
            </CardContent>
          </Card>
        )}

        {/* Nav buttons */}
        <div className="flex justify-between gap-3">
          <Button variant="outline" onClick={() => setStep((s) => Math.max(1, s - 1))} disabled={step === 1}>
            <ChevronLeft className="h-4 w-4 mr-1" /> Terug
          </Button>
          {step < 5 ? (
            <Button onClick={() => setStep((s) => s + 1)} disabled={!canNext()}>
              Volgende <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={!canNext() || isSubmitting}>
              {isSubmitting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Versturen…</> : "Aanvraag verzenden"}
            </Button>
          )}
        </div>
      </div>

      {/* Sticky summary */}
      <div className="lg:col-span-1">
        <CateringSummary selection={sel} blocks={blocks} />
      </div>
    </div>
  );
};

const AddonRow = ({ block, checked, onToggle, required }: { block: BuildingBlock; checked: boolean; onToggle: () => void; required?: boolean }) => {
  const priceLabel = block.price_adult != null
    ? `${block.is_from_price ? "vanaf " : ""}€ ${block.price_adult.toFixed(2).replace(".", ",")} ${block.price_type === "total" ? "totaal" : "p.p."}`
    : block.price_display_override || "Op aanvraag";
  return (
    <label className={cn(
      "flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all",
      checked ? "border-primary bg-primary/5" : "border-border hover:bg-muted/40"
    )}>
      <Checkbox checked={checked} onCheckedChange={onToggle} className="mt-0.5" />
      <div className="flex-1 flex items-start justify-between gap-3">
        <div>
          <div className="font-medium text-sm">
            {block.name}
            {required && <Badge variant="outline" className="ml-2 text-[10px]">verplicht</Badge>}
          </div>
          {block.short_description && (
            <div className="text-xs text-muted-foreground mt-0.5">{block.short_description}</div>
          )}
        </div>
        <div className="text-xs text-muted-foreground whitespace-nowrap">{priceLabel}</div>
      </div>
    </label>
  );
};
