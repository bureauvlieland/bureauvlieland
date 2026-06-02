import { useState, useEffect, useMemo } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { CheckCircle2, AlertTriangle, XCircle, MinusCircle, Loader2, ExternalLink, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import type { PurchaseInvoiceInboxItem } from "@/types/purchaseInvoiceInbox";

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
                  onChooseCandidate={(id) => chooseCandidate(idx, id)}
                  onMarkInternal={() => markInternal(idx)}
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
  onChooseCandidate,
  onMarkInternal,
}: {
  booking: Booking;
  onChooseCandidate: (itemId: string) => void;
  onMarkInternal: () => void;
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
          <div className="flex items-center gap-2">
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
          </div>
        )}

        {booking.match_status === "ambiguous" && (
          <div className="flex items-center gap-2">
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
          </div>
        )}

        {booking.match_status === "unmatched" && (
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-red-700 border-red-300">
              Geen ticket gevonden voor Resnr {booking.resnr}
            </Badge>
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
