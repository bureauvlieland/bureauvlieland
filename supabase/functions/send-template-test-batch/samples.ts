/**
 * Testbatch van alle e-mails naar het bureau: zuivere opbouw.
 *
 * Twee bronnen:
 *  1. de templates in `email_templates`, gerenderd met voorbeeldgegevens
 *     (één verzonnen dossier BV-2611-TEST), zodat elke `{{variabele}}` en elk
 *     `{{#if}}`-blok iets laat zien;
 *  2. de mails die niet uit een template komen maar uit een zuivere
 *     opbouwfunctie in `_shared` (partneraanvraag met de drie
 *     onderdeelsoorten, aantalwijziging, wijzigingsbundel, dagoverzicht,
 *     bureau-meldingen).
 *
 * index.ts haalt de templates op, rendert, wikkelt in de huisstijl en
 * verstuurt in batches naar het testadres. Dit bestand kent geen database.
 */
import { processConditionals, replaceVariables } from "../_shared/email-templates.ts";
import { buildPartnerRequestMail } from "../_shared/partnerRequestMail.ts";
import { buildLodgingHeadcountMail, buildPartnerHeadcountMail } from "../_shared/partnerHeadcountMail.ts";
import { buildChangeDigestEmail, type ChangeDigestGroup } from "../_shared/changeDigest.ts";
import { buildBureauEventHtml, buildBureauEventMail, type BureauEventInput } from "../_shared/bureau-event.ts";
import { buildDailyDigest } from "../send-bureau-daily-digest/digest.ts";
import { buildHeadsupMail } from "../send-partner-headsup-t3/headsup-mail.ts";

export const TEST_REFERENCE = "BV-2611-TEST";
export const TEST_LOG_REFERENCE = "LOG-2611-TEST";
const PORTAL = "https://bureauvlieland.nl";

/** Voorbeeldwaarden per variabelenaam. Onbekende namen krijgen «naam». */
export const SAMPLE_VALUES: Record<string, string> = {
  customer_name: "Anna Testklant",
  customer_company: "Testbedrijf BV",
  customer_email: "anna@example.com",
  customer_phone: "06 12345678",
  partner_name: "Vliehors Expres (test)",
  partner_naam: "Vliehors Expres (test)",
  partner_contactpersoon: "Jan",
  partner_email: "partner@example.com",
  provider_name: "Vliehors Expres (test)",
  reference_number: TEST_REFERENCE,
  program_reference: TEST_REFERENCE,
  portal_url: `${PORTAL}/mijn-programma/test-token`,
  portal_link: `${PORTAL}/mijn-programma/test-token`,
  partner_portal_link: `${PORTAL}/partner/login`,
  admin_url: `${PORTAL}/admin/werkbank`,
  programma_url: `${PORTAL}/programma-op-maat`,
  approval_url: `${PORTAL}/referentie-akkoord/test-token`,
  own_review_url: `${PORTAL}/beoordeling/test-token`,
  google_review_url: "https://g.page/r/test/review",
  ferry_info_link: `${PORTAL}/veelgestelde-vragen`,
  chat_url: `${PORTAL}/admin/berichten`,
  al_bekend_link: `${PORTAL}/doorverwijzing/test-token`,
  set_password_link: `${PORTAL}/partner/reset-password`,
  reset_link: `${PORTAL}/partner/reset-password`,
  block_name: "Wadlooptocht Vliehors",
  activity_name: "Wadlooptocht Vliehors",
  accommodation_name: "Hotel Zeezicht (test)",
  accommodation_type: "hotel",
  number_of_people: "24",
  number_of_guests: "24",
  previous_number_of_guests: "20",
  aantal_gasten: "24",
  number_of_nights: "2",
  overnachtingen: "2",
  dates: "vrijdag 12 juni 2026",
  selected_dates: "vrijdag 12 en zaterdag 13 juni 2026",
  selected_date: "vrijdag 12 juni 2026",
  new_dates: "vrijdag 19 en zaterdag 20 juni 2026",
  datum: "12 juni 2026",
  trouwdatum: "12 juni 2026",
  event_date: "vrijdag 12 juni 2026",
  program_date_label: "vrijdag 12 juni 2026",
  arrival_date: "vrijdag 12 juni 2026",
  departure_date: "zondag 14 juni 2026",
  valid_until: "vrijdag 29 mei 2026",
  uiterlijk_datum: "vrijdag 29 mei 2026",
  duration: "2,5 uur",
  effective_time: "10:00",
  preferred_time: "10:00",
  proposed_time: "14:00",
  proposed_date: "12 juni 2026",
  original_time: "10:00",
  counter_time: "13:00",
  time_info: "10:00 tot 12:30",
  location: "Haven Vlieland",
  days_since: "5",
  quoted_price: "€ 750,00",
  price_total: "€ 1.240,00",
  price_per_person_per_night: "€ 62,50",
  amount_excl_vat: "€ 619,83",
  commission_activity: "10%",
  commission_accommodation: "8%",
  status_note: "Graag rond 10:00 verzamelen bij de haven.",
  status_text: "Bevestigd",
  status_color: "#38a169",
  status_bg_color: "#f0fff4",
  status_border_color: "#9ae6b4",
  notes: "Twee gasten zijn vegetarisch.",
  cancellation_reason: "De groep heeft gekozen voor een ander weekend.",
  personal_message: "Wat leuk dat jullie naar Vlieland komen. Hieronder ons voorstel.",
  partner_instructions: "Verzamelen bij de steiger, kaarten liggen bij de kiosk.",
  guest_names: "Anna, Bram, Chris en 21 anderen",
  guest_name: "Anna Testklant",
  dietary_notes: "2 vegetarisch, 1 glutenvrij",
  description: "Ruime kamers met zeezicht, ontbijt inbegrepen.",
  extras_list: "<li>Fietsverhuur</li><li>Lunchpakket</li>",
  review_text: "Een geweldige dag, iedereen was enthousiast!",
  source_label: "Klantportaal",
  visitor_name: "Anna Testklant",
  visitor_email: "anna@example.com",
  message: "Kunnen we de wadlooptocht een uur later beginnen?",
  message_preview: "Kunnen we de wadlooptocht een uur later beginnen?",
  subject: "Vraag over de wadlooptocht",
  title: "Teamuitje Testbedrijf",
  sender_label: "Hotel Zeezicht (test)",
  contact_info: "hallo@bureauvlieland.nl · 0562 123456",
  reply_info: "Reageer op deze mail om te antwoorden.",
  action_text: "Bekijk het voorstel en bevestig uw akkoord in het klantportaal.",
  actor_line: "<p><strong>Aan zet:</strong> klant</p>",
  voornaam: "Anna",
  naam_klant: "Anna Testklant",
  email_klant: "anna@example.com",
  telefoon_klant: "06 12345678",
  aanvraagtekst: "Wij zoeken een locatie voor een bruiloft met 60 gasten in juni.",
  late_intro: "",
  billing_note: "Dit onderdeel staat op de verblijfsnota van de gast.",
  partner_terms_note: "Onze partnervoorwaarden zijn van toepassing.",
  reservation_notice: "<p><strong>Onder voorbehoud:</strong> Zeiltocht (test) is nog niet bevestigd door de aanbieder.</p>",
  terms_accepted_block: "<p>U heeft de algemene voorwaarden geaccepteerd op 21 november 2026.</p>",
  price_section: "<p>Jouw prijsopgave: € 750,00 (blijft ongewijzigd)</p>",
  proposed_time_section: "<p><strong>Voorgestelde tijd:</strong> 14:00</p>",
  note_section: "<p><em>Graag rond 10:00 verzamelen bij de haven.</em></p>",
  counter_note_section: "<p><em>Liever een uur later vanwege de boot.</em></p>",
  changes_summary: "<ul><li>Wadlooptocht: 10:00 wordt 11:00</li><li>Lunch toegevoegd</li></ul>",
  changes_list: "<ul><li>Wadlooptocht: 10:00 wordt 11:00</li></ul>",
  items_list: "<ul><li>Wadlooptocht Vliehors</li><li>Lunch bij de haven</li></ul>",
  cancelled_items: "<ul><li>Wadlooptocht Vliehors</li></ul>",
  coordinated_items: "<li>Wadlooptocht Vliehors (Vliehors Expres)</li><li>Lunch bij de haven (Zuiver Traiteur)</li>",
  bureau_items: "<li>Overtocht Harlingen–Vlieland</li>",
  partner_items: "<li>Wadlooptocht Vliehors (Vliehors Expres)</li>",
  self_arranged_items: "<li>Diner in eigen beheer</li>",
  booking_summary: "<p>24 personen, 12 en 13 juni 2026, 3 onderdelen.</p>",
  guests_updated: "20 november 2026",
  // Vlaggen voor {{#if}}-blokken: "ja" toont het blok.
  is_inform: "",
  is_confirm_only: "",
  bureau_invoice: "ja",
  has_accommodation: "ja",
  was_selected: "ja",
  guest_pays_directly: "",
  admin_initiated: "",
};

/** Haalt alle variabelenamen uit een template, inclusief die in {{#if naam}}. */
export function placeholderNames(text: string): string[] {
  const names = new Set<string>();
  for (const m of text.matchAll(/\{\{\s*#if\s+([a-zA-Z0-9_]+)\s*\}\}/g)) names.add(m[1]);
  for (const m of text.matchAll(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g)) {
    if (m[1] !== "else") names.add(m[1]);
  }
  return [...names].sort();
}

/**
 * Gaat deze template naar een partner? Dan wijst `portal_url` naar het
 * partnerportaal, zoals de code in productie ook doet (de variabelenaam is
 * voor klant- en partnertemplates dezelfde).
 */
export function isPartnerTemplate(templateId: string): boolean {
  return /partner|^reminder_|headsup|_t\d+$/.test(templateId) && !/_customer$|_bureau$|customer_accommodation_message/.test(templateId);
}

const PARTNER_PORTAL_VALUES: Record<string, string> = {
  portal_url: `${PORTAL}/partner/login`,
  portal_link: `${PORTAL}/partner/login`,
};

/** Voorbeeldwaarden voor precies de variabelen die een template gebruikt. */
export function sampleVariablesFor(subject: string, body: string, templateId = ""): Record<string, string> {
  const vars: Record<string, string> = {};
  const partner = isPartnerTemplate(templateId);
  for (const name of placeholderNames(`${subject}\n${body}`)) {
    if (partner && name in PARTNER_PORTAL_VALUES) vars[name] = PARTNER_PORTAL_VALUES[name];
    else vars[name] = name in SAMPLE_VALUES ? SAMPLE_VALUES[name] : `«${name}»`;
  }
  return vars;
}

export interface RenderedTemplateTest {
  id: string;
  name: string;
  subject: string;
  /** Binnenkant; index.ts wikkelt in de huisstijl. */
  html: string;
  /** Variabelen zonder voorbeeldwaarde (zichtbaar als «naam» in de mail). */
  unknownVariables: string[];
}

export function renderTemplateForTest(t: { id: string; name: string; subject: string; body_html: string }): RenderedTemplateTest {
  const vars = sampleVariablesFor(t.subject, t.body_html, t.id);
  const unknown = Object.entries(vars).filter(([, v]) => v.startsWith("«")).map(([k]) => k);
  const subject = replaceVariables(processConditionals(t.subject, vars), vars);
  const html = replaceVariables(processConditionals(t.body_html, vars), vars);
  return { id: t.id, name: t.name, subject, html, unknownVariables: unknown };
}

export interface GeneratedTestMail {
  id: string;
  name: string;
  subject: string;
  html: string;
  /** De opbouwfunctie wikkelt zelf al in de huisstijl (dagoverzicht niet). */
  alreadyWrapped?: boolean;
}

/** De mails die niet uit een template komen maar uit een opbouwfunctie. */
export function buildGeneratedTestMails(): GeneratedTestMail[] {
  const out: GeneratedTestMail[] = [];
  const customer = "Testbedrijf BV";
  const partner = "Vliehors Expres (test)";

  const items = [
    { block_name: "Wadlooptocht Vliehors", partner_handling: "quote", billing_route: "bureau_invoice", preferred_time: "10:00" },
    { block_name: "Zaalhuur strandpaviljoen", partner_handling: "confirm", billing_route: "bureau_invoice", preferred_time: "13:00" },
    { block_name: "Koffie en gebak aan boord", partner_handling: "inform", billing_route: "guest_bill", preferred_time: null },
  ];
  for (const [label, extra] of [
    ["nieuwe aanvraag, klant nog niet getekend", { customerSigned: false }],
    ["aanvraag na ondertekening", { customerSigned: true }],
    ["herinnering", { customerSigned: true, reminder: true }],
  ] as const) {
    const m = buildPartnerRequestMail({
      partnerName: partner,
      referenceNumber: TEST_REFERENCE,
      customerLabel: customer,
      dates: ["2026-06-12", "2026-06-13"],
      numberOfPeople: 24,
      items,
      portalUrl: `${PORTAL}/partner/login`,
      ...extra,
    });
    out.push({ id: `program_request_partner:${label}`, name: `Partneraanvraag (${label})`, subject: m.subject, html: m.html });
  }

  const hc = buildPartnerHeadcountMail({
    partnerName: partner, customerLabel: customer, reference: TEST_REFERENCE,
    dates: "vrijdag 12 juni 2026", oldPeople: 20, newPeople: 24,
    items: [{ blockName: "Wadlooptocht Vliehors", people: 24, unitPrice: 27.5, priceType: "per_person", newTotal: 660, oldTotal: 550 }],
    note: "Twee collega's komen alsnog mee.", portalUrl: `${PORTAL}/partner/login`,
  });
  out.push({ id: "headcount_change_partner", name: "Aantalwijziging (activiteit)", subject: hc.subject, html: hc.html });
  const lhc = buildLodgingHeadcountMail({
    partnerName: "Hotel Zeezicht (test)", accommodationName: "Hotel Zeezicht", customerLabel: customer,
    arrival: "12 juni 2026", departure: "14 juni 2026", oldGuests: 20, newGuests: 24, currentPriceTotal: 2480,
    reference: TEST_LOG_REFERENCE, actionUrl: `${PORTAL}/partner/logies`,
  });
  out.push({ id: "headcount_change_accommodation_partner", name: "Aantalwijziging (logies)", subject: lhc.subject, html: lhc.html });

  const changes = [
    { item: "Wadlooptocht Vliehors", label: "Tijd", from: "10:00", to: "11:00" },
    { item: "Lunch bij de haven", label: "Toegevoegd", to: "12:30", note: "Op verzoek van de klant." },
  ];
  for (const kind of ["customer", "partner"] as const) {
    const group: ChangeDigestGroup = {
      key: `${kind}-test`, request_id: "test", recipient_kind: kind, recipient_email: "test@example.com", partner_id: null, row_ids: [],
      payload: {
        reference_number: TEST_REFERENCE, recipient_name: kind === "customer" ? "Anna Testklant" : partner, customer_label: customer,
        changes, portal_url: kind === "customer" ? `${PORTAL}/mijn-programma/test-token` : `${PORTAL}/partner/login`,
        actor: "bureau", dates: "vrijdag 12 juni 2026", number_of_people: 24,
      },
      notes: ["De aanbieder kon om 10:00 niet; 11:00 past beter bij de boot."],
    };
    const d = buildChangeDigestEmail(group);
    out.push({ id: `item_changes_digest:${kind}`, name: `Wijzigingsbundel (${kind === "customer" ? "klant" : "partner"})`, subject: d.subject, html: d.html });
  }

  const events: Array<[string, BureauEventInput]> = [
    ["partnerreactie bevestigd", { kind: "partner_item_confirmed", entityId: "i", request: { id: "test", reference_number: TEST_REFERENCE, customer_name: "Anna Testklant", customer_company: customer }, partner: { id: "p", name: partner }, itemName: "Wadlooptocht Vliehors", quotedPrice: 750 }],
    ["partnerreactie niet beschikbaar", { kind: "partner_item_unavailable", entityId: "i", request: { id: "test", reference_number: TEST_REFERENCE, customer_name: "Anna Testklant", customer_company: customer }, partner: { id: "p", name: partner }, itemName: "Wadlooptocht Vliehors", note: "Die dag zijn we vol." }],
    ["klant akkoord", { kind: "customer_quote_accepted", entityId: "test", request: { id: "test", reference_number: TEST_REFERENCE, customer_name: "Anna Testklant", customer_company: customer } }],
    ["klant getekend", { kind: "customer_terms_signed", entityId: "test", request: { id: "test", reference_number: TEST_REFERENCE, customer_name: "Anna Testklant", customer_company: customer }, reservationNames: "Zeiltocht (test)" }],
  ];
  for (const [label, input] of events) {
    const mail = buildBureauEventMail(input);
    if (!mail) continue;
    out.push({ id: `${mail.email_type}:${label}`, name: `Bureau-melding (${label})`, subject: mail.subject, html: buildBureauEventHtml(mail, `${PORTAL}/admin/aanvragen/test`) });
  }

  const digest = buildDailyDigest({
    today: "2026-11-22", yesterday: "2026-11-21",
    inboundYesterday: [{ id: "a", title: `Partner ${partner} reageert op "Wadlooptocht Vliehors" — bevestigd`, auto_type: "partner_status_update", priority: "normal", created_at: "2026-11-21T09:00:00Z", related_request_id: "test", project_label: `${TEST_REFERENCE} · ${customer}` }],
    dueToday: [], expiringToday: [{ reference_number: TEST_REFERENCE, customer_label: customer, request_id: "test", valid_until: "2026-11-22" }],
    openLongerThan: [{ id: "c", title: "Inkoopfactuur ontbreekt: Zuiver Traiteur (test)", auto_type: "commission_missing_invoice", priority: "high", created_at: "2026-11-10T08:00:00Z", related_request_id: "test", project_label: `${TEST_REFERENCE} · ${customer}` }],
    conversationsLongerThan: [], failedYesterday: [], sentYesterday: 14,
  });
  out.push({ id: "bureau_daily_digest", name: "Dagoverzicht bureau", subject: digest.subject, html: digest.html });

  const headsup = buildHeadsupMail({
    partnerName: partner, blockName: "Wadlooptocht Vliehors", activityDate: "2026-06-12", effectiveTime: "10:00", durationMinutes: 150,
    people: 24, location: "Haven Vlieland", referenceNumber: TEST_REFERENCE, customerLabel: customer,
    partnerInstructions: "Verzamelen bij de steiger.", guestNames: "Anna, Bram en 22 anderen", dietaryNotes: null, guestsUpdatedAt: "2026-06-01",
    invoicingMode: null, item: { partner_handling: "quote", billing_route: "bureau_invoice" }, portalUrl: `${PORTAL}/partner/login`,
  });
  out.push({ id: "partner_headsup_t3:noodrem", name: "Briefing 3 dagen vooraf (noodremversie)", subject: headsup.subject, html: headsup.fallbackHtml });

  return out;
}

export interface TestBatchItem {
  index: number;
  kind: "template" | "generated";
  id: string;
  name: string;
}

/** Verdeelt een lijst in batches van `size`; batchnummer begint bij 1. */
export function sliceBatch<T>(all: T[], batch: number, size: number): { items: T[]; batches: number } {
  const batches = Math.max(1, Math.ceil(all.length / size));
  const b = Math.min(Math.max(1, batch), batches);
  return { items: all.slice((b - 1) * size, b * size), batches };
}
