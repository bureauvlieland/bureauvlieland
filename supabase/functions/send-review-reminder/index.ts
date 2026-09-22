// send-review-reminder
//
// Eén herinnering voor Google (docs/plan-reviews-oogsten.md, fase 4): wie de
// eigen beoordeling invulde maar niet op de Google-knop klikte, krijgt na
// zeven dagen één mail met de eigen tekst erbij. Meer niet. Uitzetbaar met
// de instelling customer_review_reminder_enabled; per beoordeling over te
// slaan met reminder_skipped_at.
//
// Aanroepen: dagelijks door check-pending-items (service role) met
// { mode: "due" }, of door een admin met { review_id } ("Herinner nu").

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
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

export const BodySchema = z
  .object({
    review_id: z.string().uuid().optional(),
    mode: z.literal("due").optional(),
    origin: z.string().optional(),
    sent_by: z.string().max(120).optional(),
  })
  .refine((b) => Boolean(b.review_id) || b.mode === "due", { message: "review_id of mode 'due' is verplicht" });

export const DEFAULT_DAYS = 7;
export const DEFAULT_GOOGLE_URL = "https://g.page/r/CREi-TJGNt7kEAE/review";

export interface ReminderReview {
  id: string;
  request_id: string | null;
  source: string;
  text_positive: string;
  author_name: string;
  created_at: string;
  google_clicked_at: string | null;
  reminder_sent_at: string | null;
  reminder_skipped_at: string | null;
}

export interface ReminderProgram {
  id: string;
  reference_number: string | null;
  customer_name: string;
  customer_email: string | null;
  review_token: string | null;
  status: string | null;
  cancelled_at: string | null;
}

/** Toe aan de herinnering: eigen beoordeling, geen Google-klik, niet eerder herinnerd of overgeslagen, minstens `days` dagen oud. */
export function isDue(review: ReminderReview, now: Date, days: number): boolean {
  if (review.source !== "portal") return false;
  if (review.google_clicked_at || review.reminder_sent_at || review.reminder_skipped_at) return false;
  const created = new Date(review.created_at).getTime();
  if (!Number.isFinite(created)) return false;
  return created <= now.getTime() - days * 86_400_000;
}

/** Waarom een beoordeling geen herinnering krijgt, of null als versturen kan. */
export function skipReason(program: ReminderProgram | null): string | null {
  if (!program) return "programma niet gevonden";
  if (!program.customer_email) return "geen e-mailadres";
  if (program.cancelled_at || program.status === "cancelled") return "programma geannuleerd";
  if (!program.review_token) return "geen beoordelingslink";
  return null;
}

export function reminderVariables(review: ReminderReview, program: ReminderProgram, googleUrl: string, ownUrl: string) {
  return {
    customer_name: sanitizeHtml(review.author_name || program.customer_name || "gast"),
    reference_number: program.reference_number || "",
    review_text: sanitizeHtml(review.text_positive || "").replace(/\r?\n/g, "<br>"),
    google_review_url: googleUrl,
    own_review_url: ownUrl,
  };
}

const REVIEW_COLUMNS = "id, request_id, source, text_positive, author_name, created_at, google_clicked_at, reminder_sent_at, reminder_skipped_at";
const PROGRAM_COLUMNS = "id, reference_number, customer_name, customer_email, review_token, status, cancelled_at";

export const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, serviceKey);

    // ── Auth: het systeem (service role) of een admin ────────────────────
    const jwt = (req.headers.get("Authorization") ?? "").replace("Bearer ", "");
    if (!jwt) return json(401, { error: "Unauthorized" });
    let actor = "system";
    if (jwt !== serviceKey) {
      const { data: { user }, error: authError } = await supabase.auth.getUser(jwt);
      if (authError || !user) return json(401, { error: "Unauthorized" });
      const { data: roleData } = await supabase.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle();
      if (!roleData) return json(403, { error: "Admin access required" });
      actor = user.email ?? "admin";
    }

    const parsed = BodySchema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) return json(400, { error: parsed.error.issues[0]?.message ?? "Ongeldige aanvraag" });
    const { review_id, mode, origin } = parsed.data;
    const sentBy = parsed.data.sent_by ?? actor;

    // ── Instellingen ─────────────────────────────────────────────────────
    const { data: settings } = await supabase
      .from("app_settings")
      .select("id, value")
      .in("id", ["customer_review_reminder_enabled", "customer_review_reminder_days", "customer_aftersales_google_url"]);
    const setting = (id: string) => settings?.find((s: { id: string; value: unknown }) => s.id === id)?.value;
    const enabled = setting("customer_review_reminder_enabled") !== false;
    const days = Number(setting("customer_review_reminder_days") ?? DEFAULT_DAYS) || DEFAULT_DAYS;
    const googleRaw = setting("customer_aftersales_google_url");
    const googleUrl = typeof googleRaw === "string" && googleRaw.trim() ? googleRaw.trim() : DEFAULT_GOOGLE_URL;

    if (mode === "due" && !enabled) return json(200, { sent: 0, skipped: 0, failed: 0, disabled: true });

    const mailjetKey = Deno.env.get("MAILJET_API_KEY");
    const mailjetSecret = Deno.env.get("MAILJET_SECRET_KEY");
    if (!mailjetKey || !mailjetSecret) return json(500, { error: "Mailjet niet geconfigureerd" });

    // ── Welke beoordelingen ──────────────────────────────────────────────
    const now = new Date();
    let query = supabase.from("customer_reviews").select(REVIEW_COLUMNS);
    if (review_id) {
      query = query.eq("id", review_id);
    } else {
      const cutoff = new Date(now.getTime() - days * 86_400_000).toISOString();
      query = query
        .eq("source", "portal")
        .is("google_clicked_at", null)
        .is("reminder_sent_at", null)
        .is("reminder_skipped_at", null)
        .lte("created_at", cutoff);
    }
    const { data: reviews, error: reviewsError } = await query;
    if (reviewsError) throw reviewsError;
    if (review_id && (!reviews || reviews.length === 0)) return json(404, { error: "Beoordeling niet gevonden" });

    let sent = 0;
    let skipped = 0;
    let failed = 0;
    const auth = btoa(`${mailjetKey}:${mailjetSecret}`);

    for (const review of (reviews ?? []) as ReminderReview[]) {
      if (mode === "due" && !isDue(review, now, days)) {
        skipped++;
        continue;
      }
      const { data: program } = review.request_id
        ? await supabase.from("program_requests").select(PROGRAM_COLUMNS).eq("id", review.request_id).maybeSingle()
        : { data: null };
      const reason = skipReason((program as ReminderProgram | null) ?? null);
      if (reason || !program) {
        console.log(`[send-review-reminder] ${review.id} overgeslagen: ${reason}`);
        skipped++;
        continue;
      }
      const prog = program as ReminderProgram;
      const ownUrl = `${getPortalBaseUrl(origin)}/beoordeling/${prog.review_token}`;
      const vars = reminderVariables(review, prog, googleUrl, ownUrl);
      const mail = await getRenderedTemplate(TemplateIds.CUSTOMER_REVIEW_GOOGLE_REMINDER, {
        customer_name: vars.customer_name,
        reference_number: vars.reference_number,
        review_text: vars.review_text,
        google_review_url: vars.google_review_url,
        own_review_url: vars.own_review_url,
      });
      if (!mail) {
        console.error("[send-review-reminder] template customer_review_google_reminder niet gevonden of inactief");
        failed++;
        continue;
      }
      const recipient = getRecipientEmail(prog.customer_email as string, origin);
      const subject = `${getSubjectPrefix(origin)}${mail.subject}`;
      const replyTo = buildReplyTo(prog.reference_number);

      const mjRes = await fetch("https://api.mailjet.com/v3.1/send", {
        method: "POST",
        headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          Messages: [
            {
              From: { Email: SENDER_EMAIL, Name: SENDER_NAME },
              To: [{ Email: recipient, Name: review.author_name || prog.customer_name || "" }],
              ...(replyTo ? { ReplyTo: replyTo } : {}),
              Subject: subject,
              HTMLPart: mail.body,
            },
          ],
        }),
      });
      let messageId: string | null = null;
      try {
        messageId = extractMessageIds(await mjRes.clone().text())[0] ?? null;
      } catch {
        /* geen JSON */
      }

      const logBase = {
        mailjet_message_id: messageId ?? undefined,
        email_type: "customer_review_google_reminder",
        subject,
        recipient_email: recipient,
        recipient_name: review.author_name || prog.customer_name || undefined,
        related_request_id: prog.id,
        sent_by: sentBy,
        metadata: { template_name: "customer_review_google_reminder", actor: "bureau → klant (herinnering Google)", review_id: review.id },
      };

      if (!mjRes.ok) {
        const errTxt = await mjRes.text();
        console.error("[send-review-reminder] Mailjet:", errTxt);
        await logEmail({ ...logBase, status: "failed", error_message: errTxt.slice(0, 500) });
        failed++;
        continue;
      }

      await logEmail({ ...logBase, status: "sent" });
      await supabase.from("customer_reviews").update({ reminder_sent_at: new Date().toISOString() }).eq("id", review.id);
      sent++;
    }

    return json(200, { sent, skipped, failed });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[send-review-reminder] failed:", message);
    return json(500, { error: message });
  }
};

if (import.meta.main) Deno.serve(handler);
