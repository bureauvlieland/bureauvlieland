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
  Bot,
  User,
  Inbox,
} from "lucide-react";
import { SendProjectEmailSheet } from "@/components/admin/SendProjectEmailSheet";

type Origin = "inbound" | "manual" | "automatic";

interface EmailItem {
  id: string;
  source: "communication" | "email_log";
  origin: Origin;
  subject: string | null;
  content: string;
  contact_name: string | null;
  contact_email: string | null;
  date: string;
  answered_at: string | null;
  archived_at: string | null;
  request_id: string | null;
  accommodation_id: string | null;
  request_ref?: string | null;
  request_customer?: string | null;
  request_archived?: string | null;
  accommodation_ref?: string | null;
  accommodation_customer?: string | null;
  accommodation_archived?: string | null;
  email_type?: string | null;
  status?: string | null;
}

interface ThreadGroup {
  key: string;
  kind: "program" | "accommodation" | "contact";
  id: string | null;
  label: string;
  contactName: string | null;
  contactEmail: string | null;
  items: EmailItem[];
  unread: number;
  inboundCount: number;
  manualCount: number;
  automaticCount: number;
  lastAt: string;
  projectArchived: boolean;
}

const ORIGIN_LABEL: Record<Origin, string> = {
  inbound: "Inkomend",
  manual: "Handmatig",
  automatic: "Automatisch",
};

const ORIGIN_BADGE_CLASS: Record<Origin, string> = {
  inbound: "bg-primary/10 text-primary border-primary/30",
  manual: "bg-emerald-100 text-emerald-800 border-emerald-300",
  automatic: "bg-slate-100 text-slate-700 border-slate-300",
};

function stripHtml(html: string): string {
  if (!html) return "";
  const noTags = html.replace(/<style[\s\S]*?<\/style>/gi, "").replace(/<[^>]+>/g, " ");
  return noTags.replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/\s+/g, " ").trim();
}

async function fetchEmails(showArchived: boolean): Promise<EmailItem[]> {
  const sinceIso = new Date(Date.now() - 90 * 86400000).toISOString();

  // 1) project_communications: alle e-mail types
  let commQuery = supabase
    .from("project_communications")
    .select(
      `id, subject, content, contact_name, contact_email, communication_date, direction, communication_type,
       answered_at, archived_at, request_id, accommodation_id,
       request:program_requests(reference_number, customer_name, archived_at),
       accommodation:accommodation_requests(reference_number, customer_name, archived_at)`,
    )
    .in("communication_type", ["email", "email_in", "email_out"])
    .gte("communication_date", sinceIso)
    .order("communication_date", { ascending: false })
    .limit(500);
  if (!showArchived) commQuery = commQuery.is("archived_at", null);

  // 2) email_log: alleen succesvol verzonden + met project-koppeling
  const logQuery = supabase
    .from("email_log")
    .select(
      "id, email_type, subject, recipient_email, recipient_name, related_request_id, related_accommodation_id, status, created_at, sent_at",
    )
    .gte("created_at", sinceIso)
    .in("status", ["sent", "delivered", "opened", "clicked"])
    .or("related_request_id.not.is.null,related_accommodation_id.not.is.null")
    .order("created_at", { ascending: false })
    .limit(800);

  const [commRes, logRes] = await Promise.all([commQuery, logQuery]);
  if (commRes.error) throw commRes.error;
  if (logRes.error) throw logRes.error;

  const commItems: EmailItem[] = (commRes.data ?? []).map((e: any) => ({
    id: `c:${e.id}`,
    source: "communication",
    origin: e.direction === "inbound" ? "inbound" : "manual",
    subject: e.subject,
    content: e.content,
    contact_name: e.contact_name,
    contact_email: e.contact_email,
    date: e.communication_date,
    answered_at: e.answered_at,
    archived_at: e.archived_at,
    request_id: e.request_id,
    accommodation_id: e.accommodation_id,
    request_ref: e.request?.reference_number ?? null,
    request_customer: e.request?.customer_name ?? null,
    request_archived: e.request?.archived_at ?? null,
    accommodation_ref: e.accommodation?.reference_number ?? null,
    accommodation_customer: e.accommodation?.customer_name ?? null,
    accommodation_archived: e.accommodation?.archived_at ?? null,
  }));

  // Resolve refs voor email_log rows
  const logRows = logRes.data ?? [];
  const progIds = Array.from(
    new Set(logRows.map((r: any) => r.related_request_id).filter(Boolean)),
  ) as string[];
  const accIds = Array.from(
    new Set(logRows.map((r: any) => r.related_accommodation_id).filter(Boolean)),
  ) as string[];

  const [progsRes, accsRes] = await Promise.all([
    progIds.length
      ? supabase.from("program_requests").select("id, reference_number, customer_name, archived_at").in("id", progIds)
      : Promise.resolve({ data: [] as any[] }),
    accIds.length
      ? supabase
          .from("accommodation_requests")
          .select("id, reference_number, customer_name, archived_at")
          .in("id", accIds)
      : Promise.resolve({ data: [] as any[] }),
  ]);
  const progMap = new Map<string, any>((progsRes.data ?? []).map((p: any) => [p.id, p]));
  const accMap = new Map<string, any>((accsRes.data ?? []).map((a: any) => [a.id, a]));

  // admin_project_email = handmatig vanuit project (dupliceert vaak met project_communications)
  // We tonen email_log alleen voor automatische templates om dubbel niet te tonen.
  const logItems: EmailItem[] = logRows
    .filter((r: any) => r.email_type && r.email_type !== "admin_project_email")
    .map((r: any) => {
      const prog = r.related_request_id ? progMap.get(r.related_request_id) : null;
      const acc = r.related_accommodation_id ? accMap.get(r.related_accommodation_id) : null;
      return {
        id: `l:${r.id}`,
        source: "email_log" as const,
        origin: "automatic" as const,
        subject: r.subject,
        content: `Automatisch verstuurd: ${r.email_type}\nNaar: ${r.recipient_name || r.recipient_email}`,
        contact_name: r.recipient_name,
        contact_email: r.recipient_email,
        date: r.sent_at || r.created_at,
        answered_at: null,
        archived_at: null,
        request_id: r.related_request_id,
        accommodation_id: r.related_accommodation_id,
        request_ref: prog?.reference_number ?? null,
        request_customer: prog?.customer_name ?? null,
        request_archived: prog?.archived_at ?? null,
        accommodation_ref: acc?.reference_number ?? null,
        accommodation_customer: acc?.customer_name ?? null,
        accommodation_archived: acc?.archived_at ?? null,
        email_type: r.email_type,
        status: r.status,
      };
    });

  return [...commItems, ...logItems];
}

function buildGroups(items: EmailItem[], showArchived: boolean, originFilter: Origin | "all"): ThreadGroup[] {
  const groups = new Map<string, ThreadGroup>();
  for (const e of items) {
    if (originFilter !== "all" && e.origin !== originFilter) continue;

    let key: string;
    let kind: ThreadGroup["kind"];
    let id: string | null;
    let label: string;
    let projectArchived = false;

    if (e.request_id) {
      key = `p:${e.request_id}`;
      kind = "program";
      id = e.request_id;
      label = [e.request_ref, e.request_customer].filter(Boolean).join(" · ") || "Programma";
      projectArchived = !!e.request_archived;
    } else if (e.accommodation_id) {
      key = `a:${e.accommodation_id}`;
      kind = "accommodation";
      id = e.accommodation_id;
      label = [e.accommodation_ref, e.accommodation_customer].filter(Boolean).join(" · ") || "Logies";
      projectArchived = !!e.accommodation_archived;
    } else {
      const ce = (e.contact_email || "onbekend").toLowerCase();
      key = `c:${ce}`;
      kind = "contact";
      id = null;
      label = e.contact_name ? `${e.contact_name} (${ce})` : ce;
    }

    if (!showArchived && projectArchived) continue;

    const isUnread = e.origin === "inbound" && !e.answered_at && !e.archived_at;
    const g = groups.get(key);
    if (g) {
      g.items.push(e);
      if (isUnread) g.unread += 1;
      if (e.origin === "inbound") g.inboundCount += 1;
      else if (e.origin === "manual") g.manualCount += 1;
      else g.automaticCount += 1;
      if (e.date > g.lastAt) g.lastAt = e.date;
    } else {
      groups.set(key, {
        key,
        kind,
        id,
        label,
        contactName: e.contact_name,
        contactEmail: e.contact_email,
        items: [e],
        unread: isUnread ? 1 : 0,
        inboundCount: e.origin === "inbound" ? 1 : 0,
        manualCount: e.origin === "manual" ? 1 : 0,
        automaticCount: e.origin === "automatic" ? 1 : 0,
        lastAt: e.date,
        projectArchived,
      });
    }
  }

  return Array.from(groups.values())
    .map((g) => ({
      ...g,
      items: g.items.slice().sort((a, b) => (a.date || "").localeCompare(b.date || "")),
    }))
    .sort((a, b) => {
      if ((a.unread > 0) !== (b.unread > 0)) return a.unread > 0 ? -1 : 1;
      return (b.lastAt || "").localeCompare(a.lastAt || "");
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
  const [originFilter, setOriginFilter] = useState<Origin | "all">("all");
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [replyOpen, setReplyOpen] = useState(false);
  const [replyContext, setReplyContext] = useState<{
    requestId?: string;
    accommodationId?: string;
    recipients: { label: string; email: string; name: string; type: "customer" | "partner" }[];
    initialSubject?: string;
  } | null>(null);

  const { data: items = [], isLoading, refetch } = useQuery({
    queryKey: ["admin-email-threads", showArchived],
    queryFn: () => fetchEmails(showArchived),
    refetchInterval: 60_000,
  });

  const groups = useMemo(() => buildGroups(items, showArchived, originFilter), [items, showArchived, originFilter]);

  useEffect(() => {
    if (!initialOpenId || activeKey) return;
    const row = items.find((r) => r.id === `c:${initialOpenId}` || r.id === initialOpenId);
    if (!row) return;
    if (row.request_id) setActiveKey(`p:${row.request_id}`);
    else if (row.accommodation_id) setActiveKey(`a:${row.accommodation_id}`);
    else if (row.contact_email) setActiveKey(`c:${row.contact_email.toLowerCase()}`);
  }, [initialOpenId, items, activeKey]);

  const activeGroup = groups.find((g) => g.key === activeKey) || null;

  const stripPrefix = (id: string) => id.replace(/^[cl]:/, "");

  const markAnswered = async (item: EmailItem) => {
    if (item.source !== "communication") return;
    const { error } = await supabase
      .from("project_communications")
      .update({ answered_at: new Date().toISOString() })
      .eq("id", stripPrefix(item.id));
    if (error) toast.error("Kon niet markeren als beantwoord");
    else {
      queryClient.invalidateQueries({ queryKey: ["admin-email-threads"] });
      queryClient.invalidateQueries({ queryKey: ["admin-inbox"] });
    }
  };

  const archiveItem = async (item: EmailItem, archived = true) => {
    if (item.source !== "communication") {
      toast.info("Automatische mails worden meegearchiveerd met het project.");
      return;
    }
    const { error } = await supabase
      .from("project_communications")
      .update({ archived_at: archived ? new Date().toISOString() : null })
      .eq("id", stripPrefix(item.id));
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
      const ids = group.items.filter((e) => e.source === "communication").map((e) => stripPrefix(e.id));
      if (ids.length) {
        const { error } = await supabase
          .from("project_communications")
          .update({ archived_at: archived ? new Date().toISOString() : null })
          .in("id", ids);
        if (error) return toast.error("Archiveren mislukt");
      }
    }
    toast.success(archived ? "Conversatie gearchiveerd" : "Conversatie teruggehaald");
    if (archived) setActiveKey(null);
    refetch();
    queryClient.invalidateQueries({ queryKey: ["admin-inbox"] });
  };

  const openReply = (group: ThreadGroup, lastInbound?: EmailItem) => {
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
    const subj = lastInbound?.subject ?? group.items[group.items.length - 1]?.subject ?? null;
    setReplyContext({
      requestId: group.kind === "program" ? group.id ?? undefined : undefined,
      accommodationId: group.kind === "accommodation" ? group.id ?? undefined : undefined,
      recipients,
      initialSubject: subj ? (subj.toLowerCase().startsWith("re:") ? subj : `Re: ${subj}`) : undefined,
    });
    setReplyOpen(true);
  };

  const filterChips: { key: Origin | "all"; label: string }[] = [
    { key: "all", label: "Alles" },
    { key: "inbound", label: "Inkomend" },
    { key: "manual", label: "Handmatig" },
    { key: "automatic", label: "Automatisch" },
  ];

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
          <div className="flex flex-wrap gap-1">
            {filterChips.map((c) => (
              <button
                key={c.key}
                type="button"
                onClick={() => setOriginFilter(c.key)}
                className={cn(
                  "px-2 py-0.5 rounded-full text-[11px] border transition-colors",
                  originFilter === c.key
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50",
                )}
              >
                {c.label}
              </button>
            ))}
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
              const last = g.items[g.items.length - 1];
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
                  <div className="flex items-center justify-between gap-2 mt-0.5">
                    <p className="text-[11px] text-slate-500 truncate flex-1">
                      {formatDistanceToNow(new Date(g.lastAt), { addSuffix: true, locale: nl })}
                    </p>
                    <div className="flex items-center gap-1 text-[10px] text-slate-500 flex-shrink-0">
                      {g.inboundCount > 0 && <span title="Inkomend">↓{g.inboundCount}</span>}
                      {g.manualCount > 0 && <span title="Handmatig" className="text-emerald-700">✋{g.manualCount}</span>}
                      {g.automaticCount > 0 && <span title="Automatisch">⚙{g.automaticCount}</span>}
                    </div>
                  </div>
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
                    {activeGroup.items.length} bericht{activeGroup.items.length === 1 ? "" : "en"}
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
                    const lastInbound = [...activeGroup.items].reverse().find((e) => e.origin === "inbound");
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
              {activeGroup.items.map((email, idx) => {
                const prev = idx > 0 ? activeGroup.items[idx - 1] : null;
                const showDate =
                  !prev || !isSameDay(new Date(email.date), new Date(prev.date));
                const isInbound = email.origin === "inbound";
                const isAuto = email.origin === "automatic";
                const OriginIcon = isInbound ? Inbox : isAuto ? Bot : User;
                const borderClass =
                  isInbound
                    ? "border-l-4 border-l-primary"
                    : isAuto
                      ? "border-l-4 border-l-slate-400 bg-slate-50/40"
                      : "border-l-4 border-l-emerald-500 bg-emerald-50/30";
                const bodyText = email.source === "email_log" ? email.content : stripHtml(email.content);
                return (
                  <div key={email.id}>
                    {showDate && (
                      <div className="flex items-center gap-3 my-3">
                        <div className="flex-1 h-px bg-border" />
                        <span className="text-[11px] uppercase tracking-wide text-muted-foreground">
                          {format(new Date(email.date), "EEEE d MMMM yyyy", { locale: nl })}
                        </span>
                        <div className="flex-1 h-px bg-border" />
                      </div>
                    )}
                    <div className={cn("rounded-lg border p-3 bg-white shadow-sm", borderClass)}>
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap mb-0.5">
                            <span
                              className={cn(
                                "inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full border text-[10px] font-medium",
                                ORIGIN_BADGE_CLASS[email.origin],
                              )}
                            >
                              <OriginIcon className="h-3 w-3" />
                              {ORIGIN_LABEL[email.origin]}
                              {email.email_type && (
                                <span className="opacity-70">· {email.email_type}</span>
                              )}
                            </span>
                            <p className="text-xs text-slate-600 truncate">
                              {isInbound ? "van " : "naar "}
                              {email.contact_name || email.contact_email || "Onbekend"}
                            </p>
                          </div>
                          <p className="text-sm font-semibold truncate">{email.subject || "(geen onderwerp)"}</p>
                        </div>
                        <div className="text-[11px] text-muted-foreground whitespace-nowrap">
                          {format(new Date(email.date), "d MMM HH:mm", { locale: nl })}
                        </div>
                      </div>
                      <div className="text-sm whitespace-pre-wrap text-slate-700 max-h-64 overflow-y-auto">
                        {bodyText}
                      </div>
                      <div className="flex items-center gap-1 mt-2">
                        {isInbound && email.source === "communication" && !email.answered_at && (
                          <Button variant="ghost" size="sm" onClick={() => markAnswered(email)}>
                            <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Markeer als beantwoord
                          </Button>
                        )}
                        {email.source === "communication" && (
                          email.archived_at ? (
                            <Button variant="ghost" size="sm" onClick={() => archiveItem(email, false)}>
                              <ArchiveRestore className="h-3.5 w-3.5 mr-1" /> Uit archief
                            </Button>
                          ) : (
                            <Button variant="ghost" size="sm" onClick={() => archiveItem(email, true)}>
                              <Archive className="h-3.5 w-3.5 mr-1" /> Archiveer bericht
                            </Button>
                          )
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
          defaultSubject={replyContext.initialSubject}
        />
      )}
    </div>
  );
}
