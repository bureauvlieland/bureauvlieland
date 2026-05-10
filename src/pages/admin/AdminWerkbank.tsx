import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Hotel, Sparkles } from "lucide-react";
import {
  listProjectsForWerkbank,
  type ProjectSummary,
  type ProjectKind,
} from "@/lib/getProject";
import {
  COMMUNICATION_STATE_META,
  type ProjectCommunicationState,
} from "@/lib/projectCommunication";
import { cn } from "@/lib/utils";

type QuickView =
  | "alles"
  | "wacht_op_mij"
  | "wacht_op_klant"
  | "wacht_op_partner"
  | "stilte";

const QUICK_VIEWS: { id: QuickView; label: string; match?: ProjectCommunicationState[] }[] = [
  { id: "alles", label: "Alle openstaande" },
  { id: "wacht_op_mij", label: "Wacht op mij", match: ["bij_bureau"] },
  { id: "wacht_op_klant", label: "Wacht op klant", match: ["wacht_op_klant"] },
  { id: "wacht_op_partner", label: "Wacht op partner", match: ["wacht_op_partner", "wacht_op_logies"] },
  { id: "stilte", label: "Stilte — opvolgen", match: ["stilte"] },
];

function CommBadge({ state }: { state: ProjectCommunicationState }) {
  const meta = COMMUNICATION_STATE_META[state];
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium bg-muted", meta.tone)}>
      <span aria-hidden>{meta.emoji}</span>
      {meta.label}
    </span>
  );
}

function KindBadge({ kind }: { kind: ProjectKind }) {
  if (kind === "logies_only") {
    return (
      <Badge variant="secondary" className="gap-1">
        <Hotel className="h-3 w-3" /> Logies-only
      </Badge>
    );
  }
  if (kind === "combi") {
    return (
      <Badge variant="outline" className="gap-1">
        <Hotel className="h-3 w-3" /> + logies
      </Badge>
    );
  }
  return null;
}

function ProjectListRow({
  project,
  selected,
  onClick,
}: {
  project: ProjectSummary;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full text-left rounded-md border px-3 py-2.5 transition-colors hover:bg-muted/50",
        selected && "border-primary bg-muted/40",
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-xs text-muted-foreground">{project.reference}</span>
        <KindBadge kind={project.kind} />
      </div>
      <div className="mt-1 truncate font-medium">
        {project.customer.company || project.customer.name}
      </div>
      <div className="mt-1 flex items-center justify-between gap-2 text-xs text-muted-foreground">
        <span className="truncate">
          {project.numberOfPeople} pers.
          {project.dates[0] && ` · ${project.dates[0]}`}
        </span>
        <CommBadge state={project.comm} />
      </div>
    </button>
  );
}

function ProjectDetailPanel({ project }: { project: ProjectSummary | null }) {
  const navigate = useNavigate();
  if (!project) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        Selecteer een project links om details te zien.
      </div>
    );
  }
  return (
    <div className="space-y-4 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="font-mono text-xs text-muted-foreground">{project.reference}</div>
          <h2 className="text-xl font-semibold">
            {project.customer.company || project.customer.name}
          </h2>
          <div className="mt-1 text-sm text-muted-foreground">
            {project.numberOfPeople} personen · {project.dates.join(" → ") || "geen datum"}
          </div>
        </div>
        <Button
          size="sm"
          onClick={() =>
            navigate(
              project.kind === "logies_only"
                ? `/admin/logies/${project.id}` // tijdelijk: detail van logies
                : `/admin/projecten/${project.id}`,
            )
          }
        >
          Open dossier
        </Button>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Programma</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {project.hasProgram ? (
              <>
                <div className="text-xs text-muted-foreground">Pipeline: {project.programPipeline}</div>
                <CommBadge state={project.programComm} />
              </>
            ) : (
              <div className="text-sm text-muted-foreground">Geen programma-spoor.</div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Logies</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {project.hasLodging && project.lodgingComm ? (
              <>
                <div className="text-xs text-muted-foreground">
                  Pipeline: {project.lodgingPipeline}
                </div>
                <CommBadge state={project.lodgingComm} />
              </>
            ) : (
              <div className="text-sm text-muted-foreground">Geen logies in dit project.</div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Sparkles className="h-4 w-4 text-primary" /> Claudia denkt mee
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            AI-suggesties komen in Fase 6. Hier verschijnen straks concrete vervolgstappen,
            concept-mails en herinneringen die je met één klik kunt openen.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export default function AdminWerkbank() {
  const [params, setParams] = useSearchParams();
  const [tab, setTab] = useState<"inbox" | "projecten">(
    (params.get("tab") as "inbox" | "projecten") || "inbox",
  );
  const [view, setView] = useState<QuickView>("alles");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(params.get("id"));

  const { data: projects, isLoading } = useQuery({
    queryKey: ["werkbank-projects"],
    queryFn: () => listProjectsForWerkbank(),
    refetchInterval: 60_000,
  });

  const filtered = useMemo(() => {
    let list = projects ?? [];
    const qv = QUICK_VIEWS.find((v) => v.id === view);
    if (qv?.match) list = list.filter((p) => qv.match!.includes(p.comm));
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (p) =>
          p.reference.toLowerCase().includes(q) ||
          p.customer.name.toLowerCase().includes(q) ||
          (p.customer.company ?? "").toLowerCase().includes(q) ||
          p.customer.email.toLowerCase().includes(q),
      );
    }
    return list;
  }, [projects, view, search]);

  const selected = filtered.find((p) => p.id === selectedId)
    ?? projects?.find((p) => p.id === selectedId)
    ?? null;

  const handleSelect = (id: string) => {
    setSelectedId(id);
    const next = new URLSearchParams(params);
    next.set("id", id);
    setParams(next, { replace: true });
  };

  const counts = useMemo(() => {
    const list = projects ?? [];
    return {
      bij_bureau:        list.filter((p) => p.comm === "bij_bureau").length,
      wacht_op_klant:    list.filter((p) => p.comm === "wacht_op_klant").length,
      wacht_op_partner:  list.filter((p) => p.comm === "wacht_op_partner" || p.comm === "wacht_op_logies").length,
      stilte:            list.filter((p) => p.comm === "stilte").length,
    };
  }, [projects]);

  return (
    <AdminLayout>
      <div className="flex h-[calc(100vh-4rem)] flex-col">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3">
          <div>
            <h1 className="text-2xl font-semibold">Werkbank</h1>
            <p className="text-sm text-muted-foreground">
              Eén overzicht voor alles wat aandacht vraagt.
            </p>
          </div>
          <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
            <TabsList>
              <TabsTrigger value="inbox">Inbox</TabsTrigger>
              <TabsTrigger value="projecten">Projecten</TabsTrigger>
            </TabsList>
          </Tabs>
        </header>

        <div className="flex flex-1 overflow-hidden">
          {/* Linker lijst */}
          <aside className="flex w-[380px] flex-col border-r">
            <div className="space-y-2 border-b p-3">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Zoek op naam, bedrijf, referentie…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8"
                />
              </div>
              <div className="flex flex-wrap gap-1.5 text-xs">
                {QUICK_VIEWS.map((v) => {
                  const count =
                    v.id === "wacht_op_mij" ? counts.bij_bureau :
                    v.id === "wacht_op_klant" ? counts.wacht_op_klant :
                    v.id === "wacht_op_partner" ? counts.wacht_op_partner :
                    v.id === "stilte" ? counts.stilte :
                    (projects?.length ?? 0);
                  return (
                    <button
                      key={v.id}
                      onClick={() => setView(v.id)}
                      className={cn(
                        "rounded-full border px-2.5 py-1 transition-colors",
                        view === v.id
                          ? "border-primary bg-primary text-primary-foreground"
                          : "hover:bg-muted",
                      )}
                    >
                      {v.label}{" "}
                      <span className={cn(
                        "ml-1 rounded-full bg-muted px-1.5 text-[10px]",
                        view === v.id && "bg-primary-foreground/20",
                      )}>
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex-1 space-y-1.5 overflow-y-auto p-2">
              {isLoading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-20 w-full" />
                ))
              ) : filtered.length === 0 ? (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  Geen projecten in deze weergave.
                </div>
              ) : (
                filtered.map((p) => (
                  <ProjectListRow
                    key={p.id}
                    project={p}
                    selected={selected?.id === p.id}
                    onClick={() => handleSelect(p.id)}
                  />
                ))
              )}
            </div>
          </aside>

          {/* Rechter detail */}
          <section className="flex-1 overflow-y-auto bg-muted/20">
            <ProjectDetailPanel project={selected} />
          </section>
        </div>
      </div>
    </AdminLayout>
  );
}
