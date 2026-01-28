import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
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
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import {
  Search,
  Eye,
  Calendar,
  Users,
  Building2,
  Activity,
  FolderKanban,
  ExternalLink,
  CheckCircle2,
  Clock,
  Hotel,
} from "lucide-react";

// Project types: program_only, accommodation_only, combined
type ProjectType = "program_only" | "accommodation_only" | "combined";

interface Project {
  // Unified ID (uses program_id if available, otherwise accommodation_id)
  id: string;
  type: ProjectType;
  
  // Program data (null for standalone accommodations)
  program_id: string | null;
  program_ref: string | null;
  program_status: string | null;
  
  // Accommodation data (null for standalone programs)
  accommodation_id: string | null;
  accommodation_ref: string | null;
  accommodation_status: string | null;
  accommodation_arrival: string | null;
  accommodation_departure: string | null;
  
  // Shared/merged fields
  customer_name: string;
  customer_email: string;
  customer_company: string | null;
  customer_token: string;
  number_of_people: number;
  selected_dates: string[];
  terms_accepted_at: string | null;
  created_at: string;
  
  // Activity stats (only for projects with programs)
  item_count: number;
  items_pending: number;
  items_confirmed: number;
}

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

const AdminProjectsContent = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");

  const { data: projects, isLoading } = useQuery({
    queryKey: ["admin-projects-unified"],
    queryFn: async () => {
      // 1. Fetch all program requests
      const { data: programs, error: progError } = await supabase
        .from("program_requests")
        .select(`
          id,
          reference_number,
          customer_name,
          customer_email,
          customer_company,
          customer_token,
          number_of_people,
          selected_dates,
          status,
          terms_accepted_at,
          created_at,
          linked_accommodation_id
        `)
        .order("created_at", { ascending: false });

      if (progError) throw progError;

      // 2. Fetch all accommodation requests
      const { data: accommodations, error: accError } = await supabase
        .from("accommodation_requests")
        .select(`
          id,
          reference_number,
          customer_name,
          customer_email,
          customer_company,
          customer_token,
          number_of_guests,
          arrival_date,
          departure_date,
          status,
          created_at,
          linked_program_id
        `)
        .order("created_at", { ascending: false });

      if (accError) throw accError;

      // 3. Fetch item counts for program requests
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

      // 4. Create accommodation lookup map
      const accommodationMap: Record<string, typeof accommodations[0]> = {};
      accommodations?.forEach((acc) => {
        accommodationMap[acc.id] = acc;
      });

      // 5. Create program lookup map (to check which accommodations are linked)
      const linkedAccommodationIds = new Set(
        programs?.filter((p) => p.linked_accommodation_id).map((p) => p.linked_accommodation_id)
      );

      // 6. Build unified projects list
      const projectList: Project[] = [];

      // Add all program requests (with or without linked accommodation)
      programs?.forEach((prog) => {
        const linkedAcc = prog.linked_accommodation_id 
          ? accommodationMap[prog.linked_accommodation_id] 
          : null;
        const stats = itemStats[prog.id] || { total: 0, pending: 0, confirmed: 0 };

        projectList.push({
          id: prog.id,
          type: linkedAcc ? "combined" : "program_only",
          
          program_id: prog.id,
          program_ref: prog.reference_number,
          program_status: prog.status,
          
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

      // Add standalone accommodation requests (not linked to any program)
      accommodations?.forEach((acc) => {
        // Skip if this accommodation is already linked to a program
        if (linkedAccommodationIds.has(acc.id)) return;

        projectList.push({
          id: acc.id,
          type: "accommodation_only",
          
          program_id: null,
          program_ref: null,
          program_status: null,
          
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

      // Sort by created_at descending
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

      // Status filter applies to program status OR accommodation status
      let matchesStatus = statusFilter === "all";
      if (!matchesStatus) {
        if (project.program_status === statusFilter) matchesStatus = true;
        if (project.accommodation_status === statusFilter) matchesStatus = true;
      }

      const matchesType = typeFilter === "all" || project.type === typeFilter;

      return matchesSearch && matchesStatus && matchesType;
    });
  }, [projects, searchQuery, statusFilter, typeFilter]);

  const stats = useMemo(() => {
    const all = projects || [];
    return {
      total: all.length,
      combined: all.filter((p) => p.type === "combined").length,
      accommodationOnly: all.filter((p) => p.type === "accommodation_only").length,
      programOnly: all.filter((p) => p.type === "program_only").length,
    };
  }, [projects]);

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-10 w-48" />
        <div className="grid grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Klantprojecten</h1>
        <p className="text-slate-600">Centraal overzicht van alle klantopdrachten (logies + activiteiten)</p>
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
              <div className="p-2 bg-indigo-100 rounded-lg">
                <Building2 className="h-5 w-5 text-indigo-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.combined}</p>
                <p className="text-sm text-slate-600">Logies + Activiteiten</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 rounded-lg">
                <Hotel className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.accommodationOnly}</p>
                <p className="text-sm text-slate-600">Alleen logies</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Activity className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.programOnly}</p>
                <p className="text-sm text-slate-600">Alleen activiteiten</p>
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
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle statussen</SelectItem>
            <SelectItem value="active">Actief</SelectItem>
            <SelectItem value="submitted">Nieuw (logies)</SelectItem>
            <SelectItem value="processing">In behandeling</SelectItem>
            <SelectItem value="quoted">Offertes ontvangen</SelectItem>
            <SelectItem value="cancelled">Geannuleerd</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Projects table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
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
                  <TableCell colSpan={8} className="text-center py-8 text-slate-500">
                    Geen projecten gevonden
                  </TableCell>
                </TableRow>
              ) : (
                filteredProjects.map((project) => (
                  <TableRow key={project.id}>
                    <TableCell>
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
                        <p className="text-sm text-slate-500">
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
                        <span className="text-slate-400 text-sm">-</span>
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
                        <span className="text-slate-400 text-sm">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4 text-slate-400" />
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
                            <span className="text-slate-400"> +{project.selected_dates.length - 2}</span>
                          )}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Users className="h-4 w-4 text-slate-400" />
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
                            to={project.type === "accommodation_only" 
                              ? `/mijn-logies/${project.customer_token}` 
                              : `/mijn-programma/${project.customer_token}`
                            } 
                            target="_blank"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Link>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
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
