import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  Building2,
  Calendar,
  Users,
  Search,
  Eye,
  Filter,
  Hotel,
  Home,
  Tent,
  HelpCircle,
  Archive,
  CheckCircle2,
  XCircle,
  Inbox,
} from "lucide-react";

const STATUS_CONFIG: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; className?: string }> = {
  submitted: { label: "Nieuw", variant: "default" },
  processing: { label: "In behandeling", variant: "secondary" },
  quoted: { label: "Offertes verstuurd", variant: "outline" },
  accepted: { label: "Geaccepteerd", variant: "outline", className: "bg-green-100 text-green-800 border-green-200" },
  cancelled: { label: "Geannuleerd", variant: "destructive" },
  expired: { label: "Verlopen", variant: "destructive" },
};

const TYPE_ICONS: Record<string, React.ReactNode> = {
  hotel: <Hotel className="h-4 w-4" />,
  vacation_home: <Home className="h-4 w-4" />,
  group_accommodation: <Building2 className="h-4 w-4" />,
  camping: <Tent className="h-4 w-4" />,
  no_preference: <HelpCircle className="h-4 w-4" />,
};

const TYPE_LABELS: Record<string, string> = {
  hotel: "Hotel",
  vacation_home: "Vakantiewoning",
  group_accommodation: "Groepsaccommodatie",
  camping: "Camping",
  no_preference: "Geen voorkeur",
};

type ViewMode = "active" | "archive";
type ArchiveFilter = "all" | "realised" | "cancelled";

export default function AdminAccommodation() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [view, setView] = useState<ViewMode>("active");
  const [archiveFilter, setArchiveFilter] = useState<ArchiveFilter>("all");

  const { data: requests, isLoading } = useQuery({
    queryKey: ["admin-accommodation-requests"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("accommodation_requests")
        .select("*, linked_program_id, completion_status, completed_at")
        .order("arrival_date", { ascending: true });

      if (error) throw error;
      return data;
    },
  });

  // Fetch linked program invoicing modes + completion status
  const programIds = requests?.filter(r => r.linked_program_id).map(r => r.linked_program_id!) || [];
  const { data: linkedPrograms } = useQuery({
    queryKey: ["admin-accommodation-program-info", programIds],
    queryFn: async () => {
      if (programIds.length === 0) return {};
      const { data, error } = await supabase
        .from("program_requests")
        .select("id, invoicing_mode, completion_status")
        .in("id", programIds);
      if (error) throw error;
      const map: Record<string, { invoicing_mode: string; completion_status: string | null }> = {};
      data?.forEach(p => { map[p.id] = { invoicing_mode: p.invoicing_mode, completion_status: p.completion_status }; });
      return map;
    },
    enabled: programIds.length > 0,
  });

  const { data: quoteCounts } = useQuery({
    queryKey: ["admin-accommodation-quote-counts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("accommodation_quotes")
        .select("request_id, status");

      if (error) throw error;

      const counts: Record<string, { total: number; submitted: number; declined: number; pending: number; withdrawn: number }> = {};
      data?.forEach((quote) => {
        if (!counts[quote.request_id]) {
          counts[quote.request_id] = { total: 0, submitted: 0, declined: 0, pending: 0, withdrawn: 0 };
        }
        counts[quote.request_id].total++;
        if (quote.status === "submitted") counts[quote.request_id].submitted++;
        if (quote.status === "declined") counts[quote.request_id].declined++;
        if (quote.status === "pending" || quote.status === "requested") counts[quote.request_id].pending++;
        if (quote.status === "withdrawn") counts[quote.request_id].withdrawn++;
      });
      return counts;
    },
  });

  // Determine if a request counts as "realised" (fully invoiced) — own status OR linked program
  const isRealised = (r: any) => {
    if (r.completion_status === "fully_invoiced") return true;
    if (r.linked_program_id) {
      const prog = linkedPrograms?.[r.linked_program_id];
      if (prog?.completion_status === "fully_invoiced") return true;
    }
    return false;
  };

  const isCancelled = (r: any) => r.status === "cancelled" || r.status === "expired";

  // Split requests into active vs archive buckets
  const { activeRequests, archiveRequests, realisedCount, cancelledCount } = useMemo(() => {
    const active: any[] = [];
    const archive: any[] = [];
    let realised = 0;
    let cancelled = 0;
    requests?.forEach((r) => {
      const realisedFlag = isRealised(r);
      const cancelledFlag = isCancelled(r);
      if (realisedFlag) realised++;
      if (cancelledFlag && !realisedFlag) cancelled++;
      if (realisedFlag || cancelledFlag) {
        archive.push({ ...r, _realised: realisedFlag, _cancelled: cancelledFlag });
      } else {
        active.push(r);
      }
    });
    return { activeRequests: active, archiveRequests: archive, realisedCount: realised, cancelledCount: cancelled };
  }, [requests, linkedPrograms]);

  const baseList = view === "active" ? activeRequests : archiveRequests.filter((r) => {
    if (archiveFilter === "realised") return r._realised;
    if (archiveFilter === "cancelled") return r._cancelled && !r._realised;
    return true;
  });

  const filteredRequests = baseList.filter((request) => {
    const matchesSearch =
      request.customer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      request.customer_email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (request.customer_company?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);

    const matchesStatus = statusFilter === "all" || request.status === statusFilter;
    const matchesType = typeFilter === "all" || request.accommodation_type === typeFilter;

    return matchesSearch && matchesStatus && matchesType;
  });

  const activeStats = {
    total: activeRequests.length,
    new: activeRequests.filter((r) => r.status === "submitted").length,
    processing: activeRequests.filter((r) => r.status === "processing").length,
    quoted: activeRequests.filter((r) => r.status === "quoted").length,
  };

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Logies Aanvragen</h1>
            <p className="text-slate-600">Beheer accommodatie aanvragen en offertes</p>
          </div>
          <Tabs value={view} onValueChange={(v) => { setView(v as ViewMode); setStatusFilter("all"); }}>
            <TabsList>
              <TabsTrigger value="active" className="gap-2">
                <Inbox className="h-4 w-4" />
                Actief
                <Badge variant="secondary" className="ml-1">{activeRequests.length}</Badge>
              </TabsTrigger>
              <TabsTrigger value="archive" className="gap-2">
                <Archive className="h-4 w-4" />
                Archief
                <Badge variant="secondary" className="ml-1">{archiveRequests.length}</Badge>
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Stats */}
        {view === "active" ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard icon={<Building2 className="h-5 w-5 text-slate-600" />} bg="bg-slate-100" value={activeStats.total} label="Totaal actief" />
            <StatCard icon={<Building2 className="h-5 w-5 text-amber-600" />} bg="bg-amber-100" value={activeStats.new} label="Nieuw" />
            <StatCard icon={<Building2 className="h-5 w-5 text-blue-600" />} bg="bg-blue-100" value={activeStats.processing} label="In behandeling" />
            <StatCard icon={<Building2 className="h-5 w-5 text-green-600" />} bg="bg-green-100" value={activeStats.quoted} label="Offertes verstuurd" />
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <StatCard icon={<Archive className="h-5 w-5 text-slate-600" />} bg="bg-slate-100" value={archiveRequests.length} label="Totaal in archief" />
            <StatCard icon={<CheckCircle2 className="h-5 w-5 text-emerald-600" />} bg="bg-emerald-100" value={realisedCount} label="Gerealiseerd" />
            <StatCard icon={<XCircle className="h-5 w-5 text-red-600" />} bg="bg-red-100" value={cancelledCount} label="Geannuleerd / Verlopen" />
          </div>
        )}

        {/* Archive sub-filter */}
        {view === "archive" && (
          <Tabs value={archiveFilter} onValueChange={(v) => setArchiveFilter(v as ArchiveFilter)}>
            <TabsList>
              <TabsTrigger value="all">Alles ({archiveRequests.length})</TabsTrigger>
              <TabsTrigger value="realised">Gerealiseerd ({realisedCount})</TabsTrigger>
              <TabsTrigger value="cancelled">Geannuleerd ({cancelledCount})</TabsTrigger>
            </TabsList>
          </Tabs>
        )}

        {/* Filters */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Zoek op naam, email of bedrijf..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full md:w-48">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle statussen</SelectItem>
                  {view === "active" ? (
                    <>
                      <SelectItem value="submitted">Nieuw</SelectItem>
                      <SelectItem value="processing">In behandeling</SelectItem>
                      <SelectItem value="quoted">Offertes verstuurd</SelectItem>
                      <SelectItem value="accepted">Geaccepteerd</SelectItem>
                    </>
                  ) : (
                    <>
                      <SelectItem value="accepted">Geaccepteerd</SelectItem>
                      <SelectItem value="cancelled">Geannuleerd</SelectItem>
                      <SelectItem value="expired">Verlopen</SelectItem>
                    </>
                  )}
                </SelectContent>
              </Select>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-full md:w-48">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle types</SelectItem>
                  <SelectItem value="hotel">Hotel</SelectItem>
                  <SelectItem value="vacation_home">Vakantiewoning</SelectItem>
                  <SelectItem value="group_accommodation">Groepsaccommodatie</SelectItem>
                  <SelectItem value="camping">Camping</SelectItem>
                  <SelectItem value="no_preference">Geen voorkeur</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-6 space-y-4">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : filteredRequests?.length === 0 ? (
              <div className="p-12 text-center text-slate-500">
                {view === "active" ? (
                  <>
                    <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p className="text-lg font-medium">Geen actieve aanvragen</p>
                    <p className="text-sm">Alle aanvragen zijn afgerond of geannuleerd. Bekijk het archief.</p>
                  </>
                ) : (
                  <>
                    <Archive className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p className="text-lg font-medium">Archief is leeg</p>
                    <p className="text-sm">Er zijn nog geen afgeronde of geannuleerde aanvragen.</p>
                  </>
                )}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ref.</TableHead>
                    <TableHead>Klant</TableHead>
                    <TableHead>Facturatie</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Datum</TableHead>
                    <TableHead>Gasten</TableHead>
                    <TableHead>Offertes</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actie</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRequests?.map((request) => {
                    const quoteInfo = quoteCounts?.[request.id];
                    const realised = isRealised(request);
                    const statusConfig = STATUS_CONFIG[request.status] || STATUS_CONFIG.submitted;

                    return (
                      <TableRow key={request.id}>
                        <TableCell>
                          <code className="text-xs font-mono bg-slate-100 px-2 py-1 rounded">
                            {request.reference_number || "-"}
                          </code>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{request.customer_name}</p>
                            <p className="text-sm text-slate-500">
                              {request.customer_company || request.customer_email}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          {(() => {
                            if (!request.linked_program_id) {
                              return <Badge variant="outline" className="text-xs">Zelfstandig</Badge>;
                            }
                            const mode = linkedPrograms?.[request.linked_program_id]?.invoicing_mode;
                            if (mode === "bureau_central") {
                              return <Badge className="text-xs bg-purple-100 text-purple-800">Maatwerk</Badge>;
                            }
                            return <Badge className="text-xs bg-blue-100 text-blue-800">Direct</Badge>;
                          })()}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {TYPE_ICONS[request.accommodation_type]}
                            <span className="text-sm">
                              {TYPE_LABELS[request.accommodation_type]}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2 text-sm">
                            <Calendar className="h-4 w-4 text-slate-400" />
                            <span>
                              {format(new Date(request.arrival_date), "d MMM", { locale: nl })} -{" "}
                              {format(new Date(request.departure_date), "d MMM yyyy", { locale: nl })}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Users className="h-4 w-4 text-slate-400" />
                            <span>{request.number_of_guests}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {quoteInfo ? (
                            <span className="text-sm">
                              {quoteInfo.submitted}/{quoteInfo.total} ontvangen
                              {quoteInfo.declined > 0 && (
                                <span className="text-destructive"> · {quoteInfo.declined} afgewezen</span>
                              )}
                              {quoteInfo.pending > 0 && (
                                <span className="text-amber-600"> · {quoteInfo.pending} in afwachting</span>
                              )}
                              {quoteInfo.withdrawn > 0 && (
                                <span className="text-slate-500"> · {quoteInfo.withdrawn} ingetrokken</span>
                              )}
                            </span>
                          ) : (
                            <span className="text-sm text-slate-400">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {realised ? (
                            <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200" variant="outline">
                              Gerealiseerd
                            </Badge>
                          ) : (
                            <Badge variant={statusConfig.variant} className={statusConfig.className}>
                              {statusConfig.label}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm" asChild>
                            <Link to={`/admin/logies/${request.id}`}>
                              <Eye className="h-4 w-4 mr-1" />
                              Bekijken
                            </Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}

function StatCard({ icon, bg, value, label }: { icon: React.ReactNode; bg: string; value: number; label: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className={`p-2 ${bg} rounded-lg`}>{icon}</div>
          <div>
            <p className="text-2xl font-bold">{value}</p>
            <p className="text-sm text-slate-600">{label}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
