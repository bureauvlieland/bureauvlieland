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
  Headers?: Record<string, string | string[]>;
}

interface MailjetPart {
  Headers?: Record<string, string | string[]>;
  ContentRef?: string;
  "Content-Reference"?: string;
}

function decodeBase64(value: string): Uint8Array | null {
  try {
    // Strip whitespace/newlines that some clients add
    const clean = value.replace(/\s+/g, "");
    const bin = atob(clean);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return bytes;
  } catch {
    return null;
  }
}

function looksLikePdf(bytes: Uint8Array): boolean {
  // PDF magic: %PDF-
  return (
    bytes.length > 4 &&
    bytes[0] === 0x25 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x44 &&
    bytes[3] === 0x46
  );
}

function getHeader(headers: Record<string, string | string[]> | undefined, key: string): string {
  if (!headers) return "";
  const lowerKey = key.toLowerCase();
  for (const [k, v] of Object.entries(headers)) {
    if (k.toLowerCase() === lowerKey) {
      return Array.isArray(v) ? v.join(" ") : String(v || "");
    }
  }
  return "";
}

interface ExtractedPdf {
  filename: string;
  bytes: Uint8Array;
  source: string;
}

/**
 * Extract every PDF we can find in a Mailjet Parse payload.
 * Walks both the Attachments array and the Parts map, accepts:
 *   - Content-Type containing "pdf"
 *   - filename ending in .pdf
 *   - application/octet-stream with pdf filename
 *   - any base64 part whose decoded bytes start with %PDF-
 */
function extractPdfs(payload: Record<string, unknown>): {
  pdfs: ExtractedPdf[];
  inventory: Array<{ filename: string; contentType: string; source: string }>;
} {
  const attachments = (payload.Attachments || payload.attachments || []) as MailjetAttachment[];
  const parts = (payload.Parts || payload.parts || {}) as Record<string, unknown>;
  const pdfs: ExtractedPdf[] = [];
  const inventory: Array<{ filename: string; contentType: string; source: string }> = [];
  const seenRefs = new Set<string>();

  // 1. Walk declared attachments
  if (Array.isArray(attachments)) {
    for (const att of attachments) {
      const filename = att.Filename || "";
      const ct = (att["Content-Type"] || att.ContentType || "").toLowerCase();
      const ref = String(att["Content-Reference"] || att["Content-ID"] || "");
      inventory.push({ filename, contentType: ct, source: "Attachments" });

      if (!ref) continue;
      const partValue = parts[ref];
      if (typeof partValue !== "string") continue;

      const isPdfHint =
        ct.includes("pdf") ||
        filename.toLowerCase().endsWith(".pdf") ||
        (ct.includes("octet-stream") && filename.toLowerCase().endsWith(".pdf"));

      const bytes = decodeBase64(partValue);
      if (!bytes) continue;

      if (isPdfHint || looksLikePdf(bytes)) {
        pdfs.push({
          filename: filename || `factuur-${pdfs.length + 1}.pdf`,
          bytes,
          source: `Attachments[${ref}]`,
        });
        seenRefs.add(ref);
      }
    }
  }

  // 2. Walk all Parts not already consumed — handles forwarded mails where
  //    inline parts aren't in the Attachments array.
  for (const [ref, value] of Object.entries(parts)) {
    if (seenRefs.has(ref)) continue;
    if (typeof value !== "string") continue;
    if (value.length < 100) continue; // skip tiny parts (text bodies)

    const bytes = decodeBase64(value);
    if (!bytes) continue;

    if (looksLikePdf(bytes)) {
      pdfs.push({
        filename: `bijlage-${ref.replace(/[^a-zA-Z0-9]/g, "")}.pdf`,
        bytes,
        source: `Parts[${ref}]`,
      });
      inventory.push({ filename: `(part ${ref})`, contentType: "application/pdf (detected)", source: "Parts" });
      seenRefs.add(ref);
    }
  }

  return { pdfs, inventory };
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
    const isForward = /^(fw|fwd|doorgest)/i.test(subject.trim());

    // Diagnostic dump
    const payloadKeys = Object.keys(payload);
    const partsKeys = Object.keys((payload.Parts || payload.parts || {}) as Record<string, unknown>);
    console.log(
      `Inbound purchase invoice — From: ${sender}, Subject: "${subject}", Forward: ${isForward}, ` +
      `Payload keys: [${payloadKeys.join(", ")}], Parts: ${partsKeys.length}`,
    );

    const { pdfs, inventory } = extractPdfs(payload);
    console.log(`Found ${pdfs.length} PDF(s). Inventory:`, JSON.stringify(inventory));

    // Build a sanitized snapshot of the payload for debugging (drop large base64 parts)
    const rawForLog: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(payload)) {
      if (k === "Parts" || k === "parts") {
        const summary: Record<string, string> = {};
        for (const [pk, pv] of Object.entries(v as Record<string, unknown>)) {
          summary[pk] = typeof pv === "string" ? `<base64 ${pv.length} chars>` : typeof pv;
        }
        rawForLog[k] = summary;
      } else {
        rawForLog[k] = v;
      }
    }

    if (pdfs.length === 0) {
      const inventoryText = inventory.length
        ? inventory.map((i) => `${i.filename || "(geen naam)"} [${i.contentType || "?"}]`).join(", ")
        : "geen bijlagen aangetroffen in de mail";
      const hint = isForward
        ? "Doorgestuurde mail gedetecteerd. Bij doorsturen wordt de PDF-bijlage soms verwijderd of als inline-content opgenomen. Stuur de originele mail opnieuw door, of voeg de PDF expliciet als bijlage toe."
        : "Geen leesbare PDF aangetroffen. Voeg de factuur als losse PDF-bijlage toe en verstuur de mail opnieuw.";
      const errorMsg = `Geen PDF-bijlage gevonden. ${hint}\n\nAangetroffen bijlagen: ${inventoryText}`;

      await supabase.from("purchase_invoice_inbox").insert({
        from_email: fromEmail || "unknown",
        from_name: fromName,
        subject,
        body_text: bodyText.substring(0, 10000),
        scan_status: "failed",
        scan_error: errorMsg,
        raw_payload: rawForLog,
      });

      return new Response(
        JSON.stringify({ status: "ok", reason: "no_pdf_attachment", inventory }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const inboxIds: string[] = [];

    for (const pdf of pdfs) {
      const filename = pdf.filename.replace(/[^a-zA-Z0-9._-]/g, "_");
      const ts = Date.now();
      const path = `inkomend/${ts}_${filename}`;

      const { error: upErr } = await supabase.storage
        .from("partner-invoices")
        .upload(path, pdf.bytes, { contentType: "application/pdf", upsert: false });

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
          attachment_size: pdf.bytes.byteLength,
          scan_status: "pending",
          raw_payload: rawForLog,
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
      JSON.stringify({ status: "ok", inbox_ids: inboxIds, pdfs_found: pdfs.length }),
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
