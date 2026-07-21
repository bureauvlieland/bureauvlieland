import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import {
  Clock,
  AlertTriangle,
  CheckCircle2,
  Receipt,
  CalendarCheck,
  ArrowRight,
  XCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type {
  PartnerItem,
  PartnerAccommodationQuote,
  PartnerDashboardData,
} from "@/types/partner";
import { hasOpenAdminPriceChange, getNumberOfDays } from "@/lib/portalPricing";
import { DismissInvoiceDialog } from "./DismissInvoiceDialog";
import { canPartnerDismissInvoiceItem } from "@/lib/partnerInvoiceDismiss";

interface Props {
  data: PartnerDashboardData;
  onDismissed?: () => void;
}

type Bucket = "review" | "changes" | "schedule" | "invoice";

interface WerkbankRow {
  id: string;
  bucket: Bucket;
  href: string;
  reference: string | null;
  customerLabel: string;
  date: Date | null;
  itemLabel: string;
  hint: string;
  dismissable?: boolean;
}

const BUCKET_META: Record<Bucket, { label: string; description: string; icon: React.ReactNode; tone: string }> = {
  review: {
    label: "Beoordelen",
    description: "Nieuwe aanvragen die op uw reactie wachten.",
    icon: <Clock className="h-4 w-4" />,
    tone: "text-amber-700",
  },
  changes: {
    label: "Wijzigingen",
    description: "Bureau Vlieland of de klant heeft de aanvraag aangepast.",
    icon: <AlertTriangle className="h-4 w-4" />,
    tone: "text-orange-700",
  },
  schedule: {
    label: "Inplannen",
    description: "Bevestigd door de klant — datum/tijd vastleggen.",
    icon: <CalendarCheck className="h-4 w-4" />,
    tone: "text-blue-700",
  },
  invoice: {
    label: "Factureren",
    description: "Uitgevoerd — factuur registreren of sluiten als er geen factuur volgt.",
    icon: <Receipt className="h-4 w-4" />,
    tone: "text-emerald-700",
  },
};

const BUCKET_ORDER: Bucket[] = ["review", "changes", "schedule", "invoice"];

function buildRows(data: PartnerDashboardData): WerkbankRow[] {
  const rows: WerkbankRow[] = [];

  data.items.forEach(i => {
    if (i.is_concept) return;
    if (i.invoiced_number || i.status === "invoiced") return;
    if ((i as any).partner_dismissed_at) return;
    const req = i.program_requests;
    if (req.cancelled_at || req.status === "cancelled" || i.status === "cancelled" || i.status === "unavailable") return;

    const customerLabel = req.customer_company || req.customer_name;
    const dates = (req.selected_dates || []) as string[];
    const dateStr = dates[i.day_index] || dates[0];
    const date = dateStr ? new Date(dateStr) : null;
    const base = {
      id: i.id,
      href: `/partner/project/${req.id}`,
      reference: req.reference_number ?? null,
      customerLabel,
      date,
      itemLabel: i.block_name,
    };

    if (i.status === "pending" || i.status === "counter_proposed") {
      rows.push({ ...base, bucket: "review", hint: "Beoordeel deze aanvraag." });
      return;
    }

    // Skip further buckets once uitgevoerd/gefactureerd staat vast, behalve invoice.
    const effPeople = i.override_people ?? req.number_of_people ?? 1;
    const numDays = getNumberOfDays(dates);
    if (!i.executed_at && i.status !== "executed" && hasOpenAdminPriceChange(i as any, effPeople, numDays)) {
      rows.push({ ...base, bucket: "changes", hint: "Bureau Vlieland heeft de prijs/aantallen aangepast." });
      return;
    }

    const customerOk = i.customer_accepted_at || i.customer_approved_at;
    const isConfirmed = i.status === "confirmed" || i.status === "accepted";
    if (isConfirmed && customerOk && !i.executed_at && req.terms_accepted_at) {
      if (!i.confirmed_time && !i.proposed_time) {
        rows.push({ ...base, bucket: "schedule", hint: "Plan tijd in en bevestig." });
        return;
      }
    }

    const canInvoice =
      (i.status === "accepted" || i.status === "executed" || (i.status === "confirmed" && customerOk)) &&
      !i.invoiced_number &&
      req.terms_accepted_at;
    if (canInvoice) {
      const dismissable = canPartnerDismissInvoiceItem({
        status: i.status,
        invoiced_number: i.invoiced_number ?? null,
        partner_dismissed_at: (i as any).partner_dismissed_at ?? null,
      });
      rows.push({ ...base, bucket: "invoice", hint: "Registreer uw factuur.", dismissable });
    }
  });

  (data.accommodationQuotes ?? []).forEach(q => {
    const r = q.accommodation_requests;
    if (q.status === "cancelled" || q.status === "rejected" || q.status === "declined" || r.status === "cancelled")
      return;
    if (q.invoiced_number || q.status === "invoiced" || q.status === "executed") return;
    const customerLabel = r.customer_company || r.customer_name;
    const date = r.arrival_date ? new Date(r.arrival_date) : null;
    const base = {
      id: q.id,
      href: `/partner/logies/${r.id}`,
      reference: (r as any).reference_number ?? null,
      customerLabel,
      date,
      itemLabel: q.accommodation_name || "Logiesaanvraag",
    };

    if (q.status === "pending") {
      rows.push({ ...base, bucket: "review", hint: "Beoordeel deze logiesaanvraag." });
      return;
    }

    if (q.status === "selected" && !q.invoiced_number) {
      rows.push({ ...base, bucket: "invoice", hint: "Registreer factuur voor logies." });
    }
  });

  return rows.sort((a, b) => {
    if (!a.date && !b.date) return 0;
    if (!a.date) return 1;
    if (!b.date) return -1;
    return a.date.getTime() - b.date.getTime();
  });
}

export function PartnerWerkbankList({ data, onDismissed }: Props) {
  const [searchParams] = useSearchParams();
  const impersonate = searchParams.get("impersonate");
  const urlSuffix = impersonate ? `?impersonate=${impersonate}` : "";
  const [dismissTarget, setDismissTarget] = useState<{ id: string; label: string } | null>(null);
  const partnerToken = (data.partner as any).partner_token as string | undefined;

  const grouped = useMemo(() => {
    const rows = buildRows(data);
    const map = new Map<Bucket, WerkbankRow[]>();
    rows.forEach(r => {
      const arr = map.get(r.bucket) ?? [];
      arr.push(r);
      map.set(r.bucket, arr);
    });
    return BUCKET_ORDER.map(b => ({ bucket: b, items: map.get(b) ?? [] }));
  }, [data]);

  const total = grouped.reduce((s, g) => s + g.items.length, 0);
  if (total === 0) {
    return (
      <Card className="p-12 text-center">
        <CheckCircle2 className="mx-auto mb-3 h-10 w-10 text-emerald-600" />
        <h3 className="text-lg font-semibold">Geen openstaande acties</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Alles staat in de wacht bij de klant of Bureau Vlieland.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {grouped.map(({ bucket, items }) => {
        if (items.length === 0) return null;
        const meta = BUCKET_META[bucket];
        return (
          <section key={bucket}>
            <div className="mb-2 flex items-baseline justify-between">
              <div className="flex items-center gap-2">
                <span className={meta.tone}>{meta.icon}</span>
                <h2 className="text-base font-semibold">{meta.label}</h2>
                <Badge variant="secondary">{items.length}</Badge>
              </div>
              <p className="text-xs text-muted-foreground">{meta.description}</p>
            </div>
            <Card className="divide-y">
              {items.map(row => (
                <div
                  key={`${row.bucket}-${row.id}`}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-muted/40 transition-colors"
                >
                  <Link to={`${row.href}${urlSuffix}`} className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium truncate">{row.itemLabel}</span>
                      {row.reference && (
                        <span className="font-mono text-[11px] text-muted-foreground">{row.reference}</span>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground truncate">
                      {row.customerLabel}
                      {row.date && ` · ${format(row.date, "EEE d MMM", { locale: nl })}`}
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">{row.hint}</div>
                  </Link>
                  {row.bucket === "invoice" && row.dismissable && partnerToken && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="shrink-0 text-muted-foreground hover:text-destructive"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setDismissTarget({ id: row.id, label: row.itemLabel });
                      }}
                      title="Geen factuur — sluiten"
                    >
                      <XCircle className="mr-1 h-3.5 w-3.5" />
                      Geen factuur
                    </Button>
                  )}
                  <Link to={`${row.href}${urlSuffix}`} className="shrink-0">
                    <Button variant="ghost" size="sm">
                      Openen <ArrowRight className="ml-1 h-3 w-3" />
                    </Button>
                  </Link>
                </div>
              ))}
            </Card>
          </section>
        );
      })}
      {dismissTarget && partnerToken && (
        <DismissInvoiceDialog
          open
          onOpenChange={(o) => !o && setDismissTarget(null)}
          itemId={dismissTarget.id}
          itemLabel={dismissTarget.label}
          partnerToken={partnerToken}
          onDismissed={() => {
            setDismissTarget(null);
            onDismissed?.();
          }}
        />
      )}
    </div>
  );
}

