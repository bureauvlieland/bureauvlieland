import { useState } from "react";
import { Mail, Loader2, AlertTriangle, Wand2 } from "lucide-react";
import { toast } from "sonner";
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
  sent_by: string | null;
  mailjet_message_id: string | null;
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

function getMissingValidationFields(
  meta: Record<string, unknown> | null,
): string[] {
  const missing: string[] = [];
  const tmpl = meta?.template_name;
  const actor = meta?.actor;
  if (typeof tmpl !== "string" || tmpl.trim() === "") missing.push("template_name");
  if (typeof actor !== "string" || actor.trim() === "") missing.push("actor");
  return missing;
}

export function ItemEmailLogPopover({ itemId, itemName, requestId }: ItemEmailLogPopoverProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState<DisplayEntry[]>([]);
  const [repairing, setRepairing] = useState<string | "all" | null>(null);
  const [onlyIncomplete, setOnlyIncomplete] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const inferEdgeFunctionFromType = (emailType: string): string => {
    // Heuristiek: email_type → vermoedelijke edge function naam
    const t = emailType.toLowerCase().replace(/_/g, "-");
    if (t.startsWith("send-") || t.startsWith("notify-") || t.startsWith("resend-")) return t;
    return `send-${t}`;
  };

  const repairMetadata = async (ids: string[], scope: string | "all") => {
    if (ids.length === 0) return;
    setRepairing(scope);
    try {
      const { data, error } = await supabase.functions.invoke(
        "backfill-email-log-metadata",
        { body: { ids } },
      );
      if (error) throw error;
      const updated = (data?.results ?? []).filter(
        (r: { updated: boolean }) => r.updated,
      ).length;
      toast.success(
        updated > 0
          ? `${updated} log-entry${updated === 1 ? "" : "s"} aangevuld`
          : "Geen entries aangepast",
      );
      await fetchLogs();
    } catch (e) {
      toast.error(`Aanvullen mislukt: ${(e as Error).message}`);
    } finally {
      setRepairing(null);
    }
  };


  const fetchLogs = async () => {
    setLoading(true);
    const SELECT =
      "id, email_type, subject, recipient_email, recipient_name, status, sent_at, created_at, error_message, related_item_id, related_request_id, metadata, sent_by, mailjet_message_id";

    const queries: Array<Promise<{ data: EmailLogEntry[] | null; source: MatchSource }>> = [];

    queries.push(
      (async () => {
        const { data } = await supabase
          .from("email_log")
          .select(SELECT)
          .eq("related_item_id", itemId)
          .order("created_at", { ascending: false })
          .limit(50);
        return { data: (data as EmailLogEntry[]) ?? null, source: "direct" as MatchSource };
      })(),
    );

    queries.push(
      (async () => {
        const { data } = await supabase
          .from("email_log")
          .select(SELECT)
          .contains("metadata", { item_ids: [itemId] })
          .order("created_at", { ascending: false })
          .limit(50);
        return { data: (data as EmailLogEntry[]) ?? null, source: "group" as MatchSource };
      })(),
    );

    if (requestId) {
      queries.push(
        (async () => {
          const { data } = await supabase
            .from("email_log")
            .select(SELECT)
            .eq("related_request_id", requestId)
            .is("related_item_id", null)
            .order("created_at", { ascending: false })
            .limit(50);
          return { data: (data as EmailLogEntry[]) ?? null, source: "project" as MatchSource };
        })(),
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
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <div className="text-xs font-semibold text-slate-700">E-mail log</div>
              {itemName && (
                <div className="text-xs text-slate-500 truncate">{itemName}</div>
              )}
            </div>
            {logs.some((l) => getMissingValidationFields(l.metadata).length > 0) && (
              <button
                type="button"
                onClick={() => setOnlyIncomplete((v) => !v)}
                className={`shrink-0 rounded border px-1.5 py-0.5 text-[10px] transition-colors ${
                  onlyIncomplete
                    ? "border-amber-300 bg-amber-100 text-amber-900"
                    : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                }`}
                title="Toon alleen entries met ontbrekende template_name/actor"
              >
                {onlyIncomplete ? "Toon alles" : "Alleen onvolledig"}
              </button>
            )}
          </div>
        </div>
        <div className="max-h-[360px] overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-6 text-slate-400">
              <Loader2 className="h-4 w-4 animate-spin" />
            </div>
          ) : logs.length === 0 ? (
            <div className="px-3 py-6 space-y-2 text-center text-xs text-slate-500">
              <div>Nog geen e-mails verzonden voor dit onderdeel.</div>
              <div className="flex items-start gap-1.5 rounded border border-amber-200 bg-amber-50 px-2 py-1.5 text-left text-[10px] text-amber-800">
                <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
                <span>
                  Let op: e-mails zonder geldige <code>template_name</code> en{" "}
                  <code>actor</code> worden door de validatie geweigerd en
                  verschijnen daarom niet in deze lijst. Controleer de
                  edge-function-logs als je een ontbrekende mail verwacht.
                </span>
              </div>
            </div>
          ) : (
            <>
              {(() => {
                const incomplete = logs.filter(
                  (l) => getMissingValidationFields(l.metadata).length > 0,
                );
                if (incomplete.length === 0) return null;
                const incompleteIds = incomplete.map((l) => l.id);
                return (
                  <div className="border-b border-amber-200 bg-amber-50 px-3 py-2 text-[10px] text-amber-800">
                    <div className="flex items-start gap-1.5">
                      <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
                      <span>
                        {incomplete.length} log-entry
                        {incomplete.length === 1 ? "" : "s"} mist verplichte
                        velden (template_name/actor) — vermoedelijk ouder dan de
                        validatie. Nieuwe sends worden geweigerd tot deze velden
                        zijn meegegeven.
                      </span>
                    </div>
                    <div className="mt-1.5 flex justify-end">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-6 gap-1 border-amber-300 bg-white px-2 text-[10px] text-amber-900 hover:bg-amber-100"
                        disabled={repairing !== null}
                        onClick={() => repairMetadata(incompleteIds, "all")}
                      >
                        {repairing === "all" ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Wand2 className="h-3 w-3" />
                        )}
                        Vul alle {incomplete.length} aan
                      </Button>
                    </div>
                  </div>
                );
              })()}

              {(() => {
                const visible = onlyIncomplete
                  ? logs.filter((l) => getMissingValidationFields(l.metadata).length > 0)
                  : logs;
                if (visible.length === 0) {
                  return (
                    <div className="px-3 py-6 text-center text-xs text-slate-500">
                      Geen entries met ontbrekende metadata.
                    </div>
                  );
                }
                return (
                  <ul className="divide-y">
                    {visible.map((log) => {
                  const variant = STATUS_VARIANTS[log.status] ?? {
                    label: log.status,
                    className: "bg-slate-100 text-slate-700 border-slate-200",
                  };
                  const ts = log.sent_at || log.created_at;
                  const missingFields = getMissingValidationFields(log.metadata);
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
                        <span className="flex items-center gap-1.5">
                          <span>{log.email_type}</span>
                          <span className="rounded bg-slate-100 px-1 text-slate-500" title={`Match via ${log.matchSource}`}>
                            {SOURCE_LABELS[log.matchSource]}
                          </span>
                        </span>
                        <span>
                          {ts
                            ? format(new Date(ts), "d MMM yyyy HH:mm", { locale: nl })
                            : "-"}
                        </span>
                      </div>
                      {missingFields.length > 0 && (
                        <div className="flex items-center justify-between gap-2 text-[10px] text-amber-700">
                          <div
                            className="flex items-center gap-1"
                            title={`Ontbrekende metadata: ${missingFields.join(", ")}. Deze entry voldoet niet aan de huidige validatie en zou nu geweigerd worden.`}
                          >
                            <AlertTriangle className="h-3 w-3" />
                            <span>
                              Onvolledige metadata ({missingFields.join(", ")})
                            </span>
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-5 gap-1 px-1.5 text-[10px] text-amber-800 hover:bg-amber-100"
                            disabled={repairing !== null}
                            onClick={() => repairMetadata([log.id], log.id)}
                            title="Vul template_name en actor automatisch aan op basis van email_type en sent_by"
                          >
                            {repairing === log.id ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <Wand2 className="h-3 w-3" />
                            )}
                            Aanvullen
                          </Button>
                        </div>
                      )}
                      {log.error_message && (
                        <div className="text-[10px] text-rose-600 truncate" title={log.error_message}>
                          {log.error_message}
                        </div>
                      )}
                    </li>
                  );
                    })}
                  </ul>
                );
              })()}
            </>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
