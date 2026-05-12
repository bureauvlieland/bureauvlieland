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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const origin = req.headers.get("origin") || "https://bureauvlieland.nl";
    const targetMin = new Date();
    targetMin.setDate(targetMin.getDate() + 13);
    const targetMax = new Date();
    targetMax.setDate(targetMax.getDate() + 15);
    const minStr = targetMin.toISOString().split("T")[0];
    const maxStr = targetMax.toISOString().split("T")[0];

    // Find program_requests where the first selected_date is ~14 days out,
    // terms accepted, not cancelled, and guest details still incomplete.
    const { data: requests, error } = await supabase
      .from("program_requests")
      .select("id, customer_name, customer_email, customer_token, reference_number, selected_dates, guest_names, dietary_notes, terms_accepted_at, status, cancelled_at")
      .not("terms_accepted_at", "is", null)
      .is("cancelled_at", null)
      .not("selected_dates", "is", null);

    if (error) throw error;

    let sent = 0;
    const errors: string[] = [];

    for (const r of requests || []) {
      if (r.status === "geannuleerd" || r.status === "cancelled") continue;
      const dates = (r.selected_dates as string[]) || [];
      if (!dates.length) continue;
      const firstDate = [...dates].sort()[0];
      if (firstDate < minStr || firstDate > maxStr) continue;

      const guestsMissing = !r.guest_names || !r.guest_names.trim();

      // Dietary only relevant when catering items exist in the program
      const { data: cateringItems } = await supabase
        .from("program_request_items")
        .select("id")
        .eq("request_id", r.id)
        .eq("block_category", "catering")
        .limit(1);
      const hasCatering = !!(cateringItems && cateringItems.length);
      const dietsMissing = hasCatering && (!r.dietary_notes || !r.dietary_notes.trim());

      if (!guestsMissing && !dietsMissing) continue;

      // Skip if already reminded
      const { data: existing } = await supabase
        .from("email_log")
        .select("id")
        .eq("related_request_id", r.id)
        .eq("email_type", "guest_details_reminder")
        .limit(1);
      if (existing && existing.length) continue;

      const portalLink = `${getPortalBaseUrl(origin)}/programma/${r.customer_token}`;
      const tpl = await getRenderedTemplate("guest_details_reminder", {
        customer_name: r.customer_name,
        arrival_date: formatDateNL(firstDate),
        portal_link: portalLink,
        reference_number: r.reference_number || "",
      });

      const apiKey = Deno.env.get("MAILJET_API_KEY");
      const secret = Deno.env.get("MAILJET_SECRET_KEY");
      if (!tpl || !apiKey || !secret) continue;

      const recipientEmail = getRecipientEmail(r.customer_email, origin);
      const subject = `${getSubjectPrefix(origin)}${tpl.subject}`;

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
            Subject: subject,
            HTMLPart: tpl.body,
          }],
        }),
      });

      if (resp.ok) {
        await supabase.from("email_log").insert({
          email_type: "guest_details_reminder",
          subject,
          recipient_email: recipientEmail,
          recipient_name: r.customer_name,
          related_request_id: r.id,
          status: "sent",
          sent_at: new Date().toISOString(),
          metadata: {
            template_name: "guest_details_reminder",
            actor: "system:cron",
            arrival_date: firstDate,
          },
        });
        sent++;
      } else {
        errors.push(`request ${r.id}: ${await resp.text()}`);
      }
    }

    return new Response(JSON.stringify({ sent, errors }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
