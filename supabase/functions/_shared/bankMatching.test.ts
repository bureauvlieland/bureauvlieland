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

Deno.test("niets past: geen match", () => {
  const decision = decideMatch(suggestionsForLine({ direction: "in", amount: 999, description: "x" }, candidates));
  assertEquals(decision.status, "unmatched");
});
