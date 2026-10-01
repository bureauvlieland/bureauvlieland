import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { MultiDatePicker } from "@/components/configurator/MultiDatePicker";
import { toast } from "sonner";
import { CalendarClock } from "lucide-react";
import { isBureauItem } from "@/lib/bureauItem";
import { describeDateChange, sameDates } from "@/lib/dateChange";

interface PartnerItem {
  id: string;
  block_name: string;
  provider_id: string | null;
  provider_name: string | null;
  provider_email: string | null;
  block_type: string | null;
  status: string | null;
  skip_partner_notification: boolean | null;
  customer_approved_at: string | null;
  customer_accepted_at: string | null;
}

interface AccommodationQuoteRow {
  id: string;
  partner_id: string;
  accommodation_name: string | null;
  status: string;
  partners: { id: string; name: string | null; contact_email: string | null; email: string | null } | null;
}

interface PartnerGroup {
  partner_id: string;
  partner_name: string;
  has_email: boolean;
  items: PartnerItem[];
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  requestId: string;
  linkedAccommodationId: string | null;
  customerName: string | null;
  customerEmail: string | null;
  /** Huidige (nieuwe) datums van het project. */
  newDates: string[];
  /**
   * Datums vóór de wijziging. Leeg = achteraf melden: de admin kiest zelf de
   * oude datums in de dialoog.
   */
  oldDates: string[];
  onSent?: () => void;
}

interface NotifyDateChangeResponse {
  error?: string;
  results?: {
    customer?: { sent?: boolean } | null;
    partners?: Array<{ partner_id?: string; sent?: boolean }>;
    accommodations?: Array<{ sent?: boolean }>;
  };
}

const toDate = (d: string) => new Date(`${d}T12:00:00`);

export function NotifyDateChangeDialog({
  open,
  onOpenChange,
  requestId,
  linkedAccommodationId,
  customerName,
  customerEmail,
  newDates,
  oldDates: initialOldDates,
  onSent,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [oldDates, setOldDates] = useState<string[]>([]);
  const [partnerGroups, setPartnerGroups] = useState<PartnerGroup[]>([]);
  const [accommodationQuotes, setAccommodationQuotes] = useState<AccommodationQuoteRow[]>([]);
  const [sendCustomer, setSendCustomer] = useState(true);
  const [resetCustomer, setResetCustomer] = useState(false);
  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set());
  const [selectedQuoteIds, setSelectedQuoteIds] = useState<Set<string>>(new Set());
  const [note, setNote] = useState("");

  const manualOldDates = initialOldDates.length === 0;

  useEffect(() => {
    if (!open) return;
    setNote("");
    setOldDates(initialOldDates);
    setSendCustomer(!!customerEmail);
    setResetCustomer(false);
    let cancelled = false;

    (async () => {
      setLoading(true);
      try {
        const { data: items } = await supabase
          .from("program_request_items")
          .select(
            "id, block_name, provider_id, provider_name, provider_email, block_type, status, skip_partner_notification, customer_approved_at, customer_accepted_at",
          )
          .eq("request_id", requestId)
          .neq("status", "cancelled");

        // Alleen onderdelen die de klant goedkeurde én al naar de partner
        // gingen: andere partners kennen het onderdeel nog niet.
        const relevant = ((items || []) as PartnerItem[]).filter((i) => {
          if (isBureauItem(i)) return false;
          if (!(i.customer_approved_at || i.customer_accepted_at)) return false;
          return i.skip_partner_notification === false;
        });

        const groupsMap = new Map<string, PartnerGroup>();
        for (const it of relevant) {
          const key = it.provider_id || "_unknown";
          if (!groupsMap.has(key)) {
            groupsMap.set(key, {
              partner_id: it.provider_id || "",
              partner_name: it.provider_name || "Onbekende partner",
              has_email: !!it.provider_email,
              items: [],
            });
          }
          groupsMap.get(key)!.items.push(it);
        }

        const partnerIds = Array.from(groupsMap.values())
          .filter((g) => g.partner_id && !g.has_email)
          .map((g) => g.partner_id);
        if (partnerIds.length > 0) {
          const { data: partners } = await supabase
            .from("partners")
            .select("id, name, email, contact_email")
            .in("id", partnerIds);
          for (const p of partners || []) {
            const g = groupsMap.get(p.id);
            if (g) {
              g.has_email = !!(p.contact_email || p.email);
              if (p.name) g.partner_name = p.name;
            }
          }
        }
        const groups = Array.from(groupsMap.values()).sort((a, b) => a.partner_name.localeCompare(b.partner_name));

        let quotes: AccommodationQuoteRow[] = [];
        if (linkedAccommodationId) {
          const { data: q } = await supabase
            .from("accommodation_quotes")
            .select("id, partner_id, accommodation_name, status, partners(id, name, contact_email, email)")
            .eq("request_id", linkedAccommodationId)
            .eq("status", "selected");
          quotes = (q || []) as AccommodationQuoteRow[];
        }

        if (cancelled) return;
        setPartnerGroups(groups);
        setAccommodationQuotes(quotes);
        setSelectedItemIds(new Set(groups.filter((g) => g.has_email).flatMap((g) => g.items.map((i) => i.id))));
        setSelectedQuoteIds(new Set(quotes.map((q) => q.id)));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, requestId, linkedAccommodationId, customerEmail, initialOldDates]);

  const unchanged = oldDates.length > 0 && sameDates(oldDates, newDates);
  const canSend = oldDates.length > 0 && !unchanged;

  const totalRecipients = useMemo(() => {
    let n = 0;
    if (sendCustomer && customerEmail) n += 1;
    const partnersWithSelection = new Set<string>();
    for (const g of partnerGroups) {
      if (g.items.some((i) => selectedItemIds.has(i.id))) partnersWithSelection.add(g.partner_id);
    }
    return n + partnersWithSelection.size + selectedQuoteIds.size;
  }, [sendCustomer, customerEmail, partnerGroups, selectedItemIds, selectedQuoteIds]);

  const toggle = (set: Set<string>, id: string) => {
    const next = new Set(set);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    return next;
  };

  const togglePartnerGroup = (g: PartnerGroup, on: boolean) => {
    setSelectedItemIds((prev) => {
      const next = new Set(prev);
      for (const it of g.items) {
        if (on) next.add(it.id);
        else next.delete(it.id);
      }
      return next;
    });
  };

  const handleAddOldDate = (date: Date): boolean => {
    const s = format(date, "yyyy-MM-dd");
    if (oldDates.includes(s)) return false;
    setOldDates((prev) => [...prev, s].sort());
    return true;
  };

  const handleSend = async () => {
    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("notify-date-change", {
        body: {
          request_id: requestId,
          old_dates: oldDates,
          note: note.trim() || undefined,
          origin: window.location.origin,
          send_customer: sendCustomer && !!customerEmail,
          reset_customer_approval: resetCustomer,
          partner_item_ids: Array.from(selectedItemIds),
          accommodation_quote_ids: Array.from(selectedQuoteIds),
        },
      });
      if (error) throw error;
      const res = data as NotifyDateChangeResponse | null;
      if (res?.error) throw new Error(res.error);
      const r = res?.results;
      const partnersOk = new Set((r?.partners || []).filter((p) => p.sent).map((p) => p.partner_id)).size;
      const accosOk = (r?.accommodations || []).filter((p) => p.sent).length;
      const custOk = r?.customer?.sent ? 1 : 0;
      toast.success(
        `Mails verstuurd: ${custOk} klant, ${partnersOk} partner(s), ${accosOk} logies-partner(s).` +
          (resetCustomer ? " Klantakkoord is teruggezet." : ""),
      );
      onOpenChange(false);
      onSent?.();
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error && err.message ? err.message : "Fout bij versturen mails");
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarClock className="h-5 w-5 text-primary" />
            Datumwijziging melden
          </DialogTitle>
          <DialogDescription>
            Partners krijgen een mail en moeten de nieuwe datum opnieuw beoordelen en bevestigen. De klant krijgt een
            mail met de wijziging.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2 max-h-[60vh] overflow-y-auto">
          <section className="rounded-md border border-border p-3 space-y-2">
            <h4 className="text-xs font-semibold uppercase text-muted-foreground">Wijziging</h4>
            {manualOldDates && (
              <div className="space-y-2">
                <Label className="text-xs">Datums vóór de wijziging</Label>
                <MultiDatePicker
                  selectedDates={oldDates.map(toDate)}
                  onAddDate={handleAddOldDate}
                  onRemoveDate={(i) => setOldDates((prev) => prev.filter((_, idx) => idx !== i))}
                />
              </div>
            )}
            {oldDates.length === 0 ? (
              <p className="text-sm text-muted-foreground">Kies de oorspronkelijke datums om de wijziging te zien.</p>
            ) : (
              <ul className="text-sm space-y-0.5">
                {describeDateChange(oldDates, newDates).map((row) => (
                  <li key={row.index}>
                    <span className="text-muted-foreground">Dag {row.index + 1}:</span>{" "}
                    {row.oldDate && row.newDate ? (
                      row.oldDate === row.newDate ? (
                        <>{format(toDate(row.newDate), "EEE d MMM yyyy", { locale: nl })} (ongewijzigd)</>
                      ) : (
                        <>
                          <span className="line-through text-muted-foreground">
                            {format(toDate(row.oldDate), "EEE d MMM", { locale: nl })}
                          </span>{" "}
                          → <strong>{format(toDate(row.newDate), "EEE d MMM yyyy", { locale: nl })}</strong>
                        </>
                      )
                    ) : row.newDate ? (
                      <>nieuw — {format(toDate(row.newDate), "EEE d MMM yyyy", { locale: nl })}</>
                    ) : (
                      <>{format(toDate(row.oldDate!), "EEE d MMM yyyy", { locale: nl })} — vervalt</>
                    )}
                  </li>
                ))}
              </ul>
            )}
            {unchanged && (
              <p className="text-xs text-destructive">De gekozen datums zijn gelijk aan de huidige datums.</p>
            )}
          </section>

          <section>
            <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-2">Klant</h4>
            <label className="flex items-start gap-3 p-3 rounded-md border border-border hover:bg-muted/40 cursor-pointer">
              <Checkbox checked={sendCustomer} disabled={!customerEmail} onCheckedChange={(v) => setSendCustomer(!!v)} />
              <div className="flex-1 text-sm">
                <div className="font-medium">{customerName || "Klant"} — mail met de wijziging</div>
                <div className="text-muted-foreground text-xs">{customerEmail || "Geen e-mailadres bekend"}</div>
              </div>
            </label>
            <label className="flex items-start gap-3 p-3 mt-2 rounded-md border border-border hover:bg-muted/40 cursor-pointer">
              <Checkbox checked={resetCustomer} onCheckedChange={(v) => setResetCustomer(!!v)} />
              <div className="flex-1 text-sm">
                <div className="font-medium">Klant opnieuw akkoord laten geven</div>
                <div className="text-muted-foreground text-xs">
                  Zet het akkoord op alle onderdelen terug; de klant keurt ze opnieuw goed in het klantportaal.
                  Let op: partners krijgen de datumwijziging alleen voor onderdelen mét klantakkoord, dus
                  zet dit alleen aan als de klant echt opnieuw moet beslissen.
                </div>
              </div>
            </label>
          </section>

          <section>
            <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-2">
              Partners — opnieuw bevestigen
            </h4>
            <p className="text-xs text-muted-foreground mb-2">
              Alleen onderdelen die de klant goedkeurde en al naar de partner zijn verstuurd. Hun bevestiging wordt
              teruggezet naar "open aanvraag".
            </p>
            {loading ? (
              <div className="space-y-2">
                <Skeleton className="h-14" />
                <Skeleton className="h-14" />
              </div>
            ) : partnerGroups.length === 0 ? (
              <div className="text-sm text-muted-foreground italic">Geen partner-onderdelen om opnieuw te bevestigen.</div>
            ) : (
              <div className="space-y-2">
                {partnerGroups.map((g) => {
                  const allOn = g.items.every((i) => selectedItemIds.has(i.id));
                  const someOn = !allOn && g.items.some((i) => selectedItemIds.has(i.id));
                  return (
                    <div key={g.partner_id || g.partner_name} className="border border-border rounded-md p-3 space-y-2">
                      <label className="flex items-start gap-3 cursor-pointer">
                        <Checkbox
                          checked={allOn ? true : someOn ? "indeterminate" : false}
                          disabled={!g.has_email}
                          onCheckedChange={(v) => togglePartnerGroup(g, !!v)}
                        />
                        <div className="flex-1 text-sm">
                          <div className="font-medium">{g.partner_name}</div>
                          {!g.has_email && <div className="text-xs text-destructive">Geen e-mailadres bekend</div>}
                        </div>
                      </label>
                      <ul className="pl-7 space-y-1">
                        {g.items.map((it) => (
                          <li key={it.id} className="flex items-start gap-2 text-xs">
                            <Checkbox
                              className="h-3.5 w-3.5"
                              checked={selectedItemIds.has(it.id)}
                              disabled={!g.has_email}
                              onCheckedChange={() => setSelectedItemIds((p) => toggle(p, it.id))}
                            />
                            <span className="text-muted-foreground">{it.block_name}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {accommodationQuotes.length > 0 && (
            <section>
              <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-2">Logies-partners (alleen mail)</h4>
              <div className="space-y-2">
                {accommodationQuotes.map((q) => {
                  const partnerEmail = q.partners?.contact_email || q.partners?.email;
                  return (
                    <label
                      key={q.id}
                      className="flex items-start gap-3 p-3 rounded-md border border-border hover:bg-muted/40 cursor-pointer"
                    >
                      <Checkbox
                        checked={selectedQuoteIds.has(q.id)}
                        disabled={!partnerEmail}
                        onCheckedChange={() => setSelectedQuoteIds((p) => toggle(p, q.id))}
                      />
                      <div className="flex-1 text-sm">
                        <div className="font-medium">{q.partners?.name || q.accommodation_name || "Logies-partner"}</div>
                        <div className="text-xs text-muted-foreground">
                          {q.accommodation_name}
                          {!partnerEmail && " · geen e-mailadres"}
                        </div>
                      </div>
                    </label>
                  );
                })}
              </div>
            </section>
          )}

          <section>
            <Label htmlFor="dc-note" className="text-xs font-semibold uppercase text-muted-foreground">
              Toelichting (optioneel)
            </Label>
            <Textarea
              id="dc-note"
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Bijv. reden van de wijziging; gaat mee in alle mails."
              className="mt-2"
            />
          </section>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={sending}>
            Niemand mailen
          </Button>
          <Button onClick={handleSend} disabled={sending || !canSend || (totalRecipients === 0 && !resetCustomer)}>
            {sending ? "Versturen..." : `Verstuur ${totalRecipients} mail(s)`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
