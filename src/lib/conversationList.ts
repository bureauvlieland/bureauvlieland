/**
 * Eén lijst voor e-mail en chat in het Berichtencentrum (fase 2).
 *
 * Drie weergaven: "open" (wacht op antwoord, het langst wachtende gesprek
 * eerst), "all" (alles wat niet gearchiveerd is, nieuwste eerst) en
 * "archive". Kanaal is een filter, geen tabblad. Alles hier is zuiver, de
 * data komt uit useEmailThreads en useAdminChat.
 */
import type { PillTone } from "@/components/system/pillVariants";
import type { ChatConversation } from "@/hooks/useChat";
import type { ConversationProjectRef } from "@/hooks/useConversationProjects";
import type { ThreadGroup } from "@/lib/emailThreads";
import { senderRole } from "@/lib/emailThreadTimeline";
import { DERIVED_STATUS_LABEL, DERIVED_STATUS_PILL_TONE } from "@/lib/projectStatus";

export type ConversationView = "open" | "all" | "archive";
export type ConversationChannel = "email" | "customer_portal" | "partner_portal" | "whatsapp" | "website";
export type ChannelFilter = ConversationChannel | "all";

export const VIEW_LABEL: Record<ConversationView, string> = {
  open: "Te beantwoorden",
  all: "Alle gesprekken",
  archive: "Archief",
};

export const CHANNEL_LABEL: Record<ChannelFilter, string> = {
  all: "Alle kanalen",
  email: "E-mail",
  customer_portal: "Chat klant",
  partner_portal: "Chat partner",
  whatsapp: "WhatsApp",
  website: "Website",
};

export interface ConversationListItem {
  /** "email:<groepsleutel>" of "chat:<gesprek-id>" */
  id: string;
  kind: "email" | "chat";
  channel: ConversationChannel;
  /** wie er schreef: afzender, bezoeker of de klant van het dossier */
  name: string;
  /** "BV-2608-0002" of "LOG-2603-0001" */
  dossier: string | null;
  dossierHref: string | null;
  role: "klant" | "partner" | null;
  /** onderwerp (e-mail) of adres/telefoon (chat) */
  line: string;
  unread: number;
  /** sinds wanneer er op antwoord gewacht wordt */
  waitingSince: string | null;
  lastAt: string;
  archived: boolean;
  closed: boolean;
  status: { label: string; tone: PillTone } | null;
  projectDate: string | null;
  /** chat zonder dossier */
  presales: boolean;
}

export function chatChannel(source: string | null | undefined): ConversationChannel {
  switch (source) {
    case "customer_portal":
      return "customer_portal";
    case "partner_portal":
      return "partner_portal";
    case "whatsapp":
      return "whatsapp";
    default:
      return "website";
  }
}

export function emailGroupToItem(g: ThreadGroup): ConversationListItem {
  const humans = g.items.filter((e) => e.origin !== "automatic");
  const lastHuman = humans[humans.length - 1] ?? g.items[g.items.length - 1];
  const lastInbound = [...g.items].reverse().find((e) => e.origin === "inbound") ?? null;
  const first = g.items[0];
  const customer = first?.request_customer ?? first?.accommodation_customer ?? null;
  const dossier = first?.request_ref ?? first?.accommodation_ref ?? null;
  const name = lastInbound?.contact_name || lastInbound?.contact_email || customer || g.contactName || g.contactEmail || "Onbekend";
  const role = lastInbound ? senderRole(lastInbound.contact_email, g.customerEmail, g.partnerEmails) : null;
  const dossierHref =
    g.kind === "program" && g.id ? `/admin/aanvragen/${g.id}` : g.kind === "accommodation" && g.id ? `/admin/logies/${g.id}` : null;
  return {
    id: `email:${g.key}`,
    kind: "email",
    channel: "email",
    name,
    dossier,
    dossierHref,
    role,
    line: lastHuman?.subject || "(geen onderwerp)",
    unread: g.unread,
    waitingSince: g.waitingSince,
    lastAt: g.lastAt,
    archived: g.threadArchived || g.projectArchived,
    closed: false,
    status: g.projectStatus
      ? { label: DERIVED_STATUS_LABEL[g.projectStatus], tone: DERIVED_STATUS_PILL_TONE[g.projectStatus] }
      : null,
    projectDate: g.projectDate,
    presales: false,
  };
}

export interface ChatListInput {
  conversation: ChatConversation & { archived?: boolean };
  unread: number;
  unreadSince: string | null;
  projectRef?: ConversationProjectRef;
}

export function chatToItem({ conversation: c, unread, unreadSince, projectRef }: ChatListInput): ConversationListItem {
  const channel = chatChannel(c.source);
  const dossier = projectRef?.program?.reference ?? projectRef?.accommodation?.label ?? null;
  const dossierHref = projectRef?.program
    ? `/admin/aanvragen/${projectRef.program.id}`
    : projectRef?.accommodation
      ? `/admin/logies/${projectRef.accommodation.id}`
      : null;
  const role: ConversationListItem["role"] =
    channel === "partner_portal" ? "partner" : channel === "customer_portal" ? "klant" : null;
  const presales = !c.request_id && !c.accommodation_request_id && !c.accommodation_id;
  return {
    id: `chat:${c.id}`,
    kind: "chat",
    channel,
    name: c.visitor_name || c.phone_number || "Bezoeker",
    dossier,
    dossierHref,
    role,
    line: channel === "whatsapp" ? c.phone_number || "WhatsApp" : c.visitor_email || CHANNEL_LABEL[channel],
    unread,
    waitingSince: unread > 0 ? unreadSince ?? c.last_message_at : null,
    lastAt: c.last_message_at,
    archived: !!c.archived,
    closed: c.status === "closed",
    status: null,
    projectDate: null,
    presales,
  };
}

/** In welke weergave hoort dit gesprek thuis? Gearchiveerd wint van open. */
export function viewFor(item: Pick<ConversationListItem, "archived" | "unread">): ConversationView {
  if (item.archived) return "archive";
  if (item.unread > 0) return "open";
  return "all";
}

export function isInView(item: Pick<ConversationListItem, "archived" | "unread">, view: ConversationView): boolean {
  if (view === "archive") return item.archived;
  if (view === "open") return !item.archived && item.unread > 0;
  return !item.archived;
}

export function matchesChannel(item: Pick<ConversationListItem, "channel">, channel: ChannelFilter): boolean {
  return channel === "all" || item.channel === channel;
}

export function filterConversations(
  items: ConversationListItem[],
  view: ConversationView,
  channel: ChannelFilter,
): ConversationListItem[] {
  const out = items.filter((i) => isInView(i, view) && matchesChannel(i, channel));
  if (view === "open") {
    return out.sort((a, b) => {
      const wa = a.waitingSince ?? "";
      const wb = b.waitingSince ?? "";
      if (wa !== wb) {
        if (!wa) return 1;
        if (!wb) return -1;
        return wa.localeCompare(wb);
      }
      return b.lastAt.localeCompare(a.lastAt);
    });
  }
  return out.sort((a, b) => b.lastAt.localeCompare(a.lastAt));
}

/** Aantal gesprekken per weergave, voor de tabbladen. */
export function countByView(items: ConversationListItem[], channel: ChannelFilter): Record<ConversationView, number> {
  const counts: Record<ConversationView, number> = { open: 0, all: 0, archive: 0 };
  for (const i of items) {
    if (!matchesChannel(i, channel)) continue;
    if (i.archived) counts.archive += 1;
    else {
      counts.all += 1;
      if (i.unread > 0) counts.open += 1;
    }
  }
  return counts;
}

/** Zet een oude of nieuwe URL-parameter om naar een lijst-id. */
export function parseConversationParam(value: string | null): string | null {
  if (!value) return null;
  if (value.startsWith("email:") || value.startsWith("chat:")) return value;
  return null;
}
