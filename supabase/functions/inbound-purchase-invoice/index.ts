// Inbound webhook for purchase invoice emails (Mailjet Parse API)
// Configure Mailjet Parse API to POST to this endpoint for invoices@reply.bureauvlieland.nl
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function parseSender(from: string): { name: string; email: string } {
  if (!from) return { name: "", email: "" };
  const match = from.match(/^"?([^"<]*)"?\s*<?([^>]+)>?$/);
  if (match) {
    return {
      name: (match[1] || "").trim() || (match[2] || "").trim(),
      email: (match[2] || "").trim(),
    };
  }
  return { name: from.trim(), email: from.trim() };
}

interface MailjetAttachment {
  "Content-Type"?: string;
  ContentType?: string;
  Filename?: string;
  "Content-Reference"?: string;
  "Content-ID"?: string;
}

async function fetchAttachmentBytes(
  parts: Record<string, unknown>,
  ref: string,
): Promise<Uint8Array | null> {
  const value = parts[ref];
  if (!value) return null;
  if (typeof value === "string") {
    // base64
    try {
      const bin = atob(value);
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      return bytes;
    } catch {
      return null;
    }
  }
  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Parse Mailjet parse payload
    const contentType = req.headers.get("content-type") || "";
    let payload: Record<string, unknown>;
    if (contentType.includes("application/json")) {
      payload = await req.json();
    } else {
      const fd = await req.formData();
      payload = {};
      for (const [k, v] of fd.entries()) payload[k] = typeof v === "string" ? v : v;
    }

    const sender = String(payload.From || payload.Sender || "");
    const subject = String(payload.Subject || "");
    const bodyText = String(payload["Text-part"] || payload.Text || "");
    const { name: fromName, email: fromEmail } = parseSender(sender);

    console.log(`Inbound purchase invoice from ${sender}, subject="${subject}"`);

    // Find PDF attachments
    const attachments = (payload.Attachments || payload.attachments || []) as MailjetAttachment[];
    const parts = (payload.Parts || payload.parts || {}) as Record<string, unknown>;

    const pdfAttachments = (Array.isArray(attachments) ? attachments : []).filter((a) => {
      const ct = (a["Content-Type"] || a.ContentType || "").toLowerCase();
      const fn = (a.Filename || "").toLowerCase();
      return ct.includes("pdf") || fn.endsWith(".pdf");
    });

    if (pdfAttachments.length === 0) {
      // Still log the inbox entry for visibility but mark as failed scan
      await supabase.from("purchase_invoice_inbox").insert({
        from_email: fromEmail || "unknown",
        from_name: fromName,
        subject,
        body_text: bodyText.substring(0, 10000),
        scan_status: "failed",
        scan_error: "Geen PDF-bijlage gevonden",
      });
      return new Response(
        JSON.stringify({ status: "ok", reason: "no_pdf_attachment" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const inboxIds: string[] = [];

    for (const att of pdfAttachments) {
      const ref = att["Content-Reference"] || att["Content-ID"] || "";
      const bytes = await fetchAttachmentBytes(parts, String(ref));
      if (!bytes) {
        console.warn(`Could not extract attachment ${att.Filename}`);
        continue;
      }

      const filename = (att.Filename || "factuur.pdf").replace(/[^a-zA-Z0-9._-]/g, "_");
      const ts = Date.now();
      const path = `inkomend/${ts}_${filename}`;

      const { error: upErr } = await supabase.storage
        .from("partner-invoices")
        .upload(path, bytes, { contentType: "application/pdf", upsert: false });

      if (upErr) {
        console.error("Upload error:", upErr);
        continue;
      }

      const { data: inbox, error: insErr } = await supabase
        .from("purchase_invoice_inbox")
        .insert({
          from_email: fromEmail || "unknown",
          from_name: fromName,
          subject,
          body_text: bodyText.substring(0, 10000),
          attachment_path: path,
          attachment_filename: filename,
          attachment_size: bytes.byteLength,
          scan_status: "pending",
        })
        .select("id")
        .single();

      if (insErr) {
        console.error("Insert error:", insErr);
        continue;
      }

      inboxIds.push(inbox.id);

      // Trigger AI scan in background (fire-and-forget)
      try {
        const fnUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/scan-purchase-invoice-internal`;
        // Fire and forget — don't await; small timeout via Promise.race
        fetch(fnUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
          },
          body: JSON.stringify({ inbox_id: inbox.id, file_path: path }),
        }).catch((e) => console.error("Background scan trigger failed:", e));
      } catch (e) {
        console.error("Could not trigger background scan:", e);
      }
    }

    // Create admin todo
    if (inboxIds.length > 0) {
      await supabase.from("admin_todos").insert({
        title: `Nieuwe inkoopfactuur in inbox van ${fromName || fromEmail}`,
        description: subject ? `Onderwerp: "${subject}"` : "Bekijk de inbox.",
        priority: "normal",
        status: "todo",
        auto_type: "purchase_invoice_inbox",
        auto_entity_id: inboxIds[0],
      });
    }

    return new Response(
      JSON.stringify({ status: "ok", inbox_ids: inboxIds }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("inbound-purchase-invoice error:", err);
    // Return 200 so Mailjet doesn't keep retrying
    return new Response(
      JSON.stringify({ status: "error", message: err instanceof Error ? err.message : "Unknown" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
