import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { loadInbox, type InboxItem, type InboxReason } from "@/lib/getInbox";
import type { ProjectKind } from "@/lib/getProject";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { COMMUNICATION_STATE_META } from "@/lib/projectCommunication";
import { AlertTriangle, ListTodo, Hourglass, Hotel } from "lucide-react";
import { cn } from "@/lib/utils";

const REASON_META: Record<InboxReason, { label: string; icon: typeof AlertTriangle; tone: string }> = {
  todo:        { label: "Open taken",        icon: ListTodo,        tone: "text-amber-600" },
  bij_bureau:  { label: "Aan zet",           icon: AlertTriangle,    tone: "text-blue-600" },
  stilte:      { label: "Stilte — opvolgen", icon: Hourglass,        tone: "text-rose-600" },
};

interface InboxListProps {
  selectedProjectId: string | null;
  onSelect: (projectId: string) => void;
}

export function InboxList({ selectedProjectId, onSelect }: InboxListProps) {
  const navigate = useNavigate();
  const { data, isLoading } = useQuery({
    queryKey: ["werkbank-inbox"],
    queryFn: () => loadInbox(),
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

  const items = data ?? [];
  if (items.length === 0) {
    return (
      <div className="p-8 text-center text-sm text-muted-foreground">
        🎉 Inbox leeg — niets dat nu aandacht vraagt.
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
            if (item.project) onSelect(item.projectId);
            else if (item.todos[0]) navigate("/admin/werkbank?tab=projecten");
          }}
        />
      ))}
    </div>
  );
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
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full rounded-md border bg-background px-3 py-2.5 text-left transition-colors hover:bg-muted/50",
        selected && "border-primary bg-muted/40",
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          {project ? (
            <>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs text-muted-foreground">{project.reference}</span>
                {project.kind !== "programma_only" && (
                  <Badge variant="outline" className="gap-1 text-[10px]">
                    <Hotel className="h-3 w-3" />
                    {project.kind === "logies_only" ? "logies-only" : "+ logies"}
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
          <span className="shrink-0 text-xs">
            <span aria-hidden>{commMeta.emoji}</span>
          </span>
        )}
      </div>

      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
        {item.reasons.map((r) => {
          const meta = REASON_META[r];
          const Icon = meta.icon;
          const count = r === "todo" ? item.todos.length : null;
          return (
            <span
              key={r}
              className={cn(
                "inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[11px]",
                meta.tone,
              )}
            >
              <Icon className="h-3 w-3" />
              {meta.label}
              {count != null && <span className="opacity-70">· {count}</span>}
            </span>
          );
        })}
      </div>

      {item.todos.length > 0 && (
        <ul className="mt-1.5 space-y-0.5 text-xs text-muted-foreground">
          {item.todos.slice(0, 2).map((t) => (
            <li key={t.id} className="truncate">
              • {t.title}
              {t.priority === "urgent" || t.priority === "high" ? (
                <span className="ml-1 text-rose-600">({t.priority})</span>
              ) : null}
            </li>
          ))}
          {item.todos.length > 2 && (
            <li className="opacity-70">+ {item.todos.length - 2} meer…</li>
          )}
        </ul>
      )}
    </button>
  );
}
