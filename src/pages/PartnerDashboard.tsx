import { useMemo } from "react";
import { Navigate, useSearchParams } from "react-router-dom";
import { Archive, ClipboardList, LayoutDashboard, RefreshCw, Search } from "lucide-react";
import { PartnerLayout } from "@/components/partner-portal/PartnerLayout";
import { PartnerPage } from "@/components/partner-portal/PartnerPage";
import { PartnerProjectsTable } from "@/components/partner-portal/PartnerProjectsTable";
import { PartnerWerkbankList } from "@/components/partner-portal/PartnerWerkbankList";
import { MissingPdfBanner } from "@/components/partner-portal/MissingPdfBanner";
import { PartnerAgreementsBanner } from "@/components/partner-portal/PartnerAgreementsBanner";
import { PartnerCompletenessBanner } from "@/components/partner-portal/PartnerCompletenessBanner";
import { usePartnerCompleteness } from "@/hooks/usePartnerCompleteness";
import { usePartnerPortal } from "@/hooks/usePartnerPortal";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { buildPartnerOverviewRows, ARCHIVE_STATUSES, type PartnerRowKind } from "@/lib/getPartnerProjectsOverview";
import type { PartnerDashboardData } from "@/types/partner";
import { countMissingPdf } from "@/lib/partnerPortalView";
import { buildWerkbankRows, summarizeWerkbank, werkbankHeadline } from "@/lib/partnerWerkbank";
import { Notice } from "@/components/system";

export type DashboardTab = "werkbank" | "projecten";

/** De banners die bij de werkbank horen; op de referentiepagina alleen de pdf-banner (de rest leest de database). */
const WerkbankBanners = ({ data, isDemo, partnerId }: { data: PartnerDashboardData; isDemo: boolean; partnerId: string }) => {
  const { completeness } = usePartnerCompleteness({ partnerId: isDemo ? null : partnerId });
  return (
    <>
      <MissingPdfBanner count={countMissingPdf(data)} />
      {completeness && <PartnerCompletenessBanner completeness={completeness} />}
      {!isDemo && <PartnerAgreementsBanner />}
    </>
  );
};

/** De belangrijkste volgende stap in één zin (regel 2: de volgende stap staat op één plek). */
const WerkbankHeadline = ({ data }: { data: PartnerDashboardData }) => {
  const headline = useMemo(() => werkbankHeadline(summarizeWerkbank(buildWerkbankRows(data))), [data]);
  if (!headline) return null;
  return (
    <Notice tone={headline.tone} title={headline.title}>
      <p>{headline.text}</p>
    </Notice>
  );
};

/**
 * Werkbank: de takenlijst per fase (partnerportaal fase 1: eigen route, één
 * datalaag, PortalHead). De jaarcijfers staan sinds fase 1 bij Facturatie.
 */
export const PartnerWerkbankContent = () => {
  const { data, isLoading, error, refetch, isDemo, partner } = usePartnerPortal();
  return (
    <PartnerPage
      title="Werkbank"
      icon={<ClipboardList />}
      description="Wat er van u wordt verwacht, per fase: beoordelen, wijzigingen, inplannen en factureren."
      actions={
        <Button onClick={() => void refetch()} variant="outline" size="sm">
          <RefreshCw className="mr-2 h-4 w-4" aria-hidden="true" />
          Vernieuwen
        </Button>
      }
      loading={isLoading}
      error={error}
    >
      {data && (
        <>
          <WerkbankHeadline data={data} />
          <WerkbankBanners data={data} isDemo={isDemo} partnerId={partner.id} />
          <PartnerWerkbankList data={data} onDismissed={() => void refetch()} />
        </>
      )}
    </PartnerPage>
  );
};

/** Projecten: alle aanvragen in tijdsvakken, met zoeken, soort en archief in de URL. */
export const PartnerProjectenContent = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { data, isLoading, error, refetch } = usePartnerPortal();

  const search = searchParams.get("q") ?? "";
  const typeFilter = (searchParams.get("type") as PartnerRowKind | "all") ?? "all";
  const archive = searchParams.get("archief") === "1";

  const setParam = (key: string, value: string | null) => {
    const next = new URLSearchParams(searchParams);
    if (value === null || value === "") next.delete(key);
    else next.set(key, value);
    setSearchParams(next, { replace: true });
  };

  const rows = useMemo(() => (data ? buildPartnerOverviewRows(data) : []), [data]);
  const visibleRows = useMemo(() => {
    const hasSearch = search.trim().length > 0;
    return rows.filter((r) => {
      // Bij een zoekopdracht telt het archief niet: zo vindt u ook een
      // afgeronde of geannuleerde aanvraag terug op referentie.
      if (!hasSearch) {
        if (!archive && ARCHIVE_STATUSES.has(r.derivedStatus)) return false;
        if (archive && !ARCHIVE_STATUSES.has(r.derivedStatus)) return false;
      }
      if (typeFilter !== "all" && r.kind !== typeFilter) return false;
      if (hasSearch) {
        const q = search.toLowerCase();
        const hay = [r.reference, r.customerLabel].filter(Boolean).join(" ").toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [rows, archive, typeFilter, search]);

  const kinds = [
    { id: "all", label: "Alle" },
    { id: "activities", label: "Programma" },
    { id: "accommodation", label: "Logies" },
  ] as const;

  return (
    <PartnerPage
      title="Projecten"
      icon={<LayoutDashboard />}
      description="Al uw aanvragen, gesorteerd op de eerstvolgende datum."
      actions={
        <Button onClick={() => void refetch()} variant="outline" size="sm">
          <RefreshCw className="mr-2 h-4 w-4" aria-hidden="true" />
          Vernieuwen
        </Button>
      }
      loading={isLoading}
      error={error}
    >
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <Input
            placeholder="Zoek op naam, bedrijf of referentie"
            aria-label="Zoeken in projecten"
            value={search}
            onChange={(e) => setParam("q", e.target.value)}
            className="pl-8"
          />
        </div>
        <div className="flex items-center gap-1" role="group" aria-label="Soort">
          {kinds.map((k) => {
            const active = typeFilter === k.id || (k.id === "all" && typeFilter === "all");
            return (
              <Button
                key={k.id}
                size="sm"
                variant={active ? "default" : "outline"}
                aria-pressed={active}
                onClick={() => setParam("type", k.id === "all" ? null : k.id)}
              >
                {k.label}
              </Button>
            );
          })}
        </div>
        <Button size="sm" variant={archive ? "default" : "outline"} aria-pressed={archive} onClick={() => setParam("archief", archive ? null : "1")}>
          <Archive className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
          {archive ? "Archief aan" : "Archief"}
        </Button>
      </div>
      <PartnerProjectsTable rows={visibleRows} />
    </PartnerPage>
  );
};

/** `/partner/dashboard` was één route met `?tab=`; de oude links komen hier nog langs. */
export const PartnerDashboardRedirect = () => {
  const [searchParams] = useSearchParams();
  const next = new URLSearchParams(searchParams);
  const tab = next.get("tab");
  next.delete("tab");
  const query = next.toString();
  return <Navigate to={`/partner/${tab === "projecten" ? "projecten" : "werkbank"}${query ? `?${query}` : ""}`} replace />;
};

const PartnerDashboard = ({ tab }: { tab: DashboardTab }) => (
  <PartnerLayout>{tab === "projecten" ? <PartnerProjectenContent /> : <PartnerWerkbankContent />}</PartnerLayout>
);

export default PartnerDashboard;
