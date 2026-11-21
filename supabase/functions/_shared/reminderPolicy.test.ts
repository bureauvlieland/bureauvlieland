import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { decideReminder } from "./reminderPolicy.ts";

const now = new Date("2026-11-21T08:00:00Z");
const daysAgo = (d: number) => new Date(now.getTime() - d * 86_400_000).toISOString();

Deno.test("eerste keer: sturen", () => {
  assertEquals(decideReminder([], {}, now), { send: true, reason: "eerste_keer" });
});

Deno.test("vaste reeks (standaard): na één verzending nooit meer, ook niet na weken", () => {
  assertEquals(decideReminder([daysAgo(1)], {}, now).send, false);
  assertEquals(decideReminder([daysAgo(60)], {}, now).send, false);
  assertEquals(decideReminder([daysAgo(60)], {}, now).reason, "plafond_bereikt");
});

Deno.test("herhalende herinnering: elke 7 dagen, tot drie keer", () => {
  const policy = { maxSends: 3, repeatDays: 7 };
  assertEquals(decideReminder([daysAgo(3)], policy, now), { send: false, reason: "te_recent" });
  assertEquals(decideReminder([daysAgo(8)], policy, now), { send: true, reason: "herhaling" });
  assertEquals(decideReminder([daysAgo(8), daysAgo(16)], policy, now).send, true);
  assertEquals(
    decideReminder([daysAgo(8), daysAgo(16), daysAgo(24)], policy, now),
    { send: false, reason: "plafond_bereikt" },
  );
});

Deno.test("de nieuwste verzending telt voor de afstand, niet de oudste", () => {
  assertEquals(decideReminder([daysAgo(30), daysAgo(2)], { maxSends: 5, repeatDays: 7 }, now).send, false);
});

Deno.test("meer rijen dan het plafond (oude lus): sturen blijft uit", () => {
  const many = Array.from({ length: 24 }, (_, i) => daysAgo(7 * i + 1));
  assertEquals(decideReminder(many, { maxSends: 3, repeatDays: 7 }, now).send, false);
});

Deno.test("onleesbare tijdstippen worden genegeerd", () => {
  assertEquals(decideReminder(["geen datum"], {}, now).send, true);
});
