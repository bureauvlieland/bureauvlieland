import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet";
import { supabase } from "@/integrations/supabase/client";
import { PartnerLayout } from "@/components/partner-portal/PartnerLayout";
import { PartnerProjectsTable } from "@/components/partner-portal/PartnerProjectsTable";
import { PartnerWerkbankList } from "@/components/partner-portal/PartnerWerkbankList";
import { PartnerYtdModule } from "@/components/partner-portal/PartnerYtdModule";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, RefreshCw, Search, Archive } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PartnerDashboardData } from "@/types/partner";
import {
  buildPartnerOverviewRows,
  ARCHIVE_STATUSES,
  type PartnerRowKind,
} from "@/lib/getPartnerProjectsOverview";
import { MissingPdfBanner } from "@/components/partner-portal/MissingPdfBanner";

type TabKey = "projecten" | "werkbank";


const PartnerDashboardContent = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [data, setData] = useState<PartnerDashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const tab = (searchParams.get("tab") as TabKey) || "projecten";
  const search = searchParams.get("q") ?? "";
  const typeFilter = (searchParams.get("type") as PartnerRowKind | "all") ?? "all";
  const archive = searchParams.get("archief") === "1";

  const setParam = (key: string, value: string | null) => {
    const next = new URLSearchParams(searchParams);
    if (value === null || value === "") next.delete(key);
    else next.set(key, value);
    setSearchParams(next, { replace: true });
  };

  const fetchDashboard = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/partner/login");
      return;
    }
    const impersonatePartnerId = searchParams.get("impersonate");
    let token: string | null = null;

    if (impersonatePartnerId) {
      const { data: isAdmin } = await supabase.rpc("is_admin", { _user_id: session.user.id });
      if (isAdmin) {
        const { data: partner } = await supabase
          .from("partners")
          .select("partner_token")
          .eq("id", impersonatePartnerId)
          .single();
        if (partner) token = partner.partner_token;
      }
    }

    if (!token) {
      const { data: partner, error: partnerError } = await supabase
        .from("partners")
        .select("partner_token")
        .eq("auth_user_id", session.user.id)
        .eq("is_active", true)
        .single();
      if (partnerError || !partner) {
        setError("Je account is niet gekoppeld aan een partner.");
        setIsLoading(false);
        return;
      }
      token = partner.partner_token;
    }

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-partner-dashboard?token=${token}`,
        {
          headers: {
            "Content-Type": "application/json",
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
        },
      );
      if (!response.ok) throw new Error("Kon dashboard niet laden");
      setData(await response.json());
    } catch (err) {
      console.error(err);
      setError("Er is een fout opgetreden bij het laden van je dashboard.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const refetch = async () => {
    setIsLoading(true);
    await fetchDashboard();
  };

  const rows = useMemo(() => (data ? buildPartnerOverviewRows(data) : []), [data]);

  const visibleRows = useMemo(() => {
    return rows.filter(r => {
      if (!archive && ARCHIVE_STATUSES.has(r.derivedStatus)) return false;
      if (archive && !ARCHIVE_STATUSES.has(r.derivedStatus)) return false;
      if (typeFilter !== "all" && r.kind !== typeFilter) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        const hay = [r.reference, r.customerLabel].filter(Boolean).join(" ").toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [rows, archive, typeFilter, search]);

  // YTD financials voor zijbalk
  const ytd = useMemo(() => {
    if (!data) return { ytdRevenue: 0, pendingCommission: 0 };
    const y = new Date().getFullYear();
    const ytdItems = data.items
      .filter(i => i.invoiced_date && new Date(i.invoiced_date).getFullYear() === y)
      .reduce((s, i) => s + (i.invoiced_amount || 0), 0);
    const ytdQuotes = (data.accommodationQuotes ?? [])
      .filter(q => q.status === "selected" && q.invoiced_date && new Date(q.invoiced_date).getFullYear() === y)
      .reduce((s, q) => s + (q.invoiced_amount || 0), 0);
    const pending = data.items
      .filter(i => i.commission_status === "pending")
      .reduce((s, i) => s + (i.commission_amount || 0), 0);
    return { ytdRevenue: ytdItems + ytdQuotes, pendingCommission: pending };
  }, [data]);

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }
  if (error || !data) {
    return (
      <div className="p-6 text-center py-16">
        <AlertCircle className="h-16 w-16 text-destructive mx-auto mb-4" />
        <h1 className="text-2xl font-bold mb-2">Fout</h1>
        <p className="text-muted-foreground">{error || "Er is een fout opgetreden."}</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-5">
      <Helmet>
        <title>Partner Portal | Bureau Vlieland</title>
      </Helmet>

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Projecten &amp; Werkbank</h1>
          <p className="text-sm text-muted-foreground">
            Overzicht van uw projecten, gesorteerd op eerstvolgende datum.
          </p>
        </div>
        <Button onClick={refetch} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Vernieuwen
        </Button>
      </div>

      <MissingPdfBanner
        count={
          (data.items?.filter((i) => i.invoiced_number && !i.invoiced_file_path).length ?? 0) +
          ((data.accommodationQuotes ?? []).filter(
            (q: any) => q.invoiced_number && !q.invoiced_file_path,
          ).length)
        }
      />



      <div className="grid gap-4 lg:grid-cols-[1fr_300px]">
        <Tabs value={tab} onValueChange={(v) => setParam("tab", v)}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <TabsList>
              <TabsTrigger value="projecten">Projecten</TabsTrigger>
              <TabsTrigger value="werkbank">Werkbank</TabsTrigger>
            </TabsList>

            {tab === "projecten" && (
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Zoek op naam, bedrijf, referentie…"
                    value={search}
                    onChange={(e) => setParam("q", e.target.value)}
                    className="pl-8 w-[240px]"
                  />
                </div>
                <div className="flex items-center gap-1 text-xs">
                  {([
                    { id: "all", label: "Alle" },
                    { id: "activities", label: "Programma" },
                    { id: "accommodation", label: "Logies" },
                  ] as const).map(k => (
                    <button
                      key={k.id}
                      onClick={() => setParam("type", k.id === "all" ? null : k.id)}
                      className={cn(
                        "rounded-full border px-2.5 py-1 transition-colors",
                        (typeFilter === k.id || (k.id === "all" && typeFilter === "all"))
                          ? "border-primary bg-primary text-primary-foreground"
                          : "hover:bg-muted",
                      )}
                    >
                      {k.label}
                    </button>
                  ))}
                </div>
                <Button
                  size="sm"
                  variant={archive ? "default" : "outline"}
                  onClick={() => setParam("archief", archive ? null : "1")}
                  className="gap-1.5"
                >
                  <Archive className="h-3.5 w-3.5" />
                  {archive ? "Archief aan" : "Archief"}
                </Button>
              </div>
            )}
          </div>

          <TabsContent value="projecten" className="mt-4">
            <PartnerProjectsTable rows={visibleRows} />
          </TabsContent>
          <TabsContent value="werkbank" className="mt-4">
            <PartnerWerkbankList data={data} />
          </TabsContent>
        </Tabs>
        <div className="space-y-4">
          <PartnerYtdModule
            ytdRevenue={ytd.ytdRevenue}
            pendingCommission={ytd.pendingCommission}
          />
        </div>
      </div>
    </div>
  );
};

const PartnerDashboard = () => (
  <PartnerLayout>
    <PartnerDashboardContent />
  </PartnerLayout>
);

export default PartnerDashboard;
