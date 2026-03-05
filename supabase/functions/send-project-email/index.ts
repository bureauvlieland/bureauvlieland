import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { logEmail } from "../_shared/email-logger.ts";
import { buildReplyTo } from "../_shared/email-templates.ts";

const MAILJET_API_KEY = Deno.env.get("MAILJET_API_KEY");
const MAILJET_SECRET_KEY = Deno.env.get("MAILJET_SECRET_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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

    // Check admin role
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

    const {
      recipientEmail,
      recipientName,
      subject,
      body,
      requestId,
      accommodationId,
      partnerId,
    } = await req.json();

    // Lookup reference number for Reply-To
    let referenceNumber: string | null = null;
    if (requestId) {
      const { data: pr } = await supabase
        .from("program_requests")
        .select("reference_number")
        .eq("id", requestId)
        .maybeSingle();
      referenceNumber = pr?.reference_number || null;
    }
    if (!referenceNumber && accommodationId) {
      const { data: ar } = await supabase
        .from("accommodation_requests")
        .select("reference_number")
        .eq("id", accommodationId)
        .maybeSingle();
      referenceNumber = ar?.reference_number || null;
    }
    const replyTo = buildReplyTo(referenceNumber);

    if (!recipientEmail || !subject || !body) {
      return new Response(
        JSON.stringify({ error: "recipientEmail, subject en body zijn verplicht" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Wrap body in a simple styled email layout
    const htmlBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #1e3a5f; padding: 24px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 22px;">Bureau Vlieland</h1>
        </div>
        <div style="padding: 24px; line-height: 1.6; color: #333;">
          ${body.replace(/\n/g, "<br>")}
        </div>
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;">
        <div style="padding: 0 24px 24px; color: #666; font-size: 14px;">
          <p>Met vriendelijke groet,<br><strong>Bureau Vlieland</strong></p>
          <p style="font-size: 12px;">
            📧 <a href="mailto:hallo@bureauvlieland.nl" style="color: #0066cc;">hallo@bureauvlieland.nl</a> &nbsp;|&nbsp; 📞 0562 700 208
          </p>
        </div>
      </div>
    `;

    // Send via Mailjet
    const auth = btoa(`${MAILJET_API_KEY}:${MAILJET_SECRET_KEY}`);
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
            To: [{ Email: recipientEmail, Name: recipientName || recipientEmail }],
            ...(replyTo ? { ReplyTo: replyTo } : {}),
            Subject: subject,
            HTMLPart: htmlBody,
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Mailjet error:", errorText);
      throw new Error("EMAIL_SERVICE_ERROR");
    }

    // Log email
    await logEmail({
      email_type: "admin_project_email",
      subject,
      recipient_email: recipientEmail,
      recipient_name: recipientName || undefined,
      related_request_id: requestId || undefined,
      related_accommodation_id: accommodationId || undefined,
      related_partner_id: partnerId || undefined,
      status: "sent",
      sent_by: `admin:${user.id}`,
      metadata: { body_preview: body.substring(0, 200) },
    });

    // Log as project communication
    if (requestId || accommodationId) {
      await supabase.from("project_communications").insert({
        request_id: requestId || null,
        accommodation_id: accommodationId || null,
        communication_type: "email_out",
        direction: "outbound",
        subject,
        content: body,
        contact_name: recipientName || null,
        contact_email: recipientEmail,
        logged_by: user.id,
        communication_date: new Date().toISOString(),
      });
    }

    console.log("Project email sent to", recipientEmail);

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in send-project-email:", error);
    return new Response(
      JSON.stringify({ error: "Er kon geen email worden verstuurd" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
