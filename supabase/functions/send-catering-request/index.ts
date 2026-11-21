// Catering request notification — sends customer confirmation + internal notice
import { z } from "npm:zod@3.22.4";
import {
  isTestMode,
  getSubjectPrefix,
  getPortalBaseUrl,
  buildReplyTo,
  wrapEmailHtml,
  SENDER_EMAIL,
  SENDER_NAME,
  getBureauAdminEmail,
} from "../_shared/email-templates.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendMailjet } from "../_shared/mailjet-send.ts";
import { logEmail } from "../_shared/email-logger.ts";
import { buildBureauHtml, buildCustomerHtml, bureauSubject, customerSubject, type CateringMailInput } from "./mail.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Simple in-memory rate limit
const rl = new Map<string, number[]>();
const isRateLimited = (ip: string) => {
  const now = Date.now();
  const recent = (rl.get(ip) || []).filter((t) => now - t < 60_000);
  if (recent.length >= 10) return true;
  recent.push(now);
  rl.set(ip, recent);
  return false;
};

const ItemSchema = z.object({
  name: z.string(),
  role: z.string().nullable().optional(),
  provider: z.string().nullable().optional(),
  priceIndication: z.string().nullable().optional(),
});

const PayloadSchema = z.object({
  requestId: z.string().uuid(),
  referenceNumber: z.string().nullable().optional(),
  customerToken: z.string().min(8).max(64).optional(),
  cateringType: z.string().min(1).max(40),
  date: z.string().min(4).max(40),
  startTime: z.string().nullable().optional(),
  locationText: z.string().min(1).max(300),
  hasHorecaOnSite: z.boolean().nullable().optional(),
  guests: z.number().int().min(1).max(2000),
  contact: z.object({
    name: z.string().trim().min(2).max(100),
    company: z.string().max(150).optional().or(z.literal("")),
    email: z.string().trim().email().max(255),
    phone: z.string().trim().min(6).max(40),
    notes: z.string().max(2000).optional().or(z.literal("")),
    dietary: z.string().max(2000).optional().or(z.literal("")),
  }),
  items: z.array(ItemSchema).max(50),
  indicativeTotal: z.number().nullable().optional(),
  origin: z.string().optional(),
});

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    if (isRateLimited(ip)) {
      return new Response(JSON.stringify({ error: "Te veel verzoeken." }), {
        status: 429,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const raw = await req.json();
    const parsed = PayloadSchema.safeParse(raw);
    if (!parsed.success) {
      console.warn("Validation failed", parsed.error.errors);
      return new Response(JSON.stringify({ error: "Validatiefout", details: parsed.error.flatten() }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }
    const p = parsed.data;
    const testMode = isTestMode(p.origin);
    const prefix = getSubjectPrefix(p.origin);
    // Intern meldingsadres uit de instellingen ("Administratie email"); in testmodus gaat ook de klantmail daarheen.
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const bureauEmail = await getBureauAdminEmail(supabase);

    const mailInput: CateringMailInput = {
      requestId: p.requestId,
      referenceNumber: p.referenceNumber || "",
      contact: {
        name: p.contact.name,
        company: p.contact.company || "",
        email: p.contact.email,
        phone: p.contact.phone,
        notes: p.contact.notes || "",
        dietary: p.contact.dietary || "",
      },
      cateringType: p.cateringType,
      date: p.date,
      startTime: p.startTime || "",
      locationText: p.locationText,
      hasHorecaOnSite: p.hasHorecaOnSite,
      guests: p.guests,
      items: p.items,
      indicativeTotal: p.indicativeTotal ?? null,
      baseUrl: getPortalBaseUrl(p.origin),
    };

    // Beide mails in de huisstijlwrapper (logo, voettekst met KvK en IBAN).
    const customerHtml = await wrapEmailHtml(buildCustomerHtml(mailInput), supabase);
    const internalHtml = await wrapEmailHtml(buildBureauHtml(mailInput), supabase);

    const customerRecipient = testMode ? bureauEmail : p.contact.email;
    const customerSubjectText = `${prefix}${customerSubject(mailInput.referenceNumber)}`;
    const bureauSubjectText = `${prefix}${bureauSubject(mailInput)}`;
    // Antwoorden komen via reply+BV-… in het dossier terecht.
    const replyTo = buildReplyTo(p.referenceNumber);

    // Twee losse verzendingen via de gedeelde verzender (blokkadelijst,
    // exacte MessageID), elk gelogd volgens het e-mail-logging-contract.
    // Los van elkaar, zodat een geblokkeerd klantadres de interne melding
    // niet tegenhoudt. Zonder logregel kon de terugkoppeling van Mailjet op
    // deze mails nergens op matchen en stonden ze niet in het maillog.
    const customerResult = await sendMailjet({
      source: "send-catering-request:customer",
      messages: [{
        From: { Email: SENDER_EMAIL, Name: SENDER_NAME },
        To: [{ Email: customerRecipient, Name: p.contact.name }],
        ...(replyTo ? { ReplyTo: replyTo } : {}),
        Subject: customerSubjectText,
        HTMLPart: customerHtml,
      }],
    });
    const bureauResult = await sendMailjet({
      source: "send-catering-request:bureau",
      messages: [{
        From: { Email: SENDER_EMAIL, Name: "Bureau Vlieland Website" },
        To: [{ Email: bureauEmail, Name: "Bureau Vlieland" }],
        ...(replyTo ? { ReplyTo: replyTo } : {}),
        Subject: bureauSubjectText,
        HTMLPart: internalHtml,
      }],
    });

    await Promise.all([
      logEmail({
        email_type: "catering_request_customer",
        subject: customerSubjectText,
        recipient_email: customerRecipient,
        recipient_name: p.contact.name,
        related_request_id: p.requestId,
        status: customerResult.ok ? "sent" : "failed",
        error_message: customerResult.ok ? undefined : customerResult.error,
        mailjet_message_id: customerResult.ok ? (customerResult.messageId ?? undefined) : undefined,
        sent_by: "system",
        html_body: customerHtml,
        reply_to: replyTo?.Email,
        metadata: {
          template_name: "catering_request_customer",
          actor: "system → klant (bevestiging catering-aanvraag)",
          catering_type: p.cateringType,
          guests: p.guests,
          skipped: customerResult.ok ? (customerResult.skipped ?? null) : null,
        },
      }),
      logEmail({
        email_type: "catering_request_bureau",
        subject: bureauSubjectText,
        recipient_email: bureauEmail,
        recipient_name: "Bureau Vlieland",
        related_request_id: p.requestId,
        status: bureauResult.ok ? "sent" : "failed",
        error_message: bureauResult.ok ? undefined : bureauResult.error,
        mailjet_message_id: bureauResult.ok ? (bureauResult.messageId ?? undefined) : undefined,
        sent_by: "system",
        html_body: internalHtml,
        reply_to: replyTo?.Email,
        metadata: {
          template_name: "catering_request_bureau",
          actor: "klant → bureau (catering-aanvraag)",
          catering_type: p.cateringType,
          guests: p.guests,
          customer_email: p.contact.email,
          skipped: bureauResult.ok ? (bureauResult.skipped ?? null) : null,
        },
      }),
    ]);

    if (!customerResult.ok) console.error("send-catering-request: klantmail niet verstuurd:", customerResult.error);
    if (!bureauResult.ok) console.error("send-catering-request: interne melding niet verstuurd:", bureauResult.error);
    console.log(`Catering request emails handled for ${p.contact.email} (test=${testMode})`);

    return new Response(JSON.stringify({ success: customerResult.ok && bureauResult.ok }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (e: any) {
    console.error("send-catering-request error", e);
    return new Response(JSON.stringify({ error: e.message || "internal_error" }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});
