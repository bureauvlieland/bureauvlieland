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
import { logEmail } from "../_shared/email-logger.ts";
import { isBureauItem } from "../_shared/bureau-item.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MAILJET_API_KEY = Deno.env.get("MAILJET_API_KEY");
const MAILJET_SECRET_KEY = Deno.env.get("MAILJET_SECRET_KEY");

interface CancellationRequest {
  request_id: string;
  origin?: string;
  partner_ids?: string[];
  accommodation_partner_ids?: string[];
  skip_item_cancel?: boolean;
}


Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { request_id, origin, partner_ids, accommodation_partner_ids, skip_item_cancel } = (await req.json()) as CancellationRequest;
    const partnerFilter = Array.isArray(partner_ids) ? new Set(partner_ids) : null;
    const accommodationFilter = Array.isArray(accommodation_partner_ids) ? new Set(accommodation_partner_ids) : null;


    if (!request_id) {
      return new Response(JSON.stringify({ error: "request_id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get program request
    const { data: program } = await supabase
      .from("program_requests")
      .select("id, reference_number, linked_accommodation_id, cancellation_reason")
      .eq("id", request_id)
      .single();

    if (!program) {
      return new Response(JSON.stringify({ error: "Program not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const refNumber = program.reference_number || "Onbekend";
    const cancellationReason = (program.cancellation_reason || "").trim();
    const cancellationReasonHtml = cancellationReason ? sanitizeHtml(cancellationReason) : "";

    // Get program items — wanneer caller items al heeft geannuleerd (skip_item_cancel),
    // ook 'cancelled' meenemen zodat we de juiste partners kunnen vinden.
    const itemStatuses = skip_item_cancel
      ? ["pending", "confirmed", "accepted", "counter_proposed", "cancelled"]
      : ["pending", "confirmed", "accepted", "counter_proposed"];
    const { data: openItems } = await supabase
      .from("program_request_items")
      .select("id, provider_id, provider_name, provider_email, block_name, block_type, status")
      .eq("request_id", request_id)
      .in("status", itemStatuses);

    const notifiableItems = (openItems || []).filter(
      (i: any) =>
        i.block_type !== "self_arranged" &&
        !isBureauItem(i) &&
        (!partnerFilter || (i.provider_id && partnerFilter.has(i.provider_id)))
    );

    // Cancel items (skipped when caller already cancelled them, e.g. cancel-program-request)
    if (notifiableItems.length > 0 && !skip_item_cancel) {
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

      // Unified annuleringstemplate (zelfde als customer-cancel-flow)
      const templateResult = await getRenderedTemplate("cancellation_partner", {
        partner_name: sanitizeHtml(group.name),
        customer_name: "",
        reference_number: sanitizeHtml(refNumber),
        cancelled_items: itemsList,
        cancellation_reason: cancellationReasonHtml,
      });

      const subject = `${getSubjectPrefix(origin)}Aanvraag ${refNumber} is geannuleerd`;
      const reasonBlock = cancellationReasonHtml
        ? `<p><strong>Reden van annulering:</strong> ${cancellationReasonHtml}</p>`
        : "";
      const body = templateResult?.body || `
        <p>Beste ${sanitizeHtml(group.name)},</p>
        <p>Hierbij laten we je weten dat aanvraag <strong>${sanitizeHtml(refNumber)}</strong> is geannuleerd.</p>
        <p>De volgende onderdelen komen daarmee te vervallen:</p>
        <p>${itemsList}</p>
        ${reasonBlock}
        <p>Heb je vragen, mail of bel ons gerust.</p>
      `;

      const recipientEmail = getRecipientEmail(group.email, origin);

      const mjRes = await fetch("https://api.mailjet.com/v3.1/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Basic " + btoa(`${MAILJET_API_KEY}:${MAILJET_SECRET_KEY}`),
        },
        body: JSON.stringify({
          Messages: [{ TrackClicks: "disabled", TrackOpens: "disabled",
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

      // Log email — één rij per item zodat de mail-popover per onderdeel werkt
      const status: "sent" | "failed" = mjRes.ok ? "sent" : "failed";
      const errorMessage = mjRes.ok ? undefined : JSON.stringify(mjData).slice(0, 1000);
      const baseMetadata = {
        template_name: "cancellation_partner",
        actor: "admin → partner (project geannuleerd)",
        item_ids: group.itemIds,
        item_count: group.itemIds.length,
      };
      const idsForLog = group.itemIds.length > 0 ? group.itemIds : [null as string | null];
      for (const iid of idsForLog) {
        await logEmail({
          email_type: "cancellation_partner",
          subject: templateResult?.subject || subject,
          recipient_email: recipientEmail,
          recipient_name: group.name,
          related_request_id: request_id,
          related_partner_id: partnerId,
          related_item_id: iid || undefined,
          status,
          error_message: errorMessage,
          mailjet_message_id: messageId || undefined,
          sent_by: "admin",
          metadata: baseMetadata,
        });
      }

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
    let accommodationEmailsSent = 0;
    if (program.linked_accommodation_id) {
      const quoteStatuses = skip_item_cancel
        ? ["pending", "submitted", "selected", "accepted", "rejected", "declined"]
        : ["pending", "submitted", "selected", "accepted"];
      const { data: openQuotes } = await supabase
        .from("accommodation_quotes")
        .select("id, partner_id, accommodation_name, status")
        .eq("request_id", program.linked_accommodation_id)
        .in("status", quoteStatuses);

      const filteredQuotes = (openQuotes || []).filter(
        (q: any) => !accommodationFilter || (q.partner_id && accommodationFilter.has(q.partner_id))
      );

      if (filteredQuotes.length > 0) {
        // Enrich partner emails
        const partnerIds = [...new Set(filteredQuotes.map((q: any) => q.partner_id).filter(Boolean))];
        const { data: partners } = await supabase
          .from("partners")
          .select("id, name, email, contact_email")
          .in("id", partnerIds);
        const partnerMap = new Map((partners || []).map((p: any) => [p.id, p]));

        for (const quote of filteredQuotes) {
          const partner = partnerMap.get(quote.partner_id);
          const partnerEmail = partner ? (partner.contact_email || partner.email) : null;
          const partnerName = partner?.name || quote.accommodation_name || "partner";



          if (partnerEmail) {
            const wasSelected = quote.status === "selected" || quote.status === "accepted";
            const statusLine = wasSelected
              ? `Uw offerte was reeds geselecteerd voor deze aanvraag. Met deze annulering komt de boeking te vervallen.`
              : `Uw offerte was nog in behandeling bij de klant. Met deze annulering komt de offerteaanvraag te vervallen — een reactie is niet meer nodig.`;

            const subject = `${getSubjectPrefix(origin)}Logies-aanvraag ${refNumber} is geannuleerd`;
            const body = `
              <p>Beste ${sanitizeHtml(partnerName)},</p>
              <p>Hierbij laten we je weten dat de logies-aanvraag met referentie <strong>${sanitizeHtml(refNumber)}</strong> is geannuleerd.</p>
              <p>${statusLine}</p>
              <p>Excuses voor het ongemak — heb je vragen, neem dan gerust contact met ons op.</p>
              <p>Met vriendelijke groet,<br>Bureau Vlieland</p>
            `;

            const recipientEmail = getRecipientEmail(partnerEmail, origin);

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
                  To: [{ Email: recipientEmail, Name: partnerName }],
                  Subject: subject,
                  HTMLPart: body,
                  ...(buildReplyTo(refNumber) ? { ReplyTo: buildReplyTo(refNumber) } : {}),
                }],
              }),
            });

            const mjData = await mjRes.json().catch(() => ({}));
            const messageId = mjData?.Messages?.[0]?.To?.[0]?.MessageID?.toString() || null;
            const status: "sent" | "failed" = mjRes.ok ? "sent" : "failed";
            const errorMessage = mjRes.ok ? undefined : JSON.stringify(mjData).slice(0, 1000);

            await logEmail({
              email_type: "cancellation_accommodation_partner",
              subject,
              recipient_email: recipientEmail,
              recipient_name: partnerName,
              related_request_id: request_id,
              related_partner_id: quote.partner_id,
              status,
              error_message: errorMessage,
              mailjet_message_id: messageId || undefined,
              sent_by: "admin",
              metadata: {
                template_name: "cancellation_accommodation_partner",
                actor: "admin → logies-partner (project geannuleerd)",
                accommodation_request_id: program.linked_accommodation_id,
                quote_id: quote.id,
                previous_quote_status: quote.status,
              },
            });

            await supabase.from("project_communications").insert({
              request_id,
              communication_type: "email_out",
              direction: "outbound",
              subject,
              content: `Annuleringsmelding logies verstuurd naar ${partnerName} (status was: ${quote.status})`,
              contact_name: partnerName,
              contact_email: recipientEmail,
              metadata: { source: "email_log", email_type: "cancellation_accommodation_partner", quote_id: quote.id },
            }).then(() => {}, () => {});

            if (mjRes.ok) accommodationEmailsSent++;
          }

          if (quote.status !== "rejected" && quote.status !== "declined") {
            await supabase
              .from("accommodation_quotes")
              .update({ status: "rejected" })
              .eq("id", quote.id);
            accommodationQuotesCancelled++;
          }

        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        items_cancelled: notifiableItems.length,
        emails_sent: emailsSent,
        accommodation_quotes_cancelled: accommodationQuotesCancelled,
        accommodation_emails_sent: accommodationEmailsSent,
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
