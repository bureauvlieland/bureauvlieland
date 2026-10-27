import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  MoreVertical,
  Keyboard,
  CalendarDays,
  RotateCcw,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { Pill, type PillTone } from "@/components/system";
import { EmailAttachments } from "@/components/admin/EmailAttachments";
import { EmailLogDetailDialog } from "@/components/admin/EmailLogDetailDialog";
import type { ProjectCommunication } from "@/types/projectCommunication";
import { emailTypeLabel, emailStatusLabel } from "@/lib/emailTypeLabels";
import {
  buildTimeline,
  bundleSummary,
  focusItemId,
  oldestUnansweredDate,
  senderRole,
  isPartnerEmailType,
} from "@/lib/emailThreadTimeline";
import { SendProjectEmailSheet } from "@/components/admin/SendProjectEmailSheet";
import { EmailShortcutsDialog } from "@/components/admin/EmailShortcutsDialog";
import {
  isThreadArchived,
  planThreadArchive,
  stripSourcePrefix,
} from "@/lib/emailThreadArchive";
import {
  getDerivedStatus,
  DERIVED_STATUS_LABEL,
  DERIVED_STATUS_TONE,
  isPastDate,
  type DerivedStatus,
} from "@/lib/projectStatus";

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
  /** bijlagen e.d. van een inkomende mail (project_communications.metadata) */
  metadata?: Record<string, unknown> | null;
  /** onderdeel waar een automatische mail over gaat (program_request_items) */
  item_label?: string | null;
  /** klantadres van het dossier, voor de rol van een afzender */
  customer_email?: string | null;
  /** afgeleide projectstatus van het gekoppelde dossier */
  project_status?: DerivedStatus | null;
  /** eerste programma-/aankomstdatum van het dossier (ISO) */
  project_date?: string | null;
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
  threadArchived: boolean;
  projectStatus: DerivedStatus | null;
  projectDate: string | null;
  customerEmail: string | null;
  /** adressen waar het systeem ooit een partnermail heen stuurde */
  partnerEmails: Set<string>;
  /** datum van het oudste onbeantwoorde inkomende bericht */
  waitingSince: string | null;
}

const ORIGIN_LABEL: Record<Origin, string> = {
  inbound: "Inkomend",
  manual: "Handmatig",
  automatic: "Automatisch",
};

const ORIGIN_TONE: Record<Origin, PillTone> = {
  inbound: "info",
  manual: "success",
  automatic: "neutral",
};

function statusTone(status: string | null | undefined): PillTone {
  switch (status) {
    case "opened":
    case "clicked":
      return "success";
    case "failed":
    case "bounced":
    case "blocked":
    case "spam":
      return "danger";
    case "pending":
      return "warning";
    default:
      return "neutral";
  }
}

/** Mailjet-status van een logregel: het verst gevorderde signaal wint. */
function effectiveStatus(r: {
  status: string;
  bounced_at?: string | null;
  clicked_at?: string | null;
  opened_at?: string | null;
  delivered_at?: string | null;
}): string {
  if (r.bounced_at) return "bounced";
  if (r.clicked_at) return "clicked";
  if (r.opened_at) return "opened";
  if (r.delivered_at) return "delivered";
  return r.status;
}

function stripHtml(html: string): string {
  if (!html) return "";
  const noTags = html.replace(/<style[\s\S]*?<\/style>/gi, "").replace(/<[^>]+>/g, " ");
  return noTags.replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/\s+/g, " ").trim();
}

async function fetchEmails(): Promise<EmailItem[]> {
  const sinceIso = new Date(Date.now() - 90 * 86400000).toISOString();

  // 1) project_communications: alle e-mail types
  // 1) project_communications: alle e-mail types (incl. gearchiveerde, zodat we
  //    per gesprek kunnen bepalen of het volledig gearchiveerd is)
  const commQuery = supabase
    .from("project_communications")
    .select(
      `id, subject, content, contact_name, contact_email, communication_date, direction, communication_type,
       answered_at, archived_at, request_id, accommodation_id, metadata,
       request:program_requests(reference_number, customer_name, customer_email, archived_at),
       accommodation:accommodation_requests(reference_number, customer_name, customer_email, archived_at)`,
    )
    .in("communication_type", ["email", "email_in", "email_out"])
    .gte("communication_date", sinceIso)
    .order("communication_date", { ascending: false })
    .limit(800);

  // 2) email_log: alleen succesvol verzonden + met project-koppeling
  const logQuery = supabase
    .from("email_log")
    .select(
      "id, email_type, subject, recipient_email, recipient_name, related_request_id, related_accommodation_id, related_item_id, status, created_at, sent_at, delivered_at, opened_at, clicked_at, bounced_at",
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
    metadata: e.metadata ?? null,
    customer_email: e.request?.customer_email ?? e.accommodation?.customer_email ?? null,
  }));

  // Resolve refs voor email_log rows
  const logRows = logRes.data ?? [];
  const progIds = Array.from(
    new Set(logRows.map((r: any) => r.related_request_id).filter(Boolean)),
  ) as string[];
  const accIds = Array.from(
    new Set(logRows.map((r: any) => r.related_accommodation_id).filter(Boolean)),
  ) as string[];

  const itemIds = Array.from(
    new Set(logRows.map((r) => r.related_item_id).filter(Boolean)),
  ) as string[];

  const [progsRes, accsRes, itemsRes] = await Promise.all([
    progIds.length
      ? supabase
          .from("program_requests")
          .select("id, reference_number, customer_name, customer_email, archived_at")
          .in("id", progIds)
      : Promise.resolve({ data: [] as any[] }),
    accIds.length
      ? supabase
          .from("accommodation_requests")
          .select("id, reference_number, customer_name, customer_email, archived_at")
          .in("id", accIds)
      : Promise.resolve({ data: [] as any[] }),
    itemIds.length
      ? supabase.from("program_request_items").select("id, block_name, provider_name").in("id", itemIds)
      : Promise.resolve({ data: [] as any[] }),
  ]);
  const progMap = new Map<string, any>((progsRes.data ?? []).map((p: any) => [p.id, p]));
  const accMap = new Map<string, any>((accsRes.data ?? []).map((a: any) => [a.id, a]));
  const itemMap = new Map<string, string>(
    (itemsRes.data ?? []).map((i) => [i.id, i.block_name || i.provider_name || ""]),
  );

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
        content: "",
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
        status: effectiveStatus(r),
        item_label: r.related_item_id ? itemMap.get(r.related_item_id) || null : null,
        customer_email: prog?.customer_email ?? acc?.customer_email ?? null,
      };
    });

  const all = [...commItems, ...logItems];

  // Projectstatus (zelfde afleiding als het projectenoverzicht) toevoegen
  const allProgIds = Array.from(new Set(all.map((e) => e.request_id).filter(Boolean))) as string[];
  const allAccIds = Array.from(new Set(all.map((e) => e.accommodation_id).filter(Boolean))) as string[];

  const [progMetaRes, accMetaRes] = await Promise.all([
    allProgIds.length
      ? supabase
          .from("program_requests")
          .select("id, status, quote_status, completion_status, terms_accepted_at, selected_dates, linked_accommodation_id")
          .in("id", allProgIds)
      : Promise.resolve({ data: [] as any[] }),
    allAccIds.length
      ? supabase
          .from("accommodation_requests")
          .select("id, status, arrival_date, linked_program_id")
          .in("id", allAccIds)
      : Promise.resolve({ data: [] as any[] }),
  ]);

  const progMeta = new Map<string, any>((progMetaRes.data ?? []).map((p: any) => [p.id, p]));
  const accMeta = new Map<string, any>((accMetaRes.data ?? []).map((a: any) => [a.id, a]));

  // Voor logies-gesprekken willen we ook de status van het gekoppelde programma
  const extraProgIds = Array.from(
    new Set(
      (accMetaRes.data ?? [])
        .map((a: any) => a.linked_program_id)
        .filter((id: string | null) => id && !progMeta.has(id)),
    ),
  ) as string[];
  if (extraProgIds.length) {
    const { data: extra } = await supabase
      .from("program_requests")
      .select("id, status, quote_status, completion_status, terms_accepted_at, selected_dates, linked_accommodation_id")
      .in("id", extraProgIds);
    (extra ?? []).forEach((p: any) => progMeta.set(p.id, p));
  }

  const firstSelectedDate = (selected: unknown): string | null => {
    if (!Array.isArray(selected) || selected.length === 0) return null;
    const dates = selected.map(String).filter(Boolean).sort();
    return dates[0] ?? null;
  };

  for (const e of all) {
    if (e.request_id) {
      const prog = progMeta.get(e.request_id);
      if (!prog) continue;
      const acc = prog.linked_accommodation_id ? accMeta.get(prog.linked_accommodation_id) : null;
      e.project_status = getDerivedStatus({
        program_status: prog.status ?? null,
        accommodation_status: acc?.status ?? null,
        completion_status: prog.completion_status ?? null,
        terms_accepted_at: prog.terms_accepted_at ?? null,
        quote_status: prog.quote_status ?? null,
      });
      e.project_date = firstSelectedDate(prog.selected_dates) ?? acc?.arrival_date ?? null;
    } else if (e.accommodation_id) {
      const acc = accMeta.get(e.accommodation_id);
      if (!acc) continue;
      const prog = acc.linked_program_id ? progMeta.get(acc.linked_program_id) : null;
      e.project_status = getDerivedStatus({
        program_status: prog?.status ?? null,
        accommodation_status: acc.status ?? null,
        completion_status: prog?.completion_status ?? null,
        terms_accepted_at: prog?.terms_accepted_at ?? null,
        quote_status: prog?.quote_status ?? null,
      });
      e.project_date = acc.arrival_date ?? firstSelectedDate(prog?.selected_dates) ?? null;
    }
  }

  return all;
}

function buildGroups(items: EmailItem[], showArchived: boolean, originFilter: Origin | "all" | "unanswered"): ThreadGroup[] {
  const groups = new Map<string, ThreadGroup>();
  for (const e of items) {
    if (originFilter !== "all" && originFilter !== "unanswered" && e.origin !== originFilter) continue;

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
      if (!g.projectStatus && e.project_status) g.projectStatus = e.project_status;
      if (!g.projectDate && e.project_date) g.projectDate = e.project_date;
      if (!g.customerEmail && e.customer_email) g.customerEmail = e.customer_email;
      if (e.origin === "automatic" && e.contact_email && isPartnerEmailType(e.email_type)) {
        g.partnerEmails.add(e.contact_email.toLowerCase());
      }
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
        threadArchived: false,
        projectStatus: e.project_status ?? null,
        projectDate: e.project_date ?? null,
        customerEmail: e.customer_email ?? null,
        partnerEmails: new Set(
          e.origin === "automatic" && e.contact_email && isPartnerEmailType(e.email_type)
            ? [e.contact_email.toLowerCase()]
            : [],
        ),
        waitingSince: null,
      });
    }
  }

  return Array.from(groups.values())
    .map((g) => ({
      ...g,
      threadArchived: isThreadArchived(g.items),
      items: g.items.slice().sort((a, b) => (a.date || "").localeCompare(b.date || "")),
    }))
    .filter((g) => (showArchived ? true : !g.threadArchived))
    .map((g) => ({
      ...g,
      items: showArchived ? g.items : g.items.filter((e) => !e.archived_at),
    }))
    .map((g) => ({ ...g, waitingSince: oldestUnansweredDate(g.items) }))
    .filter((g) => g.items.length > 0)
    .filter((g) => (originFilter === "unanswered" ? g.unread > 0 : true))
    .sort((a, b) => {
      if ((a.unread > 0) !== (b.unread > 0)) return a.unread > 0 ? -1 : 1;
      return (b.lastAt || "").localeCompare(a.lastAt || "");
    });
}

interface EmailPanelProps {
  initialOpenId?: string | null;
  initialFilter?: string | null;
  heightClassName?: string;
}

type ExtendedOrigin = Origin | "all" | "unanswered";

export function EmailPanel({ initialOpenId, initialFilter, heightClassName = "h-[calc(100vh-220px)]" }: EmailPanelProps) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [showArchived, setShowArchived] = useState(false);
  const [originFilter, setOriginFilter] = useState<ExtendedOrigin>(
    initialFilter === "unanswered" ? "unanswered" : "all",
  );
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [replyOpen, setReplyOpen] = useState(false);
  const [replyContext, setReplyContext] = useState<{
    groupKey: string;
    requestId?: string;
    accommodationId?: string;
    recipients: { label: string; email: string; name: string; type: "customer" | "partner" }[];
    initialSubject?: string;
  } | null>(null);
  const [detailComm, setDetailComm] = useState<ProjectCommunication | null>(null);
  const [expandedBundles, setExpandedBundles] = useState<Set<string>>(() => new Set());
  const threadScrollRef = useRef<HTMLDivElement>(null);

  const { data: items = [], isLoading, refetch } = useQuery({
    queryKey: ["admin-email-threads"],
    queryFn: () => fetchEmails(),
    refetchInterval: 60_000,
  });

  const groups = useMemo(() => buildGroups(items, showArchived, originFilter), [items, showArchived, originFilter]);
  const unansweredGroupCount = useMemo(
    () => buildGroups(items, showArchived, "unanswered").length,
    [items, showArchived],
  );

  useEffect(() => {
    if (!initialOpenId || activeKey) return;
    const row = items.find((r) => r.id === `c:${initialOpenId}` || r.id === initialOpenId);
    if (!row) return;
    if (row.request_id) setActiveKey(`p:${row.request_id}`);
    else if (row.accommodation_id) setActiveKey(`a:${row.accommodation_id}`);
    else if (row.contact_email) setActiveKey(`c:${row.contact_email.toLowerCase()}`);
  }, [initialOpenId, items, activeKey]);

  const activeGroup = groups.find((g) => g.key === activeKey) || null;

  const stripPrefix = stripSourcePrefix;

  // Live bijwerken: een nieuwe inkomende mail of een verzonden automatische
  // mail verschijnt zonder vernieuwen. Kort gedempt, want één actie kan
  // tientallen logregels tegelijk opleveren.
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    const bump = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => refetch(), 800);
    };
    const ch = supabase
      .channel(`email-panel-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "project_communications" }, bump)
      .on("postgres_changes", { event: "*", schema: "public", table: "email_log" }, bump)
      .subscribe();
    return () => {
      if (timer) clearTimeout(timer);
      supabase.removeChannel(ch);
    };
  }, [refetch]);

  // Open een gesprek op het eerste onbeantwoorde bericht; anders op het
  // laatste bericht van een mens; anders onderaan.
  useEffect(() => {
    if (!activeGroup) return;
    const id = focusItemId(activeGroup.items);
    const frame = requestAnimationFrame(() => {
      const el = id ? document.getElementById(`email-msg-${id}`) : null;
      const box = threadScrollRef.current;
      if (el && box) {
        box.scrollTop = Math.max(0, el.offsetTop - box.offsetTop - 12);
      } else if (box) {
        box.scrollTop = box.scrollHeight;
      }
    });
    return () => cancelAnimationFrame(frame);
    // Alleen bij het wisselen van gesprek of de eerste lading, niet bij elke refetch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeKey, isLoading]);

  /** Opent de volledige inhoud van een automatisch verzonden mail. */
  const openLogDetail = async (item: EmailItem) => {
    if (item.source !== "email_log") return;
    const { data, error } = await supabase
      .from("email_log")
      .select(
        "id, email_type, subject, recipient_email, recipient_name, html_body, text_body, from_email, reply_to, status, sent_at, created_at, related_request_id, related_accommodation_id",
      )
      .eq("id", stripPrefix(item.id))
      .maybeSingle();
    if (error || !data) {
      toast.error("Kon de e-mail niet laden");
      return;
    }
    setDetailComm({
      id: `log-${data.id}`,
      email_log_id: data.id,
      request_id: data.related_request_id,
      accommodation_id: data.related_accommodation_id,
      communication_type: "email_out",
      direction: "outbound",
      subject: data.subject,
      content: data.text_body ?? "",
      html_body: data.html_body,
      text_body: data.text_body,
      from_email: data.from_email,
      reply_to: data.reply_to,
      contact_name: data.recipient_name,
      contact_email: data.recipient_email,
      logged_by: null,
      logged_at: data.created_at,
      communication_date: data.sent_at ?? data.created_at,
      metadata: { status: item.status ?? data.status },
      created_at: data.created_at,
      updated_at: data.created_at,
      source: "email_log",
      email_type: data.email_type,
    });
  };

  const toggleBundle = (key: string) =>
    setExpandedBundles((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const invalidate = useCallback(() => {
    refetch();
    queryClient.invalidateQueries({ queryKey: ["open-conversations"] });
  }, [refetch, queryClient]);

  const setAnswered = async (item: EmailItem, answered: boolean) => {
    if (item.source !== "communication") return;
    const { error } = await supabase
      .from("project_communications")
      .update({ answered_at: answered ? new Date().toISOString() : null })
      .eq("id", stripPrefix(item.id));
    if (error) toast.error("Kon status niet bijwerken");
    else {
      toast.success(answered ? "Gemarkeerd als beantwoord" : "Gemarkeerd als onbeantwoord");
      invalidate();
    }
  };

  const markAnswered = (item: EmailItem) => setAnswered(item, true);

  /** Markeer/ontmarkeer alle inkomende berichten van een gesprek. */
  const setThreadAnswered = async (group: ThreadGroup, answered: boolean) => {
    const ids = group.items
      .filter((e) => e.source === "communication" && e.origin === "inbound")
      .filter((e) => (answered ? !e.answered_at : !!e.answered_at))
      .map((e) => stripPrefix(e.id));
    if (!ids.length) return;
    const { error } = await supabase
      .from("project_communications")
      .update({ answered_at: answered ? new Date().toISOString() : null })
      .in("id", ids);
    if (error) toast.error("Kon status niet bijwerken");
    else {
      toast.success(answered ? "Gesprek gemarkeerd als beantwoord" : "Gesprek gemarkeerd als onbeantwoord");
      invalidate();
    }
  };

  const archiveItem = async (item: EmailItem, archived = true) => {
    if (item.source !== "communication") {
      toast.info("Automatische mails kun je niet los archiveren.");
      return;
    }
    const { error } = await supabase
      .from("project_communications")
      .update({ archived_at: archived ? new Date().toISOString() : null })
      .eq("id", stripPrefix(item.id));
    if (error) toast.error("Archiveren mislukt");
    else {
      toast.success(archived ? "E-mail gearchiveerd" : "E-mail teruggehaald");
      invalidate();
    }
  };

  /**
   * Archiveert uitsluitend het gesprek (de berichten). Het dossier blijft
   * actief in Projecten — dat archiveren gebeurt via archiveDossier().
   */
  const archiveThread = async (group: ThreadGroup, archived = true) => {
    const plan = planThreadArchive(group.items, archived);
    if (plan.noop) {
      toast.info("Dit gesprek bestaat alleen uit automatische mails en kan niet gearchiveerd worden.");
      return;
    }
    if (plan.ids.length) {
      const { error } = await supabase
        .from("project_communications")
        .update({ archived_at: plan.archivedAt })
        .in("id", plan.ids);
      if (error) return toast.error("Archiveren mislukt");
    }
    toast.success(archived ? "Gesprek gearchiveerd" : "Gesprek teruggehaald");
    if (archived) setActiveKey(null);
    invalidate();
  };

  /** Zware actie: archiveert het volledige dossier (project/logies). */
  const archiveDossier = async (group: ThreadGroup, archived = true) => {
    if (!group.id || group.kind === "contact") return;
    const table = group.kind === "program" ? "program_requests" : "accommodation_requests";
    const { error } = await supabase
      .from(table)
      .update({ archived_at: archived ? new Date().toISOString() : null })
      .eq("id", group.id);
    if (error) return toast.error("Archiveren van het dossier mislukt");
    toast.success(archived ? "Dossier gearchiveerd" : "Dossier teruggehaald");
    if (archived) setActiveKey(null);
    invalidate();
    queryClient.invalidateQueries({ queryKey: ["projects-overview"] });
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
      groupKey: group.key,
      requestId: group.kind === "program" ? group.id ?? undefined : undefined,
      accommodationId: group.kind === "accommodation" ? group.id ?? undefined : undefined,
      recipients,
      initialSubject: subj ? (subj.toLowerCase().startsWith("re:") ? subj : `Re: ${subj}`) : undefined,
    });
    setReplyOpen(true);
  };

  const replyToGroup = (group: ThreadGroup) => {
    const lastInbound = [...group.items].reverse().find((e) => e.origin === "inbound");
    openReply(group, lastInbound);
  };

  // ---- Sneltoetsen (Outlook-stijl) ----
  useEffect(() => {
    const handler = (ev: KeyboardEvent) => {
      if (ev.metaKey || ev.ctrlKey || ev.altKey) return;
      const el = ev.target as HTMLElement | null;
      if (el && (el.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName))) return;
      if (replyOpen || shortcutsOpen) {
        if (ev.key === "?") setShortcutsOpen(true);
        return;
      }

      const idx = groups.findIndex((g) => g.key === activeKey);
      const move = (delta: number) => {
        if (!groups.length) return;
        const next = idx < 0 ? 0 : Math.min(groups.length - 1, Math.max(0, idx + delta));
        setActiveKey(groups[next].key);
      };

      switch (ev.key) {
        case "j":
        case "ArrowDown":
          ev.preventDefault();
          move(1);
          break;
        case "k":
        case "ArrowUp":
          ev.preventDefault();
          move(-1);
          break;
        case "Enter":
          if (idx < 0 && groups.length) setActiveKey(groups[0].key);
          break;
        case "Escape":
          setActiveKey(null);
          break;
        case "r":
          if (activeGroup) {
            ev.preventDefault();
            replyToGroup(activeGroup);
          }
          break;
        case "e":
          if (activeGroup) {
            ev.preventDefault();
            archiveThread(activeGroup, !activeGroup.threadArchived);
          }
          break;
        case "m":
          if (activeGroup) {
            ev.preventDefault();
            setThreadAnswered(activeGroup, true);
          }
          break;
        case "u":
          if (activeGroup) {
            ev.preventDefault();
            setThreadAnswered(activeGroup, false);
          }
          break;
        case "a":
          ev.preventDefault();
          setShowArchived((v) => !v);
          break;
        case "?":
          setShortcutsOpen(true);
          break;
        default:
          break;
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groups, activeKey, activeGroup, replyOpen, shortcutsOpen]);

  const filterChips: { key: ExtendedOrigin; label: string; count?: number }[] = [
    { key: "all", label: "Alles" },
    { key: "unanswered", label: "Onbeantwoord", count: unansweredGroupCount },
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
            <div className="flex items-center gap-1">
              <Badge variant="outline" className="text-xs">{groups.length}</Badge>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                title="Sneltoetsen (?)"
                onClick={() => setShortcutsOpen(true)}
              >
                <Keyboard className="h-4 w-4" />
              </Button>
            </div>
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
                {typeof c.count === "number" && c.count > 0 && (
                  <span
                    className={cn(
                      "ml-1 inline-flex items-center justify-center rounded-full px-1 text-[10px] font-semibold",
                      originFilter === c.key
                        ? "bg-white/20 text-primary-foreground"
                        : "bg-red-600 text-white",
                    )}
                  >
                    {c.count}
                  </span>
                )}
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
              const lastHuman = [...g.items].reverse().find((e) => e.origin !== "automatic") ?? g.items[g.items.length - 1];
              const lastInbound = [...g.items].reverse().find((e) => e.origin === "inbound") ?? null;
              const role = lastInbound ? senderRole(lastInbound.contact_email, g.customerEmail, g.partnerEmails) : null;
              const senderLine = lastInbound
                ? `${lastInbound.contact_name || lastInbound.contact_email || "Onbekend"}${role ? ` (${role})` : ""}`
                : "Alleen verzonden mail";
              return (
                <button
                  key={g.key}
                  type="button"
                  onClick={() => setActiveKey(g.key)}
                  className={cn(
                    "w-full text-left px-3 py-2.5 border-b hover:bg-slate-50 transition-colors",
                    isActive && "bg-primary/5",
                    g.unread > 0 && !isActive && "bg-warning-soft/40",
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
                      <Pill tone="warning" title="Onbeantwoorde berichten">
                        {g.unread} onbeantwoord
                      </Pill>
                    )}
                  </div>
                  <p className={cn("text-xs text-foreground truncate", g.unread > 0 && "font-medium")}>
                    {lastHuman?.subject || "(geen onderwerp)"}
                  </p>
                  {(g.projectStatus || g.projectDate || g.threadArchived) && (
                    <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                      {g.projectStatus && (
                        <span
                          className={cn(
                            "inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium",
                            DERIVED_STATUS_TONE[g.projectStatus],
                          )}
                        >
                          {DERIVED_STATUS_LABEL[g.projectStatus]}
                        </span>
                      )}
                      {g.projectDate && (
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 text-[10px]",
                            isPastDate(new Date(g.projectDate)) ? "text-red-600 font-medium" : "text-slate-500",
                          )}
                        >
                          <CalendarDays className="h-3 w-3" />
                          {format(new Date(g.projectDate), "d MMM yyyy", { locale: nl })}
                        </span>
                      )}
                      {g.threadArchived && (
                        <span className="inline-flex items-center gap-1 text-[10px] text-slate-500">
                          <Archive className="h-3 w-3" /> gearchiveerd
                        </span>
                      )}
                    </div>
                  )}
                  <div className="flex items-center justify-between gap-2 mt-0.5 text-[11px] text-muted-foreground">
                    <p className="truncate flex-1">{senderLine}</p>
                    <span
                      className={cn("flex-shrink-0", g.waitingSince && "text-warning-ink font-medium")}
                      title={format(new Date(g.waitingSince ?? g.lastAt), "d MMM yyyy HH:mm", { locale: nl })}
                    >
                      {g.waitingSince
                        ? `wacht ${formatDistanceToNow(new Date(g.waitingSince), { locale: nl })}`
                        : formatDistanceToNow(new Date(g.lastAt), { addSuffix: true, locale: nl })}
                    </span>
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
              <div className="flex items-center gap-2 min-w-0 flex-1">
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
                  <div className="flex items-center gap-2 flex-wrap text-xs text-muted-foreground">
                    <span>
                      {activeGroup.items.length} bericht{activeGroup.items.length === 1 ? "" : "en"}
                    </span>
                    {activeGroup.projectStatus && (
                      <span
                        className={cn(
                          "inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium",
                          DERIVED_STATUS_TONE[activeGroup.projectStatus],
                        )}
                      >
                        {DERIVED_STATUS_LABEL[activeGroup.projectStatus]}
                      </span>
                    )}
                    {activeGroup.projectDate && (
                      <span
                        className={cn(
                          "inline-flex items-center gap-1",
                          isPastDate(new Date(activeGroup.projectDate)) ? "text-red-600 font-medium" : "",
                        )}
                      >
                        <CalendarDays className="h-3 w-3" />
                        {format(new Date(activeGroup.projectDate), "d MMM yyyy", { locale: nl })}
                      </span>
                    )}
                    {activeGroup.threadArchived && <span>· gearchiveerd gesprek</span>}
                    {activeGroup.projectArchived && <span>· gearchiveerd dossier</span>}
                  </div>
                </div>
                {activeGroup.kind === "program" && activeGroup.id && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-shrink-0"
                    onClick={() => navigate(`/admin/aanvragen/${activeGroup.id}`)}
                  >
                    <ExternalLink className="h-3.5 w-3.5 mr-1" /> Project
                  </Button>
                )}
                {activeGroup.kind === "accommodation" && activeGroup.id && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-shrink-0"
                    onClick={() => navigate(`/admin/logies/${activeGroup.id}`)}
                  >
                    <ExternalLink className="h-3.5 w-3.5 mr-1" /> Logies
                  </Button>
                )}
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <Button size="sm" onClick={() => replyToGroup(activeGroup)}>
                  <Reply className="h-4 w-4 mr-1" /> Beantwoorden
                </Button>
                {activeGroup.threadArchived ? (
                  <Button variant="ghost" size="sm" onClick={() => archiveThread(activeGroup, false)}>
                    <ArchiveRestore className="h-4 w-4 mr-1" /> Uit archief
                  </Button>
                ) : (
                  <Button variant="ghost" size="sm" onClick={() => archiveThread(activeGroup, true)}>
                    <Archive className="h-4 w-4 mr-1" /> Archiveer
                  </Button>
                )}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-64">
                    <DropdownMenuItem onClick={() => setThreadAnswered(activeGroup, true)}>
                      <CheckCircle2 className="h-4 w-4 mr-2" /> Markeer gesprek als beantwoord
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setThreadAnswered(activeGroup, false)}>
                      <RotateCcw className="h-4 w-4 mr-2" /> Markeer als onbeantwoord
                    </DropdownMenuItem>
                    {activeGroup.kind !== "contact" && activeGroup.id && (
                      activeGroup.projectArchived ? (
                        <DropdownMenuItem onClick={() => archiveDossier(activeGroup, false)}>
                          <ArchiveRestore className="h-4 w-4 mr-2" /> Dossier terughalen uit archief
                        </DropdownMenuItem>
                      ) : (
                        <DropdownMenuItem
                          className="text-amber-700"
                          onClick={() => archiveDossier(activeGroup, true)}
                        >
                          <Archive className="h-4 w-4 mr-2" /> Ook het hele dossier archiveren
                        </DropdownMenuItem>
                      )
                    )}
                    <DropdownMenuItem onClick={() => setShortcutsOpen(true)}>
                      <Keyboard className="h-4 w-4 mr-2" /> Sneltoetsen
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            <div ref={threadScrollRef} className="flex-1 overflow-y-auto p-4 space-y-2">
              {buildTimeline(activeGroup.items).map((entry, idx, all) => {
                const entryDate = entry.kind === "bundle" ? entry.date : entry.item.date;
                const prevEntry = idx > 0 ? all[idx - 1] : null;
                const prevDate = prevEntry ? (prevEntry.kind === "bundle" ? prevEntry.date : prevEntry.item.date) : null;
                const showDate = !prevDate || !isSameDay(new Date(entryDate), new Date(prevDate));
                const dateRow = showDate ? (
                  <div className="flex items-center gap-3 my-3">
                    <div className="flex-1 h-px bg-border" />
                    <span className="text-[11px] text-muted-foreground">
                      {format(new Date(entryDate), "EEEE d MMMM yyyy", { locale: nl })}
                    </span>
                    <div className="flex-1 h-px bg-border" />
                  </div>
                ) : null;

                if (entry.kind === "bundle") {
                  const open = expandedBundles.has(entry.key);
                  const lastId = entry.items[entry.items.length - 1].id;
                  return (
                    <div key={entry.key} id={`email-msg-${lastId}`}>
                      {dateRow}
                      <button
                        type="button"
                        onClick={() => toggleBundle(entry.key)}
                        className="w-full flex items-center gap-2 px-2 py-1 rounded-md text-xs text-muted-foreground hover:bg-muted/60 text-left"
                        aria-expanded={open}
                      >
                        {open ? (
                          <ChevronDown className="h-3.5 w-3.5 flex-shrink-0" />
                        ) : (
                          <ChevronRight className="h-3.5 w-3.5 flex-shrink-0" />
                        )}
                        <span className="tabular-nums flex-shrink-0">
                          {format(new Date(entry.date), "HH:mm", { locale: nl })}
                        </span>
                        <span className="text-foreground font-medium flex-shrink-0">
                          {emailTypeLabel(entry.emailType)}
                        </span>
                        <span className="truncate">{bundleSummary(entry.items)}</span>
                      </button>
                      {open && (
                        <div className="ml-4 pl-2 border-l space-y-0.5 mt-0.5">
                          {entry.items.map((it) => (
                            <AutomaticMailRow key={it.id} item={it} onOpen={() => openLogDetail(it)} />
                          ))}
                        </div>
                      )}
                    </div>
                  );
                }

                if (entry.kind === "event") {
                  return (
                    <div key={entry.item.id} id={`email-msg-${entry.item.id}`}>
                      {dateRow}
                      <AutomaticMailRow item={entry.item} onOpen={() => openLogDetail(entry.item)} />
                    </div>
                  );
                }

                const email = entry.item;
                const isInbound = email.origin === "inbound";
                const OriginIcon = isInbound ? Inbox : User;
                const role = isInbound
                  ? senderRole(email.contact_email, activeGroup.customerEmail, activeGroup.partnerEmails)
                  : null;
                const unanswered = isInbound && email.source === "communication" && !email.answered_at && !email.archived_at;
                return (
                  <div key={email.id} id={`email-msg-${email.id}`}>
                    {dateRow}
                    <div
                      className={cn(
                        "rounded-lg border p-3 bg-card shadow-soft border-l-4",
                        isInbound ? "border-l-primary" : "border-l-success",
                        unanswered && "ring-1 ring-warning/40",
                      )}
                    >
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap mb-0.5">
                            <Pill tone={ORIGIN_TONE[email.origin]}>
                              <OriginIcon className="h-3 w-3 mr-1" />
                              {ORIGIN_LABEL[email.origin]}
                            </Pill>
                            <p className="text-xs text-muted-foreground truncate">
                              {isInbound ? "van " : "naar "}
                              {email.contact_name || email.contact_email || "Onbekend"}
                              {role ? ` (${role})` : ""}
                            </p>
                            {unanswered && <Pill tone="warning">onbeantwoord</Pill>}
                          </div>
                          <p className="text-sm font-semibold truncate">{email.subject || "(geen onderwerp)"}</p>
                        </div>
                        <div className="text-[11px] text-muted-foreground whitespace-nowrap">
                          {format(new Date(email.date), "d MMM HH:mm", { locale: nl })}
                        </div>
                      </div>
                      <div className="text-sm whitespace-pre-wrap text-foreground/90 max-h-96 overflow-y-auto">
                        {stripHtml(email.content)}
                      </div>
                      {email.source === "communication" && <EmailAttachments metadata={email.metadata} />}
                      <div className="flex items-center gap-1 mt-2">
                        {unanswered && (
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
              queryClient.invalidateQueries({ queryKey: ["open-conversations"] });
            }
          }}
          requestId={replyContext.requestId}
          accommodationId={replyContext.accommodationId}
          recipients={replyContext.recipients}
          defaultSubject={replyContext.initialSubject}
          onEmailSent={() => {
            // Een verstuurd antwoord sluit het gesprek: alle open inkomende
            // berichten van dit gesprek gaan op beantwoord.
            const g = groups.find((x) => x.key === replyContext.groupKey);
            if (g) void setThreadAnswered(g, true);
          }}
        />
      )}

      <EmailLogDetailDialog
        open={!!detailComm}
        onOpenChange={(o) => {
          if (!o) setDetailComm(null);
        }}
        communication={detailComm}
      />

      <EmailShortcutsDialog open={shortcutsOpen} onOpenChange={setShortcutsOpen} />
    </div>
  );
}

/** Eén regel voor een automatisch verstuurde mail: tijd, wat, aan wie, status. */
function AutomaticMailRow({ item, onOpen }: { item: EmailItem; onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      title="Open de verstuurde mail"
      className="w-full flex items-center gap-2 px-2 py-1 rounded-md text-xs text-muted-foreground hover:bg-muted/60 text-left"
    >
      <Bot className="h-3.5 w-3.5 flex-shrink-0 opacity-60" />
      <span className="tabular-nums flex-shrink-0">{format(new Date(item.date), "HH:mm", { locale: nl })}</span>
      <span className="text-foreground flex-shrink-0">{emailTypeLabel(item.email_type)}</span>
      <span className="truncate">
        naar {item.contact_name || item.contact_email || "onbekend"}
        {item.item_label ? ` · ${item.item_label}` : ""}
      </span>
      {item.status && (
        <Pill tone={statusTone(item.status)} className="ml-auto flex-shrink-0">
          {emailStatusLabel(item.status)}
        </Pill>
      )}
    </button>
  );
}
