import { assertEquals, assertStringIncludes } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { buildUserPrompt, parseDraft } from "./index.ts";

Deno.test("buildUserPrompt zet programma, feiten en citaat in de opdracht", () => {
  const prompt = buildUserPrompt({
    company: "Districon Group",
    group_size: 24,
    program_date: "2026-06-12",
    days: 2,
    program: [
      { label: "Dag 1", date: "2026-06-12", items: [{ time: "10:30", name: "Zeehondentocht", category: "activity" }] },
      { label: "Dag 2", date: "2026-06-13", items: [] },
    ],
    facts: [{ label: "Groepsgrootte", value: "24 personen" }],
    quote: "Alles liep perfect.",
    quote_author: "Ilona Norbart",
    quote_role: "Officemanager",
    landing_path: "/bedrijfsuitje-vlieland",
  });
  assertStringIncludes(prompt, "Organisatie: Districon Group");
  assertStringIncludes(prompt, "- Dag 1 (2026-06-12): 10:30 Zeehondentocht (activity)");
  assertStringIncludes(prompt, "- Dag 2 (2026-06-13): geen onderdelen");
  assertStringIncludes(prompt, "- Groepsgrootte: 24 personen");
  assertStringIncludes(prompt, 'Ilona Norbart (Officemanager): "Alles liep perfect."');
});

Deno.test("parseDraft: beperkt en valideert", () => {
  assertEquals(parseDraft(null), null);
  assertEquals(parseDraft({ title: "", paragraphs: ["x"] }), null);
  assertEquals(parseDraft({ title: "Titel.", intro: "Intro", paragraphs: [] }), null);
  const d = parseDraft({ title: "Twee dagen Vlieland met Districon.", intro: " Intro ", paragraphs: [" Een. ", "", "Twee.", "Drie.", "Vier.", "Vijf."] });
  assertEquals(d?.title, "Twee dagen Vlieland met Districon");
  assertEquals(d?.intro, "Intro");
  assertEquals(d?.paragraphs, ["Een.", "Twee.", "Drie.", "Vier."]);
});
