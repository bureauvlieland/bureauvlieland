import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  SENDER_EMAIL,
  SENDER_NAME,
  buildReplyTo,
  getRenderedTemplate,
  TemplateIds,
  getPortalBaseUrl,
} from "../_shared/email-templates.ts";
import { logEmail } from "../_shared/email-logger.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const TEST_EMAIL = "erwin@bureauvlieland.nl";
const PRODUCTION_DOMAINS = ["bureauvlieland.nl", "bureauvlieland.lovable.app"];

const isTestMode = (origin: string | undefined): boolean => {
  if (!origin) return true;
  return !PRODUCTION_DOMAINS.some((d) => origin.includes(d));
};
const recipientFor = (orig: string, origin?: string) => (isTestMode(origin) ? TEST_EMAIL : orig);
const subjectPrefix = (origin?: string) => (isTestMode(origin) ? "[TEST] " : "");

interface ChangeRow {
  itemId: string | null;
  blockName: string;
  providerId: string | null;
  providerName: string | null;
  field:
    | "time"
    | "day"
    | "notes"
    | "people"
    | "added"
    | "removed"
    | "name"
    | "price"
    | "price_type"
    | "description"
    | "location"
    | "provider"
    | "invoicing";
  oldValue: string | null;
  newValue: string | null;
}

const fieldLabel: Record<ChangeRow["field"], string> = {
  time: "Tijd",
  day: "Dag",
  notes: "Opmerking",
  people: "Aantal personen",
  added: "Toegevoegd",
  removed: "Geannuleerd",
  name: "Naam",
  price: "Prijs",
  price_type: "Prijstype",
  description: "Beschrijving",
  location: "Locatie",
  provider: "Uitvoerder",
  invoicing: "Facturatie",
};

function formatVal(v: string | null): string {
  if (v === null || v === undefined || v === "") return "—";
  return v;
}

function renderChangesListHtml(rows: ChangeRow[]): string {
  if (rows.length === 0) return "<p>Geen wijzigingen</p>";
  const items = rows
    .map((r) => {
      if (r.field === "added") {
        return `<li><strong>${r.blockName}</strong> — toegevoegd</li>`;
      }
      if (r.field === "removed") {
        return `<li><strong>${r.blockName}</strong> — geannuleerd</li>`;
      }
      return `<li><strong>${r.blockName}</strong> — ${fieldLabel[r.field]}: ${formatVal(r.oldValue)} → ${formatVal(r.newValue)}</li>`;
    })
    .join("");
  return `<ul style="margin:8px 0 16px; padding-left:20px;">${items}</ul>`;
}

async function sendMailjet(messages: any[]) {
  const apiKey = Deno.env.get("MAILJET_API_KEY");
  const secretKey = Deno.env.get("MAILJET_SECRET_KEY");
  if (!apiKey || !secretKey) throw new Error("Mailjet credentials missing");
  const r = await fetch("https://api.mailjet.com/v3.1/send", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${btoa(`${apiKey}:${secretKey}`)}`,
    },
    body: JSON.stringify({ Messages: messages }),
  });
  if (!r.ok) {
    const t = await r.text();
    throw new Error(`Mailjet error ${r.status}: ${t}`);
  }
  return r.json();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const {
      requestId,
      notifyCustomer = true,
      notifyPartnerIds = [],
      adminNote = "",
      origin,
    } = body as {
      requestId: string;
      notifyCustomer?: boolean;
      notifyPartnerIds?: string[];
      adminNote?: string;
      origin?: string;
    };

    if (!requestId) {
      return new Response(JSON.stringify({ error: "requestId required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Authoriseer: alleen ingelogde admins mogen publiceren.
    const authHeader = req.headers.get("Authorization") || "";
    const jwt = authHeader.replace(/^Bearer\s+/i, "");
    let actorUserId: string | null = null;
    if (jwt) {
      const { data: userData } = await supabase.auth.getUser(jwt);
      actorUserId = userData?.user?.id ?? null;
      if (actorUserId) {
        const { data: roleRow } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", actorUserId)
          .eq("role", "admin")
          .maybeSingle();
        if (!roleRow) {
          return new Response(JSON.stringify({ error: "Forbidden" }), {
            status: 403,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }
    }
    if (!actorUserId) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Laad programma
    const { data: program, error: pErr } = await supabase
      .from("program_requests")
      .select("*")
      .eq("id", requestId)
      .single();
    if (pErr || !program) {
      return new Response(JSON.stringify({ error: "Program not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Laad items met pending changes
    const { data: items, error: iErr } = await supabase
      .from("program_request_items")
      .select("*")
      .eq("request_id", requestId)
      .or(
        "pending_changed_at.not.is.null,pending_marked_for_removal.eq.true,pending_added.eq.true",
      );
    if (iErr) throw iErr;

    if (!items || items.length === 0) {
      return new Response(
        JSON.stringify({ ok: true, published: 0, message: "Geen pending wijzigingen" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Verrijk partner emails
    const partnerIds = [...new Set(items.map((i: any) => i.provider_id).filter(Boolean))];
    const { data: partners } = await supabase
      .from("partners")
      .select("id, name, email, contact_email")
      .in("id", partnerIds);
    const partnerMap = new Map((partners || []).map((p: any) => [p.id, p]));

    const changeRows: ChangeRow[] = [];
    const logRows: any[] = [];
    const nowIso = new Date().toISOString();

    for (const it of items) {
      const partner = partnerMap.get(it.provider_id);
      const providerName = partner?.name || it.provider_name || null;

      if (it.pending_added) {
        changeRows.push({
          itemId: it.id,
          blockName: it.block_name,
          providerId: it.provider_id,
          providerName,
          field: "added",
          oldValue: null,
          newValue: it.block_name,
        });
        logRows.push({
          request_id: requestId,
          item_id: it.id,
          field: "added",
          old_value: null,
          new_value: { name: it.block_name },
        });
      }
      if (it.pending_marked_for_removal) {
        changeRows.push({
          itemId: it.id,
          blockName: it.block_name,
          providerId: it.provider_id,
          providerName,
          field: "removed",
          oldValue: it.block_name,
          newValue: null,
        });
        logRows.push({
          request_id: requestId,
          item_id: it.id,
          field: "removed",
          old_value: { name: it.block_name },
          new_value: null,
        });
        continue; // skip andere veld-diffs voor verwijderde items
      }
      if (it.pending_preferred_time !== null && it.pending_preferred_time !== undefined) {
        changeRows.push({
          itemId: it.id,
          blockName: it.block_name,
          providerId: it.provider_id,
          providerName,
          field: "time",
          oldValue: it.preferred_time,
          newValue: it.pending_preferred_time,
        });
        logRows.push({
          request_id: requestId,
          item_id: it.id,
          field: "time",
          old_value: it.preferred_time,
          new_value: it.pending_preferred_time,
        });
      }
      if (it.pending_day_index !== null && it.pending_day_index !== undefined) {
        changeRows.push({
          itemId: it.id,
          blockName: it.block_name,
          providerId: it.provider_id,
          providerName,
          field: "day",
          oldValue: `Dag ${it.day_index + 1}`,
          newValue: `Dag ${it.pending_day_index + 1}`,
        });
        logRows.push({
          request_id: requestId,
          item_id: it.id,
          field: "day",
          old_value: it.day_index,
          new_value: it.pending_day_index,
        });
      }
      if (it.pending_customer_notes !== null && it.pending_customer_notes !== undefined) {
        changeRows.push({
          itemId: it.id,
          blockName: it.block_name,
          providerId: it.provider_id,
          providerName,
          field: "notes",
          oldValue: it.customer_notes,
          newValue: it.pending_customer_notes,
        });
        logRows.push({
          request_id: requestId,
          item_id: it.id,
          field: "notes",
          old_value: it.customer_notes,
          new_value: it.pending_customer_notes,
        });
      }
      if (it.pending_override_people !== null && it.pending_override_people !== undefined) {
        changeRows.push({
          itemId: it.id,
          blockName: it.block_name,
          providerId: it.provider_id,
          providerName,
          field: "people",
          oldValue: String(it.override_people ?? program.number_of_people),
          newValue: String(it.pending_override_people),
        });
        logRows.push({
          request_id: requestId,
          item_id: it.id,
          field: "people",
          old_value: it.override_people,
          new_value: it.pending_override_people,
        });
      }
      // Extra (admin-edit-sheet) velden
      const pushDiff = (
        field: ChangeRow["field"],
        oldValue: string | null,
        newValue: string | null,
        oldLog: unknown,
        newLog: unknown,
      ) => {
        changeRows.push({
          itemId: it.id,
          blockName: it.pending_block_name ?? it.block_name,
          providerId: it.provider_id,
          providerName,
          field,
          oldValue,
          newValue,
        });
        logRows.push({
          request_id: requestId,
          item_id: it.id,
          field,
          old_value: oldLog,
          new_value: newLog,
        });
      };

      if (it.pending_block_name !== null && it.pending_block_name !== undefined) {
        pushDiff("name", it.block_name, it.pending_block_name, it.block_name, it.pending_block_name);
      }
      if (it.pending_admin_price_override !== null && it.pending_admin_price_override !== undefined) {
        pushDiff(
          "price",
          it.admin_price_override !== null ? `€${Number(it.admin_price_override).toFixed(2)}` : null,
          `€${Number(it.pending_admin_price_override).toFixed(2)}`,
          it.admin_price_override,
          it.pending_admin_price_override,
        );
      }
      if (it.pending_price_type !== null && it.pending_price_type !== undefined) {
        pushDiff("price_type", it.price_type, it.pending_price_type, it.price_type, it.pending_price_type);
      }
      if (it.pending_admin_price_notes !== null && it.pending_admin_price_notes !== undefined) {
        pushDiff(
          "description",
          it.admin_price_notes,
          it.pending_admin_price_notes,
          it.admin_price_notes,
          it.pending_admin_price_notes,
        );
      }
      if (
        (it.pending_location_address !== null && it.pending_location_address !== undefined) ||
        (it.pending_location_lat !== null && it.pending_location_lat !== undefined)
      ) {
        pushDiff(
          "location",
          it.location_address,
          it.pending_location_address ?? "(coördinaten gewijzigd)",
          {
            address: it.location_address,
            lat: it.location_lat,
            lng: it.location_lng,
          },
          {
            address: it.pending_location_address,
            lat: it.pending_location_lat,
            lng: it.pending_location_lng,
          },
        );
      }
      if (
        (it.pending_provider_id !== null && it.pending_provider_id !== undefined) ||
        (it.pending_provider_name !== null && it.pending_provider_name !== undefined)
      ) {
        pushDiff(
          "provider",
          it.provider_name,
          it.pending_provider_name ?? it.pending_provider_id,
          { id: it.provider_id, name: it.provider_name },
          { id: it.pending_provider_id, name: it.pending_provider_name },
        );
      }
      if (it.pending_block_type !== null && it.pending_block_type !== undefined) {
        pushDiff("invoicing", it.block_type, it.pending_block_type, it.block_type, it.pending_block_type);
      }
    }

    // Promote pending → live (per item)
    for (const it of items) {
      if (it.pending_marked_for_removal) {
        await supabase.from("program_request_items").delete().eq("id", it.id);
        continue;
      }
      const upd: Record<string, unknown> = {
        pending_preferred_time: null,
        pending_day_index: null,
        pending_customer_notes: null,
        pending_override_people: null,
        pending_marked_for_removal: false,
        pending_added: false,
        pending_changed_at: null,
        pending_changed_by: null,
        pending_baseline: null,
        pending_block_name: null,
        pending_admin_price_override: null,
        pending_price_type: null,
        pending_admin_price_notes: null,
        pending_location_lat: null,
        pending_location_lng: null,
        pending_location_address: null,
        pending_provider_id: null,
        pending_provider_name: null,
        pending_provider_email: null,
        pending_block_type: null,
        status_updated_at: nowIso,
      };
      if (it.pending_preferred_time !== null && it.pending_preferred_time !== undefined) {
        upd.preferred_time = it.pending_preferred_time;
        upd.confirmed_time = it.pending_preferred_time;
      }
      if (it.pending_day_index !== null && it.pending_day_index !== undefined) {
        upd.day_index = it.pending_day_index;
      }
      if (it.pending_customer_notes !== null && it.pending_customer_notes !== undefined) {
        upd.customer_notes = it.pending_customer_notes;
      }
      if (it.pending_override_people !== null && it.pending_override_people !== undefined) {
        upd.override_people = it.pending_override_people;
      }
      if (it.pending_block_name !== null && it.pending_block_name !== undefined) {
        upd.block_name = it.pending_block_name;
      }
      if (it.pending_admin_price_override !== null && it.pending_admin_price_override !== undefined) {
        upd.admin_price_override = it.pending_admin_price_override;
      }
      if (it.pending_price_type !== null && it.pending_price_type !== undefined) {
        upd.price_type = it.pending_price_type;
      }
      if (it.pending_admin_price_notes !== null && it.pending_admin_price_notes !== undefined) {
        upd.admin_price_notes = it.pending_admin_price_notes;
      }
      if (it.pending_location_lat !== null && it.pending_location_lat !== undefined) {
        upd.location_lat = it.pending_location_lat;
      }
      if (it.pending_location_lng !== null && it.pending_location_lng !== undefined) {
        upd.location_lng = it.pending_location_lng;
      }
      if (it.pending_location_address !== null && it.pending_location_address !== undefined) {
        upd.location_address = it.pending_location_address;
      }
      if (it.pending_provider_id !== null && it.pending_provider_id !== undefined) {
        upd.provider_id = it.pending_provider_id;
      }
      if (it.pending_provider_name !== null && it.pending_provider_name !== undefined) {
        upd.provider_name = it.pending_provider_name;
      }
      if (it.pending_provider_email !== null && it.pending_provider_email !== undefined) {
        upd.provider_email = it.pending_provider_email;
      }
      if (it.pending_block_type !== null && it.pending_block_type !== undefined) {
        upd.block_type = it.pending_block_type;
      }
      await supabase.from("program_request_items").update(upd).eq("id", it.id);
    }

    // Update programma
    await supabase
      .from("program_requests")
      .update({ last_published_at: nowIso, updated_at: nowIso })
      .eq("id", requestId);

    // Verzamel mail-ontvangers
    const notifiedEmails: string[] = [];
    const emailMessages: any[] = [];
    const pendingLogs: Array<{ idx: number; payload: any }> = [];

    const portalBase = getPortalBaseUrl(origin);
    const customerPortalUrl = `${portalBase}/programma/${program.customer_token}`;
    const refShort = program.reference_number ? ` ${program.reference_number}` : "";
    const dates =
      Array.isArray(program.selected_dates) && program.selected_dates.length > 0
        ? `${program.selected_dates[0]}${program.selected_dates.length > 1 ? ` t/m ${program.selected_dates[program.selected_dates.length - 1]}` : ""}`
        : "";

    // Klant-mail
    if (notifyCustomer && program.customer_email && changeRows.length > 0) {
      const html = renderChangesListHtml(changeRows);
      const noteBlock = adminNote
        ? `<p style="margin:16px 0;padding:12px;background:#f8fafc;border-left:3px solid #0F4C5C;border-radius:4px;">${adminNote.replace(/\n/g, "<br>")}</p>`
        : "";
      const rendered = await getRenderedTemplate(TemplateIds.ITEM_CHANGES_CUSTOMER, {
        customer_name: program.customer_name,
        changes_list: html + noteBlock,
        portal_url: customerPortalUrl,
        reference_number: program.reference_number || "",
      });
      if (rendered) {
        const to = recipientFor(program.customer_email, origin);
        notifiedEmails.push(to);
        const idx = emailMessages.length;
        emailMessages.push({
          From: { Email: SENDER_EMAIL, Name: SENDER_NAME },
          To: [{ Email: to, Name: program.customer_name }],
          ReplyTo: { Email: buildReplyTo(requestId) },
          Subject: subjectPrefix(origin) + rendered.subject,
          HTMLPart: rendered.body,
        });
        pendingLogs.push({
          idx,
          payload: {
            email_type: TemplateIds.ITEM_CHANGES_CUSTOMER,
            subject: rendered.subject,
            recipient_email: to,
            recipient_name: program.customer_name,
            related_request_id: requestId,
            sent_by: "publish-program-changes",
            metadata: {
              template_name: TemplateIds.ITEM_CHANGES_CUSTOMER,
              actor: "admin → klant (gebundelde publicatie)",
              change_count: changeRows.length,
            },
          },
        });
      }
    }

    // Partner-mails — alleen voor geselecteerde partners en alleen relevante rijen
    for (const pid of notifyPartnerIds) {
      const partner = partnerMap.get(pid);
      if (!partner) continue;
      const partnerEmail = partner.contact_email || partner.email;
      if (!partnerEmail) continue;
      const rows = changeRows.filter((r) => r.providerId === pid);
      if (rows.length === 0) continue;

      const html = renderChangesListHtml(rows);
      const noteBlock = adminNote
        ? `<p style="margin:16px 0;padding:12px;background:#f8fafc;border-left:3px solid #0F4C5C;border-radius:4px;">${adminNote.replace(/\n/g, "<br>")}</p>`
        : "";
      const rendered = await getRenderedTemplate(TemplateIds.ITEM_CHANGES_PARTNER, {
        partner_name: partner.name,
        customer_name: program.customer_name,
        customer_company: program.customer_company || "",
        customer_email: "", // privacy: PII niet delen
        customer_phone: "",
        dates,
        number_of_people: program.number_of_people,
        changes_list: html + noteBlock,
      });
      if (!rendered) continue;
      const to = recipientFor(partnerEmail, origin);
      notifiedEmails.push(to);
      const idx = emailMessages.length;
      emailMessages.push({
        From: { Email: SENDER_EMAIL, Name: SENDER_NAME },
        To: [{ Email: to, Name: partner.name }],
        ReplyTo: { Email: buildReplyTo(requestId) },
        Subject: subjectPrefix(origin) + rendered.subject,
        HTMLPart: rendered.body,
      });
      pendingLogs.push({
        idx,
        payload: {
          email_type: TemplateIds.ITEM_CHANGES_PARTNER,
          subject: rendered.subject,
          recipient_email: to,
          recipient_name: partner.name,
          related_request_id: requestId,
          related_partner_id: pid,
          sent_by: "publish-program-changes",
          metadata: {
            template_name: TemplateIds.ITEM_CHANGES_PARTNER,
            actor: "admin → partner (gebundelde publicatie)",
            change_count: rows.length,
          },
        },
      });
    }

    // Send mails
    if (emailMessages.length > 0) {
      try {
        const resp = await sendMailjet(emailMessages);
        for (const { idx, payload } of pendingLogs) {
          const msgId = resp?.Messages?.[idx]?.To?.[0]?.MessageID?.toString();
          await logEmail({ ...payload, status: "sent", mailjet_message_id: msgId });
        }
      } catch (err) {
        console.error("Mailjet send failed:", err);
        for (const { payload } of pendingLogs) {
          await logEmail({ ...payload, status: "failed", error_message: String(err) });
        }
      }
    }

    // Persist change log
    if (logRows.length > 0) {
      const rowsWithMeta = logRows.map((r) => ({
        ...r,
        changed_by: actorUserId,
        published_at: nowIso,
        notified_emails: notifiedEmails,
        admin_note: adminNote || null,
      }));
      await supabase.from("program_change_log").insert(rowsWithMeta);
    }

    return new Response(
      JSON.stringify({
        ok: true,
        published: items.length,
        emails_sent: emailMessages.length,
        notified: notifiedEmails,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("publish-program-changes error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
