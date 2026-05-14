import { useEffect, useMemo, useState } from "react";
import { Helmet } from "react-helmet";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Ticket,
  Search,
  FileText,
  Upload,
  Mail,
  ExternalLink,
  Check,
  X,
  Link2,
  Link2Off,
} from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";
import {
  TICKET_BLOCK_IDS,
  getTicketKind,
  getTicketKindLabel,
  getTicketDate,
  getTicketStatus,
} from "@/lib/ticketItems";
import { cn } from "@/lib/utils";
import { SendTicketEmailDialog } from "@/components/admin/tickets/SendTicketEmailDialog";

interface TicketRow {
  id: string;
  request_id: string;
  block_id: string | null;
  block_name: string;
  day_index: number;
  status: string;
  booking_reference: string | null;
  booking_document_path: string | null;
  booking_group_id: string | null;
  ticket_last_emailed_at: string | null;
  override_people: number | null;
  confirmed_time: string | null;
  proposed_time: string | null;
  preferred_time: string | null;
  // project
  reference_number: string | null;
  customer_name: string;
  customer_company: string | null;
  customer_email: string | null;
  selected_dates: string[] | null;
  number_of_people: number | null;
  // derived
  ticketDate: string | null;
}

type StatusFilter = "all" | "open" | "booked";
type KindFilter = "all" | "ferry" | "bike";

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

export default function AdminTickets() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [kind, setKind] = useState<KindFilter>("all");
  const [period, setPeriod] = useState<"upcoming" | "all" | "archive">("upcoming");
  const [emailDialog, setEmailDialog] = useState<{ items: TicketRow[]; project: TicketRow } | null>(null);

  const { data: rows, isLoading } = useQuery<TicketRow[]>({
    queryKey: ["admin-tickets-overview"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("program_request_items")
        .select(
          "id, request_id, block_id, block_name, day_index, status, booking_reference, booking_document_path, booking_group_id, ticket_last_emailed_at, override_people, confirmed_time, proposed_time, preferred_time, program_requests!inner(reference_number, customer_name, customer_company, customer_email, selected_dates, number_of_people, status)"
        )
        .in("block_id", TICKET_BLOCK_IDS as unknown as string[])
        .neq("status", "cancelled")
        .not("program_requests.status", "in", "(cancelled,deleted)");
      if (error) throw error;
      return (data || []).map((r: any) => {
        const project = r.program_requests;
        const ticketDate = getTicketDate(r, project?.selected_dates);
        return {
          id: r.id,
          request_id: r.request_id,
          block_id: r.block_id,
          block_name: r.block_name,
          day_index: r.day_index,
          status: r.status,
          booking_reference: r.booking_reference,
          booking_document_path: r.booking_document_path,
          booking_group_id: r.booking_group_id,
          ticket_last_emailed_at: r.ticket_last_emailed_at,
          override_people: r.override_people,
          confirmed_time: r.confirmed_time ?? null,
          proposed_time: r.proposed_time ?? null,
          preferred_time: r.preferred_time ?? null,
          reference_number: project?.reference_number ?? null,
          customer_name: project?.customer_name ?? "",
          customer_company: project?.customer_company ?? null,
          customer_email: project?.customer_email ?? null,
          selected_dates: project?.selected_dates ?? null,
          number_of_people: project?.number_of_people ?? null,
          ticketDate,
        } as TicketRow;
      });
    },
    refetchInterval: 60_000,
  });

  const filtered = useMemo(() => {
    if (!rows) return [];
    const todayIso = new Date().toISOString().slice(0, 10);
    return rows
      .filter((r) => {
        // Period
        if (period === "upcoming" && r.ticketDate && r.ticketDate < todayIso) return false;
        if (period === "archive" && r.ticketDate && r.ticketDate >= todayIso) return false;
        // Kind
        if (kind !== "all" && getTicketKind(r) !== kind) return false;
        // Status
        if (status !== "all" && getTicketStatus(r) !== status) return false;
        // Search
        if (search.trim()) {
          const q = search.toLowerCase();
          const hay = [
            r.reference_number,
            r.customer_name,
            r.customer_company,
            r.booking_reference,
            r.block_name,
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();
          if (!hay.includes(q)) return false;
        }
        return true;
      })
      .sort((a, b) => {
        // Bundle by project: sort by project's earliest ticket date, then by request_id,
        // then by ticket date within the project, then day_index.
        const projMin = new Map<string, string>();
        for (const r of rows!) {
          const d = r.ticketDate ?? "9999-12-31";
          const cur = projMin.get(r.request_id);
          if (!cur || d < cur) projMin.set(r.request_id, d);
        }
        const am = projMin.get(a.request_id) ?? "9999-12-31";
        const bm = projMin.get(b.request_id) ?? "9999-12-31";
        if (am !== bm) return am < bm ? -1 : 1;
        if (a.request_id !== b.request_id) return a.request_id < b.request_id ? -1 : 1;
        const ad = a.ticketDate ?? "9999-12-31";
        const bd = b.ticketDate ?? "9999-12-31";
        if (ad !== bd) return ad < bd ? -1 : 1;
        return (a.day_index ?? 0) - (b.day_index ?? 0);
      });
  }, [rows, period, kind, status, search]);

  const openCount = useMemo(
    () => (rows || []).filter((r) => getTicketStatus(r) === "open").length,
    [rows]
  );

  const updateBooking = async (id: string, field: "booking_reference", value: string) => {
    const { error } = await supabase
      .from("program_request_items")
      .update({ [field]: value || null })
      .eq("id", id);
    if (error) {
      toast({ title: "Opslaan mislukt", description: error.message, variant: "destructive" });
      return;
    }
    qc.invalidateQueries({ queryKey: ["admin-tickets-overview"] });
    qc.invalidateQueries({ queryKey: ["admin-open-tickets-count"] });
  };

  const uploadPdf = async (row: TicketRow, file: File) => {
    if (!file) return;
    if (file.type !== "application/pdf") {
      toast({ title: "Alleen PDF toegestaan", variant: "destructive" });
      return;
    }
    const path = `${row.request_id}/${row.id}-${Date.now()}.pdf`;
    const { error: upErr } = await supabase.storage
      .from("ticket-documents")
      .upload(path, file, { contentType: "application/pdf", upsert: false });
    if (upErr) {
      toast({ title: "Upload mislukt", description: upErr.message, variant: "destructive" });
      return;
    }
    // Remove old file if exists
    if (row.booking_document_path) {
      await supabase.storage.from("ticket-documents").remove([row.booking_document_path]);
    }
    const { error } = await supabase
      .from("program_request_items")
      .update({ booking_document_path: path })
      .eq("id", row.id);
    if (error) {
      toast({ title: "Opslaan mislukt", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "PDF geüpload" });
    qc.invalidateQueries({ queryKey: ["admin-tickets-overview"] });
    qc.invalidateQueries({ queryKey: ["admin-open-tickets-count"] });
  };

  const removePdf = async (row: TicketRow) => {
    if (!row.booking_document_path) return;
    await supabase.storage.from("ticket-documents").remove([row.booking_document_path]);
    await supabase
      .from("program_request_items")
      .update({ booking_document_path: null })
      .eq("id", row.id);
    qc.invalidateQueries({ queryKey: ["admin-tickets-overview"] });
    qc.invalidateQueries({ queryKey: ["admin-open-tickets-count"] });
  };

  const downloadPdf = async (path: string) => {
    const { data, error } = await supabase.storage
      .from("ticket-documents")
      .createSignedUrl(path, 60 * 5);
    if (error || !data) {
      toast({ title: "Download mislukt", variant: "destructive" });
      return;
    }
    window.open(data.signedUrl, "_blank", "noopener");
  };

  const openEmailDialog = (row: TicketRow) => {
    // Group: include all rows with same booking_group_id, else just this one
    const group = row.booking_group_id
      ? (rows || []).filter((r) => r.booking_group_id === row.booking_group_id)
      : [row];
    setEmailDialog({ items: group, project: row });
  };

  const linkRows = async (row: TicketRow, targetId: string) => {
    const target = (rows || []).find((r) => r.id === targetId);
    if (!target) return;
    // Use existing group_id from either side, else seed with target.id
    const groupId = target.booking_group_id || row.booking_group_id || target.id;
    const ids = [row.id, target.id];
    // Make sure target also carries the group id
    if (!target.booking_group_id) {
      await supabase.from("program_request_items").update({ booking_group_id: groupId }).eq("id", target.id);
    }
    const { error } = await supabase
      .from("program_request_items")
      .update({ booking_group_id: groupId })
      .in("id", ids);
    if (error) {
      toast({ title: "Koppelen mislukt", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Gekoppeld" });
    qc.invalidateQueries({ queryKey: ["admin-tickets-overview"] });
  };

  const unlinkRow = async (row: TicketRow) => {
    const { error } = await supabase
      .from("program_request_items")
      .update({ booking_group_id: null })
      .eq("id", row.id);
    if (error) {
      toast({ title: "Ontkoppelen mislukt", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Koppeling verwijderd" });
    qc.invalidateQueries({ queryKey: ["admin-tickets-overview"] });
  };

  return (
    <AdminLayout>
      <Helmet>
        <title>Tickets | Admin | Bureau Vlieland</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>
      <div className="p-6 space-y-5">
        <div className="flex items-end justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <Ticket className="h-6 w-6" />
              Tickets
            </h1>
            <p className="text-sm text-slate-500">
              Overzicht van alle bootovertochten en fietshuur. {openCount} open.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Zoek op project, klant, boekingsnummer…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 w-[280px]"
            />
          </div>
          <Tabs value={kind} onValueChange={(v) => setKind(v as KindFilter)}>
            <TabsList>
              <TabsTrigger value="all">Alle</TabsTrigger>
              <TabsTrigger value="ferry">Overtocht</TabsTrigger>
              <TabsTrigger value="bike">Fietshuur</TabsTrigger>
            </TabsList>
          </Tabs>
          <Tabs value={status} onValueChange={(v) => setStatus(v as StatusFilter)}>
            <TabsList>
              <TabsTrigger value="all">Alle statussen</TabsTrigger>
              <TabsTrigger value="open">Open</TabsTrigger>
              <TabsTrigger value="booked">Geboekt</TabsTrigger>
            </TabsList>
          </Tabs>
          <Select value={period} onValueChange={(v) => setPeriod(v as typeof period)}>
            <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="upcoming">Aankomend</SelectItem>
              <SelectItem value="archive">Archief</SelectItem>
              <SelectItem value="all">Alles</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-14" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="border rounded-lg p-10 text-center text-sm text-slate-500 bg-white">
            Geen tickets gevonden met deze filters.
          </div>
        ) : (
          <div className="border rounded-lg bg-white overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[160px]">Datum</TableHead>
                  <TableHead>Project / klant</TableHead>
                  <TableHead className="w-[140px]">Type</TableHead>
                  <TableHead className="w-[80px]">Pers.</TableHead>
                  <TableHead className="w-[200px]">Boekingsnummer</TableHead>
                  <TableHead className="w-[140px]">PDF</TableHead>
                  <TableHead className="w-[100px]">Status</TableHead>
                  <TableHead className="w-[160px] text-right">Acties</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((row, idx) => {
                  const prev = filtered[idx - 1];
                  const sameProject = prev && prev.request_id === row.request_id;
                  const sameGroup =
                    prev &&
                    row.booking_group_id &&
                    prev.booking_group_id === row.booking_group_id;
                  const tStatus = getTicketStatus(row);
                  const tKind = getTicketKind(row);
                  return (
                    <TableRow
                      key={row.id}
                      className={cn(
                        row.booking_group_id && "bg-amber-50/40",
                        sameProject && "border-t-0",
                        !sameProject && idx > 0 && "border-t-2 border-t-slate-300"
                      )}
                    >
                      <TableCell className="text-sm whitespace-nowrap">
                        <div>{formatNL(row.ticketDate)}</div>
                        {(() => {
                          const t = row.confirmed_time || row.proposed_time || row.preferred_time;
                          if (!t) return null;
                          const isConfirmed = !!row.confirmed_time;
                          return (
                            <div className={cn("text-xs mt-0.5 font-medium", isConfirmed ? "text-emerald-700" : "text-slate-500")}>
                              {t === "flexibel" ? "flexibel" : t}
                              {!isConfirmed && t !== "flexibel" && row.proposed_time && " (voorstel)"}
                              {!isConfirmed && t !== "flexibel" && !row.proposed_time && " (gewenst)"}
                            </div>
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
                            <div className="text-xs text-slate-500">
                              {row.reference_number}
                            </div>
                          </>
                        )}
                      </TableCell>
                      <TableCell className="text-sm">
                        <Badge variant="outline" className="font-normal">
                          {getTicketKindLabel(tKind)}
                        </Badge>
                        <div className="text-xs text-slate-500 mt-0.5">{row.block_name}</div>
                      </TableCell>
                      <TableCell className="text-sm">
                        {row.override_people ?? row.number_of_people ?? "—"}
                      </TableCell>
                      <TableCell>
                        <BookingRefInput
                          initial={row.booking_reference || ""}
                          onSave={(v) => updateBooking(row.id, "booking_reference", v)}
                        />
                      </TableCell>
                      <TableCell>
                        <PdfCell row={row} onUpload={uploadPdf} onRemove={removePdf} onDownload={downloadPdf} />
                      </TableCell>
                      <TableCell>
                        {tStatus === "booked" ? (
                          <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">Geboekt</Badge>
                        ) : (
                          <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">Open</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => openEmailDialog(row)}
                            disabled={!row.booking_document_path && !row.booking_reference}
                            title={
                              !row.booking_document_path && !row.booking_reference
                                ? "Voeg eerst een boekingsnummer of PDF toe"
                                : "Mail naar klant"
                            }
                          >
                            <Mail className="h-4 w-4" />
                          </Button>
                          <Button asChild size="sm" variant="ghost">
                            <Link to={`/admin/projecten/${row.request_id}`}>
                              <ExternalLink className="h-4 w-4" />
                            </Link>
                          </Button>
                        </div>
                        {row.ticket_last_emailed_at && (
                          <div className="text-[10px] text-slate-400 mt-0.5">
                            Gemaild {formatNL(row.ticket_last_emailed_at.slice(0, 10))}
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {emailDialog && (
        <SendTicketEmailDialog
          open
          onOpenChange={(o) => !o && setEmailDialog(null)}
          items={emailDialog.items.map((i) => ({
            id: i.id,
            block_name: i.block_name,
            booking_reference: i.booking_reference,
            booking_document_path: i.booking_document_path,
            ticketDate: i.ticketDate,
          }))}
          defaultEmail={emailDialog.project.customer_email || ""}
          customerName={emailDialog.project.customer_company || emailDialog.project.customer_name}
          referenceNumber={emailDialog.project.reference_number}
          onSent={() => {
            setEmailDialog(null);
            qc.invalidateQueries({ queryKey: ["admin-tickets-overview"] });
          }}
        />
      )}
    </AdminLayout>
  );
}

function BookingRefInput({ initial, onSave }: { initial: string; onSave: (v: string) => void | Promise<void> }) {
  const [value, setValue] = useState(initial);
  const [lastSaved, setLastSaved] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [savedTick, setSavedTick] = useState(false);

  // Sync when parent prop changes (e.g. after refetch / navigation back)
  useEffect(() => {
    setValue(initial);
    setLastSaved(initial);
  }, [initial]);

  const dirty = value !== lastSaved;

  const commit = async () => {
    if (!dirty || saving) return;
    setSaving(true);
    await onSave(value.trim());
    setLastSaved(value.trim());
    setSaving(false);
    setSavedTick(true);
    setTimeout(() => setSavedTick(false), 1200);
  };

  return (
    <div className="flex items-center gap-1">
      <Input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            (e.target as HTMLInputElement).blur();
          }
        }}
        placeholder="—"
        className="h-8 text-sm"
      />
      {dirty && !saving && <span className="text-[10px] text-amber-600">●</span>}
      {savedTick && <Check className="h-4 w-4 text-emerald-600" />}
    </div>
  );
}

function PdfCell({
  row,
  onUpload,
  onRemove,
  onDownload,
}: {
  row: TicketRow;
  onUpload: (row: TicketRow, file: File) => void | Promise<void>;
  onRemove: (row: TicketRow) => void | Promise<void>;
  onDownload: (path: string) => void | Promise<void>;
}) {
  if (row.booking_document_path) {
    return (
      <div className="flex items-center gap-1">
        <Button
          size="sm"
          variant="ghost"
          className="h-8 px-2"
          onClick={() => onDownload(row.booking_document_path!)}
        >
          <FileText className="h-4 w-4 mr-1" /> PDF
        </Button>
        <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => onRemove(row)} title="Verwijder PDF">
          <X className="h-4 w-4" />
        </Button>
      </div>
    );
  }
  return (
    <label className="inline-flex items-center gap-1 text-sm text-slate-500 cursor-pointer hover:text-slate-900">
      <Upload className="h-4 w-4" />
      Upload
      <input
        type="file"
        accept="application/pdf"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onUpload(row, f);
          e.target.value = "";
        }}
      />
    </label>
  );
}
