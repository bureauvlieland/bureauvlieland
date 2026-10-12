import { useMemo } from "react";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { Activity, Hotel, Users } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState, Pill } from "@/components/system";
import { cn } from "@/lib/utils";
import { TIME_BUCKET_LABEL, getTimeBucket, isPastDate, type TimeBucket } from "@/lib/projectStatus";
import type { PartnerOverviewRow } from "@/lib/getPartnerProjectsOverview";

/**
 * Alle projecten van de partner in tijdsvakken (partnerportaal fase 2): vanaf
 * `md` een tabel, daaronder een kaartlijst met dezelfde velden. De status
 * komt uit de woordenlijst van de partner (`partnerProjectStatus.ts`), een
 * verstreken datum is een `Pill`.
 */
const BUCKET_ORDER: TimeBucket[] = ["overdue", "this_week", "this_month", "later", "no_date"];

interface Props {
  rows: PartnerOverviewRow[];
}

const isOverdue = (row: PartnerOverviewRow) =>
  !row.isConcept && isPastDate(row.earliestDate) && row.derivedStatus !== "afgerond" && row.derivedStatus !== "geannuleerd";

export function PartnerProjectsTable({ rows }: Props) {
  const [searchParams] = useSearchParams();
  const impersonate = searchParams.get("impersonate");
  const urlSuffix = impersonate ? `?impersonate=${impersonate}` : "";
  // "Terug" op de projectpagina komt hier terug, met tab, zoekterm en archief.
  const location = useLocation();
  const from = `${location.pathname}${location.search}`;

  const grouped = useMemo(() => {
    const map = new Map<TimeBucket, PartnerOverviewRow[]>();
    rows.forEach((r) => {
      const b = getTimeBucket(r.earliestDate);
      const arr = map.get(b) ?? [];
      arr.push(r);
      map.set(b, arr);
    });
    return BUCKET_ORDER.filter((b) => map.has(b)).map((b) => ({ bucket: b, items: map.get(b)! }));
  }, [rows]);

  if (rows.length === 0) {
    return <EmptyState title="Geen projecten gevonden" description="Pas de zoekterm of de filters aan, of kijk in het archief." />;
  }

  return (
    <>
      {/* Vanaf md: de tabel */}
      <div className="hidden overflow-hidden rounded-lg border bg-card md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[150px]">Datum</TableHead>
              <TableHead className="w-[120px]">Referentie</TableHead>
              <TableHead>Klant</TableHead>
              <TableHead className="w-[90px] text-center">Personen</TableHead>
              <TableHead className="w-[110px]">Soort</TableHead>
              <TableHead className="w-[200px]">Status</TableHead>
              <TableHead className="w-[100px] text-center">Onderdelen</TableHead>
              <TableHead className="w-[90px] text-center">Te doen</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {grouped.map(({ bucket, items }) => (
              <Group key={bucket} bucket={bucket} items={items} urlSuffix={urlSuffix} from={from} />
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Onder md: een kaartlijst */}
      <div className="space-y-6 md:hidden">
        {grouped.map(({ bucket, items }) => (
          <section key={bucket} aria-label={TIME_BUCKET_LABEL[bucket]}>
            <p className="mb-2 text-eyebrow font-medium uppercase text-muted-foreground">
              {TIME_BUCKET_LABEL[bucket]} <span className="normal-case">({items.length})</span>
            </p>
            <ul className="space-y-2">
              {items.map((row) => (
                <li key={`${row.kind}-${row.id}`}>
                  <RowCard row={row} urlSuffix={urlSuffix} from={from} />
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </>
  );
}

function Group({ bucket, items, urlSuffix, from }: { bucket: TimeBucket; items: PartnerOverviewRow[]; urlSuffix: string; from: string }) {
  return (
    <>
      <TableRow className="bg-muted/40 hover:bg-muted/40">
        <TableCell colSpan={8} className="py-1.5 text-eyebrow font-medium uppercase text-muted-foreground">
          {TIME_BUCKET_LABEL[bucket]} <span className="ml-2 font-normal normal-case">({items.length})</span>
        </TableCell>
      </TableRow>
      {items.map((row) => (
        <Row key={`${row.kind}-${row.id}`} row={row} urlSuffix={urlSuffix} from={from} />
      ))}
    </>
  );
}

const KindPill = ({ kind }: { kind: PartnerOverviewRow["kind"] }) => (
  <Pill tone="neutral" size="sm">
    {kind === "accommodation" ? <Hotel className="h-3 w-3" aria-hidden="true" /> : <Activity className="h-3 w-3" aria-hidden="true" />}
    {kind === "accommodation" ? "Logies" : "Programma"}
  </Pill>
);

const StatusPill = ({ row }: { row: PartnerOverviewRow }) =>
  row.isConcept && row.derivedStatus !== "geannuleerd" ? (
    <Pill tone="neutral" size="sm">
      Concept, nog niet vrijgegeven
    </Pill>
  ) : (
    <Pill tone={row.partnerStatus.tone} size="sm">
      {row.partnerStatus.label}
    </Pill>
  );

function Row({ row, urlSuffix, from }: { row: PartnerOverviewRow; urlSuffix: string; from: string }) {
  const overdue = isOverdue(row);
  const navTo = `${row.href}${urlSuffix}`;
  const link = (children: React.ReactNode, className?: string) => (
    <Link to={navTo} state={{ from }} className={cn("block", className)}>
      {children}
    </Link>
  );

  return (
    <TableRow className={cn("cursor-pointer", row.isConcept && "opacity-60")}>
      <TableCell>
        {link(
          <>
            <div className="flex flex-wrap items-center gap-1.5">
              {row.earliestDate ? (
                <span className="text-sm font-medium">{format(row.earliestDate, "d MMM", { locale: nl })}</span>
              ) : (
                <span className="text-xs text-muted-foreground">geen datum</span>
              )}
              {row.durationDays > 1 && <span className="text-xs text-muted-foreground">· {row.durationDays} dagen</span>}
              {overdue && (
                <Pill tone="danger" size="sm">
                  verstreken
                </Pill>
              )}
            </div>
            {row.earliestDate && <div className="text-[11px] text-muted-foreground">{format(row.earliestDate, "EEEE yyyy", { locale: nl })}</div>}
          </>,
        )}
      </TableCell>
      <TableCell>{link(row.reference ?? "", "font-mono text-xs text-muted-foreground")}</TableCell>
      <TableCell>{link(row.customerLabel, cn("font-medium", row.isConcept && "italic text-muted-foreground"))}</TableCell>
      <TableCell className="text-center text-sm">{row.numberOfPeople}</TableCell>
      <TableCell>
        <KindPill kind={row.kind} />
      </TableCell>
      <TableCell>
        <StatusPill row={row} />
      </TableCell>
      <TableCell className="text-center text-sm text-muted-foreground">{row.itemCount}</TableCell>
      <TableCell className="text-center">
        {!row.isConcept && row.actionCount > 0 ? (
          <Pill tone="warning" size="sm">
            {row.actionCount}
          </Pill>
        ) : (
          <span className="sr-only">niets</span>
        )}
      </TableCell>
    </TableRow>
  );
}

function RowCard({ row, urlSuffix, from }: { row: PartnerOverviewRow; urlSuffix: string; from: string }) {
  const overdue = isOverdue(row);
  return (
    <Link
      to={`${row.href}${urlSuffix}`}
      state={{ from }}
      className={cn("block rounded-lg border bg-card p-4 transition-colors duration-base hover:bg-muted/40", row.isConcept && "opacity-60")}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className={cn("font-medium", row.isConcept && "italic text-muted-foreground")}>{row.customerLabel}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {row.earliestDate ? format(row.earliestDate, "EEEE d MMMM yyyy", { locale: nl }) : "Geen datum"}
            {row.durationDays > 1 && ` · ${row.durationDays} dagen`}
            {row.reference && ` · ${row.reference}`}
          </p>
        </div>
        {!row.isConcept && row.actionCount > 0 && (
          <Pill tone="warning" size="sm" className="shrink-0">
            {row.actionCount} te doen
          </Pill>
        )}
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <StatusPill row={row} />
        <KindPill kind={row.kind} />
        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
          <Users className="h-3 w-3" aria-hidden="true" />
          {row.numberOfPeople}
        </span>
        {overdue && (
          <Pill tone="danger" size="sm">
            verstreken
          </Pill>
        )}
      </div>
    </Link>
  );
}
