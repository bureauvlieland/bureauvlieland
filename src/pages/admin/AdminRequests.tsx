import { useEffect, useState, useMemo } from "react";
import { Helmet } from "react-helmet";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import {
  Search,
  MoreVertical,
  ExternalLink,
  Eye,
  Calendar,
  Users,
  CheckCircle2,
  Clock,
} from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { nl } from "date-fns/locale";

interface ProgramRequest {
  id: string;
  customer_name: string;
  customer_email: string;
  customer_company: string | null;
  customer_token: string;
  number_of_people: number;
  selected_dates: string[];
  status: string;
  created_at: string;
  items: {
    total: number;
    pending: number;
    confirmed: number;
    cancelled: number;
  };
}

const AdminRequestsContent = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const [requests, setRequests] = useState<ProgramRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState(searchParams.get("customer") || "");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  useEffect(() => {
    const fetchRequests = async () => {
      try {
        // Fetch all program requests
        const { data: requestsData, error: reqError } = await supabase
          .from("program_requests")
          .select("*")
          .order("created_at", { ascending: false });

        if (reqError) throw reqError;

        // Fetch all items to calculate stats
        const { data: items, error: itemError } = await supabase
          .from("program_request_items")
          .select("request_id, status");

        if (itemError) throw itemError;

        // Calculate item stats per request
        const itemStats = new Map<string, { total: number; pending: number; confirmed: number; cancelled: number }>();
        (items || []).forEach((item) => {
          const stats = itemStats.get(item.request_id) || { total: 0, pending: 0, confirmed: 0, cancelled: 0 };
          stats.total++;
          if (item.status === "pending") stats.pending++;
          else if (item.status === "confirmed") stats.confirmed++;
          else if (item.status === "cancelled" || item.status === "unavailable") stats.cancelled++;
          itemStats.set(item.request_id, stats);
        });

        const mappedRequests: ProgramRequest[] = (requestsData || []).map((req) => {
          const dates = Array.isArray(req.selected_dates) 
            ? req.selected_dates.map(d => String(d))
            : [];
          return {
            id: req.id,
            customer_name: req.customer_name,
            customer_email: req.customer_email,
            customer_company: req.customer_company,
            customer_token: req.customer_token,
            number_of_people: req.number_of_people,
            selected_dates: dates,
            status: req.status,
            created_at: req.created_at,
            items: itemStats.get(req.id) || { total: 0, pending: 0, confirmed: 0, cancelled: 0 },
          };
        });

        setRequests(mappedRequests);
      } catch (error) {
        console.error("Error fetching requests:", error);
        toast({
          title: "Fout",
          description: "Kon aanvragen niet laden",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchRequests();
  }, [toast]);

  // Filter and sort
  const filteredRequests = useMemo(() => {
    return requests.filter((req) => {
      // Search filter
      const query = searchQuery.toLowerCase();
      const matchesSearch =
        req.customer_name.toLowerCase().includes(query) ||
        req.customer_email.toLowerCase().includes(query) ||
        (req.customer_company?.toLowerCase().includes(query) ?? false);

      // Status filter
      const matchesStatus = statusFilter === "all" || req.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [requests, searchQuery, statusFilter]);

  const handleOpenCustomerPortal = (token: string) => {
    window.open(`/mijn-programma/${token}`, "_blank");
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-10 w-48" />
        <div className="flex gap-4">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-10 w-40" />
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Aanvragen</h1>
        <p className="text-slate-600">Alle programma aanvragen</p>
      </div>

      {/* Filters */}
      <div className="flex gap-4 flex-wrap">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Zoek op naam, email of bedrijf..."
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
            <SelectItem value="completed">Afgerond</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Requests table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Klant</TableHead>
                <TableHead>Datum(s)</TableHead>
                <TableHead>Personen</TableHead>
                <TableHead>Items</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Aangemaakt</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRequests.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-slate-500">
                    Geen aanvragen gevonden
                  </TableCell>
                </TableRow>
              ) : (
                filteredRequests.map((request) => (
                  <TableRow key={request.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{request.customer_name}</p>
                        <p className="text-sm text-slate-500">
                          {request.customer_company || request.customer_email}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4 text-slate-400" />
                        <span className="text-sm">
                          {request.selected_dates.length > 0
                            ? request.selected_dates.slice(0, 2).map((d) =>
                                format(new Date(d), "d MMM", { locale: nl })
                              ).join(", ")
                            : "-"}
                          {request.selected_dates.length > 2 && (
                            <span className="text-slate-400"> +{request.selected_dates.length - 2}</span>
                          )}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Users className="h-4 w-4 text-slate-400" />
                        {request.number_of_people}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="text-sm">{request.items.total} totaal</span>
                        {request.items.pending > 0 && (
                          <Badge variant="outline" className="text-amber-600 border-amber-200 bg-amber-50">
                            <Clock className="h-3 w-3 mr-1" />
                            {request.items.pending}
                          </Badge>
                        )}
                        {request.items.confirmed > 0 && (
                          <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            {request.items.confirmed}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          request.status === "active"
                            ? "default"
                            : request.status === "cancelled"
                            ? "destructive"
                            : "secondary"
                        }
                      >
                        {request.status === "active"
                          ? "Actief"
                          : request.status === "cancelled"
                          ? "Geannuleerd"
                          : request.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-slate-500">
                      {format(new Date(request.created_at), "d MMM yyyy", { locale: nl })}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => navigate(`/admin/aanvragen/${request.id}`)}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            Details bekijken
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleOpenCustomerPortal(request.customer_token)}
                          >
                            <ExternalLink className="h-4 w-4 mr-2" />
                            Open klantportaal
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
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

const AdminRequests = () => {
  return (
    <>
      <Helmet>
        <title>Aanvragen | Admin Bureau Vlieland</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>
      <AdminLayout>
        <AdminRequestsContent />
      </AdminLayout>
    </>
  );
};

export default AdminRequests;
