import { describe, it, expect } from "vitest";
import {
  normalizeForMatch,
  suggestProjectFromText,
  type SuggestableProject,
} from "@/lib/purchaseInvoiceProjectSuggestion";

const project = (over: Partial<SuggestableProject> & { id: string }): SuggestableProject => ({
  reference_number: null,
  customer_name: null,
  customer_company: null,
  ...over,
});

const projects: SuggestableProject[] = [
  project({ id: "p-nieuw", reference_number: "BV-2609-0044", customer_company: "Adviesbureau Zeewind", customer_name: "Karin de Boer" }),
  project({ id: "p-houtmolen", reference_number: "BV-2606-0012", customer_company: "Timmerfabriek de Houtmolen", customer_name: "Jan Bakker" }),
  project({ id: "p-kaal", reference_number: "BV-2606-0013", customer_name: "Piet Jansen" }),
];

/** De tekst zoals hij van de Doeksen-factuur komt. */
const doeksenTekst = [
  "14 personen koffie, thee en appelgebak genuttigd aan boord van het ms Vlieland op vrijdag 5 juni jl 09.05 uur.",
  "14 diverse plates. Diverse drankjes genuttigd aan boord van het ms Vlieland op vrijdag 5 juni jl 16.50 uur.",
  "Groep: Timmerfabriek de Houtmolen",
].join(" ");

describe("projectsuggestie uit de factuurtekst", () => {
  it("herkent de groep die de partner onderaan de factuur zet", () => {
    const suggestion = suggestProjectFromText(doeksenTekst, projects);
    expect(suggestion).toMatchObject({
      projectId: "p-houtmolen",
      reason: "company",
      matchedOn: "Timmerfabriek de Houtmolen",
    });
  });

  it("laat het referentienummer winnen van een naam", () => {
    const text = "Betreft BV-2609-0044. Groep: Timmerfabriek de Houtmolen";
    expect(suggestProjectFromText(text, projects)).toMatchObject({
      projectId: "p-nieuw",
      reason: "reference",
    });
  });

  it("valt terug op de klantnaam als er geen bedrijfsnaam is", () => {
    expect(suggestProjectFromText("Groep van Piet Jansen, 12 personen", projects)).toMatchObject({
      projectId: "p-kaal",
      reason: "customer",
    });
  });

  it("stoort zich niet aan hoofdletters, accenten en leestekens", () => {
    expect(
      suggestProjectFromText("GROEP:  TIMMERFABRIEK-DE-HOUTMOLEN!", projects)?.projectId,
    ).toBe("p-houtmolen");
  });

  it("negeert de rechtsvorm, zodat 'Zeewind BV' ook 'Adviesbureau Zeewind' vindt", () => {
    const met = [project({ id: "p-bv", customer_company: "Adviesbureau Zeewind B.V." })];
    expect(suggestProjectFromText("factuur voor adviesbureau zeewind", met)?.projectId).toBe("p-bv");
  });

  it("geeft niets terug als er niets in de tekst staat", () => {
    expect(suggestProjectFromText("Vervoer en consumpties aan boord", projects)).toBeNull();
    expect(suggestProjectFromText("", projects)).toBeNull();
  });

  it("doet geen suggestie op een te korte naam", () => {
    // "Ad" komt in willekeurige factuurtekst voor; daar wil je niet op matchen.
    const kort = [project({ id: "p-kort", customer_company: "Ad" })];
    expect(suggestProjectFromText("advies en administratie", kort)).toBeNull();
  });

  it("kiest bij gelijke sterkte het project dat als eerste wordt aangeboden", () => {
    // De aanroeper levert ze op datum aan, dus dat is het meest recente project.
    const dubbel = [
      project({ id: "p-recent", customer_company: "Timmerfabriek de Houtmolen" }),
      project({ id: "p-oud", customer_company: "Timmerfabriek de Houtmolen" }),
    ];
    expect(suggestProjectFromText(doeksenTekst, dubbel)?.projectId).toBe("p-recent");
  });
});

describe("normalizeForMatch", () => {
  it("maakt tekst vergelijkbaar", () => {
    expect(normalizeForMatch("  Café  de Één-Hoorn B.V.! ")).toBe("cafe de een hoorn b v");
  });
});
