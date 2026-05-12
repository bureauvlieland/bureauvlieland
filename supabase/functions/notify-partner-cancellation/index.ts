import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  getRenderedTemplate,
  sanitizeHtml,
  isTestMode,
  getSubjectPrefix,
  getRecipientEmail,
  buildReplyTo,
  SENDER_EMAIL,
  SENDER_NAME,
  TemplateIds,
} from "../_shared/email-templates.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MAILJET_API_KEY = Deno.env.get("MAILJET_API_KEY");
const MAILJET_SECRET_KEY = Deno.env.get("MAILJET_SECRET_KEY");

interface CancellationRequest {
  request_id: string;
  origin?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { request_id, origin } = (await req.json()) as CancellationRequest;

    if (!request_id) {
      return new Response(JSON.stringify({ error: "request_id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get program request
    const { data: program } = await supabase
      .from("program_requests")
      .select("id, reference_number, linked_accommodation_id")
      .eq("id", request_id)
      .single();

    if (!program) {
      return new Response(JSON.stringify({ error: "Program not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const refNumber = program.reference_number || "Onbekend";

    // Get open program items
    const { data: openItems } = await supabase
      .from("program_request_items")
      .select("id, provider_id, provider_name, provider_email, block_name, block_type, status")
      .eq("request_id", request_id)
      .in("status", ["pending", "confirmed", "accepted", "counter_proposed"]);

    const notifiableItems = (openItems || []).filter(
      (i: any) => i.block_type !== "self_arranged" && i.provider_id !== "bureau"
    );

    // Cancel items
    if (notifiableItems.length > 0) {
      await supabase
        .from("program_request_items")
        .update({ status: "cancelled", status_note: "Project verwijderd door admin" })
        .eq("request_id", request_id)
        .in("status", ["pending", "confirmed", "accepted", "counter_proposed"])
        .neq("block_type", "self_arranged");
    }

    // Enrich missing emails
    const missingEmailIds = [
      ...new Set(
        notifiableItems
          .filter((i: any) => !i.provider_email && i.provider_id)
          .map((i: any) => i.provider_id)
      ),
    ];
    if (missingEmailIds.length > 0) {
      const { data: partners } = await supabase
        .from("partners")
        .select("id, email, contact_email, name")
        .in("id", missingEmailIds);
      const partnerMap = new Map((partners || []).map((p: any) => [p.id, p]));
      for (const item of notifiableItems) {
        if (!item.provider_email && item.provider_id) {
          const partner = partnerMap.get(item.provider_id);
          if (partner) {
            item.provider_email = partner.contact_email || partner.email;
            item.provider_name = partner.name;
          }
        }
      }
    }

    // Group items by partner
    const partnerGroups = new Map<string, { email: string; name: string; items: string[]; itemIds: string[] }>();
    for (const item of notifiableItems) {
      if (!item.provider_email) continue;
      const key = item.provider_id;
      if (!partnerGroups.has(key)) {
        partnerGroups.set(key, { email: item.provider_email, name: item.provider_name, items: [], itemIds: [] });
      }
      partnerGroups.get(key)!.items.push(item.block_name);
      partnerGroups.get(key)!.itemIds.push(item.id);
    }

    // Send emails per partner
    let emailsSent = 0;
    for (const [partnerId, group] of partnerGroups) {
      const itemsList = group.items.map((n) => `• ${sanitizeHtml(n)}`).join("<br>");

      // Try template first, fallback to hardcoded
      const templateResult = await getRenderedTemplate("cancellation_partner_project", {
        partner_name: sanitizeHtml(group.name),
        reference_number: sanitizeHtml(refNumber),
        items_list: itemsList,
      });

      const subject = `${getSubjectPrefix(origin)}Aanvraag ${refNumber} is komen te vervallen`;
      const body = templateResult?.body || `
        <p>Beste ${sanitizeHtml(group.name)},</p>
        <p>Hierbij laten wij je weten dat aanvraag <strong>${sanitizeHtml(refNumber)}</strong> is komen te vervallen.</p>
        <p>De volgende onderdelen zijn hiermee geannuleerd:</p>
        <p>${itemsList}</p>
        <p>Mocht je hier vragen over hebben, neem dan gerust contact met ons op.</p>
        <p>Met vriendelijke groet,<br>Bureau Vlieland</p>
      `;

      const recipientEmail = getRecipientEmail(group.email, origin);

      const mjRes = await fetch("https://api.mailjet.com/v3.1/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Basic " + btoa(`${MAILJET_API_KEY}:${MAILJET_SECRET_KEY}`),
        },
        body: JSON.stringify({
          Messages: [{
            From: { Email: SENDER_EMAIL, Name: SENDER_NAME },
            To: [{ Email: recipientEmail, Name: group.name }],
            Subject: templateResult?.subject || subject,
            HTMLPart: body,
            ...(buildReplyTo(refNumber) ? { ReplyTo: buildReplyTo(refNumber) } : {}),
          }],
        }),
      });

      const mjData = await mjRes.json();
      const messageId = mjData?.Messages?.[0]?.To?.[0]?.MessageID?.toString() || null;

      // Log email
      await supabase.from("email_log").insert({
        email_type: "partner_cancellation",
        subject: templateResult?.subject || subject,
        recipient_email: recipientEmail,
        recipient_name: group.name,
        related_request_id: request_id,
        related_partner_id: partnerId,
        status: mjRes.ok ? "sent" : "failed",
        mailjet_message_id: messageId,
        sent_at: new Date().toISOString(),
      });

      // Log in project communications
      await supabase.from("project_communications").insert({
        request_id,
        communication_type: "email_out",
        direction: "outbound",
        subject: templateResult?.subject || subject,
        content: `Annuleringsmelding verstuurd naar ${group.name}: ${group.items.join(", ")}`,
        contact_name: group.name,
        contact_email: recipientEmail,
        metadata: { source: "email_log", email_type: "partner_cancellation" },
      });

      emailsSent++;
    }

    // Handle accommodation quotes if applicable
    let accommodationQuotesCancelled = 0;
    if (program.linked_accommodation_id) {
      const { data: openQuotes } = await supabase
        .from("accommodation_quotes")
        .select("id, partner_id, accommodation_name, status")
        .eq("request_id", program.linked_accommodation_id)
        .in("status", ["pending", "submitted"]);

      if (openQuotes && openQuotes.length > 0) {
        for (const quote of openQuotes) {
          await supabase
            .from("accommodation_quotes")
            .update({ status: "rejected" })
            .eq("id", quote.id);
          accommodationQuotesCancelled++;
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        items_cancelled: notifiableItems.length,
        emails_sent: emailsSent,
        accommodation_quotes_cancelled: accommodationQuotesCancelled,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Error in notify-partner-cancellation:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
