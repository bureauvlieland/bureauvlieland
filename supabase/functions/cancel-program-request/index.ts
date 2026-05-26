import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { 
  getRenderedTemplate, 
  sanitizeHtml, 
  formatDateNL, 
  isTestMode, 
  getSubjectPrefix, 
  getRecipientEmail,
  buildReplyTo,
  getPortalBaseUrl,
  TemplateIds 
} from "../_shared/email-templates.ts";
import { logEmail } from "../_shared/email-logger.ts";

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

    // GEEN automatische partner-mails meer bij annulering door klant.
    // Bureau informeert partners handmatig vanuit het admin-paneel.
    const customerLabel = program.customer_company || program.customer_name || "";
    const allPartnerNames = [
      ...Array.from(providers.values()).map((p) => p.name),
      ...Array.from(accommodationPartners.values()).map((p) => p.name),
    ];

    if (providers.size > 0 || accommodationPartners.size > 0) {
      try {
        await supabase.from("admin_todos").insert({
          title: `Klant heeft project geannuleerd — informeer ${providers.size + accommodationPartners.size} partner(s) handmatig`,
          description: `${sanitizeHtml(customerLabel)} (${program.reference_number || program.id}) heeft de aanvraag voor ${dates} geannuleerd${reason ? ` met als reden: "${sanitizeHtml(reason)}"` : ""}. Betrokken partners: ${allPartnerNames.join(", ") || "—"}. Informeer hen handmatig vanuit het project.`,
          priority: "high",
          status: "todo",
          related_request_id: program.id,
          auto_type: "customer_cancellation",
          auto_entity_id: program.id,
        });

        emails.push({
          From: { Email: "hallo@bureauvlieland.nl", Name: "Bureau Vlieland" },
          To: [{ Email: "hallo@bureauvlieland.nl", Name: "Bureau Vlieland" }],
          Subject: `${subjectPrefix}Klant annuleerde project — ${program.reference_number || customerLabel}`,
          HTMLPart: `
            <div style="font-family: Arial, sans-serif; max-width: 600px;">
              <h2>Project geannuleerd door klant</h2>
              <p><strong>${sanitizeHtml(customerLabel)}</strong> (${program.reference_number || program.id})</p>
              <p>Datums: ${dates}</p>
              ${reason ? `<p>Reden: ${sanitizeHtml(reason)}</p>` : ""}
              <p>Betrokken partners (${providers.size + accommodationPartners.size}): ${allPartnerNames.map((n) => sanitizeHtml(n)).join(", ") || "—"}</p>
              <p><em>Informeer partners handmatig vanuit het project-detail in admin.</em></p>
            </div>
          `,
        });
        pendingLogs.push({
          messageIdx: emails.length - 1,
          logPayload: {
            email_type: "internal_customer_cancellation",
            subject: `${subjectPrefix}Klant annuleerde project — ${program.reference_number || customerLabel}`,
            recipient_email: "hallo@bureauvlieland.nl",
            recipient_name: "Bureau Vlieland",
            related_request_id: program.id,
            sent_by: "cancel-program-request",
            metadata: {
              template_name: "internal_customer_cancellation",
              actor: "klant → bureau (interne notificatie annulering)",
              affected_partner_count: providers.size + accommodationPartners.size,
              partner_names: allPartnerNames,
              cancellation_reason: reason || null,
            },
          },
        });
      } catch (todoErr) {
        console.error("Failed to create admin todo for cancellation:", todoErr);
      }
    }


    // Customer confirmation email
    const customerTemplate = await getRenderedTemplate(TemplateIds.CANCELLATION_CUSTOMER, {
      customer_name: sanitizeHtml(program.customer_name),
      dates: dates,
      cancellation_reason: reason ? sanitizeHtml(reason) : "",
      providers_count: String(providers.size + accommodationPartners.size),
      programma_url: `${getPortalBaseUrl(origin)}/programma-samenstellen`,
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
          <p>Bureau Vlieland neemt contact op met de betrokken aanbieder(s) over deze annulering.</p>
          <p style="color: #718096; font-size: 14px;">Met vriendelijke groet,<br>Erwin & Team Bureau Vlieland</p>
        </div>
      `,
    });
    pendingLogs.push({
      messageIdx: emails.length - 1,
      logPayload: {
        email_type: "cancellation_customer",
        subject: `${subjectPrefix}${customerTemplate?.subject || "Bevestiging: Uw aanvraag is geannuleerd"}`,
        recipient_email: program.customer_email,
        recipient_name: program.customer_name,
        related_request_id: program.id,
        sent_by: "customer",
        metadata: {
          template_name: TemplateIds.CANCELLATION_CUSTOMER,
          actor: "system → klant (annuleringsbevestiging)",
          providers_count: providers.size + accommodationPartners.size,
          cancellation_reason: reason || null,
        },
      },
    });

    // Send emails + log
    let mailjetResp: any = null;
    let sendError: string | null = null;
    try {
      if (emails.length > 0) {
        mailjetResp = await sendEmailViaMailjet(emails);
      }
    } catch (emailError) {
      console.error("Failed to send cancellation emails:", emailError);
      sendError = emailError instanceof Error ? emailError.message : "Unknown";
    }

    if (pendingLogs.length > 0) {
      for (const { logPayload, messageIdx } of pendingLogs) {
        const messageId = mailjetResp?.Messages?.[messageIdx]?.To?.[0]?.MessageID?.toString();
        const ok = !sendError && !!mailjetResp;
        try {
          await logEmail({
            ...logPayload,
            status: ok ? "sent" : "failed",
            error_message: ok ? undefined : sendError ?? undefined,
            mailjet_message_id: messageId,
          });
        } catch (logErr) {
          console.error("Error writing email_log entry:", logErr);
        }
      }
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
