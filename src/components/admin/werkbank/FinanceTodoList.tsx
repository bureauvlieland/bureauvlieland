import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
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
import { useToast } from "@/hooks/use-toast";
import { ExternalLink, Check, Archive, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Werkbank-tab "Financieel / afgerond".
 *
 * Toont openstaande taken die niet in de Inbox verschijnen omdat het
 * bijbehorende project afgerond, geannuleerd of gearchiveerd is — vooral
 * commissie- en inkoopfactuur-taken die financieel nog afgewikkeld moeten
 * worden.
 */

const FINANCE_AUTO_TYPES = new Set([
  "commission_missing_invoice",
  "commission_unlinked_invoice",
  "purchase_invoice_pending",
  "invoicing_due",
  "post_execution_invoicing",
]);

const CLOSED_STATUSES = new Set(["afgerond", "geannuleerd", "completed", "cancelled"]);

interface FinanceRow {
  todoId: string;
  title: string;
  priority: "low" | "normal" | "high" | "urgent";
  dueDate: string | null;
  autoType: string | null;
  requestId: string | null;
  reference: string | null;
  customer: string | null;
  projectStatus: string | null;
}

export async function loadFinanceTodos(): Promise<FinanceRow[]> {
  const { data: todos, error } = await supabase
    .from("admin_todos")
    .select("id, title, priority, due_date, auto_type, related_request_id")
    .not("status", "in", "(done,dismissed)")
    .order("due_date", { ascending: true, nullsFirst: false })
    .limit(500);
  if (error) throw error;

  const ids = Array.from(
    new Set((todos ?? []).map((t) => t.related_request_id).filter(Boolean) as string[]),
  );
  const projects = new Map<string, { reference: string | null; customer: string | null; status: string | null; archived: boolean }>();
  if (ids.length) {
    const { data: reqs } = await supabase
      .from("program_requests")
      .select("id, reference_number, customer_name, customer_company, status, archived_at")
      .in("id", ids);
    for (const r of reqs ?? []) {
      projects.set(r.id, {
        reference: r.reference_number ?? null,
        customer: r.customer_company || r.customer_name || null,
        status: r.status ?? null,
        archived: !!r.archived_at,
      });
    }
  }

  const rows: FinanceRow[] = [];
  for (const t of todos ?? []) {
    const proj = t.related_request_id ? projects.get(t.related_request_id) : undefined;
    const closed = !!proj && (proj.archived || CLOSED_STATUSES.has(proj.status ?? ""));
    const financial = FINANCE_AUTO_TYPES.has(t.auto_type ?? "");
    if (!closed && !financial) continue;
    rows.push({
      todoId: t.id,
      title: t.title,
      priority: (t.priority ?? "normal") as FinanceRow["priority"],
      dueDate: t.due_date,
      autoType: t.auto_type,
      requestId: t.related_request_id,
      reference: proj?.reference ?? null,
      customer: proj?.customer ?? null,
      projectStatus: proj?.status ?? null,
    });
  }
  return rows;
}


export function FinanceTodoList({
  selectedProjectId,
  onSelect,
}: {
  selectedProjectId: string | null;
  onSelect: (key: string) => void;
}) {
  const { data, isLoading } = useQuery({
    queryKey: ["werkbank-finance-todos"],
    queryFn: loadFinanceTodos,
    refetchInterval: 60_000,
  });
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState<null | "done" | "dismissed">(null);

  const rows = data ?? [];
  const selectedIds = rows.map((r) => r.todoId).filter((id) => selected.has(id));

  const toggle = (id: string, on: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });
  };

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

  const applyBulk = async (status: "done" | "dismissed") => {
    if (selectedIds.length === 0) return;
    setBusy(true);
    const patch: Record<string, unknown> = { status };
    if (status === "done") patch.completed_at = new Date().toISOString();
    const { error } = await supabase
      .from("admin_todos")
      .update(patch as never)
      .in("id", selectedIds);
    setBusy(false);
    setConfirm(null);
    if (error) {
      toast({ title: "Kon taken niet bijwerken", description: error.message, variant: "destructive" });
      return;
    }
    toast({
      title:
        status === "done"
          ? `${selectedIds.length} taak/taken afgerond`
          : `${selectedIds.length} taak/taken gearchiveerd`,
    });
    setSelected(new Set());
    queryClient.invalidateQueries({ queryKey: ["werkbank-finance-todos"] });
    queryClient.invalidateQueries({ queryKey: ["werkbank-inbox"] });
    queryClient.invalidateQueries({ queryKey: ["claudia-recommendations"] });
    queryClient.invalidateQueries({ queryKey: ["claudia-recommendations-count"] });
  };

  const requestBulk = (status: "done" | "dismissed") => {
    if (selectedIds.length > 5) setConfirm(status);
    else void applyBulk(status);
  };

  if (isLoading) {
    return (
      <div className="space-y-2 p-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="p-8 text-center text-sm text-muted-foreground">
        Geen financiële restpunten — alles afgewikkeld.
      </div>
    );
  }

  // Groepeer per project (of "losse taken")
  const groups = new Map<string, FinanceRow[]>();
  for (const r of rows) {
    const key = r.requestId ?? "_los";
    const arr = groups.get(key);
    if (arr) arr.push(r);
    else groups.set(key, [r]);
  }

  const allIds = rows.map((r) => r.todoId);
  const allSelected = selectedIds.length === allIds.length;

  return (
    <div className="space-y-2 p-2">
      <div className="flex items-center gap-2 px-1 text-xs text-muted-foreground">
        <Checkbox
          checked={allSelected ? true : selectedIds.length > 0 ? "indeterminate" : false}
          onCheckedChange={(v) => toggleMany(allIds, v === true)}
          aria-label="Alles selecteren"
        />
        <span>Alles selecteren ({rows.length})</span>
      </div>
      <p className="px-1 text-[11px] leading-snug text-muted-foreground">
        Let op: automatische commissie- en inkoopfactuurtaken komen terug zolang de
        onderliggende factuur of koppeling nog mist. Archiveren is bedoeld voor oude ruis.
      </p>

      {selectedIds.length > 0 && (
        <div className="sticky top-0 z-10 flex items-center justify-between gap-2 rounded-md border bg-background/95 px-3 py-2 shadow-sm backdrop-blur">
          <span className="text-sm font-medium">{selectedIds.length} geselecteerd</span>
          <div className="flex items-center gap-2">
            <Button size="sm" disabled={busy} onClick={() => requestBulk("done")} className="gap-1">
              {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
              Afronden
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={busy}
              onClick={() => requestBulk("dismissed")}
              className="gap-1"
            >
              <Archive className="h-3.5 w-3.5" />
              Archiveren
            </Button>
          </div>
        </div>
      )}

      {Array.from(groups.entries()).map(([key, items]) => {
        const head = items[0];
        const groupIds = items.map((i) => i.todoId);
        const groupSelectedCount = groupIds.filter((id) => selected.has(id)).length;
        return (
          <div key={key} className="rounded-md border bg-background">
            <div className="flex items-center justify-between gap-2 border-b px-3 py-2">
              <div className="flex min-w-0 items-center gap-2">
                <Checkbox
                  checked={
                    groupSelectedCount === groupIds.length
                      ? true
                      : groupSelectedCount > 0
                        ? "indeterminate"
                        : false
                  }
                  onCheckedChange={(v) => toggleMany(groupIds, v === true)}
                  aria-label="Selecteer alle taken van dit project"
                />
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-muted-foreground">
                      {head.reference ?? "Losse taken"}
                    </span>
                    {head.projectStatus && (
                      <Badge variant="outline" className="text-[10px]">{head.projectStatus}</Badge>
                    )}
                  </div>
                  {head.customer && (
                    <div className="truncate text-sm font-medium">{head.customer}</div>
                  )}
                </div>
              </div>
              {head.requestId && (
                <Link
                  to={`/admin/projecten/${head.requestId}`}
                  className="shrink-0 text-muted-foreground hover:text-foreground"
                  title="Open project"
                >
                  <ExternalLink className="h-4 w-4" />
                </Link>
              )}
            </div>
            <div className="divide-y">
              {items.map((it) => (
                <div
                  key={it.todoId}
                  className={cn(
                    "flex w-full items-center gap-2 px-3 py-2 text-sm transition-colors hover:bg-muted/50",
                    selectedProjectId === `_orphan_${it.todoId}` && "bg-muted/60",
                  )}
                >
                  <Checkbox
                    checked={selected.has(it.todoId)}
                    onCheckedChange={(v) => toggle(it.todoId, v === true)}
                    aria-label={`Selecteer taak ${it.title}`}
                  />
                  <button
                    onClick={() => onSelect(`_orphan_${it.todoId}`)}
                    className="flex min-w-0 flex-1 items-center justify-between gap-2 text-left"
                  >
                    <span className="truncate">{it.title}</span>
                    <span className="shrink-0 text-[11px] text-muted-foreground">
                      {it.dueDate ?? ""}
                    </span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        );
      })}

      <AlertDialog open={confirm !== null} onOpenChange={(o) => !o && setConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirm === "done" ? "Taken afronden?" : "Taken archiveren?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              Je staat op het punt {selectedIds.length} taken{" "}
              {confirm === "done" ? "af te ronden" : "te archiveren"}. Dit kan niet in één
              klik ongedaan gemaakt worden.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuleren</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                void applyBulk(confirm!);
              }}
            >
              Bevestigen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
