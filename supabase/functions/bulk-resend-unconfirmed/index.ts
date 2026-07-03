// Bulk resend van email_log rijen zonder mailjet_message_id (Mailjet parsing-fix).
// - Filtert op action-oriented email_types
// - Filtert op actieve projecten met toekomstige start_date
// - Dry-run modus toont wat er verstuurd zou worden
// - Execute modus roept resend-email per row aan met rate limiting

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Action-oriented email types (klant of partner wacht op deze mail)
const ACTION_TYPES = [
  "program_request_bureau",
  "program_request_customer",
  "program_request_partner",
  "quote_request_bureau",
  "quote_request_customer",
  "quote_offer_customer",
  "accommodation_quote_request_partner",
  "accommodation_quote_notification",
  "accommodation_selected_partner",
  "accommodation_selected_customer",
  "counter_proposal_partner",
  "cancellation_customer",
  "cancellation_partner",
  "status_confirmed",
  "status_alternative",
];

interface Body {
  dry_run?: boolean;
  batch_id?: string; // optioneel; anders gegenereerd
  ids?: string[];   // optioneel: expliciete email_log ids
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Niet geauthenticeerd" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, anon, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) return json({ error: "Niet geauthenticeerd" }, 401);

    const admin = createClient(supabaseUrl, serviceKey);
    const { data: isAdminRow } = await admin.rpc("has_role", {
      _user_id: userData.user.id,
      _role: "admin",
    });
    if (!isAdminRow) return json({ error: "Alleen admins" }, 403);

    const body: Body = await req.json().catch(() => ({}));
    const dryRun = body.dry_run !== false; // default true
    const batchId = body.batch_id || `bulk-resend-${new Date().toISOString()}`;

    // Query candidates
    let query = admin
      .from("email_log")
      .select("id, email_type, subject, recipient_email, recipient_name, related_request_id, related_accommodation_id, related_partner_id, status, sent_at, created_at, html_body, mailjet_message_id, metadata")
      .is("mailjet_message_id", null)
      .eq("status", "sent")
      .in("email_type", ACTION_TYPES)
      .order("created_at", { ascending: false })
      .limit(500);

    if (body.ids?.length) {
      query = admin
        .from("email_log")
        .select("id, email_type, subject, recipient_email, recipient_name, related_request_id, related_accommodation_id, related_partner_id, status, sent_at, created_at, html_body, mailjet_message_id, metadata")
        .in("id", body.ids);
    }

    const { data: candidates, error: qErr } = await query;
    if (qErr) return json({ error: qErr.message }, 500);

    // Filter: alleen mails op actieve projecten met toekomstige start_date
    // (relevant voor program_requests met start_date; voor accommodation_requests: arrival_date)
    const requestIds = Array.from(new Set((candidates || []).map(r => r.related_request_id).filter(Boolean))) as string[];
    const accIds = Array.from(new Set((candidates || []).map(r => r.related_accommodation_id).filter(Boolean))) as string[];

    const activeRequestIds = new Set<string>();
    const activeAccIds = new Set<string>();
    const todayIso = new Date().toISOString().split("T")[0];

    if (requestIds.length) {
      const { data: reqs } = await admin
        .from("program_requests")
        .select("id, status, start_date, deleted_at")
        .in("id", requestIds);
      for (const r of reqs || []) {
        const startOk = !r.start_date || r.start_date >= todayIso;
        const notDead = !r.deleted_at && !["cancelled", "completed", "fully_invoiced"].includes(r.status || "");
        if (startOk && notDead) activeRequestIds.add(r.id);
      }
    }
    if (accIds.length) {
      const { data: reqs } = await admin
        .from("accommodation_requests")
        .select("id, status, arrival_date")
        .in("id", accIds);
      for (const r of reqs || []) {
        const startOk = !r.arrival_date || r.arrival_date >= todayIso;
        const notDead = !["cancelled", "declined"].includes(r.status || "");
        if (startOk && notDead) activeAccIds.add(r.id);
      }
    }

    const filtered = (candidates || []).filter(r => {
      // Als er een gekoppeld project is, moet dat actief zijn.
      if (r.related_request_id && !activeRequestIds.has(r.related_request_id)) return false;
      if (r.related_accommodation_id && !activeAccIds.has(r.related_accommodation_id)) return false;
      // Zonder gekoppeld project: alleen als expliciet ids meegegeven
      if (!r.related_request_id && !r.related_accommodation_id && !body.ids) return false;
      // Moet html_body hebben om resendbaar te zijn
      if (!r.html_body) return false;
      return true;
    });

    if (dryRun) {
      return json({
        dry_run: true,
        total_candidates: candidates?.length || 0,
        eligible_count: filtered.length,
        batch_id: batchId,
        items: filtered.map(r => ({
          id: r.id,
          email_type: r.email_type,
          subject: r.subject,
          recipient_email: r.recipient_email,
          recipient_name: r.recipient_name,
          related_request_id: r.related_request_id,
          related_accommodation_id: r.related_accommodation_id,
          sent_at: r.sent_at || r.created_at,
        })),
      });
    }

    // Execute: roep resend-email per row aan met 500ms delay
    const results: Array<{ id: string; ok: boolean; new_id?: string; error?: string }> = [];
    for (const row of filtered) {
      try {
        const resp = await fetch(`${supabaseUrl}/functions/v1/resend-email`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": authHeader,
          },
          body: JSON.stringify({
            email_log_id: row.id,
          }),
        });
        const j = await resp.json().catch(() => ({}));
        if (!resp.ok || j?.error) {
          results.push({ id: row.id, ok: false, error: j?.error || `HTTP ${resp.status}` });
        } else {
          results.push({ id: row.id, ok: true, new_id: j?.new_email_log_id });
          // Tag de nieuwe log-rij met batch_id in metadata
          if (j?.new_email_log_id) {
            await admin
              .from("email_log")
              .update({
                metadata: { ...(row.metadata as object || {}), bulk_resend_batch_id: batchId, resend_of: row.id },
              })
              .eq("id", j.new_email_log_id);
          }
        }
      } catch (e) {
        results.push({ id: row.id, ok: false, error: e instanceof Error ? e.message : "unknown" });
      }
      await new Promise(r => setTimeout(r, 500));
    }

    return json({
      dry_run: false,
      batch_id: batchId,
      processed: results.length,
      succeeded: results.filter(r => r.ok).length,
      failed: results.filter(r => !r.ok).length,
      results,
    });
  } catch (e) {
    console.error("bulk-resend-unconfirmed error:", e);
    return json({ error: e instanceof Error ? e.message : "unknown" }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
