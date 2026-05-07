import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  sanitizeHtml,
  formatDateNL,
  getPortalBaseUrl,
  getSubjectPrefix,
  getRecipientEmail,
  buildReplyTo,
} from "../_shared/email-templates.ts";
import { logEmail, EmailTypes } from "../_shared/email-logger.ts";

const MAILJET_API_KEY = Deno.env.get("MAILJET_API_KEY");
const MAILJET_SECRET_KEY = Deno.env.get("MAILJET_SECRET_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
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

const formatEur = (n: number) =>
  `€${n.toLocaleString("nl-NL", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    const { item_id, origin } = await req.json();
    if (!item_id) {
      return new Response(JSON.stringify({ error: "item_id is verplicht" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch item + program
    const { data: item, error: itemError } = await supabase
      .from("program_request_items")
      .select("*, program_requests!inner(id, reference_number, customer_name, customer_company, number_of_people, selected_dates)")
      .eq("id", item_id)
      .single();

    if (itemError || !item) {
      return new Response(JSON.stringify({ error: "Onderdeel niet gevonden" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (item.provider_id === "bureau") {
      return new Response(
        JSON.stringify({ success: true, skipped: "bureau item — geen partner notificatie" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Fetch partner email
    const { data: partner } = await supabase
      .from("partners")
      .select("id, name, email, contact_email")
      .eq("id", item.provider_id)
      .maybeSingle();

    const partnerEmail = item.provider_email || partner?.contact_email || partner?.email;
    if (!partnerEmail) {
      return new Response(JSON.stringify({ error: "Geen e-mailadres voor partner gevonden" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const program = item.program_requests as any;
    const baseUrl = getPortalBaseUrl(origin);
    const subjectPrefix = getSubjectPrefix(origin);
    const recipient = getRecipientEmail(partnerEmail, origin);
    const partnerPortalUrl = `${baseUrl}/partner/login`;

    const effectivePeople = item.override_people ?? program.number_of_people;
    const isPerPerson =
      item.price_type === "per_person" || item.price_type === "per_person_per_day";
    const isPerDay = item.price_type === "per_person_per_day";
    const numberOfDays = Math.max(
      Array.isArray(program.selected_dates) ? program.selected_dates.length : 1,
      1,
    );
    const newTotal =
      Number(item.admin_price_override)
      * (isPerPerson ? effectivePeople : 1)
      * (isPerDay ? numberOfDays : 1);
    const dates = (program.selected_dates as string[]).map(formatDateNL).join(", ");

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
        <h2 style="color: #1a365d; border-bottom: 2px solid #1a365d; padding-bottom: 10px;">
          Prijswijziging via Bureau Vlieland
        </h2>
        <p>Beste ${sanitizeHtml(partner?.name || item.provider_name)},</p>
        <p>Bureau Vlieland heeft de prijs voor onderstaand onderdeel aangepast.
           Bekijk de wijziging in je partnerportaal en bevestig of pas de prijs opnieuw aan.</p>
        <div style="background: #fff7ed; padding: 20px; border-left: 4px solid #f59e0b; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 0 0 8px;"><strong>Onderdeel:</strong> ${sanitizeHtml(item.block_name)}</p>
          <p style="margin: 0 0 8px;"><strong>Datum(s):</strong> ${dates}</p>
          <p style="margin: 0 0 8px;"><strong>Aantal personen voor dit onderdeel:</strong> ${effectivePeople}</p>
          <p style="margin: 0 0 8px;"><strong>Voorgestelde nieuwe prijs:</strong> ${formatEur(newTotal)} ${isPerPerson ? `(${formatEur(Number(item.admin_price_override))} ${item.price_type === "per_person_per_day" ? "p.p.p.d." : "p.p."})` : "(totaal)"}</p>
          ${item.admin_price_notes ? `<p style="margin: 8px 0 0; color: #92400e;"><em>${sanitizeHtml(item.admin_price_notes)}</em></p>` : ""}
        </div>
        <p>
          <a href="${partnerPortalUrl}" style="display: inline-block; background: #1a365d; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: 600;">
            Open partnerportaal →
          </a>
        </p>
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;">
        <p style="color: #666; font-size: 13px;">
          Referentie: ${program.reference_number || "-"}
        </p>
      </div>
    `;

    const subject = `${subjectPrefix}Prijs aangepast — ${item.block_name} (${program.reference_number || ""})`;

    await sendEmailViaMailjet([
      {
        From: { Email: "hallo@bureauvlieland.nl", Name: "Bureau Vlieland" },
        To: [{ Email: recipient, Name: partner?.name || item.provider_name }],
        ...(buildReplyTo(program.reference_number) ? { ReplyTo: buildReplyTo(program.reference_number) } : {}),
        Subject: subject,
        HTMLPart: html,
      },
    ]);

    await logEmail({
      email_type: EmailTypes.PROGRAM_REQUEST_PARTNER,
      subject,
      recipient_email: recipient,
      recipient_name: partner?.name || item.provider_name,
      related_request_id: program.id,
      related_partner_id: item.provider_id,
      related_item_id: item.id,
      status: "sent",
      sent_by: "admin",
      metadata: { reason: "price_change", new_total: newTotal },
    });

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("notify-partner-price-change error:", error);
    return new Response(JSON.stringify({ error: "Er ging iets mis bij het versturen" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
