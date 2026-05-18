// Bulk invite partners: create auth users without passwords and send one-time set-password links.
// Uses the DB-managed `partner_invitation` template (single source of truth).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  getRenderedTemplate,
  getSubjectPrefix,
  getRecipientEmail,
  SENDER_EMAIL,
  SENDER_NAME,
  TemplateIds,
} from "../_shared/email-templates.ts";
import { logEmail, EmailTypes } from "../_shared/email-logger.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MAILJET_API_KEY = Deno.env.get("MAILJET_API_KEY");
const MAILJET_SECRET_KEY = Deno.env.get("MAILJET_SECRET_KEY");

// Rate limiting: max 5 emails per second for Mailjet
const DELAY_BETWEEN_EMAILS_MS = 200;

interface BulkInviteRequest {
  partnerIds: string[];
}

interface InviteResult {
  partnerId: string;
  partnerName: string;
  success: boolean;
  error?: string;
}

async function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function invitePartner(
  adminClient: any,
  partner: { id: string; name: string; email: string; auth_user_id: string | null; commission_percentage?: number; accommodation_commission_percentage?: number },
  origin: string
): Promise<InviteResult> {
  try {
    if (partner.auth_user_id) {
      return { partnerId: partner.id, partnerName: partner.name, success: false, error: "Partner already has an account" };
    }

    const { data: authUser, error: createError } = await adminClient.auth.admin.createUser({
      email: partner.email,
      email_confirm: true,
      user_metadata: { partner_id: partner.id, partner_name: partner.name },
    });

    if (createError) {
      console.error(`Error creating auth user for ${partner.name}:`, createError);
      return { partnerId: partner.id, partnerName: partner.name, success: false, error: createError.message };
    }

    const { error: updateError } = await adminClient
      .from("partners")
      .update({ auth_user_id: authUser.user.id, invited_at: new Date().toISOString() })
      .eq("id", partner.id);
    if (updateError) console.error(`Error linking partner ${partner.name}:`, updateError);

    const { error: roleError } = await adminClient
      .from("user_roles")
      .insert({ user_id: authUser.user.id, role: "partner" });
    if (roleError) console.error(`Error adding partner role for ${partner.name}:`, roleError);

    const portalLink = `${origin}/partner`;
    const redirectTo = "https://bureauvlieland.nl/partner/reset-password";

    const { data: linkData, error: linkError } = await adminClient.auth.admin.generateLink({
      type: "recovery",
      email: partner.email,
      options: { redirectTo },
    });
    if (linkError || !linkData?.properties?.action_link) {
      console.error(`Failed to generate set-password link for ${partner.name}:`, linkError);
      return { partnerId: partner.id, partnerName: partner.name, success: false, error: "Failed to generate set-password link" };
    }
    const setPasswordLink = linkData.properties.action_link;

    const rendered = await getRenderedTemplate(TemplateIds.PARTNER_INVITATION, {
      partner_name: partner.name,
      partner_email: partner.email,
      set_password_link: setPasswordLink,
      partner_portal_link: portalLink,
      commission_activity: partner.commission_percentage ?? 10,
      commission_accommodation: partner.accommodation_commission_percentage ?? 10,
    });

    if (!rendered) {
      return { partnerId: partner.id, partnerName: partner.name, success: false, error: "Failed to render invitation template" };
    }

    let emailSent = false;
    let emailError: string | null = null;
    let mailjetMessageId: string | null = null;
    const subjectPrefix = getSubjectPrefix(origin);
    const emailSubject = `${subjectPrefix}${rendered.subject}`;

    if (MAILJET_API_KEY && MAILJET_SECRET_KEY) {
      const recipientEmail = getRecipientEmail(partner.email, origin);

      const emailResponse = await fetch("https://api.mailjet.com/v3.1/send", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Basic ${btoa(`${MAILJET_API_KEY}:${MAILJET_SECRET_KEY}`)}` },
        body: JSON.stringify({
          Messages: [{
            From: { Email: SENDER_EMAIL, Name: SENDER_NAME },
            To: [{ Email: recipientEmail, Name: partner.name }],
            Subject: emailSubject,
            HTMLPart: rendered.body,
            TextPart:
`Welkom ${partner.name}!

Activeer je account voor het Bureau Vlieland Partner Portaal door eenmalig je wachtwoord in te stellen via deze persoonlijke link:
${setPasswordLink}

Inloggen kan daarna op: ${portalLink}/login

Vragen? Neem contact op via erwin@bureauvlieland.nl

Met vriendelijke groet,
Erwin Soolsma
Bureau Vlieland`,
          }],
        }),
      });

      if (!emailResponse.ok) {
        emailError = await emailResponse.text();
        console.error(`Mailjet error for ${partner.name}:`, emailError);
      } else {
        emailSent = true;
        const responseData = await emailResponse.json();
        mailjetMessageId = responseData?.Messages?.[0]?.To?.[0]?.MessageID?.toString() || null;
        console.log(`Invitation email sent to ${recipientEmail} for partner ${partner.name}`);
      }
    } else {
      emailError = "Mailjet credentials not configured";
      console.warn("Mailjet credentials not configured, skipping email");
    }

    await logEmail({
      email_type: EmailTypes.PARTNER_INVITATION,
      subject: emailSubject,
      recipient_email: partner.email,
      recipient_name: partner.name,
      related_partner_id: partner.id,
      status: emailSent ? "sent" : "failed",
      error_message: emailError || undefined,
      mailjet_message_id: mailjetMessageId || undefined,
      sent_by: "bulk-invite-partners",
      metadata: {
        template_name: TemplateIds.PARTNER_INVITATION,
        actor: "admin → partner (bulk invitation)",
        bulk: true,
        method: "set_password_link",
      },
    });

    if (!emailSent) {
      return { partnerId: partner.id, partnerName: partner.name, success: false, error: emailError || "Failed to send invitation email" };
    }

    return { partnerId: partner.id, partnerName: partner.name, success: true };
  } catch (err) {
    console.error(`Error inviting partner ${partner.name}:`, err);
    return { partnerId: partner.id, partnerName: partner.name, success: false, error: err instanceof Error ? err.message : "Unknown error" };
  }
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

    const userId = user.id;

    const adminClient = createClient(supabaseUrl, supabaseServiceKey);
    const { data: roleData } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleData) {
      return new Response(
        JSON.stringify({ error: "Admin access required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { partnerIds }: BulkInviteRequest = await req.json();

    if (!partnerIds || !Array.isArray(partnerIds) || partnerIds.length === 0) {
      return new Response(
        JSON.stringify({ error: "Partner IDs required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: partners, error: partnersError } = await adminClient
      .from("partners")
      .select("id, name, email, auth_user_id, commission_percentage, accommodation_commission_percentage")
      .in("id", partnerIds);

    if (partnersError) {
      console.error("Error fetching partners:", partnersError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch partners" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!partners || partners.length === 0) {
      return new Response(
        JSON.stringify({ error: "No valid partners found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const origin = req.headers.get("origin") || "https://bureauvlieland.nl";
    const results: InviteResult[] = [];

    for (let i = 0; i < partners.length; i++) {
      const partner = partners[i];
      const result = await invitePartner(adminClient, partner, origin);
      results.push(result);

      if (i < partners.length - 1) {
        await delay(DELAY_BETWEEN_EMAILS_MS);
      }
    }

    await adminClient.from("admin_activity_log").insert({
      user_id: userId,
      action: "bulk_invite_partners",
      entity_type: "partner",
      details: {
        total_partners: partners.length,
        successful: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length,
        partner_names: results.filter(r => r.success).map(r => r.partnerName),
      },
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: `Invited ${results.filter(r => r.success).length} of ${partners.length} partners`,
        results,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in bulk-invite-partners:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
