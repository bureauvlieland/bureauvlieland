// Teksten van het auto-close-alarm in gewone taal, los van index.ts (dat
// Deno.serve start) zodat de test ze kan importeren.
//
// De taak auto-close-past-execution zet projecten na de uitvoerdatum op
// "uitgevoerd"; daaraan hangen de nazorgmail, de beoordelingsvraag en de
// factuur- en commissietaken. Als die taak stilstaat merkt het bureau dat als:
// projecten blijven op "bevestigd" staan en de vervolgtaken komen niet.
//
// Bewust niet samengevoegd met cron-watchdog (buiten scope van WP9); de
// watchdog bewaakt dezelfde taak via get_scheduled_job_health(). Zie rapport.

export type Health = "healthy" | "missing_run" | "errors" | "stuck";

export interface RunLike {
  id: string;
  started_at: string;
  status: string;
  result: Record<string, unknown> | null;
  error_message: string | null;
}

export const AUTO_CLOSE_HEALTH_URL = "https://bureauvlieland.nl/admin/email-health";

const MEANING =
  "Afgelopen programma's worden niet automatisch op 'uitgevoerd' gezet. Daardoor komen de nazorgmail aan de klant, de beoordelingsvraag en de factuur- en commissietaken niet, en blijven die projecten op 'bevestigd' staan.";

const ACTION =
  "Open Email health en klik bij 'auto-close-past-execution' op 'Nu uitvoeren'. Blijft de taak rood, geef het dan door aan de ontwikkelaar.";

export function buildAutoCloseEmail(
  health: Health,
  run: RunLike | null,
  thresholds: { staleHours: number; stuckMinutes: number },
): { subject: string; html: string } {
  if (health === "healthy") return { subject: "", html: "" };

  let subject: string;
  let technical: string;
  if (health === "missing_run") {
    subject = "[ALERT] Afsluiten van afgelopen programma's draait niet";
    technical = `De taak auto-close-past-execution heeft in de laatste ${thresholds.staleHours} uur geen run geregistreerd (auto_close_run_log).`;
  } else if (health === "errors") {
    subject = "[ALERT] Afsluiten van afgelopen programma's eindigde met een fout";
    technical =
      `Laatste run ${run?.id ?? "?"} (gestart ${run?.started_at ?? "?"}) eindigde met status ${run?.status ?? "?"}. ` +
      `Fout: ${run?.error_message ?? "zie result"}.` +
      (run?.result
        ? `<pre style="background:#f5f5f5;padding:8px;font-size:12px;white-space:pre-wrap;">${escapeHtml(JSON.stringify(run.result, null, 2))}</pre>`
        : "");
  } else {
    subject = "[ALERT] Afsluiten van afgelopen programma's is blijven hangen";
    technical =
      `Run ${run?.id ?? "?"} is gestart op ${run?.started_at ?? "?"} en staat al langer dan ${thresholds.stuckMinutes} minuten op 'running'; ` +
      "de functie is vermoedelijk gestopt zonder af te ronden.";
  }

  const html = `<p><strong>Wat betekent dit:</strong> ${MEANING}</p>
    <p><strong>Wat te doen:</strong> ${ACTION}</p>
    <p><a href="${AUTO_CLOSE_HEALTH_URL}">Open Email health</a></p>
    <hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0;">
    <p style="color:#666;font-size:13px;"><strong>Technische details</strong><br>${technical}</p>`;
  return { subject, html };
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}
