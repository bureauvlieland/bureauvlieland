import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { 
  getRenderedTemplate, 
  sanitizeHtml, 
  formatDateNL, 
  isTestMode, 
  getSubjectPrefix, 
  getRecipientEmail,
  buildReplyTo,
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
  cancelAccommodation?: boolean;
  origin?: string;
}

async function enrichProviderEmails(
  supabase: any,
  items: any[]
): Promise<void> {
  const missingEmailIds = [
    ...new Set(
      items
        .filter(i => !i.provider_email && i.provider_id && i.block_type !== "self_arranged")
        .map(i => i.provider_id)
    ),
  ];
  if (missingEmailIds.length === 0) return;

  const { data: partners } = await supabase
    .from("partners")
    .select("id, email, contact_email, name")
    .in("id", missingEmailIds);

  const partnerMap = new Map((partners || []).map((p: any) => [p.id, p]));

  for (const item of items) {
    if (!item.provider_email && item.provider_id) {
      const partner = partnerMap.get(item.provider_id);
      if (partner) {
        item.provider_email = partner.contact_email || partner.email;
        if (!item.provider_name) item.provider_name = partner.name;
      }
    }
  }
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
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { token, reason, cancelAccommodation: shouldCancelAccommodation = true, origin }: CancelRequest = await req.json();
    
    const testMode = isTestMode(origin);
    const subjectPrefix = getSubjectPrefix(origin);

    if (!token) {
      return new Response(
        JSON.stringify({ error: "Token is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

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

    await enrichProviderEmails(supabase, items || []);

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

    // Resolve ALL auto-todos for this request
    await supabase
      .from("admin_todos")
      .update({ status: "done", completed_at: new Date().toISOString() })
      .eq("related_request_id", program.id)
      .neq("status", "done");

    // Cancel all items
    await supabase
      .from("program_request_items")
      .update({
        status: "cancelled",
        updated_at: new Date().toISOString(),
      })
      .eq("request_id", program.id);

    // Cancel linked accommodation request and its quotes
    const accommodationPartners = new Map<string, { name: string; email: string; accommodationName: string }>();

    const cancelAccommodationRequest = async (accommodationId: string) => {
      await supabase
        .from("accommodation_requests")
        .update({ status: "cancelled", updated_at: new Date().toISOString() })
        .eq("id", accommodationId);

      const { data: quotesToCancel } = await supabase
        .from("accommodation_quotes")
        .select("id, partner_id, accommodation_name, partner:partners(id, name, email, contact_email)")
        .eq("request_id", accommodationId)
        .in("status", ["pending", "submitted"]);

      if (quotesToCancel) {
        for (const q of quotesToCancel) {
          const partner = q.partner as { id: string; name: string; email: string; contact_email: string | null } | null;
          if (partner?.email && !accommodationPartners.has(partner.id)) {
            accommodationPartners.set(partner.id, {
              name: partner.name,
              email: partner.contact_email || partner.email,
              accommodationName: q.accommodation_name,
            });
          }
        }
      }

      await supabase
        .from("accommodation_quotes")
        .update({ status: "rejected", updated_at: new Date().toISOString() })
        .eq("request_id", accommodationId)
        .in("status", ["pending", "submitted"]);
    };

    if (shouldCancelAccommodation) {
      const cancelledAccommodationIds = new Set<string>();

      if (program.linked_accommodation_id) {
        await cancelAccommodationRequest(program.linked_accommodation_id);
        cancelledAccommodationIds.add(program.linked_accommodation_id);
      }

      const { data: linkedAccommodations } = await supabase
        .from("accommodation_requests")
        .select("id")
        .eq("linked_program_id", program.id)
        .neq("status", "cancelled");

      if (linkedAccommodations) {
        for (const acc of linkedAccommodations) {
          if (!cancelledAccommodationIds.has(acc.id)) {
            await cancelAccommodationRequest(acc.id);
            cancelledAccommodationIds.add(acc.id);
          }
        }
      }

      const programDates = program.selected_dates as string[];
      if (programDates && programDates.length >= 2) {
        const earliestDate = programDates[0];
        const latestDate = programDates[programDates.length - 1];

        const { data: unlinkedAccommodations } = await supabase
          .from("accommodation_requests")
          .select("id")
          .eq("customer_email", program.customer_email)
          .neq("status", "cancelled")
          .lte("arrival_date", latestDate)
          .gte("departure_date", earliestDate);

        if (unlinkedAccommodations) {
          for (const acc of unlinkedAccommodations) {
            if (!cancelledAccommodationIds.has(acc.id)) {
              await cancelAccommodationRequest(acc.id);
              cancelledAccommodationIds.add(acc.id);
            }
          }
        }
      }
    }

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
    const replyTo = buildReplyTo(program.reference_number);
    const emails: any[] = [];
    const pendingLogs: Array<{ messageIdx: number; logPayload: any }> = [];

    // Partner cancellation emails
    const customerLabel = program.customer_company || program.customer_name || "";
    for (const [providerId, provider] of providers) {
      const templateVariables = {
        partner_name: sanitizeHtml(provider.name),
        customer_name: sanitizeHtml(customerLabel),
        company_name: sanitizeHtml(program.customer_company || ""),
        reference_number: program.reference_number || "",
        event_dates: dates,
        dates: dates,
        cancellation_reason: reason ? sanitizeHtml(reason) : "",
        cancelled_items: provider.items
          .map((item) => `<p style="margin: 5px 0;">• ${sanitizeHtml(item)}</p>`)
          .join(""),
        activities_list: provider.items.map((item) => `<li>${sanitizeHtml(item)}</li>`).join(""),
        activity_name: sanitizeHtml(provider.items[0] || "aanvraag"),
      };

      const partnerTemplate = await getRenderedTemplate(TemplateIds.CANCELLATION_PARTNER, templateVariables);
      
      const htmlContent = partnerTemplate?.body || `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #1a365d;">Aanvraag geannuleerd</h2>
          <p>Beste ${sanitizeHtml(provider.name)},</p>
          <p>De aanvraag <strong>${program.reference_number || ""}</strong> voor <strong>${dates}</strong> is geannuleerd.</p>
          <div style="background: #f7fafc; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p><strong>Referentie:</strong> ${program.reference_number || "-"}</p>
            <p><strong>Activiteit(en):</strong></p>
            <ul>${provider.items.map((item) => `<li>${sanitizeHtml(item)}</li>`).join("")}</ul>
            ${reason ? `<p><strong>Reden:</strong> ${sanitizeHtml(reason)}</p>` : ""}
          </div>
          <p>Je hoeft verder geen actie te ondernemen.</p>
          <p style="color: #718096; font-size: 14px;">Met vriendelijke groet,<br>Bureau Vlieland</p>
        </div>
      `;

      emails.push({
        From: { Email: "hallo@bureauvlieland.nl", Name: "Bureau Vlieland" },
        To: [{ Email: getRecipientEmail(provider.email, origin), Name: provider.name }],
        ...(replyTo ? { ReplyTo: replyTo } : {}),
        Subject: `${subjectPrefix}${partnerTemplate?.subject || `Aanvraag geannuleerd — ${program.reference_number || ""}`}`,
        HTMLPart: htmlContent,
      });
    }

    // Accommodation partner cancellation emails
    for (const [partnerId, accPartner] of accommodationPartners) {
      if (providers.has(partnerId)) continue;

      const accTemplate = await getRenderedTemplate(TemplateIds.CANCELLATION_ACCOMMODATION_PARTNER, {
        partner_name: sanitizeHtml(accPartner.name),
        customer_name: "Bureau Vlieland",
        customer_company: "",
        reference_number: program.reference_number || "",
        accommodation_name: sanitizeHtml(accPartner.accommodationName),
        dates: dates,
        cancellation_reason: reason ? sanitizeHtml(reason) : "",
      });

      emails.push({
        From: { Email: "hallo@bureauvlieland.nl", Name: "Bureau Vlieland" },
        To: [{ Email: getRecipientEmail(accPartner.email, origin), Name: accPartner.name }],
        ...(replyTo ? { ReplyTo: replyTo } : {}),
        Subject: `${subjectPrefix}${accTemplate?.subject || `Logiesaanvraag geannuleerd — ${program.reference_number || ""}`}`,
        HTMLPart: accTemplate?.body || `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #1a365d;">Logiesaanvraag geannuleerd</h2>
            <p>Beste ${sanitizeHtml(accPartner.name)},</p>
            <p>De klant heeft de aanvraag voor <strong>${dates}</strong> geannuleerd.</p>
            <p>Je hoeft verder geen actie te ondernemen.</p>
            <p style="color: #718096; font-size: 14px;">Met vriendelijke groet,<br>Bureau Vlieland</p>
          </div>
        `,
      });
    }

    // Customer confirmation email
    const customerTemplate = await getRenderedTemplate(TemplateIds.CANCELLATION_CUSTOMER, {
      customer_name: sanitizeHtml(program.customer_name),
      dates: dates,
      cancellation_reason: reason ? sanitizeHtml(reason) : "",
      providers_count: String(providers.size + accommodationPartners.size),
    });

    emails.push({
      From: { Email: "hallo@bureauvlieland.nl", Name: "Bureau Vlieland" },
      To: [{ Email: program.customer_email, Name: program.customer_name }],
      ...(replyTo ? { ReplyTo: replyTo } : {}),
      Subject: `${subjectPrefix}${customerTemplate?.subject || "Bevestiging: Uw aanvraag is geannuleerd"}`,
      HTMLPart: customerTemplate?.body || `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #1a365d;">Aanvraag geannuleerd</h2>
          <p>Beste ${sanitizeHtml(program.customer_name)},</p>
          <p>Uw aanvraag voor <strong>${dates}</strong> is succesvol geannuleerd.</p>
          ${reason ? `<div style="background: #f7fafc; padding: 15px; border-radius: 8px; margin: 20px 0;"><p><strong>Reden:</strong> ${sanitizeHtml(reason)}</p></div>` : ""}
          <p>Alle betrokken aanbieder(s) zijn op de hoogte gesteld.</p>
          <p style="color: #718096; font-size: 14px;">Met vriendelijke groet,<br>Erwin & Team Bureau Vlieland</p>
        </div>
      `,
    });

    // Send emails
    try {
      if (emails.length > 0) {
        await sendEmailViaMailjet(emails);
      }
    } catch (emailError) {
      console.error("Failed to send cancellation emails:", emailError);
    }

    return new Response(
      JSON.stringify({ success: true, providersNotified: providers.size, accommodationPartnersNotified: accommodationPartners.size }),
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
