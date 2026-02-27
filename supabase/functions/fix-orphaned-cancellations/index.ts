import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  getRenderedTemplate,
  sanitizeHtml,
  formatDateNL,
  getSubjectPrefix,
  getRecipientEmail,
  TemplateIds,
  SENDER_EMAIL,
  SENDER_NAME,
} from "../_shared/email-templates.ts";
import { logEmail, EmailTypes } from "../_shared/email-logger.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const origin = req.headers.get("origin") || undefined;
    const subjectPrefix = getSubjectPrefix(origin);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const MAILJET_API_KEY = Deno.env.get("MAILJET_API_KEY");
    const MAILJET_SECRET_KEY = Deno.env.get("MAILJET_SECRET_KEY");

    // 1. Find all orphaned items: program is cancelled, but item is not
    const { data: orphanedItems, error: queryError } = await supabase
      .from("program_request_items")
      .select("*, program_requests!inner(id, customer_name, customer_company, customer_email, selected_dates, status, reference_number)")
      .eq("program_requests.status", "cancelled")
      .neq("status", "cancelled");

    if (queryError) throw queryError;

    if (!orphanedItems || orphanedItems.length === 0) {
      return new Response(
        JSON.stringify({ message: "No orphaned items found", updated: 0, emailed: 0 }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Found ${orphanedItems.length} orphaned items`);

    // 2. Enrich provider emails
    const missingEmailIds = [
      ...new Set(
        orphanedItems
          .filter((i: any) => !i.provider_email && i.provider_id && i.block_type !== "self_arranged")
          .map((i: any) => i.provider_id)
      ),
    ];

    let partnerMap = new Map<string, { email: string; name: string }>();
    if (missingEmailIds.length > 0) {
      const { data: partners } = await supabase
        .from("partners")
        .select("id, email, name")
        .in("id", missingEmailIds);
      partnerMap = new Map((partners || []).map((p: any) => [p.id, p]));
    }

    for (const item of orphanedItems) {
      if (!item.provider_email && item.provider_id) {
        const partner = partnerMap.get(item.provider_id);
        if (partner) {
          item.provider_email = partner.email;
          item.provider_name = partner.name;
        }
      }
    }

    // 3. Group by project → partner
    // Structure: Map<requestId, { program, partners: Map<partnerId, { name, email, items[] }> }>
    const projectMap = new Map<string, {
      program: any;
      partners: Map<string, { name: string; email: string; items: string[] }>;
    }>();

    for (const item of orphanedItems) {
      const prog = item.program_requests;
      if (!projectMap.has(prog.id)) {
        projectMap.set(prog.id, { program: prog, partners: new Map() });
      }
      // Only email non-bureau, non-self_arranged partners
      if (item.provider_email && item.block_type !== "self_arranged" && item.block_type !== "bureau") {
        const entry = projectMap.get(prog.id)!;
        if (!entry.partners.has(item.provider_id)) {
          entry.partners.set(item.provider_id, {
            name: item.provider_name,
            email: item.provider_email,
            items: [],
          });
        }
        entry.partners.get(item.provider_id)!.items.push(item.block_name);
      }
    }

    // 4. Update all orphaned items to cancelled
    const itemIds = orphanedItems.map((i: any) => i.id);
    const { error: updateError } = await supabase
      .from("program_request_items")
      .update({ status: "cancelled", updated_at: new Date().toISOString() })
      .in("id", itemIds);

    if (updateError) throw updateError;

    console.log(`Updated ${itemIds.length} items to cancelled`);

    // 5. Send cancellation emails per partner per project
    let emailsSent = 0;
    const emailMessages: any[] = [];

    for (const [requestId, { program, partners }] of projectMap) {
      const dates = (program.selected_dates as string[])
        .map((d: string) => formatDateNL(d))
        .join(", ");

      for (const [partnerId, partner] of partners) {
        const templateVariables = {
          partner_name: sanitizeHtml(partner.name),
          customer_name: sanitizeHtml(program.customer_name),
          company_name: sanitizeHtml(program.customer_company) || "",
          dates,
          cancellation_reason: "Programma was eerder geannuleerd; dit is een correctiemelding.",
          activities_list: partner.items.map((item) => `<li>${sanitizeHtml(item)}</li>`).join(""),
        };

        const tmpl = await getRenderedTemplate(TemplateIds.CANCELLATION_PARTNER, templateVariables);

        const fallbackHtml = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #1a365d;">Aanvraag geannuleerd</h2>
            <p>Beste ${sanitizeHtml(partner.name)},</p>
            <p>De aanvraag <strong>${program.reference_number || ""}</strong> voor <strong>${dates}</strong> is geannuleerd.</p>
            <div style="background: #f7fafc; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <p><strong>Klant:</strong> ${sanitizeHtml(program.customer_name)}</p>
              <p><strong>Jouw activiteit(en):</strong></p>
              <ul>${partner.items.map((i) => `<li>${sanitizeHtml(i)}</li>`).join("")}</ul>
            </div>
            <p>Je hoeft verder geen actie te ondernemen.</p>
            <p style="color: #718096; font-size: 14px;">Met vriendelijke groet,<br>Bureau Vlieland</p>
          </div>
        `;

        const subject = tmpl?.subject || `${subjectPrefix}Aanvraag geannuleerd - ${sanitizeHtml(program.customer_company || program.customer_name)}`;
        const recipientEmail = getRecipientEmail(partner.email, origin);

        emailMessages.push({
          From: { Email: SENDER_EMAIL, Name: SENDER_NAME },
          To: [{ Email: recipientEmail, Name: partner.name }],
          Subject: subject,
          HTMLPart: tmpl?.body || fallbackHtml,
        });

        await logEmail({
          email_type: EmailTypes.CANCELLATION_PARTNER,
          subject,
          recipient_email: recipientEmail,
          recipient_name: partner.name,
          related_request_id: requestId,
          related_partner_id: partnerId,
          status: "sent",
          sent_by: "fix-orphaned-cancellations",
          metadata: { items: partner.items, retroactive_fix: true },
        });

        emailsSent++;
      }
    }

    // Send all emails in one batch
    if (emailMessages.length > 0 && MAILJET_API_KEY && MAILJET_SECRET_KEY) {
      const response = await fetch("https://api.mailjet.com/v3.1/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Basic ${btoa(`${MAILJET_API_KEY}:${MAILJET_SECRET_KEY}`)}`,
        },
        body: JSON.stringify({ Messages: emailMessages }),
      });
      const result = await response.json();
      console.log("Mailjet response:", JSON.stringify(result));
    }

    const summary = {
      itemsUpdated: itemIds.length,
      partnersEmailed: emailsSent,
      projects: [...projectMap.entries()].map(([id, { program, partners }]) => ({
        reference: program.reference_number,
        itemCount: orphanedItems.filter((i: any) => i.program_requests.id === id).length,
        partnersNotified: [...partners.keys()],
      })),
    };

    console.log("Fix complete:", JSON.stringify(summary));

    return new Response(
      JSON.stringify({ success: true, ...summary }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error fixing orphaned cancellations:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error", details: String(error) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
