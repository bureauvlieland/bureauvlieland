// Inbound webhook for purchase invoice emails (Mailjet Parse API)
// Mailjet Parse format: attachments arrive as top-level keys "Attachment1", "Attachment2",
// "InlineAttachment1", etc. with base64 content. The "Parts" map describes them.
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

function decodeBase64(value: string): Uint8Array | null {
  try {
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
  return (
    bytes.length > 4 &&
    bytes[0] === 0x25 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x44 &&
    bytes[3] === 0x46
  );
}

interface ExtractedPdf {
  filename: string;
  bytes: Uint8Array;
  source: string;
}

interface PartDescriptor {
  ContentType?: string;
  "Content-Type"?: string;
  Headers?: Record<string, string | string[]>;
  ContentRef?: string;
  "Content-Reference"?: string;
}

function getHeader(headers: Record<string, string | string[]> | undefined, key: string): string {
  if (!headers) return "";
  const lower = key.toLowerCase();
  for (const [k, v] of Object.entries(headers)) {
    if (k.toLowerCase() === lower) {
      return Array.isArray(v) ? v.join(" ") : String(v || "");
    }
  }
  return "";
}

function filenameFromContentType(ct: string): string {
  // Try to extract name="..." or filename="..."
  const m = ct.match(/(?:name|filename)\s*=\s*"?([^";]+)"?/i);
  return m ? m[1].trim() : "";
}

/**
 * Mailjet Parse delivers attachments at the TOP LEVEL of the payload as keys like
 * "Attachment1", "Attachment2", "InlineAttachment1", "InlineAttachment2" — each containing
 * base64-encoded content. The "Parts" map is metadata: each entry has Headers describing the
 * Content-Type, Content-Disposition (with filename) and a "ContentRef" pointing to the
 * top-level attachment key.
 */
function extractPdfs(payload: Record<string, unknown>): {
  pdfs: ExtractedPdf[];
  inventory: Array<{ filename: string; contentType: string; source: string }>;
} {
  const pdfs: ExtractedPdf[] = [];
  const inventory: Array<{ filename: string; contentType: string; source: string }> = [];
  const consumed = new Set<string>();

  const parts = (payload.Parts || payload.parts || []) as unknown;
  const partList: PartDescriptor[] = Array.isArray(parts)
    ? (parts as PartDescriptor[])
    : Object.values(parts as Record<string, PartDescriptor>);

  // 1. Walk Parts metadata to find named attachments by ContentRef
  for (const part of partList) {
    const headers = part.Headers || {};
    const ct = (part.ContentType || part["Content-Type"] || getHeader(headers, "Content-Type") || "").toLowerCase();
    const disp = getHeader(headers, "Content-Disposition");
    const ref = part.ContentRef || part["Content-Reference"] || "";
    const filename =
      filenameFromContentType(disp) ||
      filenameFromContentType(ct) ||
      "";

    inventory.push({ filename: filename || "(zonder naam)", contentType: ct || "(onbekend)", source: ref ? `Parts→${ref}` : "Parts" });

    if (!ref) continue;
    const raw = payload[ref];
    if (typeof raw !== "string") continue;

    const isPdfHint =
      ct.includes("pdf") ||
      filename.toLowerCase().endsWith(".pdf") ||
      (ct.includes("octet-stream") && filename.toLowerCase().endsWith(".pdf"));

    const bytes = decodeBase64(raw);
    if (!bytes) continue;

    if (isPdfHint || looksLikePdf(bytes)) {
      pdfs.push({
        filename: filename || `factuur-${pdfs.length + 1}.pdf`,
        bytes,
        source: `Parts→${ref}`,
      });
      consumed.add(ref);
    }
  }

  // 2. Fallback: scan ALL top-level keys matching Attachment* / InlineAttachment* / file*
  for (const [key, value] of Object.entries(payload)) {
    if (consumed.has(key)) continue;
    if (typeof value !== "string") continue;
    if (value.length < 100) continue;
    if (!/^(Inline)?Attachment\d+$|^Part\d+$/i.test(key)) continue;

    const bytes = decodeBase64(value);
    if (!bytes) continue;

    if (looksLikePdf(bytes)) {
      pdfs.push({
        filename: `bijlage-${key}.pdf`,
        bytes,
        source: `Top-level[${key}]`,
      });
      inventory.push({
        filename: `(${key})`,
        contentType: "application/pdf (auto-detected)",
        source: "Top-level",
      });
      consumed.add(key);
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

    const payloadKeys = Object.keys(payload);
    const attachmentKeys = payloadKeys.filter((k) => /^(Inline)?Attachment\d+$/i.test(k));
    console.log(
      `Inbound purchase invoice — From: ${sender}, Subject: "${subject}", Forward: ${isForward}, ` +
      `Attachment keys: [${attachmentKeys.join(", ")}], All keys: [${payloadKeys.join(", ")}]`,
    );

    const { pdfs, inventory } = extractPdfs(payload);
    console.log(`Found ${pdfs.length} PDF(s). Inventory:`, JSON.stringify(inventory));

    // Sanitized payload snapshot (truncate base64 attachments)
    const rawForLog: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(payload)) {
      if (typeof v === "string" && v.length > 500 && /^(Inline)?Attachment\d+$/i.test(k)) {
        rawForLog[k] = `<base64 ${v.length} chars>`;
      } else {
        rawForLog[k] = v;
      }
    }

    if (pdfs.length === 0) {
      const inventoryText = inventory.length
        ? inventory.map((i) => `${i.filename} [${i.contentType}]`).join(", ")
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
    return new Response(
      JSON.stringify({ status: "error", message: err instanceof Error ? err.message : "Unknown" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
