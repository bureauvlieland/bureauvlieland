import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
// Card components moved into ProjectDetailPanel
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Hotel, Sparkles, Archive, Layers } from "lucide-react";
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
import { ClaudiaChatPanel } from "@/components/admin/werkbank/ClaudiaChatPanel";
import { InboxList } from "@/components/admin/werkbank/InboxList";
import { ProjectDetailPanel } from "@/components/admin/werkbank/ProjectDetailPanel";

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

// ProjectDetailPanel is imported from ./werkbank/ProjectDetailPanel

export default function AdminWerkbank() {
  const [params, setParams] = useSearchParams();
  const [tab, setTab] = useState<"inbox" | "projecten">(
    (params.get("tab") as "inbox" | "projecten") || "inbox",
  );
  const [view, setView] = useState<QuickView>("alles");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(params.get("id"));
  const [archive, setArchive] = useState<boolean>(params.get("archief") === "1");

  const { data: projects, isLoading } = useQuery({
    queryKey: ["werkbank-projects", archive ? "archief" : "actief"],
    queryFn: () => listProjectsForWerkbank({ archiveOnly: archive }),
    refetchInterval: 60_000,
  });

  const toggleArchive = (next: boolean) => {
    setArchive(next);
    const p = new URLSearchParams(params);
    if (next) p.set("archief", "1"); else p.delete("archief");
    setParams(p, { replace: true });
  };

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

  const [claudiaOpen, setClaudiaOpen] = useState(false);

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
          <div className="flex items-center gap-2">
            <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
              <TabsList>
                <TabsTrigger value="inbox">Inbox</TabsTrigger>
                <TabsTrigger value="projecten">Projecten</TabsTrigger>
              </TabsList>
            </Tabs>
            <Button size="sm" variant="outline" onClick={() => setClaudiaOpen(true)} className="gap-1.5">
              <Sparkles className="h-4 w-4 text-primary" />
              Claudia
            </Button>
          </div>
        </header>

        <div className="flex flex-1 overflow-hidden">
          {/* Linker lijst */}
          <aside className="flex w-[380px] flex-col border-r">
            {tab === "projecten" && (
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
                <div className="flex flex-wrap items-center gap-1.5 text-xs">
                  {!archive && QUICK_VIEWS.map((v) => {
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
                  <button
                    onClick={() => toggleArchive(!archive)}
                    className={cn(
                      "ml-auto inline-flex items-center gap-1 rounded-full border px-2.5 py-1 transition-colors",
                      archive
                        ? "border-primary bg-primary text-primary-foreground"
                        : "hover:bg-muted",
                    )}
                    title={archive ? "Terug naar werklijst" : "Toon gearchiveerde projecten"}
                  >
                    <Archive className="h-3 w-3" />
                    {archive ? "Archief aan" : "Archief"}
                  </button>
                </div>
              </div>
            )}

            <div className="flex-1 overflow-y-auto">
              {tab === "inbox" ? (
                <InboxList selectedProjectId={selected?.id ?? null} onSelect={handleSelect} />
              ) : (
                <div className="space-y-1.5 p-2">
                  {isLoading ? (
                    Array.from({ length: 6 }).map((_, i) => (
                      <Skeleton key={i} className="h-20 w-full" />
                    ))
                  ) : filtered.length === 0 ? (
                    <div className="p-4 text-center text-sm text-muted-foreground">
                      {archive ? "Geen gearchiveerde projecten." : "Geen projecten in deze weergave."}
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
              )}
            </div>
          </aside>

          {/* Rechter detail */}
          <section className="flex-1 overflow-y-auto bg-muted/20">
            <ProjectDetailPanel project={selected} />
          </section>
        </div>
      </div>

      <ClaudiaChatPanel
        open={claudiaOpen}
        onOpenChange={setClaudiaOpen}
        contextProjectId={selected?.id ?? null}
      />
    </AdminLayout>
  );
}

