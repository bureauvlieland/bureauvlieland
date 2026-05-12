import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  sanitizeHtml,
  formatDateNL,
  getPortalBaseUrl,
  isTestMode,
  getSubjectPrefix,
  getRecipientEmail,
  buildReplyTo,
  renderEffectiveTimeLine,
} from "../_shared/email-templates.ts";
import { logEmail, EmailTypes } from "../_shared/email-logger.ts";

const MAILJET_API_KEY = Deno.env.get("MAILJET_API_KEY");
const MAILJET_SECRET_KEY = Deno.env.get("MAILJET_SECRET_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const sendEmailViaMailjet = async (messages: any[]) => {
  const auth = btoa(`${MAILJET_API_KEY}:${MAILJET_SECRET_KEY}`);
  const response = await fetch("https://api.mailjet.com/v3.1/send", {
    method: "POST",
    headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/json" },
    body: JSON.stringify({ Messages: messages }),
  });
  if (!response.ok) {
    const errorText = await response.text();
    console.error("Mailjet API error:", errorText);
    throw new Error("EMAIL_SERVICE_ERROR");
  }
  return await response.json();
};

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    const { request_id, partner_ids, origin } = await req.json();
    if (!request_id || !Array.isArray(partner_ids) || partner_ids.length === 0) {
      return new Response(JSON.stringify({ error: "request_id en partner_ids verplicht" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const subjectPrefix = getSubjectPrefix(origin);
    const testMode = isTestMode(origin);

    const { data: program } = await supabase
      .from("program_requests").select("*").eq("id", request_id).single();
    if (!program) {
      return new Response(JSON.stringify({ error: "Project niet gevonden" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: items } = await supabase
      .from("program_request_items")
      .select("id, block_name, provider_id, provider_name, preferred_time, proposed_time, confirmed_time, day_index")
      .eq("request_id", request_id)
      .in("provider_id", partner_ids)
      .neq("status", "cancelled");

    const { data: partners } = await supabase
      .from("partners").select("id, name, email, contact_email").in("id", partner_ids);
    const partnerMap = new Map((partners || []).map((p: any) => [p.id, p]));

    const baseUrl = getPortalBaseUrl(origin);
    const portalUrl = `${baseUrl}/partner/login`;
    const formattedDates = (program.selected_dates as string[]).map(formatDateNL).join(", ");

    const messages: any[] = [];
    const logs: any[] = [];
    const notified: string[] = [];

    for (const pid of partner_ids) {
      const partner = partnerMap.get(pid);
      if (!partner) continue;
      const email = partner.contact_email || partner.email;
      if (!email) continue;
      const partnerItems = (items || []).filter((i: any) => i.provider_id === pid);
      if (partnerItems.length === 0) continue;

      const itemsHtml = partnerItems.map((it: any) => {
        return `<li style="margin-bottom:12px;"><strong>${sanitizeHtml(it.block_name)}</strong>${renderEffectiveTimeLine(it, "Tijd")}</li>`;
      }).join("");

      const html = `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#333;">
          <h2 style="color:#1a365d;border-bottom:2px solid #1a365d;padding-bottom:10px;">Bevestiging boeking via Bureau Vlieland</h2>
          <p>Beste ${sanitizeHtml(partner.name)},</p>
          <p>Hierbij ter informatie en bevestiging een boeking die eerder rechtstreeks met jullie is afgestemd. Deze is nu ook in ons systeem (en jullie partnerportaal) zichtbaar.</p>
          <div style="background:#f7fafc;padding:20px;border-radius:8px;margin:20px 0;">
            <h3 style="margin-top:0;color:#2d3748;">📅 Programma details</h3>
            <table style="width:100%;border-collapse:collapse;">
              <tr><td style="padding:5px 0;color:#666;">Referentie:</td><td><strong>${program.reference_number || "-"}</strong></td></tr>
              <tr><td style="padding:5px 0;color:#666;">Datum(s):</td><td><strong>${formattedDates}</strong></td></tr>
              <tr><td style="padding:5px 0;color:#666;">Aantal personen:</td><td><strong>${program.number_of_people}</strong></td></tr>
            </table>
          </div>
          <div style="background:#edf7ed;padding:20px;border-radius:8px;margin:20px 0;border-left:4px solid #48bb78;">
            <h3 style="margin-top:0;color:#276749;">🎯 Onderdelen bij jullie (reeds bevestigd)</h3>
            <ul style="padding-left:20px;margin-bottom:0;">${itemsHtml}</ul>
          </div>
          <div style="background:#ebf8ff;padding:20px;border-radius:8px;margin:20px 0;border-left:4px solid #4299e1;">
            <p style="margin:0 0 12px;">Je vindt deze boeking nu ook terug in je partnerportaal.</p>
            <a href="${portalUrl}" style="display:inline-block;background:#1a365d;color:#fff;text-decoration:none;padding:12px 24px;border-radius:6px;font-weight:600;">Ga naar partnerportaal →</a>
          </div>
          <hr style="border:none;border-top:1px solid #e2e8f0;margin:30px 0;">
          <p style="color:#666;font-size:14px;">Geen actie vereist — dit is een informatieve bevestiging. Heb je vragen, neem dan even contact met ons op.</p>
          <p style="margin-top:30px;">Met vriendelijke groet,<br><strong>Bureau Vlieland</strong><br>📧 <a href="mailto:hallo@bureauvlieland.nl">hallo@bureauvlieland.nl</a><br>📞 0562 700 208</p>
        </div>`;

      const recipient = getRecipientEmail(email, origin);
      const subject = `${subjectPrefix}Bevestiging boeking via Bureau Vlieland — ${program.reference_number || ""}`;

      messages.push({
        From: { Email: "hallo@bureauvlieland.nl", Name: "Bureau Vlieland" },
        To: [{ Email: recipient, Name: partner.name }],
        ...(buildReplyTo(program.reference_number) ? { ReplyTo: buildReplyTo(program.reference_number) } : {}),
        Subject: subject,
        HTMLPart: html,
      });

      logs.push({
        email_type: EmailTypes.PROGRAM_REQUEST_PARTNER,
        subject,
        recipient_email: recipient,
        recipient_name: partner.name,
        related_request_id: program.id,
        related_partner_id: pid,
        status: "pending",
        sent_by: "admin",
        metadata: { item_count: partnerItems.length, informational: true, test_mode: testMode },
      });

      notified.push(pid);
    }

    if (messages.length > 0) {
      try {
        const resp = await sendEmailViaMailjet(messages);
        for (let i = 0; i < logs.length; i++) {
          logs[i].status = "sent";
          logs[i].mailjet_message_id = resp?.Messages?.[i]?.MessageID?.toString() || null;
          await logEmail(logs[i]);
        }
      } catch (e) {
        for (const log of logs) {
          log.status = "failed";
          log.error_message = e instanceof Error ? e.message : "Unknown";
          await logEmail(log);
        }
        throw e;
      }
    }

    await supabase.from("program_request_history").insert({
      request_id: program.id,
      action: "admin_sent_informational_to_partners",
      actor: "admin",
      actor_name: "Admin",
      notes: `Informatieve bevestiging verstuurd naar ${notified.length} partner(s): ${notified.join(", ")}.`,
    });

    return new Response(JSON.stringify({ success: true, notified }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error(e);
    return new Response(JSON.stringify({ error: e?.message || "error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
