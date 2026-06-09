import { useEffect, useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useCart } from "@/contexts/CartContext";

const SESSION_SHOWN_KEY = "bv_exit_intent_shown";
const SESSION_SAVED_KEY = "bv_exit_intent_token";
const MIN_ITEMS = 1;
const ACTIVATION_DELAY_MS = 8000; // pas activeren na 8s op de pagina

/**
 * Exit-intent dialoog op de configurator: vraagt het e-mailadres om het
 * concept-programma cross-device terug te kunnen sturen via /concept/:token.
 */
export const ExitIntentDraftDialog = () => {
  const { toast } = useToast();
  const { cartItems, numberOfPeople, selectedDates, manualOrder } = useCart();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const armedAtRef = useRef<number>(Date.now());
  const triggeredRef = useRef(false);

  // Snapshot van actuele cart in ref zodat de event-handlers altijd de laatste data zien
  const cartSnapshotRef = useRef({ cartItems, numberOfPeople, selectedDates, manualOrder });
  useEffect(() => {
    cartSnapshotRef.current = { cartItems, numberOfPeople, selectedDates, manualOrder };
  }, [cartItems, numberOfPeople, selectedDates, manualOrder]);

  useEffect(() => {
    // Al getoond in deze sessie? Of al opgeslagen? Niet opnieuw vragen.
    if (sessionStorage.getItem(SESSION_SHOWN_KEY)) return;
    if (sessionStorage.getItem(SESSION_SAVED_KEY)) return;

    armedAtRef.current = Date.now();

    const shouldTrigger = () => {
      if (triggeredRef.current) return false;
      if (Date.now() - armedAtRef.current < ACTIVATION_DELAY_MS) return false;
      const snap = cartSnapshotRef.current;
      if (!snap.cartItems || snap.cartItems.length < MIN_ITEMS) return false;
      return true;
    };

    const fire = () => {
      if (!shouldTrigger()) return;
      triggeredRef.current = true;
      sessionStorage.setItem(SESSION_SHOWN_KEY, "1");
      setOpen(true);
    };

    // Desktop: muis verlaat het venster aan de bovenkant (richting tab/url-balk)
    const onMouseOut = (e: MouseEvent) => {
      if (e.relatedTarget) return;
      if (e.clientY > 20) return;
      fire();
    };

    // Mobiel/tab-switch: pagina wordt verborgen
    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden") fire();
    };

    document.addEventListener("mouseout", onMouseOut);
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      document.removeEventListener("mouseout", onMouseOut);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, []);

  const handleSave = async () => {
    const trimmed = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      toast({ title: "Vul een geldig e-mailadres in", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const snap = cartSnapshotRef.current;
      const payload = {
        cartItems: snap.cartItems,
        numberOfPeople: snap.numberOfPeople,
        selectedDates: snap.selectedDates.map((d) =>
          d instanceof Date ? d.toISOString() : String(d),
        ),
        manualOrder: snap.manualOrder,
      };
      const { data, error } = await supabase.functions.invoke("save-program-draft", {
        body: { email: trimmed, payload },
      });
      if (error) throw error;
      if (data?.token) sessionStorage.setItem(SESSION_SAVED_KEY, data.token);
      toast({
        title: "Concept verstuurd",
        description: "U ontvangt zo een e-mail met een link om uw programma later af te maken.",
      });
      setOpen(false);
    } catch (e) {
      console.error("save-program-draft failed", e);
      toast({
        title: "Het opslaan is niet gelukt",
        description: "Probeer het later opnieuw of ga direct verder met aanvragen.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Programma bewaren voor later?</DialogTitle>
          <DialogDescription>
            Wij sturen u een link naar uw e-mail. Daarmee kunt u op elk apparaat verder
            werken aan uw concept-programma — 30 dagen geldig.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2 py-2">
          <Label htmlFor="exit-intent-email">Uw e-mailadres</Label>
          <Input
            id="exit-intent-email"
            type="email"
            placeholder="naam@bedrijf.nl"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            disabled={saving}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSave();
            }}
          />
          <p className="text-xs text-muted-foreground">
            Wij gebruiken uw adres uitsluitend om u de herstel-link te sturen.
          </p>
        </div>
        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="ghost" onClick={() => setOpen(false)} disabled={saving}>
            Nee, dank u
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Versturen…" : "Stuur mij de link"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
