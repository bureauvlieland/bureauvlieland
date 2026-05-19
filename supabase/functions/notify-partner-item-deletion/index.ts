import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  sanitizeHtml,
  getSubjectPrefix,
  getRecipientEmail,
  buildReplyTo,
  SENDER_EMAIL,
  SENDER_NAME,
} from "../_shared/email-templates.ts";
import { logEmail } from "../_shared/email-logger.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MAILJET_API_KEY = Deno.env.get("MAILJET_API_KEY");
const MAILJET_SECRET_KEY = Deno.env.get("MAILJET_SECRET_KEY");

interface LegacyPartner {
  partner_id: string;
  item_names: string[];
  item_ids?: string[];
}

interface RequestPayload {
  request_id: string;
  item_ids?: string[];
  origin?: string;
  legacy_partners?: LegacyPartner[]; // backfill mode: skip lookup, use provided partners
  delete_after?: boolean; // default true for normal flow
  intro_text?: string; // optional override
}

async function sendCancellationEmail(opts: {
  supabase: any;
  request_id: string;
  refNumber: string;
  partner_id: string;
  partner_name: string;
  partner_email: string;
  item_names: string[];
  item_ids?: string[];
  origin?: string;
  intro_text?: string;
}) {
  const { supabase, request_id, refNumber, partner_id, partner_name, partner_email, item_names, item_ids = [], origin, intro_text } = opts;

  const itemsList = item_names.map((n) => `• ${sanitizeHtml(n)}`).join("<br>");
  const subject = `${getSubjectPrefix(origin)}Onderdeel van aanvraag ${refNumber} komt te vervallen`;
  const intro = intro_text
    ? sanitizeHtml(intro_text)
    : `Hierbij laten we je weten dat de volgende onderde${item_names.length === 1 ? "el" : "len"} van aanvraag <strong>${sanitizeHtml(refNumber)}</strong> ${item_names.length === 1 ? "is" : "zijn"} komen te vervallen.`;

  const body = `
    <p>Beste ${sanitizeHtml(partner_name)},</p>
    <p>${intro}</p>
    <p>${itemsList}</p>
    <p>Excuses voor het ongemak — mocht je hier vragen over hebben, neem dan gerust contact met ons op.</p>
    <p>Met vriendelijke groet,<br>Bureau Vlieland</p>
  `;

  const recipientEmail = getRecipientEmail(partner_email, origin);

  const mjRes = await fetch("https://api.mailjet.com/v3.1/send", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Basic " + btoa(`${MAILJET_API_KEY}:${MAILJET_SECRET_KEY}`),
    },
    body: JSON.stringify({
      Messages: [{
        From: { Email: SENDER_EMAIL, Name: SENDER_NAME },
        To: [{ Email: recipientEmail, Name: partner_name }],
        Subject: subject,
        HTMLPart: body,
        ...(buildReplyTo(refNumber) ? { ReplyTo: buildReplyTo(refNumber) } : {}),
      }],
    }),
  });

  const mjData = await mjRes.json().catch(() => ({}));
  const messageId = mjData?.Messages?.[0]?.To?.[0]?.MessageID?.toString() || null;
  const status = mjRes.ok ? "sent" : "failed";
  const errorMessage = mjRes.ok ? null : JSON.stringify(mjData).slice(0, 1000);
  const sentAt = new Date().toISOString();
  const baseMetadata = {
    template_name: "partner_item_cancellation",
    actor: "admin → partner (annulering)",
    item_ids,
    item_count: item_ids.length,
  };

  // Eén log-rij per item zodat de mail-popover per onderdeel werkt
  const idsForLog = item_ids.length > 0 ? item_ids : [null];
  const rows = idsForLog.map((iid) => ({
    email_type: "partner_item_cancellation",
    subject,
    recipient_email: recipientEmail,
    recipient_name: partner_name,
    related_request_id: request_id,
    related_partner_id: partner_id,
    related_item_id: iid,
    status,
    error_message: errorMessage,
    mailjet_message_id: messageId,
    sent_at: status === "sent" ? sentAt : null,
    sent_by: "admin",
    metadata: baseMetadata,
  }));
  await supabase.from("email_log").insert(rows);

  await supabase.from("project_communications").insert({
    request_id,
    communication_type: "email_out",
    direction: "outbound",
    subject,
    content: `Annuleringsmelding (onderdeel) verstuurd naar ${partner_name}: ${item_names.join(", ")}`,
    contact_name: partner_name,
    contact_email: recipientEmail,
    metadata: { source: "email_log", email_type: "partner_item_cancellation" },
  }).then(() => {}, () => {});

  return mjRes.ok;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const payload = (await req.json()) as RequestPayload;
    const { request_id, item_ids = [], origin, legacy_partners, delete_after = true, intro_text } = payload;

    if (!request_id) {
      return new Response(JSON.stringify({ error: "request_id is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: program } = await supabase
      .from("program_requests")
      .select("id, reference_number")
      .eq("id", request_id)
      .single();

    if (!program) {
      return new Response(JSON.stringify({ error: "Program not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const refNumber = program.reference_number || "Onbekend";

    let emailsSent = 0;

    // ---- Legacy backfill mode ----
    if (legacy_partners && legacy_partners.length > 0) {
      const partnerIds = legacy_partners.map((p) => p.partner_id);
      const { data: partners } = await supabase
        .from("partners")
        .select("id, name, email, contact_email")
        .in("id", partnerIds);
      const pMap = new Map((partners || []).map((p: any) => [p.id, p]));

      for (const lp of legacy_partners) {
        const p = pMap.get(lp.partner_id);
        if (!p) continue;
        const email = p.contact_email || p.email;
        if (!email) continue;
        const ok = await sendCancellationEmail({
          supabase, request_id, refNumber,
          partner_id: lp.partner_id,
          partner_name: p.name,
          partner_email: email,
          item_names: lp.item_names,
          item_ids: lp.item_ids || [],
          origin, intro_text,
        });
        if (ok) emailsSent++;
      }

      return new Response(JSON.stringify({ success: true, emails_sent: emailsSent, mode: "legacy" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ---- Normal flow: notify partners for given item_ids and then delete ----
    if (item_ids.length === 0) {
      return new Response(JSON.stringify({ error: "item_ids required when no legacy_partners provided" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: items } = await supabase
      .from("program_request_items")
      .select("id, provider_id, provider_name, provider_email, block_name, block_type, status, skip_partner_notification, customer_approved_at")
      .in("id", item_ids);

    const allItems = items || [];

    // Determine which items need a notification
    const notifiable = allItems.filter((i: any) => {
      if (!i.provider_id || i.provider_id === "bureau") return false;
      if (i.block_type === "self_arranged" || i.block_type === "bureau") return false;
      // never sent to partner: skip
      if (i.skip_partner_notification && !i.customer_approved_at && i.status === "pending") return false;
      return true;
    });

    // Enrich missing emails
    const missingPartnerIds = [...new Set(notifiable.filter((i: any) => !i.provider_email && i.provider_id).map((i: any) => i.provider_id))];
    if (missingPartnerIds.length > 0) {
      const { data: partners } = await supabase
        .from("partners")
        .select("id, name, email, contact_email")
        .in("id", missingPartnerIds);
      const pMap = new Map((partners || []).map((p: any) => [p.id, p]));
      for (const it of notifiable) {
        if (!it.provider_email && it.provider_id) {
          const p = pMap.get(it.provider_id);
          if (p) {
            it.provider_email = p.contact_email || p.email;
            it.provider_name = it.provider_name || p.name;
          }
        }
      }
    }

    // Group per partner
    const groups = new Map<string, { name: string; email: string; items: string[]; itemIds: string[] }>();
    for (const it of notifiable) {
      if (!it.provider_email) continue;
      const key = it.provider_id;
      if (!groups.has(key)) groups.set(key, { name: it.provider_name || key, email: it.provider_email, items: [], itemIds: [] });
      groups.get(key)!.items.push(it.block_name);
      groups.get(key)!.itemIds.push(it.id);
    }

    for (const [pid, g] of groups) {
      const ok = await sendCancellationEmail({
        supabase, request_id, refNumber,
        partner_id: pid,
        partner_name: g.name,
        partner_email: g.email,
        item_names: g.items,
        item_ids: g.itemIds,
        origin,
      });
      if (ok) emailsSent++;
    }

    // Delete items
    let deleted = 0;
    if (delete_after) {
      const { error: delErr, count } = await supabase
        .from("program_request_items")
        .delete({ count: "exact" })
        .in("id", item_ids);
      if (delErr) {
        return new Response(JSON.stringify({ error: delErr.message, emails_sent: emailsSent }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      deleted = count || 0;
    }

    return new Response(JSON.stringify({
      success: true,
      emails_sent: emailsSent,
      items_deleted: deleted,
      notifiable_count: notifiable.length,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    console.error("notify-partner-item-deletion error:", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
