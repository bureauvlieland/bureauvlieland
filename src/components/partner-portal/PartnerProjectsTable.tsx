import { useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { Activity, Hotel, Circle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import {
  DERIVED_STATUS_LABEL,
  DERIVED_STATUS_TONE,
  TIME_BUCKET_LABEL,
  getTimeBucket,
  isPastDate,
  type TimeBucket,
} from "@/lib/projectStatus";
import type { PartnerOverviewRow } from "@/lib/getPartnerProjectsOverview";

const BUCKET_ORDER: TimeBucket[] = ["overdue", "this_week", "this_month", "later", "no_date"];

interface Props {
  rows: PartnerOverviewRow[];
}

export function PartnerProjectsTable({ rows }: Props) {
  const [searchParams] = useSearchParams();
  const impersonate = searchParams.get("impersonate");
  const urlSuffix = impersonate ? `?impersonate=${impersonate}` : "";

  const grouped = useMemo(() => {
    const map = new Map<TimeBucket, PartnerOverviewRow[]>();
    rows.forEach(r => {
      const b = getTimeBucket(r.earliestDate);
      const arr = map.get(b) ?? [];
      arr.push(r);
      map.set(b, arr);
    });
    return BUCKET_ORDER.filter(b => map.has(b)).map(b => ({ bucket: b, items: map.get(b)! }));
  }, [rows]);

  if (rows.length === 0) {
    return (
      <div className="rounded-lg border bg-card p-12 text-center text-sm text-muted-foreground">
        Geen projecten gevonden.
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[150px]">Datum</TableHead>
            <TableHead className="w-[120px]">Ref</TableHead>
            <TableHead>Klant</TableHead>
            <TableHead className="w-[70px] text-center">Pers.</TableHead>
            <TableHead className="w-[110px]">Type</TableHead>
            <TableHead className="w-[170px]">Status</TableHead>
            <TableHead className="w-[100px] text-center">Items</TableHead>
            <TableHead className="w-[110px] text-center">Actie</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {grouped.map(({ bucket, items }) => (
            <Group key={bucket} bucket={bucket} items={items} urlSuffix={urlSuffix} />
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function Group({ bucket, items, urlSuffix }: { bucket: TimeBucket; items: PartnerOverviewRow[]; urlSuffix: string }) {
  return (
    <>
      <TableRow className="bg-muted/40 hover:bg-muted/40">
        <TableCell colSpan={8} className="py-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {TIME_BUCKET_LABEL[bucket]} <span className="ml-2 font-normal normal-case">({items.length})</span>
        </TableCell>
      </TableRow>
      {items.map(row => (
        <Row key={`${row.kind}-${row.id}`} row={row} urlSuffix={urlSuffix} />
      ))}
    </>
  );
}

function Row({ row, urlSuffix }: { row: PartnerOverviewRow; urlSuffix: string }) {
  const overdue =
    !row.isConcept &&
    isPastDate(row.earliestDate) &&
    row.derivedStatus !== "afgerond" &&
    row.derivedStatus !== "geannuleerd";
  const navTo = `${row.href}${urlSuffix}`;

  return (
    <TableRow className={cn("cursor-pointer", row.isConcept && "opacity-60")}>
      <TableCell>
        <Link to={navTo} className="block">
          <div className="flex items-center gap-1.5">
            {overdue && <Circle className="h-2 w-2 fill-red-500 text-red-500" />}
            {row.earliestDate ? (
              <span className={cn("text-sm font-medium", overdue && "text-red-600")}>
                {format(row.earliestDate, "d MMM", { locale: nl })}
              </span>
            ) : (
              <span className="text-xs text-muted-foreground">geen datum</span>
            )}
            {row.durationDays > 1 && (
              <span className="text-xs text-muted-foreground">· {row.durationDays} dgn</span>
            )}
          </div>
          {row.earliestDate && (
            <div className="text-[10px] text-muted-foreground">
              {format(row.earliestDate, "EEEE yyyy", { locale: nl })}
            </div>
          )}
        </Link>
      </TableCell>
      <TableCell>
        <Link to={navTo} className="font-mono text-xs text-muted-foreground">
          {row.reference ?? "—"}
        </Link>
      </TableCell>
      <TableCell>
        <Link to={navTo} className={cn("block font-medium", row.isConcept && "italic text-muted-foreground")}>
          {row.customerLabel}
        </Link>
      </TableCell>
      <TableCell className="text-center text-sm">{row.numberOfPeople}</TableCell>
      <TableCell>
        <Badge variant="outline" className="gap-1 font-normal">
          {row.kind === "accommodation" ? <Hotel className="h-3 w-3" /> : <Activity className="h-3 w-3" />}
          {row.kind === "accommodation" ? "Logies" : "Programma"}
        </Badge>
      </TableCell>
      <TableCell>
        {row.isConcept ? (
          <Badge variant="outline" className="font-normal border-dashed">
            Concept — nog niet vrijgegeven
          </Badge>
        ) : (
          <Badge className={cn("font-normal", DERIVED_STATUS_TONE[row.derivedStatus])} variant="secondary">
            {DERIVED_STATUS_LABEL[row.derivedStatus]}
          </Badge>
        )}
      </TableCell>
      <TableCell className="text-center text-sm text-muted-foreground">{row.itemCount}</TableCell>
      <TableCell className="text-center">
        {row.isConcept ? (
          <span className="text-xs text-muted-foreground">—</span>
        ) : row.actionCount > 0 ? (
          <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">{row.actionCount}</Badge>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        )}
      </TableCell>
    </TableRow>
  );
}
