// Pure beoordelingslogica van de watchdog — apart zodat de tests hem kunnen
// importeren zonder een HTTP-server te starten.

export interface JobHealth {
  jobid: number;
  jobname: string;
  schedule: string;
  active: boolean;
  last_run_start: string | null;
  last_run_status: string | null;
  last_http_status: number | null;
  last_http_error: string | null;
  outcome: string;
  runs_last_24h: number;
  failures_last_7d: number;
}

/** Verwachte maximale stilte in uren, afgeleid uit de cron-expressie. */
export function expectedSilenceHours(schedule: string): number {
  const minute = schedule.trim().split(/\s+/)[1] ?? "*";
  // "15 * * * *" → elk uur; alles met een concreet uur → dagelijks.
  if (minute === "*" || minute.startsWith("*/")) return 3;
  return 26;
}

export interface Verdict {
  jobname: string;
  level: "alarm" | "info";
  reason: string;
}

/** Pure beoordeling — los getest in cronWatchdog.test.ts. */
export function judge(job: JobHealth, now: number): Verdict | null {
  if (!job.active) return null;

  const silenceLimit = expectedSilenceHours(job.schedule) * 3600_000;

  if (!job.last_run_start) {
    return { jobname: job.jobname, level: "alarm", reason: "heeft nog nooit gedraaid" };
  }
  const age = now - new Date(job.last_run_start).getTime();
  if (age > silenceLimit) {
    const hours = Math.round(age / 3600_000);
    return {
      jobname: job.jobname,
      level: "alarm",
      reason: `geen run in ${hours} uur (verwacht: ${job.schedule})`,
    };
  }
  if (job.last_run_status && job.last_run_status !== "succeeded") {
    return {
      jobname: job.jobname,
      level: "alarm",
      reason: `pg_cron-status "${job.last_run_status}"`,
    };
  }
  if (job.outcome === "fout") {
    return {
      jobname: job.jobname,
      level: "alarm",
      reason: `aanroep mislukt (HTTP ${job.last_http_status ?? "?"}${
        job.last_http_error ? ` — ${job.last_http_error}` : ""
      })`,
    };
  }
  if (job.outcome === "onbekend") {
    return {
      jobname: job.jobname,
      level: "info",
      reason: "uitkomst van de laatste aanroep is niet vastgelegd",
    };
  }
  return null;
}

