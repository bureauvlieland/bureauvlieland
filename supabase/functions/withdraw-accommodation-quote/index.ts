import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { logEmail } from "../_shared/email-logger.ts";
import {
  getRecipientEmail,
  getSubjectPrefix,
  buildReplyTo,
  formatDateNL,
  sanitizeHtml,
  wrapEmailHtml,
  SENDER_EMAIL,
  SENDER_NAME,
} from "../_shared/email-templates.ts";

import { extractMessageIds } from "../_shared/mailjet-send.ts";
const MAILJET_API_KEY = Deno.env.get("MAILJET_API_KEY");
const MAILJET_SECRET_KEY = Deno.env.get("MAILJET_SECRET_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  let mailjetMessageId: string | null = null;
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Not authenticated");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify admin
    const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!);
    const { data: { user }, error: authError } = await anonClient.auth.getUser(authHeader.replace("Bearer ", ""));
    if (authError || !user) throw new Error("Not authenticated");

    const { data: roleCheck } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();
    if (!roleCheck) throw new Error("Not authorized");

    const body = await req.json();
    const { quoteId, notifyPartner } = body;
    const origin = body.origin || req.headers.get("origin") || "";
    if (!quoteId) throw new Error("quoteId is required");

    // Fetch quote with partner info
    const { data: quote, error: quoteError } = await supabase
      .from("accommodation_quotes")
      .select("*, partner:partners(id, name, email, contact_email)")
      .eq("id", quoteId)
      .single();

    if (quoteError || !quote) throw new Error("Quote not found");
    if (quote.status !== "pending") throw new Error("Only pending quotes can be withdrawn");

    // Fetch accommodation request for context
    const { data: accRequest } = await supabase
      .from("accommodation_requests")
      .select("*, linked_program_id")
      .eq("id", quote.request_id)
      .single();

    if (!accRequest) throw new Error("Request not found");

    // Update quote status
    const { error: updateError } = await supabase
      .from("accommodation_quotes")
      .update({ status: "withdrawn", updated_at: new Date().toISOString() })
      .eq("id", quoteId);

    if (updateError) throw updateError;

    // Decrement quotes_requested_count
    const newCount = Math.max(0, (accRequest.quotes_requested_count || 1) - 1);
    await supabase
      .from("accommodation_requests")
      .update({ quotes_requested_count: newCount, updated_at: new Date().toISOString() })
      .eq("id", accRequest.id);

    const partner = quote.partner as { id: string; name: string; email: string; contact_email?: string };
    const partnerEmail = partner.contact_email || partner.email;

    // Optionally notify partner
    if (notifyPartner && partnerEmail && MAILJET_API_KEY && MAILJET_SECRET_KEY) {
      const arrivalDate = formatDateNL(accRequest.arrival_date);
      const departureDate = formatDateNL(accRequest.departure_date);
      const ref = accRequest.reference_number || "";
      const customerLabel = accRequest.customer_company || accRequest.customer_name || "de klant";

      const inner = `
        <h2 style="color:#0F4C5C;margin:0 0 16px;">Offerteaanvraag ingetrokken</h2>
        <p>Hoi ${sanitizeHtml(partner.name)},</p>
        <p>De offerteaanvraag${ref ? ` <strong>${sanitizeHtml(ref)}</strong>` : ""} voor het verblijf van ${sanitizeHtml(customerLabel)} van <strong>${arrivalDate}</strong> tot <strong>${departureDate}</strong> (${accRequest.number_of_guests} personen) is ingetrokken. Je hoeft hier niets meer mee te doen.</p>
        <p>Heb je vragen, reageer dan gerust op deze mail.</p>
        <p style="margin-top:24px;">Met vriendelijke groet,<br><strong>Bureau Vlieland</strong></p>
      `;
      const emailBody = await wrapEmailHtml(inner, supabase);

      const subject = `${getSubjectPrefix(origin)}Offerteaanvraag ingetrokken: ${customerLabel}${ref ? ` (${ref})` : ""}`;

      try {
        const auth = btoa(`${MAILJET_API_KEY}:${MAILJET_SECRET_KEY}`);
        const mjRes = await fetch("https://api.mailjet.com/v3.1/send", {
          method: "POST",
          headers: {
            Authorization: `Basic ${auth}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            Messages: [{ TrackClicks: "disabled", TrackOpens: "enabled",
              From: { Email: SENDER_EMAIL, Name: SENDER_NAME },
              To: [{ Email: getRecipientEmail(partnerEmail, origin), Name: partner.name }],
              ...(buildReplyTo(ref) ? { ReplyTo: buildReplyTo(ref) } : {}),
              Subject: subject,
              HTMLPart: emailBody,
            }],
          }),
        });
        const mjText = await mjRes.text();
        try { mailjetMessageId = extractMessageIds(mjText)[0] ?? null; } catch { /* geen JSON */ }

        await logEmail({
          mailjet_message_id: mailjetMessageId ?? undefined,
          email_type: "accommodation_quote_withdrawn",
          subject,
          recipient_email: partnerEmail,
          recipient_name: partner.name,
          related_accommodation_id: accRequest.id,
          related_request_id: accRequest.linked_program_id,
          related_partner_id: partner.id,
          status: mjRes.ok ? "sent" : "failed",
          error_message: mjRes.ok ? undefined : mjText.slice(0, 1000),
          sent_by: "system",
          metadata: {
            template_name: "accommodation_quote_withdrawn",
            actor: "admin → partner (offerte ingetrokken)",
          },
        });
      } catch (emailErr) {
        console.error("Failed to send withdrawal email:", emailErr);
      }
    }

    // Resolve related auto-todos for this quote
    await supabase
      .from("admin_todos")
      .update({ status: "done", completed_at: new Date().toISOString() })
      .eq("auto_entity_id", quoteId)
      .neq("status", "done");

    // Also resolve partner-level todos linked to this accommodation request
    await supabase
      .from("admin_todos")
      .update({ status: "done", completed_at: new Date().toISOString() })
      .eq("auto_entity_id", accRequest.id)
      .in("auto_type", ["quote_pending_partner", "quote_review", "forward_accommodation_quote"])
      .eq("related_partner_id", partner.id)
      .neq("status", "done");

    // Log in project_communications
    await supabase.from("project_communications").insert({
      accommodation_id: accRequest.id,
      request_id: accRequest.linked_program_id,
      communication_type: notifyPartner ? "email" : "note",
      direction: notifyPartner ? "outbound" : "internal",
      subject: `Offerteaanvraag ingetrokken: ${partner.name}`,
      content: notifyPartner
        ? `Offerteaanvraag bij ${partner.name} is ingetrokken. Partner is per e-mail geïnformeerd.`
        : `Offerteaanvraag bij ${partner.name} is ingetrokken (zonder notificatie).`,
      contact_name: partner.name,
      contact_email: partnerEmail,
    });

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in withdraw-accommodation-quote:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
