import { useEffect, useState } from "react";
import { Helmet } from "react-helmet";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { PendingCommissionsCard } from "@/components/admin/PendingCommissionsCard";
import { AdminUnavailabilityWidget } from "@/components/admin/AdminUnavailabilityWidget";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DashboardTodoWidget } from "@/components/admin/DashboardTodoWidget";
import { LiveActivityFeed } from "@/components/admin/LiveActivityFeed";
import { DailyActivitySummary } from "@/components/admin/DailyActivitySummary";
import { PipelineFunnel } from "@/components/admin/PipelineFunnel";
import { MapBookingsWidget } from "@/components/admin/MapBookingsWidget";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import {
  Users,
  Hotel,
  TrendingUp,
} from "lucide-react";
import { Link } from "react-router-dom";

interface DashboardStats {
  totalRequests: number;
  activeRequests: number;
  pendingItems: number;
  confirmedItems: number;
  totalPartners: number;
  activePartners: number;
  totalAccommodationRequests: number;
  pendingAccommodationRequests: number;
  quotedAccommodationRequests: number;
  recentRequests: Array<{
    id: string;
    customer_name: string;
    customer_company: string | null;
    status: string;
    created_at: string;
    item_count: number;
  }>;
  recentAccommodationRequests: Array<{
    id: string;
    customer_name: string;
    customer_company: string | null;
    status: string;
    created_at: string;
    number_of_guests: number;
  }>;
}

const StatChip = ({
  label,
  value,
  to,
  color = "text-foreground",
}: {
  label: string;
  value: number | string;
  to: string;
  color?: string;
}) => (
  <Link
    to={to}
    className="flex items-center gap-2 px-3 py-1.5 bg-card border rounded-lg hover:bg-muted/60 transition-colors group flex-shrink-0"
  >
    <span className="text-xs text-muted-foreground whitespace-nowrap">{label}</span>
    <span className={`text-sm font-bold ${color} group-hover:text-primary transition-colors`}>{value}</span>
  </Link>
);

const AdminDashboardContent = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [
          { data: requests },
          { data: items },
          { data: partners },
          { data: accommodationRequests },
        ] = await Promise.all([
          supabase.from("program_requests").select("id, customer_name, customer_company, status, created_at"),
          supabase.from("program_request_items").select("id, status, request_id, skip_partner_notification"),
          supabase.from("partners").select("id, is_active"),
          supabase.from("accommodation_requests").select("id, customer_name, customer_company, status, created_at, number_of_guests"),
        ]);

        const activeRequests = requests?.filter(r => r.status === "active") || [];
        const activeRequestIds = new Set(activeRequests.map(r => r.id));
        const pendingItems = items?.filter(i => i.status === "pending" && !i.skip_partner_notification && activeRequestIds.has(i.request_id)) || [];
        const confirmedItems = items?.filter(i => i.status === "confirmed" && activeRequestIds.has(i.request_id)) || [];
        const activePartners = partners?.filter(p => p.is_active) || [];
        const pendingAccommodation = accommodationRequests?.filter(r =>
          r.status === "processing" || r.status === "pending"
        ) || [];
        const quotedAccommodation = accommodationRequests?.filter(r => r.status === "accepted") || [];

        const recentRequests = (requests || [])
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
          .slice(0, 5)
          .map(req => ({
            ...req,
            item_count: items?.filter(i => i.request_id === req.id).length || 0,
          }));

        const recentAccommodationRequests = (accommodationRequests || [])
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
          .slice(0, 5);

        setStats({
          totalRequests: requests?.length || 0,
          activeRequests: activeRequests.length,
          pendingItems: pendingItems.length,
          confirmedItems: confirmedItems.length,
          totalPartners: partners?.length || 0,
          activePartners: activePartners.length,
          totalAccommodationRequests: accommodationRequests?.length || 0,
          pendingAccommodationRequests: pendingAccommodation.length,
          quotedAccommodationRequests: quotedAccommodation.length,
          recentRequests,
          recentAccommodationRequests,
        });
      } catch (error) {
        console.error("Error fetching dashboard stats:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-10 w-full" />
        <div className="grid grid-cols-3 gap-4">
          <Skeleton className="h-[600px] col-span-2" />
          <Skeleton className="h-[600px]" />
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground text-sm">Bureau Vlieland — realtime overzicht</p>
      </div>

      {/* Compact stat bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <StatChip label="Actieve aanvragen" value={stats?.activeRequests ?? 0} to="/admin/projecten" color="text-blue-600" />
        <StatChip label="Te bevestigen" value={stats?.pendingItems ?? 0} to="/admin/projecten" color="text-amber-600" />
        <StatChip label="Bevestigd" value={stats?.confirmedItems ?? 0} to="/admin/projecten" color="text-green-600" />
        <StatChip label="Partners" value={`${stats?.activePartners ?? 0}/${stats?.totalPartners ?? 0}`} to="/admin/partners" />

        {/* Separator */}
        <div className="h-6 w-px bg-border flex-shrink-0 mx-1" />

        <StatChip label="Logies totaal" value={stats?.totalAccommodationRequests ?? 0} to="/admin/logies" color="text-indigo-600" />
        <StatChip label="Te verwerken" value={stats?.pendingAccommodationRequests ?? 0} to="/admin/logies" color="text-amber-600" />
        <StatChip label="Geaccepteerd" value={stats?.quotedAccommodationRequests ?? 0} to="/admin/logies" color="text-purple-600" />
      </div>

      {/* 2-column main layout: feed (2/3) + sidebar (1/3) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">
        {/* Live activity feed — takes 2/3 */}
        <div className="lg:col-span-2">
          <LiveActivityFeed />
        </div>

        {/* Sidebar — 1/3 */}
        <div className="space-y-4">
          <PipelineFunnel />
          <DailyActivitySummary />
          <DashboardTodoWidget />
          <PendingCommissionsCard />
          <AdminUnavailabilityWidget />
        </div>
      </div>

      {/* Recent requests grid */}
      <div className="grid lg:grid-cols-2 gap-5">
        {/* Recent program requests */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="h-4 w-4" />
              Recente programma aanvragen
            </CardTitle>
            <CardDescription className="text-xs">De laatste 5 programma aanvragen</CardDescription>
          </CardHeader>
          <CardContent>
            {stats?.recentRequests.length === 0 ? (
              <p className="text-muted-foreground text-center py-8 text-sm">Nog geen aanvragen</p>
            ) : (
              <div className="space-y-2">
                {stats?.recentRequests.map((request) => (
                  <Link
                    key={request.id}
                    to={`/admin/aanvragen/${request.id}`}
                    className="flex items-center justify-between p-2.5 rounded-lg border hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                        <Users className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="font-medium text-sm text-foreground">{request.customer_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {request.customer_company || "Particulier"} · {request.item_count} activiteiten
                        </p>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        request.status === "active"
                          ? "bg-green-100 text-green-700"
                          : request.status === "cancelled"
                          ? "bg-red-100 text-red-700"
                          : "bg-muted text-muted-foreground"
                      }`}>
                        {request.status === "active" ? "Actief" : request.status === "cancelled" ? "Geannuleerd" : request.status}
                      </span>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {new Date(request.created_at).toLocaleDateString("nl-NL", { weekday: "short", day: "numeric", month: "short" })}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent accommodation requests */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Hotel className="h-4 w-4" />
              Recente logies aanvragen
            </CardTitle>
            <CardDescription className="text-xs">De laatste 5 logies aanvragen</CardDescription>
          </CardHeader>
          <CardContent>
            {stats?.recentAccommodationRequests.length === 0 ? (
              <p className="text-muted-foreground text-center py-8 text-sm">Nog geen logies aanvragen</p>
            ) : (
              <div className="space-y-2">
                {stats?.recentAccommodationRequests.map((request) => (
                  <Link
                    key={request.id}
                    to={`/admin/logies/${request.id}`}
                    className="flex items-center justify-between p-2.5 rounded-lg border hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="h-8 w-8 rounded-full bg-indigo-50 flex items-center justify-center flex-shrink-0">
                        <Hotel className="h-4 w-4 text-indigo-600" />
                      </div>
                      <div>
                        <p className="font-medium text-sm text-foreground">{request.customer_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {request.customer_company || "Particulier"} · {request.number_of_guests} gasten
                        </p>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        request.status === "submitted"
                          ? "bg-blue-100 text-blue-700"
                          : request.status === "processing"
                          ? "bg-amber-100 text-amber-700"
                          : request.status === "quoted"
                          ? "bg-purple-100 text-purple-700"
                          : request.status === "accepted"
                          ? "bg-green-100 text-green-700"
                          : "bg-muted text-muted-foreground"
                      }`}>
                        {request.status === "submitted" ? "Nieuw"
                          : request.status === "processing" ? "In behandeling"
                          : request.status === "quoted" ? "Offertes"
                          : request.status === "accepted" ? "Geaccepteerd"
                          : request.status}
                      </span>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {new Date(request.created_at).toLocaleDateString("nl-NL", { weekday: "short", day: "numeric", month: "short" })}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <MapBookingsWidget />
      </div>
    </div>
  );
};

const AdminDashboard = () => {
  return (
    <>
      <Helmet>
        <title>Admin Dashboard | Bureau Vlieland</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>
      <AdminLayout>
        <AdminDashboardContent />
      </AdminLayout>
    </>
  );
};

export default AdminDashboard;
