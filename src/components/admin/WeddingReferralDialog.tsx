import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { format, parseISO } from "date-fns";
import { nl } from "date-fns/locale";
import { AlertTriangle, Heart, Loader2, RefreshCw, Send } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { referralEmailFor, useWeddingReferralPartners, WEDDING_REFERRALS_KEY } from "@/hooks/useWeddingReferrals";
import { REFERRAL_STATUS_LABEL, toIsoDate, type ReferralStatus } from "@/lib/weddingReferrals";
import { useAgreementPartners, usePartnerAgreementAcceptances, usePartnerAgreements } from "@/hooks/usePartnerAgreements";
import { weddingAgreementAccepted } from "@/lib/partnerAgreements";

/**
 * "Doorverwijzen naar…" (docs/plan-bruiloftsdoorverwijzingen.md, fase 2):
 * kies een partner, controleer de standaardmail aan het bruidspaar (partner
 * in cc) en verstuur. De edge function send-wedding-referral verstuurt,
 * logt, maakt de doorverwijzing aan en zet een sales-inboxmail op verwerkt.
 */
export interface WeddingReferralPrefill {
  coupleNames: string;
  coupleEmail: string;
  couplePhone?: string | null;
  /** Datum van de oorspronkelijke aanvraag (yyyy-MM-dd). */
  requestedAt: string;
  estimatedGuests?: number | null;
  /** yyyy-MM-dd; leeg als onbekend. */
  expectedWeddingDate?: string | null;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  prefill: WeddingReferralPrefill;
  requestId?: string | null;
  salesInboxId?: string | null;
  onSent?: (referralId: string) => void;
}

const TEMPLATE_ID = "wedding_referral_customer";

const datumLabel = (iso: string, precision: "day" | "month") =>
  precision === "month" ? format(parseISO(iso), "MMMM yyyy", { locale: nl }) : format(parseISO(iso), "d MMMM yyyy", { locale: nl });

export function WeddingReferralDialog({ open, onOpenChange, prefill, requestId, salesInboxId, onSent }: Props) {
  const queryClient = useQueryClient();
  const { data: partners = [] } = useWeddingReferralPartners();
  const kiesbaar = useMemo(() => partners.filter((p) => p.receives_wedding_referrals && p.is_active), [partners]);

  const [partnerId, setPartnerId] = useState("");
  const [coupleNames, setCoupleNames] = useState("");
  const [coupleEmail, setCoupleEmail] = useState("");
  const [couplePhone, setCouplePhone] = useState("");
  const [precision, setPrecision] = useState<"day" | "month">("day");
  const [expectedDay, setExpectedDay] = useState("");
  const [expectedMonth, setExpectedMonth] = useState("");
  const [estimatedGuests, setEstimatedGuests] = useState("");
  const [notes, setNotes] = useState("");
  const [priorContactNote, setPriorContactNote] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [tekstAangepast, setTekstAangepast] = useState(false);
  const [laadt, setLaadt] = useState(false);
  const [verstuurt, setVerstuurt] = useState(false);

  useEffect(() => {
    if (!open) return;
    setPartnerId(kiesbaar.length === 1 ? kiesbaar[0].id : "");
    setCoupleNames(prefill.coupleNames);
    setCoupleEmail(prefill.coupleEmail);
    setCouplePhone(prefill.couplePhone ?? "");
    setPrecision("day");
    setExpectedDay(prefill.expectedWeddingDate ?? "");
    setExpectedMonth(prefill.expectedWeddingDate ? prefill.expectedWeddingDate.slice(0, 7) : "");
    setEstimatedGuests(prefill.estimatedGuests === null || prefill.estimatedGuests === undefined ? "" : String(prefill.estimatedGuests));
    setNotes("");
    setPriorContactNote("");
    setSubject("");
    setBody("");
    setTekstAangepast(false);
    // De prefill hoort bij het openen; latere wijzigingen erin mogen een lopende bewerking niet overschrijven.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const partner = kiesbaar.find((p) => p.id === partnerId) ?? null;

  // Heeft de partner de doorverwijsregeling geaccepteerd? Waarschuwing, geen blokkade.
  const { data: afspraken = [] } = usePartnerAgreements();
  const { data: akkoorden = [] } = usePartnerAgreementAcceptances();
  const { data: afspraakPartners = [] } = useAgreementPartners();
  const regeling = useMemo(() => {
    const p = afspraakPartners.find((x) => x.id === partnerId);
    return p ? weddingAgreementAccepted(afspraken, akkoorden, p) : null;
  }, [afspraken, akkoorden, afspraakPartners, partnerId]);

  const expectedIso = precision === "month" ? (expectedMonth ? `${expectedMonth}-01` : "") : expectedDay;

  // Komt dit bruidspaar al voor in onze eigen gegevens? Zegt niets over
  // contact met de partner buiten ons om; dat meldt de partner zelf.
  const emailNet = coupleEmail.trim().toLowerCase();
  const emailGeldig = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailNet);
  const { data: bekend = [] } = useQuery({
    queryKey: ["wedding-referral-duplicates", emailNet, requestId ?? null],
    enabled: open && emailGeldig,
    queryFn: async (): Promise<string[]> => {
      const [eerder, projecten] = await Promise.all([
        supabase.from("wedding_referrals").select("id, partner_id, referred_at, status").ilike("couple_email", emailNet).order("referred_at", { ascending: false }).limit(5),
        supabase.from("program_requests").select("id, reference_number, created_at, status").ilike("customer_email", emailNet).order("created_at", { ascending: false }).limit(5),
      ]);
      if (eerder.error) throw eerder.error;
      if (projecten.error) throw projecten.error;
      const namen = Object.fromEntries(partners.map((p) => [p.id, p.name]));
      const regels = (eerder.data ?? []).map(
        (r) => `Al doorverwezen naar ${namen[r.partner_id] ?? r.partner_id} op ${format(parseISO(r.referred_at), "d MMM yyyy", { locale: nl })} (${REFERRAL_STATUS_LABEL[r.status as ReferralStatus] ?? r.status})`,
      );
      for (const p of projecten.data ?? []) {
        if (p.id === requestId) continue;
        regels.push(`Eerdere aanvraag ${p.reference_number ?? "zonder nummer"} van ${format(parseISO(p.created_at), "d MMM yyyy", { locale: nl })}${p.status === "cancelled" ? " (geannuleerd)" : ""}`);
      }
      return regels;
    },
  });

  const laadTemplate = async (force = false) => {
    if (!partner) return;
    if (tekstAangepast && !force) return;
    setLaadt(true);
    try {
      const { data, error } = await supabase.functions.invoke<{ subject: string; body: string; error?: string }>("render-email-template", {
        body: {
          templateId: TEMPLATE_ID,
          requestId: requestId ?? undefined,
          variables: {
            customer_name: coupleNames.trim() || "bruidspaar",
            partner_name: partner.name,
            partner_email: referralEmailFor(partner),
            partner_phone: partner.phone ?? "",
            partner_website: partner.website_url ?? "",
            expected_wedding_date: expectedIso ? datumLabel(expectedIso, precision) : "",
            number_of_people: estimatedGuests.trim() || "",
          },
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setSubject(data?.subject ?? "");
      setBody(data?.body ?? "");
      setTekstAangepast(false);
    } catch (e) {
      toast.error("Standaardmail laden mislukt", { description: e instanceof Error ? e.message : String(e) });
    } finally {
      setLaadt(false);
    }
  };

  // Voorzet laden zodra de partner gekozen is; een aangepaste tekst blijft staan.
  useEffect(() => {
    if (!open || !partner) return;
    void laadTemplate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, partnerId]);

  const verstuur = async () => {
    if (!partner) return toast.error("Kies een partner.");
    if (!coupleNames.trim()) return toast.error("Vul de namen van het bruidspaar in.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(coupleEmail.trim())) return toast.error("Vul een geldig e-mailadres in.");
    if (!subject.trim() || !body.trim()) return toast.error("Onderwerp en tekst zijn verplicht.");
    setVerstuurt(true);
    try {
      const gasten = estimatedGuests.trim() === "" ? null : Number(estimatedGuests);
      const { data, error } = await supabase.functions.invoke<{ referralId?: string; error?: string; testMode?: boolean; cc?: string | null }>(
        "send-wedding-referral",
        {
          body: {
            partnerId: partner.id,
            coupleNames: coupleNames.trim(),
            coupleEmail: coupleEmail.trim(),
            couplePhone: couplePhone.trim() || null,
            requestId: requestId ?? null,
            salesInboxId: salesInboxId ?? null,
            requestedAt: prefill.requestedAt || toIsoDate(new Date()),
            expectedWeddingDate: expectedIso || null,
            expectedWeddingPrecision: precision,
            estimatedGuests: gasten !== null && Number.isFinite(gasten) ? Math.max(0, Math.floor(gasten)) : null,
            notes: notes.trim(),
            priorContactNote: priorContactNote.trim(),
            subject: subject.trim(),
            body: body.trim(),
            origin: window.location.origin,
          },
        },
      );
      if (error) throw error;
      if (data?.error || !data?.referralId) throw new Error(data?.error ?? "Onbekende fout");
      void queryClient.invalidateQueries({ queryKey: WEDDING_REFERRALS_KEY });
      void queryClient.invalidateQueries({ queryKey: ["sales-inbox"] });
      void queryClient.invalidateQueries({ queryKey: ["sales-inbox-count"] });
      toast.success(`Doorverwezen naar ${partner.name}`, {
        description: data.testMode ? "Testmodus: de mail ging naar het testadres, zonder cc." : `Mail verstuurd aan ${coupleEmail.trim()}, cc ${data.cc ?? referralEmailFor(partner)}.`,
      });
      onSent?.(data.referralId);
      onOpenChange(false);
    } catch (e) {
      toast.error("Doorverwijzen mislukt", { description: e instanceof Error ? e.message : String(e) });
    } finally {
      setVerstuurt(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !verstuurt && onOpenChange(o)}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Heart className="h-5 w-5" aria-hidden="true" />
            Doorverwijzen naar…
          </DialogTitle>
          <DialogDescription>
            Het bruidspaar krijgt de mail, de partner staat in cc. Na verzenden staat de doorverwijzing onder{" "}
            <Link to="/admin/bruiloften" className="underline underline-offset-2">
              Bruiloften
            </Link>
            . De standaardtekst beheer je bij Email Templates.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Partner *</Label>
            <Select value={partnerId} onValueChange={setPartnerId}>
              <SelectTrigger>
                <SelectValue placeholder="Kies een partner" />
              </SelectTrigger>
              <SelectContent>
                {kiesbaar.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {kiesbaar.length === 0 && <p className="text-xs text-muted-foreground">Geen enkele actieve partner heeft "Ontvangt bruiloftsdoorverwijzingen" aan.</p>}
            {partner && <p className="text-xs text-muted-foreground">Cc: {referralEmailFor(partner)}</p>}
            {partner && regeling && regeling.state !== "accepted" && (
              <p className="flex items-start gap-2 text-xs text-amber-900">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                {partner.name} heeft de {regeling.agreement.title.toLowerCase()} (versie {regeling.agreement.version}) nog niet geaccepteerd in het portaal
                {regeling.state === "outdated" ? "; een eerdere versie wel" : ""}. Doorverwijzen kan, maar de afspraak is dan nog niet bevestigd.
              </p>
            )}
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="wrd-namen">Bruidspaar *</Label>
              <Input id="wrd-namen" value={coupleNames} onChange={(e) => setCoupleNames(e.target.value)} placeholder="Anna & Bram" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="wrd-email">E-mail *</Label>
              <Input id="wrd-email" type="email" value={coupleEmail} onChange={(e) => setCoupleEmail(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="wrd-tel">Telefoon</Label>
              <Input id="wrd-tel" value={couplePhone} onChange={(e) => setCouplePhone(e.target.value)} />
            </div>
          </div>

          {bekend.length > 0 && (
            <div className="flex gap-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <div>
                <p className="font-medium">Dit e-mailadres komt al voor:</p>
                <ul className="list-disc pl-4">
                  {bekend.map((b) => (
                    <li key={b}>{b}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="wrd-eerder-contact">Eerder contact volgens het bruidspaar</Label>
            <Input
              id="wrd-eerder-contact"
              value={priorContactNote}
              onChange={(e) => setPriorContactNote(e.target.value)}
              placeholder="Vraag het bij de intake: al contact gehad met een locatie of partij op Vlieland?"
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-[auto_1fr_auto]">
            <div className="space-y-2">
              <Label>Verwachte trouwdatum</Label>
              <Select value={precision} onValueChange={(v) => setPrecision(v as "day" | "month")}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="day">Precieze dag</SelectItem>
                  <SelectItem value="month">Alleen maand</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="wrd-datum">{precision === "month" ? "Maand en jaar" : "Datum"}</Label>
              {precision === "month" ? (
                <Input id="wrd-datum" type="month" value={expectedMonth} onChange={(e) => setExpectedMonth(e.target.value)} />
              ) : (
                <Input id="wrd-datum" type="date" value={expectedDay} onChange={(e) => setExpectedDay(e.target.value)} />
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="wrd-gasten">Geschat aantal gasten</Label>
              <Input id="wrd-gasten" type="number" min={0} className="w-32" value={estimatedGuests} onChange={(e) => setEstimatedGuests(e.target.value)} />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="wrd-onderwerp">Mail aan het bruidspaar</Label>
              <Button type="button" variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => laadTemplate(true)} disabled={!partner || laadt}>
                <RefreshCw className={`mr-1 h-3 w-3 ${laadt ? "animate-spin" : ""}`} aria-hidden="true" />
                Standaardtekst opnieuw laden
              </Button>
            </div>
            <Input id="wrd-onderwerp" value={subject} onChange={(e) => { setSubject(e.target.value); setTekstAangepast(true); }} placeholder={partner ? "Onderwerp" : "Kies eerst een partner"} disabled={!partner} />
            <Textarea
              rows={14}
              value={body}
              onChange={(e) => { setBody(e.target.value); setTekstAangepast(true); }}
              placeholder={laadt ? "Standaardmail laden…" : partner ? "Tekst van de mail" : "Kies eerst een partner"}
              disabled={!partner}
              className="font-sans text-sm"
            />
            <p className="text-xs text-muted-foreground">Platte tekst; links worden klikbaar. De mail krijgt de huisstijl met logo en voettekst.</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="wrd-notities">Interne notities bij de doorverwijzing</Label>
            <Textarea id="wrd-notities" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Niet zichtbaar voor het bruidspaar of de partner" />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={verstuurt}>
            Annuleren
          </Button>
          <Button onClick={verstuur} disabled={verstuurt || laadt || !partner || !subject.trim() || !body.trim()}>
            {verstuurt ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" /> : <Send className="mr-2 h-4 w-4" aria-hidden="true" />}
            Verstuur en verwijs door
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
