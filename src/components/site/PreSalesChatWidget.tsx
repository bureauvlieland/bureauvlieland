import { useState, useEffect, useCallback } from "react";
import { Link, useLocation } from "react-router-dom";
import { MessageCircle, X, Send, ShoppingCart, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useCartSafe } from "@/contexts/CartContext";
import { buildWhatsAppHref, openWhatsApp } from "@/lib/whatsappLink";

const WA_NUMBER = "31562700208"; // +31 562 700208
const STORAGE_KEY = "bv_presales_widget";
const FAQ_TEASERS = [
  { q: "Wat kost een bedrijfsuitje op Vlieland?", a: "/veelgestelde-vragen#kosten" },
  { q: "Hoe snel krijg ik een offerte?", a: "/veelgestelde-vragen#offerte" },
  { q: "Kan ik ook op maat boeken?", a: "/veelgestelde-vragen#maatwerk" },
  { q: "Regelen jullie ook overnachting?", a: "/veelgestelde-vragen#overnachten" },
];

type Persisted = { name: string; email: string };

export const PreSalesChatWidget = () => {
  const location = useLocation();
  const cart = useCartSafe();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const p = JSON.parse(raw) as Persisted;
        if (p?.name) setName(p.name);
        if (p?.email) setEmail(p.email);
      }
    } catch { /* ignore */ }
  }, []);

  // Open automatically when arriving via an e-mail link (?chat=open)
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get("chat") === "open") setOpen(true);
  }, [location.search]);


  const hideOnPortal =
    location.pathname.startsWith("/partner") ||
    location.pathname.startsWith("/admin") ||
    location.pathname.startsWith("/programma/") ||
    location.pathname.startsWith("/mijn-programma/") ||
    location.pathname.startsWith("/mijn-logies/") ||
    location.pathname.startsWith("/concept/");

  const submit = useCallback(async () => {
    if (submitting) return;
    if (!name.trim() || !email.trim() || !message.trim()) {
      toast.error("Vul naam, e-mail en uw vraag in");
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await supabase.functions.invoke("chat-visitor-send", {
        body: {
          source: "presales",
          visitorName: name.trim(),
          visitorEmail: email.trim(),
          content: message.trim(),
          topic: location.pathname,
        },
      });
      if (error) throw error;
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ name: name.trim(), email: email.trim() }));
      } catch { /* ignore */ }
      setSent(true);
      setMessage("");
      toast.success("Bericht verstuurd — we reageren zo snel mogelijk.");
    } catch (e: any) {
      console.error("presales send failed", e);
      toast.error(e?.message ?? "Kon bericht niet versturen");
    } finally {
      setSubmitting(false);
    }
  }, [name, email, message, location.pathname, submitting]);

  if (hideOnPortal) return null;

  const cartCount = cart?.cartItems.length ?? 0;
  const itemJustAdded = cart?.itemJustAdded;
  const waHref = buildWhatsAppHref({
    phone: WA_NUMBER,
    text: `Hallo Bureau Vlieland, ik heb een vraag via bureauvlieland.nl (${location.pathname}).`,
  });
  const openWa = (e: React.MouseEvent) => {
    e.preventDefault();
    openWhatsApp(waHref);
  };

  return (
    <>
      {/* Floating action buttons — bottom right */}
      <div className="fixed bottom-4 right-4 z-40 flex flex-col items-end gap-3">
        {cartCount > 0 && (
          <Link to="/programma-samenstellen" aria-label="Uw programma">
            <Button
              size="lg"
              variant="secondary"
              className={`shadow-lg gap-2 ${itemJustAdded ? "animate-cart-pulse" : ""}`}
            >
              <ShoppingCart className="h-5 w-5" />
              <span className="hidden sm:inline">Uw programma</span>
              <span className={`bg-primary text-primary-foreground text-xs font-bold px-2 py-0.5 rounded-full ${itemJustAdded ? "animate-badge-pop" : ""}`}>
                {cartCount}
              </span>
            </Button>
          </Link>
        )}

        <Button
          size="lg"
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? "Sluit chat" : "Open chat"}
          className="shadow-lg gap-2 rounded-full h-14 w-14 p-0 sm:h-auto sm:w-auto sm:px-5 sm:py-3 sm:rounded-md"
        >
          {open ? <X className="h-5 w-5" /> : <MessageCircle className="h-5 w-5" />}
          <span className="hidden sm:inline">{open ? "Sluiten" : "Vraag stellen"}</span>
        </Button>
      </div>

      {/* Panel */}
      {open && (
        <div
          className="fixed bottom-24 right-4 z-40 w-[min(380px,calc(100vw-2rem))] max-h-[calc(100vh-8rem)] overflow-y-auto rounded-lg border border-border bg-card shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-200"
          role="dialog"
          aria-label="Pre-sales chat"
        >
          <div className="p-4 border-b border-border bg-primary/5">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="font-semibold text-foreground">Kunnen we u helpen?</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Persoonlijk antwoord binnen kantooruren, meestal binnen een paar uur.
                </p>
              </div>
              <button
                onClick={() => setOpen(false)}
                aria-label="Sluit chat"
                className="text-muted-foreground hover:text-foreground p-1 -m-1"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="p-4 space-y-4">
            {sent ? (
              <div className="text-sm text-foreground">
                <p className="font-medium">Bedankt, uw bericht is verstuurd.</p>
                <p className="text-muted-foreground mt-1">
                  We reageren op <strong>{email}</strong> zo snel mogelijk. Liever direct contact?
                </p>
                <div className="flex flex-col gap-2 mt-3">
                  <a href={waHref} target="_blank" rel="noopener noreferrer">
                    <Button variant="outline" className="w-full gap-2">
                      <MessageCircle className="h-4 w-4" /> Verder chatten via WhatsApp
                    </Button>
                  </a>
                  <Button variant="ghost" size="sm" onClick={() => { setSent(false); }}>
                    Nog een vraag stellen
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-2">
                  <div className="col-span-2 sm:col-span-1">
                    <Label htmlFor="ps-name" className="text-xs">Uw naam</Label>
                    <Input
                      id="ps-name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      autoComplete="name"
                      maxLength={120}
                    />
                  </div>
                  <div className="col-span-2 sm:col-span-1">
                    <Label htmlFor="ps-email" className="text-xs">E-mail</Label>
                    <Input
                      id="ps-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      autoComplete="email"
                      maxLength={200}
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="ps-msg" className="text-xs">Uw vraag</Label>
                  <Textarea
                    id="ps-msg"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    rows={4}
                    maxLength={4000}
                    placeholder="Waar kunnen we u bij helpen?"
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <Button onClick={submit} disabled={submitting} className="w-full gap-2">
                    <Send className="h-4 w-4" />
                    {submitting ? "Versturen…" : "Verstuur"}
                  </Button>
                  <a href={waHref} target="_blank" rel="noopener noreferrer">
                    <Button variant="outline" className="w-full gap-2">
                      <MessageCircle className="h-4 w-4" /> Chat via WhatsApp
                    </Button>
                  </a>
                </div>
              </>
            )}

            <div className="pt-3 border-t border-border">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1 mb-2">
                <HelpCircle className="h-3.5 w-3.5" /> Veelgestelde vragen
              </p>
              <ul className="space-y-1">
                {FAQ_TEASERS.map((f) => (
                  <li key={f.q}>
                    <Link
                      to={f.a}
                      className="text-sm text-primary hover:underline"
                      onClick={() => setOpen(false)}
                    >
                      {f.q}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
