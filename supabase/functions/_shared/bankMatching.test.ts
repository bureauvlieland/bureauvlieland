import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { decideMatch, suggestionsForLine, type MatchCandidates } from "./bankMatching.ts";

const candidates: MatchCandidates = {
  sales: [{ type: "sales", id: "s1", reference: "BV-2609-0007", amount: 1210 }],
  commission: [
    { type: "commission", id: "c1", reference: "BVC-2610-0001", amount: 121 },
    { type: "commission", id: "c2", reference: "BVC-2610-0002", amount: 60.5 },
  ],
  purchase: [{ type: "purchase", id: "p1", reference: "T-261008", amount: 206.42 }],
  batch: [{ type: "batch", id: "b1", reference: "BATCH-2026-10", amount: 1500 }],
};

Deno.test("inkomende betaling met BVC-nummer en bedrag: zekere commissiematch", () => {
  const suggestions = suggestionsForLine(
    { direction: "in", amount: 121, description: "Commissie BVC-2610-0001 Hotel Zeezicht" },
    candidates,
  );
  assertEquals(suggestions[0], { type: "commission", id: "c1", label: "BVC-2610-0001", amount: 121, confidence: 0.98 });
  const decision = decideMatch(suggestions);
  assertEquals(decision.status, "suggested");
  assertEquals(decision.matchedType, "commission");
  assertEquals(decision.automatic, true);
});

Deno.test("inkomend zonder referentie: alleen bedrag is een onzeker voorstel", () => {
  const suggestions = suggestionsForLine({ direction: "in", amount: 60.5, description: "overboeking" }, candidates);
  assertEquals(suggestions.length, 1);
  assertEquals(suggestions[0].id, "c2");
  assertEquals(suggestions[0].confidence, 0.5);
  const decision = decideMatch(suggestions);
  assertEquals(decision.status, "suggested");
  assertEquals(decision.automatic, false);
});

Deno.test("inkomend: verkoop- en commissiefacturen samen; uitgaand kijkt er niet naar", () => {
  const incoming = suggestionsForLine({ direction: "in", amount: 1210, description: "BV-2609-0007" }, candidates);
  assertEquals(incoming.map((s) => s.type), ["sales"]);
  const outgoing = suggestionsForLine({ direction: "out", amount: -121, description: "BVC-2610-0001" }, candidates);
  assertEquals(outgoing, []);
});

Deno.test("twee zekere kandidaten: meerdere, geen automatische match", () => {
  const twice: MatchCandidates = {
    ...candidates,
    commission: [
      { type: "commission", id: "c1", reference: "BVC-2610-0001", amount: 121 },
      { type: "commission", id: "c1b", reference: "BVC-2610-0001", amount: 121 },
    ],
  };
  const decision = decideMatch(suggestionsForLine({ direction: "in", amount: 121, description: "BVC-2610-0001" }, twice));
  assertEquals(decision.status, "ambiguous");
});

Deno.test("uitgaand: batch op referentie wint van inkoopfactuur op bedrag; batch zonder referentie telt niet", () => {
  const withRef = suggestionsForLine({ direction: "out", amount: -1500, description: "BATCH-2026-10" }, candidates);
  assertEquals(withRef[0].type, "batch");
  assertEquals(withRef[0].confidence, 0.98);
  const amountOnly = suggestionsForLine({ direction: "out", amount: -1500, description: "iets anders" }, candidates);
  assertEquals(amountOnly, []);
  const purchase = suggestionsForLine({ direction: "out", amount: -206.42, remittance_info: "factuur T-261008" }, candidates);
  assertEquals(purchase[0], { type: "purchase", id: "p1", label: "T-261008", amount: 206.42, confidence: 0.95 });
});

const DOEKSEN_IBAN = "NL91ABNA0417164300";
const incasso: MatchCandidates = {
  sales: [],
  commission: [],
  batch: [],
  purchase: [
    // Catering: Doeksen incasseert het volledige bedrag.
    { type: "purchase", id: "cat", reference: "20260124", amount: 348.85, iban: DOEKSEN_IBAN },
    // Overtochten: verzamelfactuur, commissie ingehouden, netto geïncasseerd.
    { type: "purchase", id: "over", reference: "20260301", amount: 1000, netAmount: 920, iban: DOEKSEN_IBAN },
    // Andere partner, zelfde bedrag als de catering: IBAN maakt het verschil.
    { type: "purchase", id: "ander", reference: "F-77", amount: 348.85, iban: "NL20INGB0001234567" },
  ],
};

Deno.test("incasso: tegenpartij-IBAN + bedrag is een zekere match, ook zonder factuurnummer", () => {
  const suggestions = suggestionsForLine(
    { direction: "out", amount: -348.85, description: "SEPA Incasso Rederij Doeksen", counterparty_iban: "NL91 ABNA 0417 1643 00" },
    incasso,
  );
  assertEquals(suggestions[0].id, "cat");
  assertEquals(suggestions[0].confidence, 0.95);
  const decision = decideMatch(suggestions);
  assertEquals(decision.status, "suggested");
  assertEquals(decision.matchedId, "cat");
  assertEquals(decision.automatic, true);
});

Deno.test("incasso: het nettobedrag na ingehouden commissie telt als bedragmatch", () => {
  const net = suggestionsForLine(
    { direction: "out", amount: -920, description: "SEPA Incasso", counterparty_iban: DOEKSEN_IBAN },
    incasso,
  );
  assertEquals(net[0].id, "over");
  assertEquals(net[0].confidence, 0.95);
  const gross = suggestionsForLine({ direction: "out", amount: -1000, description: "20260301" }, incasso);
  assertEquals(gross[0].id, "over");
  assertEquals(gross[0].confidence, 0.95);
});

Deno.test("incasso: zelfde bedrag bij een andere partner blijft een onzeker voorstel", () => {
  const suggestions = suggestionsForLine(
    { direction: "out", amount: -348.85, description: "overboeking", counterparty_iban: "NL00BANK0000000000" },
    incasso,
  );
  assertEquals(suggestions.map((s) => [s.id, s.confidence]), [["cat", 0.4], ["ander", 0.4]]);
  assertEquals(decideMatch(suggestions).status, "ambiguous");
});

Deno.test("incasso: alleen de IBAN klopt, dan zwakke voorstellen voor alle open facturen van die partner", () => {
  const suggestions = suggestionsForLine(
    { direction: "out", amount: -1268.85, description: "SEPA Incasso", counterparty_iban: DOEKSEN_IBAN },
    incasso,
  );
  assertEquals(suggestions.map((s) => [s.id, s.confidence]), [["cat", 0.3], ["over", 0.3]]);
  assertEquals(decideMatch(suggestions).automatic, false);
});

Deno.test("niets past: geen match", () => {
  const decision = decideMatch(suggestionsForLine({ direction: "in", amount: 999, description: "x" }, candidates));
  assertEquals(decision.status, "unmatched");
});
