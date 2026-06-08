import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  sanitizeHtml,
  getPortalBaseUrl,
  isTestMode,
  getSubjectPrefix,
  getRecipientEmail,
} from "../_shared/email-templates.ts";
import { logEmail } from "../_shared/email-logger.ts";

const MAILJET_API_KEY = Deno.env.get("MAILJET_API_KEY");
const MAILJET_SECRET_KEY = Deno.env.get("MAILJET_SECRET_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const TEMPLATE_NAME = "partner_missing_pdf_reminder";
const REMINDER_COOLDOWN_DAYS = 5;

async function sendMailjet(messages: any[]) {
  const auth = btoa(`${MAILJET_API_KEY}:${MAILJET_SECRET_KEY}`);
  const resp = await fetch("https://api.mailjet.com/v3.1/send", {
    method: "POST",
    headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/json" },
    body: JSON.stringify({ Messages: messages }),
  });
  if (!resp.ok) {
    const text = await resp.text();
    console.error("Mailjet error:", text);
    throw new Error("EMAIL_SERVICE_ERROR");
  }
  return await resp.json();
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    const body = await req.json().catch(() => ({}));
    const mode: "bulk" | "auto" = body.mode === "auto" ? "auto" : "bulk";
    const partnerIdsFilter: string[] | null = Array.isArray(body.partnerIds) && body.partnerIds.length > 0
      ? body.partnerIds
      : null;
    const origin: string | undefined = body.origin;
    const dryRun: boolean = body.dryRun === true;

    const subjectPrefix = getSubjectPrefix(origin);
    const testMode = isTestMode(origin);
    const portalUrl = `${getPortalBaseUrl(origin)}/partner/financieel?missingPdf=1#gefactureerd`;

    // 1. Vind alle inkoopfacturen zonder PDF
    let query = supabase
      .from("partner_purchase_invoices")
      .select("id, partner_id, invoice_number, invoice_date, amount_incl_vat, request_id, created_at")
      .is("file_path", null);

    if (mode === "auto") {
      const threshold = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
      query = query.lt("created_at", threshold);
    }
    if (partnerIdsFilter) {
      query = query.in("partner_id", partnerIdsFilter);
    }

    const { data: invoices, error: invErr } = await query;
    if (invErr) throw invErr;
    if (!invoices || invoices.length === 0) {
      return new Response(JSON.stringify({ success: true, partners_notified: 0, invoices_referenced: 0 }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. Groepeer per partner
    const byPartner = new Map<string, typeof invoices>();
    for (const inv of invoices) {
      const arr = byPartner.get(inv.partner_id) ?? [];
      arr.push(inv);
      byPartner.set(inv.partner_id, arr);
    }

    // 3. Haal partner- en projectinfo op
    const partnerIds = [...byPartner.keys()];
    const requestIds = [...new Set(invoices.map((i: any) => i.request_id).filter(Boolean))];

    const [{ data: partners }, { data: programs }] = await Promise.all([
      supabase.from("partners").select("id, name, email, contact_email").in("id", partnerIds),
      requestIds.length
        ? supabase.from("program_requests").select("id, reference_number, customer_company, customer_name").in("id", requestIds)
        : Promise.resolve({ data: [] as any[] }),
    ]);

    const partnerMap = new Map((partners ?? []).map((p: any) => [p.id, p]));
    const programMap = new Map((programs ?? []).map((p: any) => [p.id, p]));

    // 4. Voor 'auto' mode: filter partners die recent al een reminder kregen
    let skipPartners = new Set<string>();
    if (mode === "auto") {
      const cooldown = new Date(Date.now() - REMINDER_COOLDOWN_DAYS * 24 * 60 * 60 * 1000).toISOString();
      const { data: recent } = await supabase
        .from("email_log")
        .select("related_partner_id, created_at")
        .eq("email_type", TEMPLATE_NAME)
        .gte("created_at", cooldown)
        .in("related_partner_id", partnerIds);
      for (const r of recent ?? []) {
        if (r.related_partner_id) skipPartners.add(r.related_partner_id);
      }
    }

    const messages: any[] = [];
    const logs: any[] = [];
    const logMsgIdx: number[] = [];
    const notifiedPartners: string[] = [];

    for (const pid of partnerIds) {
      if (skipPartners.has(pid)) continue;
      const partner = partnerMap.get(pid);
      if (!partner) continue;
      const email = partner.contact_email || partner.email;
      if (!email) continue;

      const pInvoices = byPartner.get(pid)!;

      const rowsHtml = pInvoices.map((inv: any) => {
        const prog = programMap.get(inv.request_id);
        const ref = prog?.reference_number ?? "—";
        const klant = prog?.customer_company || prog?.customer_name || "—";
        const dateStr = inv.invoice_date
          ? new Date(inv.invoice_date).toLocaleDateString("nl-NL")
          : "—";
        const amount = inv.amount_incl_vat != null
          ? `€${Number(inv.amount_incl_vat).toLocaleString("nl-NL", { minimumFractionDigits: 2 })}`
          : "—";
        return `<tr>
          <td style="padding:8px;border-bottom:1px solid #e2e8f0;"><strong>${sanitizeHtml(inv.invoice_number)}</strong></td>
          <td style="padding:8px;border-bottom:1px solid #e2e8f0;">${dateStr}</td>
          <td style="padding:8px;border-bottom:1px solid #e2e8f0;">${amount}</td>
          <td style="padding:8px;border-bottom:1px solid #e2e8f0;">${sanitizeHtml(ref)}<br><span style="color:#666;font-size:12px;">${sanitizeHtml(klant)}</span></td>
        </tr>`;
      }).join("");

      const n = pInvoices.length;
      const html = `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#333;">
          <h2 style="color:#9b1c1c;border-bottom:2px solid #9b1c1c;padding-bottom:10px;">Actie vereist — PDF ontbreekt</h2>
          <p>Beste ${sanitizeHtml(partner.name)},</p>
          <p>Je hebt ${n} factu${n === 1 ? "ur" : "ren"} bij Bureau Vlieland geregistreerd zonder PDF-bijlage.
          <strong>We kunnen je factu${n === 1 ? "ur" : "ren"} niet in behandeling nemen en niet doorsturen naar onze boekhouding zolang de PDF ontbreekt.</strong></p>

          <div style="background:#fef2f2;padding:16px;border-radius:8px;margin:20px 0;border-left:4px solid #9b1c1c;">
            <p style="margin:0;"><strong>Wat moet je doen?</strong><br>
            Log in op je partnerportaal → Financieel → tab <em>Gefactureerd</em> en klik bij elke regel met "PDF ontbreekt" op <em>PDF toevoegen</em>.</p>
          </div>

          <table style="width:100%;border-collapse:collapse;margin:20px 0;font-size:14px;">
            <thead>
              <tr style="background:#f7fafc;text-align:left;">
                <th style="padding:8px;border-bottom:2px solid #cbd5e0;">Factuurnr.</th>
                <th style="padding:8px;border-bottom:2px solid #cbd5e0;">Datum</th>
                <th style="padding:8px;border-bottom:2px solid #cbd5e0;">Bedrag</th>
                <th style="padding:8px;border-bottom:2px solid #cbd5e0;">Project / klant</th>
              </tr>
            </thead>
            <tbody>${rowsHtml}</tbody>
          </table>

          <p style="text-align:center;margin:24px 0;">
            <a href="${portalUrl}" style="display:inline-block;background:#9b1c1c;color:#fff;text-decoration:none;padding:12px 28px;border-radius:6px;font-weight:600;">PDF's nu toevoegen →</a>
          </p>

          <hr style="border:none;border-top:1px solid #e2e8f0;margin:30px 0;">
          <p style="color:#666;font-size:14px;">Vragen? Reageer op deze e-mail of bel ons op 0562 700 208.</p>
          <p style="margin-top:24px;">Met vriendelijke groet,<br><strong>Bureau Vlieland</strong></p>
        </div>`;

      const recipient = getRecipientEmail(email, origin);
      const subject = `${subjectPrefix}Actie vereist: PDF ontbreekt bij je inkoopfactu${n === 1 ? "ur" : "ren"}`;

      const msgIdx = messages.length;
      messages.push({
        From: { Email: "hallo@bureauvlieland.nl", Name: "Bureau Vlieland" },
        To: [{ Email: recipient, Name: partner.name }],
        Subject: subject,
        HTMLPart: html,
      });

      for (const inv of pInvoices) {
        logs.push({
          email_type: TEMPLATE_NAME,
          subject,
          recipient_email: recipient,
          recipient_name: partner.name,
          related_request_id: inv.request_id ?? null,
          related_partner_id: pid,
          status: "pending",
          sent_by: mode === "auto" ? "system" : "admin",
          metadata: {
            template_name: TEMPLATE_NAME,
            actor: mode === "auto" ? "system (cron)" : "admin (handmatig)",
            mode,
            invoice_count: pInvoices.length,
            invoice_ids: pInvoices.map((i: any) => i.id),
            test_mode: testMode,
          },
        });
        logMsgIdx.push(msgIdx);
      }
      notifiedPartners.push(pid);
    }

    if (dryRun) {
      return new Response(JSON.stringify({
        success: true,
        dryRun: true,
        partners_would_notify: notifiedPartners.length,
        invoices_referenced: invoices.length,
        skipped_partners: skipPartners.size,
      }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (messages.length > 0) {
      try {
        const resp = await sendMailjet(messages);
        for (let i = 0; i < logs.length; i++) {
          logs[i].status = "sent";
          const idx = logMsgIdx[i] ?? i;
          logs[i].mailjet_message_id = resp?.Messages?.[idx]?.To?.[0]?.MessageID?.toString()
            || resp?.Messages?.[idx]?.MessageID?.toString()
            || null;
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

    return new Response(JSON.stringify({
      success: true,
      partners_notified: notifiedPartners.length,
      invoices_referenced: invoices.length,
      skipped_partners: skipPartners.size,
    }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    console.error("notify-partners-missing-invoice-pdf error:", e);
    return new Response(JSON.stringify({ error: e?.message || "error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
