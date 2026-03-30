// Deprecated: import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { 
  getRenderedTemplate, 
  sanitizeHtml, 
  formatCurrencyNL,
  getRecipientEmail,
  getSubjectPrefix,
  TemplateIds 
} from "../_shared/email-templates.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const sendEmailViaMailjet = async (
  to: string,
  toName: string,
  subject: string,
  htmlContent: string
) => {
  const MAILJET_API_KEY = Deno.env.get("MAILJET_API_KEY");
  const MAILJET_SECRET_KEY = Deno.env.get("MAILJET_SECRET_KEY");

  if (!MAILJET_API_KEY || !MAILJET_SECRET_KEY) {
    console.error("Mailjet credentials not configured");
    return false;
  }

  const credentials = btoa(`${MAILJET_API_KEY}:${MAILJET_SECRET_KEY}`);

  try {
    const response = await fetch("https://api.mailjet.com/v3.1/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${credentials}`,
      },
      body: JSON.stringify({
        Messages: [
          {
            From: {
              Email: "hallo@bureauvlieland.nl",
              Name: "Bureau Vlieland",
            },
            To: [{ Email: to, Name: toName }],
            Subject: subject,
            HTMLPart: htmlContent,
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Mailjet error:", errorText);
      return false;
    }

    await response.text(); // Consume response body
    return true;
  } catch (error) {
    console.error("Error sending email via Mailjet:", error);
    return false;
  }
};

// Fallback email generator if template not found
const generateFallbackStatusEmailHtml = (
  customerName: string,
  activityName: string,
  partnerName: string,
  status: "confirmed" | "unavailable",
  quotedPrice: number | null,
  statusNote: string | null,
  customerToken: string
) => {
  const portalUrl = `https://bureauvlieland.nl/mijn-programma/${customerToken}`;
  
  const statusConfig = {
    confirmed: {
      title: "Activiteit bevestigd",
      color: "#38a169",
      bgColor: "#f0fff4",
      borderColor: "#9ae6b4",
      icon: "✓",
      message: "is bevestigd door de partner",
    },
    unavailable: {
      title: "Activiteit niet beschikbaar",
      color: "#e53e3e",
      bgColor: "#fff5f5",
      borderColor: "#feb2b2",
      icon: "✕",
      message: "is helaas niet beschikbaar op de gewenste datum",
    },
  };

  const config = statusConfig[status];
  const formattedPrice = quotedPrice ? formatCurrencyNL(quotedPrice) : null;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${config.title}</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f5f5;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td style="padding: 40px 20px;">
        <table role="presentation" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <tr>
            <td style="background-color: #1a365d; padding: 30px 40px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 600;">Bureau Vlieland</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px;">
              <h2 style="margin: 0 0 20px; color: #1a365d; font-size: 20px;">
                ${status === "confirmed" ? "Goed nieuws" : "Update"}, ${sanitizeHtml(customerName)}!
              </h2>
              
              <p style="margin: 0 0 20px; color: #4a5568; font-size: 16px; line-height: 1.6;">
                Een activiteit uit uw programma ${config.message}:
              </p>
              
              <table role="presentation" style="width: 100%; border-collapse: collapse; margin: 20px 0; background-color: ${config.bgColor}; border-radius: 8px; border: 1px solid ${config.borderColor};">
                <tr>
                  <td style="padding: 20px;">
                    <div style="display: inline-block; width: 32px; height: 32px; background-color: ${config.color}; color: white; border-radius: 50%; text-align: center; line-height: 32px; font-size: 18px; margin-bottom: 12px;">${config.icon}</div>
                    
                    <p style="margin: 0 0 8px; color: #718096; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">Activiteit</p>
                    <p style="margin: 0 0 16px; color: #1a365d; font-size: 18px; font-weight: 600;">${sanitizeHtml(activityName)}</p>
                    
                    <p style="margin: 0 0 8px; color: #718096; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">Partner</p>
                    <p style="margin: 0 0 16px; color: #2d3748; font-size: 16px;">${sanitizeHtml(partnerName)}</p>
                    
                    <p style="margin: 0 0 8px; color: #718096; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">Status</p>
                    <p style="margin: 0; color: ${config.color}; font-size: 16px; font-weight: 600;">${config.title}</p>
                    
                    ${formattedPrice ? `
                    <p style="margin: 16px 0 0; padding-top: 16px; border-top: 1px solid ${config.borderColor};">
                      <span style="color: #718096; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; display: block; margin-bottom: 8px;">Bevestigde prijs</span>
                      <span style="color: ${config.color}; font-size: 24px; font-weight: 700;">${formattedPrice}</span>
                    </p>
                    ` : ""}
                    
                    ${statusNote ? `
                    <p style="margin: 16px 0 0; padding-top: 16px; border-top: 1px solid ${config.borderColor}; color: #4a5568; font-size: 14px;">
                      <strong>Toelichting van partner:</strong><br/>
                      "${sanitizeHtml(statusNote)}"
                    </p>
                    ` : ""}
                  </td>
                </tr>
              </table>
              
              <table role="presentation" style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="text-align: center; padding: 20px 0;">
                    <a href="${portalUrl}" style="display: inline-block; padding: 14px 32px; background-color: #1a365d; color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 600; border-radius: 6px;">
                      Bekijk uw programma
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="background-color: #f7fafc; padding: 30px 40px; border-top: 1px solid #e2e8f0;">
              <p style="margin: 0 0 10px; color: #718096; font-size: 14px; text-align: center;">
                Vragen? Neem contact met ons op via <a href="mailto:hallo@bureauvlieland.nl" style="color: #1a365d;">hallo@bureauvlieland.nl</a>
              </p>
              <p style="margin: 0; color: #a0aec0; font-size: 12px; text-align: center;">
                © ${new Date().getFullYear()} Bureau Vlieland. Alle rechten voorbehouden.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { partnerToken, itemId, status, statusNote, executedAt, quotedPrice, quotedNotes, proposedTime, proposedDate } = await req.json();

    if (!partnerToken || !itemId || !status) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const validStatuses = ["confirmed", "unavailable", "executed", "alternative"];
    if (!validStatuses.includes(status)) {
      return new Response(
        JSON.stringify({ error: "Invalid status" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Require price for confirmed status, require note for alternative status
    // Require proposed time for both confirmed and alternative
    if ((status === "confirmed" || status === "alternative") && !proposedTime) {
      return new Response(
        JSON.stringify({ error: "Proposed time is required when confirming or proposing alternative" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (status === "confirmed" && (quotedPrice === undefined || quotedPrice === null || quotedPrice <= 0)) {
      return new Response(
        JSON.stringify({ error: "Quoted price is required when confirming" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (status === "alternative" && (!statusNote || statusNote.trim() === "")) {
      return new Response(
        JSON.stringify({ error: "Explanation is required when proposing an alternative" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify partner token
    const { data: partner, error: partnerError } = await supabase
      .from("partners")
      .select("*")
      .eq("partner_token", partnerToken)
      .eq("is_active", true)
      .single();

    if (partnerError || !partner) {
      return new Response(
        JSON.stringify({ error: "Invalid partner token" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get current item state
    const { data: item, error: itemError } = await supabase
      .from("program_request_items")
      .select("*, program_requests!inner(customer_name, customer_email, customer_token)")
      .eq("id", itemId)
      .eq("provider_id", partner.id)
      .single();

    if (itemError || !item) {
      return new Response(
        JSON.stringify({ error: "Item not found or not assigned to this partner" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const oldStatus = item.status;

    // Update item
    const updateData: Record<string, unknown> = {
      status,
      status_note: statusNote || null,
      status_updated_at: new Date().toISOString(),
      status_updated_by: partner.name,
      version: item.version + 1,
      updated_at: new Date().toISOString(),
    };

    if (status === "confirmed" && quotedPrice !== undefined) {
      updateData.quoted_price = quotedPrice;
      updateData.quoted_at = new Date().toISOString();
      updateData.quoted_notes = quotedNotes || null;
      // Store proposed time as the confirmed time for this proposal
      updateData.proposed_time = proposedTime || null;
      updateData.proposed_date = proposedDate || null;
    }

    if (status === "alternative") {
      // Store proposed time/date and optional price for alternatives
      if (proposedTime) updateData.proposed_time = proposedTime;
      if (proposedDate) updateData.proposed_date = proposedDate;
      if (quotedPrice !== undefined && quotedPrice !== null && quotedPrice > 0) {
        updateData.quoted_price = quotedPrice;
        updateData.quoted_at = new Date().toISOString();
        updateData.quoted_notes = quotedNotes || null;
      }
    }

    if (status === "executed") {
      updateData.executed_at = new Date().toISOString();
    }

    const { error: updateError } = await supabase
      .from("program_request_items")
      .update(updateData)
      .eq("id", itemId);

    if (updateError) {
      console.error("Error updating item:", updateError);
      return new Response(
        JSON.stringify({ error: "Failed to update item" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Log to history
    const historyNotes = status === "confirmed" && quotedPrice
      ? `Partner heeft bevestigd voor €${quotedPrice.toFixed(2)}${quotedNotes ? ` - ${quotedNotes}` : ""}`
      : status === "executed"
      ? `Partner heeft gemarkeerd als uitgevoerd`
      : `Partner heeft status gewijzigd naar ${status}${statusNote ? `: ${statusNote}` : ""}`;

    await supabase.from("program_request_history").insert({
      request_id: item.request_id,
      item_id: itemId,
      action: "status_changed",
      actor: "partner",
      actor_name: partner.name,
      old_value: { status: oldStatus },
      new_value: { status, status_note: statusNote, quoted_price: quotedPrice, quoted_notes: quotedNotes },
      notes: historyNotes,
    });

    // Resolve any pending partner_reminder todos for this item
    if (status === "confirmed" || status === "unavailable" || status === "alternative") {
      await supabase
        .from("admin_todos")
        .update({
          status: "done",
          completed_at: new Date().toISOString(),
        })
        .eq("auto_type", "partner_reminder")
        .eq("auto_entity_id", itemId)
        .neq("status", "done");
      
      console.log(`Resolved partner_reminder todo for item ${itemId}`);

      // Create partner_status_update todo for admin to review
      const statusLabel = status === "confirmed" ? "bevestigd" : status === "unavailable" ? "niet beschikbaar" : "alternatief voorgesteld";
      const programRequest = item.program_requests as { customer_name: string; customer_email: string; customer_token: string };
      
      const { data: existingStatusTodo } = await supabase
        .from("admin_todos")
        .select("id")
        .eq("auto_type", "partner_status_update")
        .eq("auto_entity_id", itemId)
        .neq("status", "done")
        .maybeSingle();

      if (!existingStatusTodo) {
        await supabase.from("admin_todos").insert({
          title: `Partner ${partner.name} reageert op "${item.block_name}" — ${statusLabel}`,
          description: `Partner ${partner.name} heeft "${item.block_name}" ${statusLabel} voor ${programRequest.customer_name}.${quotedPrice ? ` Prijs: €${quotedPrice.toFixed(2)}` : ''}${statusNote ? ` Opmerking: ${statusNote}` : ''}`,
          priority: status === "unavailable" ? "high" : "normal",
          status: "todo",
          related_request_id: item.request_id,
          related_partner_id: partner.id,
          auto_type: "partner_status_update",
          auto_entity_id: itemId,
        });
        console.log(`Created partner_status_update todo for item ${itemId}`);
      }
    }

    // Check if this is a response to a counter-proposal and send customer notification
    if (oldStatus === "counter_proposed" && (status === "confirmed" || status === "alternative" || status === "unavailable")) {
      const programRequest = item.program_requests as { customer_name: string; customer_email: string; customer_token: string };
      const portalUrl = `https://bureauvlieland.nl/mijn-programma/${programRequest.customer_token}`;
      
      // Status-specific configuration
      const statusConfig: Record<string, { text: string; color: string; bgColor: string; borderColor: string; actionText: string }> = {
        confirmed: {
          text: "Bevestigd",
          color: "#38a169",
          bgColor: "#f0fff4",
          borderColor: "#9ae6b4",
          actionText: "De partner heeft uw tegenvoorstel geaccepteerd. Bekijk de details en bevestig uw akkoord in het klantenportaal.",
        },
        alternative: {
          text: "Alternatief voorgesteld",
          color: "#805ad5",
          bgColor: "#faf5ff",
          borderColor: "#d6bcfa",
          actionText: "De partner heeft een alternatief voorgesteld. Bekijk het voorstel en geef uw reactie in het klantenportaal.",
        },
        unavailable: {
          text: "Niet beschikbaar",
          color: "#e53e3e",
          bgColor: "#fff5f5",
          borderColor: "#feb2b2",
          actionText: "Helaas is de activiteit niet beschikbaar op de voorgestelde datum/tijd. Neem contact op voor alternatieven.",
        },
      };
      
      const config = statusConfig[status];
      
      // Build dynamic sections
      const proposedTimeSection = proposedTime
        ? `<p style="margin: 0 0 8px; color: #718096; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">Voorgestelde tijd</p>
           <p style="margin: 0 0 16px; color: #2d3748; font-size: 16px;">${sanitizeHtml(proposedTime)}${proposedDate ? ` op ${proposedDate}` : ""}</p>`
        : "";
      
      const priceSection = quotedPrice
        ? `<p style="margin: 0 0 8px; color: #718096; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">Prijs</p>
           <p style="margin: 0 0 16px; color: ${config.color}; font-size: 24px; font-weight: 700;">${formatCurrencyNL(quotedPrice)}</p>`
        : "";
      
      const noteSection = statusNote
        ? `<p style="margin: 16px 0 0; padding-top: 16px; border-top: 1px solid ${config.borderColor}; color: #4a5568; font-size: 14px;">
             <strong>Toelichting:</strong><br/>"${sanitizeHtml(statusNote)}"
           </p>`
        : "";
      
      const templateVariables = {
        customer_name: sanitizeHtml(programRequest.customer_name),
        partner_name: sanitizeHtml(partner.name),
        block_name: sanitizeHtml(item.block_name),
        status_text: config.text,
        status_color: config.color,
        status_bg_color: config.bgColor,
        status_border_color: config.borderColor,
        proposed_time_section: proposedTimeSection,
        price_section: priceSection,
        note_section: noteSection,
        action_text: config.actionText,
        portal_link: portalUrl,
      };
      
      const template = await getRenderedTemplate(TemplateIds.COUNTER_PROPOSAL_RESPONSE, templateVariables);
      
      // Fallback email if template not found
      const emailSubject = template?.subject || `Reactie op uw tegenvoorstel: ${item.block_name}`;
      const emailBody = template?.body || `
        <!DOCTYPE html>
        <html>
        <head><meta charset="utf-8"></head>
        <body style="font-family: 'Segoe UI', sans-serif; background-color: #f5f5f5; padding: 40px;">
          <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; overflow: hidden;">
            <div style="background-color: #1a365d; padding: 30px; text-align: center;">
              <h1 style="color: white; margin: 0;">Bureau Vlieland</h1>
            </div>
            <div style="padding: 40px;">
              <h2 style="color: #1a365d;">Beste ${sanitizeHtml(programRequest.customer_name)},</h2>
              <p>${sanitizeHtml(partner.name)} heeft gereageerd op uw tegenvoorstel voor <strong>${sanitizeHtml(item.block_name)}</strong>.</p>
              <div style="background: ${config.bgColor}; border: 1px solid ${config.borderColor}; border-radius: 8px; padding: 20px; margin: 20px 0;">
                <p style="color: ${config.color}; font-weight: bold; font-size: 18px;">${config.text}</p>
                ${proposedTimeSection}
                ${priceSection}
                ${noteSection}
              </div>
              <p>${config.actionText}</p>
              <p style="text-align: center; margin-top: 30px;">
                <a href="${portalUrl}" style="background: #1a365d; color: white; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-weight: bold;">Bekijk uw programma</a>
              </p>
            </div>
          </div>
        </body>
        </html>
      `;
      
      const counterResponseRecipient = programRequest.customer_email;
      
      const emailSent = await sendEmailViaMailjet(
        counterResponseRecipient,
        programRequest.customer_name,
        emailSubject,
        emailBody
      );
      
      if (emailSent) {
        console.log(`Counter-proposal response email sent to ${counterResponseRecipient}`);
        // Log email
        await supabase.from("email_log").insert({
          email_type: "counter_proposal_response",
          subject: emailSubject,
          recipient_email: counterResponseRecipient,
          recipient_name: programRequest.customer_name,
          related_request_id: item.request_id,
          related_item_id: itemId,
          related_partner_id: partner.id,
          status: "sent",
          sent_at: new Date().toISOString(),
          metadata: {
            old_status: oldStatus,
            new_status: status,
            quoted_price: quotedPrice,
            proposed_time: proposedTime,
          },
        });
      } else {
        console.warn(`Failed to send counter-proposal response email to ${counterResponseRecipient}`);
      }
    }

    // Check if all items are now confirmed for terms_reminder
    if (status === "confirmed") {
      const { data: allItems } = await supabase
        .from("program_request_items")
        .select("id, status, block_type")
        .eq("request_id", item.request_id);
      
      const relevantItems = (allItems || []).filter(i => i.block_type !== "self_arranged");
      const allConfirmed = relevantItems.every(i => i.status === "confirmed");
      
      if (allConfirmed) {
        const { data: request } = await supabase
          .from("program_requests")
          .select("terms_accepted_at, customer_name, customer_company")
          .eq("id", item.request_id)
          .single();
        
        if (request && !request.terms_accepted_at) {
          const { data: existingTodo } = await supabase
            .from("admin_todos")
            .select("id")
            .eq("auto_type", "terms_reminder")
            .eq("auto_entity_id", item.request_id)
            .neq("status", "done")
            .maybeSingle();
          
          if (!existingTodo) {
            const customerName = request.customer_company || request.customer_name;
            await supabase.from("admin_todos").insert({
              title: `Klant ${customerName} moet voorwaarden accepteren`,
              description: `Alle activiteiten zijn bevestigd. Wachtend op acceptatie van de algemene voorwaarden door de klant.`,
              priority: "normal",
              status: "todo",
              related_request_id: item.request_id,
              auto_type: "terms_reminder",
              auto_entity_id: item.request_id,
            });
            console.log(`Created terms_reminder todo for request ${item.request_id}`);
          }
        }
      }
    }

    // Check if ALL partners have responded (no pending items left)
    // Also check that bureau items have pricing set
    const validResponseStatuses = ["confirmed", "unavailable", "alternative"];
    if (validResponseStatuses.includes(status)) {
      const { data: allSentItems } = await supabase
        .from("program_request_items")
        .select("id, status, block_type, skip_partner_notification, admin_price_override, quoted_price")
        .eq("request_id", item.request_id);
      
      // Partner items that were sent to partners
      const sentRelevantItems = (allSentItems || []).filter(
        i => i.block_type !== "self_arranged" && 
             i.block_type !== "bureau" &&
             (i.skip_partner_notification === false || i.skip_partner_notification === null)
      );
      
      // Bureau items that need pricing
      const bureauItems = (allSentItems || []).filter(
        i => i.block_type === "bureau"
      );
      const bureauItemsNeedPricing = bureauItems.filter(
        i => i.admin_price_override === null && i.quoted_price === null
      );
      
      const allPartnersAnswered = sentRelevantItems.length > 0 && sentRelevantItems.every(i => i.status !== "pending");
      const allBureauPriced = bureauItemsNeedPricing.length === 0;
      
      if (allPartnersAnswered && allBureauPriced) {
        const { data: existingAllTodo } = await supabase
          .from("admin_todos")
          .select("id")
          .eq("auto_type", "all_partners_responded")
          .eq("auto_entity_id", item.request_id)
          .neq("status", "done")
          .maybeSingle();
        
        if (!existingAllTodo) {
          const { data: reqInfo } = await supabase
            .from("program_requests")
            .select("reference_number, customer_name, customer_company")
            .eq("id", item.request_id)
            .single();
          
          if (reqInfo) {
            const custName = reqInfo.customer_company || reqInfo.customer_name;
            const refNum = reqInfo.reference_number || "onbekend";
            await supabase.from("admin_todos").insert({
              title: `Alle partners hebben gereageerd op ${refNum} (${custName})`,
              description: `Alle verstuurde programmaonderdelen zijn beantwoord${bureauItems.length > 0 ? ' en alle bureau-items hebben een prijs' : ''}. Beoordeel de reacties en stuur een status update naar de klant.`,
              priority: "high",
              status: "todo",
              related_request_id: item.request_id,
              auto_type: "all_partners_responded",
              auto_entity_id: item.request_id,
            });
            console.log(`Created all_partners_responded todo for request ${item.request_id}`);
          }
        }
      }
    }


    const validEmailStatuses = ["confirmed", "unavailable", "alternative"];
    if (validEmailStatuses.includes(status)) {
      const programRequest = item.program_requests as { customer_name: string; customer_email: string; customer_token: string };
      const portalUrl = `https://bureauvlieland.nl/mijn-programma/${programRequest.customer_token}`;
      
      // Determine template ID based on status
      let templateId: string;
      if (status === "confirmed") {
        templateId = TemplateIds.STATUS_CONFIRMED;
      } else if (status === "alternative") {
        templateId = TemplateIds.STATUS_ALTERNATIVE;
      } else {
        templateId = TemplateIds.STATUS_UNAVAILABLE;
      }

      const templateVariables = {
        customer_name: sanitizeHtml(programRequest.customer_name),
        activity_name: sanitizeHtml(item.block_name),
        partner_name: sanitizeHtml(partner.name),
        quoted_price: quotedPrice ? formatCurrencyNL(quotedPrice) : "",
        status_note: sanitizeHtml(statusNote || quotedNotes || ""),
        proposed_time: sanitizeHtml(proposedTime || ""),
        proposed_date: proposedDate || "",
        portal_link: portalUrl,
      };

      const template = await getRenderedTemplate(templateId, templateVariables);
      
      const emailHtml = template?.body || generateFallbackStatusEmailHtml(
        programRequest.customer_name,
        item.block_name,
        partner.name,
        status === "alternative" ? "confirmed" : status as "confirmed" | "unavailable", // Fallback treats alternative similar to confirmed
        quotedPrice || null,
        statusNote || quotedNotes || null,
        programRequest.customer_token
      );

      const subjectMap: Record<string, string> = {
        confirmed: `Activiteit bevestigd: ${item.block_name} - Uw akkoord gevraagd`,
        unavailable: `Activiteit niet beschikbaar: ${item.block_name}`,
        alternative: `Alternatief voorstel voor: ${item.block_name} - Uw reactie gevraagd`,
      };

      const emailSubject = template?.subject || subjectMap[status];

      const emailSent = await sendEmailViaMailjet(
        programRequest.customer_email,
        programRequest.customer_name,
        emailSubject,
        emailHtml
      );

      if (!emailSent) {
        console.warn(`Failed to send ${status} email to customer, but status update succeeded`);
      } else {
        console.log(`Status email (${status}) sent to ${programRequest.customer_email}`);
      }
    }

    return new Response(
      JSON.stringify({ success: true, quotedPrice }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in update-partner-item-status:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
