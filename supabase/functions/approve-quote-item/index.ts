import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "npm:zod@3.22.4";
import {
  sanitizeHtml,
  formatDateNL,
  getPortalBaseUrl,
  isTestMode,
  getSubjectPrefix,
  getRecipientEmail,
  getRenderedTemplate,
  buildReplyTo,
  TemplateIds,
} from "../_shared/email-templates.ts";
import { logEmail, EmailTypes } from "../_shared/email-logger.ts";

const MAILJET_API_KEY = Deno.env.get("MAILJET_API_KEY");
const MAILJET_SECRET_KEY = Deno.env.get("MAILJET_SECRET_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const ApproveItemSchema = z.object({
  token: z.string().min(1),
  item_id: z.string().uuid(),
  origin: z.string().optional(),
  admin_override: z.boolean().optional(),
});

const sendEmailViaMailjet = async (messages: any[]) => {
  const auth = btoa(`${MAILJET_API_KEY}:${MAILJET_SECRET_KEY}`);
  const response = await fetch("https://api.mailjet.com/v3.1/send", {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
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

function generatePartnerNotificationEmailFallback(
  partnerName: string,
  item: any,
  program: any,
  portalUrl: string
): string {
  const formattedDates = (program.selected_dates as string[])
    .map((d: string) => formatDateNL(d))
    .join(", ");

  const timeInfo = item.preferred_time
    ? `<br><span style="color: #666; font-size: 13px;">⏰ Gewenste tijd: ${sanitizeHtml(item.preferred_time)}</span>`
    : "";

  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
      <h2 style="color: #1a365d;">Nieuwe aanvraag via Bureau Vlieland</h2>
      <p>Beste ${sanitizeHtml(partnerName)},</p>
      <p>Er is een nieuwe <strong>aanvraag</strong> binnengekomen via Bureau Vlieland.</p>
      <div style="background: #f7fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3 style="margin-top: 0;">📋 Klantgegevens</h3>
        <p><strong>Naam:</strong> ${sanitizeHtml(program.customer_name)}</p>
        ${program.customer_company ? `<p><strong>Bedrijf:</strong> ${sanitizeHtml(program.customer_company)}</p>` : ""}
        <p><strong>Email:</strong> ${sanitizeHtml(program.customer_email)}</p>
        <p><strong>Telefoon:</strong> ${sanitizeHtml(program.customer_phone)}</p>
      </div>
      <div style="background: #f7fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3 style="margin-top: 0;">📅 Programma details</h3>
        <p><strong>Datum(s):</strong> ${formattedDates}</p>
        <p><strong>Aantal personen:</strong> ${program.number_of_people}</p>
      </div>
      <div style="background: #edf7ed; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #48bb78;">
        <h3 style="margin-top: 0;">🎯 Aangevraagde activiteit</h3>
        <p><strong>${sanitizeHtml(item.block_name)}</strong>${timeInfo}</p>
      </div>
      <div style="background: #ebf8ff; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #4299e1;">
        <h3 style="margin-top: 0;">📋 Partner Portal</h3>
        <p>Bekijk en beheer deze aanvraag in uw Partner Portal.</p>
        <a href="${portalUrl}" style="display: inline-block; background: #1a365d; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: 600;">Open Partner Portal</a>
      </div>
      <p style="color: #666; font-size: 14px;">Dit is een vrijblijvende aanvraag.</p>
      <p>Met vriendelijke groet,<br><strong>Bureau Vlieland</strong></p>
    </div>
  `;
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const rawData = await req.json();
    const validationResult = ApproveItemSchema.safeParse(rawData);

    if (!validationResult.success) {
      const errors = validationResult.error.errors.map((e) => e.message).join(", ");
      return new Response(
        JSON.stringify({ error: `Validatiefout: ${errors}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { token, item_id, origin, admin_override } = validationResult.data;
    const testMode = isTestMode(origin);
    const subjectPrefix = getSubjectPrefix(origin);

    // 1. Fetch program by token
    const { data: program, error: programError } = await supabase
      .from("program_requests")
      .select("*")
      .eq("customer_token", token)
      .single();

    if (programError || !program) {
      return new Response(
        JSON.stringify({ error: "Programma niet gevonden" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. Validate quote status
    // Allow approval for items added/changed after a project is already definitively confirmed.
    const allowedQuoteStatuses = ["offerte_verstuurd", "akkoord_ontvangen", "definitief_bevestigd"];
    if (!allowedQuoteStatuses.includes(program.quote_status)) {
      return new Response(
        JSON.stringify({ error: "Dit voorstel kan niet meer geaccepteerd worden", currentStatus: program.quote_status }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 3. Check validity (admin override may bypass expired-quote block for backdated approvals).
    // Already definitively confirmed projects skip the validity check too — items added/changed
    // after definitief bevestigd moeten altijd geaccordeerd kunnen worden.
    const skipValidityCheck = admin_override || program.quote_status === "definitief_bevestigd";
    if (!skipValidityCheck && program.quote_valid_until) {
      const validUntil = new Date(program.quote_valid_until);
      if (validUntil < new Date()) {
        return new Response(
          JSON.stringify({ error: "Dit voorstel is verlopen" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // 4. Fetch the specific item
    const { data: item, error: itemError } = await supabase
      .from("program_request_items")
      .select("*")
      .eq("id", item_id)
      .eq("request_id", program.id)
      .single();

    if (itemError || !item) {
      return new Response(
        JSON.stringify({ error: "Item niet gevonden" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 5. Validate item state
    // Items in 'concept' kunnen ook geaccordeerd worden als het programma al akkoord/bevestigd is
    // (bijv. bij later toegevoegde ferry/bike items na hoofdakkoord).
    const allowedItemStatuses = ["offerte_verstuurd", "in_afstemming", "bevestigd"];
    const programIsAccepted = ["akkoord_ontvangen", "definitief_bevestigd"].includes(program.quote_status);
    const isLateConceptItem = programIsAccepted && item.item_quote_status === "concept";
    if (!allowedItemStatuses.includes(item.item_quote_status || "") && !isLateConceptItem) {
      return new Response(
        JSON.stringify({ error: "Dit onderdeel kan nog niet geaccordeerd worden" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (item.customer_approved_at) {
      return new Response(
        JSON.stringify({ error: "Dit onderdeel is al geaccordeerd", already_approved: true }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 6. Update the item
    const approvalTimestamp = new Date().toISOString();
    const updatePayload = admin_override
      ? {
          customer_approved_at: approvalTimestamp,
          customer_accepted_at: approvalTimestamp,
          skip_partner_notification: false,
          status: "pending",
          status_updated_at: approvalTimestamp,
          updated_at: approvalTimestamp,
        }
      : {
          customer_approved_at: approvalTimestamp,
          customer_accepted_at: approvalTimestamp,
          updated_at: approvalTimestamp,
          ...(isLateConceptItem ? { item_quote_status: "in_afstemming" } : {}),
        };

    const { error: updateError } = await supabase
      .from("program_request_items")
      .update(updatePayload)
      .eq("id", item_id);

    if (updateError) {
      console.error("Error updating item:", updateError);
      throw updateError;
    }

    if (!admin_override) {
      await supabase.from("program_request_history").insert({
        request_id: program.id,
        item_id: item_id,
        action: "item_approved",
        actor: "customer",
        actor_name: program.customer_name,
        notes: `Klant heeft "${item.block_name}" goedgekeurd. Bureau Vlieland kan dit onderdeel nu naar de partner sturen.`,
      });

      const { data: allItems } = await supabase
        .from("program_request_items")
        .select("id, item_quote_status, customer_approved_at")
        .eq("request_id", program.id)
        .neq("status", "cancelled");

      const approvableItems = (allItems || []).filter((i: any) =>
        ["offerte_verstuurd", "in_afstemming", "bevestigd"].includes(i.item_quote_status)
      );
      const allApproved = approvableItems.length > 0 && approvableItems.every((i: any) => i.customer_approved_at);

      if (allApproved && program.quote_status === "offerte_verstuurd") {
        await supabase
          .from("program_requests")
          .update({
            quote_status: "akkoord_ontvangen",
            updated_at: approvalTimestamp,
          })
          .eq("id", program.id);

        console.log("All quoted items approved — quote_status set to akkoord_ontvangen");
      }

      return new Response(
        JSON.stringify({
          success: true,
          message: "Onderdeel geaccordeerd",
          all_approved: allApproved,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 7. Send partner notification
    const baseUrl = getPortalBaseUrl(origin);
    let partnerEmail = item.provider_email;

    // Fallback: look up partner email (prefer contact_email for notifications)
    if (!partnerEmail && item.provider_id && item.provider_id !== "bureau") {
      const { data: partner } = await supabase
        .from("partners")
        .select("email, contact_email, partner_token")
        .eq("id", item.provider_id)
        .single();
      partnerEmail = partner?.contact_email || partner?.email;
    }

    if (partnerEmail && item.provider_id !== "bureau") {
      const partnerPortalUrl = `${baseUrl}/partner/login`;

      const formattedDates = (program.selected_dates as string[])
        .map((d: string) => formatDateNL(d))
        .join(", ");

      // Try DB template
      const template = await getRenderedTemplate(TemplateIds.PROGRAM_REQUEST_PARTNER, {
        partner_name: sanitizeHtml(item.provider_name),
        customer_name: sanitizeHtml(program.customer_name),
        customer_company: sanitizeHtml(program.customer_company) || "",
        customer_email: sanitizeHtml(program.customer_email),
        customer_phone: sanitizeHtml(program.customer_phone),
        dates: formattedDates,
        number_of_people: String(program.number_of_people),
        block_name: sanitizeHtml(item.block_name),
        preferred_time: item.preferred_time ? sanitizeHtml(item.preferred_time) : "",
        portal_url: partnerPortalUrl,
      });

      const emailHtml = template?.body || generatePartnerNotificationEmailFallback(
        item.provider_name,
        item,
        program,
        partnerPortalUrl
      );

      const emailSubject = template?.subject || `Nieuwe aanvraag: ${program.customer_name} - ${program.reference_number || ""}`;

      const recipientEmail = getRecipientEmail(partnerEmail, origin);

      const replyTo = buildReplyTo(program.reference_number);
      try {
        const mailjetResponse = await sendEmailViaMailjet([
          {
            From: { Email: "hallo@bureauvlieland.nl", Name: "Bureau Vlieland" },
            To: [{ Email: recipientEmail, Name: item.provider_name }],
            ...(replyTo ? { ReplyTo: replyTo } : {}),
            Subject: `${subjectPrefix}${emailSubject}`,
            HTMLPart: emailHtml,
          },
        ]);

        await logEmail({
          email_type: EmailTypes.PROGRAM_REQUEST_PARTNER,
          subject: `${subjectPrefix}${emailSubject}`,
          recipient_email: recipientEmail,
          recipient_name: item.provider_name,
          related_request_id: program.id,
          related_item_id: item_id,
          related_partner_id: item.provider_id,
          status: "sent",
          mailjet_message_id: mailjetResponse?.Messages?.[0]?.MessageID?.toString() || null,
          sent_by: "system",
          metadata: { triggered_by: "per_item_approval", test_mode: testMode },
        });

        console.log(`Sent notification to partner ${item.provider_name} for item ${item.block_name}`);
      } catch (emailError) {
        console.error("Error sending partner email:", emailError);
        await logEmail({
          email_type: EmailTypes.PROGRAM_REQUEST_PARTNER,
          subject: `${subjectPrefix}${emailSubject}`,
          recipient_email: recipientEmail,
          recipient_name: item.provider_name,
          related_request_id: program.id,
          related_item_id: item_id,
          related_partner_id: item.provider_id,
          status: "failed",
          error_message: emailError instanceof Error ? emailError.message : "Unknown error",
          sent_by: "system",
        });
      }
    }

    // 8. Log history
    await supabase.from("program_request_history").insert({
      request_id: program.id,
      item_id: item_id,
      action: "item_approved",
      actor: "customer",
      actor_name: program.customer_name,
      notes: `Klant heeft "${item.block_name}" goedgekeurd. Partner ${item.provider_name} is genotificeerd.`,
    });

    // 9. Check if all quoted items are now approved → update quote_status
    const { data: allItems } = await supabase
      .from("program_request_items")
      .select("id, item_quote_status, customer_approved_at")
      .eq("request_id", program.id)
      .neq("status", "cancelled");

    const approvableItems = (allItems || []).filter((i: any) =>
      ["offerte_verstuurd", "in_afstemming", "bevestigd"].includes(i.item_quote_status)
    );
    const allApproved = approvableItems.length > 0 && approvableItems.every((i: any) => i.customer_approved_at);

    if (allApproved && program.quote_status === "offerte_verstuurd") {
      await supabase
        .from("program_requests")
        .update({
          quote_status: "akkoord_ontvangen",
          updated_at: approvalTimestamp,
        })
        .eq("id", program.id);

      console.log("All quoted items approved — quote_status set to akkoord_ontvangen");
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Onderdeel geaccordeerd",
        all_approved: allApproved,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error in approve-quote-item:", error);
    return new Response(
      JSON.stringify({ error: "Er ging iets mis bij het accorderen van dit onderdeel" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
