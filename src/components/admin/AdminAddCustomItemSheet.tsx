import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Sparkles } from "lucide-react";
import { ItemHandlingFields } from "./ItemHandlingFields";
import type { BillingRoute, PartnerHandling } from "@/lib/itemHandling";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  requestId: string;
  selectedDates: string[];
  onCreated?: () => void;
}

interface PartnerOpt {
  id: string;
  name: string;
}

export function AdminAddCustomItemSheet({ isOpen, onClose, requestId, selectedDates, onCreated }: Props) {
  const [partners, setPartners] = useState<PartnerOpt[]>([]);
  const [title, setTitle] = useState("");
  const [briefing, setBriefing] = useState("");
  const [partnerId, setPartnerId] = useState<string>("");
  const [dayIndex, setDayIndex] = useState<string>("0");
  const [preferredTime, setPreferredTime] = useState<string>("");
  const [handling, setHandling] = useState<PartnerHandling>("quote");
  const [billingRoute, setBillingRoute] = useState<BillingRoute>("bureau");
  const [submitting, setSubmitting] = useState(false);
  const needsQuote = handling === "quote";

  useEffect(() => {
    if (!isOpen) return;
    (async () => {
      const { data } = await supabase
        .from("partners")
        .select("id, name")
        .eq("is_active", true)
        .order("name");
      setPartners((data as PartnerOpt[]) || []);
    })();
  }, [isOpen]);

  const reset = () => {
    setTitle("");
    setBriefing("");
    setPartnerId("");
    setDayIndex("0");
    setPreferredTime("");
    setHandling("quote");
    setBillingRoute("bureau");
  };

  const handleCreate = async () => {
    if (!title.trim()) return toast.error("Titel is verplicht");
    if (needsQuote && !briefing.trim()) return toast.error("Briefing voor de partner is verplicht");
    if (!partnerId) return toast.error("Kies een partner");

    const partner = partners.find((p) => p.id === partnerId);
    if (!partner) return toast.error("Partner niet gevonden");

    setSubmitting(true);
    try {
      const { error } = await supabase.from("program_request_items").insert({
        request_id: requestId,
        block_id: null as any,
        block_name: title.trim(),
        block_category: "maatwerk",
        block_type: "activity",
        provider_id: partner.id,
        provider_name: partner.name,
        day_index: Number(dayIndex),
        preferred_time: preferredTime || null,
        // Een mededeling wacht op niemand: direct 'confirmed', zodat hij nergens
        // als openstaande partneractie telt (zie lib/itemHandling).
        status: handling === "inform" ? "confirmed" : "pending",
        price_type: "total",
        is_custom_quote: true,
        custom_briefing: briefing.trim() || null,
        partner_handling: handling,
        billing_route: billingRoute,
        pending_added: true,
      } as any);
      if (error) throw error;
      toast.success(handling === "quote" ? "Maatwerk-item aangemaakt" : handling === "confirm" ? "Bevestiging-onderdeel aangemaakt" : "Mededeling aangemaakt", {
        description: "Publiceer & notificeer de partner via de projectacties.",
      });
      reset();
      onCreated?.();
      onClose();
    } catch (e: any) {
      console.error(e);
      toast.error("Kon maatwerk-item niet aanmaken", { description: e?.message });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Maatwerk-item toevoegen
          </SheetTitle>
          <SheetDescription>
            Voor onderdelen die geen bestaande bouwsteen hebben. Kies of de partner een offerte
            indient, alleen bevestigt, of het alleen te horen krijgt.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="cm-title">Titel</Label>
            <Input
              id="cm-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Bv. Champagnetoast na ceremonie"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Dag</Label>
              <Select value={dayIndex} onValueChange={setDayIndex}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {selectedDates.map((_, i) => (
                    <SelectItem key={i} value={String(i)}>Dag {i + 1}</SelectItem>
                  ))}
                  <SelectItem value="-1">Extra kost (geen dag)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="cm-time">Voorkeurstijd (optioneel)</Label>
              <Input
                id="cm-time"
                type="time"
                value={preferredTime}
                onChange={(e) => setPreferredTime(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Partner</Label>
            <Select value={partnerId} onValueChange={setPartnerId}>
              <SelectTrigger><SelectValue placeholder="Kies partner" /></SelectTrigger>
              <SelectContent className="max-h-72">
                {partners.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <ItemHandlingFields
            idPrefix="cm"
            handling={handling}
            billingRoute={billingRoute}
            onHandlingChange={(v) => {
              setHandling(v);
              // Een offerte landt op de bureaufactuur; voor bevestiging en
              // mededeling is de verblijfsnota van de partner de gangbare route.
              if (v === "quote") setBillingRoute("bureau");
              else if (billingRoute === "bureau") setBillingRoute("partner_stay_invoice");
            }}
            onBillingRouteChange={setBillingRoute}
          />

          <div className="space-y-2">
            <Label htmlFor="cm-brief">{needsQuote ? "Briefing voor partner" : "Toelichting voor partner (optioneel)"}</Label>
            <Textarea
              id="cm-brief"
              rows={needsQuote ? 8 : 4}
              value={briefing}
              onChange={(e) => setBriefing(e.target.value)}
              placeholder={
                needsQuote
                  ? "Beschrijf zo concreet mogelijk wat je nodig hebt (aantallen, tijd, locatie, wensen)."
                  : "Bv. Tafel voor 7 om 19:00, gereserveerd op naam Swagerman. Rekening op de verblijfsnota."
              }
            />
            <p className="text-xs text-muted-foreground">
              {needsQuote
                ? "De partner voegt daarna zelf offerteregels toe (omschrijving, aantal, prijs incl. BTW, BTW-tarief)."
                : handling === "confirm"
                  ? "De partner ziet dit bij het onderdeel en bevestigt met één klik. Geen prijs, geen offerte."
                  : "De partner ziet dit bij het onderdeel. Er wordt geen reactie verwacht."}
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={onClose} disabled={submitting}>Annuleren</Button>
            <Button onClick={handleCreate} disabled={submitting}>
              {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {needsQuote ? "Maatwerk-item aanmaken" : handling === "confirm" ? "Bevestiging-onderdeel aanmaken" : "Mededeling aanmaken"}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
