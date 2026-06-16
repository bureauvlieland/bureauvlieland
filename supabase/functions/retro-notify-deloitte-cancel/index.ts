// One-off: stuur annuleringsmail naar logies-partners van BV-2605-0004 (Deloitte)
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  sanitizeHtml,
  getRecipientEmail,
  buildReplyTo,
  SENDER_EMAIL,
  SENDER_NAME,
} from "../_shared/email-templates.ts";
import { logEmail } from "../_shared/email-logger.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MAILJET_API_KEY = Deno.env.get("MAILJET_API_KEY");
const MAILJET_SECRET_KEY = Deno.env.get("MAILJET_SECRET_KEY");

const REQUEST_ID = "dec4c24c-d716-437e-9661-927cfc5c1f60";
const ACC_REQUEST_ID = "83c78780-c3f6-4ed0-ad9b-7a57cbd65505";
const REF = "BV-2605-0004";

const TARGETS = [
  { quote_id: "26d2ec21-ab2c-4c07-85e1-7c81b2aadf01", partner_id: "badhotel-bruin", partner_name: "Badhotel Bruin", email: "receptie@badhotelbruin.com" },
  { quote_id: "87a99bd3-68be-40c6-af69-33914bc8c3d3", partner_id: "zeezicht-vlieland", partner_name: "Hotel Zeezicht Vlieland", email: "manager@zeezichtvlieland.nl" },
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const results: any[] = [];

  for (const t of TARGETS) {
    const subject = `Logies-aanvraag ${REF} is geannuleerd`;
    const body = `
      <p>Beste ${sanitizeHtml(t.partner_name)},</p>
      <p>Hierbij laten we je weten dat de logies-aanvraag met referentie <strong>${sanitizeHtml(REF)}</strong> is geannuleerd.</p>
      <p>Uw offerte was nog in behandeling bij de klant. Met deze annulering komt de offerteaanvraag te vervallen — een reactie is niet meer nodig.</p>
      <p>Excuses dat je hier nu pas bericht over krijgt. Heb je vragen, neem dan gerust contact met ons op.</p>
      <p>Met vriendelijke groet,<br>Bureau Vlieland</p>
    `;

    const recipientEmail = getRecipientEmail(t.email);

    const mjRes = await fetch("https://api.mailjet.com/v3.1/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Basic " + btoa(`${MAILJET_API_KEY}:${MAILJET_SECRET_KEY}`),
      },
      body: JSON.stringify({
        Messages: [{
          TrackClicks: "disabled", TrackOpens: "disabled",
          From: { Email: SENDER_EMAIL, Name: SENDER_NAME },
          To: [{ Email: recipientEmail, Name: t.partner_name }],
          Subject: subject,
          HTMLPart: body,
          ...(buildReplyTo(REF) ? { ReplyTo: buildReplyTo(REF) } : {}),
        }],
      }),
    });

    const mjData = await mjRes.json().catch(() => ({}));
    const messageId = mjData?.Messages?.[0]?.To?.[0]?.MessageID?.toString() || null;
    const status: "sent" | "failed" = mjRes.ok ? "sent" : "failed";

    await logEmail({
      email_type: "cancellation_accommodation_partner",
      subject,
      recipient_email: recipientEmail,
      recipient_name: t.partner_name,
      related_request_id: REQUEST_ID,
      related_partner_id: t.partner_id,
      status,
      error_message: mjRes.ok ? undefined : JSON.stringify(mjData).slice(0, 1000),
      mailjet_message_id: messageId || undefined,
      sent_by: "admin",
      metadata: {
        template_name: "cancellation_accommodation_partner",
        actor: "admin → logies-partner (project geannuleerd, retro)",
        accommodation_request_id: ACC_REQUEST_ID,
        quote_id: t.quote_id,
        retro: true,
      },
    });

    await supabase.from("project_communications").insert({
      request_id: REQUEST_ID,
      communication_type: "email_out",
      direction: "outbound",
      subject,
      content: `Annuleringsmelding logies (retro) verstuurd naar ${t.partner_name}`,
      contact_name: t.partner_name,
      contact_email: recipientEmail,
      metadata: { source: "email_log", email_type: "cancellation_accommodation_partner", quote_id: t.quote_id, retro: true },
    }).then(() => {}, () => {});

    results.push({ partner: t.partner_name, email: recipientEmail, status, messageId });
  }

  return new Response(JSON.stringify({ ok: true, results }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
