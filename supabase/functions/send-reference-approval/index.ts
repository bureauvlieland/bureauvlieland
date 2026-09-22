// send-reference-approval
//
// Stuurt de klant de mail "Mag deze referentiepagina online?" met de link
// naar de akkoordpagina, en zet de referentie op 'sent'. Alleen voor admins
// (docs/plan-reviews-oogsten.md, fase 3).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://esm.sh/zod@3.23.8";
import {
  getRenderedTemplate,
  TemplateIds,
  SENDER_EMAIL,
  SENDER_NAME,
  sanitizeHtml,
  getSubjectPrefix,
  getRecipientEmail,
  buildReplyTo,
  getPortalBaseUrl,
} from "../_shared/email-templates.ts";
import { logEmail } from "../_shared/email-logger.ts";
import { extractMessageIds } from "../_shared/mailjet-send.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

export const BodySchema = z.object({
  case_id: z.string().uuid(),
  origin: z.string().optional(),
});

/** De akkoordlink: altijd het productiedomein, behalve bij lokaal ontwikkelen. */
export const approvalUrl = (origin: string | undefined, token: string): string =>
  `${getPortalBaseUrl(origin)}/referentie-akkoord/${token}`;

export const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  try {
    // Alleen admins
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json(401, { error: "Unauthorized" });
    const jwt = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(jwt);
    if (authError || !user) return json(401, { error: "Unauthorized" });
    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();
    if (!roleData) return json(403, { error: "Admin access required" });

    const parsed = BodySchema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) return json(400, { error: "case_id (uuid) is verplicht" });
    const { case_id, origin } = parsed.data;

    const { data: rc, error: caseError } = await supabase
      .from("reference_cases")
      .select("id, request_id, title, status, approval_token")
      .eq("id", case_id)
      .maybeSingle();
    if (caseError || !rc) return json(404, { error: "Referentiepagina niet gevonden" });
    if (!rc.request_id) return json(400, { error: "Deze referentiepagina hoort niet bij een programma" });
    if (!rc.title) return json(400, { error: "Geef de pagina eerst een titel" });

    const { data: request } = await supabase
      .from("program_requests")
      .select("id, reference_number, customer_name, customer_email")
      .eq("id", rc.request_id)
      .maybeSingle();
    if (!request?.customer_email) return json(400, { error: "Geen e-mailadres bij de klant" });

    const url = approvalUrl(origin, rc.approval_token);
    const rendered = await getRenderedTemplate(TemplateIds.REFERENCE_CASE_APPROVAL, {
      customer_name: sanitizeHtml(request.customer_name || "gast"),
      reference_number: request.reference_number || "",
      title: sanitizeHtml(rc.title),
      approval_url: url,
    });
    if (!rendered) return json(500, { error: "Template reference_case_approval niet gevonden" });

    const apiKey = Deno.env.get("MAILJET_API_KEY");
    const secretKey = Deno.env.get("MAILJET_SECRET_KEY");
    if (!apiKey || !secretKey) return json(500, { error: "Mailjet niet geconfigureerd" });

    const recipient = getRecipientEmail(request.customer_email, origin);
    const subject = `${getSubjectPrefix(origin)}${rendered.subject}`;
    const replyTo = buildReplyTo(request.reference_number);

    const mjRes = await fetch("https://api.mailjet.com/v3.1/send", {
      method: "POST",
      headers: { Authorization: `Basic ${btoa(`${apiKey}:${secretKey}`)}`, "Content-Type": "application/json" },
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
    let mailjetMessageId: string | null = null;
    try {
      mailjetMessageId = extractMessageIds(await mjRes.clone().text())[0] ?? null;
    } catch {
      /* geen JSON */
    }

    if (!mjRes.ok) {
      const errTxt = await mjRes.text();
      console.error("Mailjet error:", errTxt);
      await logEmail({
        email_type: "reference_case_approval",
        subject,
        recipient_email: recipient,
        recipient_name: request.customer_name || undefined,
        related_request_id: request.id,
        status: "failed",
        error_message: errTxt.slice(0, 500),
        sent_by: user.email ?? "admin",
        metadata: { template_name: "reference_case_approval", actor: "bureau → klant (referentie)", case_id },
      });
      return json(502, { error: "Versturen mislukt" });
    }

    const now = new Date().toISOString();
    await supabase
      .from("reference_cases")
      .update({ status: rc.status === "draft" ? "sent" : rc.status, approval_sent_at: now })
      .eq("id", rc.id);

    await logEmail({
      mailjet_message_id: mailjetMessageId ?? undefined,
      email_type: "reference_case_approval",
      subject,
      recipient_email: recipient,
      recipient_name: request.customer_name || undefined,
      related_request_id: request.id,
      status: "sent",
      sent_by: user.email ?? "admin",
      metadata: { template_name: "reference_case_approval", actor: "bureau → klant (referentie)", case_id, approval_url: url },
    });

    return json(200, { success: true, sent_to: recipient, sent_at: now });
  } catch (err) {
    console.error("send-reference-approval error:", err);
    return json(500, { error: "Onverwachte fout bij versturen" });
  }
};

if (import.meta.main) Deno.serve(handler);
