import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
              Email: "noreply@bureauvlieland.nl",
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

const generateStatusEmailHtml = (
  customerName: string,
  activityName: string,
  partnerName: string,
  status: "confirmed" | "unavailable" | "alternative",
  quotedPrice: number | null,
  statusNote: string | null,
  customerToken: string
) => {
  const portalUrl = `https://bureauvlieland.lovable.app/programma/${customerToken}`;
  
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
    alternative: {
      title: "Alternatief voorgesteld",
      color: "#dd6b20",
      bgColor: "#fffaf0",
      borderColor: "#fbd38d",
      icon: "↻",
      message: "heeft een alternatief voorstel ontvangen",
    },
  };

  const config = statusConfig[status];
  const formattedPrice = quotedPrice
    ? new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" }).format(quotedPrice)
    : null;

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
          <!-- Header -->
          <tr>
            <td style="background-color: #1a365d; padding: 30px 40px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 600;">Bureau Vlieland</h1>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <h2 style="margin: 0 0 20px; color: #1a365d; font-size: 20px;">
                ${status === "confirmed" ? "Goed nieuws" : "Update"}, ${customerName}!
              </h2>
              
              <p style="margin: 0 0 20px; color: #4a5568; font-size: 16px; line-height: 1.6;">
                Een activiteit uit uw programma ${config.message}:
              </p>
              
              <!-- Activity Card -->
              <table role="presentation" style="width: 100%; border-collapse: collapse; margin: 20px 0; background-color: ${config.bgColor}; border-radius: 8px; border: 1px solid ${config.borderColor};">
                <tr>
                  <td style="padding: 20px;">
                    <div style="display: inline-block; width: 32px; height: 32px; background-color: ${config.color}; color: white; border-radius: 50%; text-align: center; line-height: 32px; font-size: 18px; margin-bottom: 12px;">${config.icon}</div>
                    
                    <p style="margin: 0 0 8px; color: #718096; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">Activiteit</p>
                    <p style="margin: 0 0 16px; color: #1a365d; font-size: 18px; font-weight: 600;">${activityName}</p>
                    
                    <p style="margin: 0 0 8px; color: #718096; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">Partner</p>
                    <p style="margin: 0 0 16px; color: #2d3748; font-size: 16px;">${partnerName}</p>
                    
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
                      "${statusNote}"
                    </p>
                    ` : ""}
                  </td>
                </tr>
              </table>
              
              ${status === "unavailable" ? `
              <p style="margin: 20px 0; color: #4a5568; font-size: 16px; line-height: 1.6;">
                Wij helpen u graag met het vinden van een geschikt alternatief. Neem contact op of bekijk uw programma in de portal.
              </p>
              ` : status === "alternative" ? `
              <p style="margin: 20px 0; color: #4a5568; font-size: 16px; line-height: 1.6;">
                Bekijk het voorgestelde alternatief in uw persoonlijke portal en laat ons weten of dit bij uw wensen past.
              </p>
              ` : `
              <p style="margin: 20px 0; color: #4a5568; font-size: 16px; line-height: 1.6;">
                Bekijk alle details en de voortgang van uw programma in uw persoonlijke portal:
              </p>
              `}
              
              <!-- CTA Button -->
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
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f7fafc; padding: 30px 40px; border-top: 1px solid #e2e8f0;">
              <p style="margin: 0 0 10px; color: #718096; font-size: 14px; text-align: center;">
                Vragen? Neem contact met ons op via <a href="mailto:info@bureauvlieland.nl" style="color: #1a365d;">info@bureauvlieland.nl</a>
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

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { partnerToken, itemId, status, statusNote, executedAt, quotedPrice, quotedNotes } = await req.json();

    if (!partnerToken || !itemId || !status) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const validStatuses = ["confirmed", "unavailable", "alternative"];
    if (!validStatuses.includes(status)) {
      return new Response(
        JSON.stringify({ error: "Invalid status" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate quoted price is required for confirmed status
    if (status === "confirmed" && (quotedPrice === undefined || quotedPrice === null || quotedPrice <= 0)) {
      return new Response(
        JSON.stringify({ error: "Quoted price is required when confirming" }),
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

    // If marking as confirmed with a quoted price
    if (status === "confirmed" && quotedPrice !== undefined) {
      updateData.quoted_price = quotedPrice;
      updateData.quoted_at = new Date().toISOString();
      updateData.quoted_notes = quotedNotes || null;
    }

    // If marking as executed
    if (executedAt) {
      updateData.executed_at = executedAt;
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

    // Send notification email to customer for all status changes
    const validEmailStatuses = ["confirmed", "unavailable", "alternative"];
    if (validEmailStatuses.includes(status)) {
      const programRequest = item.program_requests as { customer_name: string; customer_email: string; customer_token: string };
      
      const subjectMap: Record<string, string> = {
        confirmed: `Activiteit bevestigd: ${item.block_name}`,
        unavailable: `Activiteit niet beschikbaar: ${item.block_name}`,
        alternative: `Alternatief voorgesteld: ${item.block_name}`,
      };
      
      const emailHtml = generateStatusEmailHtml(
        programRequest.customer_name,
        item.block_name,
        partner.name,
        status as "confirmed" | "unavailable" | "alternative",
        quotedPrice || null,
        statusNote || quotedNotes || null,
        programRequest.customer_token
      );

      const emailSent = await sendEmailViaMailjet(
        programRequest.customer_email,
        programRequest.customer_name,
        subjectMap[status],
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
