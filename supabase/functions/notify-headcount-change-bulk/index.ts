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
  if (!response.ok) {
    const errorText = await response.text();
    console.error("Mailjet API error:", errorText);
    throw new Error("EMAIL_SERVICE_ERROR");
  }
  return await response.json();
};

const formatEur = (n: number) =>
  `€${n.toLocaleString("nl-NL", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

interface Payload {
  request_id: string;
  old_people: number;
  new_people: number;
  note?: string;
  origin?: string;
  send_customer: boolean;
  partner_item_ids: string[];
  accommodation_quote_ids: string[];
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    const body = (await req.json()) as Payload;
    const {
      request_id,
      old_people,
      new_people,
      note,
      origin,
      send_customer,
      partner_item_ids = [],
      accommodation_quote_ids = [],
    } = body;

    if (!request_id || typeof new_people !== "number" || typeof old_people !== "number") {
      return new Response(JSON.stringify({ error: "request_id, old_people en new_people zijn verplicht" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: program, error: programError } = await supabase
      .from("program_requests")
      .select(
        "id, reference_number, customer_name, customer_email, customer_company, customer_token, number_of_people, selected_dates",
      )
      .eq("id", request_id)
      .single();

    if (programError || !program) {
      return new Response(JSON.stringify({ error: "Project niet gevonden" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const baseUrl = getPortalBaseUrl(origin);
    const subjectPrefix = getSubjectPrefix(origin);
    const ref = program.reference_number || "";
    const dates = Array.isArray(program.selected_dates)
      ? (program.selected_dates as string[]).map(formatDateNL).join(", ")
      : "";
    const numberOfDays = Math.max(
      Array.isArray(program.selected_dates) ? (program.selected_dates as string[]).length : 1,
      1,
    );

    const noteHtmlCustomer = note?.trim()
      ? `<p style="margin: 12px 0 0; color: #475569;"><em>Toelichting Bureau Vlieland: ${sanitizeHtml(note.trim())}</em></p>`
      : "";
    const noteHtmlPartner = note?.trim()
      ? `<p style="margin: 8px 0 0; color: #475569;"><em>Toelichting Bureau Vlieland: ${sanitizeHtml(note.trim())}</em></p>`
      : "";

    const results: Record<string, unknown> = {
      customer: null,
      partners: [] as unknown[],
      accommodations: [] as unknown[],
    };

    // ---------------- Klantmail ----------------
    if (send_customer && program.customer_email) {
      const recipient = getRecipientEmail(program.customer_email, origin);
      const portalUrl = `${baseUrl}/mijn-programma/${program.customer_token}`;
      const subject = `${subjectPrefix}Aantal personen aangepast — ${old_people} → ${new_people}${ref ? ` (${ref})` : ""}`;

      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
          <h2 style="color: #1a365d; border-bottom: 2px solid #1a365d; padding-bottom: 10px;">
            Aantal personen aangepast
          </h2>
          <p>Geachte ${sanitizeHtml(program.customer_name || "")},</p>
          <p>
            Wij hebben in uw programma het aantal personen aangepast van
            <strong>${old_people}</strong> naar <strong>${new_people}</strong>.
          </p>
          <div style="background: #f0f9ff; padding: 20px; border-left: 4px solid #0284c7; border-radius: 8px; margin: 20px 0;">
            ${dates ? `<p style="margin: 0 0 8px;"><strong>Datum(s):</strong> ${dates}</p>` : ""}
            <p style="margin: 0 0 8px;"><strong>Nieuw aantal personen:</strong> ${new_people}</p>
            <p style="margin: 0;">De prijzen per persoon blijven gelijk; de totalen in uw programma worden automatisch herberekend op basis van het nieuwe aantal.</p>
            ${noteHtmlCustomer}
          </div>
          <p>
            <a href="${portalUrl}" style="display: inline-block; background: #1a365d; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: 600;">
              Open uw programma →
            </a>
          </p>
          <p style="color: #475569; font-size: 14px;">
            Heeft u nog vragen of wijzigingen? U kunt eenvoudig op deze e-mail antwoorden.
          </p>
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;">
          <p style="color: #666; font-size: 13px;">Referentie: ${ref || "-"}</p>
        </div>
      `;

      try {
        await sendEmailViaMailjet([
          {
            From: { Email: "hallo@bureauvlieland.nl", Name: "Bureau Vlieland" },
            To: [{ Email: recipient, Name: program.customer_name }],
            ...(buildReplyTo(ref) ? { ReplyTo: buildReplyTo(ref) } : {}),
            Subject: subject,
            HTMLPart: html,
          },
        ]);
        await logEmail({
          email_type: EmailTypes.PROGRAM_REQUEST_CUSTOMER,
          subject,
          recipient_email: recipient,
          recipient_name: program.customer_name || undefined,
          related_request_id: program.id,
          status: "sent",
          sent_by: "admin",
          metadata: {
            template_name: "headcount_change_customer",
            actor: "admin → klant (aantalwijziging)",
            old_people,
            new_people,
          },
        });
        results.customer = { sent: true, recipient };
      } catch (err) {
        console.error("customer mail error:", err);
        results.customer = { sent: false, error: String(err) };
      }
    }

    // ---------------- Partner-onderdelen ----------------
    if (partner_item_ids.length > 0) {
      const { data: items } = await supabase
        .from("program_request_items")
        .select(
          "id, block_name, provider_id, provider_name, block_type, block_category, provider_email, price_type, admin_price_override, quoted_price, override_people",
        )
        .in("id", partner_item_ids);

      // Groepeer per partner
      const groups = new Map<string, { partner_id: string; items: typeof items }>();
      for (const it of items || []) {
        if (isBureauItem(it)) continue;
        const key = it.provider_id || "_no_partner";
        if (!groups.has(key)) groups.set(key, { partner_id: it.provider_id || "", items: [] });
        groups.get(key)!.items!.push(it);
      }

      for (const [partnerId, grp] of groups.entries()) {
        const { data: partner } = await supabase
          .from("partners")
          .select("id, name, email, contact_email")
          .eq("id", partnerId)
          .maybeSingle();

        const firstItem = grp.items![0];
        const partnerEmail =
          firstItem.provider_email || partner?.contact_email || partner?.email;
        if (!partnerEmail) {
          (results.partners as unknown[]).push({ partner_id: partnerId, sent: false, reason: "no_email" });
          continue;
        }

        const recipient = getRecipientEmail(partnerEmail, origin);
        const partnerPortalUrl = `${baseUrl}/partner/login`;

        const itemRows = grp
          .items!.map((it) => {
            const effPeople = it.override_people ?? new_people;
            const isPerPerson = it.price_type === "per_person" || it.price_type === "per_person_per_day";
            const isPerDay = it.price_type === "per_person_per_day";
            const unit = it.admin_price_override != null ? Number(it.admin_price_override) : null;
            const newTotal = unit != null
              ? unit * (isPerPerson ? effPeople : 1) * (isPerDay ? numberOfDays : 1)
              : null;
            const priceLine = unit != null
              ? `<br><span style="color:#475569;">${formatEur(unit)} ${isPerDay ? "p.p.p.d." : isPerPerson ? "p.p." : "totaal"} · nieuw totaal ${newTotal != null ? formatEur(newTotal) : "-"}</span>`
              : "";
            const overrideNote = it.override_people != null
              ? `<br><span style="color:#b45309;font-size:13px;">Let op: dit onderdeel heeft een eigen aantal (${it.override_people}) en volgt het projectaantal niet automatisch.</span>`
              : "";
            return `<li style="margin: 6px 0;"><strong>${sanitizeHtml(it.block_name)}</strong> — ${effPeople} pers.${priceLine}${overrideNote}</li>`;
          })
          .join("");

        const subject = `${subjectPrefix}Aantal gasten gewijzigd — ${old_people} → ${new_people}${ref ? ` (${ref})` : ""}`;
        const html = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
            <h2 style="color: #1a365d; border-bottom: 2px solid #1a365d; padding-bottom: 10px;">
              Aantal gasten gewijzigd — totaal bijgewerkt
            </h2>
            <p>Hoi ${sanitizeHtml(partner?.name || firstItem.provider_name || "")},</p>
            <p>
              Het aantal gasten voor onderstaand project is door de klant aangepast van
              <strong>${old_people}</strong> naar <strong>${new_people}</strong>.
              De met jou afgesproken <strong>prijs per persoon blijft staan</strong>;
              alleen het totaal beweegt mee. Je hoeft hier verder niets voor te doen —
              we informeren je puur ter info.
            </p>
            <div style="background: #f0f9ff; padding: 20px; border-left: 4px solid #0284c7; border-radius: 8px; margin: 20px 0;">
              ${dates ? `<p style="margin: 0 0 8px;"><strong>Datum(s):</strong> ${dates}</p>` : ""}
              <p style="margin: 0 0 8px;"><strong>Onderde(e)l(en):</strong></p>
              <ul style="margin: 4px 0 0; padding-left: 20px;">${itemRows}</ul>
              ${noteHtmlPartner}
            </div>
            <p>
              <a href="${partnerPortalUrl}" style="display: inline-block; background: #1a365d; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: 600;">
                Bekijk in partnerportaal →
              </a>
            </p>
            <p style="color: #475569; font-size: 14px;">
              Klopt er iets niet of moet de prijs aangepast? Reply op deze mail werkt prima.
            </p>
            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;">
            <p style="color: #666; font-size: 13px;">Referentie: ${ref || "-"}</p>
          </div>
        `;

        try {
          await sendEmailViaMailjet([
            {
              From: { Email: "hallo@bureauvlieland.nl", Name: "Bureau Vlieland" },
              To: [{ Email: recipient, Name: partner?.name || firstItem.provider_name }],
              ...(buildReplyTo(ref) ? { ReplyTo: buildReplyTo(ref) } : {}),
              Subject: subject,
              HTMLPart: html,
            },
          ]);
          await logEmail({
            email_type: EmailTypes.PROGRAM_REQUEST_PARTNER,
            subject,
            recipient_email: recipient,
            recipient_name: partner?.name || firstItem.provider_name || undefined,
            related_request_id: program.id,
            related_partner_id: partnerId,
            status: "sent",
            sent_by: "admin",
            metadata: {
              template_name: "headcount_change_partner_bulk",
              actor: "admin → partner (aantalwijziging)",
              old_people,
              new_people,
              item_ids: grp.items!.map((i) => i.id),
            },
          });
          (results.partners as unknown[]).push({ partner_id: partnerId, sent: true, recipient });
        } catch (err) {
          console.error("partner mail error:", err);
          (results.partners as unknown[]).push({ partner_id: partnerId, sent: false, error: String(err) });
        }
      }
    }

    // ---------------- Logies-partners ----------------
    if (accommodation_quote_ids.length > 0) {
      const { data: quotes } = await supabase
        .from("accommodation_quotes")
        .select(
          "id, request_id, partner_id, accommodation_name, status, accommodation_requests!inner(id, reference_number, arrival_date, departure_date)",
        )
        .in("id", accommodation_quote_ids);

      for (const q of quotes || []) {
        const { data: partner } = await supabase
          .from("partners")
          .select("id, name, email, contact_email")
          .eq("id", q.partner_id)
          .maybeSingle();

        const partnerEmail = partner?.contact_email || partner?.email;
        if (!partnerEmail) {
          (results.accommodations as unknown[]).push({ quote_id: q.id, sent: false, reason: "no_email" });
          continue;
        }

        const ar = q.accommodation_requests as { reference_number: string | null; arrival_date: string; departure_date: string };
        const recipient = getRecipientEmail(partnerEmail, origin);
        const partnerPortalUrl = `${baseUrl}/partner/login`;
        const arrival = formatDateNL(ar.arrival_date);
        const departure = formatDateNL(ar.departure_date);
        const logiesRef = ar.reference_number || ref;

        const subject = `${subjectPrefix}Aantal gasten gewijzigd — ${old_people} → ${new_people}${logiesRef ? ` (${logiesRef})` : ""}`;
        const html = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
            <h2 style="color: #1a365d; border-bottom: 2px solid #1a365d; padding-bottom: 10px;">
              Aantal gasten gewijzigd — logies
            </h2>
            <p>Hoi ${sanitizeHtml(partner?.name || "")},</p>
            <p>
              Het aantal gasten voor onderstaande logies-aanvraag is aangepast van
              <strong>${old_people}</strong> naar <strong>${new_people}</strong>.
              We laten het je weten zodat je je kamerinzet/planning kunt afstemmen.
              Pas indien nodig je offerte aan in het partnerportaal.
            </p>
            <div style="background: #f0f9ff; padding: 20px; border-left: 4px solid #0284c7; border-radius: 8px; margin: 20px 0;">
              <p style="margin: 0 0 8px;"><strong>Logies:</strong> ${sanitizeHtml(q.accommodation_name || "")}</p>
              <p style="margin: 0 0 8px;"><strong>Aankomst:</strong> ${arrival}</p>
              <p style="margin: 0 0 8px;"><strong>Vertrek:</strong> ${departure}</p>
              <p style="margin: 0;"><strong>Nieuw aantal gasten:</strong> ${new_people}</p>
              ${noteHtmlPartner}
            </div>
            <p>
              <a href="${partnerPortalUrl}" style="display: inline-block; background: #1a365d; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: 600;">
                Open partnerportaal →
              </a>
            </p>
            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;">
            <p style="color: #666; font-size: 13px;">Referentie: ${logiesRef || "-"}</p>
          </div>
        `;

        try {
          await sendEmailViaMailjet([
            {
              From: { Email: "hallo@bureauvlieland.nl", Name: "Bureau Vlieland" },
              To: [{ Email: recipient, Name: partner?.name }],
              ...(buildReplyTo(logiesRef) ? { ReplyTo: buildReplyTo(logiesRef) } : {}),
              Subject: subject,
              HTMLPart: html,
            },
          ]);
          await logEmail({
            email_type: EmailTypes.ACCOMMODATION_QUOTE_REQUEST_PARTNER,
            subject,
            recipient_email: recipient,
            recipient_name: partner?.name || undefined,
            related_request_id: program.id,
            related_accommodation_id: q.request_id,
            related_partner_id: q.partner_id,
            status: "sent",
            sent_by: "admin",
            metadata: {
              template_name: "headcount_change_accommodation_partner",
              actor: "admin → logies-partner (aantalwijziging)",
              old_people,
              new_people,
              quote_id: q.id,
            },
          });
          (results.accommodations as unknown[]).push({ quote_id: q.id, sent: true, recipient });
        } catch (err) {
          console.error("accommodation mail error:", err);
          (results.accommodations as unknown[]).push({ quote_id: q.id, sent: false, error: String(err) });
        }
      }
    }

    return new Response(JSON.stringify({ success: true, results }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("notify-headcount-change-bulk error:", error);
    return new Response(JSON.stringify({ error: "Er ging iets mis bij het versturen" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
