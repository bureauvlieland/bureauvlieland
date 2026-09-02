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
