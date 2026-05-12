import { useState } from "react";
import { Mail, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { nl } from "date-fns/locale";

interface EmailLogEntry {
  id: string;
  email_type: string;
  subject: string;
  recipient_email: string;
  recipient_name: string | null;
  status: string;
  sent_at: string | null;
  created_at: string;
  error_message: string | null;
  related_item_id: string | null;
  related_request_id: string | null;
  metadata: Record<string, unknown> | null;
}

type MatchSource = "direct" | "group" | "project";

interface DisplayEntry extends EmailLogEntry {
  matchSource: MatchSource;
}

interface ItemEmailLogPopoverProps {
  itemId: string;
  itemName?: string;
  requestId?: string;
}

const STATUS_VARIANTS: Record<string, { label: string; className: string }> = {
  sent: { label: "Verzonden", className: "bg-emerald-100 text-emerald-800 border-emerald-200" },
  delivered: { label: "Afgeleverd", className: "bg-emerald-100 text-emerald-800 border-emerald-200" },
  pending: { label: "In wachtrij", className: "bg-amber-100 text-amber-800 border-amber-200" },
  failed: { label: "Mislukt", className: "bg-rose-100 text-rose-800 border-rose-200" },
  bounced: { label: "Bounced", className: "bg-rose-100 text-rose-800 border-rose-200" },
  suppressed: { label: "Onderdrukt", className: "bg-slate-100 text-slate-700 border-slate-200" },
  dlq: { label: "Mislukt", className: "bg-rose-100 text-rose-800 border-rose-200" },
};

const SOURCE_LABELS: Record<MatchSource, string> = {
  direct: "Item",
  group: "Groep",
  project: "Project",
};

export function ItemEmailLogPopover({ itemId, itemName, requestId }: ItemEmailLogPopoverProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState<DisplayEntry[]>([]);

  const fetchLogs = async () => {
    setLoading(true);
    const SELECT =
      "id, email_type, subject, recipient_email, recipient_name, status, sent_at, created_at, error_message, related_item_id, related_request_id, metadata";

    const queries: Promise<{ data: EmailLogEntry[] | null; source: MatchSource }>[] = [];

    // 1. Direct match on related_item_id
    queries.push(
      supabase
        .from("email_log")
        .select(SELECT)
        .eq("related_item_id", itemId)
        .order("created_at", { ascending: false })
        .limit(50)
        .then(({ data }) => ({ data: (data as EmailLogEntry[]) ?? null, source: "direct" as const })),
    );

    // 2. Group match: metadata.item_ids JSONB array contains itemId
    queries.push(
      supabase
        .from("email_log")
        .select(SELECT)
        .contains("metadata", { item_ids: [itemId] })
        .order("created_at", { ascending: false })
        .limit(50)
        .then(({ data }) => ({ data: (data as EmailLogEntry[]) ?? null, source: "group" as const })),
    );

    // 3. Project-level fallback: same request, only when item is unknown to the row
    if (requestId) {
      queries.push(
        supabase
          .from("email_log")
          .select(SELECT)
          .eq("related_request_id", requestId)
          .is("related_item_id", null)
          .order("created_at", { ascending: false })
          .limit(50)
          .then(({ data }) => ({ data: (data as EmailLogEntry[]) ?? null, source: "project" as const })),
      );
    }

    const results = await Promise.all(queries);
    const merged = new Map<string, DisplayEntry>();
    for (const { data, source } of results) {
      if (!data) continue;
      for (const row of data) {
        if (merged.has(row.id)) continue;
        merged.set(row.id, { ...row, matchSource: source });
      }
    }

    const sorted = Array.from(merged.values()).sort((a, b) => {
      const ta = new Date(a.sent_at || a.created_at).getTime();
      const tb = new Date(b.sent_at || b.created_at).getTime();
      return tb - ta;
    });
    setLogs(sorted);
    setLoading(false);
  };

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (next) fetchLogs();
  };

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:text-slate-900">
                <Mail className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
          </TooltipTrigger>
          <TooltipContent>Bekijk verzonden e-mails</TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <PopoverContent align="end" className="w-[380px] p-0">
        <div className="border-b px-3 py-2">
          <div className="text-xs font-semibold text-slate-700">E-mail log</div>
          {itemName && (
            <div className="text-xs text-slate-500 truncate">{itemName}</div>
          )}
        </div>
        <div className="max-h-[360px] overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-6 text-slate-400">
              <Loader2 className="h-4 w-4 animate-spin" />
            </div>
          ) : logs.length === 0 ? (
            <div className="px-3 py-6 text-center text-xs text-slate-500">
              Nog geen e-mails verzonden voor dit onderdeel.
            </div>
          ) : (
            <ul className="divide-y">
              {logs.map((log) => {
                const variant = STATUS_VARIANTS[log.status] ?? {
                  label: log.status,
                  className: "bg-slate-100 text-slate-700 border-slate-200",
                };
                const ts = log.sent_at || log.created_at;
                return (
                  <li key={log.id} className="px-3 py-2 text-xs space-y-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="font-medium text-slate-800 truncate">
                        {log.subject || log.email_type}
                      </div>
                      <Badge variant="outline" className={`shrink-0 text-[10px] ${variant.className}`}>
                        {variant.label}
                      </Badge>
                    </div>
                    <div className="text-slate-500 truncate">
                      → {log.recipient_name ? `${log.recipient_name} ` : ""}
                      &lt;{log.recipient_email}&gt;
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-slate-400">
                      <span>{log.email_type}</span>
                      <span>
                        {ts
                          ? format(new Date(ts), "d MMM yyyy HH:mm", { locale: nl })
                          : "-"}
                      </span>
                    </div>
                    {log.error_message && (
                      <div className="text-[10px] text-rose-600 truncate" title={log.error_message}>
                        {log.error_message}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
