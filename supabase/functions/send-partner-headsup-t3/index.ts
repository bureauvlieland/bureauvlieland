// Sends a "heads-up T-3" email to partners exactly 3 days before an
// accepted activity, with the latest state of affairs (date, time, people,
// location, guest list, dietary notes, admin instructions).
//
// Trigger: daily cron (pg_cron) at 08:00 NL. Idempotent via email_log dedup
// on (email_type='partner_headsup_t3', related_item_id).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  getPortalBaseUrl,
  getSubjectPrefix,
  getRecipientEmail,
  formatDateNL,
  getEffectiveItemTime,
  buildReplyTo,
  SENDER_EMAIL,
  SENDER_NAME,
} from "../_shared/email-templates.ts";
import { logEmail } from "../_shared/email-logger.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const EMAIL_TYPE = "partner_headsup_t3";

function escapeHtml(s: string | null | undefined): string {
  if (s == null) return "";
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function nlToBr(s: string | null | undefined): string {
  return escapeHtml(s).replace(/\n/g, "<br>");
}

// Build target date string (YYYY-MM-DD) in Europe/Amsterdam, today + offsetDays.
function targetDateNL(offsetDays: number): string {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Amsterdam",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const now = new Date();
  now.setUTCDate(now.getUTCDate() + offsetDays);
  return fmt.format(now);
}

interface ItemRow {
  id: string;
  request_id: string;
  block_name: string;
  block_category: string | null;
  block_type: string | null;
  provider_id: string | null;
  provider_name: string | null;
  provider_email: string | null;
  preferred_time: string | null;
  proposed_time: string | null;
  confirmed_time: string | null;
  day_index: number | null;
  override_people: number | null;
  partner_instructions: string | null;
  admin_price_notes: string | null;
  location_address: string | null;
  duration: number | null;
  status: string | null;
  skip_partner_notification: boolean | null;
}

interface RequestRow {
  id: string;
  reference_number: string | null;
  customer_name: string | null;
  customer_company: string | null;
  number_of_people: number | null;
  selected_dates: string[] | null;
  status: string | null;
  cancelled_at: string | null;
  invoicing_mode: string | null;
  guest_names: string | null;
  dietary_notes: string | null;
  guest_details_updated_at: string | null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    let dryRun = false;
    let offsetDays = 3;
    try {
      const body = await req.json();
      dryRun = !!body?.dry_run;
      if (typeof body?.offset_days === "number") offsetDays = body.offset_days;
    } catch {/* no body */}

    const origin = req.headers.get("origin") || "https://bureauvlieland.nl";
    const baseUrl = getPortalBaseUrl(origin);
    const subjectPrefix = getSubjectPrefix(origin);
    const target = targetDateNL(offsetDays);

    // 1) Candidate items: accepted, not skipped, real partner provider, not bureau/self_arranged.
    const { data: items, error: itemsErr } = await supabase
      .from("program_request_items")
      .select(
        "id, request_id, block_name, block_category, block_type, provider_id, provider_name, provider_email, preferred_time, proposed_time, confirmed_time, day_index, override_people, partner_instructions, admin_price_notes, location_address, duration, status, skip_partner_notification",
      )
      .eq("status", "accepted")
      .eq("skip_partner_notification", false)
      .not("provider_id", "is", null)
      .neq("provider_id", "bureau")
      .not("block_type", "in", "(bureau,self_arranged)");

    if (itemsErr) throw itemsErr;

    if (!items || items.length === 0) {
      return new Response(JSON.stringify({ sent: 0, target, matched: [], message: "no candidate items" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const requestIds = [...new Set(items.map((i: ItemRow) => i.request_id))];

    const { data: requests } = await supabase
      .from("program_requests")
      .select(
        "id, reference_number, customer_name, customer_company, number_of_people, selected_dates, status, cancelled_at, invoicing_mode, guest_names, dietary_notes, guest_details_updated_at",
      )
      .in("id", requestIds);

    const reqMap = new Map<string, RequestRow>((requests || []).map((r: RequestRow) => [r.id, r]));

    // 2) Filter items whose activity_date equals today + offset.
    type Eligible = { item: ItemRow; request: RequestRow; activityDate: string };
    const eligible: Eligible[] = [];
    for (const it of items as ItemRow[]) {
      const r = reqMap.get(it.request_id);
      if (!r) continue;
      if (r.cancelled_at) continue;
      const s = (r.status || "").toLowerCase();
      if (s === "cancelled" || s === "geannuleerd") continue;
      const dates = (r.selected_dates as string[]) || [];
      if (!dates.length) continue;
      const sorted = [...dates].sort();
      const dayIdx = typeof it.day_index === "number" && it.day_index >= 0 ? it.day_index : 0;
      const activityDate = sorted[dayIdx] ?? sorted[0];
      if (activityDate !== target) continue;
      eligible.push({ item: it, request: r, activityDate });
    }

    if (eligible.length === 0) {
      return new Response(JSON.stringify({ sent: 0, target, matched: [], message: "no items on target date" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 3) Skip items already sent.
    const itemIds = eligible.map((e) => e.item.id);
    const { data: sentLog } = await supabase
      .from("email_log")
      .select("related_item_id")
      .eq("email_type", EMAIL_TYPE)
      .eq("status", "sent")
      .in("related_item_id", itemIds);
    const alreadySent = new Set((sentLog || []).map((r: any) => r.related_item_id));

    // Guard: alleen items waarvoor ooit een initiële program_request_partner
    // mail naar deze partner is uitgegaan. Zo voorkomen we "ghost briefings"
    // voor items die door de admin met skip_partner_notification zijn ingevuld
    // of waarbij de partner nooit een aanvraag heeft gezien.
    const { data: initialSendLog } = await supabase
      .from("email_log")
      .select("related_item_id")
      .eq("email_type", "program_request_partner")
      .in("related_item_id", itemIds);
    const everSent = new Set((initialSendLog || []).map((r: any) => r.related_item_id));

    const toSend = eligible.filter((e) => !alreadySent.has(e.item.id) && everSent.has(e.item.id));

    // 4) Fetch partner contact emails.
    const partnerIds = [...new Set(toSend.map((e) => e.item.provider_id!).filter(Boolean))];
    let partnerMap = new Map<string, { id: string; name: string; email: string | null; contact_email: string | null }>();
    if (partnerIds.length > 0) {
      const { data: partners } = await supabase
        .from("partners")
        .select("id, name, email, contact_email")
        .in("id", partnerIds);
      partnerMap = new Map((partners || []).map((p: any) => [p.id, p]));
    }

    const apiKey = Deno.env.get("MAILJET_API_KEY");
    const secret = Deno.env.get("MAILJET_SECRET_KEY");

    const matched: any[] = [];
    const errors: string[] = [];
    let sent = 0;

    for (const e of toSend) {
      const { item, request, activityDate } = e;
      const partner = partnerMap.get(item.provider_id!);
      const partnerEmail =
        item.provider_email || (partner ? partner.contact_email || partner.email : null);
      if (!partnerEmail) {
        errors.push(`item ${item.id}: no partner email`);
        continue;
      }

      const partnerName = partner?.name || item.provider_name || "partner";
      const effectiveTime = getEffectiveItemTime(item);
      const people = item.override_people ?? request.number_of_people ?? null;
      const customerLabel = request.customer_company || request.customer_name || "klant";
      const showCatering = (item.block_category || "").toLowerCase() === "catering";
      const guestsUpdated = request.guest_details_updated_at
        ? formatDateNL(request.guest_details_updated_at)
        : null;

      matched.push({
        item_id: item.id,
        block: item.block_name,
        partner: partnerName,
        email: partnerEmail,
        activity_date: activityDate,
      });
      if (dryRun) continue;
      if (!apiKey || !secret) {
        errors.push("Mailjet credentials missing");
        continue;
      }

      const subject = `${subjectPrefix}Over 3 dagen: ${item.block_name} — ${formatDateNL(activityDate)}${request.reference_number ? ` (${request.reference_number})` : ""}`;

      const portalLink = `${baseUrl}/partner/login`;

      const html = `
<div style="font-family: Arial, sans-serif; color:#1f2937; max-width:640px; margin:0 auto;">
  <h2 style="color:#0F4C5C; margin-bottom:4px;">Heads-up: over 3 dagen op het programma</h2>
  <p style="margin-top:0; color:#6b7280;">Een korte update zodat je goed voorbereid bent op de uitvoering.</p>

  <div style="background:#f9fafb; border:1px solid #e5e7eb; border-radius:8px; padding:16px; margin:16px 0;">
    <h3 style="margin:0 0 8px; color:#0F4C5C;">${escapeHtml(item.block_name)}</h3>
    <table style="width:100%; border-collapse:collapse; font-size:14px;">
      <tr><td style="padding:4px 0; color:#6b7280; width:160px;">Datum</td><td><strong>${escapeHtml(formatDateNL(activityDate))}</strong></td></tr>
      ${effectiveTime ? `<tr><td style="padding:4px 0; color:#6b7280;">Tijd</td><td><strong>${escapeHtml(effectiveTime)}</strong></td></tr>` : ""}
      ${item.duration ? `<tr><td style="padding:4px 0; color:#6b7280;">Duur</td><td>${escapeHtml(String(item.duration))} min</td></tr>` : ""}
      ${people != null ? `<tr><td style="padding:4px 0; color:#6b7280;">Aantal personen</td><td><strong>${escapeHtml(String(people))}</strong></td></tr>` : ""}
      ${item.location_address ? `<tr><td style="padding:4px 0; color:#6b7280;">Locatie</td><td>${escapeHtml(item.location_address)}</td></tr>` : ""}
      ${request.reference_number ? `<tr><td style="padding:4px 0; color:#6b7280;">Project</td><td>${escapeHtml(request.reference_number)} — ${escapeHtml(customerLabel)}</td></tr>` : ""}
    </table>
  </div>

  ${
    item.partner_instructions
      ? `<div style="background:#fff7ed; border-left:4px solid #E36414; padding:12px 14px; border-radius:6px; margin:12px 0;">
          <div style="font-size:12px; text-transform:uppercase; letter-spacing:0.05em; color:#92400e; margin-bottom:4px;">Instructie van Bureau Vlieland</div>
          <div style="font-size:14px;">${nlToBr(item.partner_instructions)}</div>
        </div>`
      : ""
  }
  ${
    item.admin_price_notes
      ? `<div style="background:#f0f9ff; border-left:4px solid #0284c7; padding:12px 14px; border-radius:6px; margin:12px 0;">
          <div style="font-size:12px; text-transform:uppercase; letter-spacing:0.05em; color:#075985; margin-bottom:4px;">Toelichting</div>
          <div style="font-size:14px;">${nlToBr(item.admin_price_notes)}</div>
        </div>`
      : ""
  }

  ${
    request.guest_names || (showCatering && request.dietary_notes)
      ? `<div style="background:#ffffff; border:1px solid #e5e7eb; border-radius:8px; padding:14px; margin:12px 0;">
          <div style="font-weight:600; color:#0F4C5C; margin-bottom:6px;">Gastgegevens${guestsUpdated ? ` <span style="font-weight:400; color:#6b7280; font-size:12px;">— laatst bijgewerkt op ${escapeHtml(guestsUpdated)}</span>` : ""}</div>
          ${request.guest_names ? `<div style="font-size:13px; margin-bottom:8px;"><div style="color:#6b7280; margin-bottom:2px;">Gastenlijst</div>${nlToBr(request.guest_names)}</div>` : ""}
          ${showCatering && request.dietary_notes ? `<div style="font-size:13px;"><div style="color:#6b7280; margin-bottom:2px;">Dieetwensen</div>${nlToBr(request.dietary_notes)}</div>` : ""}
        </div>`
      : ""
  }

  ${
    request.invoicing_mode === "bureau_central"
      ? `<p style="font-size:13px; color:#475569; background:#f1f5f9; padding:10px 12px; border-radius:6px;">
          <strong>Facturatie via Bureau Vlieland.</strong> Je factureert Bureau Vlieland (niet de klant) en uploadt je factuur via de knop "Factuur registreren" in het partnerportaal.
        </p>`
      : ""
  }

  <p style="margin:20px 0;">
    <a href="${portalLink}" style="background:#0F4C5C; color:#fff; padding:10px 18px; border-radius:6px; text-decoration:none; display:inline-block;">Bekijk in partnerportaal</a>
  </p>

  <p style="font-size:13px; color:#6b7280;">Heb je nog vragen of wijzigingen? Reply gerust op deze e-mail — die komt direct in het projectdossier terecht.</p>
  <p style="font-size:13px; color:#6b7280;">Met vriendelijke groet,<br>Bureau Vlieland</p>
</div>`;

      const recipientEmail = getRecipientEmail(partnerEmail, origin);
      const replyTo = buildReplyTo(request.reference_number);

      const resp = await fetch("https://api.mailjet.com/v3.1/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Basic ${btoa(`${apiKey}:${secret}`)}`,
        },
        body: JSON.stringify({
          Messages: [{
            TrackClicks: "disabled",
            TrackOpens: "disabled",
            From: { Email: SENDER_EMAIL, Name: SENDER_NAME },
            To: [{ Email: recipientEmail, Name: partnerName }],
            ...(replyTo ? { ReplyTo: replyTo } : {}),
            Subject: subject,
            HTMLPart: html,
          }],
        }),
      });

      const respText = await resp.text();
      let mjMessageId: string | undefined;
      try {
        const j = JSON.parse(respText);
        mjMessageId = j?.Messages?.[0]?.To?.[0]?.MessageID?.toString();
      } catch {/* ignore */}

      await logEmail({
        email_type: EMAIL_TYPE,
        subject,
        recipient_email: recipientEmail,
        recipient_name: partnerName,
        related_request_id: request.id,
        related_partner_id: item.provider_id!,
        related_item_id: item.id,
        status: resp.ok ? "sent" : "failed",
        error_message: resp.ok ? undefined : respText.slice(0, 1000),
        mailjet_message_id: mjMessageId ?? undefined,
        sent_by: "system:cron",
        metadata: {
          template_name: EMAIL_TYPE,
          actor: "system → partner (T-3 heads-up)",
          activity_date: activityDate,
          item_id: item.id,
          partner_id: item.provider_id,
          request_id: request.id,
        },
      });

      // Dossier-visibiliteit loopt via email_log (geen extra project_communications-insert nodig).



      if (resp.ok) sent++;
      else errors.push(`item ${item.id}: ${respText.slice(0, 300)}`);
    }

    return new Response(
      JSON.stringify({ sent, dryRun, target, matched, skipped_already_sent: alreadySent.size, errors }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("send-partner-headsup-t3 error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
