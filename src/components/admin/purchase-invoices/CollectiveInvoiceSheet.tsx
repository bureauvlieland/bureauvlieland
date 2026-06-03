import { useState, useEffect, useMemo } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { CheckCircle2, AlertTriangle, XCircle, MinusCircle, Loader2, ExternalLink, Send, Link2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import type { PurchaseInvoiceInboxItem } from "@/types/purchaseInvoiceInbox";
import { AdminAddCostSheet } from "@/components/admin/AdminAddCostSheet";

type MatchStatus = "matched" | "ambiguous" | "unmatched" | "manual" | "internal";

interface Candidate {
  item_id: string;
  request_id: string;
  reference_number: string | null;
  customer_label: string;
  block_name: string;
}

interface Booking {
  resnr: string;
  customer_name: string;
  departure_dates: string[];
  routes: string[];
  reference: string | null;
  amount_excl_vat: number;
  vat_amount: number;
  amount_incl_vat: number;
  tourist_tax: number;
  supplier_commission: number;
  match_status: MatchStatus;
  item_id: string | null;
  candidates: Candidate[];
  project: { request_id: string; reference_number: string | null; customer_label: string } | null;
}

interface ParseResponse {
  invoice: {
    invoice_number: string;
    invoice_date: string;
    supplier_name: string;
    total_excl_vat: number;
    total_vat: number;
    total_incl_vat: number;
    total_tourist_tax: number;
    total_supplier_commission: number;
    net_to_pay: number;
  };
  bookings: Booking[];
}

interface Props {
  open: boolean;
  onClose: () => void;
  inboxItem: PurchaseInvoiceInboxItem | null;
  partnerId: string; // e.g. "rederij"
}

const EUR = (n: number) =>
  new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" }).format(n || 0);

export function CollectiveInvoiceSheet({ open, onClose, inboxItem, partnerId }: Props) {
  const qc = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<ParseResponse | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [forwarding, setForwarding] = useState(false);
  const [forwardToSnelstart, setForwardToSnelstart] = useState(true);
  const [extraCostTarget, setExtraCostTarget] = useState<{
    idx: number;
    project: { request_id: string; reference_number: string | null; customer_label: string };
    prefill: {
      description: string;
      amount: number;
      vatRate: number;
      notes: string;
      providerName: string;
      bookingReference: string;
    };
  } | null>(null);

  useEffect(() => {
    if (open && inboxItem) {
      void parse();
    } else {
      setData(null);
      setBookings([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, inboxItem?.id]);

  async function parse() {
    if (!inboxItem) return;
    setLoading(true);
    try {
      const { data: resp, error } = await supabase.functions.invoke<ParseResponse>(
        "parse-collective-invoice",
        { body: { inbox_id: inboxItem.id } },
      );
      if (error || !resp || (resp as any).error) {
        throw new Error((resp as any)?.error || error?.message || "Parse mislukt");
      }
      setData(resp);
      setBookings(resp.bookings);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Parse mislukt");
    } finally {
      setLoading(false);
    }
  }

  const sumIncl = useMemo(
    () => bookings.reduce((s, b) => s + (b.amount_incl_vat || 0), 0),
    [bookings],
  );
  const totalsMatch = data
    ? Math.abs(sumIncl - data.invoice.total_incl_vat) < 0.05
    : false;
  const allResolved = bookings.every(
    (b) => b.match_status !== "unmatched" && b.match_status !== "ambiguous",
  );

  function updateBooking(idx: number, patch: Partial<Booking>) {
    setBookings((prev) => prev.map((b, i) => (i === idx ? { ...b, ...patch } : b)));
  }

  function chooseCandidate(idx: number, candidateItemId: string) {
    const b = bookings[idx];
    const cand = b.candidates.find((c) => c.item_id === candidateItemId);
    if (!cand) return;
    updateBooking(idx, {
      item_id: candidateItemId,
      match_status: "manual",
      project: {
        request_id: cand.request_id,
        reference_number: cand.reference_number,
        customer_label: cand.customer_label,
      },
    });
  }

  function markInternal(idx: number) {
    updateBooking(idx, { match_status: "internal", item_id: null, project: null });
  }

  function linkManual(idx: number, cand: Candidate) {
    updateBooking(idx, {
      item_id: cand.item_id,
      match_status: "manual",
      project: {
        request_id: cand.request_id,
        reference_number: cand.reference_number,
        customer_label: cand.customer_label,
      },
    });
  }

  async function bookAsExtraOnProject(
    idx: number,
    project: { request_id: string; reference_number: string | null; customer_label: string },
  ) {
    const b = bookings[idx];
    try {
      // Bereken effectief BTW-tarief uit de regel (0/9/21) — Doeksen-overtocht = 9%, TB = 0%
      const vatRate = b.amount_excl_vat > 0
        ? Math.round((b.vat_amount / b.amount_excl_vat) * 100)
        : 9;
      const datesLabel = (b.departure_dates || []).join(" / ");
      const description = `Overtocht Rederij Doeksen${datesLabel ? ` — ${datesLabel}` : ""}`;
      const notes = `Verzamelfactuur Doeksen · Resnr ${b.resnr}${b.customer_name ? ` · ${b.customer_name}` : ""}`;

      const { data: created, error } = await supabase
        .from("program_request_items")
        .insert({
          request_id: project.request_id,
          block_id: null as never,
          block_name: description,
          block_category: "overig",
          block_type: "bureau",
          provider_name: "Rederij Doeksen",
          provider_id: "bureau",
          day_index: -1,
          status: "confirmed",
          booking_reference: b.resnr,
          admin_price_override: b.amount_incl_vat,
          admin_price_notes: notes,
          price_type: "total",
          vat_rate: vatRate,
          skip_partner_notification: true,
        } as never)
        .select("id")
        .single();
      if (error || !created) throw error || new Error("Aanmaken mislukt");
      updateBooking(idx, {
        item_id: (created as { id: string }).id,
        match_status: "manual",
        project,
      });
      toast.success(
        `Toegevoegd als overige kosten bij ${project.reference_number || project.customer_label}`,
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Aanmaken mislukt");
    }
  }

  async function finalize() {
    if (!data || !inboxItem) return;
    setForwarding(true);
    try {
      const { data: resp, error } = await supabase.functions.invoke(
        "finalize-collective-invoice",
        {
          body: {
            inbox_id: inboxItem.id,
            partner_id: partnerId,
            invoice: data.invoice,
            bookings: bookings.map((b) => ({
              resnr: b.resnr,
              customer_name: b.customer_name,
              departure_dates: b.departure_dates,
              routes: b.routes,
              amount_excl_vat: b.amount_excl_vat,
              vat_amount: b.vat_amount,
              amount_incl_vat: b.amount_incl_vat,
              tourist_tax: b.tourist_tax,
              supplier_commission: b.supplier_commission,
              match_status: b.match_status,
              item_id: b.item_id,
            })),
            forward_to_snelstart: forwardToSnelstart,
            origin: window.location.origin,
          },
        },
      );
      if (error || (resp as any)?.error) {
        throw new Error((resp as any)?.error || error?.message || "Verwerken mislukt");
      }
      toast.success(
        forwardToSnelstart
          ? "Verzamelfactuur opgeslagen en doorgestuurd naar Snelstart"
          : "Verzamelfactuur opgeslagen",
      );
      qc.invalidateQueries({ queryKey: ["purchase-invoice-inbox"] });
      qc.invalidateQueries({ queryKey: ["purchase-invoices"] });
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Verwerken mislukt");
    } finally {
      setForwarding(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={(v) => !v && !forwarding && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-3xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Verzamelfactuur verwerken</SheetTitle>
          <SheetDescription>
            Eén factuur, meerdere klantboekingen. Controleer de matches en stuur in één keer door.
          </SheetDescription>
        </SheetHeader>

        {loading && (
          <div className="space-y-3 mt-6">
            <Skeleton className="h-20" />
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
          </div>
        )}

        {!loading && data && (
          <div className="mt-6 space-y-5">
            {/* Header */}
            <div className="rounded-lg border bg-muted/30 p-4">
              <div className="flex items-baseline justify-between">
                <div>
                  <div className="text-xs text-muted-foreground">{data.invoice.supplier_name}</div>
                  <div className="text-lg font-semibold">
                    Factuur {data.invoice.invoice_number}
                  </div>
                  <div className="text-sm text-muted-foreground">{data.invoice.invoice_date}</div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-muted-foreground">Totaal incl. BTW</div>
                  <div className="text-xl font-bold font-mono">
                    {EUR(data.invoice.total_incl_vat)}
                  </div>
                  <div className="text-xs text-emerald-700">
                    Commissie BV: {EUR(data.invoice.total_supplier_commission)}
                  </div>
                </div>
              </div>
            </div>

            {/* Booking rows */}
            <div className="space-y-2">
              {bookings.map((b, idx) => (
                <BookingRow
                  key={b.resnr + idx}
                  booking={b}
                  usedItemIds={bookings.map((x) => x.item_id).filter((x): x is string => !!x)}
                  onChooseCandidate={(id) => chooseCandidate(idx, id)}
                  onMarkInternal={() => markInternal(idx)}
                  onLinkManual={(cand) => linkManual(idx, cand)}
                  onBookOnProject={(project) => bookAsExtraOnProject(idx, project)}
                />
              ))}
            </div>

            {/* Footer totals + actions */}
            <div className="sticky bottom-0 -mx-6 px-6 py-4 border-t bg-background space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Som regels</span>
                <span className={`font-mono font-semibold ${totalsMatch ? "text-emerald-700" : "text-red-700"}`}>
                  {EUR(sumIncl)} {totalsMatch ? "✓" : `(verschil ${EUR(sumIncl - data.invoice.total_incl_vat)})`}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <Checkbox
                  id="fwd"
                  checked={forwardToSnelstart}
                  onCheckedChange={(v) => setForwardToSnelstart(!!v)}
                />
                <label htmlFor="fwd" className="text-sm">
                  Direct doorsturen naar Snelstart na opslaan
                </label>
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="ghost" onClick={onClose} disabled={forwarding}>
                  Annuleren
                </Button>
                <Button
                  onClick={finalize}
                  disabled={forwarding || !totalsMatch || !allResolved}
                  title={
                    !totalsMatch
                      ? "Totalen kloppen niet"
                      : !allResolved
                      ? "Eerst alle regels resolven"
                      : undefined
                  }
                >
                  {forwarding ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : forwardToSnelstart ? (
                    <Send className="h-4 w-4 mr-2" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                  )}
                  {forwardToSnelstart ? "Goedkeuren + doorsturen" : "Alleen opslaan"}
                </Button>
              </div>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

function BookingRow({
  booking,
  usedItemIds,
  onChooseCandidate,
  onMarkInternal,
  onLinkManual,
  onBookOnProject,
}: {
  booking: Booking;
  usedItemIds: string[];
  onChooseCandidate: (itemId: string) => void;
  onMarkInternal: () => void;
  onLinkManual: (cand: Candidate) => void;
  onBookOnProject: (project: { request_id: string; reference_number: string | null; customer_label: string }) => void | Promise<void>;
}) {
  const icon = {
    matched: <CheckCircle2 className="h-4 w-4 text-emerald-600" />,
    manual: <CheckCircle2 className="h-4 w-4 text-emerald-600" />,
    ambiguous: <AlertTriangle className="h-4 w-4 text-amber-600" />,
    unmatched: <XCircle className="h-4 w-4 text-red-600" />,
    internal: <MinusCircle className="h-4 w-4 text-slate-500" />,
  }[booking.match_status];

  const statusColor = {
    matched: "border-emerald-200 bg-emerald-50/40",
    manual: "border-emerald-200 bg-emerald-50/40",
    ambiguous: "border-amber-200 bg-amber-50/40",
    unmatched: "border-red-200 bg-red-50/40",
    internal: "border-slate-200 bg-slate-50/40",
  }[booking.match_status];

  return (
    <div className={`rounded-md border p-3 text-sm ${statusColor}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2 min-w-0 flex-1">
          {icon}
          <div className="min-w-0">
            <div className="font-medium truncate">
              <span className="font-mono text-xs text-muted-foreground mr-2">{booking.resnr}</span>
              {booking.customer_name}
            </div>
            <div className="text-xs text-muted-foreground">
              {booking.departure_dates?.join(" → ")} {booking.routes?.length ? `· ${booking.routes.join("/")}` : ""}
              {booking.tourist_tax > 0 && ` · TB ${EUR(booking.tourist_tax)}`}
            </div>
          </div>
        </div>
        <div className="text-right shrink-0">
          <div className="font-mono font-semibold">{EUR(booking.amount_incl_vat)}</div>
          {booking.supplier_commission > 0 && (
            <div className="text-xs text-emerald-700">−{EUR(booking.supplier_commission)} comm.</div>
          )}
        </div>
      </div>

      {/* Project link / picker */}
      <div className="mt-2 pl-6 text-xs">
        {(booking.match_status === "matched" || booking.match_status === "manual") && booking.project && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-muted-foreground">→ Project</span>
            <a
              href={`/admin/projecten/${booking.project.request_id}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-primary hover:underline"
            >
              {booking.project.reference_number || booking.project.customer_label}
              <ExternalLink className="h-3 w-3" />
            </a>
            {booking.match_status === "manual" && (
              <ManualLinkPopover
                defaultQuery={booking.customer_name}
                usedItemIds={usedItemIds}
                triggerLabel="Wijzig…"
                onPick={onLinkManual}
              />
            )}
          </div>
        )}

        {booking.match_status === "ambiguous" && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-muted-foreground">Meerdere kandidaten:</span>
            <Select onValueChange={onChooseCandidate}>
              <SelectTrigger className="h-7 w-[280px] text-xs">
                <SelectValue placeholder="Kies project…" />
              </SelectTrigger>
              <SelectContent>
                {booking.candidates.map((c) => (
                  <SelectItem key={c.item_id} value={c.item_id}>
                    {c.reference_number || "—"} · {c.customer_label} · {c.block_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <ManualLinkPopover
              defaultQuery={booking.customer_name}
              usedItemIds={usedItemIds}
              triggerLabel="Anders zoeken…"
              onPick={onLinkManual}
            />
          </div>
        )}

        {booking.match_status === "unmatched" && (
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className="text-red-700 border-red-300">
              Geen ticket gevonden voor Resnr {booking.resnr}
            </Badge>
            <ManualLinkPopover
              defaultQuery={booking.customer_name}
              usedItemIds={usedItemIds}
              triggerLabel="Koppel handmatig…"
              onPick={onLinkManual}
            />
            <ProjectPickerPopover
              defaultQuery={booking.customer_name}
              onPick={onBookOnProject}
            />
            <Button size="sm" variant="ghost" className="h-6 text-xs" onClick={onMarkInternal}>
              Markeer als intern
            </Button>
          </div>
        )}

        {booking.match_status === "internal" && (
          <span className="text-muted-foreground italic">Interne kostenpost — geen klantproject</span>
        )}
      </div>
    </div>
  );
}

function ManualLinkPopover({
  defaultQuery,
  usedItemIds,
  triggerLabel,
  onPick,
}: {
  defaultQuery: string;
  usedItemIds: string[];
  triggerLabel: string;
  onPick: (cand: Candidate) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(defaultQuery ?? "");
  const [results, setResults] = useState<Candidate[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    const handle = setTimeout(() => void search(query), 200);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, query]);

  async function search(q: string) {
    setBusy(true);
    try {
      let req = supabase
        .from("program_request_items")
        .select(`
          id, request_id, block_name, booking_reference,
          program_requests!inner(id, reference_number, customer_name, customer_company, status, selected_dates)
        `)
        .eq("provider_id", "rederij")
        .not("program_requests.status", "in", "(cancelled,deleted)")
        .order("created_at", { ascending: false })
        .limit(40);

      const term = q.trim();
      if (term.length >= 2) {
        // OR over: ref number, customer name/company op de joined tabel, of booking_reference
        req = req.or(
          `booking_reference.ilike.%${term}%,program_requests.reference_number.ilike.%${term}%,program_requests.customer_name.ilike.%${term}%,program_requests.customer_company.ilike.%${term}%`,
        );
      }

      const { data, error } = await req;
      if (error) throw error;
      const mapped: Candidate[] = (data ?? [])
        .filter((r: any) => !usedItemIds.includes(r.id))
        .map((r: any) => ({
          item_id: r.id,
          request_id: r.request_id,
          reference_number: r.program_requests?.reference_number ?? null,
          customer_label:
            r.program_requests?.customer_company || r.program_requests?.customer_name || "—",
          block_name: r.booking_reference
            ? `${r.block_name} · al gekoppeld aan ${r.booking_reference}`
            : r.block_name,
        }));
      setResults(mapped);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Zoeken mislukt");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button size="sm" variant="outline" className="h-6 text-xs">
          <Link2 className="h-3 w-3 mr-1" />
          {triggerLabel}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[420px] p-0">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Zoek op klant, projectreferentie of Resnr…"
            value={query}
            onValueChange={setQuery}
          />
          <CommandList>
            {busy && <div className="p-3 text-xs text-muted-foreground">Zoeken…</div>}
            {!busy && results.length === 0 && (
              <CommandEmpty>Geen ferry-tickets gevonden.</CommandEmpty>
            )}
            <CommandGroup>
              {results.map((c) => (
                <CommandItem
                  key={c.item_id}
                  value={c.item_id}
                  onSelect={() => {
                    onPick(c);
                    setOpen(false);
                  }}
                  className="flex flex-col items-start gap-0.5"
                >
                  <div className="text-sm">
                    <span className="font-mono text-xs text-muted-foreground mr-2">
                      {c.reference_number || "—"}
                    </span>
                    {c.customer_label}
                  </div>
                  <div className="text-xs text-muted-foreground">{c.block_name}</div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

function ProjectPickerPopover({
  defaultQuery,
  onPick,
}: {
  defaultQuery: string;
  onPick: (project: { request_id: string; reference_number: string | null; customer_label: string }) => void | Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(defaultQuery ?? "");
  const [results, setResults] = useState<
    { request_id: string; reference_number: string | null; customer_label: string; sub: string }[]
  >([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    const handle = setTimeout(() => void search(query), 200);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, query]);

  async function search(q: string) {
    setBusy(true);
    try {
      let req = supabase
        .from("program_requests")
        .select("id, reference_number, customer_name, customer_company, status, selected_dates")
        .not("status", "in", "(cancelled,deleted)")
        .order("created_at", { ascending: false })
        .limit(40);

      const term = q.trim();
      if (term.length >= 2) {
        req = req.or(
          `reference_number.ilike.%${term}%,customer_name.ilike.%${term}%,customer_company.ilike.%${term}%`,
        );
      }
      const { data, error } = await req;
      if (error) throw error;
      const mapped = (data ?? []).map((r: any) => {
        const dates: string[] = Array.isArray(r.selected_dates) ? r.selected_dates : [];
        const dateLabel = dates.length ? dates[0] : "";
        return {
          request_id: r.id as string,
          reference_number: (r.reference_number ?? null) as string | null,
          customer_label: (r.customer_company || r.customer_name || "—") as string,
          sub: [r.status, dateLabel].filter(Boolean).join(" · "),
        };
      });
      setResults(mapped);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Zoeken mislukt");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button size="sm" variant="outline" className="h-6 text-xs">
          <Link2 className="h-3 w-3 mr-1" />
          Boek als losse kosten op project…
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[420px] p-0">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Zoek op klant, bedrijf of projectreferentie…"
            value={query}
            onValueChange={setQuery}
          />
          <CommandList>
            {busy && <div className="p-3 text-xs text-muted-foreground">Zoeken…</div>}
            {!busy && results.length === 0 && (
              <CommandEmpty>Geen projecten gevonden.</CommandEmpty>
            )}
            <CommandGroup>
              {results.map((r) => (
                <CommandItem
                  key={r.request_id}
                  value={r.request_id}
                  onSelect={async () => {
                    setOpen(false);
                    await onPick({
                      request_id: r.request_id,
                      reference_number: r.reference_number,
                      customer_label: r.customer_label,
                    });
                  }}
                  className="flex flex-col items-start gap-0.5"
                >
                  <div className="text-sm">
                    <span className="font-mono text-xs text-muted-foreground mr-2">
                      {r.reference_number || "—"}
                    </span>
                    {r.customer_label}
                  </div>
                  {r.sub && <div className="text-xs text-muted-foreground">{r.sub}</div>}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
