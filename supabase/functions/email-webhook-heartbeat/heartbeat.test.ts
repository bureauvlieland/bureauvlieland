import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { evaluateHeartbeat, MIN_SENT_FOR_ALERT } from "./index.ts";

Deno.test("events ontvangen ⇒ ok", () => {
  assertEquals(
    evaluateHeartbeat({ sentCount: 20, eventCount: 5, rejectedAttempts: 0 }),
    "ok",
  );
});

Deno.test("Mailjet klopt aan maar wordt geweigerd ⇒ misconfigured", () => {
  assertEquals(
    evaluateHeartbeat({ sentCount: 20, eventCount: 0, rejectedAttempts: 12 }),
    "misconfigured",
  );
});

Deno.test("mail verstuurd, geen events en geen pogingen ⇒ silent", () => {
  assertEquals(
    evaluateHeartbeat({ sentCount: 20, eventCount: 0, rejectedAttempts: 0 }),
    "silent",
  );
});

Deno.test("geen mail verstuurd ⇒ idle (geen alarm)", () => {
  assertEquals(
    evaluateHeartbeat({ sentCount: 0, eventCount: 0, rejectedAttempts: 0 }),
    "idle",
  );
});

Deno.test("misconfigured weegt zwaarder dan stilte, ook zonder verzendvolume", () => {
  assertEquals(
    evaluateHeartbeat({ sentCount: 0, eventCount: 0, rejectedAttempts: 3 }),
    "misconfigured",
  );
});

Deno.test("alarmdrempel voor stilte is bewust laag maar niet 0", () => {
  assertEquals(MIN_SENT_FOR_ALERT >= 1 && MIN_SENT_FOR_ALERT <= 5, true);
});

import { assertStringIncludes } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { buildHeartbeatAlert, HEARTBEAT_TODO_ENTITY } from "./index.ts";

Deno.test("alarmtekst: wat het betekent en wat te doen bovenaan, techniek eronder; taaktekst in dezelfde volgorde", () => {
  const t = buildHeartbeatAlert({ verdict: "silent", sentCount: 12, rejectedAttempts: 0 });
  assertEquals(t.html.indexOf("Wat betekent dit") < t.html.indexOf("Wat te doen"), true);
  assertEquals(t.html.indexOf("Wat te doen") < t.html.indexOf("Technische details"), true);
  assertStringIncludes(t.html, "Email health");
  assertStringIncludes(t.reason, "12 mails");
  assertEquals(t.todoDescription.split("\n")[0].startsWith("Wat betekent dit:"), true);

  const m = buildHeartbeatAlert({ verdict: "misconfigured", sentCount: 0, rejectedAttempts: 4 });
  assertStringIncludes(m.reason, "4 keer");
});

Deno.test("de Werkbank-taak heeft één vaste sleutel (geen taak per dag)", () => {
  assertEquals(HEARTBEAT_TODO_ENTITY.includes("20"), false);
});
