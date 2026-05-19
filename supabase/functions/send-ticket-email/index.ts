import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  SENDER_EMAIL,
  SENDER_NAME,
  buildReplyTo,
  getRecipientEmail,
  getSubjectPrefix,
  isTestMode,
} from "../_shared/email-templates.ts";
import { logEmail } from "../_shared/email-logger.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MAILJET_API_KEY = Deno.env.get("MAILJET_API_KEY");
const MAILJET_SECRET_KEY = Deno.env.get("MAILJET_SECRET_KEY");
const ATTACH_LIMIT_BYTES = 9 * 1024 * 1024; // 9MB combined cap → fall back to links

interface RequestBody {
  itemIds: string[];
  recipientEmail: string;
  subject?: string;
  message?: string;
}

const escapeHtml = (str: string) =>
  str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

const formatDateNL = (d: string) => {
  try {
    return new Date(d).toLocaleDateString("nl-NL", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch {
    return d;
  }
};

const splitEmails = (raw: string): string[] =>
  raw
    .split(/[,;]/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // ─── Auth: admin only ──────────────────────────────────────────────────
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();
    if (!roleData) {
      return new Response(JSON.stringify({ error: "Admin access required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = (await req.json()) as RequestBody;
    const origin = req.headers.get("origin") || "";

    if (!body.itemIds || !Array.isArray(body.itemIds) || body.itemIds.length === 0) {
      return new Response(JSON.stringify({ error: "Missing itemIds" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const recipients = splitEmails(body.recipientEmail || "");
    if (recipients.length === 0) {
      return new Response(JSON.stringify({ error: "Missing recipient email" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── Fetch items + project ─────────────────────────────────────────────
    const { data: items, error: itemsError } = await supabase
      .from("program_request_items")
      .select(
        "id, request_id, block_id, block_name, day_index, booking_reference, booking_document_path, program_requests!inner(id, reference_number, customer_name, customer_email, customer_company, selected_dates)"
      )
      .in("id", body.itemIds);

    if (itemsError || !items || items.length === 0) {
      return new Response(JSON.stringify({ error: "Items not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // All items must share one project (front-end ensures this).
    const project = (items[0] as any).program_requests;
    if (!project) {
      return new Response(JSON.stringify({ error: "Project not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── Download attachments ──────────────────────────────────────────────
    type Attachment = { Filename: string; ContentType: string; Base64Content: string };
    const attachments: Attachment[] = [];
    const linkOnly: { name: string; url: string }[] = [];
    let totalBytes = 0;

    for (const it of items) {
      const path = (it as any).booking_document_path as string | null;
      if (!path) continue;
      const filenameOnly = path.split("/").pop() || `ticket-${(it as any).id}.pdf`;
      const { data: file, error: dlErr } = await supabase.storage
        .from("ticket-documents")
        .download(path);
      if (dlErr || !file) {
        console.error("Failed to download", path, dlErr);
        continue;
      }
      const buf = new Uint8Array(await file.arrayBuffer());
      totalBytes += buf.length;
      if (totalBytes > ATTACH_LIMIT_BYTES) {
        // Switch this one (and all subsequent) to a signed link
        const { data: signed } = await supabase.storage
          .from("ticket-documents")
          .createSignedUrl(path, 60 * 60 * 24 * 14); // 14 days
        if (signed?.signedUrl) {
          linkOnly.push({ name: filenameOnly, url: signed.signedUrl });
        }
        continue;
      }
      // base64 encode
      let binary = "";
      for (let i = 0; i < buf.length; i++) binary += String.fromCharCode(buf[i]);
      attachments.push({
        Filename: filenameOnly,
        ContentType: "application/pdf",
        Base64Content: btoa(binary),
      });
    }

    // ─── Compose email ─────────────────────────────────────────────────────
    const subjectPrefix = getSubjectPrefix(origin);
    const refs = items
      .map((it) => (it as any).booking_reference)
      .filter(Boolean)
      .join(", ");
    const defaultSubject = refs
      ? `Uw tickets — boeking ${refs}`
      : `Uw tickets voor uw verblijf op Vlieland`;
    const subject = `${subjectPrefix}${(body.subject?.trim() || defaultSubject)}`;

    const recipientName = project.customer_company || project.customer_name || "Klant";
    const greeting = `Beste ${escapeHtml(recipientName)},`;

    const itemsList = items
      .map((it) => {
        const dateStr = (() => {
          const dates = (project.selected_dates as string[] | null) || [];
          const idx = (it as any).day_index ?? 0;
          const d = dates[idx] ?? dates[0];
          return d ? formatDateNL(d) : "";
        })();
        const ref = (it as any).booking_reference;
        const name = escapeHtml((it as any).block_name || "Ticket");
        return `<li>${name}${dateStr ? ` – ${escapeHtml(dateStr)}` : ""}${ref ? ` <span style="color:#666">(boeking ${escapeHtml(ref)})</span>` : ""}</li>`;
      })
      .join("");

    const linkBlock = linkOnly.length
      ? `<p>De volgende bestanden waren te groot om bij te voegen. U kunt ze downloaden via onderstaande beveiligde link${linkOnly.length > 1 ? "en" : ""} (geldig 14 dagen):</p>
         <ul>${linkOnly.map((l) => `<li><a href="${l.url}">${escapeHtml(l.name)}</a></li>`).join("")}</ul>`
      : "";

    const customMessage = body.message?.trim()
      ? escapeHtml(body.message).replace(/\n/g, "<br/>")
      : `In de bijlage vindt u uw ticket${items.length > 1 ? "s" : ""} voor uw verblijf op Vlieland.<br/><br/>` +
        `Wij wensen u een fijne reis. Mocht u vragen hebben, dan kunt u eenvoudig op deze e-mail reageren.`;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #1a1a1a;">
        <h2 style="color:#1e3a5f; margin-bottom: 16px;">Uw tickets</h2>
        <p>${greeting}</p>
        <p>${customMessage}</p>
        <ul style="font-size:14px; line-height:1.6;">${itemsList}</ul>
        ${linkBlock}
        <p style="margin-top:24px;">Met vriendelijke groet,<br/><strong>Bureau Vlieland</strong></p>
        <hr style="border:none; border-top:1px solid #e2e8f0; margin:24px 0;" />
        <p style="color:#999; font-size:11px;">
          Bureau Vlieland · hallo@bureauvlieland.nl · 0562 700 208
          ${isTestMode(origin) ? `<br/><strong>[TEST MODE]</strong> origineel adres: ${escapeHtml(recipients.join(", "))}` : ""}
        </p>
      </div>
    `;

    if (!MAILJET_API_KEY || !MAILJET_SECRET_KEY) {
      return new Response(JSON.stringify({ error: "Email service not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const finalRecipients = recipients.map((e) => getRecipientEmail(e, origin));
    const replyTo = buildReplyTo(project.reference_number);

    const message: Record<string, unknown> = {
      From: { Email: SENDER_EMAIL, Name: SENDER_NAME },
      To: finalRecipients.map((e) => ({ Email: e })),
      Subject: subject,
      HTMLPart: html,
    };
    if (attachments.length) message.Attachments = attachments;
    if (replyTo) message.ReplyTo = replyTo;

    const mjRes = await fetch("https://api.mailjet.com/v3.1/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${btoa(`${MAILJET_API_KEY}:${MAILJET_SECRET_KEY}`)}`,
      },
      body: JSON.stringify({ Messages: [message] }),
    });

    const mjOk = mjRes.ok;
    const errText = mjOk ? "" : await mjRes.text();

    // ─── Log + update items ────────────────────────────────────────────────
    await logEmail({
      email_type: "ticket_to_customer",
      recipient_email: finalRecipients.join(", "),
      recipient_name: recipientName,
      subject,
      status: mjOk ? "sent" : "failed",
      error_message: mjOk ? undefined : errText.slice(0, 500),
      sent_by: user.id,
      related_request_id: project.id,
      metadata: {
        template_name: "ticket_to_customer",
        actor: "admin → klant",
        item_ids: items.map((it) => (it as any).id),
        booking_references: items.map((it) => (it as any).booking_reference).filter(Boolean),
      },
    });

    if (!mjOk) {
      console.error("Mailjet error:", errText);
      return new Response(JSON.stringify({ error: "Failed to send email" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    await supabase
      .from("program_request_items")
      .update({ ticket_last_emailed_at: new Date().toISOString() })
      .in("id", items.map((it) => (it as any).id));

    return new Response(
      JSON.stringify({ success: true, recipients: finalRecipients }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("send-ticket-email error", e);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
