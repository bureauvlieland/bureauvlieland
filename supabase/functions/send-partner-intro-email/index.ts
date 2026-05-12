import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { logEmail } from "../_shared/email-logger.ts";
import { getRenderedTemplate, TemplateIds } from "../_shared/email-templates.ts";

const MAILJET_API_KEY = Deno.env.get("MAILJET_API_KEY");
const MAILJET_SECRET_KEY = Deno.env.get("MAILJET_SECRET_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const FALLBACK_SUBJECT = "De partnerportal van Bureau Vlieland — even voorstellen";

const FALLBACK_BODY = `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <div style="background-color: #1e3a5f; padding: 24px; text-align: center;">
    <h1 style="color: #ffffff; margin: 0; font-size: 22px;">Bureau Vlieland</h1>
  </div>
  <div style="padding: 24px; line-height: 1.8; color: #333;">
    <p>Beste partner,</p>
    <p>De afgelopen weken heb je van ons een uitnodiging ontvangen om in te loggen op onze nieuwe partnerportal.</p>
    <p>We willen de samenwerking tussen Bureau Vlieland en onze partners zo soepel mogelijk maken.</p>
    <ul style="padding-left: 20px;">
      <li><strong>Directe inzage</strong> in aanvragen</li>
      <li><strong>Eenvoudig reageren</strong> op aanvragen</li>
      <li><strong>Overzicht</strong> van je activiteiten, offertes en facturen</li>
      <li><strong>Minder heen-en-weer mailen</strong></li>
    </ul>
    <p>Je kunt reageren op deze mail of me bellen op <strong>0562 700 208</strong>.</p>
  </div>
  <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 0 24px;">
  <div style="padding: 24px; color: #666; font-size: 14px;">
    <p style="margin: 0;">Hartelijke groet,<br><strong>Erwin</strong><br>Bureau Vlieland</p>
  </div>
</div>
`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Niet geautoriseerd" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Niet geautoriseerd" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleData) {
      return new Response(JSON.stringify({ error: "Geen admin rechten" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { test } = await req.json();

    // Try DB template
    const template = await getRenderedTemplate(TemplateIds.PARTNER_INTRO_PORTAL, {});
    const emailSubject = template?.subject || FALLBACK_SUBJECT;
    const emailBody = template?.body || FALLBACK_BODY;

    // Build recipient list
    let recipients: { email: string; name: string }[] = [];

    if (test) {
      recipients = [{ email: "hallo@bureauvlieland.nl", name: "Bureau Vlieland (TEST)" }];
    } else {
      const { data: partners, error: pError } = await supabase
        .from("partners")
        .select("name, email, contact_email")
        .eq("is_active", true)
        .not("invited_at", "is", null);

      if (pError) throw pError;

      const seen = new Set<string>();
      for (const p of partners || []) {
        const targetEmail = (p.contact_email || p.email).toLowerCase().trim();
        if (!seen.has(targetEmail)) {
          seen.add(targetEmail);
          recipients.push({ email: targetEmail, name: p.name });
        }
      }
    }

    const auth = btoa(`${MAILJET_API_KEY}:${MAILJET_SECRET_KEY}`);
    let sentCount = 0;
    const errors: string[] = [];

    for (const recipient of recipients) {
      try {
        const response = await fetch("https://api.mailjet.com/v3.1/send", {
          method: "POST",
          headers: {
            Authorization: `Basic ${auth}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            Messages: [
              {
                From: { Email: "hallo@bureauvlieland.nl", Name: "Bureau Vlieland" },
                To: [{ Email: recipient.email, Name: recipient.name }],
                ReplyTo: { Email: "hallo@bureauvlieland.nl", Name: "Bureau Vlieland" },
                Subject: test ? `[TEST] ${emailSubject}` : emailSubject,
                HTMLPart: emailBody,
              },
            ],
          }),
        });

        if (!response.ok) {
          const errText = await response.text();
          console.error(`Failed to send to ${recipient.email}:`, errText);
          errors.push(recipient.email);

          await logEmail({
            email_type: "partner_intro_portal",
            subject: emailSubject,
            recipient_email: recipient.email,
            recipient_name: recipient.name,
            status: "failed",
            error_message: errText,
            sent_by: `admin:${user.id}`,
            metadata: {
              template_name: "partner_intro_portal",
              actor: "admin → partner (intro portal)",
              test: !!test,
              failure: true,
            },
          });
        } else {
          sentCount++;
          await logEmail({
            email_type: "partner_intro_portal",
            subject: emailSubject,
            recipient_email: recipient.email,
            recipient_name: recipient.name,
            status: "sent",
            sent_by: `admin:${user.id}`,
            metadata: {
              template_name: "partner_intro_portal",
              actor: "admin → partner (intro portal)",
              test: !!test,
            },
          });
        }
      } catch (err) {
        console.error(`Error sending to ${recipient.email}:`, err);
        errors.push(recipient.email);
      }
    }

    console.log(`Partner intro email: ${sentCount}/${recipients.length} sent${test ? " (TEST)" : ""}`);

    return new Response(
      JSON.stringify({ success: true, sent: sentCount, total: recipients.length, errors }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in send-partner-intro-email:", error);
    return new Response(
      JSON.stringify({ error: "Er ging iets mis bij het versturen" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
