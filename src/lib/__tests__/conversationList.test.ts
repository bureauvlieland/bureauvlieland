import { describe, it, expect } from "vitest";
import {
  chatChannel,
  chatToItem,
  countByView,
  emailGroupToItem,
  filterConversations,
  isInView,
  parseConversationParam,
  viewFor,
  type ConversationListItem,
} from "../conversationList";
import type { ThreadGroup, EmailItem } from "../emailThreads";
import type { ChatConversation } from "@/hooks/useChat";

const item = (id: string, over: Partial<ConversationListItem> = {}): ConversationListItem => ({
  id,
  kind: "email",
  channel: "email",
  name: "Richard",
  dossier: "BV-1",
  dossierHref: null,
  role: "klant",
  line: "Onderwerp",
  unread: 0,
  waitingSince: null,
  lastAt: "2026-10-20T10:00:00Z",
  archived: false,
  closed: false,
  status: null,
  projectDate: null,
  presales: false,
  ...over,
});

describe("viewFor en isInView", () => {
  it("gearchiveerd wint van open", () => {
    expect(viewFor({ archived: true, unread: 2 })).toBe("archive");
    expect(viewFor({ archived: false, unread: 2 })).toBe("open");
    expect(viewFor({ archived: false, unread: 0 })).toBe("all");
  });
  it("open gesprekken staan ook in 'alle'", () => {
    expect(isInView({ archived: false, unread: 1 }, "all")).toBe(true);
    expect(isInView({ archived: false, unread: 1 }, "open")).toBe(true);
    expect(isInView({ archived: false, unread: 0 }, "open")).toBe(false);
    expect(isInView({ archived: true, unread: 0 }, "all")).toBe(false);
  });
});

describe("filterConversations", () => {
  const items = [
    item("a", { unread: 1, waitingSince: "2026-10-25T10:00:00Z", lastAt: "2026-10-26T10:00:00Z" }),
    item("b", { unread: 2, waitingSince: "2026-10-20T10:00:00Z", lastAt: "2026-10-21T10:00:00Z" }),
    item("c", { lastAt: "2026-10-27T10:00:00Z" }),
    item("d", { archived: true, lastAt: "2026-10-28T10:00:00Z" }),
    item("e", { kind: "chat", channel: "whatsapp", unread: 1, waitingSince: "2026-10-22T10:00:00Z", lastAt: "2026-10-22T10:00:00Z" }),
  ];

  it("'open' toont alleen wachtende gesprekken, het langst wachtende eerst", () => {
    expect(filterConversations(items, "open", "all").map((i) => i.id)).toEqual(["b", "e", "a"]);
  });

  it("'alle' toont alles behalve archief, nieuwste eerst", () => {
    expect(filterConversations(items, "all", "all").map((i) => i.id)).toEqual(["c", "a", "e", "b"]);
  });

  it("'archief' toont alleen gearchiveerde gesprekken", () => {
    expect(filterConversations(items, "archive", "all").map((i) => i.id)).toEqual(["d"]);
  });

  it("kanaal is een filter over elke weergave", () => {
    expect(filterConversations(items, "open", "whatsapp").map((i) => i.id)).toEqual(["e"]);
    expect(filterConversations(items, "all", "email").map((i) => i.id)).toEqual(["c", "a", "b"]);
  });

  it("telt per weergave, met het kanaalfilter", () => {
    expect(countByView(items, "all")).toEqual({ open: 3, all: 4, archive: 1 });
    expect(countByView(items, "email")).toEqual({ open: 2, all: 3, archive: 1 });
  });
});

describe("chatChannel", () => {
  it("vouwt website-bronnen samen en laat de portalen en WhatsApp apart", () => {
    expect(chatChannel("presales")).toBe("website");
    expect(chatChannel("website")).toBe("website");
    expect(chatChannel(null)).toBe("website");
    expect(chatChannel("customer_portal")).toBe("customer_portal");
    expect(chatChannel("partner_portal")).toBe("partner_portal");
    expect(chatChannel("whatsapp")).toBe("whatsapp");
  });
});

const emailItem = (over: Partial<EmailItem>): EmailItem => ({
  id: "c:1",
  source: "communication",
  origin: "inbound",
  subject: "Re: Alternatief",
  content: "",
  contact_name: "Richard Dijkstra",
  contact_email: "richard@example.nl",
  date: "2026-10-26T07:47:00Z",
  answered_at: null,
  archived_at: null,
  request_id: "req-1",
  accommodation_id: null,
  request_ref: "BV-2608-0002",
  request_customer: "Richard Melvin Dijkstra",
  ...over,
});

describe("emailGroupToItem", () => {
  const group = (over: Partial<ThreadGroup> = {}): ThreadGroup => ({
    key: "p:req-1",
    kind: "program",
    id: "req-1",
    label: "BV-2608-0002 · Richard Melvin Dijkstra",
    contactName: "Richard Dijkstra",
    contactEmail: "richard@example.nl",
    items: [
      emailItem({ id: "l:1", source: "email_log", origin: "automatic", subject: "Offerte", date: "2026-08-25T13:38:00Z", email_type: "quote_offer_customer" }),
      emailItem({}),
    ],
    unread: 1,
    inboundCount: 1,
    manualCount: 0,
    automaticCount: 1,
    lastAt: "2026-10-26T07:47:00Z",
    projectArchived: false,
    threadArchived: false,
    projectStatus: "akkoord_ontvangen",
    projectDate: "2026-11-05",
    customerEmail: "richard@example.nl",
    partnerEmails: new Set(),
    waitingSince: "2026-10-26T07:47:00Z",
    ...over,
  });

  it("neemt afzender, rol, dossier, onderwerp van het laatste mensenbericht en de status over", () => {
    const it_ = emailGroupToItem(group());
    expect(it_.id).toBe("email:p:req-1");
    expect(it_.name).toBe("Richard Dijkstra");
    expect(it_.role).toBe("klant");
    expect(it_.dossier).toBe("BV-2608-0002");
    expect(it_.dossierHref).toBe("/admin/aanvragen/req-1");
    expect(it_.line).toBe("Re: Alternatief");
    expect(it_.status).toEqual({ label: "Akkoord ontvangen", tone: "warning" });
    expect(it_.waitingSince).toBe("2026-10-26T07:47:00Z");
    expect(it_.archived).toBe(false);
  });

  it("is gearchiveerd als het gesprek óf het dossier gearchiveerd is", () => {
    expect(emailGroupToItem(group({ projectArchived: true })).archived).toBe(true);
    expect(emailGroupToItem(group({ threadArchived: true })).archived).toBe(true);
  });

  it("valt zonder inkomend bericht terug op de klant van het dossier", () => {
    const g = group({
      items: [emailItem({ id: "l:1", source: "email_log", origin: "automatic", contact_name: "Zuiver Traiteur", email_type: "program_request_partner" })],
      unread: 0,
      waitingSince: null,
    });
    const it_ = emailGroupToItem(g);
    expect(it_.name).toBe("Richard Melvin Dijkstra");
    expect(it_.role).toBeNull();
  });
});

describe("chatToItem", () => {
  const conv = (over: Partial<ChatConversation & { archived?: boolean }> = {}): ChatConversation & { archived?: boolean } => ({
    id: "c1",
    source: "customer_portal",
    source_token: null,
    source_partner_id: null,
    visitor_name: "Anna",
    visitor_email: "anna@example.nl",
    request_id: "req-1",
    accommodation_request_id: null,
    status: "active",
    last_message_at: "2026-10-26T12:00:00Z",
    created_at: "2026-10-20T12:00:00Z",
    ...over,
  });

  it("zet een klantchat met ongelezen berichten om in een wachtend gesprek", () => {
    const it_ = chatToItem({ conversation: conv(), unread: 2, unreadSince: "2026-10-26T11:00:00Z", projectRef: { program: { id: "req-1", reference: "BV-1" } } });
    expect(it_.id).toBe("chat:c1");
    expect(it_.channel).toBe("customer_portal");
    expect(it_.role).toBe("klant");
    expect(it_.dossier).toBe("BV-1");
    expect(it_.waitingSince).toBe("2026-10-26T11:00:00Z");
    expect(it_.presales).toBe(false);
  });

  it("WhatsApp zonder dossier is pre-sales en toont het nummer", () => {
    const it_ = chatToItem({ conversation: conv({ source: "whatsapp", request_id: null, phone_number: "+316", visitor_name: "" }), unread: 0, unreadSince: null });
    expect(it_.channel).toBe("whatsapp");
    expect(it_.name).toBe("+316");
    expect(it_.line).toBe("+316");
    expect(it_.presales).toBe(true);
    expect(it_.waitingSince).toBeNull();
  });

  it("neemt archief en gesloten over", () => {
    expect(chatToItem({ conversation: conv({ archived: true }), unread: 0, unreadSince: null }).archived).toBe(true);
    expect(chatToItem({ conversation: conv({ status: "closed" }), unread: 0, unreadSince: null }).closed).toBe(true);
  });
});

describe("parseConversationParam", () => {
  it("accepteert alleen lijst-ids", () => {
    expect(parseConversationParam("email:p:1")).toBe("email:p:1");
    expect(parseConversationParam("chat:abc")).toBe("chat:abc");
    expect(parseConversationParam("abc")).toBeNull();
    expect(parseConversationParam(null)).toBeNull();
  });
});
