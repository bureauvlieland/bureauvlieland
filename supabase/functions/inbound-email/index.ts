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
 * Detect if this email should be routed to the sales inbox.
 * Matches recipients like:
 *   - sales@reply.bureauvlieland.nl
 *   - leads@reply.bureauvlieland.nl
 *   - aanvraag@reply.bureauvlieland.nl / aanvragen@
 *   - reply+sales@... / reply+leads@... / reply+aanvraag(en)@...
 */
function isSalesInboxRecipient(toAddress: string): boolean {
  const lower = (toAddress || "").toLowerCase();
  return /(?:^|<|,|\s)(?:reply\+)?(?:sales|leads|aanvraag|aanvragen)@/i.test(lower);
}

/**
 * Strip HTML tags from content, keeping text
 */
function stripHtml(html: string): string {
  return html
    // Remove invisible quoting / style / script blocks first
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<head[\s\S]*?<\/head>/gi, "")
    // Block-level breaks
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|tr|li|h[1-6])>/gi, "\n")
    .replace(/<\/(table|ul|ol|blockquote)>/gi, "\n\n")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#039;/gi, "'")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

interface StoredAttachment {
  name: string;
  size: number;
  mime: string;
  path: string;
}

/**
 * Extract attachments from a Mailjet Parse payload and upload them to the
 * `email-attachments` storage bucket. Supports both shapes:
 *   - JSON: top-level `Attachment1`, `Attachment2`, ... keys with base64 content,
 *     described by `Parts[*].ContentRef` + `Headers` (Content-Type, Content-Disposition)
 *   - Legacy: `Attachments` array with `{Filename, Content-Type, content}` (base64)
 */
async function extractAndStoreAttachments(
  payload: Record<string, unknown>,
  supabase: ReturnType<typeof createClient>,
  referenceNumber: string,
): Promise<StoredAttachment[]> {
  const out: StoredAttachment[] = [];
  if (!payload || typeof payload !== "object") return out;

  type RawAtt = { filename: string; mime: string; base64: string };
  const raws: RawAtt[] = [];

  // Shape A: Parts[] + AttachmentN
  const parts = (payload as any).Parts;
  if (Array.isArray(parts)) {
    for (const part of parts) {
      const ref = part?.ContentRef;
      if (!ref || typeof ref !== "string") continue;
      const b64 = (payload as any)[ref];
      if (typeof b64 !== "string" || !b64) continue;
      const headers = (part?.Headers || {}) as Record<string, unknown>;
      const ct = String(headers["Content-Type"] ?? headers["content-type"] ?? "application/octet-stream");
      const cd = String(headers["Content-Disposition"] ?? headers["content-disposition"] ?? "");
      const mime = ct.split(";")[0].trim() || "application/octet-stream";
      const filename = extractFilename(cd) || extractFilenameFromCT(ct) || `bijlage-${raws.length + 1}`;
      // Skip inline images embedded in HTML (no filename + image/*)
      if (/inline/i.test(cd) && !filename.includes(".")) continue;
      raws.push({ filename, mime, base64: b64 });
    }
  }

  // Shape B: Attachments[]
  const legacy = (payload as any).Attachments;
  if (Array.isArray(legacy)) {
    for (const a of legacy) {
      const b64 = a?.content || a?.Content;
      if (typeof b64 !== "string" || !b64) continue;
      const mime = String(a?.["Content-Type"] || a?.ContentType || "application/octet-stream").split(";")[0].trim();
      const filename = String(a?.Filename || a?.filename || `bijlage-${raws.length + 1}`);
      raws.push({ filename, mime, base64: b64 });
    }
  }

  for (const r of raws) {
    try {
      const bytes = base64ToBytes(r.base64);
      // Skip empty / impossibly tiny payloads
      if (bytes.length === 0) continue;
      const safeName = r.filename.replace(/[^\w.\-]+/g, "_").slice(0, 120) || "bijlage";
      const path = `${referenceNumber}/${crypto.randomUUID()}-${safeName}`;
      const { error } = await supabase.storage
        .from("email-attachments")
        .upload(path, bytes, { contentType: r.mime, upsert: false });
      if (error) {
        console.error(`Failed to upload attachment ${r.filename}:`, error.message);
        continue;
      }
      out.push({ name: r.filename, size: bytes.length, mime: r.mime, path });
      console.log(`Uploaded attachment ${r.filename} (${bytes.length} bytes) to ${path}`);
    } catch (err) {
      console.error(`Error processing attachment ${r.filename}:`, err);
    }
  }

  return out;
}

function extractFilename(contentDisposition: string): string | null {
  if (!contentDisposition) return null;
  // RFC 5987: filename*=UTF-8''...
  const ext = contentDisposition.match(/filename\*\s*=\s*[^']*'[^']*'([^;]+)/i);
  if (ext?.[1]) {
    try { return decodeURIComponent(ext[1].trim().replace(/^"|"$/g, "")); } catch { /* fall through */ }
  }
  const m = contentDisposition.match(/filename\s*=\s*"?([^";]+)"?/i);
  return m?.[1]?.trim() || null;
}

function extractFilenameFromCT(contentType: string): string | null {
  const m = contentType.match(/name\s*=\s*"?([^";]+)"?/i);
  return m?.[1]?.trim() || null;
}

function base64ToBytes(b64: string): Uint8Array {
  const clean = b64.replace(/\s+/g, "");
  const bin = atob(clean);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return arr;
}

/**
 * Trim quoted reply history from an inbound email so we only keep the
 * actual new message the sender typed. Handles Outlook ("Van:"/"From:"),
 * Gmail ("On ... wrote:"), and "----- Original Message -----" markers.
 */
function trimQuotedReply(text: string): string {
  if (!text) return text;
  const markers: RegExp[] = [
    /^[ \t>]*-{2,}\s*Original Message\s*-{2,}.*$/im,
    /^[ \t>]*-{2,}\s*Oorspronkelijk bericht\s*-{2,}.*$/im,
    /^[ \t>]*Van:\s.+$/im,
    /^[ \t>]*From:\s.+$/im,
    /^[ \t>]*Op\s.+schreef\s.+:\s*$/im,
    /^[ \t>]*On\s.+wrote:\s*$/im,
    /^[ \t>]*Verzonden vanaf .+$/im,
    /^[ \t>]*Sent from my .+$/im,
  ];
  let earliest = text.length;
  for (const re of markers) {
    const m = text.match(re);
    if (m && typeof m.index === "number" && m.index < earliest) {
      earliest = m.index;
    }
  }
  const trimmed = text.slice(0, earliest).trim();
  // Safety: if trimming wiped almost everything, keep original
  if (trimmed.length < 10 && text.trim().length > 10) return text.trim();
  return trimmed;
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

    const portalUrl = `https://bureauvlieland.nl/mijn-programma/${pr.customer_token}`;
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
        { TrackClicks: "disabled", TrackOpens: "disabled",
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

    // Sales inbox route — store inbound mail as a sales lead and trigger AI scan
    if (isSalesInboxRecipient(recipient)) {
      console.log(`Routing inbound email to sales inbox — recipient=${recipient}, subject="${subject}"`);
      try {
        const { name: senderName, email: senderEmail } = parseSender(sender);
        const rawText = textContent || stripHtml(htmlContent) || "";
        const trimmed = trimQuotedReply(rawText) || rawText;

        // Sanitized payload snapshot (strip large base64)
        const rawForLog: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(rawPayload as Record<string, unknown>)) {
          if (typeof v === "string" && v.length > 500 && /^(Inline)?Attachment\d+$/i.test(k)) {
            rawForLog[k] = `<base64 ${v.length} chars>`;
          } else {
            rawForLog[k] = v;
          }
        }

        const { data: inbox, error: insErr } = await supabase
          .from("sales_inbox")
          .insert({
            recipient,
            from_email: senderEmail || "unknown",
            from_name: senderName || null,
            subject: subject || null,
            body_text: trimmed.substring(0, 20000),
            body_html: (htmlContent || "").substring(0, 100000) || null,
            raw_payload: rawForLog,
            scan_status: "pending",
            status: "new",
          })
          .select("id")
          .single();

        if (insErr || !inbox) {
          console.error("sales_inbox insert error:", insErr);
          return new Response(
            JSON.stringify({ status: "error", routed_to: "sales_inbox", message: insErr?.message }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
          );
        }

        // Store attachments under sales/<inbox_id>/...
        const attachments = await extractAndStoreAttachments(rawPayload, supabase, `sales/${inbox.id}`);
        if (attachments.length > 0) {
          await supabase
            .from("sales_inbox")
            .update({
              attachments,
              attachment_path: attachments[0].path,
              attachment_filename: attachments[0].name,
              attachment_size: attachments[0].size,
            })
            .eq("id", inbox.id);
        }

        // Create admin todo
        await supabase.from("admin_todos").insert({
          title: `Nieuwe sales-aanvraag van ${senderName || senderEmail}`.substring(0, 200),
          description: subject ? `Onderwerp: "${subject}"\n\nBekijk in de Sales Inbox.` : "Bekijk in de Sales Inbox.",
          priority: "normal",
          status: "todo",
          auto_type: "sales_inbox",
          auto_entity_id: inbox.id,
        });

        // Fire-and-forget AI scan
        try {
          const fnUrl = `${supabaseUrl}/functions/v1/scan-sales-lead`;
          fetch(fnUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${supabaseServiceKey}`,
            },
            body: JSON.stringify({ inbox_id: inbox.id }),
          }).catch((e) => console.error("Background scan-sales-lead trigger failed:", e));
        } catch (e) {
          console.error("Could not trigger scan-sales-lead:", e);
        }

        return new Response(
          JSON.stringify({ status: "ok", routed_to: "sales_inbox", inbox_id: inbox.id }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      } catch (err) {
        console.error("sales_inbox routing failed:", err);
        return new Response(
          JSON.stringify({ status: "error", message: "sales_inbox_failed" }),
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
    const rawContent = textContent || stripHtml(htmlContent) || "(geen inhoud)";
    const content = trimQuotedReply(rawContent) || rawContent;
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

    // Extract attachments from Mailjet Parse payload and upload to storage
    const attachments = await extractAndStoreAttachments(rawPayload, supabase, referenceNumber);

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
      metadata: attachments.length > 0 ? { attachments } : {},
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

    // Notify customer ONLY when this inbound reply belongs to an existing
    // customer ↔ partner thread. Default admin-only inbound mail (partner → bureau)
    // must NEVER be forwarded to the customer.
    if (requestId && audience === "customer_partner") {
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
