// Using Deno.serve() instead of deprecated import
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { logEmail } from "../_shared/email-logger.ts";
import { extractMessageIds } from "../_shared/mailjet-send.ts";
import {
  getPortalBaseUrl,
  getRecipientEmail,
  getSubjectPrefix,
  buildReplyTo,
  formatDateNL,
  sanitizeHtml,
  wrapEmailHtml,
} from "../_shared/email-templates.ts";

const MAILJET_API_KEY = Deno.env.get("MAILJET_API_KEY");
const MAILJET_SECRET_KEY = Deno.env.get("MAILJET_SECRET_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface QuoteRequestPayload {
  request_id: string;
  partner_ids: string[];
  email_subject: string;
  email_body: string;
}

const sendEmailViaMailjet = async (messages: any[]) => {
  const auth = btoa(`${MAILJET_API_KEY}:${MAILJET_SECRET_KEY}`);
  
  const response = await fetch("https://api.mailjet.com/v3.1/send", {
    method: "POST",
    headers: {
      "Authorization": `Basic ${auth}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ Messages: messages }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Mailjet API error:", errorText);
    throw new Error("EMAIL_SERVICE_ERROR");
  }

  return await response.json();
};

/**
 * De admin schrijft de tekst in de dialoog met lichte markdown: **vet**,
 * regels die met "- " beginnen als opsomming, verder gewone regels.
 * HTML uit de tekst wordt ontsmet; alleen deze opmaak komt erdoor.
 */
export function markdownToHtml(text: string): string {
  const lines = sanitizeHtml(text).replace(/\r\n/g, "\n").split("\n");
  const out: string[] = [];
  let list: string[] = [];
  const flushList = () => {
    if (list.length > 0) {
      out.push(`<ul style="margin:4px 0 8px;padding-left:20px;">${list.map((l) => `<li style="margin:2px 0;">${l}</li>`).join("")}</ul>`);
      list = [];
    }
  };
  for (const raw of lines) {
    const line = raw.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
    const bullet = /^\s*-\s+(.*)$/.exec(line);
    if (bullet) {
      list.push(bullet[1]);
      continue;
    }
    flushList();
    out.push(line);
  }
  flushList();
  // Gewone regels krijgen een <br>; een lijst staat op zichzelf.
  return out
    .map((part, i) => (part.startsWith("<ul") || i === out.length - 1 ? part : `${part}<br>`))
    .join("");
}

export interface QuoteRequestMailInput {
  body: string;
  portalBaseUrl: string;
  /** LOG-nummer van de logiesaanvraag. */
  referenceNumber: string | null;
  /** Al opgemaakt: tot wanneer de in te dienen offerte geldig blijft. */
  validUntilLabel: string | null;
}

/** Binnenkant van de offerteaanvraag-mail; de aanroeper wikkelt dit in wrapEmailHtml. */
export function buildQuoteRequestInner(input: QuoteRequestMailInput): string {
  return `
<div style="font-size:15px;line-height:1.6;color:#333;">
  ${markdownToHtml(input.body)}
</div>

<div style="margin-top:24px;padding:16px;background:#f8fafc;border-radius:8px;border:1px solid #e2e8f0;">
  <p style="margin:0 0 12px;font-weight:600;color:#334155;">Offerte indienen?</p>
  <p style="margin:0;font-size:14px;color:#64748b;">
    Log in op het partnerportaal om je offerte in te dienen. Je vindt de aanvraag onder "Logiesaanvragen"${input.referenceNumber ? ` (referentie ${sanitizeHtml(input.referenceNumber)})` : ""}.${input.validUntilLabel ? ` De offerte die je indient blijft geldig tot ${sanitizeHtml(input.validUntilLabel)}; daarna kun je de geldigheid in het portaal verlengen.` : ""}
  </p>
  <a href="${input.portalBaseUrl}/partner/login"
     style="display:inline-block;margin-top:12px;background-color:#0F4C5C;color:#ffffff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:600;">
    Ga naar partnerportaal
  </a>
</div>

<p style="margin:20px 0 0;font-size:14px;color:#64748b;">Vragen? Reageer gerust op deze mail; die komt direct in het dossier terecht.</p>`;
}

/** Onderwerp met het LOG-nummer erachter, als de admin dat nog niet zelf noemde. */
export function quoteRequestSubject(subject: string, referenceNumber: string | null, prefix = ""): string {
  const trimmed = subject.trim();
  if (referenceNumber && !trimmed.includes(referenceNumber)) return `${prefix}${trimmed} (${referenceNumber})`;
  return `${prefix}${trimmed}`;
}

export const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify admin auth
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

    // Check if user is admin
    const { data: isAdmin } = await supabase.rpc("is_admin", { _user_id: user.id });
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { request_id, partner_ids, email_subject, email_body } = body as QuoteRequestPayload;
    const origin = body.origin || req.headers.get("origin") || "";
    const portalBaseUrl = getPortalBaseUrl(origin);

    if (!request_id || !partner_ids?.length || !email_subject || !email_body) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch the accommodation request
    const { data: request, error: requestError } = await supabase
      .from("accommodation_requests")
      .select("*")
      .eq("id", request_id)
      .single();

    if (requestError || !request) {
      return new Response(
        JSON.stringify({ error: "Aanvraag niet gevonden" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch selected partners
    const { data: partners, error: partnersError } = await supabase
      .from("partners")
      .select("*, contact_email")
      .in("id", partner_ids);

    if (partnersError || !partners?.length) {
      return new Response(
        JSON.stringify({ error: "Partners niet gevonden" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check existing quotes for each partner
    const { data: existingQuotes } = await supabase
      .from("accommodation_quotes")
      .select("id, partner_id, status")
      .eq("request_id", request_id)
      .in("partner_id", partner_ids);

    const existingQuoteMap: Record<string, { id: string; status: string }> = {};
    (existingQuotes || []).forEach((q) => {
      existingQuoteMap[q.partner_id] = { id: q.id, status: q.status };
    });

    // Geldigheid van de in te dienen offerte: 14 dagen (ook in de mail genoemd).
    const validUntilIso = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

    // Process each partner: insert, update, or skip (reminder only)
    for (const partnerId of partner_ids) {
      const existing = existingQuoteMap[partnerId];
      const partner = partners.find(p => p.id === partnerId);

      if (!existing) {
        // No existing quote → INSERT new record
        const { error: insertError } = await supabase
          .from("accommodation_quotes")
          .insert({
            request_id,
            partner_id: partnerId,
            accommodation_name: "",
            price_total: 0,
            valid_until: validUntilIso,
            status: "pending",
            commission_percentage: partner?.accommodation_commission_percentage ?? 10,
          });

        if (insertError) {
          console.error("Insert error for partner", partnerId, insertError);
        }
      } else if (["declined", "rejected", "expired"].includes(existing.status)) {
        // Re-request: UPDATE status back to pending, reset fields
        const { error: updateError } = await supabase
          .from("accommodation_quotes")
          .update({
            status: "pending",
            submitted_at: null,
            selected_at: null,
            forwarded_at: null,
            partner_notes: null,
            accommodation_name: "",
            price_total: 0,
            price_per_person_per_night: null,
            room_configuration: [],
            includes: [],
            conditions: null,
            description: null,
            quote_attachment_path: null,
            quote_attachment_filename: null,
            quote_external_url: null,
            valid_until: validUntilIso,
          })
          .eq("id", existing.id);

        if (updateError) {
          console.error("Update error for partner", partnerId, updateError);
        }
      }
      // For status "pending": do nothing to the record, just send the email (reminder)
    }

    // Send emails to each partner (prefer contact_email for notifications).
    // Huisstijl via wrapEmailHtml, Reply-To op de LOG-referentie zodat een
    // antwoord in het dossier landt, LOG-nummer in het onderwerp.
    const subjectPrefix = getSubjectPrefix(origin);
    const referenceNumber: string | null = request.reference_number || null;
    const finalSubject = quoteRequestSubject(email_subject, referenceNumber, subjectPrefix);
    const htmlPart = await wrapEmailHtml(
      buildQuoteRequestInner({
        body: email_body,
        portalBaseUrl,
        referenceNumber,
        validUntilLabel: formatDateNL(validUntilIso),
      }),
      supabase,
    );
    const replyTo = buildReplyTo(referenceNumber);
    const emailMessages = partners.map((partner: any) => ({
      From: { Email: "hallo@bureauvlieland.nl", Name: "Bureau Vlieland" },
      To: [{ Email: getRecipientEmail(partner.contact_email || partner.email, origin), Name: partner.name }],
      ...(replyTo ? { ReplyTo: replyTo } : {}),
      Subject: finalSubject,
      HTMLPart: htmlPart,
    }));

    const mailjetResult = await sendEmailViaMailjet(emailMessages);
    console.log("Mailjet result:", mailjetResult);

    // Extract MessageID per partner (Mailjet returns Messages[] in same order as input).
    // Fallback: null if extraction fails so logging still works.
    const mjMessageIds = extractMessageIds(mailjetResult);

    // Log emails
    for (let idx = 0; idx < partners.length; idx++) {
      const partner = partners[idx] as any;
      await logEmail({
        email_type: "accommodation_quote_request_partner",
        subject: finalSubject,
        recipient_email: partner.contact_email || partner.email,
        recipient_name: partner.name,
        related_accommodation_id: request_id,
        related_partner_id: partner.id,
        status: "sent",
        sent_by: "send-accommodation-quote-request",
        mailjet_message_id: mjMessageIds[idx] ?? null,
        metadata: {
          template_name: "accommodation_quote_request_partner",
          actor: "admin → partner (offerte-aanvraag)",
          customer_name: request.customer_name,
          arrival_date: request.arrival_date,
          departure_date: request.departure_date,
          number_of_guests: request.number_of_guests,
        },
      });
    }

    // Count total quotes for this request and update status + count
    const { count: totalQuotes } = await supabase
      .from("accommodation_quotes")
      .select("id", { count: "exact", head: true })
      .eq("request_id", request_id);

    await supabase
      .from("accommodation_requests")
      .update({ 
        status: "processing",
        quotes_requested_count: totalQuotes ?? partner_ids.length,
      })
      .eq("id", request_id);

    console.log(`Accommodation quote requests sent to ${partners.length} partners`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        sent_count: partners.length,
        partners: partners.map(p => p.name),
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in send-accommodation-quote-request:", error);
    return new Response(
      JSON.stringify({ error: "Er kon geen email worden verstuurd" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

if (import.meta.main) Deno.serve(handler);

