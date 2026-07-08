import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://esm.sh/zod@3.23.8";
import {
  sanitizeHtml,
  getPortalBaseUrl,
  getSubjectPrefix,
  getRecipientEmail,
  buildReplyTo,
  SENDER_EMAIL,
  SENDER_NAME,
} from "../_shared/email-templates.ts";
import { logEmail } from "../_shared/email-logger.ts";

import { extractMessageIds } from "../_shared/mailjet-send.ts";
const MAILJET_API_KEY = Deno.env.get("MAILJET_API_KEY");
const MAILJET_SECRET_KEY = Deno.env.get("MAILJET_SECRET_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const BodySchema = z.object({
  request_id: z.string().uuid(),
  origin: z.string().optional(),
});

const sendEmailViaMailjet = async (messages: any[]) => {
  const auth = btoa(`${MAILJET_API_KEY}:${MAILJET_SECRET_KEY}`);
  const response = await fetch("https://api.mailjet.com/v3.1/send", {
    method: "POST",
    headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/json" },
    body: JSON.stringify({ Messages: messages }),
  });
  try { mailjetMessageId = extractMessageIds(await response.clone().json())[0] ?? null; } catch { /* body already consumed or non-JSON */ }
  if (!response.ok) {
    const errorText = await response.text();
    console.error("Mailjet API error:", errorText);
    throw new Error("EMAIL_SERVICE_ERROR");
  }
  return await response.json();
};

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    const parsed = BodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return new Response(
        JSON.stringify({ error: "Ongeldige invoer", details: parsed.error.flatten().fieldErrors }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    const { request_id, origin } = parsed.data;

    // Fetch the request
    const { data: request, error: reqErr } = await supabase
      .from("program_requests")
      .select("id, reference_number, customer_name, customer_email, customer_token, status")
      .eq("id", request_id)
      .maybeSingle();

    if (reqErr || !request) {
      return new Response(JSON.stringify({ error: "Aanvraag niet gevonden" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (request.status === "cancelled") {
      return new Response(JSON.stringify({ error: "Deze aanvraag is geannuleerd." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!request.customer_email || !request.customer_token) {
      return new Response(JSON.stringify({ error: "Aanvraag mist e-mailadres of token" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Rate-limit: max once per 5 minutes per request
    const fiveMinAgo = new Date(Date.now() - 5 * 60_000).toISOString();
    const { data: recentLog } = await supabase
      .from("email_log")
      .select("id, sent_at")
      .eq("related_request_id", request.id)
      .eq("email_type", "customer_link_resend")
      .gte("created_at", fiveMinAgo)
      .limit(1);

    if (recentLog && recentLog.length > 0) {
      return new Response(
        JSON.stringify({
          error: "Wij hebben u zojuist al een link gestuurd. Controleer uw inbox en spam-folder, of bel ons op 0562 700 208.",
        }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const baseUrl = getPortalBaseUrl(origin);
    const subjectPrefix = getSubjectPrefix(origin);
    const recipient = getRecipientEmail(request.customer_email, origin);
    const portalUrl = `${baseUrl}/mijn-programma/${request.customer_token}`;
    const reference = request.reference_number ?? "uw aanvraag";

    const subject = `${subjectPrefix}De link naar uw aanvraag bij Bureau Vlieland (${reference})`;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
        <h2 style="color: #1a365d; border-bottom: 2px solid #1a365d; padding-bottom: 10px;">
          Uw aanvraag staat klaar
        </h2>
        <p>Beste ${sanitizeHtml(request.customer_name || "")},</p>
        <p>
          U vroeg om de link naar uw lopende aanvraag bij Bureau Vlieland.
          Via onderstaande knop opent u uw persoonlijke programmapagina &mdash; daar kunt u
          uw wensen bekijken, aanvullen of aanpassen.
        </p>
        <p style="margin: 24px 0;">
          <a href="${portalUrl}" style="display: inline-block; background: #1a365d; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: 600;">
            Open mijn programma &rarr;
          </a>
        </p>
        <p style="color: #666; font-size: 13px;">
          Werkt de knop niet? Kopieer dan deze link in uw browser:<br>
          <a href="${portalUrl}" style="color: #1a365d; word-break: break-all;">${portalUrl}</a>
        </p>
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;">
        <p style="color: #666; font-size: 13px;">
          Referentie: ${sanitizeHtml(reference)}<br>
          Vragen? Bel ons op <strong>0562 700 208</strong> of antwoord op deze mail.
        </p>
      </div>
    `;

    try {
      await sendEmailViaMailjet([
        {
          From: { Email: SENDER_EMAIL, Name: SENDER_NAME },
          To: [{ Email: recipient, Name: request.customer_name || recipient }],
          ...(buildReplyTo(request.reference_number) ? { ReplyTo: buildReplyTo(request.reference_number) } : {}),
          Subject: subject,
          HTMLPart: html,
        },
      ]);

      await logEmail({
      mailjet_message_id: mailjetMessageId ?? undefined,
        email_type: "customer_link_resend",
        subject,
        recipient_email: recipient,
        recipient_name: request.customer_name || undefined,
        related_request_id: request.id,
        status: "sent",
        sent_by: "customer_self_service",
        metadata: {
          template_name: "customer_link_resend",
          actor: "klant → bureau (self-service link request)",
        },
      });

      await supabase.from("program_request_history").insert({
        request_id: request.id,
        action: "link_resent",
        actor: "customer",
        actor_name: request.customer_name,
        new_value: { recipient_email: recipient },
      });

      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } catch (sendErr: any) {
      await logEmail({
      mailjet_message_id: mailjetMessageId ?? undefined,
        email_type: "customer_link_resend",
        subject,
        recipient_email: recipient,
        recipient_name: request.customer_name || undefined,
        related_request_id: request.id,
        status: "failed",
        error_message: sendErr?.message || "unknown",
        sent_by: "customer_self_service",
        metadata: {
          template_name: "customer_link_resend",
          actor: "klant → bureau (self-service link request)",
        },
      });
      throw sendErr;
    }
  } catch (error: any) {
    console.error("resend-customer-link error:", error);
    return new Response(
      JSON.stringify({ error: "We konden de link niet versturen. Bel ons gerust op 0562 700 208." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
