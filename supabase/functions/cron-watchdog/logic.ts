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
  /**
   * Moment waarop we deze taak voor het eerst zagen (public.cron_job_first_seen).
   * Een net ingestelde taak die nog niet aan de beurt was is géén storing.
   */
  known_since?: string | null;
}

/** Verwachte maximale stilte in uren, afgeleid uit de cron-expressie. */
export function expectedSilenceHours(schedule: string): number {
  const hourField = schedule.trim().split(/\s+/)[1] ?? "*";
  // "15 * * * *" → elk uur; alles met een concreet uur → dagelijks.
  if (hourField === "*" || hourField.startsWith("*/")) return 3;
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
    const knownFor = job.known_since ? now - new Date(job.known_since).getTime() : Infinity;
    if (knownFor < silenceLimit) {
      return {
        jobname: job.jobname,
        level: "info",
        reason: "net ingesteld, eerste run nog niet verwacht",
      };
    }
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


// ---------------------------------------------------------------------------
// Teksten voor Erwin (geen cron-uitdrukkingen of HTTP-codes bovenaan; die
// staan als technisch detail eronder). Getest in cronWatchdog.test.ts.

/** Wat er voor het bureau gebeurt als deze taak niet draait, per bekende taaknaam. */
const JOB_CONSEQUENCES: Array<[RegExp, string]> = [
  [/auto-close|past-execution/i, "projecten worden niet automatisch op 'uitgevoerd' gezet en de nazorg- en factuurtaken komen niet"],
  [/check-pending|reminder|herinnering/i, "partners en klanten krijgen geen herinneringen (open onderdelen, facturen, gastgegevens)"],
  [/reconcile/i, "de Werkbank ruimt afgehandelde taken niet op en vult nieuwe niet aan"],
  [/selftest/i, "een storing in het aanvraagformulier of de mail wordt niet meer gemeld"],
  [/heartbeat|webhook/i, "een stilgevallen mailterugkoppeling van Mailjet wordt niet meer gemeld"],
  [/arrival|aankomst/i, "klanten krijgen geen aankomstmail met programma"],
  [/guest-details|gast/i, "klanten krijgen geen verzoek om gastenlijst en wensen"],
  [/review|aftersales|nazorg/i, "klanten krijgen geen bedank- en beoordelingsmail na afloop"],
  [/invoice|factuur|commission|commissie/i, "facturen en commissies worden niet automatisch verwerkt of gemeld"],
  [/watchdog/i, "falende automatische taken worden niet meer gemeld"],
];

/** Eén zin in gewone taal: wat het bureau merkt als deze taak stilstaat. */
export function jobConsequence(jobname: string): string {
  const hit = JOB_CONSEQUENCES.find(([re]) => re.test(jobname));
  return hit
    ? `Zolang dit duurt ${hit[1]}.`
    : "Zolang dit duurt doet het systeem dit werk niet; wat precies, staat in Email health bij deze taak.";
}

/** Vaste instructie bij elke falende taak. */
export const WATCHDOG_WHAT_TO_DO =
  "Open Email health en klik bij de taak op 'Nu uitvoeren'. Blijft de taak rood, meld het dan bij de ontwikkelaar.";

export interface WatchdogTodoText {
  title: string;
  description: string;
}

/** Werkbank-taak: titel "Automatische taak faalt: …" met gevolg, wat te doen en het technische detail. */
export function buildWatchdogTodo(alarm: Verdict): WatchdogTodoText {
  return {
    title: `Automatische taak faalt: ${alarm.jobname}`,
    description: [
      `Wat betekent dit: ${jobConsequence(alarm.jobname)}`,
      `Wat te doen: ${WATCHDOG_WHAT_TO_DO}`,
      `Technisch: ${alarm.reason}.`,
    ].join("\n"),
  };
}

export interface WatchdogMailText {
  subject: string;
  html: string;
}

/** Verzamelmail: eerst wat het betekent en wat te doen, daaronder de technische details. */
export function buildWatchdogAlertMail(alarms: Verdict[], healthUrl: string): WatchdogMailText {
  const n = alarms.length;
  const subject = n === 1
    ? `[ALERT] Automatische taak faalt: ${alarms[0].jobname}`
    : `[ALERT] ${n} automatische taken falen`;
  const gevolgen = alarms
    .map((a) => `<li><strong>${a.jobname}</strong>: ${jobConsequence(a.jobname)}</li>`)
    .join("");
  const techniek = alarms
    .map((a) => `<li><strong>${a.jobname}</strong> — ${a.reason}</li>`)
    .join("");
  const html =
    `<p><strong>Wat betekent dit:</strong> ${n === 1 ? "een automatische taak" : `${n} automatische taken`} van het systeem ${n === 1 ? "draait" : "draaien"} niet of ${n === 1 ? "eindigt" : "eindigen"} met een fout.</p>` +
    `<ul>${gevolgen}</ul>` +
    `<p><strong>Wat te doen:</strong> ${WATCHDOG_WHAT_TO_DO}</p>` +
    `<p><a href="${healthUrl}">Open Email health</a></p>` +
    `<hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0;">` +
    `<p style="color:#666;font-size:13px;"><strong>Technische details</strong></p>` +
    `<ul style="color:#666;font-size:13px;">${techniek}</ul>`;
  return { subject, html };
}
