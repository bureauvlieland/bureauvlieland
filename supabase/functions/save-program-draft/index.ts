// Save a program draft and email the visitor a cross-device recovery link.
import { createClient } from "npm:@supabase/supabase-js@2";
import { z } from "npm:zod@3.22.4";
import { SENDER_EMAIL, SENDER_NAME, getRecipientEmail, getSubjectPrefix } from "../_shared/email-templates.ts";
import { sendMailjet } from "../_shared/mailjet-send.ts";
import { logEmail } from "../_shared/email-logger.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const rl = new Map<string, number[]>();
const isRateLimited = (ip: string) => {
  const now = Date.now();
  const recent = (rl.get(ip) || []).filter((t) => now - t < 60_000);
  if (recent.length >= 5) return true;
  recent.push(now);
  rl.set(ip, recent);
  return false;
};

const PayloadSchema = z.object({
  email: z.string().trim().email().max(255),
  payload: z.object({
    cartItems: z.array(z.any()).max(100),
    numberOfPeople: z.number().int().min(1).max(500),
    selectedDates: z.array(z.string()).max(14),
    manualOrder: z.boolean().optional(),
  }),
  existingToken: z.string().min(8).max(64).nullable().optional(),
});

const generateToken = () => {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
};

const getOrigin = (req: Request): string => {
  const origin = req.headers.get("origin");
  if (origin && /^https?:\/\//.test(origin)) return origin;
  return "https://bureauvlieland.nl";
};

const buildEmailHtml = (recoveryUrl: string, itemCount: number) => `
<!doctype html>
<html lang="nl">
<body style="margin:0;padding:0;background:#f8f7f3;font-family:Georgia,serif;color:#1a1a1a;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f8f7f3;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:8px;overflow:hidden;">
        <tr><td style="padding:32px 32px 8px;">
          <div style="font-size:13px;letter-spacing:0.12em;text-transform:uppercase;color:#7a6a4f;">Bureau Vlieland</div>
          <h1 style="font-size:24px;margin:12px 0 8px;color:#1a1a1a;">Uw programma staat klaar</h1>
          <p style="font-size:15px;line-height:1.6;color:#3a3a3a;margin:0 0 16px;">
            Wij hebben uw concept-programma met ${itemCount} ${itemCount === 1 ? "onderdeel" : "onderdelen"} voor u bewaard. U kunt het op elk apparaat verder afmaken via onderstaande link.
          </p>
          <p style="margin:24px 0;">
            <a href="${recoveryUrl}" style="display:inline-block;background:#1a1a1a;color:#ffffff;text-decoration:none;padding:14px 28px;border-radius:4px;font-size:15px;font-family:Helvetica,Arial,sans-serif;">
              Programma openen
            </a>
          </p>
          <p style="font-size:13px;color:#7a6a4f;line-height:1.6;margin:24px 0 0;">
            De link blijft 30 dagen geldig. Heeft u dit niet aangevraagd? Dan kunt u deze e-mail negeren.
          </p>
        </td></tr>
        <tr><td style="padding:24px 32px;background:#f4f1ea;font-size:12px;color:#7a6a4f;line-height:1.5;">
          Bureau Vlieland · Vlieland · info@bureauvlieland.nl
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    if (isRateLimited(ip)) {
      return new Response(JSON.stringify({ error: "Te veel verzoeken." }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const parsed = PayloadSchema.safeParse(await req.json());
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: parsed.error.flatten().fieldErrors }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { email, payload, existingToken } = parsed.data;
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

    // 24h throttle per email: don't re-send recovery mail more than once per day.
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: recent } = await supabase
      .from("program_drafts")
      .select("id, last_email_sent_at")
      .ilike("email", email)
      .gt("last_email_sent_at", cutoff)
      .order("last_email_sent_at", { ascending: false })
      .limit(1);

    const shouldSendEmail = !recent || recent.length === 0;

    let token = existingToken || generateToken();
    let draftId: string | null = null;

    if (existingToken) {
      const { data: existing } = await supabase
        .from("program_drafts")
        .select("id")
        .eq("token", existingToken)
        .maybeSingle();
      if (existing) draftId = existing.id;
      else token = generateToken();
    }

    const newExpiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    if (draftId) {
      const update: Record<string, unknown> = { email, payload, expires_at: newExpiry };
      if (shouldSendEmail) update.last_email_sent_at = new Date().toISOString();
      await supabase.from("program_drafts").update(update).eq("id", draftId);
    } else {
      const { data: inserted, error } = await supabase
        .from("program_drafts")
        .insert({
          token,
          email,
          payload,
          source: "exit_intent",
          last_email_sent_at: shouldSendEmail ? new Date().toISOString() : null,
          email_send_count: shouldSendEmail ? 1 : 0,
        })
        .select("id")
        .single();
      if (error) {
        console.error("insert error", error);
        return new Response(JSON.stringify({ error: "DB_ERROR" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      draftId = inserted.id;
    }

    if (shouldSendEmail) {
      const origin = getOrigin(req);
      const recoveryUrl = `${origin}/concept/${token}`;
      const itemCount = Array.isArray(payload.cartItems) ? payload.cartItems.length : 0;
      const subject = `${getSubjectPrefix(origin)}Uw programma staat klaar — Bureau Vlieland`;
      const html = buildEmailHtml(recoveryUrl, itemCount);
      // Via de gedeelde verzender (blokkadelijst, exacte MessageID) en gelogd
      // volgens het e-mail-logging-contract; zonder logregel kon de
      // terugkoppeling van Mailjet op deze mail nergens op matchen.
      const recipient = getRecipientEmail(email, origin);
      const result = await sendMailjet({
        source: "save-program-draft",
        messages: [{
          From: { Email: SENDER_EMAIL, Name: SENDER_NAME },
          To: [{ Email: recipient }],
          Subject: subject,
          HTMLPart: html,
        }],
      });
      await logEmail({
        email_type: "program_draft_link",
        subject,
        recipient_email: recipient,
        status: result.ok ? "sent" : "failed",
        error_message: result.ok ? undefined : result.error,
        mailjet_message_id: result.ok ? (result.messageId ?? undefined) : undefined,
        sent_by: "system",
        html_body: html,
        metadata: {
          template_name: "program_draft_link",
          actor: "system → klant (concept bewaard)",
          draft_id: draftId,
          item_count: itemCount,
          skipped: result.ok ? (result.skipped ?? null) : null,
        },
      });
      if (!result.ok) console.error("save-program-draft: mail niet verstuurd:", result.error);
    }

    return new Response(JSON.stringify({ token, emailSent: shouldSendEmail }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("save-program-draft error", e);
    return new Response(JSON.stringify({ error: "INTERNAL_ERROR" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
