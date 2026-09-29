// send-wedding-referral
//
// Doorverwijsknop voor bruiloftsaanvragen (docs/plan-bruiloftsdoorverwijzingen.md,
// fase 2). Een admin verstuurt de (bewerkte) standaardmail aan het bruidspaar
// met de partner in cc. Daarna wordt de doorverwijzing aangemaakt met de
// verzonden mail als vastlegging, en een sales-inboxmail op "verwerkt" gezet.
//
// Alleen partners met receives_wedding_referrals zijn toegestaan. Het
// cc-adres is het aparte doorverwijsadres, anders het contactadres, anders
// het loginadres van de partner. In testmodus (preview) gaat de mail naar het
// testadres en vervalt de cc.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://esm.sh/zod@3.23.8";
import {
  buildReplyTo,
  getRecipientEmail,
  getSubjectPrefix,
  isTestMode,
  SENDER_EMAIL,
  SENDER_NAME,
  TemplateIds,
  wrapEmailHtml,
} from "../_shared/email-templates.ts";
import { logEmail, type EmailLogEntry } from "../_shared/email-logger.ts";
import { sendMailjet, type MailjetMessage, type SendMailjetResult } from "../_shared/mailjet-send.ts";

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
}

export type HandlerResult = { status: number; body: Record<string, unknown> };

export async function handleWeddingReferral(input: ReferralInput, ctx: HandlerContext): Promise<HandlerResult> {
  const { data: partner, error: partnerError } = await ctx.db
    .from("partners")
    .select("id, name, email, contact_email, wedding_referral_email, receives_wedding_referrals, is_active")
    .eq("id", input.partnerId)
    .maybeSingle();
  if (partnerError) return { status: 500, body: { error: `Partner ophalen mislukt: ${partnerError.message}` } };
  if (!partner) return { status: 404, body: { error: "Partner niet gevonden" } };
  const p = partner as ReferralPartner;
  if (!p.receives_wedding_referrals) {
    return { status: 400, body: { error: `${p.name} ontvangt geen bruiloftsdoorverwijzingen. Zet dat aan op de partnerpagina.` } };
  }

  let referenceNumber: string | null = null;
  if (input.requestId) {
    const { data: pr } = await ctx.db.from("program_requests").select("id, reference_number").eq("id", input.requestId).maybeSingle();
    if (!pr) return { status: 404, body: { error: "Project niet gevonden" } };
    referenceNumber = (pr as { reference_number: string | null }).reference_number ?? null;
  }

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

  const referredAt = toIsoDate(ctx.now);
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
      status: "referred",
      referral_email_log_id: emailLogId,
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

  return { status: 200, body: { referralId, emailLogId, cc, testMode, duplicate: result.skipped === "duplicate" } };
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
    });
    return json(result.status, result.body);
  } catch (error) {
    console.error("Error in send-wedding-referral:", error);
    return json(500, { error: error instanceof Error ? error.message : "Interne fout" });
  }
}

if (import.meta.main) Deno.serve(handler);
