// Automatische mails aan de klant om akkoord te geven en de algemene
// voorwaarden te ondertekenen. Gebruikt door check-pending-items (dagelijkse
// cron) en door send-terms-request (de knop "Ondertekenverzoek sturen" in de
// admin).
//
// Volgorde per project:
//  - customer_terms_request       zodra het project in aanmerking komt (eerste verzoek)
//  - customer_terms_reminder_t14  vanaf 14 dagen voor de eerste datum
//  - customer_terms_reminder_t7   vanaf 7 dagen voor de eerste datum
//  - customer_terms_reminder_t3   vanaf 3 dagen voor de eerste datum
//
// Wanneer komt een project in aanmerking (`termsStageFor`)?
//  - "akkoord": de klant heeft akkoord gegeven op het voorstel, maar nog niet
//    getekend. Partnerbevestigingen hoeven niet binnen te zijn: de klant kan
//    in het portaal onder voorbehoud tekenen.
//  - "offerte": het voorstel is minstens QUOTE_FOLLOWUP_AFTER_DAYS dagen
//    geleden verstuurd, er is nog geen akkoord en het voorstel is niet
//    verlopen. De mail vraagt dan om akkoord én handtekening.
//
// Tot 25 oktober 2026 was de voorwaarde dat álle onderdelen door partners
// bevestigd waren. Bij een programma met 15 tot 20 onderdelen stond er
// altijd iets open; de mail is daardoor in heel 2026 één keer verstuurd.
//
// We sturen per run hooguit één mail: de meest urgente fase die al bereikt is.
// Is die al verstuurd, dan niets (een oudere fase alsnog sturen heeft geen zin).
// Tussen twee mails zitten minimaal MIN_DAYS_BETWEEN_TERMS_MAILS dagen.

export const TERMS_MAIL_TYPES = [
  "customer_terms_request",
  "customer_terms_reminder_t14",
  "customer_terms_reminder_t7",
  "customer_terms_reminder_t3",
] as const;
export type TermsMailType = typeof TERMS_MAIL_TYPES[number];

export const MIN_DAYS_BETWEEN_TERMS_MAILS = 2;

/** Na zoveel dagen zonder akkoord volgt de eerste mail op een verstuurd voorstel. */
export const QUOTE_FOLLOWUP_AFTER_DAYS = 7;

const DAY_MS = 24 * 60 * 60 * 1000;

const STAGES: Array<{ type: TermsMailType; maxDaysUntil: number }> = [
  { type: "customer_terms_reminder_t3", maxDaysUntil: 3 },
  { type: "customer_terms_reminder_t7", maxDaysUntil: 7 },
  { type: "customer_terms_reminder_t14", maxDaysUntil: 14 },
  { type: "customer_terms_request", maxDaysUntil: Infinity },
];

export interface TermsItemLike {
  status: string;
  block_type?: string | null;
  day_index?: number | null;
  item_quote_status?: string | null;
}

/**
 * Zijn alle onderdelen die de klant moet tekenen bevestigd? Spiegelt
 * `isItemConfirmedForTerms` uit het klantportaal; bureau-onderdelen worden
 * door de aanroeper via `isBureau` doorgegeven. Sinds 25 oktober 2026 geen
 * voorwaarde meer voor de mail, alleen nog bepalend voor de tekst ervan.
 */
export function allItemsConfirmedForTerms<T extends TermsItemLike>(
  items: T[],
  isBureau: (item: T) => boolean = () => false,
): boolean {
  const relevant = items.filter(
    (i) =>
      i.status !== "cancelled" &&
      i.status !== "unavailable" &&
      i.block_type !== "self_arranged" &&
      i.day_index !== -1,
  );
  if (relevant.length === 0) return false;
  return relevant.every(
    (i) =>
      isBureau(i) ||
      ["confirmed", "accepted", "executed", "invoiced"].includes(i.status) ||
      i.item_quote_status === "bevestigd",
  );
}

/** In welke fase zit het project voor de voorwaardenmail. */
export type TermsStage = "akkoord" | "offerte";

export interface TermsStageInput {
  quote_status?: string | null;
  quote_sent_at?: string | null;
  quote_valid_until?: string | null;
}

/**
 * Komt dit project in aanmerking voor de voorwaardenmail, en in welke fase?
 * `null` = (nog) niet. Zie de toelichting bovenaan.
 */
export function termsStageFor(prog: TermsStageInput, now: Date = new Date()): TermsStage | null {
  const status = prog.quote_status ?? null;
  if (status === "akkoord_ontvangen" || status === "definitief_bevestigd") return "akkoord";
  if (status !== "offerte_verstuurd") return null;
  if (!prog.quote_sent_at) return null;
  const sentAt = Date.parse(prog.quote_sent_at);
  if (Number.isNaN(sentAt)) return null;
  if (now.getTime() - sentAt < QUOTE_FOLLOWUP_AFTER_DAYS * DAY_MS) return null;
  if (prog.quote_valid_until) {
    const validUntil = Date.parse(String(prog.quote_valid_until).slice(0, 10) + "T23:59:59Z");
    if (!Number.isNaN(validUntil) && validUntil < now.getTime()) return null;
  }
  return "offerte";
}

/**
 * Welke voorwaarden-mail moet er nu uit? `null` = niets sturen.
 * @param daysUntilEvent hele dagen tot de eerste programmadatum (0 = vandaag)
 * @param sent verstuurde mails voor dit project: type + tijdstip
 */
export function pickTermsMail(
  daysUntilEvent: number,
  sent: Array<{ type: string; at: string }>,
  now: Date = new Date(),
): TermsMailType | null {
  if (daysUntilEvent < 0) return null;

  const lastAt = sent.reduce((max, s) => Math.max(max, new Date(s.at).getTime()), 0);
  if (lastAt && now.getTime() - lastAt < MIN_DAYS_BETWEEN_TERMS_MAILS * DAY_MS) {
    return null;
  }

  const stage = STAGES.find((s) => daysUntilEvent <= s.maxDaysUntil);
  if (!stage) return null;
  if (sent.some((s) => s.type === stage.type)) return null;
  return stage.type;
}

export interface TermsMailCopyInput {
  stage: TermsStage;
  mailType: TermsMailType;
  customerName: string;
  referenceNumber: string;
  /** Hele dagen tot de eerste programmadatum; null als er geen datum is. */
  daysUntil: number | null;
  portalUrl: string;
  billingMissing: boolean;
  allConfirmed: boolean;
  /** true als het bureau de mail zelf stuurt (knop in de admin). */
  manual?: boolean;
}

export interface TermsMailCopy {
  subject: string;
  intro: string;
  html: string;
  variables: Record<string, string>;
}

function daysLabel(daysUntil: number): string {
  return daysUntil === 0 ? "enkele uren" : `${daysUntil} dag${daysUntil === 1 ? "" : "en"}`;
}

/**
 * Onderwerp, tekst en template-variabelen van de voorwaardenmail. Puur, zodat
 * de cron en de admin-knop dezelfde mail sturen en de tekst getest is.
 */
export function buildTermsMailCopy(input: TermsMailCopyInput): TermsMailCopy {
  const ref = input.referenceNumber ? ` (${input.referenceNumber})` : "";
  const isFirst = input.mailType === "customer_terms_request";
  const asksApproval = input.stage === "offerte";

  let subject: string;
  let intro: string;
  if (asksApproval) {
    subject = isFirst
      ? `Uw voorstel wacht op uw akkoord${ref}`
      : `Herinnering: uw akkoord en handtekening voor uw programma${ref}`;
    intro = input.manual
      ? "Uw voorstel voor een programma op Vlieland staat klaar in uw portaal."
      : isFirst
      ? "Een tijdje geleden stuurden wij u een voorstel voor uw programma op Vlieland. We zijn benieuwd wat u ervan vindt."
      : input.daysUntil === null
      ? "We missen nog uw akkoord op het voorstel voor uw programma op Vlieland en uw handtekening onder de voorwaarden."
      : `Over ${daysLabel(input.daysUntil)} begint uw programma op Vlieland. We missen nog uw akkoord op het voorstel en uw handtekening onder de voorwaarden.`;
  } else {
    subject = isFirst
      ? `Bedankt voor uw akkoord: onderteken nog de voorwaarden${ref}`
      : `Herinnering: onderteken de voorwaarden voor uw programma${ref}`;
    intro = input.manual
      ? "Uw programma op Vlieland staat klaar in uw portaal."
      : isFirst
      ? input.allConfirmed
        ? "Goed nieuws: alle onderdelen van uw programma op Vlieland zijn bevestigd."
        : "Bedankt voor uw akkoord op het programma. Onze partners bevestigen de onderdelen één voor één; daar hoeft u niet op te wachten."
      : input.daysUntil === null
      ? "We missen nog uw handtekening onder de algemene voorwaarden voor uw programma op Vlieland."
      : `Over ${daysLabel(input.daysUntil)} begint uw programma op Vlieland. We missen nog uw handtekening onder de algemene voorwaarden.`;
  }

  const ask = asksApproval
    ? `Wilt u het voorstel bekijken, akkoord geven en de algemene voorwaarden ondertekenen${input.billingMissing ? ", en uw factuurgegevens invullen" : ""}? Dat kost een paar minuten en daarna leggen wij alles vast bij onze partners.`
    : `Wilt u het programma afronden door de algemene voorwaarden te ondertekenen${input.billingMissing ? " en uw factuurgegevens in te vullen" : ""}? Dat kost een minuut en is nodig zodat wij en onze partners alles correct kunnen afhandelen en factureren.`;
  const reservation = !asksApproval && !input.allConfirmed
    ? `<p>Staat er nog een onderdeel open bij een aanbieder, dan tekent u onder voorbehoud van die bevestiging. Wij houden het voor u in de gaten.</p>`
    : "";
  const button = asksApproval ? "Bekijk en bevestig uw voorstel" : "Bekijk en onderteken uw programma";

  const html = `<p>Beste ${input.customerName},</p>
<p>${intro}</p>
<p>${ask}</p>
${reservation}<p><a href="${input.portalUrl}" style="display:inline-block;padding:10px 18px;background:#1a365d;color:#ffffff;text-decoration:none;border-radius:6px;">${button}</a></p>
<p>Heeft u vragen of klopt er iets niet? Beantwoord gewoon deze mail.</p>
<p>Met vriendelijke groet,<br/>Bureau Vlieland</p>`;

  return {
    subject,
    intro,
    html,
    variables: {
      customer_name: input.customerName,
      reference_number: input.referenceNumber,
      days_until: input.daysUntil === null ? "" : String(input.daysUntil),
      portal_url: input.portalUrl,
      billing_missing: input.billingMissing ? "true" : "",
      stage: input.stage,
      all_confirmed: input.allConfirmed ? "true" : "",
    },
  };
}

/** Tekst van de beltaak vanaf drie dagen voor het evenement. */
export function buildTermsCallTodo(input: {
  stage: TermsStage;
  customerLabel: string;
  daysUntil: number;
  portalUrl: string;
}): { title: string; description: string } {
  const what = input.stage === "offerte" ? "akkoord en voorwaarden nog niet binnen" : "voorwaarden nog niet getekend";
  const title = `Bel ${input.customerLabel}: ${what} (event over ${daysLabel(input.daysUntil)})`;
  const description = input.stage === "offerte"
    ? `De klant heeft nog geen akkoord gegeven op het voorstel en de algemene voorwaarden niet ondertekend. Bel de klant en vraag akkoord te geven en te tekenen via ${input.portalUrl}.`
    : `De klant heeft akkoord gegeven maar de algemene voorwaarden nog niet ondertekend. Zonder handtekening kunnen partners pas factureren nadat het project is vrijgegeven. Bel de klant en vraag te tekenen via ${input.portalUrl}.`;
  return { title, description };
}
