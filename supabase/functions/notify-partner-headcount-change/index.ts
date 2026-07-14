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
import { isBureauItem } from "../_shared/bureau-item.ts";

import { extractMessageIds } from "../_shared/mailjet-send.ts";
const MAILJET_API_KEY = Deno.env.get("MAILJET_API_KEY");
const MAILJET_SECRET_KEY = Deno.env.get("MAILJET_SECRET_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const sendEmailViaMailjet = async (messages: unknown[]) => {
  const auth = btoa(`${MAILJET_API_KEY}:${MAILJET_SECRET_KEY}`);
  const response = await fetch("https://api.mailjet.com/v3.1/send", {
    method: "POST",
    headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/json" },
    body: JSON.stringify({ Messages: messages }),
  });
  try { mailjetMessageId = extractMessageIds(await response.clone().json())[0] ?? null; } catch { /* body already consumed or non-JSON */ }
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
    const { item_id, note, origin } = await req.json();
    if (!item_id || typeof item_id !== "string") {
      return new Response(JSON.stringify({ error: "item_id is verplicht" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: item, error: itemError } = await supabase
      .from("program_request_items")
      .select(
        "*, program_requests!inner(id, reference_number, customer_name, customer_company, number_of_people, selected_dates)",
      )
      .eq("id", item_id)
      .single();

    if (itemError || !item) {
      return new Response(JSON.stringify({ error: "Onderdeel niet gevonden" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Alleen door de klant goedgekeurde items krijgen een aantal-wijziging-
    // mail. Zolang het item nog in offerte staat, is er geen boeking om aan
    // te passen en volgt de nieuwe headcount automatisch bij klant-akkoord.
    const customerApproved = !!(item.customer_approved_at || item.customer_accepted_at);
    if (!customerApproved || item.status === "cancelled") {
      return new Response(
        JSON.stringify({
          success: true,
          email_skipped: "not_customer_approved",
          message: "Item is nog niet door de klant goedgekeurd — geen partner-mail nodig.",
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (item.admin_price_override == null) {
      return new Response(
        JSON.stringify({ error: "Geen p.p.-prijs bekend om totaal opnieuw te berekenen" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const isPerPerson =
      item.price_type === "per_person" || item.price_type === "per_person_per_day";
    if (!isPerPerson) {
      return new Response(
        JSON.stringify({ error: "Alleen p.p.-items kunnen automatisch herberekend worden" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const program = item.program_requests as {
      id: string;
      reference_number: string | null;
      customer_name: string | null;
      customer_company: string | null;
      number_of_people: number;
      selected_dates: string[] | null;
    };

    const effectivePeople = item.override_people ?? program.number_of_people;
    const isPerDay = item.price_type === "per_person_per_day";
    const numberOfDays = Math.max(
      Array.isArray(program.selected_dates) ? program.selected_dates.length : 1,
      1,
    );
    const unitPrice = Number(item.admin_price_override);
    const newTotal = unitPrice * effectivePeople * (isPerDay ? numberOfDays : 1);
    const oldTotal = Number(item.quoted_price ?? 0);

    // Update item server-side. We zetten quoted_price = newTotal, en synchroniseren
    // admin_price_override_updated_at + ack zodat de "open prijswijziging"-banner sluit.
    const nowIso = new Date().toISOString();
    const { error: updateError } = await supabase
      .from("program_request_items")
      .update({
        quoted_price: newTotal,
        admin_price_override: unitPrice,
        admin_price_override_updated_at: nowIso,
        partner_price_change_acknowledged_at: nowIso,
        updated_at: nowIso,
      })
      .eq("id", item_id);

    if (updateError) {
      console.error("update error:", updateError);
      return new Response(JSON.stringify({ error: "Kon onderdeel niet bijwerken" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Bureau items hoeven geen partner-mail
    if (isBureauItem(item)) {
      return new Response(
        JSON.stringify({ success: true, new_total: newTotal, email_skipped: "bureau" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Partner mail
    const { data: partner } = await supabase
      .from("partners")
      .select("id, name, email, contact_email")
      .eq("id", item.provider_id)
      .maybeSingle();

    const partnerEmail = item.provider_email || partner?.contact_email || partner?.email;
    if (!partnerEmail) {
      return new Response(
        JSON.stringify({ success: true, new_total: newTotal, email_skipped: "no_email" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const baseUrl = getPortalBaseUrl(origin);
    const subjectPrefix = getSubjectPrefix(origin);
    const recipient = getRecipientEmail(partnerEmail, origin);
    const partnerPortalUrl = `${baseUrl}/partner/login`;
    const dates = Array.isArray(program.selected_dates)
      ? program.selected_dates.map(formatDateNL).join(", ")
      : "";
    const ref = program.reference_number || "";
    const noteHtml =
      typeof note === "string" && note.trim().length > 0
        ? `<p style="margin: 8px 0 0; color: #475569;"><em>Toelichting Bureau Vlieland: ${sanitizeHtml(note.trim())}</em></p>`
        : "";

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
        <h2 style="color: #1a365d; border-bottom: 2px solid #1a365d; padding-bottom: 10px;">
          Aantal gasten gewijzigd — totaal bijgewerkt
        </h2>
        <p>Hoi ${sanitizeHtml(partner?.name || item.provider_name)},</p>
        <p>
          Het aantal gasten voor onderstaand onderdeel is door de klant aangepast.
          De met jou afgesproken <strong>prijs per persoon blijft staan</strong>;
          alleen het totaal beweegt mee met het nieuwe aantal. Je hoeft hier verder
          niets voor te doen — we informeren je puur ter info.
        </p>
        <div style="background: #f0f9ff; padding: 20px; border-left: 4px solid #0284c7; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 0 0 8px;"><strong>Onderdeel:</strong> ${sanitizeHtml(item.block_name)}</p>
          ${dates ? `<p style="margin: 0 0 8px;"><strong>Datum(s):</strong> ${dates}</p>` : ""}
          <p style="margin: 0 0 8px;"><strong>Nieuw aantal gasten:</strong> ${effectivePeople}</p>
          <p style="margin: 0 0 8px;"><strong>Afgesproken prijs:</strong> ${formatEur(unitPrice)} ${isPerDay ? "p.p.p.d." : "p.p."}</p>
          <p style="margin: 0 0 8px;"><strong>Nieuw totaal:</strong> ${formatEur(newTotal)} <span style="color: #64748b;">(was ${formatEur(oldTotal)})</span></p>
          ${noteHtml}
        </div>
        <p>
          <a href="${partnerPortalUrl}" style="display: inline-block; background: #1a365d; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: 600;">
            Bekijk in partnerportaal →
          </a>
        </p>
        <p style="color: #475569; font-size: 14px;">
          Lopen er nog wijzigingen aan jouw kant? Laat het ons gerust weten — reply op deze mail werkt prima.
        </p>
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;">
        <p style="color: #666; font-size: 13px;">Referentie: ${ref || "-"}</p>
      </div>
    `;

    const subject = `${subjectPrefix}Aantal gasten gewijzigd — ${item.block_name}${ref ? ` (${ref})` : ""}`;

    try {
      await sendEmailViaMailjet([
        {
          From: { Email: "hallo@bureauvlieland.nl", Name: "Bureau Vlieland" },
          To: [{ Email: recipient, Name: partner?.name || item.provider_name }],
          ...(buildReplyTo(ref) ? { ReplyTo: buildReplyTo(ref) } : {}),
          Subject: subject,
          HTMLPart: html,
        },
      ]);

      await logEmail({
      mailjet_message_id: mailjetMessageId ?? undefined,
        email_type: EmailTypes.PROGRAM_REQUEST_PARTNER,
        subject,
        recipient_email: recipient,
        recipient_name: partner?.name || item.provider_name,
        related_request_id: program.id,
        related_partner_id: item.provider_id,
        related_item_id: item.id,
        status: "sent",
        sent_by: "admin",
        metadata: {
          template_name: "partner_headcount_change",
          actor: "admin → partner (aantalwijziging)",
          reason: "headcount_change",
          unit_price: unitPrice,
          old_total: oldTotal,
          new_total: newTotal,
          new_people: effectivePeople,
        },
      });
    } catch (mailErr) {
      console.error("mail error:", mailErr);
      return new Response(
        JSON.stringify({ success: true, new_total: newTotal, email_error: true }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(JSON.stringify({ success: true, new_total: newTotal }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("notify-partner-headcount-change error:", error);
    return new Response(JSON.stringify({ error: "Er ging iets mis bij het versturen" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
