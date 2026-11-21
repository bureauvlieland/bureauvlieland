/**
 * Dagelijkse samenvatting voor het bureau: zuivere opbouw.
 *
 * Eén mail per ochtend (docs/plan-notificaties.md, §4 punt 8 en §5 fase 4):
 * wat er gisteren binnenkwam, wat vandaag verloopt, wat langer dan drie dagen
 * open staat, en hoeveel mails gisteren niet aankwamen. Ook als er niets is
 * gaat de mail ("Niets nieuws"): dan weet Erwin dat het systeem draait.
 *
 * Dit bestand kent geen database; index.ts haalt op en geeft door.
 */
import { sanitizeHtml, formatDateNL } from "../_shared/email-templates.ts";

export const DIGEST_OPEN_DAYS = 3;
export const DIGEST_MAX_ROWS = 12;

export interface DigestTodo {
  id: string;
  title: string;
  auto_type: string | null;
  priority: string | null;
  created_at: string;
  due_date?: string | null;
  /** Dossierreferentie en klant, als bekend. */
  project_label?: string | null;
  related_request_id?: string | null;
}

export interface DigestConversation {
  /** Wie schreef (naam of adres). */
  from: string;
  project_label?: string | null;
  related_request_id?: string | null;
  /** Oudste onbeantwoorde bericht. */
  since: string;
  channel: "e-mail" | "chat";
}

export interface DigestExpiringQuote {
  reference_number: string | null;
  customer_label: string;
  request_id: string;
  valid_until: string;
}

export interface DigestFailedMail {
  email_type: string;
  recipient_email: string;
  status: string;
}

export interface DigestInput {
  /** Datum van vandaag in de tijdzone van het bureau, YYYY-MM-DD. */
  today: string;
  /** Datum van gisteren, YYYY-MM-DD. */
  yesterday: string;
  inboundYesterday: DigestTodo[];
  dueToday: DigestTodo[];
  expiringToday: DigestExpiringQuote[];
  openLongerThan: DigestTodo[];
  conversationsLongerThan: DigestConversation[];
  failedYesterday: DigestFailedMail[];
  /** Hoeveel mails er gisteren in totaal zijn verstuurd. */
  sentYesterday: number;
}

export interface DigestOutput {
  subject: string;
  /** Platte samenvatting voor het logboek en de test. */
  summaryLine: string;
  html: string;
  isEmpty: boolean;
}

function ageDays(iso: string, today: string): number {
  const t = new Date(iso).getTime();
  const d = new Date(`${today}T12:00:00Z`).getTime();
  if (Number.isNaN(t)) return 0;
  return Math.max(0, Math.floor((d - t) / 86_400_000));
}

function plural(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`;
}

function projectHref(baseUrl: string, requestId: string | null | undefined): string | null {
  return requestId ? `${baseUrl}/admin/aanvragen/${requestId}` : null;
}

function li(baseUrl: string, text: string, requestId?: string | null, label?: string | null): string {
  const href = projectHref(baseUrl, requestId);
  const lbl = label ? ` <span style="color:#64748b;">· ${sanitizeHtml(label)}</span>` : "";
  const body = `${sanitizeHtml(text)}${lbl}`;
  return href
    ? `<li style="margin:4px 0;"><a href="${href}" style="color:#0F4C5C; text-decoration:none;">${body}</a></li>`
    : `<li style="margin:4px 0;">${body}</li>`;
}

function section(title: string, count: number, items: string[], emptyText: string): string {
  const head = `<h3 style="margin:20px 0 6px; font-size:16px; color:#0F4C5C;">${sanitizeHtml(title)} <span style="color:#64748b; font-weight:normal;">(${count})</span></h3>`;
  if (items.length === 0) {
    return `${head}<p style="margin:0; color:#64748b; font-size:14px;">${sanitizeHtml(emptyText)}</p>`;
  }
  const more = count > items.length
    ? `<li style="margin:4px 0; color:#64748b;">… en nog ${count - items.length}</li>`
    : "";
  return `${head}<ul style="margin:0; padding-left:18px; font-size:14px; line-height:1.5;">${items.join("")}${more}</ul>`;
}

/** Sorteert op leeftijd (oudste eerst) en kapt af op het maximum. */
function oldestFirst<T extends { created_at?: string; since?: string }>(rows: T[]): T[] {
  return [...rows].sort((a, b) =>
    String(a.created_at ?? a.since ?? "").localeCompare(String(b.created_at ?? b.since ?? "")),
  );
}

export function buildDailyDigest(input: DigestInput, baseUrl = "https://bureauvlieland.nl"): DigestOutput {
  const inbound = [...input.inboundYesterday].sort((a, b) => b.created_at.localeCompare(a.created_at));
  const due = [...input.dueToday];
  const expiring = [...input.expiringToday];
  const openTodos = oldestFirst(input.openLongerThan);
  const openConvs = oldestFirst(input.conversationsLongerThan);
  const failed = input.failedYesterday;

  const counts = {
    inbound: inbound.length,
    today: due.length + expiring.length,
    open: openTodos.length + openConvs.length,
    failed: failed.length,
  };
  const isEmpty = counts.inbound === 0 && counts.today === 0 && counts.open === 0 && counts.failed === 0;

  const dateLabel = formatDateNL(input.today);
  const subject = isEmpty
    ? `Dagoverzicht ${dateLabel}: niets nieuws`
    : `Dagoverzicht ${dateLabel}: ${plural(counts.inbound, "binnengekomen", "binnengekomen")}, ${plural(counts.today, "verloopt vandaag", "verlopen vandaag")}, ${plural(counts.open, "staat langer open", "staan langer open")}${counts.failed ? `, ${plural(counts.failed, "mail mislukt", "mails mislukt")}` : ""}`;

  const summaryLine = `binnengekomen=${counts.inbound} vandaag=${counts.today} open>${DIGEST_OPEN_DAYS}d=${counts.open} mislukt=${counts.failed} verstuurd_gisteren=${input.sentYesterday}`;

  const inboundItems = inbound.slice(0, DIGEST_MAX_ROWS).map((t) => li(baseUrl, t.title, t.related_request_id, t.project_label));
  const todayItems = [
    ...expiring.map((q) => li(baseUrl, `Offerte verloopt vandaag: ${q.customer_label}`, q.request_id, q.reference_number)),
    ...due.map((t) => li(baseUrl, t.title, t.related_request_id, t.project_label)),
  ].slice(0, DIGEST_MAX_ROWS);
  const openItems = [
    ...openConvs.map((c) =>
      li(baseUrl, `${c.channel === "chat" ? "Chat" : "E-mail"} van ${c.from} wacht ${plural(ageDays(c.since, input.today), "dag", "dagen")}`, c.related_request_id, c.project_label)),
    ...openTodos.map((t) =>
      li(baseUrl, `${t.title} (${plural(ageDays(t.created_at, input.today), "dag", "dagen")} open)`, t.related_request_id, t.project_label)),
  ].slice(0, DIGEST_MAX_ROWS);
  const failedItems = failed.slice(0, DIGEST_MAX_ROWS).map((f) =>
    `<li style="margin:4px 0;">${sanitizeHtml(f.email_type)} aan ${sanitizeHtml(f.recipient_email)}: ${sanitizeHtml(f.status)}</li>`);

  const intro = isEmpty
    ? `<p style="margin:0 0 8px; font-size:15px;">Niets nieuws. Gisteren kwam er niets binnen, er verloopt vandaag niets en er staat niets langer dan ${DIGEST_OPEN_DAYS} dagen open.</p>`
    : `<p style="margin:0 0 8px; font-size:15px;">Het overzicht van ${sanitizeHtml(formatDateNL(input.yesterday))} en vandaag. Alles hieronder staat ook in de Werkbank; dit is het vangnet.</p>`;

  const html = `<div style="font-family: Arial, sans-serif; max-width:640px; margin:0 auto; color:#0f172a;">
    <h2 style="color:#0F4C5C; margin-bottom:4px;">Dagoverzicht ${sanitizeHtml(dateLabel)}</h2>
    ${intro}
    ${section("Gisteren binnengekomen", counts.inbound, inboundItems, "Geen reacties van partners of klanten.")}
    ${section("Verloopt vandaag", counts.today, todayItems, "Geen offertes of taken met een deadline vandaag.")}
    ${section(`Langer dan ${DIGEST_OPEN_DAYS} dagen open`, counts.open, openItems, "Niets dat blijft liggen.")}
    ${section("Gisteren niet aangekomen", counts.failed, failedItems, `Alle ${input.sentYesterday} mails van gisteren zijn verzonden.`)}
    <p style="margin:24px 0 0;">
      <a href="${baseUrl}/admin/werkbank" style="background:#0F4C5C; color:#ffffff; padding:12px 20px; border-radius:6px; text-decoration:none; display:inline-block;">Open de Werkbank</a>
    </p>
  </div>`;

  return { subject, summaryLine, html, isEmpty };
}

/** Datum (YYYY-MM-DD) in de tijdzone van het bureau. */
export function localDate(now: Date, timeZone = "Europe/Amsterdam"): string {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(now);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

/** De vorige kalenderdag van een YYYY-MM-DD. */
export function previousDate(ymd: string): string {
  const d = new Date(`${ymd}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

/**
 * Begin en einde (exclusief) van een lokale kalenderdag als ISO-tijdstippen,
 * zodat de database op created_at kan filteren.
 */
export function localDayBounds(ymd: string, timeZone = "Europe/Amsterdam"): { start: string; end: string } {
  // Bepaal de UTC-offset van die dag door een referentiemoment te formatteren.
  const probe = new Date(`${ymd}T12:00:00Z`);
  const parts = new Intl.DateTimeFormat("en-US", { timeZone, hour12: false, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }).formatToParts(probe);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? "0");
  const localAsUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour") % 24, get("minute"));
  const offsetMs = localAsUtc - probe.getTime();
  const startLocalMidnightUtc = Date.UTC(
    Number(ymd.slice(0, 4)), Number(ymd.slice(5, 7)) - 1, Number(ymd.slice(8, 10)), 0, 0,
  ) - offsetMs;
  return {
    start: new Date(startLocalMidnightUtc).toISOString(),
    end: new Date(startLocalMidnightUtc + 86_400_000).toISOString(),
  };
}
