import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  getRenderedTemplate,
  TemplateIds,
  SENDER_EMAIL,
  SENDER_NAME,
  sanitizeHtml,
  formatDateNL,
  getSubjectPrefix,
  getRecipientEmail,
  buildReplyTo,
} from "../_shared/email-templates.ts";
import { logEmail } from "../_shared/email-logger.ts";

import { extractMessageIds } from "../_shared/mailjet-send.ts";
const MAILJET_API_KEY = Deno.env.get("MAILJET_API_KEY");
const MAILJET_SECRET_KEY = Deno.env.get("MAILJET_SECRET_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

async function getSetting(
  supabase: any,
  id: string,
  fallback: string | number | boolean,
): Promise<any> {
  const { data } = await supabase
    .from("app_settings")
    .select("value")
    .eq("id", id)
    .maybeSingle();
  if (!data) return fallback;
  const v = data.value;
  return v === null || v === undefined ? fallback : v;
}

function formatDateRange(dates: string[] | null | undefined): string {
  if (!Array.isArray(dates) || dates.length === 0) return "";
  if (dates.length === 1) return `bezoek op ${formatDateNL(dates[0])}`;
  const sorted = [...dates].sort();
  return `bezoek van ${formatDateNL(sorted[0])} t/m ${formatDateNL(sorted[sorted.length - 1])}`;
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    const body = await req.json().catch(() => ({}));
    const { request_id, force, sent_by, origin } = body as {
      request_id?: string;
      force?: boolean;
      sent_by?: string;
      origin?: string;
    };

    if (!request_id || typeof request_id !== "string") {
      return json({ error: "request_id is verplicht" }, 400);
    }

    const { data: request, error: reqErr } = await supabase
      .from("program_requests")
      .select(
        "id, reference_number, customer_name, customer_email, customer_company, selected_dates, aftersales_sent_at, status",
      )
      .eq("id", request_id)
      .maybeSingle();

    if (reqErr || !request) {
      return json({ error: "Project niet gevonden" }, 404);
    }

    if (!request.customer_email) {
      return json({ error: "Geen e-mailadres bij klant" }, 400);
    }

    if (request.aftersales_sent_at && !force) {
      return json(
        {
          error: "Aftersales-mail is al verstuurd",
          aftersales_sent_at: request.aftersales_sent_at,
        },
        409,
      );
    }

    const googleUrl =
      (await getSetting(
        supabase,
        "customer_aftersales_google_url",
        "https://g.page/r/CREi-TJGNt7kEAE/review",
      )) as string;
    const ownUrl =
      (await getSetting(
        supabase,
        "customer_aftersales_review_url",
        "https://bureauvlieland.nl/reviews",
      )) as string;

    const dateLabel = formatDateRange(request.selected_dates as string[] | null);

    const rendered = await getRenderedTemplate(TemplateIds.CUSTOMER_AFTERSALES_REVIEW, {
      customer_name: sanitizeHtml(request.customer_name || "gast"),
      reference_number: request.reference_number || "",
      program_date_label: dateLabel,
      google_review_url: googleUrl,
      own_review_url: ownUrl,
    });

    if (!rendered) {
      return json({ error: "Aftersales-template niet gevonden" }, 500);
    }

    if (!MAILJET_API_KEY || !MAILJET_SECRET_KEY) {
      return json({ error: "Mailjet niet geconfigureerd" }, 500);
    }

    const recipient = getRecipientEmail(request.customer_email, origin);
    const subjectPrefix = getSubjectPrefix(origin);
    const subject = `${subjectPrefix}${rendered.subject}`;
    const replyTo = buildReplyTo(request.reference_number);

    const auth = btoa(`${MAILJET_API_KEY}:${MAILJET_SECRET_KEY}`);
    const mjRes = await fetch("https://api.mailjet.com/v3.1/send", {
      method: "POST",
      headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        Messages: [
          {
            From: { Email: SENDER_EMAIL, Name: SENDER_NAME },
            To: [{ Email: recipient, Name: request.customer_name || "" }],
            ...(replyTo ? { ReplyTo: replyTo } : {}),
            Subject: subject,
            HTMLPart: rendered.body,
          },
        ],
      }),
    });
    try { mailjetMessageId = extractMessageIds(await mjRes.clone().json())[0] ?? null; } catch { /* body already consumed or non-JSON */ }

    if (!mjRes.ok) {
      const errTxt = await mjRes.text();
      console.error("Mailjet error:", errTxt);
      await logEmail({
      mailjet_message_id: mailjetMessageId ?? undefined,
        email_type: "customer_aftersales_review",
        subject,
        recipient_email: recipient,
        recipient_name: request.customer_name || undefined,
        related_request_id: request.id,
        status: "failed",
        error_message: errTxt.slice(0, 500),
        sent_by: sent_by || "admin",
        metadata: {
          template_name: "customer_aftersales_review",
          actor: "bureau → klant (aftersales)",
        },
      });
      return json({ error: "Versturen mislukt" }, 502);
    }

    const nowIso = new Date().toISOString();

    // Mark request as sent
    await supabase
      .from("program_requests")
      .update({ aftersales_sent_at: nowIso, updated_at: nowIso })
      .eq("id", request.id);

    // Close any open aftersales todos for this project
    await supabase
      .from("admin_todos")
      .update({ status: "done", completed_at: nowIso, updated_at: nowIso })
      .eq("auto_type", "customer_aftersales")
      .eq("related_request_id", request.id)
      .neq("status", "done");

    await logEmail({
      mailjet_message_id: mailjetMessageId ?? undefined,
      email_type: "customer_aftersales_review",
      subject,
      recipient_email: recipient,
      recipient_name: request.customer_name || undefined,
      related_request_id: request.id,
      status: "sent",
      sent_by: sent_by || "admin",
      metadata: {
        template_name: "customer_aftersales_review",
        actor: "bureau → klant (aftersales)",
        google_url: googleUrl,
        own_url: ownUrl,
        forced: !!force,
      },
    });

    return json({ success: true, sent_to: recipient, sent_at: nowIso });
  } catch (err) {
    console.error("send-customer-aftersales error:", err);
    return json({ error: "Onverwachte fout bij versturen aftersales-mail" }, 500);
  }
});
