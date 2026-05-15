// Sends an enthusiastic arrival reminder email a few days before the first
// program day, with the program Word document attached and ferry instructions.
//
// Trigger: daily cron (pg_cron). Idempotent via email_log dedup.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  getRenderedTemplate,
  getPortalBaseUrl,
  getSubjectPrefix,
  getRecipientEmail,
  formatDateNL,
} from "../_shared/email-templates.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const EMAIL_TYPE = "arrival_reminder";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    let dryRun = false;
    try {
      const body = await req.json();
      dryRun = !!body?.dry_run;
    } catch {/* no body */}

    const origin = req.headers.get("origin") || "https://bureauvlieland.nl";

    // Window: arrival in 3..5 days from "today" (UTC date string compare).
    const today = new Date();
    const minD = new Date(today); minD.setDate(today.getDate() + 3);
    const maxD = new Date(today); maxD.setDate(today.getDate() + 5);
    const minStr = minD.toISOString().split("T")[0];
    const maxStr = maxD.toISOString().split("T")[0];

    const { data: requests, error } = await supabase
      .from("program_requests")
      .select("id, customer_name, customer_email, customer_token, reference_number, number_of_people, selected_dates, terms_accepted_at, status, cancelled_at")
      .not("terms_accepted_at", "is", null)
      .is("cancelled_at", null)
      .not("selected_dates", "is", null);
    if (error) throw error;

    const apiKey = Deno.env.get("MAILJET_API_KEY");
    const secret = Deno.env.get("MAILJET_SECRET_KEY");

    let sent = 0;
    const matched: any[] = [];
    const errors: string[] = [];

    for (const r of requests || []) {
      if (r.status === "geannuleerd" || r.status === "cancelled") continue;
      const dates = (r.selected_dates as string[]) || [];
      if (!dates.length) continue;
      const firstDate = [...dates].sort()[0];
      if (firstDate < minStr || firstDate > maxStr) continue;
      if (!r.customer_email) continue;

      // Skip if already sent
      const { data: existing } = await supabase
        .from("email_log")
        .select("id")
        .eq("related_request_id", r.id)
        .eq("email_type", EMAIL_TYPE)
        .limit(1);
      if (existing && existing.length) continue;

      matched.push({ id: r.id, ref: r.reference_number, arrival: firstDate, email: r.customer_email });
      if (dryRun) continue;

      if (!apiKey || !secret) {
        errors.push("Mailjet credentials missing");
        continue;
      }

      const portalLink = `${getPortalBaseUrl(origin)}/mijn-programma/${r.customer_token}`;
      const tpl = await getRenderedTemplate(EMAIL_TYPE, {
        customer_name: r.customer_name,
        arrival_date: formatDateNL(firstDate),
        number_of_people: r.number_of_people ?? "",
        reference_number: r.reference_number || "",
        ferry_info_link: "https://www.rederij-doeksen.nl",
        portal_link: portalLink,
      });
      if (!tpl) {
        errors.push(`request ${r.id}: template arrival_reminder ontbreekt`);
        continue;
      }

      // Generate the Word document by calling the existing edge function.
      let attachmentBase64: string | null = null;
      try {
        const docxResp = await fetch(`${supabaseUrl}/functions/v1/generate-program-docx`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${serviceKey}`,
            apikey: serviceKey,
          },
          body: JSON.stringify({ request_id: r.id, customer_token: r.customer_token }),
        });
        if (!docxResp.ok) throw new Error(`docx http ${docxResp.status}: ${await docxResp.text()}`);
        const buf = new Uint8Array(await docxResp.arrayBuffer());
        // Base64-encode in chunks to avoid call-stack overflow on large buffers.
        let bin = "";
        const CHUNK = 0x8000;
        for (let i = 0; i < buf.length; i += CHUNK) {
          bin += String.fromCharCode(...buf.subarray(i, i + CHUNK));
        }
        attachmentBase64 = btoa(bin);
      } catch (e) {
        errors.push(`request ${r.id}: docx generation failed: ${(e as any)?.message ?? e}`);
        continue;
      }

      const recipientEmail = getRecipientEmail(r.customer_email, origin);
      const subject = `${getSubjectPrefix(origin)}${tpl.subject}`;
      const filename = `Programma-${r.reference_number || r.id}.docx`;

      const resp = await fetch("https://api.mailjet.com/v3.1/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Basic ${btoa(`${apiKey}:${secret}`)}`,
        },
        body: JSON.stringify({
          Messages: [{
            From: { Email: "hallo@bureauvlieland.nl", Name: "Bureau Vlieland" },
            To: [{ Email: recipientEmail, Name: r.customer_name }],
            Cc: [{ Email: "hallo@bureauvlieland.nl", Name: "Bureau Vlieland" }],
            Subject: subject,
            HTMLPart: tpl.body,
            Attachments: [{
              ContentType:
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
              Filename: filename,
              Base64Content: attachmentBase64,
            }],
          }],
        }),
      });

      const respText = await resp.text();
      let mjMessageId: string | undefined;
      try {
        const j = JSON.parse(respText);
        mjMessageId = j?.Messages?.[0]?.To?.[0]?.MessageID?.toString();
      } catch {/* ignore */}

      await supabase.from("email_log").insert({
        email_type: EMAIL_TYPE,
        subject,
        recipient_email: recipientEmail,
        recipient_name: r.customer_name,
        related_request_id: r.id,
        status: resp.ok ? "sent" : "failed",
        sent_at: resp.ok ? new Date().toISOString() : null,
        error_message: resp.ok ? null : respText.slice(0, 1000),
        mailjet_message_id: mjMessageId ?? null,
        metadata: {
          template_name: EMAIL_TYPE,
          actor: "system:cron",
          arrival_date: firstDate,
          attachment_filename: filename,
        },
      });

      if (resp.ok) sent++;
      else errors.push(`request ${r.id}: ${respText.slice(0, 300)}`);
    }

    return new Response(
      JSON.stringify({ sent, dryRun, matched, errors }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
