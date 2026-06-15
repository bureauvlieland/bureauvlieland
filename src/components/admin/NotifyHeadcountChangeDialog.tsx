import { useEffect, useMemo, useState } from "react";
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
import { toast } from "sonner";
import { Users } from "lucide-react";

const BUREAU_PROVIDER_IDS = new Set([
  "bureau",
  "bureau-vlieland",
  "rederij",
  "fietsverhuur",
  "bagagevervoer-vlieland",
]);

interface PartnerItem {
  id: string;
  block_name: string;
  provider_id: string | null;
  provider_name: string | null;
  provider_email: string | null;
  block_type: string | null;
  price_type: string | null;
  override_people: number | null;
  status: string | null;
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
  oldPeople: number;
  newPeople: number;
}

function isBureau(item: PartnerItem): boolean {
  const pid = item.provider_id;
  if (pid && !BUREAU_PROVIDER_IDS.has(pid)) return false;
  if (item.block_type === "bureau") return true;
  if (pid === "bureau") return true;
  return false;
}

export function NotifyHeadcountChangeDialog({
  open,
  onOpenChange,
  requestId,
  linkedAccommodationId,
  customerName,
  customerEmail,
  oldPeople,
  newPeople,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [partnerGroups, setPartnerGroups] = useState<PartnerGroup[]>([]);
  const [accommodationQuotes, setAccommodationQuotes] = useState<AccommodationQuoteRow[]>([]);
  const [sendCustomer, setSendCustomer] = useState(true);
  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set());
  const [selectedQuoteIds, setSelectedQuoteIds] = useState<Set<string>>(new Set());
  const [note, setNote] = useState("");

  useEffect(() => {
    if (!open) return;
    setNote("");
    setSendCustomer(!!customerEmail);
    let cancelled = false;

    (async () => {
      setLoading(true);
      try {
        const { data: items } = await supabase
          .from("program_request_items")
          .select(
            "id, block_name, provider_id, provider_name, provider_email, block_type, price_type, override_people, status",
          )
          .eq("request_id", requestId)
          .neq("status", "cancelled");

        const relevant = ((items || []) as PartnerItem[]).filter((i) => {
          if (isBureau(i)) return false;
          // Only items whose totals depend on the headcount
          return i.price_type === "per_person" || i.price_type === "per_person_per_day";
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

        // Enrich has_email from partners table when needed
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

        const groups = Array.from(groupsMap.values()).sort((a, b) =>
          a.partner_name.localeCompare(b.partner_name),
        );

        // Logies-partners (geselecteerde + verstuurde quotes)
        let quotes: AccommodationQuoteRow[] = [];
        if (linkedAccommodationId) {
          const { data: q } = await supabase
            .from("accommodation_quotes")
            .select(
              "id, partner_id, accommodation_name, status, partners(id, name, contact_email, email)",
            )
            .eq("request_id", linkedAccommodationId)
            .in("status", ["selected", "submitted", "forwarded"]);
          quotes = (q || []) as AccommodationQuoteRow[];
        }

        if (cancelled) return;
        setPartnerGroups(groups);
        setAccommodationQuotes(quotes);
        // Defaults: alle partners aan, geselecteerde quote aan
        setSelectedItemIds(
          new Set(
            groups
              .filter((g) => g.has_email)
              .flatMap((g) => g.items.filter((i) => i.override_people == null).map((i) => i.id)),
          ),
        );
        setSelectedQuoteIds(new Set(quotes.filter((q) => q.status === "selected").map((q) => q.id)));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, requestId, linkedAccommodationId, customerEmail]);

  const totalRecipients = useMemo(() => {
    let n = 0;
    if (sendCustomer && customerEmail) n += 1;
    const partnersWithSelection = new Set<string>();
    for (const g of partnerGroups) {
      if (g.items.some((i) => selectedItemIds.has(i.id))) partnersWithSelection.add(g.partner_id);
    }
    n += partnersWithSelection.size;
    n += selectedQuoteIds.size;
    return n;
  }, [sendCustomer, customerEmail, partnerGroups, selectedItemIds, selectedQuoteIds]);

  const toggleItem = (id: string) => {
    setSelectedItemIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleQuote = (id: string) => {
    setSelectedQuoteIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
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

  const handleSend = async () => {
    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("notify-headcount-change-bulk", {
        body: {
          request_id: requestId,
          old_people: oldPeople,
          new_people: newPeople,
          note: note.trim() || undefined,
          origin: window.location.origin,
          send_customer: sendCustomer && !!customerEmail,
          partner_item_ids: Array.from(selectedItemIds),
          accommodation_quote_ids: Array.from(selectedQuoteIds),
        },
      });
      if (error) throw error;
      const r = (data as any)?.results;
      const partnersOk = (r?.partners || []).filter((p: any) => p.sent).length;
      const accosOk = (r?.accommodations || []).filter((p: any) => p.sent).length;
      const custOk = r?.customer?.sent ? 1 : 0;
      toast.success(
        `Mails verstuurd: ${custOk} klant, ${partnersOk} partner(s), ${accosOk} logies-partner(s).`,
      );
      onOpenChange(false);
    } catch (err) {
      console.error(err);
      toast.error("Fout bij versturen mails");
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Aantal personen aangepast: {oldPeople} → {newPeople}
          </DialogTitle>
          <DialogDescription>
            Kies wie een notificatiemail krijgt. Prijzen per persoon blijven gelijk; totalen rekenen automatisch door.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2 max-h-[60vh] overflow-y-auto">
          {/* Klant */}
          <section>
            <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-2">Klant</h4>
            <label className="flex items-start gap-3 p-3 rounded-md border border-border hover:bg-muted/40 cursor-pointer">
              <Checkbox
                checked={sendCustomer}
                disabled={!customerEmail}
                onCheckedChange={(v) => setSendCustomer(!!v)}
              />
              <div className="flex-1 text-sm">
                <div className="font-medium">{customerName || "Klant"}</div>
                <div className="text-muted-foreground text-xs">
                  {customerEmail || "Geen e-mailadres bekend"}
                </div>
              </div>
            </label>
          </section>

          {/* Partners */}
          <section>
            <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-2">
              Partners met p.p.-onderdelen
            </h4>
            {loading ? (
              <div className="space-y-2">
                <Skeleton className="h-14" />
                <Skeleton className="h-14" />
              </div>
            ) : partnerGroups.length === 0 ? (
              <div className="text-sm text-muted-foreground italic">
                Geen relevante partner-onderdelen.
              </div>
            ) : (
              <div className="space-y-2">
                {partnerGroups.map((g) => {
                  const allOn = g.items.every((i) => selectedItemIds.has(i.id));
                  const someOn = !allOn && g.items.some((i) => selectedItemIds.has(i.id));
                  return (
                    <div
                      key={g.partner_id || g.partner_name}
                      className="border border-border rounded-md p-3 space-y-2"
                    >
                      <label className="flex items-start gap-3 cursor-pointer">
                        <Checkbox
                          checked={allOn ? true : someOn ? "indeterminate" : false}
                          disabled={!g.has_email}
                          onCheckedChange={(v) => togglePartnerGroup(g, !!v)}
                        />
                        <div className="flex-1 text-sm">
                          <div className="font-medium">{g.partner_name}</div>
                          {!g.has_email && (
                            <div className="text-xs text-destructive">Geen e-mailadres bekend</div>
                          )}
                        </div>
                      </label>
                      <ul className="pl-7 space-y-1">
                        {g.items.map((it) => (
                          <li key={it.id} className="flex items-start gap-2 text-xs">
                            <Checkbox
                              className="h-3.5 w-3.5"
                              checked={selectedItemIds.has(it.id)}
                              disabled={!g.has_email}
                              onCheckedChange={() => toggleItem(it.id)}
                            />
                            <span className="text-muted-foreground">
                              {it.block_name}
                              {it.override_people != null && (
                                <span className="text-amber-700 ml-1">
                                  · eigen aantal ({it.override_people}) — volgt projectaantal niet
                                </span>
                              )}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* Logies-partners */}
          {accommodationQuotes.length > 0 && (
            <section>
              <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-2">
                Logies-partners
              </h4>
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
                        onCheckedChange={() => toggleQuote(q.id)}
                      />
                      <div className="flex-1 text-sm">
                        <div className="font-medium">
                          {q.partners?.name || q.accommodation_name || "Logies-partner"}
                          {q.status === "selected" && (
                            <span className="ml-2 inline-block px-1.5 py-0.5 text-[10px] rounded bg-primary/10 text-primary">
                              geselecteerd
                            </span>
                          )}
                        </div>
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
            <Label htmlFor="hc-note" className="text-xs font-semibold uppercase text-muted-foreground">
              Toelichting (optioneel)
            </Label>
            <Textarea
              id="hc-note"
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
          <Button onClick={handleSend} disabled={sending || totalRecipients === 0}>
            {sending ? "Versturen..." : `Verstuur ${totalRecipients} mail(s)`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
