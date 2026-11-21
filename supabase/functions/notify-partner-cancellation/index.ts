import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  getRenderedTemplate,
  sanitizeHtml,
  formatDateNL,
  getSubjectPrefix,
  getRecipientEmail,
  buildReplyTo,
  getPortalBaseUrl,
  wrapEmailHtml,
  SENDER_EMAIL,
  SENDER_NAME,
  TemplateIds,
} from "../_shared/email-templates.ts";
import { logEmail } from "../_shared/email-logger.ts";
import { isBureauItem } from "../_shared/bureau-item.ts";
import { itemWasSentToPartner } from "../_shared/partnerWasApproached.ts";
import { itemHadPartnerCommitment, type HistoryStatusRow } from "./cancellationRecipients.ts";


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


export const handler = async (req: Request): Promise<Response> => {
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
      .select("id, provider_id, provider_name, provider_email, block_name, block_type, block_category, status, skip_partner_notification, quoted_at, partner_price_change_acknowledged_at, customer_accepted_at, executed_at")
      .eq("request_id", request_id)
      .in("status", itemStatuses);

    // Status van vóór de annulering, voor onderdelen die de aanroeper al op
    // 'cancelled' zette (cancel-program-request): uit de historie.
    let statusHistory: HistoryStatusRow[] = [];
    const cancelledIds = (openItems || []).filter((i: any) => i.status === "cancelled").map((i: any) => i.id);
    if (cancelledIds.length > 0) {
      const { data: historyRows } = await supabase
        .from("program_request_history")
        .select("item_id, old_value, new_value")
        .eq("request_id", request_id)
        .in("item_id", cancelledIds);
      statusHistory = (historyRows || []) as HistoryStatusRow[];
    }

    // Alleen partners die daadwerkelijk benaderd zijn én het onderdeel hadden
    // bevestigd (of de klant had het geaccepteerd) krijgen een annuleringsmail.
    // Dit geldt ook als hun partner_id expliciet is meegegeven: een partner die
    // alleen een aanvraag kreeg, hoort niets over een annulering
    // (cancellationRecipients.ts).
    const notifiableItems = (openItems || []).filter(
      (i: any) =>
        i.block_type !== "self_arranged" &&
        !isBureauItem(i) &&
        itemWasSentToPartner(i) &&
        itemHadPartnerCommitment(i, statusHistory) &&
        (!partnerFilter || (i.provider_id && partnerFilter.has(i.provider_id)))
    );


    // Cancel items (skipped when caller already cancelled them, e.g. cancel-program-request).
    // Let op: dit staat los van notifiableItems — items moeten ook geannuleerd
    // worden wanneer er geen enkele partner benaderd was.
    if ((openItems || []).length > 0 && !skip_item_cancel) {

      await supabase
        .from("program_request_items")
        .update({ status: "cancelled", status_note: "Project verwijderd door admin" })
        .eq("request_id", request_id)
        .in("status", ["pending", "confirmed", "accepted", "counter_proposed"])
        .neq("block_type", "self_arranged");

      // Per onderdeel een historieregel, zodat het verloop in het partnerportaal
      // de annulering toont (project_communications ziet de partner niet).
      const cancelledRows = (openItems || []).filter(
        (i: any) => ["pending", "confirmed", "accepted", "counter_proposed"].includes(i.status) && i.block_type !== "self_arranged",
      );
      if (cancelledRows.length > 0) {
        const { error: histErr } = await supabase.from("program_request_history").insert(
          cancelledRows.map((i: any) => ({
            request_id,
            item_id: i.id,
            action: "cancelled",
            actor: "admin",
            actor_name: "Bureau Vlieland",
            old_value: { status: i.status },
            new_value: { status: "cancelled" },
            notes: "Project verwijderd door admin",
          })),
        );
        if (histErr) console.error("history insert failed:", histErr);
      }
    }


    // Enrich missing emails + verzamel partner_tokens voor deeplinks naar de portal
    const partnerIdsForEnrich = [
      ...new Set(
        notifiableItems.map((i: any) => i.provider_id).filter(Boolean)
      ),
    ];
    const partnerTokenMap = new Map<string, string>();
    if (partnerIdsForEnrich.length > 0) {
      const { data: partners } = await supabase
        .from("partners")
        .select("id, email, contact_email, name, partner_token")
        .in("id", partnerIdsForEnrich);
      const partnerMap = new Map((partners || []).map((p: any) => [p.id, p]));
      for (const p of partners || []) {
        if ((p as any).partner_token) partnerTokenMap.set((p as any).id, (p as any).partner_token);
      }
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

      // Eén template (zelfde als de klant-annuleerflow); de portaalknop zit
      // sinds migratie 20261121160000 in de template als {{portal_url}}.
      const portalUrl = `${getPortalBaseUrl(origin)}/partner/dashboard?tab=projecten&q=${encodeURIComponent(refNumber)}`;
      const templateResult = await getRenderedTemplate(TemplateIds.CANCELLATION_PARTNER, {
        partner_name: sanitizeHtml(group.name),
        customer_name: "",
        reference_number: sanitizeHtml(refNumber),
        cancelled_items: itemsList,
        cancellation_reason: cancellationReasonHtml,
        portal_url: portalUrl,
      });

      const subject = `${getSubjectPrefix(origin)}Aanvraag ${refNumber} is geannuleerd`;
      const reasonBlock = cancellationReasonHtml
        ? `<p><strong>Reden van annulering:</strong> ${cancellationReasonHtml}</p>`
        : "";
      const body = templateResult?.body ?? await wrapEmailHtml(`
        <h2 style="color:#0F4C5C;margin:0 0 16px;font-size:20px;">Aanvraag geannuleerd</h2>
        <p>Hoi ${sanitizeHtml(group.name)},</p>
        <p>Hierbij laten we je weten dat aanvraag <strong>${sanitizeHtml(refNumber)}</strong> is geannuleerd.</p>
        <p>De volgende onderdelen komen daarmee te vervallen:</p>
        <p>${itemsList}</p>
        ${reasonBlock}
        <p>Je hoeft verder niets te doen. Heb je vragen, mail of bel ons gerust.</p>
        <p style="margin-top:16px"><a href="${portalUrl}" style="display:inline-block;padding:10px 16px;background:#0F4C5C;color:#fff;border-radius:6px;text-decoration:none">Bekijk in je partnerportaal</a></p>
      `, supabase);

      const recipientEmail = getRecipientEmail(group.email, origin);


      const mjRes = await fetch("https://api.mailjet.com/v3.1/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Basic " + btoa(`${MAILJET_API_KEY}:${MAILJET_SECRET_KEY}`),
        },
        body: JSON.stringify({
          Messages: [{ TrackClicks: "disabled", TrackOpens: "enabled",
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
      // "cancelled": de geselecteerde offerte die de databasetrigger bij de
      // annulering van de aanvraag heeft gesloten (de boeking vervalt).
      const quoteStatuses = skip_item_cancel
        ? ["pending", "submitted", "expired", "selected", "accepted", "cancelled", "rejected", "declined"]
        : ["pending", "submitted", "expired", "selected", "accepted", "cancelled"];
      const { data: openQuotes } = await supabase
        .from("accommodation_quotes")
        .select("id, partner_id, accommodation_name, status")
        .eq("request_id", program.linked_accommodation_id)
        .in("status", quoteStatuses);

      const filteredQuotes = (openQuotes || []).filter(
        (q: any) => !accommodationFilter || (q.partner_id && accommodationFilter.has(q.partner_id))
      );

      // Haal LOG-referentie + klantgegevens van de gekoppelde logies-aanvraag op
      const { data: accommodationReq } = await supabase
        .from("accommodation_requests")
        .select("reference_number, customer_company, customer_name, arrival_date, departure_date")
        .eq("id", program.linked_accommodation_id)
        .single();
      const accommodationRef = accommodationReq?.reference_number || refNumber;
      const customerLabel =
        accommodationReq?.customer_company ||
        accommodationReq?.customer_name ||
        "onbekende klant";
      const arrival = accommodationReq?.arrival_date || null;
      const departure = accommodationReq?.departure_date || null;
      const datesLabel = arrival && departure
        ? `${formatDateNL(arrival)} t/m ${formatDateNL(departure)}`
        : arrival
          ? formatDateNL(arrival)
          : "";

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
            const wasSelected = quote.status === "selected" || quote.status === "accepted" || quote.status === "cancelled";
            const portalUrl = `${getPortalBaseUrl(origin)}/partner/dashboard?tab=projecten&q=${encodeURIComponent(accommodationRef)}`;

            // DB-template (migratie 20261121160000); de code had hier eigen HTML.
            const rendered = await getRenderedTemplate(TemplateIds.CANCELLATION_ACCOMMODATION_PARTNER, {
              partner_name: sanitizeHtml(partnerName),
              customer_name: sanitizeHtml(customerLabel),
              customer_company: sanitizeHtml(accommodationReq?.customer_company || ""),
              reference_number: sanitizeHtml(accommodationRef),
              program_reference: accommodationRef !== refNumber ? sanitizeHtml(refNumber) : "",
              accommodation_name: sanitizeHtml(quote.accommodation_name || ""),
              dates: sanitizeHtml(datesLabel),
              was_selected: wasSelected ? "1" : "",
              cancellation_reason: cancellationReasonHtml,
              portal_url: portalUrl,
            }, {
              reference_number: accommodationRef,
              customer_name: customerLabel,
            });

            const subject = rendered
              ? `${getSubjectPrefix(origin)}${rendered.subject}`
              : `${getSubjectPrefix(origin)}Logiesaanvraag ${accommodationRef} is geannuleerd (${customerLabel})`;
            const statusLine = wasSelected
              ? "Je offerte was al gekozen voor deze aanvraag; met deze annulering vervalt de boeking."
              : "Je offerte was nog in behandeling; met deze annulering vervalt de offerteaanvraag en is een reactie niet meer nodig.";
            const reasonBlock = cancellationReasonHtml
              ? `<p><strong>Reden van annulering:</strong> ${cancellationReasonHtml}</p>`
              : "";
            const body = rendered?.body ?? await wrapEmailHtml(`
              <h2 style="color:#0F4C5C;margin:0 0 16px;font-size:20px;">Logiesaanvraag geannuleerd</h2>
              <p>Hoi ${sanitizeHtml(partnerName)},</p>
              <p>De logiesaanvraag <strong>${sanitizeHtml(accommodationRef)}</strong> van ${sanitizeHtml(customerLabel)}${datesLabel ? ` voor <strong>${sanitizeHtml(datesLabel)}</strong>` : ""} is geannuleerd.</p>
              <p>${statusLine}</p>
              ${reasonBlock}
              <p>Je hoeft verder niets te doen. Excuses voor het ongemak; heb je vragen, reageer dan gerust op deze mail.</p>
              <p style="margin-top:16px"><a href="${portalUrl}" style="display:inline-block;padding:10px 16px;background:#0F4C5C;color:#fff;border-radius:6px;text-decoration:none">Bekijk in je partnerportaal</a></p>
            `, supabase);

            const recipientEmail = getRecipientEmail(partnerEmail, origin);

            const mjRes = await fetch("https://api.mailjet.com/v3.1/send", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: "Basic " + btoa(`${MAILJET_API_KEY}:${MAILJET_SECRET_KEY}`),
              },
              body: JSON.stringify({
                Messages: [{
                  TrackClicks: "disabled", TrackOpens: "enabled",
                  From: { Email: SENDER_EMAIL, Name: SENDER_NAME },
                  To: [{ Email: recipientEmail, Name: partnerName }],
                  Subject: subject,
                  HTMLPart: body,
                  ...(buildReplyTo(accommodationRef) ? { ReplyTo: buildReplyTo(accommodationRef) } : {}),
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
                accommodation_reference_number: accommodationRef,
                customer_label: customerLabel,
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
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
};

if (import.meta.main) Deno.serve(handler);

