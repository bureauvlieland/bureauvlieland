import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  findDuplicateGroupsInSelection,
  findItemsAlreadyInvoiced,
  findLikelyDuplicate,
  looksLikeProjectReference,
} from "./purchaseInvoiceDuplicateRules.ts";

Deno.test("looksLikeProjectReference herkent BV- en LOG-referenties", () => {
  assertEquals(looksLikeProjectReference("BV-2602-0005"), true);
  assertEquals(looksLikeProjectReference("LOG-2503-0001"), true);
  assertEquals(looksLikeProjectReference("2026077"), false);
  assertEquals(looksLikeProjectReference("T-261008"), false);
});

Deno.test("findLikelyDuplicate vindt dezelfde factuur onder een ander nummer via bedrag + project", () => {
  const match = findLikelyDuplicate(
    { invoice_number: "2026077", invoice_date: "2026-09-14", amount_incl_vat: 2340, request_id: "r1" },
    [{ id: "portal", invoice_number: "BV-2602-0005", invoice_date: "2026-09-14", amount_incl_vat: 2340, request_id: "r1" }],
  );
  assertEquals(match?.invoice.id, "portal");
  assertEquals(match?.reason, "amount");
});

Deno.test("findLikelyDuplicate laat een andere factuur op een ander project door", () => {
  const match = findLikelyDuplicate(
    { invoice_number: "670", invoice_date: "2026-06-26", amount_incl_vat: 300, request_id: "r2" },
    [{ id: "a", invoice_number: "666", invoice_date: "2026-06-26", amount_incl_vat: 300, request_id: "r1" }],
  );
  assertEquals(match, null);
});

Deno.test("findDuplicateGroupsInSelection vangt de dubbel betaalde T-261008", () => {
  const groups = findDuplicateGroupsInSelection([
    { id: "a", partner_id: "zuiver", invoice_number: "T-261008", invoice_date: "2026-06-02", amount_incl_vat: 225, request_id: "r1" },
    { id: "b", partner_id: "zuiver", invoice_number: "T-261008", invoice_date: "2026-06-08", amount_incl_vat: 225, request_id: "r1" },
    { id: "c", partner_id: "zuiver", invoice_number: "T-261010", invoice_date: "2026-06-02", amount_incl_vat: 2614.5, request_id: "r2" },
  ]);
  assertEquals(groups.length, 1);
  assertEquals(groups[0].reason, "number");
  assertEquals(groups[0].rows.map((r) => r.id), ["a", "b"]);
});

Deno.test("findItemsAlreadyInvoiced kijkt alleen naar de gevraagde onderdelen", () => {
  const found = findItemsAlreadyInvoiced(["i1"], [
    { item_id: "i1", invoice_id: "x", invoice_number: "2026077" },
    { item_id: "i2", invoice_id: "y", invoice_number: "1" },
  ]);
  assertEquals([...found.keys()], ["i1"]);
});
