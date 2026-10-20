import { describe, it, expect } from "vitest";
import {
  normalizeForMatch,
  shouldPreselectProject,
  stripSalutation,
  suggestProjectFromText,
  surnameOf,
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

describe("particuliere klant met aanhef en voorletters", () => {
  // Zo staat de klant bij ons: met aanhef en voorletter. Badhotel Bruin zette
  // op de logiesfactuur alleen "Mw. Swagerman", en het project werd niet gevonden.
  const swagerman = [
    project({ id: "p-swagerman", reference_number: "BV-2606-0013", customer_name: "Mevrouw. M. Swagerman" }),
  ];

  it("vindt de klant als de partner de aanhef anders schrijft", () => {
    expect(suggestProjectFromText("Logies Classic Garden, gast: Mw. M. Swagerman", swagerman)).toMatchObject({
      projectId: "p-swagerman",
      reason: "customer",
      matchedOn: "Mevrouw. M. Swagerman",
    });
  });

  it("vindt de klant op alleen de achternaam, met minder gewicht", () => {
    expect(suggestProjectFromText("Logies t.n.v. Swagerman, 3 kamers", swagerman)).toMatchObject({
      projectId: "p-swagerman",
      reason: "surname",
      matchedOn: "swagerman",
    });
    expect(shouldPreselectProject(suggestProjectFromText("gast Swagerman", swagerman))).toBe(false);
  });

  it("laat de volledige naam winnen van alleen de achternaam", () => {
    const twee = [
      project({ id: "p-ander", customer_name: "Dhr. K. Swagerman" }),
      project({ id: "p-deze", customer_name: "Mevrouw. M. Swagerman" }),
    ];
    expect(suggestProjectFromText("Gast: M. Swagerman", twee)?.projectId).toBe("p-deze");
  });

  it("doet geen suggestie op een korte of veelvoorkomende achternaam", () => {
    const jansen = [project({ id: "p-jansen", customer_name: "Mw. A. Jansen" })];
    expect(suggestProjectFromText("Consumpties Jansen", jansen)).toBeNull();
  });

  it("matcht alleen op hele woorden, zodat 'de Boer' niet in 'boerderij' zit", () => {
    const deBoer = [project({ id: "p-boer", customer_name: "Fam. de Boer" })];
    expect(suggestProjectFromText("Lunch op de boerderij", deBoer)).toBeNull();
    expect(suggestProjectFromText("Lunch voor fam. De Boer", deBoer)?.projectId).toBe("p-boer");
  });

  it("haalt de aanhef van de naam af", () => {
    expect(stripSalutation("mevrouw m swagerman")).toBe("m swagerman");
    expect(stripSalutation("dhr en mw jansen")).toBe("jansen");
    expect(stripSalutation("de heer p de vries")).toBe("p de vries");
    expect(stripSalutation("karin de boer")).toBe("karin de boer");
  });

  it("kent de achternaam met voorvoegsels", () => {
    expect(surnameOf("m swagerman")).toBe("swagerman");
    expect(surnameOf("karin de boer")).toBe("de boer");
    expect(surnameOf("p van der berg")).toBe("van der berg");
    expect(surnameOf("swagerman")).toBeNull();
    expect(surnameOf("de vries")).toBeNull();
  });
});

describe("normalizeForMatch", () => {
  it("maakt tekst vergelijkbaar", () => {
    expect(normalizeForMatch("  Café  de Één-Hoorn B.V.! ")).toBe("cafe de een hoorn b v");
  });
});

describe("vast voorkiezen van het project", () => {
  it("kiest voor bij ons referentienummer op de factuur", () => {
    const suggestion = suggestProjectFromText("Betreft: BV-2606-0012, groepsreis", projects);
    expect(suggestion?.reason).toBe("reference");
    expect(shouldPreselectProject(suggestion)).toBe(true);
  });

  it("laat een naamtreffer een suggestie", () => {
    const suggestion = suggestProjectFromText(doeksenTekst, projects);
    expect(suggestion?.reason).toBe("company");
    expect(shouldPreselectProject(suggestion)).toBe(false);
    expect(shouldPreselectProject(null)).toBe(false);
  });
});
