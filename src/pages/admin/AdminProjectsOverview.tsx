import { useMemo, useState } from "react";
import { Helmet } from "react-helmet";
import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Search, Archive } from "lucide-react";
import { ProjectsListTable } from "@/components/admin/projecten/ProjectsListTable";
import { WeekPlanningView } from "@/components/admin/projecten/WeekPlanningView";
import { fetchProjectsOverview, type RowKind } from "@/lib/getProjectsOverview";
import { cn } from "@/lib/utils";

type TabKey = "lijst" | "kalender" | "logies";

const ARCHIVE_STATUSES = new Set(["afgerond", "geannuleerd"]);

export default function AdminProjectsOverview() {
  const [params, setParams] = useSearchParams();
  const tab = (params.get("tab") as TabKey) || "lijst";
  const search = params.get("q") ?? "";
  const typeFilter = (params.get("type") as RowKind | "all") ?? "all";
  const archive = params.get("archief") === "1";

  const setParam = (key: string, value: string | null) => {
    const next = new URLSearchParams(params);
    if (value === null || value === "") next.delete(key);
    else next.set(key, value);
    setParams(next, { replace: true });
  };

  const { data: projectRows, isLoading: loadingProjects } = useQuery({
    queryKey: ["projects-overview", "projecten"],
    queryFn: () => fetchProjectsOverview({ logiesView: false }),
    refetchInterval: 60_000,
    enabled: tab === "lijst",
  });

  const { data: logiesRows, isLoading: loadingLogies } = useQuery({
    queryKey: ["projects-overview", "logies"],
    queryFn: () => fetchProjectsOverview({ logiesView: true }),
    refetchInterval: 60_000,
    enabled: tab === "logies",
  });

  const filterRows = (rows: typeof projectRows | undefined) => {
    if (!rows) return [];
    return rows.filter(r => {
      if (!archive && ARCHIVE_STATUSES.has(r.derivedStatus)) return false;
      if (archive && !ARCHIVE_STATUSES.has(r.derivedStatus)) return false;
      if (typeFilter !== "all" && r.kind !== typeFilter) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        const hay = [
          r.reference,
          r.customerName,
          r.customerCompany,
        ].filter(Boolean).join(" ").toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  };

  const visibleProjects = useMemo(() => filterRows(projectRows), [projectRows, archive, typeFilter, search]);
  const visibleLogies = useMemo(() => filterRows(logiesRows), [logiesRows, archive, typeFilter, search]);

  return (
    <>
      <Helmet>
        <title>Projecten & Planning | Bureau Vlieland</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>
      <AdminLayout>
        <div className="p-6 space-y-5">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Projecten &amp; Planning</h1>
              <p className="text-sm text-muted-foreground">
                Operationeel overzicht van alle lopende projecten, gesorteerd op eerstvolgende aankomst.
              </p>
            </div>
          </div>

          <Tabs value={tab} onValueChange={(v) => setParam("tab", v)}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <TabsList>
                <TabsTrigger value="lijst">Lijst</TabsTrigger>
                <TabsTrigger value="kalender">Kalender</TabsTrigger>
                <TabsTrigger value="logies">Logies</TabsTrigger>
              </TabsList>

              {tab !== "kalender" && (
                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative">
                    <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Zoek op naam, bedrijf, referentie…"
                      value={search}
                      onChange={(e) => setParam("q", e.target.value)}
                      className="pl-8 w-[260px]"
                    />
                  </div>
                  {tab === "lijst" && (
                    <div className="flex items-center gap-1 text-xs">
                      {([
                        { id: "all", label: "Alle" },
                        { id: "programma", label: "Programma" },
                        { id: "logies", label: "Logies" },
                        { id: "combi", label: "Combi" },
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
                  )}
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

            <TabsContent value="lijst" className="mt-4">
              {loadingProjects ? (
                <div className="space-y-2">
                  {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-14" />)}
                </div>
              ) : (
                <ProjectsListTable rows={visibleProjects} variant="projecten" />
              )}
            </TabsContent>

            <TabsContent value="kalender" className="mt-4">
              <WeekPlanningView />
            </TabsContent>

            <TabsContent value="logies" className="mt-4">
              {loadingLogies ? (
                <div className="space-y-2">
                  {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-14" />)}
                </div>
              ) : (
                <ProjectsListTable rows={visibleLogies} variant="logies" />
              )}
            </TabsContent>
          </Tabs>
        </div>
      </AdminLayout>
    </>
  );
}
