/**
 * Wijzigingsmails bundelen (docs/plan-notificaties.md, fase 3).
 *
 * De "programma bijgewerkt"-mails (`item_changes_customer`,
 * `item_changes_partner`) gaan niet meer per publicatie of per klantwijziging
 * de deur uit, maar komen in de wachtrij `pending_change_notifications`.
 * `send-change-digest` leest die wachtrij om 17:00 en stuurt per ontvanger en
 * dossier één mail met alle wijzigingen van die dag.
 *
 * Dit bestand is de zuivere kant: het beschrijft de rij in de wachtrij, groepeert
 * rijen per ontvanger en bouwt de mailtekst. Geen database, geen Mailjet.
 */
import { buildReplyTo, sanitizeHtml } from "./email-templates.ts";

export type ChangeRecipientKind = "customer" | "partner";

/** Eén wijzigingsregel, zoals de huidige mails hem opbouwen. Platte tekst. */
export interface ChangeLine {
  /** Naam van het onderdeel ("Wadlooptocht"). */
  item: string;
  /** Wat er veranderde ("Tijd", "Toegevoegd", "Aantal deelnemers gewijzigd"). */
  label: string;
  /** Oude waarde, als die bekend is. */
  from?: string | null;
  /** Nieuwe waarde, als die bekend is. */
  to?: string | null;
  /** Extra regel onder de wijziging ("Je eerdere voorstel (10:00) vervalt."). */
  note?: string | null;
}

/** De inhoud van `pending_change_notifications.payload`. */
export interface ChangeDigestPayload {
  reference_number: string | null;
  /** Aanhefnaam van de ontvanger (klantnaam of partnernaam). */
  recipient_name: string;
  /** Klantnaam of bedrijfsnaam, voor de partnermail. */
  customer_label: string;
  changes: ChangeLine[];
  /** Toelichting van het bureau bij een publicatie. */
  note?: string | null;
  /** Knop: klantportaal met token, of het partnerportaal. */
  portal_url: string;
  /** Wie de wijziging deed. Bij "klant" meldt de klantmail dat de aanbieders zijn geïnformeerd. */
  actor: "bureau" | "klant";
  /** "[TEST] " als de wijziging in testmodus gedaan is; anders leeg. */
  subject_prefix?: string;
  /** Datum(s) en groepsgrootte, alleen voor de partnermail. */
  dates?: string | null;
  number_of_people?: number | string | null;
}

/** Rij in `pending_change_notifications` zoals send-change-digest hem leest. */
export interface PendingChangeRow {
  id: string;
  request_id: string;
  recipient_kind: ChangeRecipientKind;
  recipient_email: string;
  partner_id: string | null;
  payload: ChangeDigestPayload;
  created_at: string;
}

/** Nieuwe rij voor de wachtrij (zonder id/created_at). */
export type PendingChangeInsert = Omit<PendingChangeRow, "id" | "created_at">;

export interface ChangeDigestGroup {
  key: string;
  request_id: string;
  recipient_kind: ChangeRecipientKind;
  recipient_email: string;
  partner_id: string | null;
  row_ids: string[];
  /** Kopgegevens uit de nieuwste rij; wijzigingen en toelichtingen uit alle rijen. */
  payload: ChangeDigestPayload;
  notes: string[];
}

export function digestGroupKey(row: Pick<PendingChangeRow, "recipient_email" | "request_id" | "recipient_kind">): string {
  return `${row.recipient_kind}|${row.recipient_email.trim().toLowerCase()}|${row.request_id}`;
}

/**
 * Groepeert onverzonden rijen per ontvanger en dossier, in volgorde van
 * aanmaak. Wijzigingen worden achter elkaar gezet; dubbele regels (dezelfde
 * tekst twee keer op een dag) blijven staan, want de volgorde vertelt het
 * verhaal (10:00 → 11:00 → 10:30).
 */
export function groupPendingChanges(rows: PendingChangeRow[]): ChangeDigestGroup[] {
  const sorted = [...rows].sort((a, b) => a.created_at.localeCompare(b.created_at));
  const groups = new Map<string, ChangeDigestGroup>();
  for (const row of sorted) {
    const key = digestGroupKey(row);
    const existing = groups.get(key);
    const note = row.payload.note?.trim();
    if (!existing) {
      groups.set(key, {
        key,
        request_id: row.request_id,
        recipient_kind: row.recipient_kind,
        recipient_email: row.recipient_email,
        partner_id: row.partner_id,
        row_ids: [row.id],
        payload: { ...row.payload, changes: [...(row.payload.changes ?? [])], note: null },
        notes: note ? [note] : [],
      });
      continue;
    }
    existing.row_ids.push(row.id);
    existing.payload = {
      ...existing.payload,
      ...row.payload,
      // Een latere rij van het bureau heeft geen zicht op de testmodus van een
      // eerdere; de prefix blijft staan zodra één rij hem had.
      subject_prefix: existing.payload.subject_prefix || row.payload.subject_prefix || "",
      changes: [...existing.payload.changes, ...(row.payload.changes ?? [])],
      // Een klantwijziging op dezelfde dag als een publicatie: de klantmail
      // noemt dan wel dat de aanbieders zijn geïnformeerd.
      actor: existing.payload.actor === "klant" || row.payload.actor === "klant" ? "klant" : "bureau",
      note: null,
    };
    if (note && !existing.notes.includes(note)) existing.notes.push(note);
    if (!existing.partner_id && row.partner_id) existing.partner_id = row.partner_id;
  }
  return [...groups.values()];
}

function formatValue(v: string | null | undefined): string {
  if (v === null || v === undefined || v === "") return "—";
  return sanitizeHtml(v);
}

/** Eén regel per wijziging: "<strong>Onderdeel</strong> — Tijd: 10:00 → 11:00". */
export function renderChangeLine(line: ChangeLine): string {
  const item = `<strong>${sanitizeHtml(line.item)}</strong>`;
  const label = sanitizeHtml(line.label);
  const hasValues = (line.from ?? "") !== "" || (line.to ?? "") !== "";
  let text = hasValues ? `${item} — ${label}: ${formatValue(line.from)} → ${formatValue(line.to)}` : `${item} — ${label}`;
  // Bij "toegevoegd"/"geannuleerd" is de nieuwe waarde de naam zelf; dan geen pijl.
  if (hasValues && !line.from && line.to && line.to === line.item) {
    text = `${item} — ${label}`;
  }
  if (line.note) text += `<br><span style="color:#92400e;">${sanitizeHtml(line.note)}</span>`;
  return `<li style="margin:0 0 6px;">${text}</li>`;
}

export interface ChangeDigestEmail {
  subject: string;
  /** Binnenste HTML; de verzender zet er de huisstijlwrapper om. */
  html: string;
  replyTo: { Email: string; Name: string } | undefined;
}

const BUTTON_STYLE =
  "display:inline-block;background:#0F4C5C;color:#ffffff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:600;";

/**
 * Bouwt de bundelmail. Klant: "Beste …", u/uw. Partner: "Hoi …", je/jouw.
 * Kop "Wijzigingen in uw/jouw programma {referentie}", per wijziging één regel,
 * knop naar het portaal, Reply-To op de referentie.
 */
export function buildChangeDigestEmail(group: ChangeDigestGroup): ChangeDigestEmail {
  const p = group.payload;
  const ref = p.reference_number?.trim() || "";
  const refSuffix = ref ? ` (${ref})` : "";
  const refInline = ref ? ` ${sanitizeHtml(ref)}` : "";
  const name = sanitizeHtml(p.recipient_name || (group.recipient_kind === "customer" ? "klant" : "partner"));
  const count = p.changes.length;
  const countText = count === 1 ? "één wijziging" : `${count} wijzigingen`;
  const lines = p.changes.map(renderChangeLine).join("");
  const notesHtml = group.notes
    .map(
      (n) =>
        `<p style="margin:16px 0;padding:12px;background:#f8fafc;border-left:3px solid #0F4C5C;border-radius:4px;"><strong>Toelichting van Bureau Vlieland:</strong><br>${sanitizeHtml(n).replace(/\n/g, "<br>")}</p>`,
    )
    .join("");
  const prefix = p.subject_prefix || "";

  if (group.recipient_kind === "customer") {
    const subject = `${prefix}Wijzigingen in uw programma${refSuffix}`;
    const informed =
      p.actor === "klant"
        ? `<p>De betrokken aanbieders zijn geïnformeerd en bevestigen de wijzigingen opnieuw. U krijgt bericht zodra zij reageren.</p>`
        : "";
    const html = `
<h2 style="color:#0F4C5C;margin:0 0 16px;">Wijzigingen in uw programma${refInline}</h2>
<p>Beste ${name},</p>
<p>Vandaag is uw programma bijgewerkt (${countText}). Dit is er veranderd:</p>
<ul style="margin:8px 0 16px;padding-left:20px;">${lines}</ul>
${notesHtml}
${informed}
<p style="margin:24px 0;"><a href="${p.portal_url}" style="${BUTTON_STYLE}">Bekijk uw programma</a></p>
<p>Heeft u vragen over deze wijzigingen? U kunt eenvoudig op deze e-mail reageren.</p>
<p>Met vriendelijke groet,<br>Bureau Vlieland</p>`;
    return { subject, html: html.trim(), replyTo: buildReplyTo(ref || null) };
  }

  const subject = `${prefix}Wijzigingen in jouw programma — ${p.customer_label}${refSuffix}`;
  const customer = sanitizeHtml(p.customer_label);
  const facts: string[] = [];
  if (p.dates) facts.push(`<p style="margin:4px 0;"><strong>Datum(s):</strong> ${sanitizeHtml(p.dates)}</p>`);
  if (p.number_of_people !== null && p.number_of_people !== undefined && p.number_of_people !== "") {
    facts.push(`<p style="margin:4px 0;"><strong>Aantal personen:</strong> ${sanitizeHtml(String(p.number_of_people))}</p>`);
  }
  const factsHtml = facts.length
    ? `<div style="background:#f7fafc;padding:12px 16px;border-radius:6px;margin:16px 0;">${facts.join("")}</div>`
    : "";
  const html = `
<h2 style="color:#0F4C5C;margin:0 0 16px;">Wijzigingen in jouw programma${refInline}</h2>
<p>Hoi ${name},</p>
<p>Er zijn vandaag wijzigingen in het programma van <strong>${customer}</strong>, een aanvraag waarvoor jij eerder benaderd bent (${countText}):</p>
<ul style="margin:8px 0 16px;padding-left:20px;">${lines}</ul>
${notesHtml}
${factsHtml}
<p><strong>Aan zet:</strong> bekijk de wijzigingen in het partnerportaal en bevestig ze daar.</p>
<p style="margin:24px 0;"><a href="${p.portal_url}" style="${BUTTON_STYLE}">Open het partnerportaal</a></p>
<p>Vragen? Antwoord op deze mail — Bureau Vlieland verzorgt de communicatie met de klant.</p>
<p>Met vriendelijke groet,<br>Bureau Vlieland</p>`;
  return { subject, html: html.trim(), replyTo: buildReplyTo(ref || null) };
}

/** De velden van program_requests die bepalen of een bundel nog zin heeft. */
export interface DigestRequestState {
  id: string;
  status: string | null;
  cancelled_at: string | null;
  archived_at: string | null;
}

/**
 * Waarom een dossier geen bundelmail meer krijgt, of null als hij gewoon gaat.
 * Geannuleerd, verwijderd of gearchiveerd: de wijzigingen van vandaag zijn dan
 * achterhaald en de ontvanger kreeg (of krijgt) de annuleringsmail al.
 */
export function skipReasonFor(req: DigestRequestState | undefined): string | null {
  if (!req) return "request_missing";
  if (req.status === "cancelled" || req.cancelled_at) return "request_cancelled";
  if (req.status === "deleted") return "request_deleted";
  if (req.archived_at) return "request_archived";
  return null;
}

/** Het email_type waaronder de bundel in email_log komt. */
export function digestEmailType(kind: ChangeRecipientKind): "item_changes_customer" | "item_changes_partner" {
  return kind === "customer" ? "item_changes_customer" : "item_changes_partner";
}

/** De bundelmail heeft geen databasetemplate; dit is de template_name in email_log. */
export const DIGEST_TEMPLATE_NAME = "item_changes_digest";

/**
 * Zet rijen in de wachtrij. Faalt zacht (console.error) zodat een publicatie
 * of klantwijziging niet strandt op de notificatie; de aanroeper krijgt het
 * aantal geplaatste rijen terug.
 */
// deno-lint-ignore no-explicit-any
export async function enqueueChangeNotifications(supabase: any, rows: PendingChangeInsert[]): Promise<number> {
  if (rows.length === 0) return 0;
  const { error } = await supabase.from("pending_change_notifications").insert(
    rows.map((r) => ({
      request_id: r.request_id,
      recipient_kind: r.recipient_kind,
      recipient_email: r.recipient_email,
      partner_id: r.partner_id,
      payload: r.payload,
    })),
  );
  if (error) {
    console.error("pending_change_notifications insert failed", error);
    return 0;
  }
  return rows.length;
}
