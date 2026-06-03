// Finalize a collective supplier invoice: persist invoice + matches,
// update program_request_items with purchase price + invoice link,
// mark inbox as processed, and forward a summary email to Snelstart.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const MAILJET_API_KEY = Deno.env.get("MAILJET_API_KEY");
const MAILJET_SECRET_KEY = Deno.env.get("MAILJET_SECRET_KEY");

interface BookingInput {
  resnr: string;
  customer_name: string;
  departure_dates: string[];
  routes: string[];
  amount_excl_vat: number;
  vat_amount: number;
  amount_incl_vat: number;
  tourist_tax: number;
  supplier_commission: number;
  match_status: "matched" | "ambiguous" | "unmatched" | "manual" | "internal";
  item_id: string | null;
}

interface FinalizeBody {
  inbox_id: string;
  partner_id: string;
  invoice: {
    invoice_number: string;
    invoice_date: string;
    total_excl_vat: number;
    total_vat: number;
    total_incl_vat: number;
    total_supplier_commission: number;
    description?: string | null;
  };
  bookings: BookingInput[];
  forward_to_snelstart?: boolean;
  origin?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return j({ error: "Unauthorized" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const adminClient = createClient(
      supabaseUrl,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: ue } = await userClient.auth.getUser(
      authHeader.replace("Bearer ", ""),
    );
    if (ue || !userData?.user) return j({ error: "Unauthorized" }, 401);

    const { data: role } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", userData.user.id)
      .eq("role", "admin")
      .maybeSingle();
    if (!role) return j({ error: "Forbidden" }, 403);

    const body = (await req.json()) as FinalizeBody;
    if (!body?.inbox_id || !body?.invoice || !Array.isArray(body.bookings)) {
      return j({ error: "Invalid payload" }, 400);
    }

    const { data: inbox } = await adminClient
      .from("purchase_invoice_inbox")
      .select("*")
      .eq("id", body.inbox_id)
      .single();
    if (!inbox) return j({ error: "Inbox item not found" }, 404);

    // Duplicate guard
    const normalize = (v: string) => (v || "").replace(/[\s\-_.]/g, "").toUpperCase();
    const normalizedNew = normalize(body.invoice.invoice_number);
    if (normalizedNew) {
      const { data: existing } = await adminClient
        .from("partner_purchase_invoices")
        .select("id, invoice_number, invoice_date, amount_incl_vat, amount_excl_vat, status")
        .eq("partner_id", body.partner_id)
        .order("created_at", { ascending: false })
        .limit(50);
      const dup = (existing || []).find((r: any) => normalize(r.invoice_number) === normalizedNew);
      if (dup) {
        return j(
          {
            error: `Verzamelfactuur ${dup.invoice_number} is al verwerkt op ${dup.invoice_date} (€${Number(dup.amount_incl_vat ?? dup.amount_excl_vat).toFixed(2)}).`,
            code: "duplicate_invoice",
            duplicate: dup,
          },
          409,
        );
      }
    }


    // 1) Insert invoice (collective: request_id null, is_collective true)
    const supplierVat = body.invoice.total_vat > 0
      ? +((body.invoice.total_vat / body.invoice.total_excl_vat) * 100).toFixed(2)
      : 0;

    const { data: invoice, error: invErr } = await adminClient
      .from("partner_purchase_invoices")
      .insert({
        partner_id: body.partner_id,
        request_id: null,
        is_collective: true,
        invoice_number: body.invoice.invoice_number,
        invoice_date: body.invoice.invoice_date,
        amount_excl_vat: body.invoice.total_excl_vat,
        vat_rate: supplierVat,
        vat_amount: body.invoice.total_vat,
        amount_incl_vat: body.invoice.total_incl_vat,
        supplier_commission_excl_vat: body.invoice.total_supplier_commission,
        supplier_commission_vat: 0,
        description: body.invoice.description || `Verzamelfactuur ${body.invoice.invoice_number}`,
        file_path: inbox.attachment_path,
        status: "pending",
        registered_by: "admin",
      })
      .select()
      .single();

    if (invErr || !invoice) {
      console.error("Insert invoice failed:", invErr);
      return j({ error: "Failed to create invoice", details: invErr?.message }, 500);
    }

    // 2) Insert match rows
    const matchRows = body.bookings.map((b) => ({
      invoice_id: invoice.id,
      item_id: b.item_id,
      booking_reference: b.resnr,
      customer_label: b.customer_name,
      departure_date: b.departure_dates?.[0] || null,
      route: b.routes?.join("/") || null,
      amount_excl_vat: b.amount_excl_vat,
      vat_amount: b.vat_amount,
      amount_incl_vat: b.amount_incl_vat,
      tourist_tax: b.tourist_tax,
      supplier_commission: b.supplier_commission,
      match_status: b.match_status,
    }));

    const { error: matchErr } = await adminClient
      .from("partner_purchase_invoice_ticket_matches")
      .insert(matchRows);
    if (matchErr) console.error("Insert matches failed:", matchErr);

    // 3) Update linked program_request_items
    const linked = body.bookings.filter(
      (b) => b.item_id && (b.match_status === "matched" || b.match_status === "manual"),
    );
    for (const b of linked) {
      if (!b.item_id) continue;
      await adminClient
        .from("program_request_items")
        .update({
          partner_purchase_price: b.amount_incl_vat,
          purchase_invoice_id: invoice.id,
          purchase_invoice_matched_at: new Date().toISOString(),
        })
        .eq("id", b.item_id);
    }

    // 4) Mark inbox processed
    await adminClient
      .from("purchase_invoice_inbox")
      .update({
        status: "processed",
        processed_invoice_id: invoice.id,
        processed_by: userData.user.id,
        processed_at: new Date().toISOString(),
      })
      .eq("id", body.inbox_id);

    // 5) Optional: forward to Snelstart
    let forwarded = false;
    if (body.forward_to_snelstart && MAILJET_API_KEY && MAILJET_SECRET_KEY) {
      try {
        const { data: settings } = await adminClient
          .from("app_settings")
          .select("value")
          .eq("id", "snelstart_email")
          .single();
        const snelstartEmail = settings?.value
          ? (typeof settings.value === "string" ? settings.value.replace(/"/g, "") : String(settings.value))
          : "bureauvlieland@boekhouding.nl";

        const html = buildSummaryHtml(body, invoice);
        const subject = `Inkoopfactuur ${body.invoice.invoice_number} — Verzamelfactuur (€ ${body.invoice.total_incl_vat.toFixed(2)})`;

        const emailMessage: Record<string, unknown> = {
          From: { Email: "hallo@bureauvlieland.nl", Name: "Bureau Vlieland Admin" },
          To: [{ Email: snelstartEmail, Name: "Boekhouding" }],
          Subject: subject,
          HTMLPart: html,
          TrackOpens: "disabled",
          TrackClicks: "disabled",
        };

        // Attach PDF
        if (inbox.attachment_path) {
          const { data: fileData } = await adminClient.storage
            .from("partner-invoices")
            .download(inbox.attachment_path);
          if (fileData) {
            const ab = await fileData.arrayBuffer();
            const b64 = btoa(new Uint8Array(ab).reduce((d, b) => d + String.fromCharCode(b), ""));
            emailMessage.Attachments = [{
              ContentType: "application/pdf",
              Filename: inbox.attachment_filename || `${body.invoice.invoice_number}.pdf`,
              Base64Content: b64,
            }];
          }
        }

        const mjResp = await fetch("https://api.mailjet.com/v3.1/send", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Basic ${btoa(`${MAILJET_API_KEY}:${MAILJET_SECRET_KEY}`)}`,
          },
          body: JSON.stringify({ Messages: [emailMessage] }),
        });

        if (mjResp.ok) {
          forwarded = true;
          await adminClient
            .from("partner_purchase_invoices")
            .update({
              status: "forwarded",
              forwarded_to_accounting_at: new Date().toISOString(),
              forwarded_by: userData.user.id,
            })
            .eq("id", invoice.id);

          // Log email
          await adminClient.from("email_log").insert({
            email_type: "purchase_invoice_forward",
            recipient_email: snelstartEmail,
            recipient_name: "Boekhouding",
            subject,
            status: "sent",
            sent_by: userData.user.id,
            related_partner_id: body.partner_id,
            metadata: {
              template_name: "collective_invoice_forward",
              actor: "admin → boekhouding",
              invoiceId: invoice.id,
              is_collective: true,
            },
          });
        } else {
          console.error("Mailjet failed:", await mjResp.text());
        }
      } catch (mailErr) {
        console.error("Forward error:", mailErr);
      }
    }

    return j({ success: true, invoice_id: invoice.id, forwarded });
  } catch (err) {
    console.error("finalize-collective-invoice error:", err);
    return j({ error: err instanceof Error ? err.message : "Unknown error" }, 500);
  }
});

function buildSummaryHtml(body: FinalizeBody, invoice: any): string {
  const rows = body.bookings
    .map((b) => {
      const proj = b.item_id ? "✓ gekoppeld" : b.match_status === "internal" ? "intern" : "—";
      return `<tr>
        <td style="padding:4px 8px;border-bottom:1px solid #eee">${b.resnr}</td>
        <td style="padding:4px 8px;border-bottom:1px solid #eee">${escapeHtml(b.customer_name)}</td>
        <td style="padding:4px 8px;border-bottom:1px solid #eee">${(b.departure_dates || []).join(" / ")}</td>
        <td style="padding:4px 8px;border-bottom:1px solid #eee;text-align:right">€ ${b.amount_incl_vat.toFixed(2)}</td>
        <td style="padding:4px 8px;border-bottom:1px solid #eee;font-size:11px;color:#666">${proj}</td>
      </tr>`;
    })
    .join("");

  return `<div style="font-family:Arial,sans-serif;max-width:720px">
    <h2>Verzamelfactuur ${body.invoice.invoice_number}</h2>
    <p><strong>Datum:</strong> ${body.invoice.invoice_date}<br/>
       <strong>Totaal incl. BTW:</strong> € ${body.invoice.total_incl_vat.toFixed(2)}<br/>
       <strong>Commissie BV (verrekend):</strong> € ${body.invoice.total_supplier_commission.toFixed(2)}</p>
    <table style="width:100%;border-collapse:collapse;font-size:13px;margin-top:12px">
      <thead><tr style="background:#f7f7f7">
        <th style="padding:6px 8px;text-align:left">Resnr</th>
        <th style="padding:6px 8px;text-align:left">Klant</th>
        <th style="padding:6px 8px;text-align:left">Datum(s)</th>
        <th style="padding:6px 8px;text-align:right">Bedrag</th>
        <th style="padding:6px 8px;text-align:left">Project</th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <p style="color:#999;font-size:11px;margin-top:16px">Automatisch verstuurd vanuit Bureau Vlieland administratie.</p>
  </div>`;
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]!));
}

function j(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
