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
