import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { loadInbox, type InboxItem, type InboxReason } from "@/lib/getInbox";
import type { ProjectKind } from "@/lib/getProject";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { COMMUNICATION_STATE_META } from "@/lib/projectCommunication";
import { CLUSTER_META, type TodoCluster } from "@/lib/projectActivity";
import { AlertTriangle, ListTodo, Hourglass, Hotel, Timer } from "lucide-react";
import { cn } from "@/lib/utils";

const REASON_META: Record<InboxReason, { label: string; icon: typeof AlertTriangle; tone: string }> = {
  todo:        { label: "Open taken",        icon: ListTodo,        tone: "text-amber-600" },
  bij_bureau:  { label: "Aan zet",           icon: AlertTriangle,    tone: "text-blue-600" },
  stilte:      { label: "Stilte — opvolgen", icon: Hourglass,        tone: "text-rose-600" },
};

interface InboxListProps {
  selectedProjectId: string | null;
  onSelect: (projectId: string) => void;
  kindFilter?: ProjectKind | "all";
  showSnoozed?: boolean;
}

export function InboxList({ selectedProjectId, onSelect, kindFilter = "all", showSnoozed = false }: InboxListProps) {
  const navigate = useNavigate();
  const { data, isLoading } = useQuery({
    queryKey: ["werkbank-inbox", showSnoozed ? "with-snoozed" : "no-snoozed"],
    queryFn: () => loadInbox({ includeSnoozed: showSnoozed }),
    refetchInterval: 60_000,
  });

  if (isLoading) {
    return (
      <div className="space-y-2 p-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
    );
  }

  const allItems = data ?? [];
  const items = kindFilter === "all"
    ? allItems
    : allItems.filter((i) => i.project?.kind === kindFilter);
  if (items.length === 0) {
    return (
      <div className="p-8 text-center text-sm text-muted-foreground">
        {kindFilter === "all"
          ? "🎉 Inbox leeg — niets dat nu aandacht vraagt."
          : "Geen inbox-items voor dit type."}
      </div>
    );
  }

  return (
    <div className="space-y-1.5 p-2">
      {items.map((item) => (
        <InboxRow
          key={item.projectId}
          item={item}
          selected={selectedProjectId === item.projectId}
          onClick={() => {
            onSelect(item.projectId);
          }}
        />
      ))}
    </div>
  );
}

function formatCooldown(days: number | null): string {
  if (days == null) return "";
  if (days < 1) return "vandaag";
  if (days < 2) return "1 dag geleden";
  return `${Math.floor(days)} dagen geleden`;
}

function pickNextAction(item: InboxItem): string | null {
  // 1. concrete bureau-hint heeft voorrang
  if (item.project?.bureauActionHints?.length) return item.project.bureauActionHints[0];
  // 2. anders: titel van hoogste-prio zichtbare todo
  const sorted = [...item.todos].sort((a, b) => {
    const order = { urgent: 0, high: 1, normal: 2, low: 3 } as const;
    return (order[a.priority] ?? 9) - (order[b.priority] ?? 9);
  });
  return sorted[0]?.title ?? null;
}

function InboxRow({
  item,
  selected,
  onClick,
}: {
  item: InboxItem;
  selected: boolean;
  onClick: () => void;
}) {
  const project = item.project;
  const commMeta = item.comm ? COMMUNICATION_STATE_META[item.comm] : null;
  const cooldown = item.activity.cooldown;
  const cooldownLabel =
    cooldown === "hot"  ? `⏱ Net contact gehad · ${formatCooldown(item.activity.daysSinceContact)}` :
    cooldown === "warm" ? `⏱ Recent contact · ${formatCooldown(item.activity.daysSinceContact)}` :
    null;

  // Cluster-samenvatting: max 1 regel per cluster
  const byCluster = new Map<TodoCluster, { count: number; sample: string }>();
  for (const t of item.todos) {
    const cur = byCluster.get(t.cluster);
    if (cur) cur.count += 1;
    else byCluster.set(t.cluster, { count: 1, sample: t.title });
  }
  const clusters = Array.from(byCluster.entries())
    .sort((a, b) => CLUSTER_META[a[0]].order - CLUSTER_META[b[0]].order);

  const nextAction = pickNextAction(item);

  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full rounded-md border bg-background px-3 py-2.5 text-left transition-colors hover:bg-muted/50",
        selected && "border-primary bg-muted/40",
        cooldown !== "cold" && !selected && "opacity-90",
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          {project ? (
            <>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono text-xs text-muted-foreground">{project.reference}</span>
                {project.kind !== "programma_only" && (
                  <Badge variant="outline" className="gap-1 text-[10px]">
                    <Hotel className="h-3 w-3" />
                    {project.kind === "logies_only" ? "logies-only" : "+ logies"}
                  </Badge>
                )}
                {project.isSnoozed && project.snoozedUntil && (
                  <Badge variant="outline" className="gap-1 text-[10px] border-amber-300 bg-amber-50 text-amber-800">
                    💤 tot {new Date(project.snoozedUntil).toLocaleDateString("nl-NL", { day: "numeric", month: "short" })}
                  </Badge>
                )}
              </div>
              <div className="mt-0.5 truncate text-sm font-medium">
                {project.customer.company || project.customer.name}
              </div>
            </>
          ) : (
            <div className="truncate text-sm font-medium">
              {item.todos[0]?.title ?? "Losse taak"}
            </div>
          )}
        </div>
        {commMeta && (
          <span className="shrink-0 text-xs" title={commMeta.label}>
            <span aria-hidden>{commMeta.emoji}</span>
          </span>
        )}
      </div>

      {cooldownLabel && (
        <div className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground">
          <Timer className="h-3 w-3" />
          <span>{cooldownLabel}</span>
        </div>
      )}

      {nextAction && (
        <div className="mt-1 truncate text-xs text-blue-700 dark:text-blue-300">
          → {nextAction}
        </div>
      )}

      {clusters.length > 0 && (
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
          {clusters.map(([cluster, info]) => {
            const meta = CLUSTER_META[cluster];
            return (
              <span
                key={cluster}
                className={cn(
                  "inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[11px]",
                  meta.tone,
                )}
                title={info.sample}
              >
                {meta.label}
                {info.count > 1 && <span className="opacity-70">· {info.count}</span>}
              </span>
            );
          })}
          {item.suppressedCount > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-muted/60 px-2 py-0.5 text-[11px] text-muted-foreground" title="Onderdrukt door recent contact">
              +{item.suppressedCount} stil
            </span>
          )}
        </div>
      )}
    </button>
  );
}
