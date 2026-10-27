import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { isSystemTodo, loadInbox, type InboxItem, type InboxReason } from "@/lib/getInbox";
import type { ProjectKind } from "@/lib/getProject";
import { useInboxTodoActions, SNOOZE_DAYS, type InboxTodoAction } from "@/hooks/useInboxTodoActions";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { COMMUNICATION_STATE_META } from "@/lib/projectCommunication";
import { CLUSTER_META, type TodoCluster } from "@/lib/projectActivity";
import {
  AlertTriangle,
  Check,
  ChevronDown,
  ListTodo,
  Hourglass,
  Hotel,
  Loader2,
  Mail,
  MessageCircle,
  Moon,
  ServerCog,
  Timer,
  Trash2,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

const REASON_META: Record<InboxReason, { label: string; icon: typeof AlertTriangle; tone: string }> = {
  todo:            { label: "Open taken",        icon: ListTodo,        tone: "text-amber-600" },
  bij_bureau:      { label: "Aan zet",           icon: AlertTriangle,    tone: "text-blue-600" },
  stilte:          { label: "Stilte — opvolgen", icon: Hourglass,        tone: "text-rose-600" },
  te_beantwoorden: { label: "Te beantwoorden",   icon: Mail,             tone: "text-warning-ink" },
};

function formatWaiting(iso: string): string {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return "";
  const hours = (Date.now() - t) / 3_600_000;
  if (hours < 1) return "net binnen";
  if (hours < 24) return `wacht ${Math.floor(hours)} uur`;
  const days = Math.floor(hours / 24);
  return `wacht ${days} ${days === 1 ? "dag" : "dagen"}`;
}

/** Boven dit aantal vragen we bevestiging voor een bulk-actie. */
const CONFIRM_THRESHOLD = 5;

interface InboxListProps {
  selectedProjectId: string | null;
  onSelect: (projectId: string) => void;
  kindFilter?: ProjectKind | "all";
  showSnoozed?: boolean;
  /** Wordt aangeroepen met de taak-ids die zojuist zijn afgehandeld. */
  onTodosResolved?: (ids: string[]) => void;
}

export function InboxList({
  selectedProjectId,
  onSelect,
  kindFilter = "all",
  showSnoozed = false,
  onTodosResolved,
}: InboxListProps) {
  const { data, isLoading } = useQuery({
    queryKey: ["werkbank-inbox", showSnoozed ? "with-snoozed" : "no-snoozed"],
    queryFn: () => loadInbox({ includeSnoozed: showSnoozed }),
    refetchInterval: 60_000,
  });
  const { run } = useInboxTodoActions({ onResolved: onTodosResolved });

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState<{ action: InboxTodoAction; ids: string[] } | null>(null);
  const [looseOpen, setLooseOpen] = useState(true);

  const { projectItems, looseItems } = useMemo(() => {
    const allItems = data ?? [];
    const projectItems = allItems.filter(
      (i) => i.kind === "project" && (kindFilter === "all" || i.project?.kind === kindFilter),
    );
    // Losse taken hebben geen projecttype; ze horen bij elk filter.
    const looseItems = allItems.filter((i) => i.kind === "loose");
    return { projectItems, looseItems };
  }, [data, kindFilter]);

  const looseTodoIds = useMemo(
    () => looseItems.flatMap((i) => i.todos.map((t) => t.id)),
    [looseItems],
  );
  const looseTodoById = useMemo(() => {
    const m = new Map<string, { auto_type: string | null }>();
    for (const i of looseItems) for (const t of i.todos) m.set(t.id, t);
    return m;
  }, [looseItems]);
  // Selectie opschonen als taken intussen uit de lijst verdwenen zijn.
  const selectedIds = looseTodoIds.filter((id) => selected.has(id));
  const selectedManualCount = selectedIds.filter((id) => !looseTodoById.get(id)?.auto_type).length;

  const toggleMany = (ids: string[], on: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev);
      for (const id of ids) {
        if (on) next.add(id);
        else next.delete(id);
      }
      return next;
    });
  };

  const apply = async (action: InboxTodoAction, ids: string[]) => {
    setBusy(true);
    const ok = await run(action, ids);
    setBusy(false);
    setConfirm(null);
    if (ok) setSelected((prev) => {
      const next = new Set(prev);
      for (const id of ids) next.delete(id);
      return next;
    });
  };

  /** Verwijderen is definitief en grote bulk-acties vragen om bevestiging. */
  const request = (action: InboxTodoAction, ids: string[]) => {
    if (ids.length === 0) return;
    if (action === "delete" || ids.length > CONFIRM_THRESHOLD) setConfirm({ action, ids });
    else void apply(action, ids);
  };
  const requestBulk = (action: InboxTodoAction) => request(action, selectedIds);

  if (isLoading) {
    return (
      <div className="space-y-2 p-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
    );
  }

  if (projectItems.length === 0 && looseItems.length === 0) {
    return (
      <div className="p-8 text-center text-sm text-muted-foreground">
        {kindFilter === "all"
          ? "🎉 Inbox leeg — niets dat nu aandacht vraagt."
          : "Geen inbox-items voor dit type."}
      </div>
    );
  }

  const allLooseSelected = looseTodoIds.length > 0 && selectedIds.length === looseTodoIds.length;

  return (
    <div className="space-y-3 p-2">
      {/* Dossiers */}
      <section className="space-y-1.5">
        <SectionHeader label="Dossiers" count={projectItems.length} />
        {projectItems.length === 0 ? (
          <div className="px-2 py-3 text-xs text-muted-foreground">
            {kindFilter === "all" ? "Geen dossiers die aandacht vragen." : "Geen dossiers voor dit type."}
          </div>
        ) : (
          projectItems.map((item) => (
            <ProjectRow
              key={item.projectId}
              item={item}
              selected={selectedProjectId === item.projectId}
              onClick={() => onSelect(item.projectId)}
            />
          ))
        )}
      </section>

      {/* Losse taken & systeem */}
      {looseItems.length > 0 && (
        <section className="space-y-1.5">
          <button
            type="button"
            onClick={() => setLooseOpen((o) => !o)}
            className="flex w-full items-center gap-2 px-1 text-left"
            aria-expanded={looseOpen}
          >
            <ChevronDown className={cn("h-3.5 w-3.5 text-muted-foreground transition-transform", !looseOpen && "-rotate-90")} />
            <SectionHeader label="Losse taken & systeem" count={looseTodoIds.length} />
          </button>

          {looseOpen && (
            <>
              <div className="flex items-center gap-2 px-1 text-xs text-muted-foreground">
                <Checkbox
                  checked={allLooseSelected ? true : selectedIds.length > 0 ? "indeterminate" : false}
                  onCheckedChange={(v) => toggleMany(looseTodoIds, v === true)}
                  aria-label="Alle losse taken selecteren"
                />
                <span>Alles selecteren ({looseTodoIds.length})</span>
              </div>

              {selectedIds.length > 0 && (
                <div className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-2 rounded-md border bg-background/95 px-3 py-2 shadow-sm backdrop-blur">
                  <span className="text-sm font-medium">{selectedIds.length} geselecteerd</span>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Button size="sm" disabled={busy} onClick={() => requestBulk("done")} className="h-7 gap-1">
                      {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                      Opgepakt
                    </Button>
                    <Button size="sm" variant="outline" disabled={busy} onClick={() => requestBulk("dismissed")} className="h-7 gap-1">
                      <X className="h-3.5 w-3.5" /> Niet relevant
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busy}
                      onClick={() => requestBulk("snooze")}
                      className="h-7 gap-1"
                      title={`Verberg ${SNOOZE_DAYS} dagen`}
                    >
                      <Moon className="h-3.5 w-3.5" /> Snooze
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={busy || selectedManualCount > 0}
                      onClick={() => requestBulk("delete")}
                      className="h-7 gap-1 text-destructive hover:text-destructive"
                      title={
                        selectedManualCount > 0
                          ? "Alleen automatische taken kunnen definitief verwijderd worden"
                          : "Definitief verwijderen"
                      }
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Verwijderen
                    </Button>
                  </div>
                </div>
              )}

              {looseItems.map((item) => {
                const ids = item.todos.map((t) => t.id);
                const selectedCount = ids.filter((id) => selected.has(id)).length;
                return (
                  <LooseRow
                    key={item.projectId}
                    item={item}
                    active={selectedProjectId === item.projectId}
                    checked={selectedCount === ids.length ? true : selectedCount > 0 ? "indeterminate" : false}
                    busy={busy}
                    onCheck={(on) => toggleMany(ids, on)}
                    onClick={() => onSelect(item.projectId)}
                    onAction={(action) => request(action, ids)}
                  />
                );
              })}
            </>
          )}
        </section>
      )}

      <AlertDialog open={confirm !== null} onOpenChange={(o) => !o && setConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirm?.action === "delete"
                ? "Taken definitief verwijderen?"
                : confirm?.action === "done"
                  ? "Taken als opgepakt markeren?"
                  : confirm?.action === "snooze"
                    ? "Taken snoozen?"
                    : "Taken als niet relevant markeren?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirm?.action === "delete"
                ? `Je verwijdert ${confirm.ids.length} automatische ${confirm.ids.length === 1 ? "taak" : "taken"} uit de database. Dit kan niet ongedaan gemaakt worden; komt de aanleiding terug, dan maakt het systeem de taak opnieuw aan.`
                : `Dit geldt voor ${confirm?.ids.length ?? 0} taken. Je kunt het direct daarna nog ongedaan maken via de melding.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuleren</AlertDialogCancel>
            <AlertDialogAction
              className={cn(confirm?.action === "delete" && "bg-destructive text-destructive-foreground hover:bg-destructive/90")}
              onClick={(e) => {
                e.preventDefault();
                if (confirm) void apply(confirm.action, confirm.ids);
              }}
            >
              {confirm?.action === "delete" ? "Verwijderen" : "Bevestigen"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function SectionHeader({ label, count }: { label: string; count: number }) {
  return (
    <div className="flex items-center gap-2 px-1 py-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
      <span>{label}</span>
      <span className="rounded-full bg-muted px-1.5 text-[10px] font-normal normal-case tracking-normal">{count}</span>
    </div>
  );
}

function formatCooldown(days: number | null): string {
  if (days == null) return "";
  if (days < 1) return "vandaag";
  if (days < 2) return "1 dag geleden";
  return `${Math.floor(days)} dagen geleden`;
}

function formatSince(iso: string | null): string | null {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return null;
  const days = (Date.now() - t) / 86_400_000;
  if (days < 1) return "vandaag";
  if (days < 2) return "gisteren";
  return `${Math.floor(days)} dagen`;
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

function ClusterChips({ item }: { item: InboxItem }) {
  // Cluster-samenvatting: max 1 regel per cluster
  const byCluster = new Map<TodoCluster, { count: number; sample: string }>();
  for (const t of item.todos) {
    const cur = byCluster.get(t.cluster);
    if (cur) cur.count += 1;
    else byCluster.set(t.cluster, { count: 1, sample: t.title });
  }
  const clusters = Array.from(byCluster.entries())
    .sort((a, b) => CLUSTER_META[a[0]].order - CLUSTER_META[b[0]].order);
  if (clusters.length === 0 && item.suppressedCount === 0) return null;

  return (
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
  );
}

function ProjectRow({
  item,
  selected,
  onClick,
}: {
  item: InboxItem;
  selected: boolean;
  onClick: () => void;
}) {
  const project = item.project!;
  const commMeta = item.comm ? COMMUNICATION_STATE_META[item.comm] : null;
  const cooldown = item.activity.cooldown;
  const cooldownLabel =
    cooldown === "hot"  ? `⏱ Net contact gehad · ${formatCooldown(item.activity.daysSinceContact)}` :
    cooldown === "warm" ? `⏱ Recent contact · ${formatCooldown(item.activity.daysSinceContact)}` :
    null;
  const nextAction = pickNextAction(item);

  return (
    <div
      className={cn(
        "w-full rounded-md border bg-background transition-colors",
        selected && "border-primary bg-muted/40",
        cooldown !== "cold" && !selected && "opacity-90",
      )}
    >
    <button
      onClick={onClick}
      className="w-full px-3 py-2.5 text-left transition-colors hover:bg-muted/50 rounded-md"
    >
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
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

      <ClusterChips item={item} />
    </button>
      {item.open.length > 0 && (
        <ul className="border-t px-3 py-1.5 space-y-1">
          {item.open.map((sig) => (
            <li key={`${sig.kind}-${sig.href}`} className="flex items-center gap-1.5 text-xs">
              {sig.kind === "email" ? (
                <Mail className="h-3 w-3 shrink-0 text-warning-ink" />
              ) : (
                <MessageCircle className="h-3 w-3 shrink-0 text-warning-ink" />
              )}
              <Link
                to={sig.href}
                className="min-w-0 flex-1 truncate font-medium text-foreground hover:underline"
                title={`${sig.label} · ${sig.count} onbeantwoord`}
              >
                {sig.label}
              </Link>
              <span className="shrink-0 text-warning-ink">{formatWaiting(sig.since)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

const PRIORITY_DOT: Record<string, string> = {
  urgent: "bg-red-500",
  high: "bg-amber-500",
  normal: "bg-slate-300",
  low: "bg-slate-200",
};

function LooseRow({
  item,
  active,
  checked,
  busy,
  onCheck,
  onClick,
  onAction,
}: {
  item: InboxItem;
  active: boolean;
  checked: boolean | "indeterminate";
  busy: boolean;
  onCheck: (on: boolean) => void;
  onClick: () => void;
  onAction: (action: InboxTodoAction) => void;
}) {
  const head = item.todos[0];
  const count = item.todos.length;
  const system = isSystemTodo(head);
  const isAuto = !!head.auto_type;
  const clusterMeta = CLUSTER_META[head.cluster];
  const since = formatSince(item.todos[count - 1]?.created_at ?? head.created_at);
  const label = count > 1 ? `${count} taken` : "taak";

  return (
    <div
      className={cn(
        "group flex w-full items-start gap-2 rounded-md border bg-background px-2 py-2 transition-colors hover:bg-muted/50",
        active && "border-primary bg-muted/40",
      )}
    >
      <Checkbox
        className="mt-0.5"
        checked={checked}
        onCheckedChange={(v) => onCheck(v === true)}
        aria-label={count > 1 ? `Selecteer ${count} taken: ${head.title}` : `Selecteer taak ${head.title}`}
      />
      <button onClick={onClick} className="min-w-0 flex-1 text-left">
        <div className="flex items-center gap-1.5">
          <span className={cn("h-2 w-2 shrink-0 rounded-full", PRIORITY_DOT[head.priority] ?? PRIORITY_DOT.normal)} title={`Prioriteit: ${head.priority}`} />
          <span className="truncate text-sm font-medium">{head.title}</span>
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px]">
          {count > 1 && (
            <Badge variant="secondary" className="h-4 px-1.5 text-[10px]">× {count}</Badge>
          )}
          {system ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-muted-foreground">
              <ServerCog className="h-3 w-3" /> Systeem
            </span>
          ) : (
            <span className={cn("inline-flex items-center rounded-full bg-muted px-2 py-0.5", clusterMeta.tone)}>
              {clusterMeta.label}
            </span>
          )}
          {since && <span className="text-muted-foreground">sinds {since}</span>}
        </div>
      </button>
      <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
        <Button
          size="icon"
          variant="ghost"
          className="h-7 w-7"
          disabled={busy}
          title={`Opgepakt (${label})`}
          aria-label={`Markeer ${label} als opgepakt`}
          onClick={() => onAction("done")}
        >
          <Check className="h-4 w-4 text-emerald-600" />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          className="h-7 w-7"
          disabled={busy}
          title={`Niet relevant (${label})`}
          aria-label={`Markeer ${label} als niet relevant`}
          onClick={() => onAction("dismissed")}
        >
          <X className="h-4 w-4 text-muted-foreground" />
        </Button>
        {isAuto && (
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7"
            disabled={busy}
            title={`Definitief verwijderen (${label})`}
            aria-label={`Verwijder ${label}`}
            onClick={() => onAction("delete")}
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        )}
      </div>
    </div>
  );
}
