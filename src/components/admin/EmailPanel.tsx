import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { formatDistanceToNow, format, isSameDay } from "date-fns";
import { nl } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  Mail,
  Reply,
  Archive,
  ArchiveRestore,
  ArrowLeft,
  FileText,
  BedDouble,
  ExternalLink,
  CheckCircle2,
} from "lucide-react";
import { SendProjectEmailSheet } from "@/components/admin/SendProjectEmailSheet";

interface EmailRow {
  id: string;
  subject: string | null;
  content: string;
  contact_name: string | null;
  contact_email: string | null;
  communication_date: string;
  direction: string;
  answered_at: string | null;
  archived_at: string | null;
  request_id: string | null;
  accommodation_id: string | null;
  request?: { reference_number: string | null; customer_name: string | null; archived_at?: string | null } | null;
  accommodation?: { reference_number: string | null; customer_name: string | null; archived_at?: string | null } | null;
}

interface ThreadGroup {
  key: string;
  kind: "program" | "accommodation" | "contact";
  id: string | null;
  label: string;
  contactName: string | null;
  contactEmail: string | null;
  emails: EmailRow[];
  unread: number;
  lastAt: string;
  projectArchived: boolean;
}

async function fetchEmails(showArchived: boolean): Promise<EmailRow[]> {
  const sinceIso = new Date(Date.now() - 90 * 86400000).toISOString();
  let query = supabase
    .from("project_communications")
    .select(
      `id, subject, content, contact_name, contact_email, communication_date, direction,
       answered_at, archived_at, request_id, accommodation_id,
       request:program_requests(reference_number, customer_name, archived_at),
       accommodation:accommodation_requests(reference_number, customer_name, archived_at)`,
    )
    .in("communication_type", ["email"])
    .gte("communication_date", sinceIso)
    .order("communication_date", { ascending: false })
    .limit(400);

  if (!showArchived) {
    query = query.is("archived_at", null);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as unknown as EmailRow[];
}

function buildGroups(rows: EmailRow[], showArchived: boolean): ThreadGroup[] {
  const groups = new Map<string, ThreadGroup>();
  for (const e of rows) {
    let key: string;
    let kind: ThreadGroup["kind"];
    let id: string | null;
    let label: string;
    let projectArchived = false;

    if (e.request_id) {
      key = `p:${e.request_id}`;
      kind = "program";
      id = e.request_id;
      label = [e.request?.reference_number, e.request?.customer_name].filter(Boolean).join(" · ") || "Programma";
      projectArchived = !!e.request?.archived_at;
    } else if (e.accommodation_id) {
      key = `a:${e.accommodation_id}`;
      kind = "accommodation";
      id = e.accommodation_id;
      label =
        [e.accommodation?.reference_number, e.accommodation?.customer_name].filter(Boolean).join(" · ") ||
        "Logies";
      projectArchived = !!e.accommodation?.archived_at;
    } else {
      const ce = (e.contact_email || "onbekend").toLowerCase();
      key = `c:${ce}`;
      kind = "contact";
      id = null;
      label = e.contact_name ? `${e.contact_name} (${ce})` : ce;
    }

    if (!showArchived && projectArchived) continue;

    const isUnread = e.direction === "inbound" && !e.answered_at && !e.archived_at;
    const g = groups.get(key);
    if (g) {
      g.emails.push(e);
      if (isUnread) g.unread += 1;
      if (e.communication_date > g.lastAt) g.lastAt = e.communication_date;
    } else {
      groups.set(key, {
        key,
        kind,
        id,
        label,
        contactName: e.contact_name,
        contactEmail: e.contact_email,
        emails: [e],
        unread: isUnread ? 1 : 0,
        lastAt: e.communication_date,
        projectArchived,
      });
    }
  }

  return Array.from(groups.values())
    .map((g) => ({
      ...g,
      emails: g.emails.slice().sort((a, b) => a.communication_date.localeCompare(b.communication_date)),
    }))
    .sort((a, b) => {
      if ((a.unread > 0) !== (b.unread > 0)) return a.unread > 0 ? -1 : 1;
      if (a.unread !== b.unread) return b.unread - a.unread;
      return b.lastAt.localeCompare(a.lastAt);
    });
}

interface EmailPanelProps {
  initialOpenId?: string | null;
  heightClassName?: string;
}

export function EmailPanel({ initialOpenId, heightClassName = "h-[calc(100vh-220px)]" }: EmailPanelProps) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [showArchived, setShowArchived] = useState(false);
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [replyOpen, setReplyOpen] = useState(false);
  const [replyContext, setReplyContext] = useState<{
    requestId?: string;
    accommodationId?: string;
    recipients: { label: string; email: string; name: string; type: "customer" | "partner" }[];
    initialSubject?: string;
  } | null>(null);

  const { data: rows = [], isLoading, refetch } = useQuery({
    queryKey: ["admin-email-threads", showArchived],
    queryFn: () => fetchEmails(showArchived),
    refetchInterval: 60_000,
  });

  const groups = useMemo(() => buildGroups(rows, showArchived), [rows, showArchived]);

  // Pin email on first load if provided
  useEffect(() => {
    if (!initialOpenId || activeKey) return;
    const row = rows.find((r) => r.id === initialOpenId);
    if (!row) return;
    if (row.request_id) setActiveKey(`p:${row.request_id}`);
    else if (row.accommodation_id) setActiveKey(`a:${row.accommodation_id}`);
    else if (row.contact_email) setActiveKey(`c:${row.contact_email.toLowerCase()}`);
  }, [initialOpenId, rows, activeKey]);

  const activeGroup = groups.find((g) => g.key === activeKey) || null;

  const markAnswered = async (id: string) => {
    const { error } = await supabase
      .from("project_communications")
      .update({ answered_at: new Date().toISOString() })
      .eq("id", id);
    if (error) toast.error("Kon niet markeren als beantwoord");
    else {
      queryClient.invalidateQueries({ queryKey: ["admin-email-threads"] });
      queryClient.invalidateQueries({ queryKey: ["admin-inbox"] });
    }
  };

  const archiveEmail = async (id: string, archived = true) => {
    const { error } = await supabase
      .from("project_communications")
      .update({ archived_at: archived ? new Date().toISOString() : null })
      .eq("id", id);
    if (error) toast.error("Archiveren mislukt");
    else {
      toast.success(archived ? "E-mail gearchiveerd" : "E-mail teruggehaald");
      refetch();
      queryClient.invalidateQueries({ queryKey: ["admin-inbox"] });
    }
  };

  const archiveThread = async (group: ThreadGroup, archived = true) => {
    if (group.kind === "program" && group.id) {
      const { error } = await supabase
        .from("program_requests")
        .update({ archived_at: archived ? new Date().toISOString() : null })
        .eq("id", group.id);
      if (error) return toast.error("Archiveren mislukt");
    } else if (group.kind === "accommodation" && group.id) {
      const { error } = await supabase
        .from("accommodation_requests")
        .update({ archived_at: archived ? new Date().toISOString() : null })
        .eq("id", group.id);
      if (error) return toast.error("Archiveren mislukt");
    } else {
      // contact-only: archive elke individuele e-mail
      const ids = group.emails.map((e) => e.id);
      const { error } = await supabase
        .from("project_communications")
        .update({ archived_at: archived ? new Date().toISOString() : null })
        .in("id", ids);
      if (error) return toast.error("Archiveren mislukt");
    }
    toast.success(archived ? "Conversatie gearchiveerd" : "Conversatie teruggehaald");
    if (archived) setActiveKey(null);
    refetch();
    queryClient.invalidateQueries({ queryKey: ["admin-inbox"] });
  };

  const openReply = (group: ThreadGroup, lastInbound?: EmailRow) => {
    const recipients = lastInbound?.contact_email
      ? [
          {
            label: lastInbound.contact_name || lastInbound.contact_email,
            email: lastInbound.contact_email,
            name: lastInbound.contact_name || lastInbound.contact_email,
            type: "customer" as const,
          },
        ]
      : [];
    const subj = lastInbound?.subject ?? group.emails[group.emails.length - 1]?.subject ?? null;
    setReplyContext({
      requestId: group.kind === "program" ? group.id ?? undefined : undefined,
      accommodationId: group.kind === "accommodation" ? group.id ?? undefined : undefined,
      recipients,
      initialSubject: subj ? (subj.toLowerCase().startsWith("re:") ? subj : `Re: ${subj}`) : undefined,
    });
    setReplyOpen(true);
  };

  return (
    <div className={cn(heightClassName, "flex border rounded-lg overflow-hidden bg-white")}>
      {/* List */}
      <div
        className={cn(
          "w-full lg:w-96 border-r bg-white flex-col",
          activeKey ? "hidden lg:flex" : "flex",
        )}
      >
        <div className="p-3 border-b space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">E-mailgesprekken</h2>
            <Badge variant="outline" className="text-xs">{groups.length}</Badge>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground flex items-center gap-1">
              <Archive className="h-3 w-3" /> Toon archief
            </span>
            <Switch checked={showArchived} onCheckedChange={setShowArchived} />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="p-3 space-y-2">
              {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}
            </div>
          ) : groups.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground text-sm">
              <Mail className="h-8 w-8 mx-auto mb-2 opacity-40" />
              Geen e-mailgesprekken
            </div>
          ) : (
            groups.map((g) => {
              const isActive = g.key === activeKey;
              const last = g.emails[g.emails.length - 1];
              return (
                <button
                  key={g.key}
                  type="button"
                  onClick={() => setActiveKey(g.key)}
                  className={cn(
                    "w-full text-left px-3 py-2.5 border-b hover:bg-slate-50 transition-colors",
                    isActive && "bg-primary/5",
                    g.unread > 0 && !isActive && "bg-rose-50/40",
                  )}
                >
                  <div className="flex items-center gap-2 mb-0.5">
                    {g.kind === "program" ? (
                      <FileText className="h-3.5 w-3.5 text-slate-500 flex-shrink-0" />
                    ) : g.kind === "accommodation" ? (
                      <BedDouble className="h-3.5 w-3.5 text-amber-700 flex-shrink-0" />
                    ) : (
                      <Mail className="h-3.5 w-3.5 text-slate-500 flex-shrink-0" />
                    )}
                    <span className={cn("text-xs font-medium truncate flex-1", g.unread > 0 && "font-semibold")}>
                      {g.label}
                    </span>
                    {g.unread > 0 && (
                      <Badge variant="destructive" className="h-4 px-1.5 text-[10px]">
                        {g.unread} nieuw
                      </Badge>
                    )}
                  </div>
                  <p className={cn("text-xs text-slate-700 truncate", g.unread > 0 && "font-medium")}>
                    {last?.subject || "(geen onderwerp)"}
                  </p>
                  <p className="text-[11px] text-slate-500 truncate">
                    {last?.direction === "inbound" ? "↓ " : "↑ "}
                    {last?.contact_name || last?.contact_email || "Onbekend"} ·{" "}
                    {formatDistanceToNow(new Date(g.lastAt), { addSuffix: true, locale: nl })}
                  </p>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Thread view */}
      <div className={cn("flex-1 flex-col bg-slate-50", activeGroup ? "flex" : "hidden lg:flex")}>
        {!activeGroup ? (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <Mail className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm">Selecteer een gesprek</p>
            </div>
          </div>
        ) : (
          <>
            <div className="px-4 py-3 bg-white border-b flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <Button
                  variant="ghost"
                  size="icon"
                  className="lg:hidden h-8 w-8 flex-shrink-0"
                  onClick={() => setActiveKey(null)}
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <div className="min-w-0">
                  <p className="font-medium text-sm truncate">{activeGroup.label}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {activeGroup.emails.length} bericht{activeGroup.emails.length === 1 ? "" : "en"}
                    {activeGroup.projectArchived && " · gearchiveerd dossier"}
                  </p>
                </div>
                {activeGroup.kind === "program" && activeGroup.id && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate(`/admin/aanvragen/${activeGroup.id}`)}
                  >
                    <ExternalLink className="h-3.5 w-3.5 mr-1" /> Project
                  </Button>
                )}
                {activeGroup.kind === "accommodation" && activeGroup.id && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate(`/admin/logies/${activeGroup.id}`)}
                  >
                    <ExternalLink className="h-3.5 w-3.5 mr-1" /> Logies
                  </Button>
                )}
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <Button
                  size="sm"
                  onClick={() => {
                    const lastInbound = [...activeGroup.emails].reverse().find((e) => e.direction === "inbound");
                    openReply(activeGroup, lastInbound);
                  }}
                >
                  <Reply className="h-4 w-4 mr-1" /> Beantwoorden
                </Button>
                {activeGroup.projectArchived || activeGroup.kind === "contact" ? (
                  <Button variant="ghost" size="sm" onClick={() => archiveThread(activeGroup, false)}>
                    <ArchiveRestore className="h-4 w-4 mr-1" /> Uit archief
                  </Button>
                ) : (
                  <Button variant="ghost" size="sm" onClick={() => archiveThread(activeGroup, true)}>
                    <Archive className="h-4 w-4 mr-1" /> Archiveer
                  </Button>
                )}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {activeGroup.emails.map((email, idx) => {
                const prev = idx > 0 ? activeGroup.emails[idx - 1] : null;
                const showDate =
                  !prev || !isSameDay(new Date(email.communication_date), new Date(prev.communication_date));
                const isInbound = email.direction === "inbound";
                return (
                  <div key={email.id}>
                    {showDate && (
                      <div className="flex items-center gap-3 my-3">
                        <div className="flex-1 h-px bg-border" />
                        <span className="text-[11px] uppercase tracking-wide text-muted-foreground">
                          {format(new Date(email.communication_date), "EEEE d MMMM yyyy", { locale: nl })}
                        </span>
                        <div className="flex-1 h-px bg-border" />
                      </div>
                    )}
                    <div
                      className={cn(
                        "rounded-lg border p-3 bg-white shadow-sm",
                        isInbound ? "border-l-4 border-l-primary" : "border-l-4 border-l-emerald-500 bg-emerald-50/30",
                      )}
                    >
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <div className="min-w-0">
                          <p className="text-xs font-medium truncate">
                            {isInbound ? "↓" : "↑"}{" "}
                            {email.contact_name || email.contact_email || "Onbekend"}
                          </p>
                          <p className="text-sm font-semibold truncate">{email.subject || "(geen onderwerp)"}</p>
                        </div>
                        <div className="text-[11px] text-muted-foreground whitespace-nowrap">
                          {format(new Date(email.communication_date), "d MMM HH:mm", { locale: nl })}
                        </div>
                      </div>
                      <div className="text-sm whitespace-pre-wrap text-slate-700 max-h-64 overflow-y-auto">
                        {email.content}
                      </div>
                      <div className="flex items-center gap-1 mt-2">
                        {isInbound && !email.answered_at && (
                          <Button variant="ghost" size="sm" onClick={() => markAnswered(email.id)}>
                            <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Markeer als beantwoord
                          </Button>
                        )}
                        {email.archived_at ? (
                          <Button variant="ghost" size="sm" onClick={() => archiveEmail(email.id, false)}>
                            <ArchiveRestore className="h-3.5 w-3.5 mr-1" /> Uit archief
                          </Button>
                        ) : (
                          <Button variant="ghost" size="sm" onClick={() => archiveEmail(email.id, true)}>
                            <Archive className="h-3.5 w-3.5 mr-1" /> Archiveer bericht
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {replyContext && (
        <SendProjectEmailSheet
          open={replyOpen}
          onOpenChange={(o) => {
            setReplyOpen(o);
            if (!o) {
              refetch();
              queryClient.invalidateQueries({ queryKey: ["admin-inbox"] });
            }
          }}
          requestId={replyContext.requestId}
          accommodationId={replyContext.accommodationId}
          recipients={replyContext.recipients}
          initialSubject={replyContext.initialSubject}
        />
      )}
    </div>
  );
}
