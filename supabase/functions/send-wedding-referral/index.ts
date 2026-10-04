// send-wedding-referral
//
// Doorverwijsknop voor bruiloftsaanvragen (docs/plan-bruiloftsdoorverwijzingen.md).
// Een admin verstuurt de (bewerkte) standaardmail aan het bruidspaar met de
// partner in cc. Op hetzelfde moment krijgt de partner een eigen, persoonlijke
// mail met alle gegevens van het bruidspaar en een link om te melden dat het
// bruidspaar al bij hem bekend was (zie wedding-referral-claim). Daarna wordt de
// doorverwijzing aangemaakt met beide verzonden mails als vastlegging, en een
// sales-inboxmail op "verwerkt" gezet.
//
// Alleen partners met receives_wedding_referrals zijn toegestaan. Het
// doorverwijsadres van de partner is het aparte adres, anders het contactadres,
// anders het loginadres. In testmodus (preview) gaan beide mails naar het
// testadres en vervalt de cc.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://esm.sh/zod@3.23.8";
import {
  buildReplyTo,
  getPortalBaseUrl,
  getRecipientEmail,
  getRenderedTemplate,
  getSubjectPrefix,
  isTestMode,
  sanitizeHtml,
  SENDER_EMAIL,
  SENDER_NAME,
  TemplateIds,
  wrapEmailHtml,
} from "../_shared/email-templates.ts";
import { logEmail, type EmailLogEntry } from "../_shared/email-logger.ts";
import { sendMailjet, type MailjetMessage, type SendMailjetResult } from "../_shared/mailjet-send.ts";
import { amsterdamDate, claimDeadline, formatIsoDateNL, formatWeddingDateNL } from "../_shared/weddingReferralDates.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const isoDate = /^\d{4}-\d{2}-\d{2}$/;

export const BodySchema = z.object({
  partnerId: z.string().trim().min(1).max(100),
  coupleNames: z.string().trim().min(1).max(200),
  coupleEmail: z.string().trim().email().max(255),
  couplePhone: z.string().trim().max(40).optional().nullable(),
  requestId: z.string().uuid().optional().nullable(),
  salesInboxId: z.string().uuid().optional().nullable(),
  requestedAt: z.string().regex(isoDate),
  expectedWeddingDate: z.string().regex(isoDate).optional().nullable(),
  expectedWeddingPrecision: z.enum(["day", "month"]).default("day"),
  estimatedGuests: z.number().int().min(0).max(100000).optional().nullable(),
  notes: z.string().max(5000).default(""),
  priorContactNote: z.string().max(2000).default(""),
  subject: z.string().trim().min(1).max(300),
  body: z.string().trim().min(1).max(20000),
  origin: z.string().max(300).optional(),
});

export type ReferralInput = z.infer<typeof BodySchema>;

export interface ReferralPartner {
  id: string;
  name: string;
  email: string;
  contact_email: string | null;
  wedding_referral_email: string | null;
  booking_contact_name: string | null;
  receives_wedding_referrals: boolean;
  is_active: boolean;
}

/** Zonder boeking vervalt een doorverwijzing 18 maanden na de datum doorverwezen. */
export const REFERRAL_EXPIRY_MONTHS = 18;

/** Het adres waar de partner de doorverwijzing ontvangt. */
export function referralAddressFor(p: Pick<ReferralPartner, "email" | "contact_email" | "wedding_referral_email">): string {
  return p.wedding_referral_email?.trim() || p.contact_email?.trim() || p.email;
}

/** yyyy-MM-dd van een datum in UTC. */
export function toIsoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Vervaldatum: `months` maanden later; een 31e valt terug op de laatste dag van de maand. */
export function addMonthsIso(iso: string, months: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const target = new Date(Date.UTC(y, m - 1 + months, 1));
  const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  target.setUTCDate(Math.min(d, lastDay));
  return toIsoDate(target);
}

const escapeHtml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** Platte tekst uit het dialoog naar veilige HTML: ontsmet, regeleinden, klikbare links. */
export function plainTextToHtml(text: string): string {
  const escaped = escapeHtml(text.trim());
  const linked = escaped.replace(/https?:\/\/[^\s<]+[^\s<.,;:!?)]/g, (url) => `<a href="${url}" style="color:#0F4C5C;">${url}</a>`);
  return `<div style="font-size:15px; line-height:1.6; color:#1a1a1a;">${linked.replace(/\n/g, "<br>")}</div>`;
}

export interface MessageInput {
  coupleEmail: string;
  coupleNames: string;
  partner: Pick<ReferralPartner, "name" | "email" | "contact_email" | "wedding_referral_email">;
  subject: string;
  html: string;
  origin?: string;
  referenceNumber?: string | null;
}

/**
 * Het Mailjet-bericht: bruidspaar in To, partner in Cc. In testmodus gaat To
 * naar het testadres en vervalt de cc, zodat een preview nooit een partner
 * mailt.
 */
export function buildReferralMessage(input: MessageInput): { message: MailjetMessage; cc: string | null; testMode: boolean } {
  const testMode = isTestMode(input.origin);
  const cc = testMode ? null : referralAddressFor(input.partner);
  const replyTo = buildReplyTo(input.referenceNumber);
  const message: MailjetMessage = {
    From: { Email: SENDER_EMAIL, Name: SENDER_NAME },
    To: [{ Email: getRecipientEmail(input.coupleEmail, input.origin), Name: input.coupleNames }],
    ...(cc ? { Cc: [{ Email: cc, Name: input.partner.name }] } : {}),
    ...(replyTo ? { ReplyTo: replyTo } : {}),
    Subject: `${getSubjectPrefix(input.origin)}${input.subject}`,
    HTMLPart: input.html,
    TrackOpens: "enabled",
    TrackClicks: "disabled",
  };
  return { message, cc, testMode };
}

/** Aanhef voor de partner: voornaam van de contactpersoon, anders de naam van de partner. */
export function partnerGreeting(p: Pick<ReferralPartner, "name" | "booking_contact_name">): string {
  const eerste = p.booking_contact_name?.trim().split(/\s+/)[0];
  return eerste || p.name;
}

export const MAX_REQUEST_TEXT = 8000;

/**
 * De aanvraag zoals het bruidspaar hem invulde: eerst de vrije tekst, daarna
 * de overige formuliervelden als "Label: waarde". Lege velden vallen weg.
 */
export function composeRequestText(parts: {
  free: Array<string | null | undefined>;
  fields: Array<[label: string, value: string | null | undefined]>;
}): string {
  const vrij = [...new Set(parts.free.map((t) => (t ?? "").trim()).filter(Boolean))];
  const velden = parts.fields
    .map(([label, waarde]) => [label, (waarde ?? "").trim()] as const)
    .filter(([, waarde]) => waarde !== "")
    .map(([label, waarde]) => `${label}: ${waarde}`);
  const tekst = [...vrij, velden.join("\n")].filter(Boolean).join("\n\n");
  return tekst.length > MAX_REQUEST_TEXT ? `${tekst.slice(0, MAX_REQUEST_TEXT).trimEnd()}…` : tekst;
}

/** Platte tekst als veilige HTML voor in het sjabloon: ontsmet en met regeleinden. */
export function textToTemplateHtml(text: string): string {
  return sanitizeHtml(text.trim()).replace(/\r?\n/g, "<br>");
}

/** "2 nachten, van 12 juni 2027 tot 14 juni 2027", of leeg als er geen verblijf is. */
export function overnightSummary(arrival: string | null | undefined, departure: string | null | undefined): string {
  if (!arrival || !departure) return "";
  const [ay, am, ad] = arrival.split("-").map(Number);
  const [dy, dm, dd] = departure.split("-").map(Number);
  const nachten = Math.round((Date.UTC(dy, dm - 1, dd) - Date.UTC(ay, am - 1, ad)) / 86_400_000);
  if (!Number.isFinite(nachten) || nachten < 1) return "";
  return `${nachten} ${nachten === 1 ? "nacht" : "nachten"}, van ${formatIsoDateNL(arrival)} tot ${formatIsoDateNL(departure)}`;
}

const GROEPSSITUATIE: Record<string, string> = { vanaf_wal: "Komt vanaf de wal", op_vlieland: "Is al op Vlieland" };

/** Alles uit de oorspronkelijke aanvraag dat de partner te zien krijgt. */
export interface SourceContext {
  referenceNumber: string | null;
  requestText: string;
  overnachtingen: string;
}

/** Waarden voor het partnersjabloon; alles is al ontsmet of een veilige link. */
export interface PartnerMailVars {
  partner_contactpersoon: string;
  naam_klant: string;
  email_klant: string;
  telefoon_klant: string;
  trouwdatum: string;
  aantal_gasten: string;
  overnachtingen: string;
  aanvraagtekst: string;
  uiterlijk_datum: string;
  al_bekend_link: string;
}

/** Waarden voor het onderwerp van de partnermail: platte tekst, zonder HTML-ontsmetting. */
export interface PartnerSubjectVars {
  naam_klant: string;
  trouwdatum: string;
}

const eenRegel = (t: string) => t.replace(/\s+/g, " ").trim();

export function buildPartnerSubjectVars(input: ReferralInput): PartnerSubjectVars {
  return {
    naam_klant: eenRegel(input.coupleNames),
    trouwdatum: input.expectedWeddingDate ? formatWeddingDateNL(input.expectedWeddingDate, input.expectedWeddingPrecision) : "",
  };
}

export function buildPartnerMailVars(args: {
  input: ReferralInput;
  partner: Pick<ReferralPartner, "name" | "booking_contact_name">;
  source: SourceContext;
  token: string;
  referredAt: string;
}): PartnerMailVars {
  const { input, partner, source, token, referredAt } = args;
  return {
    partner_contactpersoon: sanitizeHtml(partnerGreeting(partner)),
    naam_klant: sanitizeHtml(input.coupleNames),
    email_klant: sanitizeHtml(input.coupleEmail),
    telefoon_klant: sanitizeHtml(input.couplePhone?.trim() ?? ""),
    trouwdatum: input.expectedWeddingDate ? formatWeddingDateNL(input.expectedWeddingDate, input.expectedWeddingPrecision) : "",
    aantal_gasten: input.estimatedGuests ? String(input.estimatedGuests) : "",
    overnachtingen: sanitizeHtml(source.overnachtingen),
    aanvraagtekst: textToTemplateHtml(source.requestText),
    uiterlijk_datum: formatIsoDateNL(claimDeadline(referredAt)),
    al_bekend_link: sanitizeHtml(`${getPortalBaseUrl(input.origin)}/doorverwijzing/${token}`),
  };
}

/**
 * Het Mailjet-bericht aan de partner. In testmodus gaat het naar het
 * testadres, zodat een preview nooit een partner mailt.
 */
export function buildPartnerMessage(args: {
  partner: Pick<ReferralPartner, "name" | "email" | "contact_email" | "wedding_referral_email">;
  subject: string;
  html: string;
  origin?: string;
  referenceNumber?: string | null;
}): { message: MailjetMessage; to: string; testMode: boolean } {
  const testMode = isTestMode(args.origin);
  const adres = referralAddressFor(args.partner);
  const to = getRecipientEmail(adres, args.origin);
  const replyTo = buildReplyTo(args.referenceNumber);
  const message: MailjetMessage = {
    From: { Email: SENDER_EMAIL, Name: SENDER_NAME },
    To: [{ Email: to, Name: args.partner.name }],
    ...(replyTo ? { ReplyTo: replyTo } : {}),
    Subject: `${getSubjectPrefix(args.origin)}${args.subject}`,
    HTMLPart: args.html,
    TrackOpens: "enabled",
    TrackClicks: "disabled",
  };
  return { message, to, testMode };
}

// Minimale typering van de Supabase-client zodat de handler met een stub te
// testen is; de echte client wordt in Deno.serve hieronder hiernaar gecast.
export interface QueryBuilder extends PromiseLike<{ data: unknown; error: { message: string } | null }> {
  select: (columns?: string) => QueryBuilder;
  insert: (row: Record<string, unknown>) => QueryBuilder;
  update: (row: Record<string, unknown>) => QueryBuilder;
  eq: (column: string, value: unknown) => QueryBuilder;
  order: (column: string, options?: { ascending?: boolean }) => QueryBuilder;
  limit: (count: number) => QueryBuilder;
  maybeSingle: () => QueryBuilder;
  single: () => QueryBuilder;
}
export interface Db {
  from: (table: string) => QueryBuilder;
}

export interface HandlerContext {
  db: Db;
  userId: string;
  now: Date;
  send: (message: MailjetMessage, idempotencyKey: string) => Promise<SendMailjetResult>;
  log: (entry: EmailLogEntry) => Promise<void>;
  wrap: (innerHtml: string) => Promise<string>;
  /** Rendert het partnersjabloon (onderwerp en bericht in huisstijl), of null als het sjabloon ontbreekt of uit staat. */
  renderPartnerTemplate: (vars: PartnerMailVars, subjectVars: PartnerSubjectVars) => Promise<{ subject: string; body: string } | null>;
  /** Een nieuw, niet te raden token voor de "al bekend"-link. */
  newToken: () => string;
}

export type PartnerMailStatus = "sent" | "duplicate" | "suppressed" | "failed";

/** Haalt de aanvraag op waaruit de doorverwijzing komt: een project of een sales-inboxmail. */
async function loadSource(input: ReferralInput, db: Db): Promise<{ ok: true; source: SourceContext } | { ok: false; result: HandlerResult }> {
  const source: SourceContext = { referenceNumber: null, requestText: "", overnachtingen: "" };

  if (input.requestId) {
    const { data: pr } = await db
      .from("program_requests")
      .select("id, reference_number, customer_company, general_notes, program_description, group_situation, selected_dates")
      .eq("id", input.requestId)
      .maybeSingle();
    if (!pr) return { ok: false, result: { status: 404, body: { error: "Project niet gevonden" } } };
    const r = pr as {
      reference_number: string | null;
      customer_company: string | null;
      general_notes: string | null;
      program_description: string | null;
      group_situation: string | null;
      selected_dates: unknown;
    };
    source.referenceNumber = r.reference_number ?? null;

    const { data: logiesRijen } = await db
      .from("accommodation_requests")
      .select("arrival_date, departure_date, special_requests, status")
      .eq("linked_program_id", input.requestId);
    const logies = ((logiesRijen as Array<{ arrival_date: string; departure_date: string; special_requests: string | null; status: string | null }> | null) ?? []).find(
      (l) => l.status !== "cancelled",
    );
    source.overnachtingen = overnightSummary(logies?.arrival_date, logies?.departure_date);

    const data = Array.isArray(r.selected_dates) ? r.selected_dates.filter((d): d is string => typeof d === "string" && d !== "") : [];
    source.requestText = composeRequestText({
      free: [r.general_notes, r.program_description],
      fields: [
        ["Organisatie", r.customer_company],
        ["Groepssituatie", r.group_situation ? GROEPSSITUATIE[r.group_situation] ?? r.group_situation : null],
        ["Opgegeven data", data.length > 1 ? data.join(", ") : null],
        ["Wensen logies", logies?.special_requests],
      ],
    });
  } else if (input.salesInboxId) {
    const { data: inbox } = await db.from("sales_inbox").select("id, body_text, scan_result").eq("id", input.salesInboxId).maybeSingle();
    if (inbox) {
      const rij = inbox as { body_text: string | null; scan_result: Record<string, unknown> | null };
      const scan = rij.scan_result ?? {};
      const tekst = (k: string) => (typeof scan[k] === "string" ? (scan[k] as string) : null);
      source.requestText = composeRequestText({
        free: [rij.body_text],
        fields: [
          ["Organisatie", tekst("customer_company")],
          ["Budget", tekst("budget_indication")],
          ["Bron", tekst("source")],
        ],
      });
    }
  }
  return { ok: true, source };
}

export type HandlerResult = { status: number; body: Record<string, unknown> };

export async function handleWeddingReferral(input: ReferralInput, ctx: HandlerContext): Promise<HandlerResult> {
  const { data: partner, error: partnerError } = await ctx.db
    .from("partners")
    .select("id, name, email, contact_email, wedding_referral_email, booking_contact_name, receives_wedding_referrals, is_active")
    .eq("id", input.partnerId)
    .maybeSingle();
  if (partnerError) return { status: 500, body: { error: `Partner ophalen mislukt: ${partnerError.message}` } };
  if (!partner) return { status: 404, body: { error: "Partner niet gevonden" } };
  const p = partner as ReferralPartner;
  if (!p.receives_wedding_referrals) {
    return { status: 400, body: { error: `${p.name} ontvangt geen bruiloftsdoorverwijzingen. Zet dat aan op de partnerpagina.` } };
  }

  const bron = await loadSource(input, ctx.db);
  if (bron.ok === false) return bron.result;
  const referenceNumber = bron.source.referenceNumber;

  const html = await ctx.wrap(plainTextToHtml(input.body));
  const { message, cc, testMode } = buildReferralMessage({
    coupleEmail: input.coupleEmail,
    coupleNames: input.coupleNames,
    partner: p,
    subject: input.subject,
    html,
    origin: input.origin,
    referenceNumber,
  });

  const idempotencyKey = `wedding-referral-${input.coupleEmail.trim().toLowerCase()}-${p.id}`;
  const result = await ctx.send(message, idempotencyKey);
  if (!result.ok) {
    await ctx.log({
      email_type: TemplateIds.WEDDING_REFERRAL_CUSTOMER,
      subject: message.Subject,
      recipient_email: message.To[0].Email,
      recipient_name: input.coupleNames,
      related_request_id: input.requestId ?? undefined,
      related_partner_id: p.id,
      status: "failed",
      error_message: result.error,
      sent_by: `admin:${ctx.userId}`,
      metadata: { template_name: TemplateIds.WEDDING_REFERRAL_CUSTOMER, actor: "admin → bruidspaar (doorverwijzing, partner in cc)", cc },
    });
    return { status: 502, body: { error: `Mail niet verstuurd: ${result.error}` } };
  }
  if (result.skipped === "suppressed") {
    const wie = result.suppressedRecipient?.email ?? input.coupleEmail;
    return { status: 400, body: { error: `Niet verstuurd: ${wie} staat op de suppressielijst (${result.suppressedRecipient?.reason ?? "geblokkeerd"}).` } };
  }

  await ctx.log({
    email_type: TemplateIds.WEDDING_REFERRAL_CUSTOMER,
    subject: message.Subject,
    recipient_email: message.To[0].Email,
    recipient_name: input.coupleNames,
    related_request_id: input.requestId ?? undefined,
    related_partner_id: p.id,
    status: "sent",
    mailjet_message_id: result.messageId ?? undefined,
    sent_by: `admin:${ctx.userId}`,
    idempotency_key: idempotencyKey,
    metadata: {
      template_name: TemplateIds.WEDDING_REFERRAL_CUSTOMER,
      actor: "admin → bruidspaar (doorverwijzing, partner in cc)",
      cc,
      partner_name: p.name,
      test_mode: testMode || undefined,
      duplicate: result.skipped === "duplicate" || undefined,
    },
  });

  const { data: logRow } = await ctx.db
    .from("email_log")
    .select("id")
    .eq("idempotency_key", idempotencyKey)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const emailLogId = (logRow as { id: string } | null)?.id ?? null;

  // De datum doorverwezen is de dag in Nederland; de termijn van vijf werkdagen telt vanaf die dag.
  const referredAt = amsterdamDate(ctx.now);

  // Dubbel geklikt: de mail aan het bruidspaar was al verstuurd (zie de idempotentiesleutel), dus
  // is er al een doorverwijzing met een werkende link. Geen tweede rij en geen tweede partnermail.
  if (result.skipped === "duplicate") {
    const { data: bestaande } = await ctx.db
      .from("wedding_referrals")
      .select("id")
      .eq("couple_email", input.coupleEmail)
      .eq("partner_id", p.id)
      .eq("referred_at", referredAt)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (bestaande) {
      return {
        status: 200,
        body: { referralId: (bestaande as { id: string }).id, emailLogId, cc, testMode, duplicate: true, partnerMail: "duplicate" satisfies PartnerMailStatus },
      };
    }
  }

  const claimToken = ctx.newToken();
  const { data: referral, error: referralError } = await ctx.db
    .from("wedding_referrals")
    .insert({
      couple_names: input.coupleNames,
      couple_email: input.coupleEmail,
      couple_phone: input.couplePhone?.trim() || null,
      request_id: input.requestId ?? null,
      sales_inbox_id: input.salesInboxId ?? null,
      partner_id: p.id,
      requested_at: input.requestedAt,
      referred_at: referredAt,
      expires_at: addMonthsIso(referredAt, REFERRAL_EXPIRY_MONTHS),
      expected_wedding_date: input.expectedWeddingDate ?? null,
      expected_wedding_precision: input.expectedWeddingPrecision,
      estimated_guests: input.estimatedGuests ?? null,
      notes: input.notes.trim(),
      prior_contact_note: input.priorContactNote.trim(),
      status: "referred",
      referral_email_log_id: emailLogId,
      claim_token: claimToken,
      created_by: ctx.userId,
    })
    .select("id")
    .single();
  if (referralError || !referral) {
    return { status: 500, body: { error: `Mail verstuurd, maar de doorverwijzing kon niet worden opgeslagen: ${referralError?.message ?? "onbekend"}`, emailLogId } };
  }
  const referralId = (referral as { id: string }).id;

  if (input.salesInboxId) {
    const { data: inbox } = await ctx.db.from("sales_inbox").select("id, notes").eq("id", input.salesInboxId).maybeSingle();
    if (inbox) {
      const bestaand = (inbox as { notes: string | null }).notes?.trim();
      const regel = `Doorverwezen naar ${p.name} op ${referredAt} (bruiloft).`;
      await ctx.db
        .from("sales_inbox")
        .update({
          status: "processed",
          processed_by: ctx.userId,
          processed_at: ctx.now.toISOString(),
          notes: bestaand ? `${bestaand}\n${regel}` : regel,
        })
        .eq("id", input.salesInboxId);
    }
  }

  if (input.requestId) {
    await ctx.db.from("project_communications").insert({
      request_id: input.requestId,
      accommodation_id: null,
      communication_type: "email_out",
      direction: "outbound",
      subject: message.Subject,
      content: `${input.body}\n\n(cc: ${cc ?? "geen, testmodus"})`,
      contact_name: input.coupleNames,
      contact_email: input.coupleEmail,
      logged_by: ctx.userId,
      communication_date: ctx.now.toISOString(),
    });
  }

  // De persoonlijke mail aan de partner, met de link om "al bekend" te melden. De
  // doorverwijzing bestaat dan al, zodat de link meteen werkt. Een mislukte
  // partnermail laat de doorverwijzing staan; de admin krijgt een waarschuwing.
  const partnerMail = await sendPartnerMail({
    ctx,
    input,
    partner: p,
    source: bron.source,
    token: claimToken,
    referredAt,
    referralId,
  });

  return {
    status: 200,
    body: {
      referralId,
      emailLogId,
      cc,
      testMode,
      duplicate: result.skipped === "duplicate",
      partnerMail: partnerMail.status,
      partnerMailError: partnerMail.error,
      partnerEmailLogId: partnerMail.logId,
    },
  };
}

async function sendPartnerMail(args: {
  ctx: HandlerContext;
  input: ReferralInput;
  partner: ReferralPartner;
  source: SourceContext;
  token: string;
  referredAt: string;
  referralId: string;
}): Promise<{ status: PartnerMailStatus; error?: string; logId: string | null }> {
  const { ctx, input, partner, source, token, referredAt, referralId } = args;

  const vars = buildPartnerMailVars({ input, partner, source, token, referredAt });
  const gerenderd = await ctx.renderPartnerTemplate(vars, buildPartnerSubjectVars(input));
  if (!gerenderd) {
    return { status: "failed", error: `Het sjabloon ${TemplateIds.WEDDING_REFERRAL_PARTNER} ontbreekt of staat uit.`, logId: null };
  }

  const { message, to, testMode } = buildPartnerMessage({
    partner,
    subject: gerenderd.subject,
    html: gerenderd.body,
    origin: input.origin,
    referenceNumber: source.referenceNumber,
  });
  const idempotencyKey = `wedding-referral-partner-${input.coupleEmail.trim().toLowerCase()}-${partner.id}`;
  const metadata = {
    template_name: TemplateIds.WEDDING_REFERRAL_PARTNER,
    actor: "admin → partner (nieuwe bruiloftsaanvraag)",
    referral_id: referralId,
    partner_name: partner.name,
    test_mode: testMode || undefined,
  };

  const result = await ctx.send(message, idempotencyKey);
  if (!result.ok) {
    await ctx.log({
      email_type: TemplateIds.WEDDING_REFERRAL_PARTNER,
      subject: message.Subject,
      recipient_email: to,
      recipient_name: partner.name,
      related_request_id: input.requestId ?? undefined,
      related_partner_id: partner.id,
      status: "failed",
      error_message: result.error,
      sent_by: `admin:${ctx.userId}`,
      metadata,
    });
    return { status: "failed", error: result.error, logId: null };
  }
  if (result.skipped === "suppressed") {
    return {
      status: "suppressed",
      error: `${result.suppressedRecipient?.email ?? to} staat op de suppressielijst (${result.suppressedRecipient?.reason ?? "geblokkeerd"}).`,
      logId: null,
    };
  }

  await ctx.log({
    email_type: TemplateIds.WEDDING_REFERRAL_PARTNER,
    subject: message.Subject,
    recipient_email: to,
    recipient_name: partner.name,
    related_request_id: input.requestId ?? undefined,
    related_partner_id: partner.id,
    status: "sent",
    mailjet_message_id: result.messageId ?? undefined,
    sent_by: `admin:${ctx.userId}`,
    idempotency_key: idempotencyKey,
    metadata: { ...metadata, duplicate: result.skipped === "duplicate" || undefined },
  });

  const { data: logRij } = await ctx.db
    .from("email_log")
    .select("id")
    .eq("idempotency_key", idempotencyKey)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const logId = (logRij as { id: string } | null)?.id ?? null;
  if (logId) await ctx.db.from("wedding_referrals").update({ partner_email_log_id: logId }).eq("id", referralId);

  return { status: result.skipped === "duplicate" ? "duplicate" : "sent", logId };
}

export async function handler(req: Request): Promise<Response> {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabase = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json(401, { error: "Niet geautoriseerd" });
    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: authHeader } } });
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) return json(401, { error: "Niet geautoriseerd" });
    const { data: roleData } = await supabase.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle();
    if (!roleData) return json(403, { error: "Geen admin rechten" });

    const raw = await req.json().catch(() => ({}));
    const parsed = BodySchema.safeParse(raw);
    if (!parsed.success) {
      return json(400, { error: `Ongeldige invoer: ${parsed.error.errors.map((e) => `${e.path.join(".")}: ${e.message}`).join(", ")}` });
    }
    const input = { ...parsed.data, origin: parsed.data.origin ?? req.headers.get("origin") ?? undefined };

    const result = await handleWeddingReferral(input, {
      db: supabase as unknown as Db,
      userId: user.id,
      now: new Date(),
      send: (message, idempotencyKey) => sendMailjet({ messages: [message], source: "send-wedding-referral", idempotencyKey }),
      log: logEmail,
      wrap: (inner) => wrapEmailHtml(inner, supabase),
      renderPartnerTemplate: (v, onderwerp) =>
        getRenderedTemplate(
          TemplateIds.WEDDING_REFERRAL_PARTNER,
          {
            partner_contactpersoon: v.partner_contactpersoon,
            naam_klant: v.naam_klant,
            email_klant: v.email_klant,
            telefoon_klant: v.telefoon_klant,
            trouwdatum: v.trouwdatum,
            aantal_gasten: v.aantal_gasten,
            overnachtingen: v.overnachtingen,
            aanvraagtekst: v.aanvraagtekst,
            uiterlijk_datum: v.uiterlijk_datum,
            al_bekend_link: v.al_bekend_link,
          },
          { naam_klant: onderwerp.naam_klant, trouwdatum: onderwerp.trouwdatum },
        ),
      newToken: () => crypto.randomUUID().replaceAll("-", ""),
    });
    return json(result.status, result.body);
  } catch (error) {
    console.error("Error in send-wedding-referral:", error);
    return json(500, { error: error instanceof Error ? error.message : "Interne fout" });
  }
}

if (import.meta.main) Deno.serve(handler);
