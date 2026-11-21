// Leesbare gevolg-zinnen per controle van de kritieke zelftest, plus de
// opbouw van de alarmmail. Los van index.ts (dat Deno.serve start) zodat de
// test ze kan importeren. De technische fix-hint blijft staan, maar eronder:
// Erwin leest eerst wat het voor klanten en het bureau betekent.

export interface AlertCheck {
  key: string;
  label: string;
  severity: "critical" | "warning";
  ok: boolean;
  detail: string;
  fixHint?: string;
  durationMs: number;
  fixedByAutofix?: boolean;
}

/** Wat het bureau en de klant merken als deze controle faalt (sleutel = check.key). */
export const CHECK_CONSEQUENCES: Record<string, string> = {
  self_service_submit: "Klanten kunnen op de site geen programma aanvragen; zij zien een storingsmelding.",
  public_building_blocks: "De activiteitencatalogus op de site is leeg; klanten kunnen niets kiezen.",
  public_partners_view: "De partnerpagina op de site toont geen aanbieders.",
  pricing_structures: "De site kan geen prijzen tonen; aanvragen gaan zonder prijsindicatie.",
  customer_portal_token: "Het klantportaal (mijn-programma) werkt niet; klanten kunnen niet akkoord geven of tekenen.",
  shared_program_rpc: "Gedeelde programmalinks (deellink) werken niet.",
  ferry_api: "Boottijden ontbreken in programma's en op de site.",
  mail_config: "Er gaat geen enkele mail meer uit: geen bevestigingen, geen partnermails, geen herinneringen.",
  recent_email_failures: "Een deel van de mails van de laatste 24 uur is niet aangekomen; de ontvangers weten van niets.",
  webhook_match_ratio: "Wij zien niet of mail wordt afgeleverd of terugkomt; onbereikbare adressen worden niet geblokkeerd.",
  mailjet_account_match: "De terugkoppeling van Mailjet hoort bij een ander account; afleverstatus in het Berichtencentrum is onbetrouwbaar.",
  suppression_enforced: "Mail kan naar geblokkeerde adressen gaan (bounces, afmeldingen); dat schaadt de afzenderreputatie.",
  email_body_storage: "Van sommige verstuurde mails is de inhoud niet bewaard; opnieuw versturen en teruglezen lukt dan niet.",
  commission_worklist_coverage: "Een inkoopfactuur ontbreekt in de commissiewerklijst; commissie wordt niet berekend of gefactureerd.",
};

/** Eén zin voor Erwin; onbekende sleutels krijgen een neutrale zin. */
export function consequenceFor(key: string): string {
  return CHECK_CONSEQUENCES[key] ?? "Een deel van het systeem werkt niet zoals bedoeld; details staan in Email health.";
}

/** Wat te doen, afhankelijk van de ernst: één zin in gewone taal. */
export function whatToDoFor(check: Pick<AlertCheck, "severity" | "fixedByAutofix">): string {
  if (check.fixedByAutofix) return "Niets: dit is automatisch hersteld.";
  return check.severity === "critical"
    ? "Geef dit vandaag door aan de ontwikkelaar; tot het hersteld is, help klanten per telefoon of mail."
    : "Geef dit bij de volgende gelegenheid door aan de ontwikkelaar.";
}

export const SELFTEST_HEALTH_URL = "https://bureauvlieland.nl/admin/email-health";

/** Onderwerp: aantal problemen en de eerste labels. */
export function buildSelftestAlertSubject(failed: AlertCheck[]): string {
  return `[ALERT] Kritieke zelftest: ${failed.length} probleem(en) — ${failed.map((f) => f.label).slice(0, 2).join(", ")}`;
}

/**
 * Alarmmail: bovenaan per gefaalde controle "Wat betekent dit" en "Wat te
 * doen"; daaronder de volledige technische tabel (alle controles, met
 * fix-hints) voor de ontwikkelaar.
 */
export function buildSelftestAlertHtml(checks: AlertCheck[]): string {
  const failed = checks.filter((c) => !c.ok);
  const fixedCount = checks.filter((c) => c.fixedByAutofix).length;

  const samenvatting = failed
    .map((c) =>
      `<li style="margin-bottom:10px;"><strong>${c.label}</strong><br>` +
      `Wat betekent dit: ${consequenceFor(c.key)}<br>` +
      `Wat te doen: ${whatToDoFor(c)}</li>`
    )
    .join("");

  const rows = checks
    .map((c) => {
      const icon = c.ok ? (c.fixedByAutofix ? "🛠️" : "✅") : c.severity === "critical" ? "🛑" : "⚠️";
      return `<tr>
              <td style="padding:6px 8px;border-bottom:1px solid #eee;">${icon}</td>
              <td style="padding:6px 8px;border-bottom:1px solid #eee;"><strong>${c.label}</strong><br><span style="color:#666;font-size:12px;">${c.detail}</span>${
        c.ok ? "" : `<br><span style="color:#b45309;font-size:12px;">Fix: ${c.fixHint ?? "—"}</span>`
      }</td>
              <td style="padding:6px 8px;border-bottom:1px solid #eee;color:#666;font-size:12px;">${c.durationMs} ms</td>
            </tr>`;
    })
    .join("");

  return `<p>De dagelijkse zelftest van de site en de mail vond <strong>${failed.length} probleem(en)</strong>.</p>
          ${fixedCount > 0 ? `<p>${fixedCount} probleem is automatisch hersteld (ontbrekende rechten).</p>` : ""}
          <ul style="padding-left:18px;">${samenvatting}</ul>
          <p><a href="${SELFTEST_HEALTH_URL}">Open Email health</a> voor de stand van zaken.</p>
          <hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0;">
          <p style="color:#666;font-size:13px;"><strong>Technische details (voor de ontwikkelaar)</strong></p>
          <table style="border-collapse:collapse;font-family:system-ui,sans-serif;font-size:14px;">${rows}</table>`;
}
