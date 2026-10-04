import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  addWorkingDays,
  amsterdamDate,
  claimDeadline,
  formatIsoDateNL,
  formatWeddingDateNL,
  isClaimWindowOpen,
  isValidIsoDate,
} from "./weddingReferralDates.ts";

Deno.test("addWorkingDays: vijf werkdagen, het weekend telt niet", () => {
  // maandag 28 september 2026 + 5 werkdagen = maandag 5 oktober
  assertEquals(addWorkingDays("2026-09-28", 5), "2026-10-05");
  // vrijdag 2 oktober + 5 werkdagen = vrijdag 9 oktober
  assertEquals(addWorkingDays("2026-10-02", 5), "2026-10-09");
  // zaterdag + 1 werkdag = maandag
  assertEquals(addWorkingDays("2026-10-03", 1), "2026-10-05");
  assertEquals(addWorkingDays("2026-10-03", 0), "2026-10-03");
});

Deno.test("de melding kan tot en met de vijfde werkdag, daarna is de termijn voorbij", () => {
  assertEquals(claimDeadline("2026-09-28"), "2026-10-05");
  assertEquals(isClaimWindowOpen("2026-09-28", "2026-09-28"), true);
  assertEquals(isClaimWindowOpen("2026-09-28", "2026-10-05"), true);
  assertEquals(isClaimWindowOpen("2026-09-28", "2026-10-06"), false);
});

Deno.test("amsterdamDate: rond middernacht telt de Nederlandse dag, niet de UTC-dag", () => {
  // 22:30 UTC op 4 oktober is 00:30 op 5 oktober in Nederland (zomertijd, UTC+2).
  assertEquals(amsterdamDate(new Date("2026-10-04T22:30:00Z")), "2026-10-05");
  assertEquals(amsterdamDate(new Date("2026-10-04T10:00:00Z")), "2026-10-04");
  // wintertijd (UTC+1)
  assertEquals(amsterdamDate(new Date("2026-12-10T23:30:00Z")), "2026-12-11");
});

Deno.test("isValidIsoDate: alleen echte kalenderdata", () => {
  assertEquals(isValidIsoDate("2026-10-04"), true);
  assertEquals(isValidIsoDate("2028-02-29"), true);
  assertEquals(isValidIsoDate("2026-02-29"), false);
  assertEquals(isValidIsoDate("2026-13-01"), false);
  assertEquals(isValidIsoDate("04-10-2026"), false);
  assertEquals(isValidIsoDate(""), false);
});

Deno.test("datums in het Nederlands, dag of alleen maand", () => {
  assertEquals(formatIsoDateNL("2027-06-12"), "12 juni 2027");
  assertEquals(formatWeddingDateNL("2027-06-12", "day"), "12 juni 2027");
  assertEquals(formatWeddingDateNL("2027-06-01", "month"), "juni 2027");
});
