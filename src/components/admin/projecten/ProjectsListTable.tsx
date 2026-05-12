import { useMemo } from "react";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { Activity, Hotel, FolderKanban, Circle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import {
  DERIVED_STATUS_LABEL,
  DERIVED_STATUS_TONE,
  TIME_BUCKET_LABEL,
  getTimeBucket,
  isPastDate,
  type TimeBucket,
} from "@/lib/projectStatus";
import type { OverviewRow, RowKind } from "@/lib/getProjectsOverview";

const KIND_META: Record<RowKind, { label: string; icon: React.ReactNode }> = {
  programma: { label: "Programma", icon: <Activity className="h-3 w-3" /> },
  logies: { label: "Logies", icon: <Hotel className="h-3 w-3" /> },
  combi: { label: "Combi", icon: <FolderKanban className="h-3 w-3" /> },
};

const BUCKET_ORDER: TimeBucket[] = ["overdue", "this_week", "this_month", "later", "no_date"];

interface Props {
  rows: OverviewRow[];
  variant: "projecten" | "logies";
}

export function ProjectsListTable({ rows, variant }: Props) {
  const grouped = useMemo(() => {
    const map = new Map<TimeBucket, OverviewRow[]>();
    rows.forEach(r => {
      const b = getTimeBucket(r.earliestDate);
      const arr = map.get(b) ?? [];
      arr.push(r);
      map.set(b, arr);
    });
    return BUCKET_ORDER
      .filter(b => map.has(b))
      .map(b => ({ bucket: b, items: map.get(b)! }));
  }, [rows]);

  if (rows.length === 0) {
    return (
      <div className="p-12 text-center text-sm text-muted-foreground">
        Geen {variant === "logies" ? "logies-aanvragen" : "projecten"} gevonden.
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
            <TableHead className="w-[120px]">Type</TableHead>
            <TableHead className="w-[170px]">Status</TableHead>
            <TableHead className="w-[140px]">Voortgang</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {grouped.map(({ bucket, items }) => (
            <GroupRows key={bucket} bucket={bucket} items={items} />
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function GroupRows({ bucket, items }: { bucket: TimeBucket; items: OverviewRow[] }) {
  return (
    <>
      <TableRow className="bg-muted/40 hover:bg-muted/40">
        <TableCell colSpan={7} className="py-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {TIME_BUCKET_LABEL[bucket]} <span className="ml-2 font-normal normal-case">({items.length})</span>
        </TableCell>
      </TableRow>
      {items.map(row => <Row key={`${row.kind}-${row.id}-${row.accommodationId ?? ""}`} row={row} />)}
    </>
  );
}

function Row({ row }: { row: OverviewRow }) {
  const overdue = isPastDate(row.earliestDate);
  const navTo = row.programId
    ? `/admin/projecten/${row.programId}`
    : `/admin/logies/${row.accommodationId}`;

  return (
    <TableRow className="cursor-pointer">
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
        <Link to={navTo} className="block">
          <div className="font-medium">{row.customerCompany || row.customerName}</div>
          {row.customerCompany && (
            <div className="text-xs text-muted-foreground">{row.customerName}</div>
          )}
        </Link>
      </TableCell>
      <TableCell className="text-center text-sm">{row.numberOfPeople}</TableCell>
      <TableCell>
        <Badge variant="outline" className="gap-1 font-normal">
          {KIND_META[row.kind].icon}
          {KIND_META[row.kind].label}
        </Badge>
      </TableCell>
      <TableCell>
        <Badge className={cn("font-normal", DERIVED_STATUS_TONE[row.derivedStatus])} variant="secondary">
          {DERIVED_STATUS_LABEL[row.derivedStatus]}
        </Badge>
      </TableCell>
      <TableCell>
        {row.readinessTotal > 0 ? (
          <div className="space-y-1">
            <Progress
              value={(row.readinessDone / row.readinessTotal) * 100}
              className="h-1.5"
            />
            <div className="text-[10px] text-muted-foreground">
              {row.readinessDone}/{row.readinessTotal}
            </div>
          </div>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        )}
      </TableCell>
    </TableRow>
  );
}
