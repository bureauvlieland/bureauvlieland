import { useMemo, useState } from "react";
import { format, parseISO } from "date-fns";
import { nl } from "date-fns/locale";
import {
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  MessageSquare,
  FileText,
  ChevronDown,
  ChevronUp,
  Loader2,
  AlertCircle,
  Info,
  Play,
  MapPin,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import type { PartnerItem } from "@/types/partner";
import {
  getDisplayLineTotal,
  getNumberOfDays,
  hasOpenAdminPriceChange as detectOpenAdminPriceChange,
  isPerPersonItem,
  isPerDayItem,
} from "@/lib/portalPricing";

type Mode = "idle" | "confirm" | "alternative" | "unavailable" | "counter_price";

interface Props {
  item: PartnerItem;
  onStatusUpdate: (
    status: string,
    note?: string,
    quotedPrice?: number,
    quotedNotes?: string,
    proposedTime?: string,
    proposedDate?: string,
  ) => Promise<boolean>;
  onRegisterInvoice: () => void;
  onOpenDetails: () => void;
}

const statusStyle: Record<string, string> = {
  pending: "bg-primary/10 text-primary",
  confirmed: "bg-green-100 text-green-800 dark:bg-green-950/50 dark:text-green-300",
  accepted: "bg-blue-100 text-blue-800 dark:bg-blue-950/50 dark:text-blue-300",
  executed: "bg-purple-100 text-purple-800 dark:bg-purple-950/50 dark:text-purple-300",
  invoiced: "bg-muted text-muted-foreground",
  unavailable: "bg-destructive/10 text-destructive",
  cancelled: "bg-muted text-muted-foreground",
  alternative: "bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300",
  counter_proposed: "bg-purple-100 text-purple-800 dark:bg-purple-950/50 dark:text-purple-300",
};

const statusLabel: Record<string, string> = {
  pending: "Nieuw — actie vereist",
  confirmed: "Bevestigd",
  accepted: "Klant akkoord",
  executed: "Uitgevoerd",
  invoiced: "Gefactureerd",
  unavailable: "Niet beschikbaar",
  cancelled: "Geannuleerd",
  alternative: "Alternatief voorgesteld",
  counter_proposed: "Tegenvoorstel klant",
};

const formatEur = (n: number) =>
  n.toLocaleString("nl-NL", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const PartnerProjectItemRow = ({
  item,
  onStatusUpdate,
  onRegisterInvoice,
  onOpenDetails,
}: Props) => {
  const [mode, setMode] = useState<Mode>("idle");
  const [price, setPrice] = useState("");
  const [notes, setNotes] = useState("");
  const [time, setTime] = useState(item.preferred_time || "");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const request = item.program_requests;
  const dates = request.selected_dates || [];
  const activityDate = dates[item.day_index];
  const numDays = getNumberOfDays(request.selected_dates);
  const effectivePeople = item.override_people ?? request.number_of_people;

  const hasCustomerAccepted = !!item.customer_accepted_at || !!item.customer_approved_at;
  const effectiveStatus =
    item.status === "confirmed" && hasCustomerAccepted ? "accepted" : item.status;

  const canRespond =
    item.status === "pending" || item.status === "alternative" || item.status === "counter_proposed";
  const canInvoice =
    (effectiveStatus === "accepted" || effectiveStatus === "executed") &&
    !item.invoiced_number &&
    request.terms_accepted_at !== null;
  const awaitingTerms =
    (effectiveStatus === "accepted" || effectiveStatus === "executed") &&
    !item.invoiced_number &&
    request.terms_accepted_at === null;
  const canMarkExecuted = effectiveStatus === "accepted" && !!item.quoted_price;

  // Admin price change
  const adminTotal = useMemo(() => {
    if (item.admin_price_override == null) return null;
    return (
      item.admin_price_override *
      (isPerPersonItem(item) ? effectivePeople : 1) *
      (isPerDayItem(item) ? numDays : 1)
    );
  }, [item, effectivePeople, numDays]);

  const openPriceChange =
    !!item.quoted_price &&
    detectOpenAdminPriceChange(item as any, effectivePeople, numDays) &&
    !item.invoiced_number &&
    item.status !== "cancelled" &&
    item.status !== "executed";

  const lineTotal = getDisplayLineTotal(item, effectivePeople, numDays);
  const effectiveTime = item.confirmed_time || item.proposed_time || item.preferred_time;

  const reset = () => {
    setMode("idle");
    setPrice("");
    setNotes("");
    setReason("");
    setError("");
    setTime(item.preferred_time || "");
  };

  const openMode = (m: Mode) => {
    setError("");
    if (m === "confirm" || m === "counter_price") {
      const seed = adminTotal ?? item.quoted_price ?? null;
      if (seed != null) setPrice(seed.toFixed(2).replace(".", ","));
    }
    setMode(m);
  };

  const submitConfirm = async () => {
    const p = parseFloat(price.replace(",", "."));
    if (!price || isNaN(p) || p <= 0) {
      setError("Vul een geldige prijs in.");
      return;
    }
    setBusy(true);
    const ok = await onStatusUpdate(
      "confirmed",
      undefined,
      p,
      notes || undefined,
      item.preferred_time || undefined,
    );
    setBusy(false);
    if (ok) reset();
  };

  const submitUnavailable = async () => {
    setBusy(true);
    const ok = await onStatusUpdate("unavailable", reason || undefined);
    setBusy(false);
    if (ok) reset();
  };

  const submitAcceptPriceChange = async () => {
    if (adminTotal == null) return;
    setBusy(true);
    await onStatusUpdate(
      "acknowledge_price_change",
      undefined,
      adminTotal,
      "Akkoord met prijswijziging Bureau Vlieland",
    );
    setBusy(false);
  };

  const submitCounterPrice = async () => {
    const p = parseFloat(price.replace(",", "."));
    if (!price || isNaN(p) || p <= 0) {
      setError("Vul een geldige prijs in.");
      return;
    }
    setBusy(true);
    const ok = await onStatusUpdate(
      "acknowledge_price_change",
      undefined,
      p,
      notes || undefined,
    );
    setBusy(false);
    if (ok) reset();
  };

  const submitExecuted = async () => {
    setBusy(true);
    await onStatusUpdate("executed");
    setBusy(false);
  };

  return (
    <div className="rounded-lg border bg-card overflow-hidden">
      {/* Header row */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 p-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-medium truncate">{item.block_name}</h3>
            <Badge
              variant="outline"
              className={cn("border-0 font-normal text-xs", statusStyle[effectiveStatus] || statusStyle.pending)}
            >
              {statusLabel[effectiveStatus] || effectiveStatus}
            </Badge>
            {item.version > 1 && (
              <Badge variant="outline" className="text-xs border-amber-300 text-amber-700 dark:text-amber-300">
                v{item.version}
              </Badge>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs text-muted-foreground">
            {activityDate && (
              <span className="inline-flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {format(parseISO(activityDate), "EEE d MMM", { locale: nl })}
              </span>
            )}
            {effectiveTime && (
              <span className="inline-flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {effectiveTime}
              </span>
            )}
            {lineTotal != null && (
              <span className="font-medium text-foreground">€{formatEur(lineTotal)}</span>
            )}
          </div>
        </div>

        {/* Action cluster */}
        <div className="flex flex-wrap items-center gap-2 sm:justify-end shrink-0">
          {canRespond && mode === "idle" && (
            <>
              <Button size="sm" onClick={() => openMode("confirm")}>
                <CheckCircle2 className="h-4 w-4 mr-1" />
                Bevestigen
              </Button>
              <Button size="sm" variant="outline" onClick={onOpenDetails}>
                Alternatief
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="text-destructive hover:text-destructive"
                onClick={() => openMode("unavailable")}
              >
                <XCircle className="h-4 w-4 mr-1" />
                Afwijzen
              </Button>
            </>
          )}
          {canInvoice && mode === "idle" && (
            <Button size="sm" onClick={onRegisterInvoice}>
              <FileText className="h-4 w-4 mr-1" />
              Factuur registreren
            </Button>
          )}
          {canMarkExecuted && mode === "idle" && (
            <Button size="sm" variant="outline" onClick={submitExecuted} disabled={busy}>
              <Play className="h-4 w-4 mr-1" />
              Markeer uitgevoerd
            </Button>
          )}
          <Button
            size="sm"
            variant="ghost"
            onClick={onOpenDetails}
            className="text-muted-foreground"
            title="Volledige details bekijken"
          >
            <Info className="h-4 w-4" />
            <span className="sr-only">Details</span>
          </Button>
        </div>
      </div>

      {/* Awaiting terms hint */}
      {awaitingTerms && mode === "idle" && (
        <div className="px-4 pb-3 -mt-1 flex items-center gap-2 text-xs text-muted-foreground">
          <AlertCircle className="h-3 w-3" />
          Wacht op klantakkoord op voorwaarden voordat u kunt factureren.
        </div>
      )}

      {/* Customer notes inline (small, no dup) */}
      {item.customer_notes && mode === "idle" && (
        <div className="px-4 pb-3 -mt-1 text-xs text-muted-foreground">
          <span className="font-medium">Klant:</span> {item.customer_notes}
        </div>
      )}

      {/* Admin price-change banner */}
      {openPriceChange && adminTotal != null && mode !== "counter_price" && (
        <div className="border-t bg-amber-50 dark:bg-amber-950/30 px-4 py-3">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <div className="flex-1 text-sm">
              <p className="font-medium text-amber-900 dark:text-amber-200">
                Nieuwe prijs voorgesteld: €{formatEur(adminTotal)}
              </p>
              {item.admin_price_notes && (
                <p className="text-xs text-amber-800/80 dark:text-amber-300/80 mt-0.5">
                  {item.admin_price_notes}
                </p>
              )}
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={submitAcceptPriceChange} disabled={busy}>
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Akkoord"}
              </Button>
              <Button size="sm" variant="outline" onClick={() => openMode("counter_price")}>
                Tegenvoorstel
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Inline forms */}
      {mode === "confirm" && (
        <div className="border-t bg-muted/30 px-4 py-3 space-y-3">
          <div className="grid sm:grid-cols-[1fr_2fr] gap-3">
            <div>
              <Label htmlFor={`price-${item.id}`} className="text-xs">
                Prijs (totaal, incl. btw) *
              </Label>
              <div className="relative mt-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">€</span>
                <Input
                  id={`price-${item.id}`}
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="0,00"
                  className="pl-7"
                  inputMode="decimal"
                />
              </div>
            </div>
            <div>
              <Label htmlFor={`notes-${item.id}`} className="text-xs">
                Toelichting (optioneel)
              </Label>
              <Input
                id={`notes-${item.id}`}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Bv. inclusief koffie/thee"
                className="mt-1"
              />
            </div>
          </div>
          {error && <p className="text-xs text-destructive">{error}</p>}
          <div className="flex gap-2 justify-end">
            <Button size="sm" variant="ghost" onClick={reset} disabled={busy}>
              Annuleren
            </Button>
            <Button size="sm" onClick={submitConfirm} disabled={busy}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <CheckCircle2 className="h-4 w-4 mr-1" />}
              Bevestigen
            </Button>
          </div>
        </div>
      )}

      {mode === "unavailable" && (
        <div className="border-t bg-muted/30 px-4 py-3 space-y-3">
          <div>
            <Label htmlFor={`reason-${item.id}`} className="text-xs">
              Reden (optioneel)
            </Label>
            <Textarea
              id={`reason-${item.id}`}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Bv. volgeboekt op deze datum"
              rows={2}
              className="mt-1"
            />
          </div>
          <div className="flex gap-2 justify-end">
            <Button size="sm" variant="ghost" onClick={reset} disabled={busy}>
              Annuleren
            </Button>
            <Button size="sm" variant="destructive" onClick={submitUnavailable} disabled={busy}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <XCircle className="h-4 w-4 mr-1" />}
              Afwijzen
            </Button>
          </div>
        </div>
      )}

      {mode === "counter_price" && (
        <div className="border-t bg-amber-50 dark:bg-amber-950/30 px-4 py-3 space-y-3">
          <p className="text-xs text-amber-900 dark:text-amber-200">
            Stel een aangepaste prijs voor aan Bureau Vlieland.
          </p>
          <div className="grid sm:grid-cols-[1fr_2fr] gap-3">
            <div>
              <Label htmlFor={`cprice-${item.id}`} className="text-xs">
                Voorstel prijs (totaal) *
              </Label>
              <div className="relative mt-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">€</span>
                <Input
                  id={`cprice-${item.id}`}
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="0,00"
                  className="pl-7"
                  inputMode="decimal"
                />
              </div>
            </div>
            <div>
              <Label htmlFor={`cnotes-${item.id}`} className="text-xs">
                Toelichting
              </Label>
              <Input
                id={`cnotes-${item.id}`}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Waarom deze prijs?"
                className="mt-1"
              />
            </div>
          </div>
          {error && <p className="text-xs text-destructive">{error}</p>}
          <div className="flex gap-2 justify-end">
            <Button size="sm" variant="ghost" onClick={reset} disabled={busy}>
              Annuleren
            </Button>
            <Button size="sm" onClick={submitCounterPrice} disabled={busy}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <MessageSquare className="h-4 w-4 mr-1" />}
              Verstuur tegenvoorstel
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
