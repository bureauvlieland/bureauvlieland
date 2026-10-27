/**
 * Eén waarheid voor "te beantwoorden" (Berichtencentrum fase 1).
 *
 * Wat open staat:
 *   - een e-mailgesprek met minstens één inkomend bericht zonder `answered_at`
 *     (project_communications, niet gearchiveerd, dossier niet gearchiveerd,
 *     binnen het venster van 90 dagen dat het Berichtencentrum ook hanteert);
 *   - een chatgesprek met minstens één bericht van een ander dan de admin
 *     zonder `read_at` (chat_messages, gesprek niet gearchiveerd of gesloten,
 *     dossier niet gearchiveerd).
 *
 * Geteld wordt altijd per gesprek, nooit per bericht. De bel, de badge in de
 * zijbalk, de tabbladen van het Berichtencentrum en de Werkbank halen hun
 * getal hier vandaan. Er is geen "gezien"-watermerk meer: open is open tot
 * er geantwoord of gelezen is.
 *
 * De opbouw is zuiver (`groupOpenEmails`, `groupUnreadChats`), het ophalen
 * staat onderaan.
 */
import { supabase } from "@/integrations/supabase/client";

export const OPEN_EMAIL_WINDOW_DAYS = 90;
const EMAIL_COMMUNICATION_TYPES = ["email", "email_in", "email_out"];

export interface OpenEmailConversation {
  /** "p:<request_id>", "a:<accommodation_id>" of "c:<e-mailadres>" (zelfde sleutel als EmailPanel) */
  key: string;
  requestId: string | null;
  accommodationId: string | null;
  /** program_request-id om het gesprek aan een Werkbank-dossier te hangen (logies via linked_program_id) */
  projectId: string | null;
  /** id van het oudste open bericht, voor de link `?inbox=<id>` */
  firstUnansweredId: string;
  contactName: string | null;
  subject: string | null;
  oldestAt: string;
  count: number;
}

export interface OpenChatConversation {
  conversationId: string;
  source: string;
  /** website- of WhatsApp-vraag zonder dossier */
  presales: boolean;
  requestId: string | null;
  accommodationRequestId: string | null;
  projectId: string | null;
  visitorName: string;
  lastMessage: string;
  lastMessageAt: string;
  unreadCount: number;
}

export interface OpenConversations {
  emails: OpenEmailConversation[];
  /** chats met een dossier */
  chats: OpenChatConversation[];
  /** chats zonder dossier */
  presales: OpenChatConversation[];
  counts: { email: number; chat: number; presales: number; total: number };
}

export const EMPTY_OPEN_CONVERSATIONS: OpenConversations = {
  emails: [],
  chats: [],
  presales: [],
  counts: { email: 0, chat: 0, presales: 0, total: 0 },
};

/** Ruwe rij uit project_communications. */
export interface OpenEmailRow {
  id: string;
  request_id: string | null;
  accommodation_id: string | null;
  contact_name: string | null;
  contact_email: string | null;
  subject: string | null;
  communication_date: string | null;
}

export interface DossierIndex {
  /** gearchiveerde program_requests */
  archivedRequests: Set<string>;
  /** gearchiveerde accommodation_requests */
  archivedAccommodations: Set<string>;
  /** accommodation_request-id → linked_program_id */
  programByAccommodation: Map<string, string | null>;
}

export function conversationKey(row: {
  request_id: string | null;
  accommodation_id: string | null;
  contact_email: string | null;
}): string {
  if (row.request_id) return `p:${row.request_id}`;
  if (row.accommodation_id) return `a:${row.accommodation_id}`;
  return `c:${(row.contact_email || "onbekend").toLowerCase()}`;
}

/** Groepeert open inkomende mails per gesprek; gearchiveerde dossiers vallen af. */
export function groupOpenEmails(rows: OpenEmailRow[], dossiers: DossierIndex): OpenEmailConversation[] {
  const byKey = new Map<string, OpenEmailConversation>();
  for (const r of rows) {
    if (r.request_id && dossiers.archivedRequests.has(r.request_id)) continue;
    if (r.accommodation_id && dossiers.archivedAccommodations.has(r.accommodation_id)) continue;
    const key = conversationKey(r);
    const at = r.communication_date ?? "";
    const projectId = r.request_id ?? (r.accommodation_id ? dossiers.programByAccommodation.get(r.accommodation_id) ?? null : null);
    const cur = byKey.get(key);
    if (!cur) {
      byKey.set(key, {
        key,
        requestId: r.request_id,
        accommodationId: r.accommodation_id,
        projectId,
        firstUnansweredId: r.id,
        contactName: r.contact_name,
        subject: r.subject,
        oldestAt: at,
        count: 1,
      });
      continue;
    }
    cur.count += 1;
    if (at && (!cur.oldestAt || at < cur.oldestAt)) {
      cur.oldestAt = at;
      cur.firstUnansweredId = r.id;
      cur.contactName = r.contact_name;
      cur.subject = r.subject;
    }
  }
  return Array.from(byKey.values()).sort((a, b) => a.oldestAt.localeCompare(b.oldestAt));
}

export interface UnreadChatMessageRow {
  conversation_id: string;
  content: string;
  created_at: string;
  sender_name: string;
}

export interface ChatConversationRow {
  id: string;
  source: string | null;
  request_id: string | null;
  accommodation_request_id: string | null;
  accommodation_id: string | null;
  visitor_name: string | null;
  archived_at: string | null;
  status: string | null;
}

export function isPresalesConversation(c: {
  request_id: string | null;
  accommodation_request_id: string | null;
  accommodation_id: string | null;
}): boolean {
  return !c.request_id && !c.accommodation_request_id && !c.accommodation_id;
}

/** Groepeert ongelezen chatberichten per gesprek; gesloten, gearchiveerde en archief-dossiers vallen af. */
export function groupUnreadChats(
  messages: UnreadChatMessageRow[],
  conversations: ChatConversationRow[],
  dossiers: DossierIndex,
): OpenChatConversation[] {
  const convById = new Map(conversations.map((c) => [c.id, c]));
  const byId = new Map<string, OpenChatConversation>();
  for (const m of messages) {
    const c = convById.get(m.conversation_id);
    if (!c) continue;
    if (c.archived_at || c.status === "closed") continue;
    if (c.request_id && dossiers.archivedRequests.has(c.request_id)) continue;
    if (c.accommodation_request_id && dossiers.archivedAccommodations.has(c.accommodation_request_id)) continue;
    const cur = byId.get(c.id);
    if (!cur) {
      byId.set(c.id, {
        conversationId: c.id,
        source: c.source ?? "unknown",
        presales: isPresalesConversation(c),
        requestId: c.request_id,
        accommodationRequestId: c.accommodation_request_id,
        projectId:
          c.request_id ??
          (c.accommodation_request_id ? dossiers.programByAccommodation.get(c.accommodation_request_id) ?? null : null),
        visitorName: c.visitor_name || m.sender_name,
        lastMessage: m.content,
        lastMessageAt: m.created_at,
        unreadCount: 1,
      });
      continue;
    }
    cur.unreadCount += 1;
    if (m.created_at > cur.lastMessageAt) {
      cur.lastMessage = m.content;
      cur.lastMessageAt = m.created_at;
    }
  }
  return Array.from(byId.values()).sort((a, b) => b.lastMessageAt.localeCompare(a.lastMessageAt));
}

export function buildOpenConversations(
  emails: OpenEmailConversation[],
  allChats: OpenChatConversation[],
): OpenConversations {
  const chats = allChats.filter((c) => !c.presales);
  const presales = allChats.filter((c) => c.presales);
  return {
    emails,
    chats,
    presales,
    counts: {
      email: emails.length,
      chat: chats.length,
      presales: presales.length,
      total: emails.length + chats.length + presales.length,
    },
  };
}

/** Haalt alles op wat open staat. Zie de uitleg bovenaan. */
export async function fetchOpenConversations(): Promise<OpenConversations> {
  const sinceIso = new Date(Date.now() - OPEN_EMAIL_WINDOW_DAYS * 86400000).toISOString();

  const [emailRes, msgRes] = await Promise.all([
    // open-email-query
    supabase
      .from("project_communications")
      .select("id, request_id, accommodation_id, contact_name, contact_email, subject, communication_date")
      .eq("direction", "inbound")
      .in("communication_type", EMAIL_COMMUNICATION_TYPES)
      .gte("communication_date", sinceIso)
      .is("answered_at", null)
      .is("archived_at", null)
      .order("communication_date", { ascending: true })
      .limit(500),
    supabase
      .from("chat_messages")
      .select("conversation_id, content, created_at, sender_name")
      .neq("sender_type", "admin")
      .is("read_at", null)
      .order("created_at", { ascending: false })
      .limit(500),
  ]);
  if (emailRes.error) throw emailRes.error;
  if (msgRes.error) throw msgRes.error;

  const emailRows = (emailRes.data ?? []) as OpenEmailRow[];
  const messages = (msgRes.data ?? []) as UnreadChatMessageRow[];

  const convIds = Array.from(new Set(messages.map((m) => m.conversation_id)));
  const convRes = convIds.length
    ? await supabase
        .from("chat_conversations")
        .select("id, source, request_id, accommodation_request_id, accommodation_id, visitor_name, archived_at, status")
        .in("id", convIds)
    : { data: [] as ChatConversationRow[], error: null };
  if (convRes.error) throw convRes.error;
  const conversations = (convRes.data ?? []) as ChatConversationRow[];

  // Archief van dossiers via aparte queries (geen embedded join: die komt als
  // array of null terug en filtert dan niet).
  const reqIds = new Set<string>();
  const accIds = new Set<string>();
  for (const r of emailRows) {
    if (r.request_id) reqIds.add(r.request_id);
    if (r.accommodation_id) accIds.add(r.accommodation_id);
  }
  for (const c of conversations) {
    if (c.request_id) reqIds.add(c.request_id);
    if (c.accommodation_request_id) accIds.add(c.accommodation_request_id);
  }

  const [reqRes, accRes] = await Promise.all([
    reqIds.size
      ? supabase.from("program_requests").select("id").in("id", Array.from(reqIds)).not("archived_at", "is", null)
      : Promise.resolve({ data: [] as { id: string }[], error: null }),
    accIds.size
      ? supabase
          .from("accommodation_requests")
          .select("id, archived_at, linked_program_id")
          .in("id", Array.from(accIds))
      : Promise.resolve({ data: [] as { id: string; archived_at: string | null; linked_program_id: string | null }[], error: null }),
  ]);
  if (reqRes.error) throw reqRes.error;
  if (accRes.error) throw accRes.error;

  const dossiers: DossierIndex = {
    archivedRequests: new Set((reqRes.data ?? []).map((r) => r.id)),
    archivedAccommodations: new Set((accRes.data ?? []).filter((a) => !!a.archived_at).map((a) => a.id)),
    programByAccommodation: new Map((accRes.data ?? []).map((a) => [a.id, a.linked_program_id ?? null])),
  };

  return buildOpenConversations(groupOpenEmails(emailRows, dossiers), groupUnreadChats(messages, conversations, dossiers));
}
