import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { BOARD_LABELS, boardLabel } from "./lodgingBoard.ts";

Deno.test("boardLabel: bekende waarden in het Nederlands, leeg blijft leeg", () => {
  assertEquals(boardLabel("breakfast"), "Logies & ontbijt");
  assertEquals(boardLabel(null), "");
  assertEquals(boardLabel(""), "");
});

Deno.test("boardLabel: toelichting erbij, bij 'anders' als uitleg", () => {
  assertEquals(boardLabel("other", "ontbijt op aanvraag"), "Anders / in overleg: ontbijt op aanvraag");
  assertEquals(boardLabel("half_board", "diner om 18:00"), "Halfpension (diner om 18:00)");
});

Deno.test("spiegel van BOARD_TYPES in src/types/accommodation.ts", async () => {
  const src = await Deno.readTextFile(new URL("../../../src/types/accommodation.ts", import.meta.url));
  for (const [value, label] of Object.entries(BOARD_LABELS)) {
    assertEquals(src.includes(`value: '${value}', label: '${label}'`), true, `${value} ontbreekt of heeft een ander label in src/types/accommodation.ts`);
  }
});
