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

import { extractMessageIds, findRecentIdempotentSend } from "../_shared/mailjet-send.ts";
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * Statussen waarin de factuur (opnieuw) naar de partner mag. Een concept
 * heeft geen nummer en geen PDF; die wordt eerst definitief gemaakt.
 */
const SENDABLE_STATUSES = ["final", "sent"];

interface RequestBody {
  commissionInvoiceId: string;
  /**
   * Optioneel: een vers gerenderde PDF. Ontbreekt hij, dan gaat de PDF mee
   * die bij "Definitief maken" is opgeslagen (commission_invoices.pdf_path).
   */
  pdfBase64?: string;
  pdfFilename?: string;
  recipientEmail?: string;
  customSubject?: string;
  customMessage?: string;
}

const formatCurrency = (amount: number) =>
  `€ ${Number(amount).toLocaleString("nl-NL", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const escapeHtml = (str: string) =>
  str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

export async function handler(req: Request): Promise<Response> {
  // Bij aanroep gelezen, niet bij het laden van de module: dan werkt de
  // test ook los van de andere testmodules die de sleutels zetten.
  const MAILJET_API_KEY = Deno.env.get("MAILJET_API_KEY");
  const MAILJET_SECRET_KEY = Deno.env.get("MAILJET_SECRET_KEY");
  let mailjetMessageId: string | null = null;
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Auth + admin check
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

    if (!body.commissionInvoiceId) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch invoice + lines
    const { data: invoice, error: invErr } = await supabase
      .from("commission_invoices")
      .select("*")
      .eq("id", body.commissionInvoiceId)
      .maybeSingle();
    if (invErr || !invoice) {
      return new Response(JSON.stringify({ error: "Invoice not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Alleen een definitieve of al verstuurde factuur mag (opnieuw) verstuurd
    // worden. Een concept heeft nog geen nummer; een betaalde of doorgestuurde
    // factuur terug op "verstuurd" zetten haalt de onderdelen uit "betaald".
    if (!SENDABLE_STATUSES.includes(invoice.status)) {
      return new Response(
        JSON.stringify({ error: `Een factuur met status "${invoice.status}" kan niet worden verstuurd` }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Fetch partner for fallback email
    const { data: partner } = await supabase
      .from("partners")
      .select("id, name, email, contact_email")
      .eq("id", invoice.partner_id)
      .maybeSingle();

    const fallbackRecipient =
      invoice.recipient_email || partner?.contact_email || partner?.email;
    const targetEmail = (body.recipientEmail || fallbackRecipient || "").trim();
    if (!targetEmail) {
      return new Response(JSON.stringify({ error: "No recipient email available" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const recipientName = invoice.recipient_name || partner?.name || "Partner";

    // De PDF: vers meegestuurd (dan ook opslaan), anders de opgeslagen PDF
    // van "Definitief maken".
    let pdfBase64: string | null = body.pdfBase64 ?? null;
    let pdfPath: string | null = invoice.pdf_path ?? null;
    if (pdfBase64) {
      const pdfBytes = Uint8Array.from(atob(pdfBase64), (c) => c.charCodeAt(0));
      const newPath = `${invoice.partner_id}/${invoice.invoice_number}.pdf`;
      const { error: uploadErr } = await supabase.storage
        .from("commission-invoices")
        .upload(newPath, pdfBytes, { contentType: "application/pdf", upsert: true });
      if (uploadErr) {
        console.error("Storage upload failed:", uploadErr);
      } else {
        pdfPath = newPath;
      }
    } else if (pdfPath) {
      const { data: pdfBlob, error: downloadErr } = await supabase.storage
        .from("commission-invoices")
        .download(pdfPath);
      if (downloadErr || !pdfBlob) {
        console.error("Storage download failed:", downloadErr);
        return new Response(
          JSON.stringify({ error: "De opgeslagen PDF kon niet worden opgehaald; maak hem opnieuw" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      const buf = new Uint8Array(await pdfBlob.arrayBuffer());
      let bin = "";
      for (let i = 0; i < buf.length; i++) bin += String.fromCharCode(buf[i]);
      pdfBase64 = btoa(bin);
    } else {
      return new Response(
        JSON.stringify({ error: "Geen PDF beschikbaar; maak de PDF eerst opnieuw" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Compose email
    const subjectPrefix = getSubjectPrefix(origin);
    const finalSubject = body.customSubject?.trim()
      ? `${subjectPrefix}${body.customSubject.trim()}`
      : `${subjectPrefix}Commissiefactuur ${invoice.invoice_number} – Bureau Vlieland`;

    const greeting = `Beste ${escapeHtml(recipientName)},`;
    const messageBody = body.customMessage?.trim()
      ? escapeHtml(body.customMessage).replace(/\n/g, "<br/>")
      : `In de bijlage vindt u commissiefactuur <strong>${escapeHtml(invoice.invoice_number)}</strong> van Bureau Vlieland.<br/><br/>` +
        `Wij verzoeken u vriendelijk het bedrag van <strong>${formatCurrency(Number(invoice.amount_incl_vat))}</strong> ` +
        `binnen de op de factuur vermelde betaaltermijn over te maken onder vermelding van het factuurnummer.`;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #1a1a1a;">
        <h2 style="color: #1e3a5f; margin-bottom: 16px;">Commissiefactuur ${escapeHtml(invoice.invoice_number)}</h2>
        <p>${greeting}</p>
        <p>${messageBody}</p>

        <table style="width: 100%; border-collapse: collapse; margin: 24px 0; font-size: 14px;">
          <tr><td style="padding: 6px 0; color: #666; width: 180px;">Factuurnummer:</td><td style="padding: 6px 0; font-weight: bold;">${escapeHtml(invoice.invoice_number)}</td></tr>
          <tr><td style="padding: 6px 0; color: #666;">Factuurdatum:</td><td style="padding: 6px 0;">${new Date(invoice.invoice_date).toLocaleDateString("nl-NL", { day: "numeric", month: "long", year: "numeric" })}</td></tr>
          <tr><td style="padding: 6px 0; color: #666;">Bedrag excl. BTW:</td><td style="padding: 6px 0;">${formatCurrency(Number(invoice.amount_excl_vat))}</td></tr>
          <tr><td style="padding: 6px 0; color: #666;">BTW (${invoice.vat_rate}%):</td><td style="padding: 6px 0;">${formatCurrency(Number(invoice.vat_amount))}</td></tr>
          <tr><td style="padding: 6px 0; color: #666;">Totaal incl. BTW:</td><td style="padding: 6px 0; font-weight: bold;">${formatCurrency(Number(invoice.amount_incl_vat))}</td></tr>
        </table>

        <p>Heeft u vragen over deze factuur? Neem gerust contact met ons op via een reply op deze e-mail.</p>
        <p style="margin-top: 24px;">Met vriendelijke groet,<br/><strong>Bureau Vlieland</strong></p>

        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
        <p style="color: #999; font-size: 11px;">
          Bureau Vlieland · hallo@bureauvlieland.nl · 0562 700 208
          ${isTestMode(origin) ? "<br/><strong>[TEST MODE]</strong> origineel adres: " + escapeHtml(fallbackRecipient || "") : ""}
        </p>
      </div>
    `;

    if (!MAILJET_API_KEY || !MAILJET_SECRET_KEY) {
      return new Response(JSON.stringify({ error: "Email service not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const finalRecipient = getRecipientEmail(targetEmail, origin);
    const replyTo = buildReplyTo(invoice.invoice_number);

    const message: Record<string, unknown> = {
      From: { Email: SENDER_EMAIL, Name: SENDER_NAME },
      To: [{ Email: finalRecipient, Name: recipientName }],
      Subject: finalSubject,
      HTMLPart: html,
      Attachments: [
        {
          ContentType: "application/pdf",
          Filename: body.pdfFilename || `Commissiefactuur-${invoice.invoice_number}.pdf`,
          Base64Content: pdfBase64,
        },
      ],
    };
    if (replyTo) message.ReplyTo = replyTo;

    message.TrackClicks = "disabled";
    message.TrackOpens = "enabled";

    // Idempotency: geen dubbele commissiefactuur naar dezelfde partner binnen 10 min.
    const idempotencyKey = `commission-invoice-${invoice.id}-${finalRecipient}`;
    const prevSend = await findRecentIdempotentSend(idempotencyKey, 10);
    if (prevSend) {
      console.warn(`[send-commission-invoice-to-partner] Duplicate suppressed for ${idempotencyKey}`);
      return new Response(
        JSON.stringify({ success: true, deduped: true, mailjetMessageId: prevSend.mailjetMessageId }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const mjResponse = await fetch("https://api.mailjet.com/v3.1/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${btoa(`${MAILJET_API_KEY}:${MAILJET_SECRET_KEY}`)}`,
      },
      body: JSON.stringify({ Messages: [message] }),
    });
    try { mailjetMessageId = extractMessageIds(await mjResponse.clone().text())[0] ?? null; } catch { /* body already consumed or non-JSON */ }

    if (!mjResponse.ok) {
      const errText = await mjResponse.text();
      console.error("Mailjet error:", errText);
      await logEmail({
      mailjet_message_id: mailjetMessageId ?? undefined,
        email_type: "commission_invoice_sent",
        recipient_email: finalRecipient,
        recipient_name: recipientName,
        subject: finalSubject,
        status: "failed",
        error_message: errText.slice(0, 500),
        sent_by: user.id,
        related_partner_id: invoice.partner_id,
        metadata: {
          template_name: "commission_invoice_sent",
          actor: "admin → partner",
          commissionInvoiceId: invoice.id,
          invoiceNumber: invoice.invoice_number,
        },
      });
      return new Response(JSON.stringify({ error: "Failed to send email" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Update invoice status. Bij opnieuw versturen blijft de oorspronkelijke
    // verzenddatum staan.
    const nowIso = new Date().toISOString();
    const warnings: string[] = [];
    const check = (label: string, error: { message: string } | null) => {
      if (error) {
        console.error(`[send-commission-invoice-to-partner] ${label}:`, error.message);
        warnings.push(`${label}: ${error.message}`);
      }
    };

    const { error: statusErr } = await supabase
      .from("commission_invoices")
      .update(
        invoice.status === "sent"
          ? { pdf_path: pdfPath }
          : { status: "sent", sent_at: nowIso, sent_by: user.id, pdf_path: pdfPath },
      )
      .eq("id", invoice.id);
    check("Factuurstatus bijwerken", statusErr);

    // De bronnen (onderdelen, offertes, losse inkoopfacturen) zijn al bij
    // "Definitief maken" op gefactureerd gezet (finalize_commission_invoice).

    // Log email
    await logEmail({
      mailjet_message_id: mailjetMessageId ?? undefined,
      idempotency_key: idempotencyKey,
      email_type: "commission_invoice_sent",
      recipient_email: finalRecipient,
      recipient_name: recipientName,
      subject: finalSubject,
      status: "sent",
      sent_by: user.id,
      related_partner_id: invoice.partner_id,
      metadata: {
        template_name: "commission_invoice_sent",
        actor: "admin → partner",
        commissionInvoiceId: invoice.id,
        invoiceNumber: invoice.invoice_number,
        amountInclVat: Number(invoice.amount_incl_vat),
      },
    });

    return new Response(
      JSON.stringify({
        success: true,
        recipient: finalRecipient,
        pdfPath,
        ...(warnings.length > 0 ? { warnings } : {}),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in send-commission-invoice-to-partner:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
}

if (import.meta.main) Deno.serve(handler);
