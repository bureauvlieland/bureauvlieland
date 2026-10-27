import { describe, it, expect } from "vitest";
import {
  buildOpenConversations,
  conversationKey,
  groupOpenEmails,
  groupUnreadChats,
  isPresalesConversation,
  type ChatConversationRow,
  type DossierIndex,
  type OpenEmailRow,
  type UnreadChatMessageRow,
} from "../openConversations";

const dossiers = (over: Partial<DossierIndex> = {}): DossierIndex => ({
  archivedRequests: new Set(),
  archivedAccommodations: new Set(),
  programByAccommodation: new Map(),
  ...over,
});

const email = (id: string, over: Partial<OpenEmailRow> = {}): OpenEmailRow => ({
  id,
  request_id: "req-1",
  accommodation_id: null,
  contact_name: "Richard",
  contact_email: "richard@example.nl",
  subject: `Onderwerp ${id}`,
  communication_date: `2026-10-2${id}T10:00:00Z`,
  ...over,
});

describe("conversationKey", () => {
  it("volgt dezelfde sleutel als EmailPanel: dossier, anders logies, anders adres", () => {
    expect(conversationKey({ request_id: "r", accommodation_id: "a", contact_email: "x" })).toBe("p:r");
    expect(conversationKey({ request_id: null, accommodation_id: "a", contact_email: "x" })).toBe("a:a");
    expect(conversationKey({ request_id: null, accommodation_id: null, contact_email: "X@Y.nl" })).toBe("c:x@y.nl");
  });
});

describe("groupOpenEmails", () => {
  it("telt per gesprek, niet per bericht, en wijst naar het oudste open bericht", () => {
    const rows = [email("5"), email("3"), email("4")];
    const out = groupOpenEmails(rows, dossiers());
    expect(out).toHaveLength(1);
    expect(out[0].count).toBe(3);
    expect(out[0].firstUnansweredId).toBe("3");
    expect(out[0].oldestAt).toBe("2026-10-23T10:00:00Z");
    expect(out[0].subject).toBe("Onderwerp 3");
  });

  it("laat gesprekken van gearchiveerde dossiers weg", () => {
    const rows = [email("1"), email("2", { request_id: "req-2" }), email("3", { request_id: null, accommodation_id: "acc-1" })];
    const out = groupOpenEmails(
      rows,
      dossiers({ archivedRequests: new Set(["req-2"]), archivedAccommodations: new Set(["acc-1"]) }),
    );
    expect(out.map((o) => o.key)).toEqual(["p:req-1"]);
  });

  it("hangt een logiesgesprek aan het gekoppelde programma", () => {
    const rows = [email("1", { request_id: null, accommodation_id: "acc-1" })];
    const out = groupOpenEmails(rows, dossiers({ programByAccommodation: new Map([["acc-1", "req-9"]]) }));
    expect(out[0].projectId).toBe("req-9");
    expect(out[0].key).toBe("a:acc-1");
  });

  it("sorteert op wachttijd: het langst wachtende gesprek eerst", () => {
    const rows = [email("6", { request_id: "b" }), email("2", { request_id: "a" })];
    expect(groupOpenEmails(rows, dossiers()).map((o) => o.key)).toEqual(["p:a", "p:b"]);
  });
});

const conv = (id: string, over: Partial<ChatConversationRow> = {}): ChatConversationRow => ({
  id,
  source: "customer_portal",
  request_id: "req-1",
  accommodation_request_id: null,
  accommodation_id: null,
  visitor_name: "Anna",
  archived_at: null,
  status: "active",
  ...over,
});
const msg = (conversation_id: string, created_at: string, content = "hoi"): UnreadChatMessageRow => ({
  conversation_id,
  created_at,
  content,
  sender_name: "Anna",
});

describe("groupUnreadChats", () => {
  it("telt per gesprek en onthoudt het laatste bericht", () => {
    const out = groupUnreadChats(
      [msg("c1", "2026-10-26T10:00:00Z", "eerste"), msg("c1", "2026-10-26T12:00:00Z", "laatste")],
      [conv("c1")],
      dossiers(),
    );
    expect(out).toHaveLength(1);
    expect(out[0].unreadCount).toBe(2);
    expect(out[0].lastMessage).toBe("laatste");
    expect(out[0].presales).toBe(false);
    expect(out[0].projectId).toBe("req-1");
  });

  it("laat gesloten en gearchiveerde gesprekken en archief-dossiers weg", () => {
    const out = groupUnreadChats(
      [msg("closed", "2026-10-26T10:00:00Z"), msg("arch", "2026-10-26T10:00:00Z"), msg("dossier", "2026-10-26T10:00:00Z"), msg("ok", "2026-10-26T10:00:00Z")],
      [
        conv("closed", { status: "closed" }),
        conv("arch", { archived_at: "2026-10-01T00:00:00Z" }),
        conv("dossier", { request_id: "req-arch" }),
        conv("ok"),
      ],
      dossiers({ archivedRequests: new Set(["req-arch"]) }),
    );
    expect(out.map((o) => o.conversationId)).toEqual(["ok"]);
  });

  it("markeert website- en WhatsApp-vragen zonder dossier als pre-sales", () => {
    const out = groupUnreadChats(
      [msg("w", "2026-10-26T10:00:00Z")],
      [conv("w", { source: "website", request_id: null })],
      dossiers(),
    );
    expect(out[0].presales).toBe(true);
    expect(out[0].projectId).toBeNull();
  });

  it("negeert berichten van gesprekken die niet (meer) bestaan", () => {
    expect(groupUnreadChats([msg("x", "2026-10-26T10:00:00Z")], [], dossiers())).toEqual([]);
  });
});

describe("isPresalesConversation", () => {
  it("is alleen waar zonder enige koppeling", () => {
    expect(isPresalesConversation({ request_id: null, accommodation_request_id: null, accommodation_id: null })).toBe(true);
    expect(isPresalesConversation({ request_id: null, accommodation_request_id: null, accommodation_id: "a" })).toBe(false);
  });
});

describe("buildOpenConversations", () => {
  it("telt e-mail, chat en pre-sales apart en samen, per gesprek", () => {
    const emails = groupOpenEmails([email("1"), email("2"), email("3", { request_id: "req-2" })], dossiers());
    const chats = groupUnreadChats(
      [msg("c1", "2026-10-26T10:00:00Z"), msg("c1", "2026-10-26T11:00:00Z"), msg("w", "2026-10-26T10:00:00Z")],
      [conv("c1"), conv("w", { source: "website", request_id: null })],
      dossiers(),
    );
    const out = buildOpenConversations(emails, chats);
    expect(out.counts).toEqual({ email: 2, chat: 1, presales: 1, total: 4 });
    expect(out.chats.map((c) => c.conversationId)).toEqual(["c1"]);
    expect(out.presales.map((c) => c.conversationId)).toEqual(["w"]);
  });
});
