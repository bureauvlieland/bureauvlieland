import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { ExternalLink } from "lucide-react";
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

async function loadFinanceTodos(): Promise<FinanceRow[]> {
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

  if (isLoading) {
    return (
      <div className="space-y-2 p-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  const rows = data ?? [];
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

  return (
    <div className="space-y-2 p-2">
      {Array.from(groups.entries()).map(([key, items]) => {
        const head = items[0];
        return (
          <div key={key} className="rounded-md border bg-background">
            <div className="flex items-center justify-between gap-2 border-b px-3 py-2">
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
                <button
                  key={it.todoId}
                  onClick={() => onSelect(`_orphan_${it.todoId}`)}
                  className={cn(
                    "flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-muted/50",
                    selectedProjectId === `_orphan_${it.todoId}` && "bg-muted/60",
                  )}
                >
                  <span className="truncate">{it.title}</span>
                  <span className="shrink-0 text-[11px] text-muted-foreground">
                    {it.dueDate ?? ""}
                  </span>
                </button>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
