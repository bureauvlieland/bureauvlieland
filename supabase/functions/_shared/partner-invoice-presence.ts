/**
 * Eén waarheid voor de vraag "is er al een inkoopfactuur voor dit onderdeel?".
 *
 * De automatische controle-taak (check-pending-items) keek eerder alleen naar
 * partner_purchase_invoices.item_id. Facturen die via e-mail binnenkomen worden
 * echter vaak op projectniveau gekoppeld (item_id blijft leeg) en/of via het
 * factuurnummer op het onderdeel geregistreerd — waardoor partners onterecht
 * een herinnering kregen voor een al verwerkte (zelfs betaalde) factuur.
 *
 * Deze helper gebruikt dezelfde signalen als de Commissie Werklijst
 * (_shared/commissionReconciliation.ts):
 *  - directe koppeling via partner_purchase_invoices.item_id
 *  - toewijzing via partner_purchase_invoice_allocations
 *  - factuurnummer op het onderdeel dat matcht met een factuur van dezelfde partner
 *  - partner heeft het onderdeel afgesloten met "geen factuur"
 *
 * Sinds de factuurroute via de inkoop-inbox (docs/plan-inkoopfacturen-via-inbox.md)
 * tellen daarnaast mee, zodat herinnering en partnerportaal hetzelfde zeggen:
 *  - een factuur van dezelfde partner die aan het project hangt (item_id leeg,
 *    request_id gevuld): inboxfacturen worden op projectniveau gekoppeld
 *  - een nog onverwerkte mail in purchase_invoice_inbox van het afzendadres
 *    van de partner, of met het BV-nummer van het project in onderwerp, tekst
 *    of scanresultaat: de partner heeft dan gedaan wat we vroegen
 */

export interface InvoicePresenceItem {
  id: string;
  provider_id?: string | null;
  request_id?: string | null;
  invoiced_number?: string | null;
  partner_dismissed_at?: string | null;
}

/** Een mail in de inkoop-inbox die nog niet verwerkt of weggegooid is. */
export interface InboxMailLike {
  from_email?: string | null;
  subject?: string | null;
  body_text?: string | null;
  scan_result?: unknown;
  status?: string | null;
}

/** Partnercontact, voor het herkennen van de afzender van een inboxmail. */
export interface PartnerContactLike {
  id: string;
  email?: string | null;
  contact_email?: string | null;
}

/** Statussen waarin een inboxmail is afgehandeld en dus niet meer "binnen" telt. */
export const INBOX_MAIL_CLOSED_STATUSES: ReadonlySet<string> = new Set(["processed", "discarded"]);

const REFERENCE_PATTERN = /\b(?:BV|LOG)-\d{4}-\d{4}\b/gi;

export interface InvoicePresenceIndex {
  /** item_ids met een directe factuurkoppeling. */
  invoiceItemIds: Set<string>;
  /** item_ids die via een (verzamel)factuur-allocatie zijn toegewezen. */
  allocatedItemIds: Set<string>;
  /** Genormaliseerde `partner::factuurnummer` sleutels van bestaande facturen. */
  invoiceKeys: Set<string>;
  /** `partner::request_id` van facturen die op projectniveau zijn gekoppeld. */
  projectInvoiceKeys: Set<string>;
  /** Partner-ids met een onverwerkte mail in de inkoop-inbox (op afzendadres). */
  inboxPartnerIds: Set<string>;
  /** Referentienummers (hoofdletters) uit onverwerkte inboxmails. */
  inboxReferenceNumbers: Set<string>;
}

/** Genormaliseerde sleutel zodat notatieverschillen (spaties/case) matchen. */
export function invoicePresenceKey(
  partnerId: string | null | undefined,
  invoiceNumber: string | null | undefined,
): string {
  const partner = (partnerId ?? "").trim().toLowerCase();
  const number = (invoiceNumber ?? "").replace(/\s+/g, "").trim().toLowerCase();
  return `${partner}::${number}`;
}

function normalizeEmail(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase();
}

/** Sleutel voor een factuur die aan het project (niet aan een onderdeel) hangt. */
export function projectInvoiceKey(
  partnerId: string | null | undefined,
  requestId: string | null | undefined,
): string {
  return `${(partnerId ?? "").trim().toLowerCase()}::${(requestId ?? "").trim().toLowerCase()}`;
}

export function buildInvoicePresenceIndex(input: {
  invoices: {
    item_id?: string | null;
    partner_id?: string | null;
    invoice_number?: string | null;
    request_id?: string | null;
  }[];
  allocations?: { item_id?: string | null }[];
  inboxMails?: InboxMailLike[];
  partners?: PartnerContactLike[];
}): InvoicePresenceIndex {
  const invoiceItemIds = new Set<string>();
  const allocatedItemIds = new Set<string>();
  const invoiceKeys = new Set<string>();
  const projectInvoiceKeys = new Set<string>();
  const inboxPartnerIds = new Set<string>();
  const inboxReferenceNumbers = new Set<string>();

  for (const inv of input.invoices ?? []) {
    if (inv.item_id) invoiceItemIds.add(inv.item_id);
    if (inv.invoice_number) invoiceKeys.add(invoicePresenceKey(inv.partner_id, inv.invoice_number));
    if (inv.partner_id && inv.request_id) projectInvoiceKeys.add(projectInvoiceKey(inv.partner_id, inv.request_id));
  }
  for (const alloc of input.allocations ?? []) {
    if (alloc.item_id) allocatedItemIds.add(alloc.item_id);
  }

  const partnerByEmail = new Map<string, string>();
  for (const p of input.partners ?? []) {
    for (const e of [p.email, p.contact_email]) {
      const key = normalizeEmail(e);
      if (key) partnerByEmail.set(key, p.id);
    }
  }
  for (const mail of input.inboxMails ?? []) {
    if (mail.status && INBOX_MAIL_CLOSED_STATUSES.has(mail.status)) continue;
    const partnerId = partnerByEmail.get(normalizeEmail(mail.from_email));
    if (partnerId) inboxPartnerIds.add(partnerId);
    const haystack = [
      mail.subject ?? "",
      mail.body_text ?? "",
      mail.scan_result ? JSON.stringify(mail.scan_result) : "",
    ].join("\n");
    for (const ref of haystack.match(REFERENCE_PATTERN) ?? []) {
      inboxReferenceNumbers.add(ref.toUpperCase());
    }
  }

  return { invoiceItemIds, allocatedItemIds, invoiceKeys, projectInvoiceKeys, inboxPartnerIds, inboxReferenceNumbers };
}

/** True als er op enige manier een factuur bekend is (of de partner heeft afgezien). */
export function hasPartnerInvoiceSignal(
  item: InvoicePresenceItem,
  index: InvoicePresenceIndex,
  /** Referentienummer van het project (BV-…), voor de inboxcontrole. */
  referenceNumber?: string | null,
): boolean {
  if (!item) return false;
  if (item.partner_dismissed_at) return true;
  if (index.invoiceItemIds.has(item.id)) return true;
  if (index.allocatedItemIds.has(item.id)) return true;
  if (item.provider_id && item.request_id
    && index.projectInvoiceKeys.has(projectInvoiceKey(item.provider_id, item.request_id))) return true;
  if (item.provider_id && index.inboxPartnerIds.has(item.provider_id)) return true;
  if (referenceNumber && index.inboxReferenceNumbers.has(referenceNumber.trim().toUpperCase())) return true;
  if (item.invoiced_number) {
    const key = invoicePresenceKey(item.provider_id, item.invoiced_number);
    if (index.invoiceKeys.has(key)) return true;
    // Factuurnummer staat op het onderdeel geregistreerd (bijv. via het
    // partnerportaal) maar de PDF/factuurrij is nog niet aangemaakt: ook dan
    // is de factuur "binnen" en hoeft er geen herinnering te gaan.
    return true;
  }
  return false;
}
