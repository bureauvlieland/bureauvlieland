import { describe, expect, it } from "vitest";
import {
  describeRequest,
  needsFromTemplate,
  parseEventTypeParam,
  parseNeedsParam,
  summaryForNotes,
  wishesFromTemplate,
} from "@/lib/requestForm";
import type { ProgramTemplate } from "@/types/programTemplate";

const block = (name: string, category: string) => ({ name, category }) as unknown as NonNullable<ProgramTemplate["items"]>[number]["block"];

const template: ProgramTemplate = {
  id: "eilanddag-compleet",
  name: "Eilanddag compleet",
  description: null,
  short_description: null,
  duration_days: 2,
  target_group: "Teams van 10 tot 40",
  image_url: null,
  indicative_price_pp: 95,
  is_published: true,
  sort_order: 1,
  items: [
    { id: "3", template_id: "t", block_id: "c", day_index: 1, preferred_time: null, notes: null, sort_order: 0, block: block("Strand-BBQ", "catering") },
    { id: "1", template_id: "t", block_id: "a", day_index: 0, preferred_time: null, notes: null, sort_order: 1, block: block("Wadexcursie", "excursies") },
    { id: "2", template_id: "t", block_id: "b", day_index: 0, preferred_time: null, notes: null, sort_order: 0, block: block("Veerboot", "vervoer") },
    { id: "4", template_id: "t", block_id: "d", day_index: 0, preferred_time: null, notes: null, sort_order: 2, block: block("Organisatiefee", "services") },
  ],
};

describe("parseNeedsParam", () => {
  it("leest vinkjes en oude namen, zonder dubbelen", () => {
    expect(parseNeedsParam("eten,overnachting")).toEqual(["eten", "overnachting"]);
    expect(parseNeedsParam("catering, logies, Eten")).toEqual(["eten", "overnachting"]);
    expect(parseNeedsParam("boot")).toEqual(["vervoer"]);
    expect(parseNeedsParam("onzin")).toEqual([]);
    expect(parseNeedsParam(null)).toEqual([]);
  });
});

describe("parseEventTypeParam", () => {
  it("accepteert alleen bekende soorten", () => {
    expect(parseEventTypeParam("Heisessie")).toBe("heisessie");
    expect(parseEventTypeParam("feestje")).toBeNull();
    expect(parseEventTypeParam(undefined)).toBeNull();
  });
});

describe("needsFromTemplate", () => {
  it("leidt de vinkjes af uit de categorieën en de duur, in vaste volgorde", () => {
    expect(needsFromTemplate(template)).toEqual(["activiteiten", "eten", "overnachting", "vervoer"]);
    expect(needsFromTemplate({ duration_days: 1, items: [template.items![1]] })).toEqual(["activiteiten"]);
    expect(needsFromTemplate({ duration_days: 1, items: [] })).toEqual([]);
  });
});

describe("wishesFromTemplate", () => {
  it("zet het voorbeeld per dag in de wensen, op volgorde", () => {
    const text = wishesFromTemplate(template);
    expect(text).toContain("Eilanddag compleet (2 dagen)");
    expect(text).toContain("Dag 1: Veerboot, Wadexcursie, Organisatiefee");
    expect(text).toContain("Dag 2: Strand-BBQ");
    expect(text.endsWith("Graag aanpassen aan onze groep:")).toBe(true);
  });

  it("laat 'Dag' weg bij één dag", () => {
    const text = wishesFromTemplate({ name: "Middag", duration_days: 1, items: [template.items![1]] });
    expect(text).toContain("Middag (1 dag)");
    expect(text).toContain("\nWadexcursie\n");
    expect(text).not.toContain("Dag 1");
  });
});

describe("describeRequest en summaryForNotes", () => {
  it("maakt één regel voor de admin en een korte kop voor de notities", () => {
    const input = { programType: "zakelijk" as const, eventType: "heisessie", needs: ["activiteiten", "eten"] as const, periodText: "voorjaar 2027", templateName: "Eilanddag compleet" };
    expect(describeRequest({ ...input, needs: [...input.needs] })).toBe(
      "Maatwerk zakelijk · Heisessie / MT-dag · activiteiten, eten en drinken · periode: voorjaar 2027 · voorbeeld: Eilanddag compleet",
    );
    expect(summaryForNotes({ ...input, needs: [...input.needs] })).toBe("Soort: Heisessie / MT-dag\nGewenst: activiteiten, eten en drinken\nPeriode: voorjaar 2027");
  });

  it("laat lege onderdelen weg", () => {
    expect(describeRequest({ programType: "prive", eventType: null, needs: [] })).toBe("Maatwerk prive");
    expect(summaryForNotes({ programType: "prive", eventType: null, needs: [] })).toBe("");
  });
});
