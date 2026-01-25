import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Helmet } from "react-helmet";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import {
  Search,
  Activity,
  User,
  Building2,
  FileText,
  ClipboardList,
  RefreshCw,
  Calendar,
} from "lucide-react";

interface ActivityLog {
  id: string;
  user_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  details: Record<string, unknown> | null;
  ip_address: string | null;
  created_at: string;
}

const actionLabels: Record<string, { label: string; color: string }> = {
  partner_created: { label: "Partner aangemaakt", color: "bg-green-100 text-green-800" },
  partner_updated: { label: "Partner bijgewerkt", color: "bg-blue-100 text-blue-800" },
  partner_activated: { label: "Partner geactiveerd", color: "bg-green-100 text-green-800" },
  partner_deactivated: { label: "Partner gedeactiveerd", color: "bg-red-100 text-red-800" },
  partner_invited: { label: "Partner uitgenodigd", color: "bg-purple-100 text-purple-800" },
  request_viewed: { label: "Aanvraag bekeken", color: "bg-slate-100 text-slate-800" },
  request_status_changed: { label: "Aanvraag status gewijzigd", color: "bg-amber-100 text-amber-800" },
  request_cancelled: { label: "Aanvraag geannuleerd", color: "bg-red-100 text-red-800" },
  item_status_changed: { label: "Item status gewijzigd", color: "bg-amber-100 text-amber-800" },
  item_commission_updated: { label: "Commissie bijgewerkt", color: "bg-blue-100 text-blue-800" },
  todo_created: { label: "Todo aangemaakt", color: "bg-green-100 text-green-800" },
  todo_updated: { label: "Todo bijgewerkt", color: "bg-blue-100 text-blue-800" },
  todo_deleted: { label: "Todo verwijderd", color: "bg-red-100 text-red-800" },
  todo_completed: { label: "Todo afgerond", color: "bg-green-100 text-green-800" },
  admin_login: { label: "Admin ingelogd", color: "bg-slate-100 text-slate-800" },
  admin_logout: { label: "Admin uitgelogd", color: "bg-slate-100 text-slate-800" },
};

const entityIcons: Record<string, React.ReactNode> = {
  partner: <Building2 className="h-4 w-4" />,
  program_request: <FileText className="h-4 w-4" />,
  program_request_item: <FileText className="h-4 w-4" />,
  admin_todo: <ClipboardList className="h-4 w-4" />,
  user: <User className="h-4 w-4" />,
};

const AdminLogs = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [entityFilter, setEntityFilter] = useState<string>("all");
  const [actionFilter, setActionFilter] = useState<string>("all");

  const { data: logs = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ["admin-activity-logs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("admin_activity_log")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500);

      if (error) throw error;
      return data as ActivityLog[];
    },
  });

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      // Entity filter
      if (entityFilter !== "all" && log.entity_type !== entityFilter) {
        return false;
      }

      // Action filter
      if (actionFilter !== "all" && log.action !== actionFilter) {
        return false;
      }

      // Search query
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const actionLabel = actionLabels[log.action]?.label.toLowerCase() || log.action.toLowerCase();
        const entityId = log.entity_id?.toLowerCase() || "";
        const details = JSON.stringify(log.details || {}).toLowerCase();
        
        return (
          actionLabel.includes(query) ||
          entityId.includes(query) ||
          details.includes(query) ||
          log.entity_type.toLowerCase().includes(query)
        );
      }

      return true;
    });
  }, [logs, entityFilter, actionFilter, searchQuery]);

  const uniqueActions = useMemo(() => {
    const actions = new Set(logs.map((log) => log.action));
    return Array.from(actions).sort();
  }, [logs]);

  const uniqueEntities = useMemo(() => {
    const entities = new Set(logs.map((log) => log.entity_type));
    return Array.from(entities).sort();
  }, [logs]);

  const formatDetails = (details: Record<string, unknown> | null): string => {
    if (!details) return "-";
    
    // Format the details in a readable way
    const entries = Object.entries(details);
    if (entries.length === 0) return "-";
    
    return entries
      .map(([key, value]) => {
        const formattedKey = key.replace(/_/g, " ");
        const formattedValue = typeof value === "object" ? JSON.stringify(value) : String(value);
        return `${formattedKey}: ${formattedValue}`;
      })
      .join(", ");
  };

  return (
    <>
      <Helmet>
        <title>Activiteitenlog | Admin | Bureau Vlieland</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>
      <AdminLayout>
        <div className="p-6 space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Activiteitenlog</h1>
              <p className="text-slate-500 mt-1">
                Overzicht van alle admin activiteiten in het systeem
              </p>
            </div>
            <Button
              variant="outline"
              onClick={() => refetch()}
              disabled={isRefetching}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isRefetching ? "animate-spin" : ""}`} />
              Vernieuwen
            </Button>
          </div>

          {/* Filters */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="Zoeken in activiteiten..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={entityFilter} onValueChange={setEntityFilter}>
                  <SelectTrigger className="w-full md:w-48">
                    <SelectValue placeholder="Entiteit" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Alle entiteiten</SelectItem>
                    {uniqueEntities.map((entity) => (
                      <SelectItem key={entity} value={entity}>
                        {entity.replace(/_/g, " ")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={actionFilter} onValueChange={setActionFilter}>
                  <SelectTrigger className="w-full md:w-48">
                    <SelectValue placeholder="Actie" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Alle acties</SelectItem>
                    {uniqueActions.map((action) => (
                      <SelectItem key={action} value={action}>
                        {actionLabels[action]?.label || action}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Results summary */}
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Activity className="h-4 w-4" />
            <span>
              {filteredLogs.length} {filteredLogs.length === 1 ? "activiteit" : "activiteiten"} gevonden
            </span>
          </div>

          {/* Logs table */}
          <Card>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="p-6 space-y-4">
                  {[...Array(10)].map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : filteredLogs.length === 0 ? (
                <div className="p-12 text-center text-slate-500">
                  <Activity className="h-12 w-12 mx-auto mb-4 text-slate-300" />
                  <p>Geen activiteiten gevonden</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-40">Datum/Tijd</TableHead>
                        <TableHead>Actie</TableHead>
                        <TableHead>Entiteit</TableHead>
                        <TableHead className="max-w-xs">Details</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredLogs.map((log) => {
                        const actionInfo = actionLabels[log.action] || {
                          label: log.action,
                          color: "bg-slate-100 text-slate-800",
                        };

                        return (
                          <TableRow key={log.id}>
                            <TableCell className="whitespace-nowrap">
                              <div className="flex items-center gap-2 text-sm">
                                <Calendar className="h-4 w-4 text-slate-400" />
                                <div>
                                  <div className="font-medium">
                                    {format(new Date(log.created_at), "d MMM yyyy", { locale: nl })}
                                  </div>
                                  <div className="text-slate-500">
                                    {format(new Date(log.created_at), "HH:mm:ss")}
                                  </div>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge className={actionInfo.color} variant="secondary">
                                {actionInfo.label}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                {entityIcons[log.entity_type] || <FileText className="h-4 w-4" />}
                                <div>
                                  <div className="text-sm font-medium capitalize">
                                    {log.entity_type.replace(/_/g, " ")}
                                  </div>
                                  {log.entity_id && (
                                    <div className="text-xs text-slate-500 font-mono">
                                      {log.entity_id.substring(0, 8)}...
                                    </div>
                                  )}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="max-w-xs">
                              <div className="text-sm text-slate-600 truncate" title={formatDetails(log.details)}>
                                {formatDetails(log.details)}
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </AdminLayout>
    </>
  );
};

export default AdminLogs;
