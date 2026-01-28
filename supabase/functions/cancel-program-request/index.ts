// Using Deno.serve() instead of deprecated import
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { 
  getRenderedTemplate, 
  sanitizeHtml, 
  formatDateNL, 
  isTestMode, 
  getSubjectPrefix, 
  getRecipientEmail,
  TemplateIds 
} from "../_shared/email-templates.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MAILJET_API_KEY = Deno.env.get("MAILJET_API_KEY");
const MAILJET_SECRET_KEY = Deno.env.get("MAILJET_SECRET_KEY");

interface CancelRequest {
  token: string;
  reason?: string;
  origin?: string;
}

const sendEmailViaMailjet = async (messages: any[]) => {
  const response = await fetch("https://api.mailjet.com/v3.1/send", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${btoa(`${MAILJET_API_KEY}:${MAILJET_SECRET_KEY}`)}`,
    },
    body: JSON.stringify({ Messages: messages }),
  });
  return response.json();
};

Deno.serve(async (req) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { token, reason, origin }: CancelRequest = await req.json();
    
    const testMode = isTestMode(origin);
    const subjectPrefix = getSubjectPrefix(origin);
    
    if (testMode) {
      console.log(`[TEST MODE] All partner emails will be redirected to test email`);
    }

    if (!token) {
      return new Response(
        JSON.stringify({ error: "Token is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch the program request
    const { data: program, error: programError } = await supabase
      .from("program_requests")
      .select("*")
      .eq("customer_token", token)
      .gt("expires_at", new Date().toISOString())
      .single();

    if (programError || !program) {
      return new Response(
        JSON.stringify({ error: "Program not found or expired" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (program.status === "cancelled") {
      return new Response(
        JSON.stringify({ error: "Program is already cancelled" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch items to get provider info
    const { data: items } = await supabase
      .from("program_request_items")
      .select("*")
      .eq("request_id", program.id)
      .neq("status", "cancelled");

    // Get unique providers with emails
    const providers = new Map<string, { name: string; email: string; items: string[] }>();
    (items || []).forEach((item) => {
      if (item.provider_email && item.block_type !== "self_arranged") {
        if (!providers.has(item.provider_id)) {
          providers.set(item.provider_id, {
            name: item.provider_name,
            email: item.provider_email,
            items: [],
          });
        }
        providers.get(item.provider_id)!.items.push(item.block_name);
      }
    });

    // Update the program status
    const { error: updateError } = await supabase
      .from("program_requests")
      .update({
        status: "cancelled",
        cancelled_at: new Date().toISOString(),
        cancellation_reason: reason || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", program.id);

    if (updateError) throw updateError;

    // Cancel all items
    await supabase
      .from("program_request_items")
      .update({
        status: "cancelled",
        updated_at: new Date().toISOString(),
      })
      .eq("request_id", program.id);

    // Log to history
    await supabase.from("program_request_history").insert({
      request_id: program.id,
      action: "cancelled",
      actor: "customer",
      actor_name: program.customer_name,
      notes: reason || "Hele aanvraag geannuleerd",
      new_value: { status: "cancelled", reason },
    });

    // Format dates
    const dates = (program.selected_dates as string[])
      .map((d: string) => formatDateNL(d))
      .join(", ");

    // Build emails
    const emails: any[] = [];

    // Partner emails using template
    for (const [, provider] of providers) {
      const templateVariables = {
        partner_name: sanitizeHtml(provider.name),
        customer_name: sanitizeHtml(program.customer_name),
        company_name: sanitizeHtml(program.customer_company) || "",
        dates: dates,
        cancellation_reason: reason ? sanitizeHtml(reason) : "",
        activities_list: provider.items.map((item) => `<li>${sanitizeHtml(item)}</li>`).join(""),
      };

      const partnerTemplate = await getRenderedTemplate(TemplateIds.CANCELLATION_PARTNER, templateVariables);
      
      const htmlContent = partnerTemplate?.body || `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #1a365d;">Aanvraag geannuleerd</h2>
          
          <p>Beste ${sanitizeHtml(provider.name)},</p>
          
          <p>De klant heeft de aanvraag voor <strong>${dates}</strong> geannuleerd.</p>
          
          <div style="background: #f7fafc; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0 0 10px 0;"><strong>Klant:</strong> ${sanitizeHtml(program.customer_name)}</p>
            ${program.customer_company ? `<p style="margin: 0 0 10px 0;"><strong>Bedrijf:</strong> ${sanitizeHtml(program.customer_company)}</p>` : ""}
            <p style="margin: 0 0 10px 0;"><strong>Jouw activiteit(en):</strong></p>
            <ul style="margin: 0; padding-left: 20px;">
              ${provider.items.map((item) => `<li>${sanitizeHtml(item)}</li>`).join("")}
            </ul>
            ${reason ? `<p style="margin: 15px 0 0 0;"><strong>Reden:</strong> ${sanitizeHtml(reason)}</p>` : ""}
          </div>
          
          <p>Je hoeft verder geen actie te ondernemen.</p>
          
          <p style="color: #718096; font-size: 14px; margin-top: 30px;">
            Met vriendelijke groet,<br>
            Bureau Vlieland
          </p>
        </div>
      `;

      emails.push({
        From: { Email: "noreply@bureauvlieland.nl", Name: "Bureau Vlieland" },
        To: [{ Email: getRecipientEmail(provider.email, origin), Name: provider.name }],
        Subject: partnerTemplate?.subject || `${subjectPrefix}Aanvraag geannuleerd - ${sanitizeHtml(program.customer_company || program.customer_name)}`,
        HTMLPart: htmlContent,
      });
    }

    // Customer confirmation email using template
    const customerTemplateVariables = {
      customer_name: sanitizeHtml(program.customer_name),
      dates: dates,
      cancellation_reason: reason ? sanitizeHtml(reason) : "",
      providers_count: String(providers.size),
    };

    const customerTemplate = await getRenderedTemplate(TemplateIds.CANCELLATION_CUSTOMER, customerTemplateVariables);

    const customerHtml = customerTemplate?.body || `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1a365d;">Aanvraag geannuleerd</h2>
        
        <p>Beste ${sanitizeHtml(program.customer_name)},</p>
        
        <p>Je aanvraag voor <strong>${dates}</strong> is succesvol geannuleerd.</p>
        
        ${reason ? `
        <div style="background: #f7fafc; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 0;"><strong>Reden:</strong> ${sanitizeHtml(reason)}</p>
        </div>
        ` : ""}
        
        <p>Alle ${providers.size} betrokken aanbieder(s) zijn automatisch op de hoogte gesteld.</p>
        
        <p>Wil je toch een programma samenstellen? Je kunt altijd een nieuwe aanvraag indienen via onze website.</p>
        
        <p style="color: #718096; font-size: 14px; margin-top: 30px;">
          Met vriendelijke groet,<br>
          Erwin & Team Bureau Vlieland
        </p>
      </div>
    `;

    emails.push({
      From: { Email: "noreply@bureauvlieland.nl", Name: "Bureau Vlieland" },
      To: [{ Email: program.customer_email, Name: program.customer_name }],
      Subject: customerTemplate?.subject || `${subjectPrefix}Bevestiging: Jouw aanvraag is geannuleerd`,
      HTMLPart: customerHtml,
    });

    // Send emails (don't fail the request if emails fail)
    try {
      if (emails.length > 0) {
        await sendEmailViaMailjet(emails);
      }
    } catch (emailError) {
      console.error("Failed to send cancellation emails:", emailError);
    }

    return new Response(
      JSON.stringify({ success: true, providersNotified: providers.size }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error cancelling program:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
