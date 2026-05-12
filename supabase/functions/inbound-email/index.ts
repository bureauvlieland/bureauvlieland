import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getRenderedTemplate, getRecipientEmail, getSubjectPrefix, buildReplyTo, SENDER_EMAIL, SENDER_NAME } from "../_shared/email-templates.ts";
import { logEmail, EmailTypes } from "../_shared/email-logger.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/**
 * Extract reference number from a Reply-To address like reply+BV-2503-0012@reply.bureauvlieland.nl
 */
function extractReferenceNumber(toAddress: string): string | null {
  const match = toAddress.match(/reply\+([A-Z]+-\d{4}-\d{4})@/i);
  return match ? match[1].toUpperCase() : null;
}

/**
 * Detect if this email should be routed to the purchase invoice inbox.
 * Matches recipients like:
 *   - invoices@reply.bureauvlieland.nl
 *   - inkoop@reply.bureauvlieland.nl
 *   - facturen@reply.bureauvlieland.nl
 *   - reply+inkoop@reply.bureauvlieland.nl
 *   - reply+facturen@... / reply+invoices@...
 */
function isPurchaseInvoiceRecipient(toAddress: string): boolean {
  const lower = (toAddress || "").toLowerCase();
  return /(?:^|<|,|\s)(?:reply\+)?(?:invoices|inkoop|facturen)@/i.test(lower);
}

/**
 * Strip HTML tags from content, keeping text
 */
function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<\/div>/gi, "\n")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * Extract sender name from email "From" field
 */
function parseSender(from: string): { name: string; email: string } {
  const match = from.match(/^"?([^"<]*)"?\s*<?([^>]+)>?$/);
  if (match) {
    return {
      name: match[1].trim() || match[2].trim(),
      email: match[2].trim(),
    };
  }
  return { name: from.trim(), email: from.trim() };
}

/**
 * Send a notification email to the customer about the partner reply
 */
async function notifyCustomer(
  supabase: ReturnType<typeof createClient>,
  requestId: string,
  referenceNumber: string,
  contactName: string,
  subject: string,
  messageContent: string,
) {
  try {
    // Fetch customer details from program_requests
    const { data: pr } = await supabase
      .from("program_requests")
      .select("customer_email, customer_name, customer_company, customer_token")
      .eq("id", requestId)
      .maybeSingle();

    if (!pr?.customer_email) {
      console.warn("No customer email found for notification");
      return;
    }

    const portalUrl = `https://bureauvlieland.nl/klant/${pr.customer_token}`;
    const customerDisplayName = pr.customer_company || pr.customer_name;

    // Render template
    const rendered = await getRenderedTemplate("inbound_reply_to_customer", {
      customer_name: customerDisplayName,
      partner_name: contactName,
      reference_number: referenceNumber,
      subject: subject || "Reactie op uw bericht",
      message: messageContent.substring(0, 2000),
      portal_url: portalUrl,
    });

    if (!rendered) {
      console.error("Could not render inbound_reply_to_customer template");
      return;
    }

    // Send via Mailjet
    const MJ_APIKEY_PUBLIC = Deno.env.get("MAILJET_API_KEY");
    const MJ_APIKEY_PRIVATE = Deno.env.get("MAILJET_SECRET_KEY");

    if (!MJ_APIKEY_PUBLIC || !MJ_APIKEY_PRIVATE) {
      console.error("Mailjet API keys not configured");
      return;
    }

    const recipientEmail = getRecipientEmail(pr.customer_email);
    const subjectPrefix = getSubjectPrefix();
    const replyTo = buildReplyTo(referenceNumber);

    const mailjetPayload = {
      Messages: [
        {
          From: { Email: SENDER_EMAIL, Name: SENDER_NAME },
          To: [{ Email: recipientEmail, Name: customerDisplayName }],
          Subject: `${subjectPrefix}${rendered.subject}`,
          HTMLPart: rendered.body,
          ...(replyTo ? { ReplyTo: replyTo } : {}),
        },
      ],
    };

    const mjResponse = await fetch("https://api.mailjet.com/v3.1/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Basic " + btoa(`${MJ_APIKEY_PUBLIC}:${MJ_APIKEY_PRIVATE}`),
      },
      body: JSON.stringify(mailjetPayload),
    });

    const mjResult = await mjResponse.json();
    const messageId = mjResult?.Messages?.[0]?.To?.[0]?.MessageID?.toString() || null;

    await logEmail({
      email_type: "inbound_reply_to_customer",
      subject: rendered.subject,
      recipient_email: recipientEmail,
      recipient_name: customerDisplayName,
      related_request_id: requestId,
      status: mjResponse.ok ? "sent" : "failed",
      error_message: mjResponse.ok ? undefined : JSON.stringify(mjResult),
      mailjet_message_id: messageId,
      sent_by: "system",
      metadata: {
        template_name: "inbound_reply_to_customer",
        actor: "partner → klant (via inbound parse)",
      },
    });

    console.log(`Customer notification sent to ${recipientEmail} for ${referenceNumber}`);
  } catch (err) {
    console.error("Error sending customer notification:", err);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const contentType = req.headers.get("content-type") || "";
    let sender = "";
    let recipient = "";
    let subject = "";
    let textContent = "";
    let htmlContent = "";
    let rawPayload: Record<string, unknown> = {};

    if (contentType.includes("application/json")) {
      const body = await req.json();
      rawPayload = body;
      sender = body.From || body.Sender || "";
      recipient = body.To || body.Recipient || "";
      subject = body.Subject || "";
      textContent = body["Text-part"] || body.Text || "";
      htmlContent = body["Html-part"] || body.Html || "";
    } else if (contentType.includes("multipart/form-data") || contentType.includes("application/x-www-form-urlencoded")) {
      const formData = await req.formData();
      const obj: Record<string, unknown> = {};
      for (const [k, v] of formData.entries()) obj[k] = typeof v === "string" ? v : v;
      rawPayload = obj;
      sender = formData.get("From")?.toString() || formData.get("Sender")?.toString() || "";
      recipient = formData.get("To")?.toString() || formData.get("Recipient")?.toString() || "";
      subject = formData.get("Subject")?.toString() || "";
      textContent = formData.get("Text-part")?.toString() || formData.get("Text")?.toString() || "";
      htmlContent = formData.get("Html-part")?.toString() || formData.get("Html")?.toString() || "";
    } else {
      try {
        const body = await req.json();
        rawPayload = body;
        sender = body.From || body.Sender || "";
        recipient = body.To || body.Recipient || "";
        subject = body.Subject || "";
        textContent = body["Text-part"] || body.Text || "";
        htmlContent = body["Html-part"] || body.Html || "";
      } catch {
        console.error("Could not parse request body");
        return new Response(JSON.stringify({ error: "Invalid request body" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    console.log(`Inbound email received — From: ${sender}, To: ${recipient}, Subject: ${subject}`);

    // Purchase invoice inbox route — forward full payload to dedicated handler
    if (isPurchaseInvoiceRecipient(recipient)) {
      const attCount = Array.isArray((rawPayload as Record<string, unknown>).Attachments)
        ? ((rawPayload as Record<string, unknown>).Attachments as unknown[]).length
        : 0;
      const partsCount = Object.keys(((rawPayload as Record<string, unknown>).Parts || {}) as Record<string, unknown>).length;
      console.log(
        `Routing inbound email to inbound-purchase-invoice — recipient=${recipient}, ` +
        `subject="${subject}", attachments=${attCount}, parts=${partsCount}`,
      );
      try {
        const fnUrl = `${supabaseUrl}/functions/v1/inbound-purchase-invoice`;
        const fwd = await fetch(fnUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${supabaseServiceKey}`,
          },
          body: JSON.stringify(rawPayload),
        });
        const fwdJson = await fwd.json().catch(() => ({}));
        return new Response(
          JSON.stringify({ status: "ok", routed_to: "purchase_invoice_inbox", result: fwdJson }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      } catch (err) {
        console.error("Failed to forward to inbound-purchase-invoice:", err);
        return new Response(
          JSON.stringify({ status: "error", message: "forward_failed" }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
    }

    const referenceNumber = extractReferenceNumber(recipient);
    if (!referenceNumber) {
      console.warn(`No valid reference number found in recipient: ${recipient}`);
      return new Response(JSON.stringify({ status: "ignored", reason: "no_reference" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Extracted reference: ${referenceNumber}`);

    const { name: contactName, email: contactEmail } = parseSender(sender);
    const content = textContent || stripHtml(htmlContent) || "(geen inhoud)";
    const truncatedContent = content.length > 10000 ? content.substring(0, 10000) + "\n\n[Bericht ingekort]" : content;

    // Look up the project by reference number
    let requestId: string | null = null;
    let accommodationId: string | null = null;
    let customerName: string | null = null;

    if (referenceNumber.startsWith("BV-")) {
      const { data: pr } = await supabase
        .from("program_requests")
        .select("id, customer_name, customer_company")
        .eq("reference_number", referenceNumber)
        .maybeSingle();

      if (pr) {
        requestId = pr.id;
        customerName = pr.customer_company || pr.customer_name;
      }
    } else if (referenceNumber.startsWith("LOG-")) {
      const { data: ar } = await supabase
        .from("accommodation_requests")
        .select("id, customer_name, customer_company, linked_program_id")
        .eq("reference_number", referenceNumber)
        .maybeSingle();

      if (ar) {
        accommodationId = ar.id;
        requestId = ar.linked_program_id || null;
        customerName = ar.customer_company || ar.customer_name;
      }
    }

    if (!requestId && !accommodationId) {
      console.warn(`No project found for reference: ${referenceNumber}`);
      return new Response(JSON.stringify({ status: "ignored", reason: "project_not_found" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Detect whether this is a reply within an existing customer ↔ partner thread
    let audience: "admin" | "customer_partner" = "admin";
    if (accommodationId && contactEmail) {
      const lower = contactEmail.toLowerCase();
      const { data: quotesOnAcc } = await supabase
        .from("accommodation_quotes")
        .select("partner:partners(email, contact_email)")
        .eq("request_id", accommodationId);
      const senderIsPartner = (quotesOnAcc || []).some((q: any) => {
        const p = q.partner;
        if (!p) return false;
        return [p.email, p.contact_email].filter(Boolean).map((e: string) => e.toLowerCase()).includes(lower);
      });
      if (senderIsPartner) {
        const { count } = await supabase
          .from("project_communications")
          .select("id", { count: "exact", head: true })
          .eq("accommodation_id", accommodationId)
          .eq("audience", "customer_partner");
        if ((count || 0) > 0) audience = "customer_partner";
      }
    }

    // Save as project communication
    const { error: insertError } = await supabase.from("project_communications").insert({
      request_id: requestId,
      accommodation_id: accommodationId,
      communication_type: "email_in",
      direction: "inbound",
      audience,
      subject: subject || null,
      content: truncatedContent,
      contact_name: contactName || null,
      contact_email: contactEmail || null,
      communication_date: new Date().toISOString(),
    });

    if (insertError) {
      console.error("Error inserting communication:", insertError);
      throw insertError;
    }

    // Create admin todo for follow-up
    const todoTitle = `Nieuw antwoord van ${contactName || contactEmail} op ${referenceNumber}`;
    const todoDescription = subject
      ? `Onderwerp: "${subject}"\n\nBekijk het bericht in het projectdossier.`
      : "Bekijk het bericht in het projectdossier.";

    await supabase.from("admin_todos").insert({
      title: todoTitle.substring(0, 200),
      description: todoDescription,
      priority: "normal",
      status: "todo",
      related_request_id: requestId || null,
      auto_type: "inbound_email",
      auto_entity_id: referenceNumber,
    });

    // Notify customer about the partner reply
    if (requestId) {
      await notifyCustomer(
        supabase,
        requestId,
        referenceNumber,
        contactName || contactEmail,
        subject,
        truncatedContent,
      );
    }

    console.log(`Inbound email saved for ${referenceNumber} — from ${contactEmail}`);

    return new Response(
      JSON.stringify({ status: "ok", reference: referenceNumber }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in inbound-email:", error);
    return new Response(
      JSON.stringify({ status: "error", message: "Internal error" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
