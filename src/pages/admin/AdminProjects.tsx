import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet";
import { PipelineFunnel } from "@/components/admin/PipelineFunnel";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { format, differenceInDays } from "date-fns";
import { nl } from "date-fns/locale";
import {
  Search,
  Eye,
  Calendar,
  Users,
  Activity,
  FolderKanban,
  ExternalLink,
  CheckCircle2,
  Clock,
  Hotel,
  FileText,
  Send,
  FileCheck,
  XCircle,
  BarChart3,
  CalendarDays,
  List,
  TableIcon,
  Trash2,
  ChevronDown,
  AlertCircle,
} from "lucide-react";
import { ProjectGanttChart } from "@/components/admin/ProjectGanttChart";
import { ProjectCalendarView } from "@/components/admin/ProjectCalendarView";
import { ProjectDateListView } from "@/components/admin/ProjectDateListView";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

type ProjectType = "program_only" | "accommodation_only" | "combined";

type DerivedStatus = "concept" | "offerte_verstuurd" | "akkoord_ontvangen" | "av_getekend" | "afgerond" | "geannuleerd";

interface AccommodationQuoteSummary {
  partner_name: string;
  status: string;
  valid_until: string | null;
}

interface ItemDetail {
  provider_name: string;
  status: string;
  skip_partner_notification: boolean;
  customer_approved_at: string | null;
}

interface Project {
  id: string;
  type: ProjectType;

  program_id: string | null;
  program_ref: string | null;
  program_status: string | null;
  program_type: string | null;
  quote_status: string | null;
  completion_status: string | null;

  accommodation_id: string | null;
  accommodation_ref: string | null;
  accommodation_status: string | null;
  accommodation_arrival: string | null;
  accommodation_departure: string | null;

  customer_name: string;
  customer_email: string;
  customer_company: string | null;
  customer_token: string;
  number_of_people: number;
  selected_dates: string[];
  terms_accepted_at: string | null;
  created_at: string;

  item_count: number;
  items_pending: number;
  items_confirmed: number;
  items_not_sent: number;

  accommodation_quotes: AccommodationQuoteSummary[];
  item_details: ItemDetail[];
}

const DERIVED_STATUS_CONFIG: Record<DerivedStatus, { label: string; className: string; icon: React.ReactNode }> = {
  concept: { label: "Concept", className: "bg-slate-100 text-slate-700", icon: <FileText className="h-3 w-3" /> },
  offerte_verstuurd: { label: "Offerte verstuurd", className: "bg-blue-100 text-blue-800", icon: <Send className="h-3 w-3" /> },
  akkoord_ontvangen: { label: "Akkoord ontvangen", className: "bg-amber-100 text-amber-800", icon: <CheckCircle2 className="h-3 w-3" /> },
  av_getekend: { label: "AV getekend", className: "bg-green-100 text-green-800", icon: <FileCheck className="h-3 w-3" /> },
  afgerond: { label: "Afgerond", className: "bg-emerald-100 text-emerald-800", icon: <CheckCircle2 className="h-3 w-3" /> },
  geannuleerd: { label: "Geannuleerd", className: "bg-red-100 text-red-800", icon: <XCircle className="h-3 w-3" /> },
};

const ACCOMMODATION_STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  submitted: { label: "Nieuw", color: "bg-amber-100 text-amber-800" },
  processing: { label: "In behandeling", color: "bg-blue-100 text-blue-800" },
  quoted: { label: "Offertes ontvangen", color: "bg-purple-100 text-purple-800" },
  accepted: { label: "Bevestigd", color: "bg-green-100 text-green-800" },
  cancelled: { label: "Geannuleerd", color: "bg-red-100 text-red-800" },
};

const PROJECT_TYPE_CONFIG: Record<ProjectType, { label: string; icon: React.ReactNode }> = {
  program_only: { label: "Alleen activiteiten", icon: <Activity className="h-4 w-4" /> },
  accommodation_only: { label: "Alleen logies", icon: <Hotel className="h-4 w-4" /> },
  combined: { label: "Logies + Activiteiten", icon: <FolderKanban className="h-4 w-4" /> },
};

const QUOTE_STATUS_ICON: Record<string, string> = {
  pending: "⏳",
  submitted: "📩",
  selected: "✅",
  declined: "❌",
  rejected: "❌",
  expired: "⏰",
};

function getDerivedStatus(project: Project): DerivedStatus {
  if (project.program_status === "cancelled" || project.accommodation_status === "cancelled") return "geannuleerd";
  if (project.completion_status === "fully_invoiced") return "afgerond";
  if (project.terms_accepted_at) return "av_getekend";
  if (project.quote_status === "akkoord_ontvangen" || project.quote_status === "definitief_bevestigd") return "akkoord_ontvangen";
  if (project.quote_status === "offerte_verstuurd") return "offerte_verstuurd";
  // All projects now have quote_status; fallback to concept
  return "concept";
}

function getEarliestDeadline(quotes: AccommodationQuoteSummary[]): Date | null {
  const pendingDeadlines = quotes
    .filter(q => q.status === "pending" && q.valid_until)
    .map(q => new Date(q.valid_until!));
  if (pendingDeadlines.length === 0) return null;
  return pendingDeadlines.reduce((min, d) => d < min ? d : min);
}

const AdminProjectsContent = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [deleteTarget, setDeleteTarget] = useState<Project | null>(null);
  const [deleteAccommodation, setDeleteAccommodation] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const queryClient = useQueryClient();

  const toggleRow = (id: string) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const { data: projects, isLoading } = useQuery({
    queryKey: ["admin-projects-unified"],
    queryFn: async () => {
      const [
        { data: programs, error: progError },
        { data: accommodations, error: accError },
        { data: items },
        { data: accQuotes },
        { data: partners },
      ] = await Promise.all([
        supabase
          .from("program_requests")
          .select(`
            id, reference_number, customer_name, customer_email, customer_company,
            customer_token, number_of_people, selected_dates, status,
            terms_accepted_at, created_at, linked_accommodation_id,
            program_type, quote_status, completion_status
          `)
          .neq("status", "deleted")
          .order("created_at", { ascending: false }),
        supabase
          .from("accommodation_requests")
          .select(`
            id, reference_number, customer_name, customer_email, customer_company,
            customer_token, number_of_guests, arrival_date, departure_date,
            status, created_at, linked_program_id
          `)
          .order("created_at", { ascending: false }),
        supabase
          .from("program_request_items")
          .select("request_id, status, skip_partner_notification, provider_name, customer_approved_at"),
        supabase
          .from("accommodation_quotes")
          .select("request_id, status, valid_until, accommodation_name, partner_id"),
        supabase
          .from("partners")
          .select("id, name"),
      ]);

      if (progError) throw progError;
      if (accError) throw accError;

      // Build partner name map
      const partnerMap: Record<string, string> = {};
      partners?.forEach(p => { partnerMap[p.id] = p.name; });

      // Build accommodation quotes by request_id (accommodation request id)
      const quotesByAccRequest: Record<string, AccommodationQuoteSummary[]> = {};
      accQuotes?.forEach(q => {
        if (!quotesByAccRequest[q.request_id]) quotesByAccRequest[q.request_id] = [];
        quotesByAccRequest[q.request_id].push({
          partner_name: partnerMap[q.partner_id] || q.accommodation_name,
          status: q.status,
          valid_until: q.valid_until,
        });
      });

      // Build item stats and details per program
      const itemStats: Record<string, { total: number; pending: number; confirmed: number; notSent: number }> = {};
      const itemDetailsByRequest: Record<string, ItemDetail[]> = {};
      items?.forEach((item) => {
        if (!itemStats[item.request_id]) {
          itemStats[item.request_id] = { total: 0, pending: 0, confirmed: 0, notSent: 0 };
          itemDetailsByRequest[item.request_id] = [];
        }
        itemStats[item.request_id].total++;
        if (item.status === "pending") itemStats[item.request_id].pending++;
        if (item.status === "confirmed") itemStats[item.request_id].confirmed++;
        if (item.skip_partner_notification && item.customer_approved_at) {
          // Only count as "not sent" if customer already approved (ready to send)
          itemStats[item.request_id].notSent++;
        }
        itemDetailsByRequest[item.request_id].push({
          provider_name: item.provider_name,
          status: item.status,
          skip_partner_notification: item.skip_partner_notification ?? false,
          customer_approved_at: item.customer_approved_at ?? null,
        });
      });

      const accommodationMap: Record<string, typeof accommodations[0]> = {};
      accommodations?.forEach((acc) => { accommodationMap[acc.id] = acc; });

      const linkedAccommodationIds = new Set(
        programs?.filter((p) => p.linked_accommodation_id).map((p) => p.linked_accommodation_id)
      );

      const projectList: Project[] = [];

      programs?.forEach((prog) => {
        const linkedAcc = prog.linked_accommodation_id ? accommodationMap[prog.linked_accommodation_id] : null;
        const stats = itemStats[prog.id] || { total: 0, pending: 0, confirmed: 0, notSent: 0 };

        projectList.push({
          id: prog.id,
          type: linkedAcc ? "combined" : "program_only",
          program_id: prog.id,
          program_ref: prog.reference_number,
          program_status: prog.status,
          program_type: prog.program_type,
          quote_status: prog.quote_status,
          completion_status: prog.completion_status,
          accommodation_id: linkedAcc?.id || null,
          accommodation_ref: linkedAcc?.reference_number || null,
          accommodation_status: linkedAcc?.status || null,
          accommodation_arrival: linkedAcc?.arrival_date || null,
          accommodation_departure: linkedAcc?.departure_date || null,
          customer_name: prog.customer_name,
          customer_email: prog.customer_email,
          customer_company: prog.customer_company,
          customer_token: prog.customer_token,
          number_of_people: prog.number_of_people,
          selected_dates: Array.isArray(prog.selected_dates) ? prog.selected_dates.map(String) : [],
          terms_accepted_at: prog.terms_accepted_at,
          created_at: prog.created_at,
          item_count: stats.total,
          items_pending: stats.pending,
          items_confirmed: stats.confirmed,
          items_not_sent: stats.notSent,
          accommodation_quotes: linkedAcc ? (quotesByAccRequest[linkedAcc.id] || []) : [],
          item_details: itemDetailsByRequest[prog.id] || [],
        });
      });

      accommodations?.forEach((acc) => {
        if (linkedAccommodationIds.has(acc.id)) return;
        projectList.push({
          id: acc.id,
          type: "accommodation_only",
          program_id: null,
          program_ref: null,
          program_status: null,
          program_type: null,
          quote_status: null,
          completion_status: null,
          accommodation_id: acc.id,
          accommodation_ref: acc.reference_number,
          accommodation_status: acc.status,
          accommodation_arrival: acc.arrival_date,
          accommodation_departure: acc.departure_date,
          customer_name: acc.customer_name,
          customer_email: acc.customer_email,
          customer_company: acc.customer_company,
          customer_token: acc.customer_token,
          number_of_people: acc.number_of_guests,
          selected_dates: [],
          terms_accepted_at: null,
          created_at: acc.created_at,
          item_count: 0,
          items_pending: 0,
          items_confirmed: 0,
          items_not_sent: 0,
          accommodation_quotes: quotesByAccRequest[acc.id] || [],
          item_details: [],
        });
      });

      projectList.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      return projectList;
    },
  });

  const filteredProjects = useMemo(() => {
    return (projects || []).filter((project) => {
      const query = searchQuery.toLowerCase();
      const matchesSearch =
        project.customer_name.toLowerCase().includes(query) ||
        project.customer_email.toLowerCase().includes(query) ||
        (project.customer_company?.toLowerCase().includes(query) ?? false) ||
        (project.program_ref?.toLowerCase().includes(query) ?? false) ||
        (project.accommodation_ref?.toLowerCase().includes(query) ?? false);

      let matchesStatus = statusFilter === "all";
      if (!matchesStatus) {
        const derived = getDerivedStatus(project);
        matchesStatus = derived === statusFilter;
      }

      const matchesType = typeFilter === "all" || project.type === typeFilter;

      return matchesSearch && matchesStatus && matchesType;
    });
  }, [projects, searchQuery, statusFilter, typeFilter]);

  const stats = useMemo(() => {
    const all = projects || [];
    return {
      total: all.length,
      concept: all.filter((p) => getDerivedStatus(p) === "concept").length,
      offerte: all.filter((p) => getDerivedStatus(p) === "offerte_verstuurd").length,
      avGetekend: all.filter((p) => getDerivedStatus(p) === "av_getekend").length,
    };
  }, [projects]);

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-10 w-48" />
        <div className="grid grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24" />)}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Klantprojecten</h1>
          <p className="text-slate-600">Centraal overzicht van alle klantopdrachten (logies + activiteiten)</p>
        </div>
        <Link to="/admin/programma-nieuw">
          <Button>
            <FolderKanban className="h-4 w-4 mr-2" />
            Nieuw programma
          </Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-slate-100 rounded-lg">
                <FolderKanban className="h-5 w-5 text-slate-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-sm text-slate-600">Totaal projecten</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-slate-100 rounded-lg">
                <FileText className="h-5 w-5 text-slate-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.concept}</p>
                <p className="text-sm text-slate-600">Concept</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Send className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.offerte}</p>
                <p className="text-sm text-slate-600">Offerte verstuurd</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <FileCheck className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.avGetekend}</p>
                <p className="text-sm text-slate-600">AV getekend</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-4 flex-wrap">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Zoek op naam, referentie of bedrijf..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Projecttype" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle types</SelectItem>
            <SelectItem value="combined">Logies + Activiteiten</SelectItem>
            <SelectItem value="accommodation_only">Alleen logies</SelectItem>
            <SelectItem value="program_only">Alleen activiteiten</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle statussen</SelectItem>
            <SelectItem value="concept">Concept</SelectItem>
            <SelectItem value="offerte_verstuurd">Offerte verstuurd</SelectItem>
            <SelectItem value="av_getekend">AV getekend</SelectItem>
            <SelectItem value="afgerond">Afgerond</SelectItem>
            <SelectItem value="actief">Actief</SelectItem>
            <SelectItem value="geannuleerd">Geannuleerd</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* View tabs */}
      <Tabs defaultValue="tabel" className="space-y-4">
        <TabsList>
          <TabsTrigger value="tabel" className="gap-1.5">
            <TableIcon className="h-4 w-4" />
            Tabel
          </TabsTrigger>
          <TabsTrigger value="gantt" className="gap-1.5">
            <BarChart3 className="h-4 w-4" />
            Gantt
          </TabsTrigger>
          <TabsTrigger value="kalender" className="gap-1.5">
            <CalendarDays className="h-4 w-4" />
            Kalender
          </TabsTrigger>
          <TabsTrigger value="datumlijst" className="gap-1.5">
            <List className="h-4 w-4" />
            Datumlijst
          </TabsTrigger>
        </TabsList>

        <TabsContent value="tabel">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8"></TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Referentie(s)</TableHead>
                    <TableHead>Klant</TableHead>
                    <TableHead>Logies</TableHead>
                    <TableHead>Activiteiten</TableHead>
                    <TableHead>Datum(s)</TableHead>
                    <TableHead>Personen</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProjects.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                        Geen projecten gevonden
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredProjects.map((project) => {
                      const derived = getDerivedStatus(project);
                      const statusConfig = DERIVED_STATUS_CONFIG[derived];
                      const isExpanded = expandedRows.has(project.id);
                      const hasDetails = project.accommodation_quotes.length > 0 || project.item_details.length > 0;
                      const earliestDeadline = getEarliestDeadline(project.accommodation_quotes);
                      const daysUntilDeadline = earliestDeadline ? differenceInDays(earliestDeadline, new Date()) : null;

                      return (
                        <Collapsible key={project.id} open={isExpanded} onOpenChange={() => toggleRow(project.id)} asChild>
                          <>
                            <CollapsibleTrigger asChild>
                              <TableRow className={cn("cursor-pointer", hasDetails && "hover:bg-muted/50")}>
                                <TableCell className="px-2">
                                  {hasDetails && (
                                    <ChevronDown className={cn(
                                      "h-4 w-4 text-muted-foreground transition-transform",
                                      isExpanded && "rotate-180"
                                    )} />
                                  )}
                                </TableCell>
                                <TableCell>
                                  <div className="flex flex-col gap-1">
                                    <Badge
                                      variant="outline"
                                      className={`text-xs ${
                                        project.type === "combined"
                                          ? "border-indigo-200 bg-indigo-50 text-indigo-700"
                                          : project.type === "accommodation_only"
                                          ? "border-amber-200 bg-amber-50 text-amber-700"
                                          : "border-green-200 bg-green-50 text-green-700"
                                      }`}
                                    >
                                      {PROJECT_TYPE_CONFIG[project.type].icon}
                                      <span className="ml-1 hidden lg:inline">
                                        {project.type === "combined" ? "Beide" : project.type === "accommodation_only" ? "Logies" : "Activ."}
                                      </span>
                                    </Badge>
                                    {(project.program_type === "quote" || project.program_type?.startsWith("maatwerk_")) && (
                                      <Badge variant="outline" className="text-xs border-purple-200 bg-purple-50 text-purple-700">
                                        Maatwerk
                                      </Badge>
                                    )}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <Badge className={`text-xs ${statusConfig.className}`}>
                                    {statusConfig.icon}
                                    <span className="ml-1">{statusConfig.label}</span>
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  <div className="space-y-1">
                                    {project.program_ref && (
                                      <code className="text-xs font-mono bg-green-50 text-green-700 px-2 py-0.5 rounded block w-fit">
                                        {project.program_ref}
                                      </code>
                                    )}
                                    {project.accommodation_ref && (
                                      <code className="text-xs font-mono bg-amber-50 text-amber-700 px-2 py-0.5 rounded block w-fit">
                                        {project.accommodation_ref}
                                      </code>
                                    )}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <div>
                                    <p className="font-medium">{project.customer_name}</p>
                                    <p className="text-sm text-muted-foreground">
                                      {project.customer_company || project.customer_email}
                                    </p>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  {project.accommodation_id ? (
                                    <div className="space-y-1">
                                      <Link
                                        to={`/admin/logies/${project.accommodation_id}`}
                                        className="text-sm text-indigo-600 hover:underline"
                                        onClick={(e) => e.stopPropagation()}
                                      >
                                        Bekijk
                                      </Link>
                                      {project.accommodation_status && (
                                        <Badge
                                          className={`text-xs block w-fit ${
                                            ACCOMMODATION_STATUS_CONFIG[project.accommodation_status]?.color ||
                                            "bg-slate-100 text-slate-800"
                                          }`}
                                        >
                                          {ACCOMMODATION_STATUS_CONFIG[project.accommodation_status]?.label ||
                                            project.accommodation_status}
                                        </Badge>
                                      )}
                                      {earliestDeadline && (
                                        <span className={cn(
                                          "text-xs flex items-center gap-1",
                                          daysUntilDeadline !== null && daysUntilDeadline < 3
                                            ? "text-red-600 font-medium"
                                            : daysUntilDeadline !== null && daysUntilDeadline < 7
                                            ? "text-amber-600"
                                            : "text-muted-foreground"
                                        )}>
                                          {daysUntilDeadline !== null && daysUntilDeadline < 3 && (
                                            <AlertCircle className="h-3 w-3" />
                                          )}
                                          ⏰ {format(earliestDeadline, "d MMM", { locale: nl })}
                                        </span>
                                      )}
                                    </div>
                                  ) : (
                                    <span className="text-muted-foreground text-sm">-</span>
                                  )}
                                </TableCell>
                                <TableCell>
                                  {project.program_id ? (
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <Link
                                        to={`/admin/aanvragen/${project.program_id}`}
                                        className="text-sm text-indigo-600 hover:underline"
                                        onClick={(e) => e.stopPropagation()}
                                      >
                                        {project.item_count} items
                                      </Link>
                                      {project.items_not_sent > 0 && (
                                        <Badge variant="outline" className="text-slate-600 border-slate-200 bg-slate-50 text-xs">
                                          <Send className="h-3 w-3 mr-1" />
                                          {project.items_not_sent}
                                        </Badge>
                                      )}
                                      {project.items_pending > 0 && (
                                        <Badge variant="outline" className="text-amber-600 border-amber-200 bg-amber-50 text-xs">
                                          <Clock className="h-3 w-3 mr-1" />
                                          {project.items_pending}
                                        </Badge>
                                      )}
                                      {project.items_confirmed > 0 && (
                                        <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50 text-xs">
                                          <CheckCircle2 className="h-3 w-3 mr-1" />
                                          {project.items_confirmed}
                                        </Badge>
                                      )}
                                    </div>
                                  ) : (
                                    <span className="text-muted-foreground text-sm">-</span>
                                  )}
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-1">
                                    <Calendar className="h-4 w-4 text-muted-foreground" />
                                    <span className="text-sm">
                                      {project.selected_dates.length > 0
                                        ? project.selected_dates
                                            .slice(0, 2)
                                            .map((d) => format(new Date(d), "d MMM", { locale: nl }))
                                            .join(", ")
                                        : project.accommodation_arrival
                                        ? `${format(new Date(project.accommodation_arrival), "d MMM", { locale: nl })} - ${format(new Date(project.accommodation_departure!), "d MMM", { locale: nl })}`
                                        : "-"}
                                      {project.selected_dates.length > 2 && (
                                        <span className="text-muted-foreground"> +{project.selected_dates.length - 2}</span>
                                      )}
                                    </span>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-1">
                                    <Users className="h-4 w-4 text-muted-foreground" />
                                    {project.number_of_people}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                                    {project.program_id ? (
                                      <Button variant="ghost" size="icon" asChild>
                                        <Link to={`/admin/aanvragen/${project.program_id}`}>
                                          <Eye className="h-4 w-4" />
                                        </Link>
                                      </Button>
                                    ) : project.accommodation_id ? (
                                      <Button variant="ghost" size="icon" asChild>
                                        <Link to={`/admin/logies/${project.accommodation_id}`}>
                                          <Eye className="h-4 w-4" />
                                        </Link>
                                      </Button>
                                    ) : null}
                                    <Button variant="ghost" size="icon" asChild>
                                      <Link
                                        to={`/mijn-programma/${project.customer_token}`}
                                        target="_blank"
                                      >
                                        <ExternalLink className="h-4 w-4" />
                                      </Link>
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                      onClick={() => {
                                        setDeleteAccommodation(false);
                                        setDeleteTarget(project);
                                      }}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            </CollapsibleTrigger>
                            <CollapsibleContent asChild>
                              <tr>
                                <td colSpan={10} className="p-0">
                                  <div className="bg-muted/30 border-t px-6 py-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                      {/* Logies section */}
                                      {project.accommodation_quotes.length > 0 && (
                                        <div>
                                          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                            <Hotel className="h-3.5 w-3.5" />
                                            Logies {project.accommodation_ref && <span className="font-mono text-[10px] normal-case">({project.accommodation_ref})</span>}
                                          </h4>
                                          <div className="space-y-1">
                                            {project.accommodation_quotes.map((q, i) => {
                                              const deadlineDays = q.valid_until ? differenceInDays(new Date(q.valid_until), new Date()) : null;
                                              return (
                                                <div key={i} className="flex items-center justify-between text-sm py-0.5">
                                                  <span className="flex items-center gap-1.5">
                                                    <span>{QUOTE_STATUS_ICON[q.status] || "❓"}</span>
                                                    <span className={cn(
                                                      q.status === "declined" || q.status === "rejected" ? "text-muted-foreground line-through" : ""
                                                    )}>
                                                      {q.partner_name}
                                                    </span>
                                                  </span>
                                                  {q.status === "pending" && q.valid_until && (
                                                    <span className={cn(
                                                      "text-xs",
                                                      deadlineDays !== null && deadlineDays < 3
                                                        ? "text-red-600 font-medium"
                                                        : deadlineDays !== null && deadlineDays < 7
                                                        ? "text-amber-600"
                                                        : "text-muted-foreground"
                                                    )}>
                                                      deadline {format(new Date(q.valid_until), "d MMM", { locale: nl })}
                                                    </span>
                                                  )}
                                                  {q.status === "submitted" && (
                                                    <span className="text-xs text-blue-600">offerte ingediend</span>
                                                  )}
                                                  {q.status === "selected" && (
                                                    <span className="text-xs text-green-600">geselecteerd</span>
                                                  )}
                                                </div>
                                              );
                                            })}
                                          </div>
                                        </div>
                                      )}

                                      {/* Activiteiten section */}
                                      {project.item_details.length > 0 && (
                                        <div>
                                          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                            <Activity className="h-3.5 w-3.5" />
                                            Activiteiten
                                          </h4>
                                          {/* Summary counts */}
                                          <div className="flex flex-wrap gap-2 mb-2">
                                            {project.items_confirmed > 0 && (
                                              <span className="text-xs text-green-700 bg-green-50 px-2 py-0.5 rounded">
                                                ✅ {project.items_confirmed} bevestigd
                                              </span>
                                            )}
                                            {project.items_pending > 0 && (
                                              <span className="text-xs text-amber-700 bg-amber-50 px-2 py-0.5 rounded">
                                                ⏳ {project.items_pending} in afwachting
                                              </span>
                                            )}
                                            {project.items_not_sent > 0 && (
                                              <span className="text-xs text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                                                📤 {project.items_not_sent} nog niet verstuurd
                                              </span>
                                            )}
                                            {(() => {
                                              const other = project.item_count - project.items_confirmed - project.items_pending - project.items_not_sent;
                                              return other > 0 ? (
                                                <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">
                                                  {other} overig
                                                </span>
                                              ) : null;
                                            })()}
                                          </div>
                                          {/* Unique partner list */}
                                          <div className="space-y-0.5">
                                            <p className="text-xs text-muted-foreground font-medium">Partners:</p>
                                            {[...new Set(project.item_details.map(d => d.provider_name))].map((name, i) => (
                                              <p key={i} className="text-sm text-foreground">{name}</p>
                                            ))}
                                          </div>
                                        </div>
                                      )}

                                      {/* If only accommodation_only with no quotes */}
                                      {project.accommodation_quotes.length === 0 && project.item_details.length === 0 && (
                                        <p className="text-sm text-muted-foreground col-span-2">Geen details beschikbaar.</p>
                                      )}
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            </CollapsibleContent>
                          </>
                        </Collapsible>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="gantt">
          <ProjectGanttChart projects={filteredProjects} />
        </TabsContent>

        <TabsContent value="kalender">
          <ProjectCalendarView projects={filteredProjects} />
        </TabsContent>

        <TabsContent value="datumlijst">
          <ProjectDateListView projects={filteredProjects} />
        </TabsContent>
      </Tabs>

      {/* Delete confirmation dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Project verwijderen</AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p>
                Weet je zeker dat je het project van <strong>{deleteTarget?.customer_name}</strong>
                {deleteTarget?.program_ref ? ` (${deleteTarget.program_ref})` : ""} wilt verwijderen?
              </p>
              <p>Het project krijgt de status "verwijderd" en wordt verborgen uit het overzicht. Facturatiegegevens blijven bewaard.</p>
              {deleteTarget?.accommodation_id && (
                <div className="flex items-start gap-2 pt-2 border-t">
                  <Checkbox
                    id="delete-accommodation"
                    checked={deleteAccommodation}
                    onCheckedChange={(checked) => setDeleteAccommodation(checked === true)}
                  />
                  <label htmlFor="delete-accommodation" className="text-sm leading-tight cursor-pointer">
                    Ook de gekoppelde logiesaanvraag ({deleteTarget.accommodation_ref}) verwijderen.
                    <span className="text-muted-foreground block text-xs mt-0.5">
                      Indien uitgeschakeld blijft de logiesaanvraag als zelfstandige aanvraag bestaan.
                    </span>
                  </label>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Annuleren</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              disabled={isDeleting}
              onClick={async () => {
                if (!deleteTarget) return;
                setIsDeleting(true);
                try {
                  if (deleteTarget.accommodation_id && !deleteAccommodation) {
                    await supabase
                      .from("accommodation_requests")
                      .update({ linked_program_id: null })
                      .eq("id", deleteTarget.accommodation_id);
                  }

                  if (deleteTarget.program_id) {
                    await supabase
                      .from("program_requests")
                      .update({ status: "deleted", linked_accommodation_id: null })
                      .eq("id", deleteTarget.program_id);
                  }

                  if (deleteTarget.accommodation_id && deleteAccommodation) {
                    await supabase
                      .from("accommodation_requests")
                      .update({ status: "cancelled", linked_program_id: null })
                      .eq("id", deleteTarget.accommodation_id);
                  }

                  toast({ title: "Project verwijderd", description: "Het project is succesvol verwijderd." });
                  queryClient.invalidateQueries({ queryKey: ["admin-projects-unified"] });
                } catch {
                  toast({ title: "Fout", description: "Kon het project niet verwijderen.", variant: "destructive" });
                } finally {
                  setIsDeleting(false);
                  setDeleteTarget(null);
                }
              }}
            >
              {isDeleting ? "Verwijderen..." : "Verwijderen"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

const AdminProjects = () => {
  return (
    <>
      <Helmet>
        <title>Klantprojecten | Admin Bureau Vlieland</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>
      <AdminLayout>
        <AdminProjectsContent />
      </AdminLayout>
    </>
  );
};

export default AdminProjects;
