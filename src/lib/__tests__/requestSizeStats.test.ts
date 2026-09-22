import { describe, expect, it } from "vitest";
import { buildSizeStats, describeEntryPaths, periodStart, sizeBucket, type SizeStatsRequest } from "@/lib/requestSizeStats";

const now = new Date("2026-09-22T12:00:00Z");
const req = (extra: Partial<SizeStatsRequest>): SizeStatsRequest => ({
  number_of_people: 20,
  status: "active",
  created_at: "2026-09-01T10:00:00Z",
  selected_dates: ["2026-10-01"],
  attribution: null,
  linked_accommodation_id: null,
  terms_accepted_at: null,
  ...extra,
});

describe("sizeBucket", () => {
  it("deelt in op de grenzen 20, 50 en 100", () => {
    expect([null, 0, 19, 20, 49, 50, 99, 100, 166].map(sizeBucket)).toEqual([
      "onder_20", "onder_20", "onder_20", "20_49", "20_49", "50_99", "50_99", "100_plus", "100_plus",
    ]);
  });
});

describe("periodStart", () => {
  it("kent dit jaar, 90 dagen en alles", () => {
    expect(periodStart("dit_jaar", now)?.getFullYear()).toBe(2026);
    expect(periodStart("dit_jaar", now)?.getMonth()).toBe(0);
    expect(periodStart("90_dagen", now)?.toISOString()).toBe("2026-06-24T12:00:00.000Z");
    expect(periodStart("alles", now)).toBeNull();
  });
});

describe("buildSizeStats", () => {
  const requests: SizeStatsRequest[] = [
    req({ number_of_people: 6, attribution: { entry_path: "/" } }),
    req({ number_of_people: 12, status: "cancelled", attribution: { entry_path: "/bouwstenen?x=1" } }),
    req({ number_of_people: 30, terms_accepted_at: "2026-09-05T00:00:00Z", linked_accommodation_id: "a", selected_dates: ["2026-10-01", "2026-10-02"] }),
    req({ number_of_people: 115, linked_accommodation_id: "b", selected_dates: ["2026-09-10", "2026-09-11"], attribution: { entry_path: "/" } }),
    req({ number_of_people: 130, created_at: "2026-02-10T10:00:00Z", selected_dates: ["2026-06-12", "2026-06-13", "2026-06-14"] }),
    req({ number_of_people: 55, status: "deleted" }),
    req({ number_of_people: 80, created_at: "2025-12-01T10:00:00Z" }),
    req({ number_of_people: 40, created_at: "rommel" }),
  ];

  it("telt per klasse en in totaal, zonder verwijderde aanvragen", () => {
    const rows = buildSizeStats(requests, "alles", now);
    expect(rows.map((r) => [r.key, r.aanvragen, r.lopend, r.getekend, r.geannuleerd, r.metLogies, r.meerdaags])).toEqual([
      ["onder_20", 2, 1, 0, 1, 0, 0],
      ["20_49", 1, 1, 1, 0, 1, 1],
      ["50_99", 1, 1, 0, 0, 0, 0],
      ["100_plus", 2, 2, 0, 0, 1, 2],
      ["totaal", 6, 5, 1, 1, 2, 3],
    ]);
    expect(rows[0].instappaginas).toEqual([{ path: "/", count: 1 }, { path: "/bouwstenen", count: 1 }]);
    expect(rows[4].instappaginas[0]).toEqual({ path: "", count: 3 });
  });

  it("beperkt tot de periode op aanmaakdatum", () => {
    expect(buildSizeStats(requests, "dit_jaar", now).at(-1)?.aanvragen).toBe(5);
    expect(buildSizeStats(requests, "90_dagen", now).at(-1)?.aanvragen).toBe(4);
  });

  it("beschrijft de instappagina's leesbaar", () => {
    expect(describeEntryPaths([{ path: "/bedrijfsuitje-vlieland", count: 3 }, { path: "", count: 2 }, { path: "/", count: 1 }, { path: "/x", count: 1 }])).toBe(
      "/bedrijfsuitje-vlieland 3 · onbekend 2 · / 1",
    );
    expect(describeEntryPaths([])).toBe("");
  });
});
