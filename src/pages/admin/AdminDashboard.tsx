import { useEffect, useState } from "react";
import { Helmet } from "react-helmet";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { PendingCommissionsCard } from "@/components/admin/PendingCommissionsCard";
import { AdminUnavailabilityWidget } from "@/components/admin/AdminUnavailabilityWidget";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import {
  Users,
  Building2,
  FileText,
  Clock,
  CheckCircle2,
  TrendingUp,
  Hotel,
  Send,
} from "lucide-react";
import { Link } from "react-router-dom";

interface DashboardStats {
  totalRequests: number;
  activeRequests: number;
  pendingItems: number;
  confirmedItems: number;
  totalPartners: number;
  activePartners: number;
  // Accommodation stats
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

const AdminDashboardContent = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        // Fetch request stats
        const { data: requests, error: reqError } = await supabase
          .from("program_requests")
          .select("id, customer_name, customer_company, status, created_at");

        if (reqError) throw reqError;

        // Fetch item stats
        const { data: items, error: itemError } = await supabase
          .from("program_request_items")
          .select("id, status, request_id");

        if (itemError) throw itemError;

        // Fetch partner stats
        const { data: partners, error: partnerError } = await supabase
          .from("partners")
          .select("id, is_active");

        if (partnerError) throw partnerError;

        // Fetch accommodation request stats
        const { data: accommodationRequests, error: accError } = await supabase
          .from("accommodation_requests")
          .select("id, customer_name, customer_company, status, created_at, number_of_guests");

        if (accError) throw accError;

        // Calculate stats
        const activeRequests = requests?.filter(r => r.status === "active") || [];
        const pendingItems = items?.filter(i => i.status === "pending") || [];
        const confirmedItems = items?.filter(i => i.status === "confirmed") || [];
        const activePartners = partners?.filter(p => p.is_active) || [];

        // Accommodation stats
        const pendingAccommodation = accommodationRequests?.filter(r => 
          r.status === "submitted" || r.status === "processing"
        ) || [];
        const quotedAccommodation = accommodationRequests?.filter(r => r.status === "quoted") || [];

        // Get recent requests with item count
        const recentRequests = (requests || [])
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
          .slice(0, 5)
          .map(req => ({
            ...req,
            item_count: items?.filter(i => i.request_id === req.id).length || 0,
          }));

        // Get recent accommodation requests
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-slate-600">Overzicht van Bureau Vlieland</p>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Actieve aanvragen</p>
                <p className="text-3xl font-bold text-slate-900">{stats?.activeRequests}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
                <FileText className="h-6 w-6 text-blue-600" />
              </div>
            </div>
            <p className="text-xs text-slate-500 mt-2">
              {stats?.totalRequests} totaal
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Te bevestigen items</p>
                <p className="text-3xl font-bold text-amber-600">{stats?.pendingItems}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-amber-100 flex items-center justify-center">
                <Clock className="h-6 w-6 text-amber-600" />
              </div>
            </div>
            <p className="text-xs text-slate-500 mt-2">
              Wachten op partner reactie
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Bevestigde items</p>
                <p className="text-3xl font-bold text-green-600">{stats?.confirmedItems}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle2 className="h-6 w-6 text-green-600" />
              </div>
            </div>
            <p className="text-xs text-slate-500 mt-2">
              Klaar voor uitvoering
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Actieve partners</p>
                <p className="text-3xl font-bold text-slate-900">{stats?.activePartners}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-purple-100 flex items-center justify-center">
                <Building2 className="h-6 w-6 text-purple-600" />
              </div>
            </div>
            <p className="text-xs text-slate-500 mt-2">
              {stats?.totalPartners} totaal
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Accommodation stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Logies aanvragen</p>
                <p className="text-3xl font-bold text-slate-900">{stats?.totalAccommodationRequests}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-indigo-100 flex items-center justify-center">
                <Hotel className="h-6 w-6 text-indigo-600" />
              </div>
            </div>
            <p className="text-xs text-slate-500 mt-2">
              Totaal ingediend
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Te verwerken logies</p>
                <p className="text-3xl font-bold text-amber-600">{stats?.pendingAccommodationRequests}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-amber-100 flex items-center justify-center">
                <Clock className="h-6 w-6 text-amber-600" />
              </div>
            </div>
            <p className="text-xs text-slate-500 mt-2">
              Nieuw of in behandeling
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Offertes verstuurd</p>
                <p className="text-3xl font-bold text-blue-600">{stats?.quotedAccommodationRequests}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
                <Send className="h-6 w-6 text-blue-600" />
              </div>
            </div>
            <p className="text-xs text-slate-500 mt-2">
              Wacht op klantkeuze
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Partner Availability and Pending Commissions */}
      <div className="grid lg:grid-cols-2 gap-6">
        <AdminUnavailabilityWidget />
        <PendingCommissionsCard />
      </div>

      {/* Recent requests grid */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Recent program requests */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Recente programma aanvragen
            </CardTitle>
            <CardDescription>De laatste 5 programma aanvragen</CardDescription>
          </CardHeader>
          <CardContent>
            {stats?.recentRequests.length === 0 ? (
              <p className="text-slate-500 text-center py-8">Nog geen aanvragen</p>
            ) : (
              <div className="space-y-3">
                {stats?.recentRequests.map((request) => (
                  <Link
                    key={request.id}
                    to={`/admin/aanvragen/${request.id}`}
                    className="flex items-center justify-between p-3 rounded-lg border hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center">
                        <Users className="h-5 w-5 text-slate-600" />
                      </div>
                      <div>
                        <p className="font-medium text-slate-900">{request.customer_name}</p>
                        <p className="text-sm text-slate-500">
                          {request.customer_company || "Particulier"} • {request.item_count} activiteiten
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        request.status === "active"
                          ? "bg-green-100 text-green-700"
                          : request.status === "cancelled"
                          ? "bg-red-100 text-red-700"
                          : "bg-slate-100 text-slate-700"
                      }`}>
                        {request.status === "active" ? "Actief" : request.status === "cancelled" ? "Geannuleerd" : request.status}
                      </span>
                      <p className="text-xs text-slate-500 mt-1">
                        {new Date(request.created_at).toLocaleDateString("nl-NL")}
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
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Hotel className="h-5 w-5" />
              Recente logies aanvragen
            </CardTitle>
            <CardDescription>De laatste 5 logies aanvragen</CardDescription>
          </CardHeader>
          <CardContent>
            {stats?.recentAccommodationRequests.length === 0 ? (
              <p className="text-slate-500 text-center py-8">Nog geen logies aanvragen</p>
            ) : (
              <div className="space-y-3">
                {stats?.recentAccommodationRequests.map((request) => (
                  <Link
                    key={request.id}
                    to={`/admin/logies/${request.id}`}
                    className="flex items-center justify-between p-3 rounded-lg border hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center">
                        <Hotel className="h-5 w-5 text-indigo-600" />
                      </div>
                      <div>
                        <p className="font-medium text-slate-900">{request.customer_name}</p>
                        <p className="text-sm text-slate-500">
                          {request.customer_company || "Particulier"} • {request.number_of_guests} gasten
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        request.status === "submitted"
                          ? "bg-blue-100 text-blue-700"
                          : request.status === "processing"
                          ? "bg-amber-100 text-amber-700"
                          : request.status === "quoted"
                          ? "bg-purple-100 text-purple-700"
                          : request.status === "accepted"
                          ? "bg-green-100 text-green-700"
                          : "bg-slate-100 text-slate-700"
                      }`}>
                        {request.status === "submitted" ? "Nieuw" 
                          : request.status === "processing" ? "In behandeling"
                          : request.status === "quoted" ? "Offertes verstuurd"
                          : request.status === "accepted" ? "Geaccepteerd"
                          : request.status}
                      </span>
                      <p className="text-xs text-slate-500 mt-1">
                        {new Date(request.created_at).toLocaleDateString("nl-NL")}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
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
