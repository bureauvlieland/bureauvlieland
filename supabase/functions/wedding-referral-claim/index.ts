// wedding-referral-claim
//
// De pagina achter de link in de partnermail (/doorverwijzing/:token,
// docs/plan-bruiloftsdoorverwijzingen.md → Mail aan de partner): "Was dit
// bruidspaar al bij jullie bekend?". Twee acties:
// - "status": voor wie is de link, en kan er nog gemeld worden;
// - "report": de partner meldt dat het bruidspaar al bekend was, met de datum
//   van het eerste contact en een optionele opmerking.
//
// Openbaar (verify_jwt = false): de link is het bewijs, net als bij de
// beoordelingspagina. De link werkt tot en met de vijfde werkdag (Nederlandse
// tijd) na de doorverwijsmail; daarna is hij verlopen en verandert er niets
// meer. Een melding legt "al bekend" vast op de doorverwijzing; de vergoeding
// valt dan weg (zie src/lib/weddingReferrals.ts) en het bureau krijgt een taak
// én een mail (naar het voorbeeld van _shared/lodging-bureau-alert.ts), zodat
// de melding niet blijft liggen tot iemand de Werkbank opent. De mail wordt
// gelogd op het project en de partner en, bij een project, in het
// communicatiedossier.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://esm.sh/zod@3.23.8";
import { amsterdamDate, claimDeadline, formatIsoDateNL, isClaimWindowOpen, isValidIsoDate } from "../_shared/weddingReferralDates.ts";
import { sendMailjet, type MailjetMessage, type SendMailjetResult } from "../_shared/mailjet-send.ts";
import { logEmail, type EmailLogEntry } from "../_shared/email-logger.ts";
import { getPortalBaseUrl, getRecipientEmail, getSubjectPrefix, sanitizeHtml } from "../_shared/email-templates.ts";
import { GENERAL_CONTACT_EMAIL } from "../_shared/bureau-contact.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const TokenSchema = z.string().trim().min(16).max(128);

export const BodySchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("status"), token: TokenSchema }),
  z.object({
    action: z.literal("report"),
    token: TokenSchema,
    firstContactAt: z.string().trim().max(20).default(""),
    note: z.string().trim().max(2000).default(""),
  }),
]);

export type ClaimInput = z.infer<typeof BodySchema>;

export type ClaimState = "open" | "reported" | "expired";

export interface ClaimRow {
  id: string;
  request_id: string | null;
  partner_id: string;
  couple_names: string;
  referred_at: string;
  partner_claim: string;
  partner_claim_reported_at: string | null;
  partner_claim_first_contact_at: string | null;
  partner_claim_note: string;
}

/** Wat de pagina te zien krijgt. Geen contactgegevens van het bruidspaar, alleen de namen. */
export interface ClaimView {
  state: ClaimState;
  partnerName: string;
  coupleNames: string;
  referredAt: string;
  deadline: string;
  reportedAt: string | null;
  firstContactAt: string | null;
  note: string;
}

/** Gemeld, of nog open, of verlopen (vijf werkdagen na de doorverwijsmail, Nederlandse tijd). */
export function claimState(row: Pick<ClaimRow, "partner_claim" | "referred_at">, today: string): ClaimState {
  if (row.partner_claim === "already_known") return "reported";
  return isClaimWindowOpen(row.referred_at, today) ? "open" : "expired";
}

export function toView(row: ClaimRow, partnerName: string, state: ClaimState): ClaimView {
  return {
    state,
    partnerName,
    coupleNames: row.couple_names,
    referredAt: row.referred_at,
    deadline: claimDeadline(row.referred_at),
    reportedAt: row.partner_claim_reported_at,
    firstContactAt: row.partner_claim_first_contact_at,
    note: row.partner_claim_note ?? "",
  };
}

// Minimale typering van de Supabase-client zodat de handler met een stub te
// testen is; de echte client wordt in Deno.serve hieronder hiernaar gecast.
export interface QueryBuilder extends PromiseLike<{ data: unknown; error: { message: string } | null }> {
  select: (columns?: string) => QueryBuilder;
  insert: (row: Record<string, unknown>) => QueryBuilder;
  update: (row: Record<string, unknown>) => QueryBuilder;
  eq: (column: string, value: unknown) => QueryBuilder;
  maybeSingle: () => QueryBuilder;
}
export interface Db {
  from: (table: string) => QueryBuilder;
}

export interface ClaimContext {
  db: Db;
  now: Date;
  /** Verstuurt de bureaumail; in de test een stub. */
  send: (message: MailjetMessage, idempotencyKey: string) => Promise<SendMailjetResult>;
  /** Legt de bureaumail vast in email_log. */
  log: (entry: EmailLogEntry) => Promise<void>;
  /** Origin van de pagina (testmodus: ander adres en [TEST] in het onderwerp). */
  origin?: string;
}

/** email_type van de bureaumail; ook het label in src/types/projectCommunication.ts. */
export const BUREAU_MAIL_TYPE = "wedding_referral_claim_bureau";

export interface BureauMailInput {
  referral: Pick<ClaimRow, "id" | "request_id" | "partner_id" | "couple_names" | "referred_at">;
  partnerName: string;
  firstContactAt: string;
  reportedAt: string;
  note: string;
  project: { reference_number: string | null; customer_name: string } | null;
  origin?: string;
}

export function bureauMailSubject(input: Pick<BureauMailInput, "partnerName" | "referral" | "project" | "origin">): string {
  const ref = input.project?.reference_number ? ` (${input.project.reference_number})` : "";
  return `${getSubjectPrefix(input.origin)}Al bekend gemeld — ${input.partnerName || "Partner"} over ${input.referral.couple_names}${ref}`;
}

function rij(label: string, value: string): string {
  return `<tr>
    <td style="padding:6px 0; color:#64748b; font-size:14px;">${sanitizeHtml(label)}</td>
    <td style="padding:6px 0; text-align:right; font-size:14px;"><strong>${sanitizeHtml(value)}</strong></td>
  </tr>`;
}

export function bureauMailHtml(input: BureauMailInput): string {
  const base = getPortalBaseUrl(input.origin);
  const rijen = [
    input.project?.reference_number ? rij("Project", input.project.reference_number) : "",
    input.project ? rij("Klant", input.project.customer_name) : "",
    rij("Bruidspaar", input.referral.couple_names),
    rij("Partner", input.partnerName || "Partner"),
    rij("Doorverwezen op", formatIsoDateNL(input.referral.referred_at)),
    rij("Eerste contact volgens de partner", formatIsoDateNL(input.firstContactAt)),
    rij("Gemeld op", formatIsoDateNL(input.reportedAt)),
  ]
    .filter(Boolean)
    .join("");
  const opmerking = input.note
    ? `<p style="margin:16px 0 0; padding:12px 14px; background:#f8fafc; border-left:3px solid #0F4C5C; border-radius:4px; font-size:14px; white-space:pre-wrap;">
        <strong>Opmerking van de partner:</strong><br>${sanitizeHtml(input.note)}
      </p>`
    : "";
  const projectKnop = input.referral.request_id
    ? `<a href="${base}/admin/aanvragen/${input.referral.request_id}" style="color:#0F4C5C; margin-left:16px;">Open het project</a>`
    : "";
  return `<div style="font-family: Arial, sans-serif; max-width:600px; margin:0 auto; color:#0f172a;">
    <h2 style="color:#0F4C5C; margin-bottom:4px;">Partner meldt: bruidspaar was al bekend</h2>
    <p style="margin:0 0 16px; color:#64748b; font-size:14px;">Interne melding via de link in de partnermail — geen actie voor de klant of partner. Er staat ook een taak in de Werkbank.</p>
    <table style="width:100%; border-collapse:collapse; background:#f8fafc; border-radius:8px; padding:8px;">
      ${rijen}
    </table>
    ${opmerking}
    <p style="margin:16px 0 0; font-size:14px;">Bekijk de doorverwijzing onder Bruiloften. Bij een boeking is de vergoeding dan nul.</p>
    <p style="margin:24px 0;">
      <a href="${base}/admin/bruiloften" style="background:#0F4C5C; color:#ffffff; padding:12px 20px; border-radius:6px; text-decoration:none; display:inline-block;">
        Bekijk de doorverwijzing
      </a>${projectKnop}
    </p>
  </div>`;
}

/**
 * De bureaumail: versturen, loggen en bij een project in het communicatiedossier
 * zetten. Faalt nooit hard: de melding van de partner is dan al vastgelegd en
 * de taak staat er; een mislukte mail staat als "failed" in het e-maillog.
 */
async function mailBureau(ctx: ClaimContext, input: BureauMailInput): Promise<void> {
  const subject = bureauMailSubject(input);
  const html = bureauMailHtml(input);
  const to = getRecipientEmail(GENERAL_CONTACT_EMAIL, input.origin);
  const idempotencyKey = `wedding-referral-claim-bureau-${input.referral.id}`;
  const message: MailjetMessage = {
    From: { Email: GENERAL_CONTACT_EMAIL, Name: "Bureau Vlieland" },
    To: [{ Email: to, Name: "Bureau Vlieland" }],
    Subject: subject,
    HTMLPart: html,
  };
  const metadata = {
    template_name: BUREAU_MAIL_TYPE,
    actor: "partner → bureau (bruidspaar al bekend gemeld)",
    referral_id: input.referral.id,
    partner_name: input.partnerName,
    idempotency_key: idempotencyKey,
  };

  let result: SendMailjetResult;
  try {
    result = await ctx.send(message, idempotencyKey);
  } catch (error) {
    result = { ok: false, error: error instanceof Error ? error.message : String(error) };
  }

  await ctx.log({
    email_type: BUREAU_MAIL_TYPE,
    subject,
    recipient_email: to,
    recipient_name: "Bureau Vlieland",
    related_request_id: input.referral.request_id ?? undefined,
    related_partner_id: input.referral.partner_id,
    status: result.ok ? "sent" : "failed",
    error_message: result.ok ? undefined : result.error,
    mailjet_message_id: result.ok ? (result.messageId ?? undefined) : undefined,
    sent_by: "system",
    html_body: html,
    from_email: GENERAL_CONTACT_EMAIL,
    idempotency_key: idempotencyKey,
    metadata: result.ok ? metadata : { ...metadata, failure: true },
  });
  if (!result.ok) console.error("wedding-referral-claim: bureaumail niet verstuurd:", result.error);

  // Ook in het communicatiedossier, zodat de Communicatie-tab in de Werkbank
  // (die alleen project_communications leest) de melding toont.
  if (result.ok && input.referral.request_id) {
    const { error } = await ctx.db.from("project_communications").insert({
      request_id: input.referral.request_id,
      accommodation_id: null,
      communication_type: "email_out",
      direction: "outbound",
      subject,
      content: [
        `${input.partnerName || "De partner"} meldt via de link dat ${input.referral.couple_names} al bekend was.`,
        `Eerste contact volgens de partner: ${formatIsoDateNL(input.firstContactAt)}.`,
        input.note ? `Opmerking: ${input.note}` : null,
      ]
        .filter(Boolean)
        .join("\n"),
      contact_name: "Bureau Vlieland",
      contact_email: to,
      logged_by: null,
      communication_date: ctx.now.toISOString(),
    });
    if (error) console.error("wedding-referral-claim: communicatiedossier niet bijgewerkt:", error.message);
  }
}

export type ClaimResult = { status: number; body: Record<string, unknown> };

const COLUMNS =
  "id, request_id, partner_id, couple_names, referred_at, partner_claim, partner_claim_reported_at, partner_claim_first_contact_at, partner_claim_note";

export async function handleClaim(input: ClaimInput, ctx: ClaimContext): Promise<ClaimResult> {
  const { data, error } = await ctx.db.from("wedding_referrals").select(COLUMNS).eq("claim_token", input.token).maybeSingle();
  if (error) return { status: 500, body: { error: "server_error" } };
  if (!data) return { status: 404, body: { error: "not_found" } };
  const row = data as ClaimRow;

  const { data: partnerRij } = await ctx.db.from("partners").select("name").eq("id", row.partner_id).maybeSingle();
  const partnerName = (partnerRij as { name: string } | null)?.name ?? "";

  const vandaag = amsterdamDate(ctx.now);
  const state = claimState(row, vandaag);

  if (input.action === "status") return { status: 200, body: { view: toView(row, partnerName, state) } };

  // Eerder gemeld: niets overschrijven, de pagina toont gewoon de melding.
  if (state === "reported") return { status: 200, body: { view: toView(row, partnerName, state) } };
  if (state === "expired") return { status: 410, body: { error: "expired", view: toView(row, partnerName, state) } };

  const eerstContact = input.firstContactAt;
  if (!eerstContact) return { status: 400, body: { error: "Vul de datum van jullie eerste contact in." } };
  if (!isValidIsoDate(eerstContact)) return { status: 400, body: { error: "Dit is geen geldige datum." } };
  if (eerstContact > row.referred_at) {
    return {
      status: 400,
      body: { error: `Het eerste contact moet vóór onze doorverwijzing van ${formatIsoDateNL(row.referred_at)} liggen. Was dat later, dan was het bruidspaar nog niet bij jullie bekend.` },
    };
  }

  const nu = ctx.now.toISOString();
  const { data: bijgewerkt, error: updateError } = await ctx.db
    .from("wedding_referrals")
    .update({
      partner_claim: "already_known",
      partner_claim_reported_at: vandaag,
      partner_claim_first_contact_at: eerstContact,
      partner_claim_note: input.note,
      partner_claim_submitted_at: nu,
      partner_claim_source: "link",
    })
    .eq("id", row.id)
    .eq("partner_claim", "none")
    .select("id");
  if (updateError) return { status: 500, body: { error: "server_error" } };
  // Tussen lezen en schrijven was er al een melding (dubbel klikken): dan staat die er nu.
  if (Array.isArray(bijgewerkt) && bijgewerkt.length === 0) {
    return { status: 200, body: { view: toView({ ...row, partner_claim: "already_known" }, partnerName, "reported") } };
  }

  const gemeld: ClaimRow = {
    ...row,
    partner_claim: "already_known",
    partner_claim_reported_at: vandaag,
    partner_claim_first_contact_at: eerstContact,
    partner_claim_note: input.note,
  };

  // Een taak voor het bureau: controleer de doorverwijzing; bij een boeking is de vergoeding nul.
  const { error: todoError } = await ctx.db.from("admin_todos").insert({
    title: `${partnerName || "Partner"} meldt: ${row.couple_names} was al bekend`.slice(0, 200),
    description: [
      `Eerste contact volgens de partner: ${formatIsoDateNL(eerstContact)}.`,
      input.note ? `Opmerking: ${input.note}` : null,
      "Bekijk de doorverwijzing onder Bruiloften. Bij een boeking is de vergoeding dan nul.",
    ]
      .filter(Boolean)
      .join("\n"),
    priority: "normal",
    status: "todo",
    related_partner_id: row.partner_id,
    related_request_id: row.request_id,
    auto_type: "wedding_referral_claim",
    auto_entity_id: row.id,
  });
  if (todoError) console.error("wedding-referral-claim: taak niet aangemaakt:", todoError.message);

  // En een mail aan het bureau, gelogd op het project en de partner.
  let project: BureauMailInput["project"] = null;
  if (row.request_id) {
    const { data: projectRij } = await ctx.db
      .from("program_requests")
      .select("reference_number, customer_name")
      .eq("id", row.request_id)
      .maybeSingle();
    project = (projectRij as BureauMailInput["project"]) ?? null;
  }
  await mailBureau(ctx, {
    referral: row,
    partnerName,
    firstContactAt: eerstContact,
    reportedAt: vandaag,
    note: input.note,
    project,
    origin: ctx.origin,
  });

  return { status: 200, body: { view: toView(gemeld, partnerName, "reported") } };
}

export async function handler(req: Request): Promise<Response> {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json(405, { error: "method_not_allowed" });

  try {
    const raw = await req.json().catch(() => ({}));
    const parsed = BodySchema.safeParse(raw);
    if (!parsed.success) return json(400, { error: "invalid_request" });

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const result = await handleClaim(parsed.data, {
      db: supabase as unknown as Db,
      now: new Date(),
      send: (message, idempotencyKey) =>
        sendMailjet({ messages: [message], source: "wedding-referral-claim", idempotencyKey, checkSuppression: false }),
      log: logEmail,
      origin: req.headers.get("origin") ?? undefined,
    });
    return json(result.status, result.body);
  } catch (error) {
    console.error("Error in wedding-referral-claim:", error);
    return json(500, { error: "server_error" });
  }
}

if (import.meta.main) Deno.serve(handler);
