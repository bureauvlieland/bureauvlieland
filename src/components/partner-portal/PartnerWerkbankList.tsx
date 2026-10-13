import { useMemo, useState } from "react";
import { Link, useLocation, useSearchParams } from "react-router-dom";
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
import { Button } from "@/components/ui/button";
import { EmptyState, Pill } from "@/components/system";
import { buildWerkbankRows, BUCKET_ORDER, type Bucket, type WerkbankRow } from "@/lib/partnerWerkbank";
import type {
  PartnerItem,
  PartnerAccommodationQuote,
  PartnerDashboardData,
} from "@/types/partner";
import { DismissInvoiceDialog } from "./DismissInvoiceDialog";

interface Props {
  data: PartnerDashboardData;
  onDismissed?: () => void;
}



const BUCKET_META: Record<Bucket, { label: string; description: string; icon: React.ReactNode }> = {
  review: {
    label: "Beoordelen",
    description: "Nieuwe aanvragen die op uw reactie wachten.",
    icon: <Clock className="h-4 w-4" aria-hidden="true" />,
  },
  changes: {
    label: "Wijzigingen",
    description: "Bureau Vlieland of de klant heeft de aanvraag aangepast.",
    icon: <AlertTriangle className="h-4 w-4" aria-hidden="true" />,
  },
  schedule: {
    label: "Inplannen",
    description: "Bevestigd door de klant: leg datum en tijd vast.",
    icon: <CalendarCheck className="h-4 w-4" aria-hidden="true" />,
  },
  invoice: {
    label: "Factureren",
    description: "Uitgevoerd: registreer uw factuur, of sluit het onderdeel als er geen factuur volgt.",
    icon: <Receipt className="h-4 w-4" aria-hidden="true" />,
  },
};



export function PartnerWerkbankList({ data, onDismissed }: Props) {
  const [searchParams] = useSearchParams();
  const impersonate = searchParams.get("impersonate");
  const urlSuffix = impersonate ? `?impersonate=${impersonate}` : "";
  const [dismissTarget, setDismissTarget] = useState<{ id: string; label: string } | null>(null);
  // "Terug" op de projectpagina komt hier terug.
  const location = useLocation();
  const from = `${location.pathname}${location.search}`;
  const partnerToken = (data.partner as { partner_token?: string }).partner_token;

  const grouped = useMemo(() => {
    const rows = buildWerkbankRows(data);
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
      <EmptyState
        icon={<CheckCircle2 />}
        title="Niets te doen"
        description="Alles staat in de wacht bij de klant of bij Bureau Vlieland. U hoort het zodra er iets van u wordt verwacht."
      />
    );
  }

  return (
    <div className="space-y-6">
      {grouped.map(({ bucket, items }) => {
        if (items.length === 0) return null;
        const meta = BUCKET_META[bucket];
        return (
          <section key={bucket} aria-labelledby={`werkbank-${bucket}`}>
            <div className="mb-2 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
              <div className="flex items-center gap-2">
                <span className="text-primary">{meta.icon}</span>
                <h2 id={`werkbank-${bucket}`} className="text-base font-medium">
                  {meta.label}
                </h2>
                <Pill tone="warning" size="sm">
                  {items.length}
                </Pill>
              </div>
              <p className="text-xs text-muted-foreground">{meta.description}</p>
            </div>
            <ul className="divide-y rounded-lg border bg-card">
              {items.map((row) => (
                <li key={`${row.bucket}-${row.id}`} className="flex items-center gap-3 px-4 py-3 transition-colors duration-base hover:bg-muted/40">
                  <Link to={`${row.href}${urlSuffix}`} state={{ from }} className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                      <span className="font-medium">{row.itemLabel}</span>
                      {row.reference && <span className="font-mono text-[11px] text-muted-foreground">{row.reference}</span>}
                    </div>
                    <div className="truncate text-xs text-muted-foreground">
                      {row.customerLabel}
                      {row.date && ` · ${format(row.date, "EEE d MMM", { locale: nl })}`}
                      {row.timeLabel && ` · ${row.timeLabel}`}
                    </div>
                    <div className="mt-0.5 text-xs text-muted-foreground">{row.hint}</div>
                  </Link>
                  {row.bucket === "invoice" && row.dismissable && partnerToken && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="shrink-0 text-muted-foreground"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setDismissTarget({ id: row.id, label: row.itemLabel });
                      }}
                      title="Geen factuur: sluiten"
                    >
                      <XCircle className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
                      Geen factuur
                    </Button>
                  )}
                  <Button asChild variant="ghost" size="sm" className="shrink-0">
                    <Link to={`${row.href}${urlSuffix}`} state={{ from }}>
                      Openen <ArrowRight className="ml-1 h-3 w-3" aria-hidden="true" />
                    </Link>
                  </Button>
                </li>
              ))}
            </ul>
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

