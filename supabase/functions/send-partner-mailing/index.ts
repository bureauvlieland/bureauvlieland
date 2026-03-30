import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { logEmail, EmailTypes } from "../_shared/email-logger.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MAILJET_API_KEY = Deno.env.get("MAILJET_API_KEY");
const MAILJET_SECRET_KEY = Deno.env.get("MAILJET_SECRET_KEY");
const DELAY_BETWEEN_EMAILS_MS = 200;

interface MailingRequest {
  subject: string;
  htmlBody: string;
  partnerIds?: string[];
}

interface MailingResult {
  partnerId: string;
  partnerName: string;
  success: boolean;
  error?: string;
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Verify admin
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const adminClient = createClient(supabaseUrl, supabaseServiceKey);
    const { data: roleData } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleData) {
      return new Response(
        JSON.stringify({ error: "Admin access required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse request
    const { subject, htmlBody, partnerIds }: MailingRequest = await req.json();

    if (!subject || !htmlBody) {
      return new Response(
        JSON.stringify({ error: "Subject and htmlBody are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch partners
    let query = adminClient
      .from("partners")
      .select("id, name, email, auth_user_id")
      .eq("is_active", true)
      .not("auth_user_id", "is", null);

    if (partnerIds && partnerIds.length > 0) {
      query = query.in("id", partnerIds);
    }

    const { data: partners, error: partnersError } = await query;

    if (partnersError) {
      return new Response(
        JSON.stringify({ error: "Failed to fetch partners" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!partners || partners.length === 0) {
      return new Response(
        JSON.stringify({ error: "No eligible partners found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!MAILJET_API_KEY || !MAILJET_SECRET_KEY) {
      return new Response(
        JSON.stringify({ error: "Mailjet credentials not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const origin = req.headers.get("origin") || "https://bureauvlieland.nl";
    const isPreview = origin.includes("lovable.app") || origin.includes("localhost");
    const results: MailingResult[] = [];

    for (let i = 0; i < partners.length; i++) {
      const partner = partners[i];
      const recipientEmail = isPreview ? "erwin@bureauvlieland.nl" : partner.email;
      const subjectLine = isPreview ? `[TEST] ${subject}` : subject;

      // Replace variables in body
      const personalizedBody = htmlBody.replace(/\{\{partner_name\}\}/g, partner.name);

      try {
        const emailResponse = await fetch("https://api.mailjet.com/v3.1/send", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Basic ${btoa(`${MAILJET_API_KEY}:${MAILJET_SECRET_KEY}`)}`,
          },
          body: JSON.stringify({
            Messages: [
              {
                From: {
                  Email: "hallo@bureauvlieland.nl",
                  Name: "Bureau Vlieland",
                },
                To: [{ Email: recipientEmail, Name: partner.name }],
                Subject: subjectLine,
                HTMLPart: personalizedBody,
              },
            ],
          }),
        });

        if (!emailResponse.ok) {
          const errorText = await emailResponse.text();
          console.error(`Mailjet error for ${partner.name}:`, errorText);
          results.push({ partnerId: partner.id, partnerName: partner.name, success: false, error: "Mail verzenden mislukt" });
        } else {
          await emailResponse.json(); // consume body
          console.log(`Mailing sent to ${recipientEmail} for ${partner.name}`);
          results.push({ partnerId: partner.id, partnerName: partner.name, success: true });
        }

        // Log email
        await logEmail({
          email_type: "partner_mailing",
          subject: subjectLine,
          recipient_email: recipientEmail,
          recipient_name: partner.name,
          related_partner_id: partner.id,
          status: results[results.length - 1].success ? "sent" : "failed",
          sent_by: "admin",
          metadata: { original_recipient: partner.email },
        });
      } catch (err) {
        console.error(`Error sending to ${partner.name}:`, err);
        results.push({
          partnerId: partner.id,
          partnerName: partner.name,
          success: false,
          error: err instanceof Error ? err.message : "Unknown error",
        });
      }

      if (i < partners.length - 1) {
        await delay(DELAY_BETWEEN_EMAILS_MS);
      }
    }

    // Log admin activity
    await adminClient.from("admin_activity_log").insert({
      user_id: user.id,
      action: "send_partner_mailing",
      entity_type: "partner",
      details: {
        subject,
        total: partners.length,
        successful: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length,
      },
    });

    return new Response(
      JSON.stringify({ results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Error in send-partner-mailing:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
