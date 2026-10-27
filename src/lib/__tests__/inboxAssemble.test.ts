import { describe, it, expect } from "vitest";
import {
  assembleInbox,
  isSystemTodo,
  looseGroupKey,
  looseRowId,
  todoIdFromLooseRowId,
  type RawInboxTodo,
} from "../inboxAssemble";
import type { ProjectSummary } from "../getProject";

const NOW = new Date("2026-10-26T12:00:00Z");
const TODAY = "2026-10-26";

function project(id: string, overrides: Partial<ProjectSummary> = {}): ProjectSummary {
  return {
    id,
    reference: `BV-${id}`,
    kind: "programma_only",
    customer: { name: "Klant", email: "k@example.com", phone: null, company: null },
    dates: ["2026-11-05"],
    numberOfPeople: 10,
    quoteStatus: "concept",
    termsAcceptedAt: null,
    pipeline: "aanvraag",
    programPipeline: "aanvraag",
    lodgingPipeline: null,
    comm: "wacht_op_klant",
    programComm: "wacht_op_klant",
    lodgingComm: null,
    hasProgram: true,
    hasLodging: false,
    bureauActionHints: [],
    weddingReferral: null,
    snoozedUntil: null,
    snoozedReason: null,
    snoozedAt: null,
    isSnoozed: false,
    updatedAt: "2026-09-01T00:00:00Z",
    ...overrides,
  } as ProjectSummary;
}

function todo(id: string, overrides: Partial<RawInboxTodo> = {}): RawInboxTodo {
  return {
    id,
    title: `Taak ${id}`,
    priority: "normal",
    due_date: null,
    auto_type: null,
    related_request_id: null,
    created_at: "2026-10-20T00:00:00Z",
    ...overrides,
  };
}

describe("looseGroupKey", () => {
  it("auto-taken met dezelfde soort en titel delen een sleutel, ongeacht hoofdletters/spaties", () => {
    const a = looseGroupKey({ id: "1", auto_type: "new_program_request", title: "Nieuwe aanvraag: ZELFTEST" });
    const b = looseGroupKey({ id: "2", auto_type: "new_program_request", title: " nieuwe aanvraag: zelftest " });
    expect(a).toBe(b);
  });

  it("handmatige taken blijven elk een eigen rij", () => {
    const a = looseGroupKey({ id: "1", auto_type: null, title: "Bel Jan" });
    const b = looseGroupKey({ id: "2", auto_type: null, title: "Bel Jan" });
    expect(a).not.toBe(b);
  });

  it("rij-id is omkeerbaar", () => {
    expect(todoIdFromLooseRowId(looseRowId("abc"))).toBe("abc");
  });
});

describe("assembleInbox: losse taken", () => {
  it("vouwt identieke auto-taken samen tot één rij met alle taken erin", () => {
    const todos = [
      todo("s1", { auto_type: "critical_selftest_failure", title: "Kritieke zelftest faalt: X", priority: "high" }),
      todo("s2", { auto_type: "critical_selftest_failure", title: "Kritieke zelftest faalt: X", priority: "high" }),
      todo("s3", { auto_type: "critical_selftest_failure", title: "Kritieke zelftest faalt: X", priority: "high" }),
      todo("n1", { auto_type: "new_program_request", title: "Nieuwe programma-aanvraag: ZELFTEST" }),
      todo("n2", { auto_type: "new_program_request", title: "Nieuwe programma-aanvraag: ZELFTEST" }),
      todo("m1", { title: "Bel de drukker" }),
    ];
    const items = assembleInbox({ todos, projects: [], lastContactByProject: new Map(), today: TODAY, now: NOW });

    expect(items).toHaveLength(3);
    const selftest = items.find((i) => i.projectId === looseRowId("s1"))!;
    expect(selftest.kind).toBe("loose");
    expect(selftest.todos.map((t) => t.id)).toEqual(["s1", "s2", "s3"]);
    expect(isSystemTodo(selftest.todos[0])).toBe(true);

    const aanvraag = items.find((i) => i.projectId === looseRowId("n1"))!;
    expect(aanvraag.todos.map((t) => t.id)).toEqual(["n1", "n2"]);

    const manual = items.find((i) => i.projectId === looseRowId("m1"))!;
    expect(manual.todos).toHaveLength(1);
  });

  it("een groep duplicaten scoort als één taak, niet als zes", () => {
    const six = Array.from({ length: 6 }, (_, i) =>
      todo(`s${i}`, { auto_type: "critical_selftest_failure", title: "Kritieke zelftest faalt", priority: "high" }),
    );
    const single = todo("one", { auto_type: "critical_selftest_failure", title: "Kritieke zelftest faalt", priority: "high" });
    const grouped = assembleInbox({ todos: six, projects: [], lastContactByProject: new Map(), today: TODAY, now: NOW });
    const alone = assembleInbox({ todos: [single], projects: [], lastContactByProject: new Map(), today: TODAY, now: NOW });
    expect(grouped[0].score).toBe(alone[0].score);
  });

  it("losse taken met gelijke titel maar andere soort blijven gescheiden", () => {
    const todos = [
      todo("a", { auto_type: "type_a", title: "Zelfde titel" }),
      todo("b", { auto_type: "type_b", title: "Zelfde titel" }),
    ];
    const items = assembleInbox({ todos, projects: [], lastContactByProject: new Map(), today: TODAY, now: NOW });
    expect(items).toHaveLength(2);
  });
});

describe("assembleInbox: dossiers", () => {
  it("taken van een project komen onder het project, niet als losse rij", () => {
    const p = project("p1");
    const todos = [todo("t1", { related_request_id: "p1" }), todo("t2", { related_request_id: "p1" })];
    const items = assembleInbox({ todos, projects: [p], lastContactByProject: new Map(), today: TODAY, now: NOW });
    expect(items).toHaveLength(1);
    expect(items[0].kind).toBe("project");
    expect(items[0].project?.id).toBe("p1");
    expect(items[0].todos).toHaveLength(2);
  });

  it("taken van een project buiten de werklijst worden verborgen", () => {
    const todos = [todo("t1", { related_request_id: "weg" })];
    const items = assembleInbox({ todos, projects: [], lastContactByProject: new Map(), today: TODAY, now: NOW });
    expect(items).toHaveLength(0);
  });

  it("stilte-dossier zonder taken staat in de inbox met reden 'stilte'", () => {
    const p = project("p1", { comm: "stilte" });
    const items = assembleInbox({ todos: [], projects: [p], lastContactByProject: new Map(), today: TODAY, now: NOW });
    expect(items).toHaveLength(1);
    expect(items[0].reasons).toEqual(["stilte"]);
  });

  it("recent contact (hot) onderdrukt normale taken en laat het dossier verdwijnen", () => {
    const p = project("p1", { comm: "bij_bureau" });
    const todos = [todo("t1", { related_request_id: "p1" })];
    const contact = new Map([["p1", "2026-10-26T09:00:00Z"]]);
    const items = assembleInbox({ todos, projects: [p], lastContactByProject: contact, today: TODAY, now: NOW });
    expect(items).toHaveLength(0);
  });
});

describe("assembleInbox: gesprekken die op antwoord wachten", () => {
  const signal = (projectId: string, kind: "email" | "chat" = "email", since = "2026-10-24T09:00:00Z") => ({
    projectId,
    kind,
    count: 1,
    since,
    label: kind === "email" ? "E-mail van Richard" : "Chat van Anna",
    href: "/admin/berichten",
  });

  it("zet een dossier met een onbeantwoorde e-mail in de inbox met reden 'te_beantwoorden'", () => {
    const p = project("p1");
    const items = assembleInbox({
      todos: [],
      projects: [p],
      lastContactByProject: new Map(),
      today: TODAY,
      now: NOW,
      openConversations: [signal("p1")],
    });
    expect(items).toHaveLength(1);
    expect(items[0].reasons).toEqual(["te_beantwoorden"]);
    expect(items[0].open).toHaveLength(1);
    expect(items[0].score).toBeGreaterThan(0);
  });

  it("wordt niet gedempt door recent contact: het contact ís het open bericht", () => {
    const p = project("p1");
    const contact = new Map([["p1", "2026-10-26T09:00:00Z"]]);
    const items = assembleInbox({
      todos: [],
      projects: [p],
      lastContactByProject: contact,
      today: TODAY,
      now: NOW,
      openConversations: [signal("p1")],
    });
    expect(items).toHaveLength(1);
    expect(items[0].activity.cooldown).toBe("hot");
  });

  it("telt meerdere gesprekken op één dossier als één reden, gesorteerd op wachttijd", () => {
    const p = project("p1");
    const one = assembleInbox({ todos: [], projects: [p], lastContactByProject: new Map(), today: TODAY, now: NOW, openConversations: [signal("p1")] });
    const two = assembleInbox({
      todos: [],
      projects: [p],
      lastContactByProject: new Map(),
      today: TODAY,
      now: NOW,
      openConversations: [signal("p1", "chat", "2026-10-25T09:00:00Z"), signal("p1", "email", "2026-10-20T09:00:00Z")],
    });
    expect(two[0].score).toBe(one[0].score);
    expect(two[0].open.map((o) => o.kind)).toEqual(["email", "chat"]);
  });

  it("weegt zwaarder dan een gewone taak en lichter dan stilte", () => {
    const withOpen = assembleInbox({ todos: [], projects: [project("a")], lastContactByProject: new Map(), today: TODAY, now: NOW, openConversations: [signal("a")] });
    const withTodo = assembleInbox({ todos: [todo("t", { related_request_id: "b" })], projects: [project("b")], lastContactByProject: new Map(), today: TODAY, now: NOW });
    const silent = assembleInbox({ todos: [], projects: [project("c", { comm: "stilte" })], lastContactByProject: new Map(), today: TODAY, now: NOW });
    expect(withOpen[0].score).toBeGreaterThan(withTodo[0].score);
    expect(withOpen[0].score).toBeLessThan(silent[0].score);
  });

  it("negeert gesprekken van dossiers buiten de werklijst", () => {
    const items = assembleInbox({ todos: [], projects: [], lastContactByProject: new Map(), today: TODAY, now: NOW, openConversations: [signal("weg")] });
    expect(items).toHaveLength(0);
  });
});

describe("doorverwezen bruiloften", () => {
  const referred = project("p-ref", {
    comm: "doorverwezen",
    programComm: "bij_bureau",
    weddingReferral: { partnerName: "Paal 50", referredAt: "2026-10-04", status: "referred" },
  });

  it("komt zonder taken niet in de inbox: niet 'Aan zet', geen stilte", () => {
    const items = assembleInbox({
      todos: [],
      projects: [referred],
      lastContactByProject: new Map(),
      today: TODAY,
      now: NOW,
    });
    expect(items).toEqual([]);
  });

  it("verbergt de automatische projecttaken (inactief, offerte, herinneringen)", () => {
    const items = assembleInbox({
      todos: [
        todo("t1", { auto_type: "request_no_response", related_request_id: "p-ref", title: "Aanvraag X is inactief" }),
        todo("t2", { auto_type: "quote_pending_customer", related_request_id: "p-ref" }),
        todo("t3", { auto_type: "new_program_request", related_request_id: "p-ref" }),
      ],
      projects: [referred],
      lastContactByProject: new Map(),
      today: TODAY,
      now: NOW,
    });
    expect(items).toEqual([]);
  });

  it("toont wel handmatige taken, inbound en de taken van de doorverwijzing zelf", () => {
    const items = assembleInbox({
      todos: [
        todo("t1", { auto_type: "request_no_response", related_request_id: "p-ref" }),
        todo("m1", { auto_type: null, related_request_id: "p-ref", title: "Vergoeding factureren" }),
        todo("i1", { auto_type: "inbound_email", related_request_id: "p-ref", title: "Antwoord bruidspaar" }),
        todo("w1", { auto_type: "wedding_referral_claim", related_request_id: "p-ref", title: "Paal 50 meldt: al bekend" }),
      ],
      projects: [referred],
      lastContactByProject: new Map(),
      today: TODAY,
      now: NOW,
    });
    expect(items).toHaveLength(1);
    expect(items[0].projectId).toBe("p-ref");
    expect(items[0].comm).toBe("doorverwezen");
    expect(items[0].todos.map((t) => t.id).sort()).toEqual(["i1", "m1", "w1"]);
    // De verborgen projecttaak telt niet als "stil" (dat is de cooldown-demping).
    expect(items[0].suppressedCount).toBe(0);
  });

  it("raakt niet-doorverwezen dossiers niet", () => {
    const gewoon = project("p-normaal", { comm: "bij_bureau", bureauActionHints: ["Werk concept uit"] });
    const items = assembleInbox({
      todos: [todo("t1", { auto_type: "request_no_response", related_request_id: "p-normaal" })],
      projects: [gewoon, referred],
      lastContactByProject: new Map(),
      today: TODAY,
      now: NOW,
    });
    expect(items.map((i) => i.projectId)).toEqual(["p-normaal"]);
    expect(items[0].todos).toHaveLength(1);
  });
});
