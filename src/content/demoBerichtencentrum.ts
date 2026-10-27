/**
 * Vaste, verzonnen gesprekken voor de referentiepagina
 * /ontwerp/berichtencentrum en de visuele regressietest (Berichtencentrum
 * fase 3): één e-mailgesprek met systeemmail, een partnerantwoord en een
 * onbeantwoord klantbericht, één klantchat en één website-vraag. Niets
 * hiervan komt uit de database; acties doen op de referentiepagina niets.
 */
import type { EmailItem, ThreadGroup } from "@/lib/emailThreads";
import type { AdminChatConversation } from "@/hooks/useAdminChat";
import type { ChatMessage } from "@/hooks/useChat";
import type { ConversationProjectRef } from "@/hooks/useConversationProjects";
import { oldestUnansweredDate } from "@/lib/emailThreadTimeline";

const PROJECT = "demo-project-scherp";
const CUSTOMER_EMAIL = "jasmijn@scherp-demo.nl";

const basis = {
  request_id: PROJECT,
  accommodation_id: null,
  request_ref: "BV-2609-0042",
  request_customer: "Jasmijn de Boer",
  request_archived: null,
  accommodation_ref: null,
  accommodation_customer: null,
  accommodation_archived: null,
  customer_email: CUSTOMER_EMAIL,
  project_status: "akkoord_ontvangen" as const,
  project_date: "2026-11-05",
};

const auto = (id: string, date: string, email_type: string, name: string, email: string, item_label: string | null, status: string, subject: string): EmailItem => ({
  ...basis,
  id: `l:${id}`,
  source: "email_log",
  origin: "automatic",
  subject,
  content: "",
  contact_name: name,
  contact_email: email,
  date,
  answered_at: null,
  archived_at: null,
  email_type,
  status,
  item_label,
});

export const DEMO_EMAIL_ITEMS: EmailItem[] = [
  auto("1", "2026-09-02T13:38:00Z", "quote_offer_customer", "Jasmijn de Boer", CUSTOMER_EMAIL, null, "opened", "Uw maatwerkvoorstel van Bureau Vlieland"),
  auto("2", "2026-09-14T14:50:00Z", "quote_accepted_customer", "Jasmijn de Boer", CUSTOMER_EMAIL, null, "opened", "Uw akkoord is ontvangen - Bureau Vlieland"),
  auto("3", "2026-09-14T14:56:00Z", "program_request_partner", "Wadloopcentrum Vlieland", "info@wadloopcentrum-demo.nl", "Wadexcursie met gids", "clicked", "Nieuwe aanvraag via Bureau Vlieland — BV-2609-0042"),
  auto("4", "2026-09-14T14:56:10Z", "program_request_partner", "Brouwerij Fortuna", "info@fortuna-demo.nl", "Rondleiding en proeverij", "opened", "Nieuwe aanvraag via Bureau Vlieland — BV-2609-0042"),
  auto("5", "2026-09-14T14:56:20Z", "program_request_partner", "De Bazuin Watertaxi", "info@bazuin-demo.nl", "Watertaxi naar de Vliehors", "delivered", "Nieuwe aanvraag via Bureau Vlieland — BV-2609-0042"),
  auto("6", "2026-09-14T14:56:30Z", "program_request_partner", "Trattoria Oliva", "info@oliva-demo.nl", "Diner op de eerste avond", "opened", "Nieuwe aanvraag via Bureau Vlieland — BV-2609-0042"),
  {
    ...basis,
    id: "c:7",
    source: "communication",
    origin: "inbound",
    subject: "Re: Nieuwe aanvraag via Bureau Vlieland — BV-2609-0042",
    content:
      "Goedemiddag,\n\nDank voor de aanvraag. Op 5 november kunnen we de watertaxi om 10.15 uur laten vertrekken, dat sluit aan op de boot van 9.30 uur. Twaalf personen passen in één boot.\n\nMet vriendelijke groet,\nKees van der Veen\nDe Bazuin Watertaxi",
    contact_name: "Kees van der Veen",
    contact_email: "info@bazuin-demo.nl",
    date: "2026-09-16T12:58:00Z",
    answered_at: "2026-09-16T15:20:00Z",
    archived_at: null,
    metadata: null,
  },
  {
    ...basis,
    id: "c:8",
    source: "communication",
    origin: "manual",
    subject: "Re: Nieuwe aanvraag via Bureau Vlieland — BV-2609-0042",
    content: "Dank Kees, 10.15 uur is genoteerd. Ik bevestig het aantal een week van tevoren.",
    contact_name: "Kees van der Veen",
    contact_email: "info@bazuin-demo.nl",
    date: "2026-09-16T15:20:00Z",
    answered_at: null,
    archived_at: null,
    metadata: null,
  },
  auto("9", "2026-09-19T07:21:00Z", "status_alternative", "Jasmijn de Boer", CUSTOMER_EMAIL, "Locatiehuur Lange Paal", "opened", "Alternatief voorstel voor Locatiehuur Lange Paal"),
  {
    ...basis,
    id: "c:10",
    source: "communication",
    origin: "inbound",
    subject: "Re: Alternatief voorstel voor Locatiehuur Lange Paal",
    content:
      "Hoi Erwin,\n\nHet alternatief klinkt goed, maar kunnen we de borrel dan wel buiten houden als het weer het toelaat? En is er een plek om de fietsen te stallen?\n\nGroet,\nJasmijn",
    contact_name: "Jasmijn de Boer",
    contact_email: CUSTOMER_EMAIL,
    date: "2026-09-19T09:47:00Z",
    answered_at: null,
    archived_at: null,
    metadata: {
      attachments: [{ name: "plattegrond-lange-paal.pdf", size: 418000, mime: "application/pdf", path: "demo/plattegrond.pdf" }],
    },
  },
];

export const DEMO_EMAIL_GROUP: ThreadGroup = {
  key: `p:${PROJECT}`,
  kind: "program",
  id: PROJECT,
  label: "BV-2609-0042 · Jasmijn de Boer",
  contactName: "Jasmijn de Boer",
  contactEmail: CUSTOMER_EMAIL,
  items: DEMO_EMAIL_ITEMS,
  unread: 1,
  inboundCount: 2,
  manualCount: 1,
  automaticCount: 7,
  lastAt: "2026-09-19T09:47:00Z",
  projectArchived: false,
  threadArchived: false,
  projectStatus: "akkoord_ontvangen",
  projectDate: "2026-11-05",
  customerEmail: CUSTOMER_EMAIL,
  partnerEmails: new Set(["info@wadloopcentrum-demo.nl", "info@fortuna-demo.nl", "info@bazuin-demo.nl", "info@oliva-demo.nl"]),
  waitingSince: oldestUnansweredDate(DEMO_EMAIL_ITEMS),
};

/** Een tweede, beantwoord e-mailgesprek voor de lijst. */
export const DEMO_EMAIL_GROUP_KREEFT: ThreadGroup = {
  key: "p:demo-project-kreeft",
  kind: "program",
  id: "demo-project-kreeft",
  label: "BV-2608-0017 · Pieter Kreeft",
  contactName: "Pieter Kreeft",
  contactEmail: "pieter@kreeft-demo.nl",
  items: [
    {
      ...basis,
      request_id: "demo-project-kreeft",
      request_ref: "BV-2608-0017",
      request_customer: "Pieter Kreeft",
      customer_email: "pieter@kreeft-demo.nl",
      project_status: "afgerond",
      project_date: "2026-09-18",
      id: "c:20",
      source: "communication",
      origin: "inbound",
      subject: "Bedankt voor een mooie dag",
      content: "Namens het hele team: wat een dag. De wadexcursie was het hoogtepunt.",
      contact_name: "Pieter Kreeft",
      contact_email: "pieter@kreeft-demo.nl",
      date: "2026-09-20T08:12:00Z",
      answered_at: "2026-09-20T09:00:00Z",
      archived_at: null,
      metadata: null,
    },
  ],
  unread: 0,
  inboundCount: 1,
  manualCount: 0,
  automaticCount: 0,
  lastAt: "2026-09-20T08:12:00Z",
  projectArchived: false,
  threadArchived: false,
  projectStatus: "afgerond",
  projectDate: "2026-09-18",
  customerEmail: "pieter@kreeft-demo.nl",
  partnerEmails: new Set(),
  waitingSince: null,
};

export const DEMO_CHAT: AdminChatConversation = {
  id: "demo-chat-jasmijn",
  source: "customer_portal",
  source_token: null,
  source_partner_id: null,
  visitor_name: "Jasmijn de Boer",
  visitor_email: CUSTOMER_EMAIL,
  request_id: PROJECT,
  accommodation_request_id: null,
  status: "active",
  last_message_at: "2026-09-21T08:40:00Z",
  created_at: "2026-09-15T10:00:00Z",
  archived: false,
  archived_at: null,
};

export const DEMO_CHAT_WEBSITE: AdminChatConversation = {
  id: "demo-chat-website",
  source: "presales",
  source_token: null,
  source_partner_id: null,
  visitor_name: "Tom Visser",
  visitor_email: "tom@visser-demo.nl",
  request_id: null,
  accommodation_request_id: null,
  status: "active",
  last_message_at: "2026-09-20T16:05:00Z",
  created_at: "2026-09-20T16:05:00Z",
  archived: false,
  archived_at: null,
};

export const DEMO_CHAT_MESSAGES: ChatMessage[] = [
  { id: "m1", conversation_id: DEMO_CHAT.id, sender_type: "customer", sender_name: "Jasmijn de Boer", content: "Hoi, is het programma op dag 2 ook geschikt als het hard waait?", read_at: "2026-09-15T10:30:00Z", created_at: "2026-09-15T10:12:00Z" },
  { id: "m2", conversation_id: DEMO_CHAT.id, sender_type: "admin", sender_name: "erwin", content: "Zeker, de wadexcursie gaat door tot windkracht 6. Daarboven schuiven we naar de brouwerij in de ochtend.", read_at: "2026-09-15T11:00:00Z", created_at: "2026-09-15T10:41:00Z" },
  { id: "m3", conversation_id: DEMO_CHAT.id, sender_type: "customer", sender_name: "Jasmijn de Boer", content: "Top. En kunnen er twee collega's later aansluiten, met de boot van 13.00 uur?", read_at: null, created_at: "2026-09-21T08:40:00Z" },
];

export const DEMO_UNREAD = new Map<string, number>([
  [DEMO_CHAT.id, 1],
  [DEMO_CHAT_WEBSITE.id, 1],
]);
export const DEMO_UNREAD_SINCE = new Map<string, string>([
  [DEMO_CHAT.id, "2026-09-21T08:40:00Z"],
  [DEMO_CHAT_WEBSITE.id, "2026-09-20T16:05:00Z"],
]);
export const DEMO_PROJECT_REFS: Record<string, ConversationProjectRef> = {
  [DEMO_CHAT.id]: { program: { id: PROJECT, reference: "BV-2609-0042" } },
};
