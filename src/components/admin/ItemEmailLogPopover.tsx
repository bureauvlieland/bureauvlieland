import { useState } from "react";
import { Mail, Loader2, AlertTriangle, Wand2, ExternalLink, Download } from "lucide-react";
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
  delivered_at: string | null;
  opened_at: string | null;
  clicked_at: string | null;
  bounced_at: string | null;
  blocked_at: string | null;
  spam_at: string | null;
  unsub_at: string | null;
  open_count: number | null;
  click_count: number | null;
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
  sent: { label: "Verzonden", className: "bg-sky-100 text-sky-800 border-sky-200" },
  delivered: { label: "Afgeleverd", className: "bg-emerald-100 text-emerald-800 border-emerald-200" },
  opened: { label: "Geopend", className: "bg-violet-100 text-violet-800 border-violet-200" },
  clicked: { label: "Geklikt", className: "bg-indigo-100 text-indigo-800 border-indigo-200" },
  pending: { label: "In wachtrij", className: "bg-amber-100 text-amber-800 border-amber-200" },
  failed: { label: "Mislukt", className: "bg-rose-100 text-rose-800 border-rose-200" },
  bounced: { label: "Bounced", className: "bg-rose-100 text-rose-800 border-rose-200" },
  blocked: { label: "Geblokkeerd", className: "bg-rose-100 text-rose-800 border-rose-200" },
  spam: { label: "Als spam gemeld", className: "bg-rose-100 text-rose-800 border-rose-200" },
  unsubscribed: { label: "Uitgeschreven", className: "bg-slate-200 text-slate-800 border-slate-300" },
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

  const exportIncompleteToCsv = (rows: DisplayEntry[]) => {
    if (rows.length === 0) {
      toast.info("Geen incomplete entries om te exporteren");
      return;
    }
    const headers = [
      "id",
      "created_at",
      "sent_at",
      "email_type",
      "subject",
      "recipient_email",
      "recipient_name",
      "status",
      "sent_by",
      "mailjet_message_id",
      "missing_fields",
      "current_template_name",
      "current_actor",
      "related_item_id",
      "related_request_id",
      "error_message",
      "metadata_json",
      "match_source",
      "inferred_edge_function",
    ];
    const escape = (v: unknown): string => {
      if (v === null || v === undefined) return "";
      const s = typeof v === "string" ? v : JSON.stringify(v);
      if (/[",\n\r;]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
      return s;
    };
    const lines = [headers.join(",")];
    for (const r of rows) {
      const meta = (r.metadata ?? {}) as Record<string, unknown>;
      const missing = getMissingValidationFields(r.metadata);
      lines.push(
        [
          r.id,
          r.created_at,
          r.sent_at ?? "",
          r.email_type,
          r.subject,
          r.recipient_email,
          r.recipient_name ?? "",
          r.status,
          r.sent_by ?? "",
          r.mailjet_message_id ?? "",
          missing.join("|"),
          typeof meta.template_name === "string" ? meta.template_name : "",
          typeof meta.actor === "string" ? meta.actor : "",
          r.related_item_id ?? "",
          r.related_request_id ?? "",
          r.error_message ?? "",
          JSON.stringify(meta),
          r.matchSource,
          inferEdgeFunctionFromType(r.email_type),
        ]
          .map(escape)
          .join(","),
      );
    }
    // BOM for Excel UTF-8 detection
    const csv = "\uFEFF" + lines.join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    a.href = url;
    a.download = `email-log-incomplete-${stamp}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success(`${rows.length} entries geëxporteerd`);
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
                    <div className="mt-1.5 flex flex-wrap justify-end gap-1.5">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-6 gap-1 border-amber-300 bg-white px-2 text-[10px] text-amber-900 hover:bg-amber-100"
                        onClick={() => exportIncompleteToCsv(incomplete)}
                        title="Download incomplete entries als CSV (opent in Excel)"
                      >
                        <Download className="h-3 w-3" />
                        Export CSV
                      </Button>
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
                const incomplete = logs.filter(
                  (l) => getMissingValidationFields(l.metadata).length > 0,
                );
                if (incomplete.length === 0) return null;
                const byActor = new Map<string, number>();
                const byTemplate = new Map<string, number>();
                for (const l of incomplete) {
                  const meta = l.metadata ?? {};
                  const actor =
                    typeof meta.actor === "string" && meta.actor.trim() !== ""
                      ? meta.actor
                      : "— ontbreekt —";
                  const tmpl =
                    typeof meta.template_name === "string" && meta.template_name.trim() !== ""
                      ? meta.template_name
                      : `— ontbreekt — (${l.email_type})`;
                  byActor.set(actor, (byActor.get(actor) ?? 0) + 1);
                  byTemplate.set(tmpl, (byTemplate.get(tmpl) ?? 0) + 1);
                }
                const sortDesc = (m: Map<string, number>) =>
                  Array.from(m.entries()).sort((a, b) => b[1] - a[1]);
                const actors = sortDesc(byActor);
                const templates = sortDesc(byTemplate);
                return (
                  <div className="border-b bg-slate-50 px-3 py-2 text-[10px] text-slate-700 space-y-2">
                    <div>
                      <div className="mb-1 font-semibold text-slate-600">
                        Per actor ({actors.length})
                      </div>
                      <ul className="space-y-0.5">
                        {actors.slice(0, 6).map(([k, v]) => (
                          <li key={k} className="flex items-center justify-between gap-2">
                            <code className="truncate text-slate-700">{k}</code>
                            <span className="shrink-0 rounded bg-white px-1 text-slate-600">{v}</span>
                          </li>
                        ))}
                        {actors.length > 6 && (
                          <li className="text-slate-400">+{actors.length - 6} meer…</li>
                        )}
                      </ul>
                    </div>
                    <div>
                      <div className="mb-1 font-semibold text-slate-600">
                        Per template_name ({templates.length})
                      </div>
                      <ul className="space-y-0.5">
                        {templates.slice(0, 6).map(([k, v]) => (
                          <li key={k} className="flex items-center justify-between gap-2">
                            <code className="truncate text-slate-700">{k}</code>
                            <span className="shrink-0 rounded bg-white px-1 text-slate-600">{v}</span>
                          </li>
                        ))}
                        {templates.length > 6 && (
                          <li className="text-slate-400">+{templates.length - 6} meer…</li>
                        )}
                      </ul>
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
                      {missingFields.length > 0 && (
                        <div className="space-y-1">
                          <button
                            type="button"
                            onClick={() =>
                              setExpandedId((id) => (id === log.id ? null : log.id))
                            }
                            className="flex items-center gap-1 text-[10px] text-amber-700 underline-offset-2 hover:underline"
                            title="Toon ruwe payload + vermoedelijke edge function bron"
                          >
                            <ExternalLink className="h-3 w-3" />
                            {expandedId === log.id ? "Verberg bron" : "Bekijk bron van validatieprobleem"}
                          </button>
                          {expandedId === log.id && (
                            <div className="rounded border border-amber-200 bg-amber-50/60 p-2 text-[10px] text-slate-700 space-y-1">
                              <div>
                                <span className="font-semibold text-slate-600">Vermoedelijke edge function:</span>{" "}
                                <code className="rounded bg-white px-1 py-0.5 text-[10px] text-amber-900">
                                  {inferEdgeFunctionFromType(log.email_type)}
                                </code>
                              </div>
                              <div>
                                <span className="font-semibold text-slate-600">sent_by:</span>{" "}
                                <code>{log.sent_by ?? "—"}</code>
                              </div>
                              <div>
                                <span className="font-semibold text-slate-600">log id:</span>{" "}
                                <code className="break-all">{log.id}</code>
                              </div>
                              {log.mailjet_message_id && (
                                <div>
                                  <span className="font-semibold text-slate-600">mailjet:</span>{" "}
                                  <code className="break-all">{log.mailjet_message_id}</code>
                                </div>
                              )}
                              <div>
                                <span className="font-semibold text-slate-600">metadata (raw):</span>
                                <pre className="mt-0.5 max-h-32 overflow-auto rounded bg-white p-1 text-[10px] text-slate-700">
{JSON.stringify(log.metadata ?? {}, null, 2)}
                                </pre>
                              </div>
                              <div className="pt-1 text-[9px] text-slate-500">
                                Open de logs van bovengenoemde edge function in het backend-dashboard
                                en filter op deze log id of mailjet id om de exacte logEmail-aanroep
                                te vinden die de validatie miste.
                              </div>
                            </div>
                          )}
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
