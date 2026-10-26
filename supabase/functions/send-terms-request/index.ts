// Stuurt op verzoek van het bureau een ondertekenverzoek aan de klant: de
// mail "customer_terms_request" met een directe link naar het tabblad Akkoord
// in het klantportaal. Werkt ongeacht de offertefase, zodat ook een
// telefonisch gesloten project getekend kan worden. Alleen voor admins.
//
// Dezelfde tekst als de automatische reeks in check-pending-items
// (_shared/customerTermsReminder.ts), met een neutrale intro.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://esm.sh/zod@3.23.8";
import {
  buildReplyTo,
  getPortalBaseUrl,
  getRecipientEmail,
  getRenderedTemplate,
  getSubjectPrefix,
  SENDER_EMAIL,
  SENDER_NAME,
  wrapEmailHtml,
} from "../_shared/email-templates.ts";
import { logEmail } from "../_shared/email-logger.ts";
import { sendMailjet } from "../_shared/mailjet-send.ts";
import { allItemsConfirmedForTerms, buildTermsMailCopy, type TermsItemLike } from "../_shared/customerTermsReminder.ts";
import { isBureauItem, type BureauItemLike } from "../_shared/bureau-item.ts";
import { guardTermsRequest } from "./logic.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const EMAIL_TYPE = "customer_terms_request";

const BodySchema = z.object({
  request_id: z.string().uuid(),
});

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Alleen ingelogde admins.
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Unauthorized" }, 401);
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) return json({ error: "Unauthorized" }, 401);
    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();
    if (!roleData) return json({ error: "Forbidden" }, 403);

    const parsed = BodySchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return json({ error: "request_id (uuid) is verplicht" }, 400);
    const { request_id } = parsed.data;

    const { data: prog, error: progError } = await supabase
      .from("program_requests")
      .select(`
        id, status, cancelled_at, terms_accepted_at, signature_id,
        customer_name, customer_company, customer_email, customer_token,
        reference_number, selected_dates, quote_status,
        billing_company_name, billing_address_street, billing_address_postal, billing_address_city,
        items:program_request_items(id, status, block_type, block_category, provider_id, day_index, item_quote_status)
      `)
      .eq("id", request_id)
      .maybeSingle();
    if (progError) throw progError;
    if (!prog) return json({ error: "Project niet gevonden" }, 404);

    const todayStr = new Date().toISOString().slice(0, 10);
    const guard = guardTermsRequest(prog, todayStr);
    if (!guard.ok) return json({ error: guard.reason }, 409);

    const origin = req.headers.get("origin") || undefined;
    const portalUrl = `${getPortalBaseUrl(origin)}/mijn-programma/${prog.customer_token}?view=akkoord`;
    const customerLabel = prog.customer_company || prog.customer_name || "klant";
    const items = (prog.items as Array<TermsItemLike & BureauItemLike>) || [];
    const billingMissing =
      !prog.billing_company_name ||
      !prog.billing_address_street ||
      !prog.billing_address_postal ||
      !prog.billing_address_city;

    const copy = buildTermsMailCopy({
      stage: guard.stage,
      mailType: EMAIL_TYPE,
      customerName: prog.customer_name || customerLabel,
      referenceNumber: prog.reference_number || "",
      daysUntil: guard.daysUntil,
      portalUrl,
      billingMissing,
      allConfirmed: allItemsConfirmedForTerms(items, isBureauItem),
      manual: true,
    });

    // Zelfde renderer als de cron: een template uit de database wint, anders
    // de ingebouwde tekst in de huisstijl.
    const rendered = await getRenderedTemplate(EMAIL_TYPE, {
      ...copy.variables,
      first_date: guard.firstDate ?? "",
    });
    const subject = `${getSubjectPrefix(origin)}${rendered?.subject ?? copy.subject}`;
    const html = rendered?.body ?? await wrapEmailHtml(copy.html, supabase);
    const recipientEmail = getRecipientEmail(prog.customer_email!, origin);
    const replyTo = buildReplyTo(prog.reference_number);

    const result = await sendMailjet({
      source: "send-terms-request",
      messages: [{
        From: { Email: SENDER_EMAIL, Name: SENDER_NAME },
        ...(replyTo ? { ReplyTo: replyTo } : {}),
        To: [{ Email: recipientEmail, Name: prog.customer_name || customerLabel }],
        Subject: subject,
        HTMLPart: html,
        TrackOpens: "enabled",
        TrackClicks: "disabled",
      }],
    });

    const sent = result.ok && result.skipped !== "suppressed";
    await logEmail({
      email_type: EMAIL_TYPE,
      subject,
      recipient_email: recipientEmail,
      recipient_name: prog.customer_name || customerLabel,
      related_request_id: prog.id,
      status: sent ? "sent" : "failed",
      error_message: result.ok
        ? (result.skipped === "suppressed" ? `Adres geblokkeerd: ${result.suppressedRecipient?.reason ?? "onbekend"}` : undefined)
        : result.error,
      mailjet_message_id: result.ok ? (result.messageId ?? undefined) : undefined,
      sent_by: `admin:${user.id}`,
      metadata: {
        template_name: EMAIL_TYPE,
        actor: "admin → klant (ondertekenverzoek)",
        manual: true,
        stage: guard.stage,
        days_until: guard.daysUntil,
      },
    });

    if (!result.ok) return json({ error: `Mail niet verstuurd: ${result.error}` }, 502);
    if (result.skipped === "suppressed") {
      return json({ error: `Dit adres is geblokkeerd (${result.suppressedRecipient?.reason ?? "onbekend"}); zie Email health.` }, 409);
    }

    return json({ ok: true, recipient: recipientEmail, stage: guard.stage, days_until: guard.daysUntil });
  } catch (err) {
    console.error("send-terms-request error:", err);
    return json({ error: err instanceof Error ? err.message : String(err) }, 500);
  }
});
