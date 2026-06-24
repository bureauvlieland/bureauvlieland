import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Search, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TICKET_BLOCK_IDS } from "@/lib/ticketItems";
import { BureauExecutionInline } from "@/components/admin/bureau-execution/BureauExecutionInline";
import { cn } from "@/lib/utils";

interface BureauRow {
  id: string;
  request_id: string;
  block_id: string | null;
  block_name: string;
  day_index: number;
  override_people: number | null;
  confirmed_time: string | null;
  proposed_time: string | null;
  preferred_time: string | null;
  bureau_guide_name: string | null;
  bureau_guide_contact: string | null;
  bureau_arranged_at: string | null;
  bureau_arranged_notes: string | null;
  customer_approved_at: string | null;
  reference_number: string | null;
  customer_name: string;
  customer_company: string | null;
  selected_dates: string[] | null;
  number_of_people: number | null;
  itemDate: string | null;
}

type StatusFilter = "all" | "open" | "arranged";

const formatNL = (d: string | null) => {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleDateString("nl-NL", {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return d;
  }
};

const dateForItem = (
  dayIndex: number | null,
  selectedDates: string[] | null | undefined,
): string | null => {
  if (!selectedDates || selectedDates.length === 0) return null;
  if (dayIndex == null || dayIndex < 0 || dayIndex >= selectedDates.length) {
    return selectedDates[0] ?? null;
  }
  return selectedDates[dayIndex] ?? selectedDates[0] ?? null;
};

export function BureauExecutionList() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<StatusFilter>("open");
  const [period, setPeriod] = useState<"upcoming" | "all" | "archive">("upcoming");

  const { data: rows, isLoading } = useQuery<BureauRow[]>({
    queryKey: ["admin-bureau-execution-overview"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("program_request_items")
        .select(
          "id, request_id, block_id, block_name, day_index, override_people, confirmed_time, proposed_time, preferred_time, bureau_guide_name, bureau_guide_contact, bureau_arranged_at, bureau_arranged_notes, customer_approved_at, provider_id, program_requests!inner(reference_number, customer_name, customer_company, selected_dates, number_of_people, status)",
        )
        .eq("provider_id", "bureau")
        .neq("status", "cancelled")
        .not("program_requests.status", "in", "(cancelled,deleted)");
      if (error) throw error;
      return (data || [])
        .filter((r: any) => !TICKET_BLOCK_IDS.includes(r.block_id ?? ""))
        .map((r: any) => {
          const project = r.program_requests;
          return {
            id: r.id,
            request_id: r.request_id,
            block_id: r.block_id,
            block_name: r.block_name,
            day_index: r.day_index,
            override_people: r.override_people,
            confirmed_time: r.confirmed_time ?? null,
            proposed_time: r.proposed_time ?? null,
            preferred_time: r.preferred_time ?? null,
            bureau_guide_name: r.bureau_guide_name ?? null,
            bureau_guide_contact: r.bureau_guide_contact ?? null,
            bureau_arranged_at: r.bureau_arranged_at ?? null,
            bureau_arranged_notes: r.bureau_arranged_notes ?? null,
            customer_approved_at: r.customer_approved_at ?? null,
            reference_number: project?.reference_number ?? null,
            customer_name: project?.customer_name ?? "",
            customer_company: project?.customer_company ?? null,
            selected_dates: project?.selected_dates ?? null,
            number_of_people: project?.number_of_people ?? null,
            itemDate: dateForItem(r.day_index, project?.selected_dates),
          } as BureauRow;
        });
    },
    refetchInterval: 60_000,
  });

  const filtered = useMemo(() => {
    if (!rows) return [];
    const todayIso = new Date().toISOString().slice(0, 10);
    return rows
      .filter((r) => {
        if (period === "upcoming" && r.itemDate && r.itemDate < todayIso) return false;
        if (period === "archive" && r.itemDate && r.itemDate >= todayIso) return false;
        const isArranged = !!r.bureau_arranged_at;
        if (status === "open" && isArranged) return false;
        if (status === "arranged" && !isArranged) return false;
        if (search.trim()) {
          const q = search.toLowerCase();
          const hay = [
            r.reference_number,
            r.customer_name,
            r.customer_company,
            r.block_name,
            r.bureau_guide_name,
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();
          if (!hay.includes(q)) return false;
        }
        return true;
      })
      .sort((a, b) => {
        const ad = a.itemDate ?? "9999-12-31";
        const bd = b.itemDate ?? "9999-12-31";
        if (ad !== bd) return ad < bd ? -1 : 1;
        if (a.request_id !== b.request_id) return a.request_id < b.request_id ? -1 : 1;
        return (a.day_index ?? 0) - (b.day_index ?? 0);
      });
  }, [rows, period, status, search]);

  const openCount = useMemo(
    () => (rows || []).filter((r) => !r.bureau_arranged_at).length,
    [rows],
  );

  return (
    <div className="space-y-5">
      <p className="text-sm text-slate-500">
        Eigen activiteiten waar Bureau Vlieland zelf een begeleider voor regelt
        (vuurtorenbezoek, gids fietstocht, etc.). {openCount} nog te regelen.
      </p>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Zoek op project, klant, activiteit, begeleider…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 w-[300px]"
          />
        </div>
        <Tabs value={status} onValueChange={(v) => setStatus(v as StatusFilter)}>
          <TabsList>
            <TabsTrigger value="open">Te regelen</TabsTrigger>
            <TabsTrigger value="arranged">Geregeld</TabsTrigger>
            <TabsTrigger value="all">Alles</TabsTrigger>
          </TabsList>
        </Tabs>
        <Tabs value={period} onValueChange={(v) => setPeriod(v as typeof period)}>
          <TabsList>
            <TabsTrigger value="upcoming">Aankomend</TabsTrigger>
            <TabsTrigger value="archive">Archief</TabsTrigger>
            <TabsTrigger value="all">Alles</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-14" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="border rounded-lg p-10 text-center text-sm text-slate-500 bg-white">
          Niets te tonen met deze filters.
        </div>
      ) : (
        <div className="border rounded-lg bg-white overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[160px]">Datum</TableHead>
                <TableHead>Project / klant</TableHead>
                <TableHead>Activiteit</TableHead>
                <TableHead className="w-[80px]">Pers.</TableHead>
                <TableHead className="w-[220px]">Begeleider</TableHead>
                <TableHead className="w-[120px]">Status</TableHead>
                <TableHead className="w-[60px] text-right">Open</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((row, idx) => {
                const prev = filtered[idx - 1];
                const sameProject = prev && prev.request_id === row.request_id;
                const isArranged = !!row.bureau_arranged_at;
                return (
                  <TableRow
                    key={row.id}
                    className={cn(!sameProject && idx > 0 && "border-t-2 border-t-slate-300")}
                  >
                    <TableCell className="text-sm whitespace-nowrap">
                      <div>{formatNL(row.itemDate)}</div>
                      {(() => {
                        const t = row.confirmed_time || row.proposed_time || row.preferred_time;
                        if (!t) return null;
                        return (
                          <div className="text-xs mt-0.5 text-slate-500">{t}</div>
                        );
                      })()}
                    </TableCell>
                    <TableCell className="text-sm">
                      {sameProject ? (
                        <span className="text-xs text-slate-400 italic">↳ zelfde project</span>
                      ) : (
                        <>
                          <Link
                            to={`/admin/projecten/${row.request_id}`}
                            className="text-slate-900 hover:underline font-medium"
                          >
                            {row.customer_company || row.customer_name}
                          </Link>
                          <div className="text-xs text-slate-500">{row.reference_number}</div>
                        </>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">{row.block_name}</TableCell>
                    <TableCell className="text-sm">
                      {row.override_people ?? row.number_of_people ?? "—"}
                    </TableCell>
                    <TableCell>
                      <BureauExecutionInline
                        item={{
                          id: row.id,
                          block_name: row.block_name,
                          bureau_guide_name: row.bureau_guide_name,
                          bureau_guide_contact: row.bureau_guide_contact,
                          bureau_arranged_at: row.bureau_arranged_at,
                          bureau_arranged_notes: row.bureau_arranged_notes,
                        }}
                        onChanged={() => {
                          qc.invalidateQueries({ queryKey: ["admin-bureau-execution-overview"] });
                        }}
                      />
                      {row.bureau_guide_contact && (
                        <div className="text-xs text-slate-500 mt-0.5">
                          {row.bureau_guide_contact}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      {isArranged ? (
                        <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
                          Geregeld
                        </Badge>
                      ) : (
                        <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">
                          Te regelen
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button asChild size="sm" variant="ghost">
                        <Link to={`/admin/projecten/${row.request_id}`}>
                          <ExternalLink className="h-4 w-4" />
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
