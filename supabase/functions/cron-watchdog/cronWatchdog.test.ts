import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { expectedSilenceHours, judge } from "./logic.ts";

const NOW = new Date("2026-09-02T08:00:00Z").getTime();

function job(over: Partial<Parameters<typeof judge>[0]> = {}) {
  return {
    jobid: 1,
    jobname: "test-job",
    schedule: "0 6 * * *",
    active: true,
    last_run_start: new Date(NOW - 2 * 3600_000).toISOString(),
    last_run_status: "succeeded",
    last_http_status: 200,
    last_http_error: null,
    outcome: "ok",
    runs_last_24h: 1,
    failures_last_7d: 0,
    ...over,
  } as Parameters<typeof judge>[0];
}

Deno.test("gezonde dagelijkse taak geeft geen melding", () => {
  assertEquals(judge(job(), NOW), null);
});

Deno.test("uitgeschakelde taak wordt genegeerd", () => {
  assertEquals(judge(job({ active: false, last_run_start: null }), NOW), null);
});

Deno.test("nooit gedraaid = alarm", () => {
  assertEquals(judge(job({ last_run_start: null }), NOW)?.level, "alarm");
});

Deno.test("stilte langer dan 26 uur bij een dagelijkse taak = alarm", () => {
  const v = judge(job({ last_run_start: new Date(NOW - 30 * 3600_000).toISOString() }), NOW);
  assertEquals(v?.level, "alarm");
});

Deno.test("stilte van 25 uur bij een dagelijkse taak is nog geen alarm", () => {
  assertEquals(judge(job({ last_run_start: new Date(NOW - 25 * 3600_000).toISOString() }), NOW), null);
});

Deno.test("uurtaak alarmeert al na 3 uur stilte", () => {
  const v = judge(
    job({ schedule: "15 * * * *", last_run_start: new Date(NOW - 4 * 3600_000).toISOString() }),
    NOW,
  );
  assertEquals(v?.level, "alarm");
});

Deno.test("mislukte pg_cron-run = alarm", () => {
  assertEquals(judge(job({ last_run_status: "failed" }), NOW)?.level, "alarm");
});

Deno.test("HTTP-fout achter een geslaagde aanroep = alarm (dit werd eerder groen getoond)", () => {
  const v = judge(job({ outcome: "fout", last_http_status: 500 }), NOW);
  assertEquals(v?.level, "alarm");
  assertEquals(v?.reason.includes("500"), true);
});

Deno.test("onbekende uitkomst wordt gemeld, niet gealarmeerd", () => {
  assertEquals(judge(job({ outcome: "onbekend", last_http_status: null }), NOW)?.level, "info");
});

Deno.test("expectedSilenceHours leidt de cadans uit het schema af", () => {
  assertEquals(expectedSilenceHours("15 * * * *"), 3);
  assertEquals(expectedSilenceHours("*/10 * * * *"), 3);
  assertEquals(expectedSilenceHours("0 6 * * *"), 26);
});

Deno.test("net ingestelde taak die nog niet gedraaid heeft is info, geen alarm", () => {
  const v = judge(
    job({ last_run_start: null, known_since: new Date(NOW - 3600_000).toISOString() }),
    NOW,
  );
  assertEquals(v?.level, "info");
});

Deno.test("taak die al langer bekend is en nooit draaide blijft alarm", () => {
  const v = judge(
    job({ last_run_start: null, known_since: new Date(NOW - 72 * 3600_000).toISOString() }),
    NOW,
  );
  assertEquals(v?.level, "alarm");
});

import { buildWatchdogAlertMail, buildWatchdogTodo, jobConsequence } from "./logic.ts";
import { assertStringIncludes } from "https://deno.land/std@0.224.0/assert/mod.ts";

Deno.test("taaktekst: 'Automatische taak faalt' met gevolg, wat te doen en het technische detail eronder", () => {
  const todo = buildWatchdogTodo({ jobname: "auto-close-past-execution", level: "alarm", reason: "aanroep mislukt (HTTP 500)" });
  assertEquals(todo.title, "Automatische taak faalt: auto-close-past-execution");
  const regels = todo.description.split("\n");
  assertStringIncludes(regels[0], "Wat betekent dit:");
  assertStringIncludes(regels[0], "uitgevoerd");
  assertStringIncludes(regels[1], "Wat te doen: Open Email health");
  assertStringIncludes(regels[2], "HTTP 500");
});

Deno.test("verzamelmail: gewone taal bovenaan, techniek onderaan, één onderwerp per aantal", () => {
  const een = buildWatchdogAlertMail([{ jobname: "check-pending-items", level: "alarm", reason: "geen run in 36 uur (verwacht: 0 7 * * *)" }], "https://bureauvlieland.nl/admin/email-health");
  assertEquals(een.subject, "[ALERT] Automatische taak faalt: check-pending-items");
  assertStringIncludes(een.html, "Wat betekent dit:");
  assertStringIncludes(een.html, "herinneringen");
  assertStringIncludes(een.html, "Wat te doen:");
  assertStringIncludes(een.html, "Open Email health");
  // Het technische detail staat ná de instructie.
  assertEquals(een.html.indexOf("Wat te doen") < een.html.indexOf("0 7 * * *"), true);

  const twee = buildWatchdogAlertMail([
    { jobname: "a", level: "alarm", reason: "x" },
    { jobname: "b", level: "alarm", reason: "y" },
  ], "https://bureauvlieland.nl/admin/email-health");
  assertEquals(twee.subject, "[ALERT] 2 automatische taken falen");
});

Deno.test("onbekende taaknaam krijgt een neutrale gevolg-zin die naar Email health verwijst", () => {
  assertStringIncludes(jobConsequence("iets-nieuws"), "Email health");
});
