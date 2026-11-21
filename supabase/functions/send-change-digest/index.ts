// Dagelijkse bundel van wijzigingsmails (docs/plan-notificaties.md, fase 3).
//
// publish-program-changes en update-customer-program zetten hun
// "programma bijgewerkt"-mails in pending_change_notifications. Deze functie
// draait om 17:00 (cron send-change-digest-daily), leest de onverzonden rijen,
// stuurt per ontvanger en dossier één mail en zet sent_at + email_log_id.
// Rijen van dossiers die intussen geannuleerd, verwijderd of gearchiveerd zijn
// worden overgeslagen (sent_at gezet, skipped_reason gevuld). Een tweede run
// zonder nieuwe rijen stuurt niets.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SENDER_EMAIL, SENDER_NAME, wrapEmailHtml } from "../_shared/email-templates.ts";
import { logEmail } from "../_shared/email-logger.ts";
import { sendMailjet } from "../_shared/mailjet-send.ts";
import { isAnonBearer } from "../_shared/jwt-role.ts";
import {
  buildChangeDigestEmail,
  DIGEST_TEMPLATE_NAME,
  digestEmailType,
  groupPendingChanges,
  skipReasonFor,
  type ChangeDigestGroup,
  type DigestRequestState,
  type PendingChangeRow,
} from "../_shared/changeDigest.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const admin = createClient(supabaseUrl, serviceKey);

    // Toegang: de cron-job (anon key als Bearer-token; verify_jwt staat aan,
    // de gateway heeft de handtekening gecontroleerd) of een ingelogde admin.
    const authHeader = req.headers.get("authorization");
    let allowed = isAnonBearer(authHeader);
    if (!allowed && authHeader?.startsWith("Bearer ")) {
      const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
      const { data: { user } } = await userClient.auth.getUser();
      if (user) {
        const { data: role } = await admin.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle();
        allowed = !!role;
      }
    }
    if (!allowed) return json({ error: "Unauthorized" }, 401);

    const { data: rows, error: rowsErr } = await admin
      .from("pending_change_notifications")
      .select("id, request_id, recipient_kind, recipient_email, partner_id, payload, created_at")
      .is("sent_at", null)
      .order("created_at", { ascending: true });
    if (rowsErr) throw rowsErr;

    const pending = (rows ?? []) as PendingChangeRow[];
    if (pending.length === 0) {
      console.log("send-change-digest: niets te versturen");
      return json({ ok: true, groups: 0, sent: 0, skipped: 0, failed: 0 });
    }

    const groups = groupPendingChanges(pending);
    const requestIds = [...new Set(groups.map((g) => g.request_id))];
    const { data: requests } = await admin
      .from("program_requests")
      .select("id, status, cancelled_at, archived_at")
      .in("id", requestIds);
    const requestById = new Map<string, DigestRequestState>(((requests ?? []) as DigestRequestState[]).map((r) => [r.id, r]));

    const nowIso = new Date().toISOString();
    const today = nowIso.slice(0, 10);
    let sent = 0;
    let skipped = 0;
    let failed = 0;

    const markRows = async (group: ChangeDigestGroup, patch: Record<string, unknown>) => {
      const { error } = await admin.from("pending_change_notifications").update(patch).in("id", group.row_ids);
      if (error) console.error("send-change-digest: rijen bijwerken mislukt", { key: group.key, error });
    };

    for (const group of groups) {
      const skipReason = skipReasonFor(requestById.get(group.request_id));
      if (skipReason) {
        await markRows(group, { sent_at: nowIso, skipped_reason: skipReason });
        skipped += 1;
        continue;
      }

      const mail = buildChangeDigestEmail(group);
      const html = await wrapEmailHtml(mail.html, admin);
      const emailType = digestEmailType(group.recipient_kind);
      const idempotencyKey = `change-digest:${today}:${group.key}`;
      const message = {
        From: { Email: SENDER_EMAIL, Name: SENDER_NAME },
        To: [{ Email: group.recipient_email, Name: group.payload.recipient_name }],
        ...(mail.replyTo ? { ReplyTo: mail.replyTo } : {}),
        Subject: mail.subject,
        HTMLPart: html,
      };

      const result = await sendMailjet({ source: "send-change-digest", messages: [message] });
      const ok = result.ok;
      await logEmail({
        email_type: emailType,
        subject: mail.subject,
        recipient_email: group.recipient_email,
        recipient_name: group.payload.recipient_name,
        related_request_id: group.request_id,
        related_partner_id: group.partner_id ?? undefined,
        status: ok ? "sent" : "failed",
        error_message: ok ? undefined : result.error,
        mailjet_message_id: ok ? result.messageId ?? undefined : undefined,
        sent_by: "send-change-digest",
        html_body: html,
        reply_to: mail.replyTo?.Email,
        idempotency_key: idempotencyKey,
        metadata: {
          template_name: DIGEST_TEMPLATE_NAME,
          actor: group.recipient_kind === "customer" ? "systeem → klant (dagelijkse bundel)" : "systeem → partner (dagelijkse bundel)",
          change_count: group.payload.changes.length,
          bundled_rows: group.row_ids.length,
          reference_number: group.payload.reference_number,
        },
      });

      if (!ok) {
        // Rij blijft onverzonden: de volgende run probeert het opnieuw.
        console.error("send-change-digest: versturen mislukt", { key: group.key, error: result.error });
        failed += 1;
        continue;
      }

      const { data: logRow } = await admin
        .from("email_log")
        .select("id")
        .eq("idempotency_key", idempotencyKey)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      await markRows(group, { sent_at: nowIso, email_log_id: logRow?.id ?? null });
      sent += 1;
    }

    console.log(`send-change-digest: ${groups.length} groepen, ${sent} verstuurd, ${skipped} overgeslagen, ${failed} mislukt`);
    return json({ ok: true, groups: groups.length, sent, skipped, failed });
  } catch (err) {
    console.error("send-change-digest error:", err);
    return json({ error: String(err) }, 500);
  }
});
