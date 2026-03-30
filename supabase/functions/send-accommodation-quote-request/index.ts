// Using Deno.serve() instead of deprecated import
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { logEmail } from "../_shared/email-logger.ts";
import { getPortalBaseUrl, getRecipientEmail, getSubjectPrefix } from "../_shared/email-templates.ts";

const MAILJET_API_KEY = Deno.env.get("MAILJET_API_KEY");
const MAILJET_SECRET_KEY = Deno.env.get("MAILJET_SECRET_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface QuoteRequestPayload {
  request_id: string;
  partner_ids: string[];
  email_subject: string;
  email_body: string;
}

const sendEmailViaMailjet = async (messages: any[]) => {
  const auth = btoa(`${MAILJET_API_KEY}:${MAILJET_SECRET_KEY}`);
  
  const response = await fetch("https://api.mailjet.com/v3.1/send", {
    method: "POST",
    headers: {
      "Authorization": `Basic ${auth}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ Messages: messages }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Mailjet API error:", errorText);
    throw new Error("EMAIL_SERVICE_ERROR");
  }

  return await response.json();
};

// Convert markdown-style formatting to HTML
function markdownToHtml(text: string): string {
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\n/g, '<br>');
}

// Wrap plain text in a styled HTML email template
function wrapInEmailTemplate(body: string, partnerName: string, portalBaseUrl: string): string {
  const htmlBody = markdownToHtml(body);
  
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #0f766e 0%, #134e4a 100%); padding: 24px; border-radius: 12px 12px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 24px;">Bureau Vlieland</h1>
    <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0;">Offerteaanvraag Logies</p>
  </div>
  
  <div style="background: #fff; padding: 24px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 12px 12px;">
    ${htmlBody}
    
    <div style="margin-top: 24px; padding: 16px; background: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0;">
      <p style="margin: 0 0 12px; font-weight: 600; color: #334155;">Offerte indienen?</p>
      <p style="margin: 0; font-size: 14px; color: #64748b;">
        Log in op het partnerportaal om je offerte in te dienen. Je vindt de aanvraag onder "Logies aanvragen".
      </p>
      <a href="${portalBaseUrl}/partner" 
         style="display: inline-block; margin-top: 12px; background-color: #0f766e; color: white; 
                padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 500;">
        Ga naar partnerportaal →
      </a>
    </div>
  </div>
  
  <div style="text-align: center; padding: 20px; color: #64748b; font-size: 12px;">
    <p style="margin: 0;">Bureau Vlieland - Je partner voor Vlieland evenementen</p>
    <p style="margin: 4px 0 0;">
      <a href="mailto:hallo@bureauvlieland.nl" style="color: #0f766e;">hallo@bureauvlieland.nl</a> | 
      0562 700 208
    </p>
  </div>
</body>
</html>`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify admin auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if user is admin
    const { data: isAdmin } = await supabase.rpc("is_admin", { _user_id: user.id });
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { request_id, partner_ids, email_subject, email_body } = body as QuoteRequestPayload;
    const origin = body.origin || req.headers.get("origin") || "";
    const portalBaseUrl = getPortalBaseUrl(origin);

    if (!request_id || !partner_ids?.length || !email_subject || !email_body) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch the accommodation request
    const { data: request, error: requestError } = await supabase
      .from("accommodation_requests")
      .select("*")
      .eq("id", request_id)
      .single();

    if (requestError || !request) {
      return new Response(
        JSON.stringify({ error: "Aanvraag niet gevonden" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch selected partners
    const { data: partners, error: partnersError } = await supabase
      .from("partners")
      .select("*, contact_email")
      .in("id", partner_ids);

    if (partnersError || !partners?.length) {
      return new Response(
        JSON.stringify({ error: "Partners niet gevonden" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check existing quotes for each partner
    const { data: existingQuotes } = await supabase
      .from("accommodation_quotes")
      .select("id, partner_id, status")
      .eq("request_id", request_id)
      .in("partner_id", partner_ids);

    const existingQuoteMap: Record<string, { id: string; status: string }> = {};
    (existingQuotes || []).forEach((q) => {
      existingQuoteMap[q.partner_id] = { id: q.id, status: q.status };
    });

    // Process each partner: insert, update, or skip (reminder only)
    for (const partnerId of partner_ids) {
      const existing = existingQuoteMap[partnerId];
      const partner = partners.find(p => p.id === partnerId);

      if (!existing) {
        // No existing quote → INSERT new record
        const { error: insertError } = await supabase
          .from("accommodation_quotes")
          .insert({
            request_id,
            partner_id: partnerId,
            accommodation_name: "",
            price_total: 0,
            valid_until: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
            status: "pending",
            commission_percentage: partner?.accommodation_commission_percentage ?? 10,
          });

        if (insertError) {
          console.error("Insert error for partner", partnerId, insertError);
        }
      } else if (["declined", "rejected", "expired"].includes(existing.status)) {
        // Re-request: UPDATE status back to pending, reset fields
        const { error: updateError } = await supabase
          .from("accommodation_quotes")
          .update({
            status: "pending",
            submitted_at: null,
            selected_at: null,
            forwarded_at: null,
            partner_notes: null,
            accommodation_name: "",
            price_total: 0,
            price_per_person_per_night: null,
            room_configuration: [],
            includes: [],
            conditions: null,
            description: null,
            quote_attachment_path: null,
            quote_attachment_filename: null,
            quote_external_url: null,
            valid_until: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
          })
          .eq("id", existing.id);

        if (updateError) {
          console.error("Update error for partner", partnerId, updateError);
        }
      }
      // For status "pending": do nothing to the record, just send the email (reminder)
    }

    // Send emails to each partner (prefer contact_email for notifications)
    const emailMessages = partners.map((partner: any) => ({
      From: { Email: "hallo@bureauvlieland.nl", Name: "Bureau Vlieland" },
      To: [{ Email: partner.contact_email || partner.email, Name: partner.name }],
      Subject: email_subject,
      HTMLPart: wrapInEmailTemplate(email_body, partner.name, portalBaseUrl),
    }));

    const mailjetResult = await sendEmailViaMailjet(emailMessages);
    console.log("Mailjet result:", mailjetResult);

    // Log emails
    for (const partner of partners as any[]) {
      await logEmail({
        email_type: "accommodation_quote_request_partner",
        subject: email_subject,
        recipient_email: partner.contact_email || partner.email,
        recipient_name: partner.name,
        related_accommodation_id: request_id,
        related_partner_id: partner.id,
        status: "sent",
        sent_by: "send-accommodation-quote-request",
        metadata: {
          customer_name: request.customer_name,
          arrival_date: request.arrival_date,
          departure_date: request.departure_date,
          number_of_guests: request.number_of_guests,
        },
      });
    }

    // Count total quotes for this request and update status + count
    const { count: totalQuotes } = await supabase
      .from("accommodation_quotes")
      .select("id", { count: "exact", head: true })
      .eq("request_id", request_id);

    await supabase
      .from("accommodation_requests")
      .update({ 
        status: "processing",
        quotes_requested_count: totalQuotes ?? partner_ids.length,
      })
      .eq("id", request_id);

    console.log(`Accommodation quote requests sent to ${partners.length} partners`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        sent_count: partners.length,
        partners: partners.map(p => p.name),
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in send-accommodation-quote-request:", error);
    return new Response(
      JSON.stringify({ error: "Er kon geen email worden verstuurd" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
