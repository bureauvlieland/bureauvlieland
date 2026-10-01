import { describe, it, expect } from "vitest";
import {
  stripSourcePrefix,
  communicationIds,
  isThreadArchived,
  planThreadArchive,
  type ArchivableEmailItem,
} from "../emailThreadArchive";

const comm = (id: string, archived_at: string | null = null): ArchivableEmailItem => ({
  id: `c:${id}`,
  source: "communication",
  archived_at,
});
const log = (id: string, archived_at: string | null = null): ArchivableEmailItem => ({
  id: `l:${id}`,
  source: "email_log",
  archived_at,
});

describe("stripSourcePrefix", () => {
  it("verwijdert c: en l: prefixes", () => {
    expect(stripSourcePrefix("c:abc")).toBe("abc");
    expect(stripSourcePrefix("l:abc")).toBe("abc");
    expect(stripSourcePrefix("abc")).toBe("abc");
  });
});

describe("communicationIds", () => {
  it("negeert automatische email_log-items", () => {
    expect(communicationIds([comm("1"), log("2"), comm("3")])).toEqual(["1", "3"]);
  });
});

describe("isThreadArchived", () => {
  it("is false zonder berichten", () => {
    expect(isThreadArchived([])).toBe(false);
    expect(isThreadArchived([log("1")])).toBe(false);
  });

  it("is true voor een gesprek met alleen gearchiveerde automatische mails", () => {
    expect(isThreadArchived([log("1", "2026-01-01T00:00:00Z")])).toBe(true);
  });

  it("is false zolang één bericht niet gearchiveerd is", () => {
    expect(isThreadArchived([comm("1", "2026-01-01T00:00:00Z"), comm("2")])).toBe(false);
  });

  it("is true als alle berichten gearchiveerd zijn", () => {
    expect(isThreadArchived([comm("1", "2026-01-01T00:00:00Z"), log("2", "2026-01-01T00:00:00Z")])).toBe(true);
  });
});

describe("planThreadArchive", () => {
  const now = new Date("2026-02-01T12:00:00.000Z");

  it("archiveert alleen nog-niet-gearchiveerde berichten", () => {
    const plan = planThreadArchive([comm("1"), comm("2", "2026-01-01T00:00:00Z"), log("3")], true, now);
    expect(plan.ids).toEqual(["1"]);
    expect(plan.logIds).toEqual(["3"]);
    expect(plan.archivedAt).toBe(now.toISOString());
    expect(plan.noop).toBe(false);
  });

  it("haalt alleen gearchiveerde berichten terug en zet archived_at op null", () => {
    const plan = planThreadArchive([comm("1"), comm("2", "2026-01-01T00:00:00Z")], false, now);
    expect(plan.ids).toEqual(["2"]);
    expect(plan.archivedAt).toBeNull();
  });

  it("archiveert ook gesprekken met alleen automatische mails", () => {
    const plan = planThreadArchive([log("1")], true, now);
    expect(plan.ids).toEqual([]);
    expect(plan.logIds).toEqual(["1"]);
    expect(plan.noop).toBe(false);
  });

  it("is een noop bij een leeg gesprek", () => {
    expect(planThreadArchive([], true, now).noop).toBe(true);
  });

  it("raakt nooit dossiertabellen aan (geen project-ids in het plan)", () => {
    const plan = planThreadArchive([comm("1")], true, now);
    expect(Object.keys(plan)).toEqual(["ids", "logIds", "archivedAt", "noop"]);
  });
});
