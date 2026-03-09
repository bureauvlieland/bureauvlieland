import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet";
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
import { format } from "date-fns";
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
} from "lucide-react";
import { ProjectGanttChart } from "@/components/admin/ProjectGanttChart";
import { ProjectCalendarView } from "@/components/admin/ProjectCalendarView";
import { ProjectDateListView } from "@/components/admin/ProjectDateListView";
import { toast } from "@/hooks/use-toast";

type ProjectType = "program_only" | "accommodation_only" | "combined";

type DerivedStatus = "concept" | "offerte_verstuurd" | "av_getekend" | "afgerond" | "geannuleerd" | "actief";

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
}

const DERIVED_STATUS_CONFIG: Record<DerivedStatus, { label: string; className: string; icon: React.ReactNode }> = {
  concept: { label: "Concept", className: "bg-slate-100 text-slate-700", icon: <FileText className="h-3 w-3" /> },
  offerte_verstuurd: { label: "Offerte verstuurd", className: "bg-blue-100 text-blue-800", icon: <Send className="h-3 w-3" /> },
  av_getekend: { label: "AV getekend", className: "bg-green-100 text-green-800", icon: <FileCheck className="h-3 w-3" /> },
  afgerond: { label: "Afgerond", className: "bg-emerald-100 text-emerald-800", icon: <CheckCircle2 className="h-3 w-3" /> },
  geannuleerd: { label: "Geannuleerd", className: "bg-red-100 text-red-800", icon: <XCircle className="h-3 w-3" /> },
  actief: { label: "Actief", className: "bg-blue-50 text-blue-700", icon: <Activity className="h-3 w-3" /> },
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

function getDerivedStatus(project: Project): DerivedStatus {
  if (project.program_status === "cancelled" || project.accommodation_status === "cancelled") return "geannuleerd";
  if (project.completion_status === "completed") return "afgerond";
  if (project.terms_accepted_at) return "av_getekend";
  if (project.quote_status === "offerte_verstuurd") return "offerte_verstuurd";
  if (project.quote_status === "concept") return "concept";
  return "actief";
}

const AdminProjectsContent = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [deleteTarget, setDeleteTarget] = useState<Project | null>(null);
  const [deleteAccommodation, setDeleteAccommodation] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const queryClient = useQueryClient();

  const { data: projects, isLoading } = useQuery({
    queryKey: ["admin-projects-unified"],
    queryFn: async () => {
      const { data: programs, error: progError } = await supabase
        .from("program_requests")
        .select(`
          id, reference_number, customer_name, customer_email, customer_company,
          customer_token, number_of_people, selected_dates, status,
          terms_accepted_at, created_at, linked_accommodation_id,
          program_type, quote_status, completion_status
        `)
        .neq("status", "deleted")
        .order("created_at", { ascending: false });

      if (progError) throw progError;

      const { data: accommodations, error: accError } = await supabase
        .from("accommodation_requests")
        .select(`
          id, reference_number, customer_name, customer_email, customer_company,
          customer_token, number_of_guests, arrival_date, departure_date,
          status, created_at, linked_program_id
        `)
        .order("created_at", { ascending: false });

      if (accError) throw accError;

      const { data: items } = await supabase
        .from("program_request_items")
        .select("request_id, status");

      const itemStats: Record<string, { total: number; pending: number; confirmed: number }> = {};
      items?.forEach((item) => {
        if (!itemStats[item.request_id]) {
          itemStats[item.request_id] = { total: 0, pending: 0, confirmed: 0 };
        }
        itemStats[item.request_id].total++;
        if (item.status === "pending") itemStats[item.request_id].pending++;
        if (item.status === "confirmed") itemStats[item.request_id].confirmed++;
      });

      const accommodationMap: Record<string, typeof accommodations[0]> = {};
      accommodations?.forEach((acc) => { accommodationMap[acc.id] = acc; });

      const linkedAccommodationIds = new Set(
        programs?.filter((p) => p.linked_accommodation_id).map((p) => p.linked_accommodation_id)
      );

      const projectList: Project[] = [];

      programs?.forEach((prog) => {
        const linkedAcc = prog.linked_accommodation_id ? accommodationMap[prog.linked_accommodation_id] : null;
        const stats = itemStats[prog.id] || { total: 0, pending: 0, confirmed: 0 };

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
                      <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                        Geen projecten gevonden
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredProjects.map((project) => {
                      const derived = getDerivedStatus(project);
                      const statusConfig = DERIVED_STATUS_CONFIG[derived];

                      return (
                        <TableRow key={project.id}>
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
                              {project.program_type === "quote" && (
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
                              </div>
                            ) : (
                              <span className="text-muted-foreground text-sm">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {project.program_id ? (
                              <div className="flex items-center gap-2">
                                <Link
                                  to={`/admin/aanvragen/${project.program_id}`}
                                  className="text-sm text-indigo-600 hover:underline"
                                >
                                  {project.item_count} items
                                </Link>
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
                            <div className="flex gap-1">
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
