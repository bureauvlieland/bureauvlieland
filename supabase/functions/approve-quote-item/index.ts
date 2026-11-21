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
  getEffectiveItemTime,
  wrapEmailHtml,
  formatCurrencyNL,
} from "../_shared/email-templates.ts";
import { logEmail, EmailTypes } from "../_shared/email-logger.ts";
import { isBureauItem } from "../_shared/bureau-item.ts";
import { expectsPartnerInvoice, isConfirmOnlyItem, isInformationalItem, partnerBillingNote } from "../_shared/itemHandling.ts";
import { buildPartnerRequestMail } from "../_shared/partnerRequestMail.ts";

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
    const skipValidityCheck =
      admin_override || ["akkoord_ontvangen", "definitief_bevestigd"].includes(program.quote_status);

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
    const isProposalPhaseItem = program.quote_status === "offerte_verstuurd";
    const programIsAccepted = ["akkoord_ontvangen", "definitief_bevestigd"].includes(program.quote_status);
    const isLateConceptItem = programIsAccepted && item.item_quote_status === "concept";
    // Bureau-managed onderdelen (overtocht, fiets, bagage) doorlopen geen partner-
    // offertetraject en hebben daarom vaak een andere/lege item_quote_status. Ze
    // mogen altijd door de klant goedgekeurd worden zolang het programma akkoord
    // is of in offerte staat; anders bleef een gereset akkoord onhaalbaar.
    const isBureauManaged = isBureauItem(item);
    if (!isProposalPhaseItem && !isBureauManaged && !allowedItemStatuses.includes(item.item_quote_status || "") && !isLateConceptItem) {
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

    // Detecteer openstaande admin-prijswijziging: als die er ligt op het moment dat de klant
    // akkoord geeft, dan is dat OOK akkoord op de nieuwe prijs. Persisteer naar quoted_price
    // zodat dit niet meer in de admin Prijscontrole verschijnt.
    const programPeople = Number(program.number_of_people || 0);
    const numberOfDays = Array.isArray(program.selected_dates) ? program.selected_dates.length : 1;
    const effectivePeople = item.override_people ?? programPeople;
    const priceType = item.price_type || "per_person";
    const isPerPerson = !priceType || priceType === "per_person" || priceType === "per_person_per_day";
    const isPerDay = priceType === "per_person_per_day";
    let acceptedPriceTotal: number | null = null;
    if (item.admin_price_override != null && item.admin_price_override_updated_at) {
      const ack = item.partner_price_change_acknowledged_at ?? item.quoted_at;
      const overrideIsNewer = !ack
        || new Date(item.admin_price_override_updated_at).getTime() > new Date(ack).getTime();
      if (overrideIsNewer) {
        const personMultiplier = isPerPerson ? effectivePeople : 1;
        const dayMultiplier = isPerDay ? numberOfDays : 1;
        acceptedPriceTotal = Number(item.admin_price_override) * personMultiplier * dayMultiplier;
      }
    }
    const priceSyncPayload = acceptedPriceTotal != null
      ? {
          quoted_price: acceptedPriceTotal,
          partner_price_change_acknowledged_at: approvalTimestamp,
        }
      : {};

    // Na klant-goedkeuring in de offertefase mag een partner-item naar de aanbieder.
    // Dit geldt óók als de expliciete awaiting_customer_for_partner_send-vlag ontbreekt;
    // skip_partner_notification=true betekent hier: nog niet naar partner verstuurd.
    const triggerPartnerSend = !admin_override
      && (item.awaiting_customer_for_partner_send === true || program.quote_status === "offerte_verstuurd")
      && item.provider_id
      && item.provider_id !== "bureau"
      && (item.skip_partner_notification === true || item.skip_partner_notification === null);

    const updatePayload = admin_override
      ? {
          customer_approved_at: approvalTimestamp,
          customer_accepted_at: approvalTimestamp,
          skip_partner_notification: false,
          status: "pending",
          status_updated_at: approvalTimestamp,
          updated_at: approvalTimestamp,
          awaiting_customer_for_partner_send: false,
          ...priceSyncPayload,
        }
      : {
          customer_approved_at: approvalTimestamp,
          customer_accepted_at: approvalTimestamp,
          updated_at: approvalTimestamp,
          ...(isLateConceptItem ? { item_quote_status: "in_afstemming" } : {}),
          ...(triggerPartnerSend
            ? { skip_partner_notification: false, awaiting_customer_for_partner_send: false }
            : {}),
          ...priceSyncPayload,
        };

    const { error: updateError } = await supabase
      .from("program_request_items")
      .update(updatePayload)
      .eq("id", item_id);

    if (updateError) {
      console.error("Error updating item:", updateError);
      throw updateError;
    }

    // Trigger automatische partner-uitvraag wanneer admin had ingesteld "wacht op klant".
    // Dit gebeurt vóór de history-insert zodat in de tijdlijn de partner-mail meekomt.
    if (triggerPartnerSend) {
      try {
        await supabase.functions.invoke("send-items-to-partners", {
          body: {
            request_id: program.id,
            item_ids: [item_id],
            mode: "force",
            origin,
          },
        });
        console.log(`Auto-sent partner request for item ${item.block_name} after customer approval (awaiting flag)`);
      } catch (autoSendError) {
        console.error("Non-critical: auto-send to partner failed after approval:", autoSendError);
      }
    }

    if (!admin_override) {
      // Detecteer re-approval: partner had al gereageerd (prijs/bevestiging) maar
      // de klant moest na een wijziging opnieuw akkoord geven.
      const isReapprovalAfterPartnerResponse =
        item.provider_id
        && item.provider_id !== "bureau"
        && (item.status === "confirmed" || item.status === "alternative")
        && (item.quoted_price != null || !!item.quoted_at || !!item.partner_price_change_acknowledged_at);

      await supabase.from("program_request_history").insert({
        request_id: program.id,
        item_id: item_id,
        action: "item_approved",
        actor: "customer",
        actor_name: program.customer_name,
        notes: triggerPartnerSend
          ? `Klant heeft "${item.block_name}" goedgekeurd. Aanvraag is automatisch naar partner ${item.provider_name} verstuurd.`
          : isReapprovalAfterPartnerResponse
            ? `Klant heeft definitief akkoord gegeven op het aangepaste voorstel van ${item.provider_name} voor "${item.block_name}".`
            : `Klant heeft "${item.block_name}" goedgekeurd. Bureau Vlieland kan dit onderdeel nu naar de partner sturen.`,
      });

      // Notificeer partner bij re-approval (geen auto-send want partner staat
      // al in de loop — dit is een bevestiging op zijn eigen voorstel).
      if (isReapprovalAfterPartnerResponse && !triggerPartnerSend) {
        try {
          const baseUrl = getPortalBaseUrl(origin);
          let partnerEmail = item.provider_email;
          if (!partnerEmail) {
            const { data: partner } = await supabase
              .from("partners")
              .select("email, contact_email")
              .eq("id", item.provider_id)
              .single();
            partnerEmail = partner?.contact_email || partner?.email;
          }
          if (partnerEmail) {
            const partnerPortalUrl = `${baseUrl}/partner/login`;
            const recipientEmail = getRecipientEmail(partnerEmail, origin);
            const replyTo = buildReplyTo(program.reference_number);
            const priceLine = item.quoted_price != null
              ? `<p><strong>Bevestigde prijs:</strong> ${formatCurrencyNL(Number(item.quoted_price))}</p>`
              : "";
            const alreadyConfirmedByPartner =
              item.status === "confirmed" || item.status === "accepted" || item.status === "executed";
            const knownTime = item.confirmed_time || item.proposed_time || item.preferred_time || null;
            const actionLine = alreadyConfirmedByPartner
              ? (knownTime
                  ? `<p>Je had dit onderdeel al bevestigd${knownTime ? ` voor ${sanitizeHtml(String(knownTime))}` : ""} — <strong>je hoeft nu niets te doen</strong>. Zet het definitief in je planning.</p>`
                  : `<p>Je had dit onderdeel al bevestigd. Er staat nog geen tijd vast: geef de tijd door via je partnerportaal.</p>`)
              : `<p>Bevestig dit onderdeel in je partnerportaal zodat we het definitief kunnen inplannen.</p>`;
            const emailSubject = alreadyConfirmedByPartner
              ? `Klant akkoord (geen actie nodig): ${item.block_name} (${program.reference_number || ""})`
              : `Klant akkoord op je voorstel: ${item.block_name} (${program.reference_number || ""})`;
            // Huisstijl via wrapEmailHtml; partner wordt getutoyeerd (ook in kop en onderwerp).
            const emailHtml = await wrapEmailHtml(`
              <h2 style="color:#0F4C5C;margin:0 0 16px;">Klant geeft akkoord op je voorstel</h2>
              <p>Hoi ${sanitizeHtml(item.provider_name)},</p>
              <p>Goed nieuws: de klant heeft definitief akkoord gegeven op je aangepaste voorstel voor <strong>${sanitizeHtml(item.block_name)}</strong> (aanvraag ${sanitizeHtml(program.reference_number || "")}).</p>
              ${priceLine}
              ${actionLine}
              <p><a href="${partnerPortalUrl}" style="display:inline-block;background:#0F4C5C;color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:6px;font-weight:600;">Open partnerportaal</a></p>
              <p>Met vriendelijke groet,<br><strong>Bureau Vlieland</strong></p>
            `, supabase);
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
              mailjet_message_id: mailjetResponse?.Messages?.[0]?.To?.[0]?.MessageID?.toString() || null,
              sent_by: "system",
              metadata: {
                template_name: "program_partner_reapproval",
                actor: "system → partner (re-approval na partner-wijziging)",
                triggered_by: "per_item_reapproval",
                test_mode: testMode,
              },
            });
          }
        } catch (reapprovalEmailError) {
          console.error("Non-critical: re-approval partner email failed:", reapprovalEmailError);
        }
      }

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
          message: triggerPartnerSend
            ? "Onderdeel geaccordeerd en partner geïnformeerd"
            : isReapprovalAfterPartnerResponse
              ? "Onderdeel geaccordeerd en partner geïnformeerd over re-approval"
              : "Onderdeel geaccordeerd",
          all_approved: allApproved,
          auto_partner_sent: triggerPartnerSend,
          reapproval_partner_notified: isReapprovalAfterPartnerResponse && !triggerPartnerSend,
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

      const selectedDates: string[] = Array.isArray(program.selected_dates) ? (program.selected_dates as string[]) : [];
      const formattedDates = selectedDates.map((d: string) => formatDateNL(d)).join(", ");
      const referenceNumber = String(program.reference_number || "");
      const billingNote = partnerBillingNote(item);

      // DB-template met de drie onderdeelsoorten (_shared/itemHandling.ts):
      // bevestiging en mededeling krijgen geen prijsvraag, facturatie alleen
      // bij een onderdeel op de bureaufactuur. Referentie in onderwerp en tekst.
      const template = await getRenderedTemplate(TemplateIds.PROGRAM_REQUEST_PARTNER, {
        partner_name: sanitizeHtml(item.provider_name),
        customer_name: sanitizeHtml(program.customer_name),
        customer_company: sanitizeHtml(program.customer_company) || "",
        dates: formattedDates,
        number_of_people: String(program.number_of_people),
        block_name: sanitizeHtml(item.block_name),
        effective_time: getEffectiveItemTime(item) ? sanitizeHtml(getEffectiveItemTime(item)!) : "",
        portal_url: partnerPortalUrl,
        reference_number: sanitizeHtml(referenceNumber),
        partner_handling: item.partner_handling || "quote",
        billing_route: item.billing_route || "bureau",
        is_confirm_only: isConfirmOnlyItem(item) ? "1" : "",
        is_inform: isInformationalItem(item) ? "1" : "",
        bureau_invoice: expectsPartnerInvoice(item) ? "1" : "",
        billing_note: billingNote ? sanitizeHtml(billingNote) : "",
      }, {
        block_name: item.block_name,
        reference_number: referenceNumber,
      });

      // Noodrem als de template niet laadt: dezelfde gedeelde tekst als
      // send-items-to-partners (inhoudelijk gelijk, in de huisstijl).
      const fallback = template ? null : buildPartnerRequestMail({
        partnerName: item.provider_name,
        referenceNumber: program.reference_number,
        customerLabel: program.customer_company || program.customer_name,
        dates: selectedDates,
        numberOfPeople: program.number_of_people,
        items: [item],
        portalUrl: partnerPortalUrl,
        customerSigned: !!program.terms_accepted_at,
      });
      const emailHtml = template?.body ?? await wrapEmailHtml(fallback!.html, supabase);
      const emailSubject = template?.subject ?? fallback!.subject;

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
          mailjet_message_id: mailjetResponse?.Messages?.[0]?.To?.[0]?.MessageID?.toString() || null,
          sent_by: "system",
          metadata: {
            template_name: EmailTypes.PROGRAM_REQUEST_PARTNER,
            actor: "system → partner (na klantakkoord per item)",
            triggered_by: "per_item_approval",
            test_mode: testMode,
          },
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
          metadata: {
            template_name: EmailTypes.PROGRAM_REQUEST_PARTNER,
            actor: "system → partner (na klantakkoord per item)",
            triggered_by: "per_item_approval",
            failure: true,
          },
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
