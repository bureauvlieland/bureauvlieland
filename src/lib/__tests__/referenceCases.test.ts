import { describe, expect, it } from "vitest";
import {
  buildPhotos,
  buildProgramDays,
  buildReferenceSnapshot,
  caseMeta,
  kindFromTitle,
  normalizeCase,
  parseBlocksParam,
  slugify,
  suggestSlug,
  wizardUrlForProgram,
  type SnapshotInput,
  type SnapshotItem,
} from "@/lib/referenceCases";

const item = (extra: Partial<SnapshotItem>): SnapshotItem => ({
  day_index: 0,
  preferred_time: null,
  confirmed_time: null,
  block_name: "Onderdeel",
  block_category: "outdoor",
  block_id: null,
  provider_name: "Bureau Vlieland",
  status: "confirmed",
  ...extra,
});

const input = (extra: Partial<SnapshotInput> = {}): SnapshotInput => ({
  request: {
    reference_number: "BV-2026-041",
    customer_name: "Ilona de Vries",
    customer_company: "Districon",
    number_of_people: 24,
    selected_dates: ["2026-05-13", "2026-05-12"],
    attribution: { entry_path: "/bedrijfsuitje-vlieland?utm=x" },
  },
  items: [
    item({ day_index: 1, preferred_time: "10:00", block_name: "Wadexcursie", block_id: "wadexcursie", block_category: "excursies" }),
    item({ day_index: 0, preferred_time: "14:00", block_name: "Zeehondentocht", block_id: "zeehondentocht", block_category: "excursies", provider_name: "Rederij Zeehond" }),
    item({ day_index: 0, preferred_time: "11:30", block_name: "Lunch op het strand", block_id: "strand-lunch", block_category: "catering" }),
    item({ day_index: 0, block_name: "Fietsen", block_id: "fiets-huur" }),
    item({ day_index: 0, preferred_time: "09:00", block_name: "Geannuleerd", block_id: "geannuleerd", status: "cancelled" }),
  ],
  blocks: [
    { id: "zeehondentocht", name: "Zeehondentocht", image: "https://cdn/zeehond.jpg" },
    { id: "strand-lunch", name: "Lunch", image: "https://cdn/lunch.jpg" },
    { id: "wadexcursie", name: "Wadexcursie", image: "https://cdn/wad.jpg" },
  ],
  review: { quote: "Perfect geregeld.", text_positive: "Alles liep perfect, van boot tot diner.", author_name: "Ilona de Vries", author_role: "HR-manager", company: "Districon B.V." },
  accommodation: "Strandhotel Seeduyn",
  kind: "Bedrijfsuitje",
  ...extra,
});

describe("slugify en suggestSlug", () => {
  it("maakt een schone slug zonder diakrieten", () => {
    expect(slugify("Ünïcode & Co. B.V.")).toBe("unicode-co-b-v");
  });

  it("stelt organisatie en maand voor en wijkt uit als de slug al bestaat", () => {
    expect(suggestSlug("Acme B.V.", "2026-05-12")).toBe("acme-b-v-mei-2026");
    expect(suggestSlug("Acme B.V.", "2026-05-12", ["acme-b-v-mei-2026", "acme-b-v-mei-2026-2"])).toBe("acme-b-v-mei-2026-3");
    expect(suggestSlug("", null)).toBe("groep");
  });

  it("haalt 'op Vlieland' van een paginatitel af", () => {
    expect(kindFromTitle("Bedrijfsuitje op Vlieland")).toBe("Bedrijfsuitje");
    expect(kindFromTitle("Zeehondentochten Vlieland")).toBe("Zeehondentochten");
  });
});

describe("buildProgramDays", () => {
  it("groepeert per dag, sorteert op tijd (zonder tijd achteraan) en laat geannuleerde weg", () => {
    const days = buildProgramDays(input().items, ["2026-05-12", "2026-05-13"], input().blocks);
    expect(days.map((d) => d.label)).toEqual(["Dag 1", "Dag 2"]);
    expect(days[0].date).toBe("2026-05-12");
    expect(days[0].items.map((i) => i.name)).toEqual(["Lunch op het strand", "Zeehondentocht", "Fietsen"]);
    expect(days[0].items.map((i) => i.time)).toEqual(["11:30", "14:00", null]);
    expect(days[0].items[1].provider).toBe("Rederij Zeehond");
    expect(days[0].items[2].image_url).toBeNull();
    expect(days[1].items[0].image_url).toBe("https://cdn/wad.jpg");
  });

  it("laat losse kosten buiten het programma (dag -1) weg", () => {
    const days = buildProgramDays([item({ day_index: -1, block_name: "Begeleiding Erwin - 4 uur" }), item({ block_name: "A" })], [], []);
    expect(days.map((d) => d.items.map((i) => i.name))).toEqual([["A"]]);
  });

  it("neemt de bevestigde tijd boven de gewenste", () => {
    const days = buildProgramDays([item({ preferred_time: "10:00:00", confirmed_time: "10:30:00", block_name: "A" })], [], []);
    expect(days[0].items[0].time).toBe("10:30");
  });
});

describe("buildPhotos", () => {
  it("geeft unieke foto's in programmavolgorde, hooguit vier", () => {
    const program = buildProgramDays(
      [
        item({ block_id: "a", preferred_time: "09:00" }),
        item({ block_id: "b", preferred_time: "10:00" }),
        item({ block_id: "a", preferred_time: "11:00" }),
        item({ block_id: "c", preferred_time: "12:00" }),
        item({ block_id: "d", preferred_time: "13:00" }),
        item({ block_id: "e", preferred_time: "14:00" }),
      ],
      [],
      ["a", "b", "c", "d", "e"].map((id) => ({ id, name: id.toUpperCase(), image: `https://cdn/${id}.jpg` })),
    );
    expect(buildPhotos(program).map((p) => p.url)).toEqual(["https://cdn/a.jpg", "https://cdn/b.jpg", "https://cdn/c.jpg", "https://cdn/d.jpg"]);
  });
});

describe("buildReferenceSnapshot", () => {
  it("bouwt de momentopname met feiten, teksten, citaat en bouwstenen", () => {
    const snapshot = buildReferenceSnapshot(input({ existingSlugs: ["districon-b-v-mei-2026"] }));
    expect(snapshot.slug).toBe("districon-b-v-mei-2026-2");
    expect(snapshot.title).toBe("Bedrijfsuitje van Districon B.V.");
    expect(snapshot.intro).toBe("Een tweedaags bedrijfsuitje voor 24 personen in mei 2026.");
    expect(snapshot.body).toBe("Dag 1 (12 mei): Lunch op het strand, Zeehondentocht, Fietsen.\n\nDag 2 (13 mei): Wadexcursie.");
    expect(snapshot.facts).toEqual([
      { label: "Soort", value: "Bedrijfsuitje" },
      { label: "Groepsgrootte", value: "24 personen" },
      { label: "Periode", value: "mei 2026" },
      { label: "Duur", value: "2 dagen" },
      { label: "Overnachting", value: "Strandhotel Seeduyn" },
    ]);
    expect(snapshot.quote).toBe("Perfect geregeld.");
    expect(snapshot.quote_author).toBe("Ilona de Vries");
    expect(snapshot.quote_role).toBe("HR-manager");
    expect(snapshot.company).toBe("Districon B.V.");
    expect(snapshot.group_size).toBe(24);
    expect(snapshot.program_date).toBe("2026-05-12");
    expect(snapshot.days).toBe(2);
    expect(snapshot.block_ids).toEqual(["strand-lunch", "zeehondentocht", "fiets-huur", "wadexcursie"]);
    expect(snapshot.photos.map((p) => p.block_id)).toEqual(["strand-lunch", "zeehondentocht", "wadexcursie"]);
    expect(snapshot.landing_path).toBe("/bedrijfsuitje-vlieland");
  });

  it("valt terug op de aanvraag zonder beoordeling en zonder instappagina", () => {
    const snapshot = buildReferenceSnapshot(input({ review: null, kind: null, accommodation: null, request: { ...input().request, attribution: null, selected_dates: "rommel" } }));
    expect(snapshot.title).toBe("Groepsprogramma van Districon");
    expect(snapshot.intro).toBe("Een tweedaags groepsprogramma voor 24 personen.");
    expect(snapshot.quote).toBe("");
    expect(snapshot.quote_author).toBe("");
    expect(snapshot.facts.map((f) => f.label)).toEqual(["Groepsgrootte", "Duur"]);
    expect(snapshot.days).toBe(2);
    expect(snapshot.program_date).toBeNull();
    expect(snapshot.landing_path).toBe("");
  });

  it("gebruikt de volledige tekst als er geen eigen citaat is", () => {
    const snapshot = buildReferenceSnapshot(input({ review: { ...input().review!, quote: null } }));
    expect(snapshot.quote).toBe("Alles liep perfect, van boot tot diner.");
  });
});

describe("Zoiets ook?", () => {
  it("bouwt het wizardpad met unieke bouwstenen per dag en leest het weer terug", () => {
    const program = buildProgramDays(input().items, [], input().blocks);
    const url = wizardUrlForProgram(program);
    expect(url).toBe("/programma-samenstellen?blocks=strand-lunch:0,zeehondentocht:0,fiets-huur:0,wadexcursie:1");
    expect(parseBlocksParam(new URL(`https://x${url}`).searchParams.get("blocks"))).toEqual([
      { blockId: "strand-lunch", dayIndex: 0 },
      { blockId: "zeehondentocht", dayIndex: 0 },
      { blockId: "fiets-huur", dayIndex: 0 },
      { blockId: "wadexcursie", dayIndex: 1 },
    ]);
  });

  it("negeert rommel in de parameter", () => {
    expect(parseBlocksParam("a:1,,a:2,<script>:0,b:-3,c:x,d:99")).toEqual([
      { blockId: "a", dayIndex: 1 },
      { blockId: "b", dayIndex: 0 },
      { blockId: "c", dayIndex: 0 },
      { blockId: "d", dayIndex: 13 },
    ]);
    expect(parseBlocksParam(null)).toEqual([]);
    expect(wizardUrlForProgram([])).toBe("/programma-samenstellen");
  });
});

describe("normalizeCase en caseMeta", () => {
  it("verdraagt rommel in de json-kolommen", () => {
    const c = normalizeCase({
      id: "1",
      slug: "x",
      title: "T",
      days: 0,
      facts: [{ label: "Duur", value: "1 dag" }, { label: "" }, "nee"],
      program: [{ items: [{ name: "A" }, { name: "" }, 5] }, null],
      photos: [{ url: "https://cdn/a.jpg" }, { alt: "zonder url" }],
      block_ids: ["a", 3, null],
      updated_at: "2026-09-22T10:00:00Z",
    });
    expect(c.days).toBe(1);
    expect(c.facts).toEqual([{ label: "Duur", value: "1 dag" }]);
    expect(c.program).toEqual([{ day_index: 0, label: "Dag 1", date: null, items: [{ time: null, name: "A", category: "", block_id: null, image_url: null, provider: "" }] }]);
    expect(c.photos).toEqual([{ url: "https://cdn/a.jpg", alt: "", block_id: null }]);
    expect(c.block_ids).toEqual(["a"]);
    expect(caseMeta({ group_size: 24, days: 2, program_date: "2026-05-12" })).toBe("24 personen · 2 dagen · mei 2026");
    expect(caseMeta({ group_size: null, days: 1, program_date: null })).toBe("1 dag");
  });
});
