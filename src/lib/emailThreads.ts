/**
 * Data en zuivere opbouw van e-mailgesprekken in het Berichtencentrum.
 *
 * Twee bronnen: project_communications (inkomend en handmatig verzonden) en
 * email_log (automatisch verzonden), samengevoegd per dossier. Gehaald uit
 * EmailPanel in fase 2, zodat de lijst, de gespreksweergave en de tellers
 * dezelfde opbouw delen.
 */
import { supabase } from "@/integrations/supabase/client";
import type { PillTone } from "@/components/system";
import { isThreadArchived } from "@/lib/emailThreadArchive";
import { oldestUnansweredDate, isPartnerEmailType } from "@/lib/emailThreadTimeline";
import { getDerivedStatus, type DerivedStatus } from "@/lib/projectStatus";

export type Origin = "inbound" | "manual" | "automatic";

export interface EmailItem {
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

export interface ThreadGroup {
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

export const ORIGIN_LABEL: Record<Origin, string> = {
  inbound: "Inkomend",
  manual: "Handmatig",
  automatic: "Automatisch",
};

export const ORIGIN_TONE: Record<Origin, PillTone> = {
  inbound: "info",
  manual: "success",
  automatic: "neutral",
};

export function statusTone(status: string | null | undefined): PillTone {
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
export function effectiveStatus(r: {
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

export function stripHtml(html: string): string {
  if (!html) return "";
  const noTags = html.replace(/<style[\s\S]*?<\/style>/gi, "").replace(/<[^>]+>/g, " ");
  return noTags.replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/\s+/g, " ").trim();
}

export async function fetchEmails(): Promise<EmailItem[]> {
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

export function buildGroups(items: EmailItem[], showArchived: boolean, originFilter: Origin | "all" | "unanswered"): ThreadGroup[] {
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
