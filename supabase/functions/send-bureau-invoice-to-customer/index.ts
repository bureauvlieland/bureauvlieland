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

interface RequestBody {
  requestId: string;
  pdfBase64: string;
  pdfFilename: string;
  invoiceNumber: string;
  invoiceDate: string;
  amountInclVat: number;
  invoiceId?: string | null;
  recipientEmail?: string;
  customSubject?: string;
  customMessage?: string;
}

const formatCurrency = (amount: number) =>
  `€ ${Number(amount).toLocaleString("nl-NL", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const formatDateNL = (dateStr: string) => {
  try {
    return new Date(dateStr).toLocaleDateString("nl-NL", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
};

const escapeHtml = (str: string) =>
  str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // ─── Auth ──────────────────────────────────────────────────────────────
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

    // ─── Body ──────────────────────────────────────────────────────────────
    const body = (await req.json()) as RequestBody;
    const origin = req.headers.get("origin") || "";

    const required: (keyof RequestBody)[] = [
      "requestId",
      "pdfBase64",
      "pdfFilename",
      "invoiceNumber",
      "invoiceDate",
      "amountInclVat",
    ];
    for (const key of required) {
      if (body[key] === undefined || body[key] === null || body[key] === "") {
        return new Response(JSON.stringify({ error: `Missing field: ${key}` }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // ─── Project + recipient ───────────────────────────────────────────────
    const { data: request, error: reqError } = await supabase
      .from("program_requests")
      .select(
        "id, reference_number, customer_name, customer_email, customer_company, billing_company_name, billing_contact_name, billing_contact_email"
      )
      .eq("id", body.requestId)
      .maybeSingle();

    if (reqError || !request) {
      return new Response(JSON.stringify({ error: "Project not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const fallbackRecipient =
      request.billing_contact_email || request.customer_email;
    const targetEmail = (body.recipientEmail || fallbackRecipient || "").trim();
    if (!targetEmail) {
      return new Response(JSON.stringify({ error: "No recipient email available" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const recipientName =
      request.billing_contact_name ||
      request.billing_company_name ||
      request.customer_company ||
      request.customer_name;

    // ─── Compose email ─────────────────────────────────────────────────────
    const subjectPrefix = getSubjectPrefix(origin);
    const subject =
      body.customSubject?.trim() ||
      `${subjectPrefix}Factuur ${body.invoiceNumber} – Bureau Vlieland`;
    const finalSubject = body.customSubject ? `${subjectPrefix}${body.customSubject}` : subject;

    const greeting = recipientName ? `Beste ${escapeHtml(recipientName)},` : "Beste relatie,";
    const messageBody = body.customMessage?.trim()
      ? escapeHtml(body.customMessage).replace(/\n/g, "<br/>")
      : `In de bijlage vindt u factuur <strong>${escapeHtml(body.invoiceNumber)}</strong> van Bureau Vlieland.<br/><br/>` +
        `Wij verzoeken u vriendelijk het bedrag van <strong>${formatCurrency(body.amountInclVat)}</strong> ` +
        `binnen de op de factuur vermelde betaaltermijn over te maken onder vermelding van het factuurnummer.`;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #1a1a1a;">
        <h2 style="color: #1e3a5f; margin-bottom: 16px;">Factuur ${escapeHtml(body.invoiceNumber)}</h2>
        <p>${greeting}</p>
        <p>${messageBody}</p>

        <table style="width: 100%; border-collapse: collapse; margin: 24px 0; font-size: 14px;">
          <tr>
            <td style="padding: 6px 0; color: #666; width: 180px;">Factuurnummer:</td>
            <td style="padding: 6px 0; font-weight: bold;">${escapeHtml(body.invoiceNumber)}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #666;">Factuurdatum:</td>
            <td style="padding: 6px 0;">${formatDateNL(body.invoiceDate)}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #666;">Totaalbedrag:</td>
            <td style="padding: 6px 0; font-weight: bold;">${formatCurrency(body.amountInclVat)}</td>
          </tr>
          ${request.reference_number ? `
          <tr>
            <td style="padding: 6px 0; color: #666;">Projectreferentie:</td>
            <td style="padding: 6px 0;">${escapeHtml(request.reference_number)}</td>
          </tr>` : ""}
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
      console.error("Mailjet credentials not configured");
      return new Response(JSON.stringify({ error: "Email service not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const finalRecipient = getRecipientEmail(targetEmail, origin);
    const replyTo = buildReplyTo(request.reference_number);

    const message: Record<string, unknown> = {
      From: { Email: SENDER_EMAIL, Name: SENDER_NAME },
      To: [{ Email: finalRecipient, Name: recipientName || "Klant" }],
      Subject: finalSubject,
      HTMLPart: html,
      Attachments: [
        {
          ContentType: "application/pdf",
          Filename: body.pdfFilename || `Factuur-${body.invoiceNumber}.pdf`,
          Base64Content: body.pdfBase64,
        },
      ],
    };
    if (replyTo) message.ReplyTo = replyTo;

    const mjResponse = await fetch("https://api.mailjet.com/v3.1/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${btoa(`${MAILJET_API_KEY}:${MAILJET_SECRET_KEY}`)}`,
      },
      body: JSON.stringify({ Messages: [message] }),
    });

    if (!mjResponse.ok) {
      const errText = await mjResponse.text();
      console.error("Mailjet error:", errText);

      await logEmail({
        email_type: "bureau_invoice_to_customer",
        recipient_email: finalRecipient,
        recipient_name: recipientName,
        subject: finalSubject,
        status: "failed",
        error_message: errText.slice(0, 500),
        sent_by: user.id,
        related_request_id: body.requestId,
        metadata: {
          template_name: "bureau_invoice_to_customer",
          actor: "admin → klant",
          invoiceId: body.invoiceId ?? null,
          invoiceNumber: body.invoiceNumber,
        },
      });

      return new Response(JSON.stringify({ error: "Failed to send email" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── Logging ───────────────────────────────────────────────────────────
    await logEmail({
      email_type: "bureau_invoice_to_customer",
      recipient_email: finalRecipient,
      recipient_name: recipientName,
      subject: finalSubject,
      status: "sent",
      sent_by: user.id,
      related_request_id: body.requestId,
      metadata: {
        template_name: "bureau_invoice_to_customer",
        actor: "admin → klant",
        invoiceId: body.invoiceId ?? null,
        invoiceNumber: body.invoiceNumber,
        amountInclVat: body.amountInclVat,
      },
    });

    await supabase.from("program_request_history").insert({
      request_id: body.requestId,
      action: `Factuur ${body.invoiceNumber} verstuurd naar klant (${finalRecipient})`,
      actor: "admin",
      actor_name: "Bureau Vlieland",
      new_value: {
        invoice_number: body.invoiceNumber,
        recipient: finalRecipient,
        amount_incl_vat: body.amountInclVat,
      },
    });

    return new Response(
      JSON.stringify({ success: true, recipient: finalRecipient }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in send-bureau-invoice-to-customer:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
