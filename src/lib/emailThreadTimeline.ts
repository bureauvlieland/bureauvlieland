/**
 * Pure helpers voor de tijdlijn van een e-mailgesprek in het Berichtencentrum.
 *
 * Wat een mens schreef (inkomend of handmatig verzonden) is een bericht en
 * krijgt een kaart. Wat het systeem verstuurde is een gebeurtenis en krijgt
 * één regel. Opeenvolgende gebeurtenissen van hetzelfde type die kort na
 * elkaar verstuurd zijn (bijvoorbeeld acht partneraanvragen in één klik)
 * worden gebundeld tot één uitklapbare regel.
 */

export interface TimelineItem {
  id: string;
  /** "inbound" en "manual" zijn berichten, "automatic" is een gebeurtenis */
  origin: "inbound" | "manual" | "automatic";
  /** ISO-datum */
  date: string;
  email_type?: string | null;
  contact_name?: string | null;
  contact_email?: string | null;
  answered_at?: string | null;
  archived_at?: string | null;
}

export type TimelineEntry<T extends TimelineItem> =
  | { kind: "message"; item: T }
  | { kind: "event"; item: T }
  | { kind: "bundle"; key: string; emailType: string; items: T[]; date: string };

/** Twee gebeurtenissen horen bij elkaar als ze binnen dit venster vallen. */
export const BUNDLE_WINDOW_MS = 10 * 60 * 1000;

/**
 * Bouwt de tijdlijn. `items` moet oplopend op datum gesorteerd zijn.
 * Een bundel ontstaat pas bij twee of meer opeenvolgende automatische mails
 * van hetzelfde type, elk binnen `windowMs` van de vorige in de bundel.
 */
export function buildTimeline<T extends TimelineItem>(
  items: T[],
  windowMs: number = BUNDLE_WINDOW_MS,
): TimelineEntry<T>[] {
  const out: TimelineEntry<T>[] = [];
  let open: { emailType: string; items: T[]; lastMs: number } | null = null;

  const flush = () => {
    if (!open) return;
    if (open.items.length >= 2) {
      out.push({
        kind: "bundle",
        key: `b:${open.items[0].id}`,
        emailType: open.emailType,
        items: open.items,
        date: open.items[0].date,
      });
    } else {
      out.push({ kind: "event", item: open.items[0] });
    }
    open = null;
  };

  for (const item of items) {
    if (item.origin !== "automatic") {
      flush();
      out.push({ kind: "message", item });
      continue;
    }
    const type = item.email_type ?? "";
    const ms = new Date(item.date).getTime();
    if (open && open.emailType === type && ms - open.lastMs <= windowMs) {
      open.items.push(item);
      open.lastMs = ms;
    } else {
      flush();
      open = { emailType: type, items: [item], lastMs: ms };
    }
  }
  flush();
  return out;
}

/** Unieke ontvangers van een bundel, in volgorde van verzending. */
export function bundleRecipients(items: TimelineItem[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const it of items) {
    const name = (it.contact_name || it.contact_email || "").trim();
    const key = name.toLowerCase();
    if (!name || seen.has(key)) continue;
    seen.add(key);
    out.push(name);
  }
  return out;
}

/**
 * Korte samenvatting van een bundel: "8 mails naar Zuiver Traiteur,
 * Brouwerij Fortuna, De Bazuin Watertaxi en 3 anderen".
 */
export function bundleSummary(items: TimelineItem[], maxNames = 3): string {
  const recipients = bundleRecipients(items);
  const n = items.length;
  const head = recipients.slice(0, maxNames);
  const rest = recipients.length - head.length;
  let who = head.join(", ");
  if (rest > 0) who += ` en ${rest} ${rest === 1 ? "ander" : "anderen"}`;
  return who ? `${n} mails naar ${who}` : `${n} mails`;
}

/**
 * Het bericht waar de thread op moet openen: het eerste inkomende bericht
 * dat nog niet beantwoord is, anders het laatste bericht van een mens,
 * anders het laatste item. `items` oplopend op datum.
 */
export function focusItemId(items: TimelineItem[]): string | null {
  if (items.length === 0) return null;
  const firstUnanswered = items.find(
    (i) => i.origin === "inbound" && !i.answered_at && !i.archived_at,
  );
  if (firstUnanswered) return firstUnanswered.id;
  for (let i = items.length - 1; i >= 0; i -= 1) {
    if (items[i].origin !== "automatic") return items[i].id;
  }
  return items[items.length - 1].id;
}

/**
 * Het oudste onbeantwoorde inkomende bericht; daarop is "wacht al 2 dagen"
 * in de lijst gebaseerd. Null als er niets open staat.
 */
export function oldestUnansweredDate(items: TimelineItem[]): string | null {
  let oldest: string | null = null;
  for (const i of items) {
    if (i.origin !== "inbound" || i.answered_at || i.archived_at) continue;
    if (!oldest || i.date < oldest) oldest = i.date;
  }
  return oldest;
}

/**
 * Rol van een afzender binnen een gesprek: "klant" als het adres het
 * klantadres van het dossier is, "partner" als het systeem ooit een
 * partnermail naar dit adres stuurde, anders null.
 */
export function senderRole(
  email: string | null | undefined,
  customerEmail: string | null | undefined,
  partnerEmails: Set<string>,
): "klant" | "partner" | null {
  const e = (email || "").trim().toLowerCase();
  if (!e) return null;
  if (customerEmail && e === customerEmail.trim().toLowerCase()) return "klant";
  if (partnerEmails.has(e)) return "partner";
  return null;
}

/** Of een `email_type` aan een partner gericht is (voor de rolbepaling). */
export function isPartnerEmailType(type: string | null | undefined): boolean {
  if (!type) return false;
  return /partner/.test(type) && !/customer|bureau/.test(type);
}
