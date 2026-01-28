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

interface Project {
  id: string;
  reference_number: string | null;
  customer_name: string;
  customer_email: string;
  customer_company: string | null;
  customer_token: string;
  number_of_people: number;
  selected_dates: string[];
  status: string;
  terms_accepted_at: string | null;
  created_at: string;
  updated_at: string;
  accommodation_id: string | null;
  accommodation_ref: string | null;
  accommodation_status: string | null;
  accommodation_arrival: string | null;
  accommodation_departure: string | null;
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

const AdminProjectsContent = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const { data: projects, isLoading } = useQuery({
    queryKey: ["admin-projects"],
    queryFn: async () => {
      // Fetch program requests with linked accommodation
      const { data: requests, error: reqError } = await supabase
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
          updated_at,
          linked_accommodation_id
        `)
        .order("created_at", { ascending: false });

      if (reqError) throw reqError;

      // Fetch accommodation requests
      const accommodationIds = requests
        ?.filter((r) => r.linked_accommodation_id)
        .map((r) => r.linked_accommodation_id) || [];

      let accommodationMap: Record<string, any> = {};
      if (accommodationIds.length > 0) {
        const { data: accommodations } = await supabase
          .from("accommodation_requests")
          .select("id, reference_number, status, arrival_date, departure_date")
          .in("id", accommodationIds);

        accommodations?.forEach((acc) => {
          accommodationMap[acc.id] = acc;
        });
      }

      // Fetch item counts
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

      // Map to projects
      const mappedProjects: Project[] = (requests || []).map((req) => {
        const acc = req.linked_accommodation_id ? accommodationMap[req.linked_accommodation_id] : null;
        const stats = itemStats[req.id] || { total: 0, pending: 0, confirmed: 0 };

        return {
          id: req.id,
          reference_number: req.reference_number,
          customer_name: req.customer_name,
          customer_email: req.customer_email,
          customer_company: req.customer_company,
          customer_token: req.customer_token,
          number_of_people: req.number_of_people,
          selected_dates: Array.isArray(req.selected_dates) ? req.selected_dates.map(String) : [],
          status: req.status,
          terms_accepted_at: req.terms_accepted_at,
          created_at: req.created_at,
          updated_at: req.updated_at,
          accommodation_id: acc?.id || null,
          accommodation_ref: acc?.reference_number || null,
          accommodation_status: acc?.status || null,
          accommodation_arrival: acc?.arrival_date || null,
          accommodation_departure: acc?.departure_date || null,
          item_count: stats.total,
          items_pending: stats.pending,
          items_confirmed: stats.confirmed,
        };
      });

      return mappedProjects;
    },
  });

  const filteredProjects = useMemo(() => {
    return (projects || []).filter((project) => {
      const query = searchQuery.toLowerCase();
      const matchesSearch =
        project.customer_name.toLowerCase().includes(query) ||
        project.customer_email.toLowerCase().includes(query) ||
        (project.customer_company?.toLowerCase().includes(query) ?? false) ||
        (project.reference_number?.toLowerCase().includes(query) ?? false) ||
        (project.accommodation_ref?.toLowerCase().includes(query) ?? false);

      const matchesStatus = statusFilter === "all" || project.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [projects, searchQuery, statusFilter]);

  const stats = useMemo(() => {
    const all = projects || [];
    return {
      total: all.length,
      withAccommodation: all.filter((p) => p.accommodation_id).length,
      active: all.filter((p) => p.status === "active").length,
      termsAccepted: all.filter((p) => p.terms_accepted_at).length,
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
        <p className="text-slate-600">Overzicht van alle klantopdrachten (logies + activiteiten)</p>
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
                <Hotel className="h-5 w-5 text-indigo-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.withAccommodation}</p>
                <p className="text-sm text-slate-600">Met logies</p>
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
                <p className="text-2xl font-bold">{stats.active}</p>
                <p className="text-sm text-slate-600">Actief</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 rounded-lg">
                <CheckCircle2 className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.termsAccepted}</p>
                <p className="text-sm text-slate-600">Voorwaarden akkoord</p>
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
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle statussen</SelectItem>
            <SelectItem value="active">Actief</SelectItem>
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
                <TableHead>Referentie</TableHead>
                <TableHead>Klant</TableHead>
                <TableHead>Logies</TableHead>
                <TableHead>Activiteiten</TableHead>
                <TableHead>Datum(s)</TableHead>
                <TableHead>Personen</TableHead>
                <TableHead>Status</TableHead>
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
                      <code className="text-sm font-mono bg-slate-100 px-2 py-1 rounded">
                        {project.reference_number || "-"}
                      </code>
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
                            className="text-sm font-mono text-indigo-600 hover:underline"
                          >
                            {project.accommodation_ref || "Bekijk"}
                          </Link>
                          {project.accommodation_status && (
                            <Badge
                              className={`text-xs ${
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
                      <div className="flex items-center gap-2">
                        <span className="text-sm">{project.item_count} items</span>
                        {project.items_pending > 0 && (
                          <Badge variant="outline" className="text-amber-600 border-amber-200 bg-amber-50">
                            <Clock className="h-3 w-3 mr-1" />
                            {project.items_pending}
                          </Badge>
                        )}
                        {project.items_confirmed > 0 && (
                          <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            {project.items_confirmed}
                          </Badge>
                        )}
                      </div>
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
                            ? format(new Date(project.accommodation_arrival), "d MMM", { locale: nl })
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
                      <div className="space-y-1">
                        <Badge
                          variant={
                            project.status === "active"
                              ? "default"
                              : project.status === "cancelled"
                              ? "destructive"
                              : "secondary"
                          }
                        >
                          {project.status === "active" ? "Actief" : project.status === "cancelled" ? "Geannuleerd" : project.status}
                        </Badge>
                        {project.terms_accepted_at && (
                          <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50 block w-fit">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Akkoord
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" asChild>
                          <Link to={`/admin/aanvragen/${project.id}`}>
                            <Eye className="h-4 w-4" />
                          </Link>
                        </Button>
                        <Button variant="ghost" size="icon" asChild>
                          <Link to={`/mijn-programma/${project.customer_token}`} target="_blank">
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
