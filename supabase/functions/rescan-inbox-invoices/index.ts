// Batch-rescan of purchase invoice inbox items (admin only).
// Re-runs the AI scan via scan-purchase-invoice-internal so newer fields
// (like supplier_iban) get populated on older scan results.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const service = createClient(supabaseUrl, serviceKey);

    // Admin auth check
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace(/^Bearer\s+/i, "");
    if (!token) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { data: userData, error: userErr } = await service.auth.getUser(token);
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { data: isAdmin } = await service.rpc("is_admin", { _user_id: userData.user.id });
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const limit = Math.min(Math.max(Number(body?.limit) || 30, 1), 50);

    // Items that were scanned before supplier_iban existed (key absent in scan_result),
    // plus stale 'scanning'/'failed' items that need a retry.
    const { data: items, error: selErr } = await service
      .from("purchase_invoice_inbox")
      .select("id, attachment_path, scan_result, scan_status")
      .not("attachment_path", "is", null)
      .in("scan_status", ["scanned", "scanning", "failed"])
      .order("created_at", { ascending: true });
    if (selErr) throw selErr;

    const pending = (items || []).filter(
      (i) =>
        i.scan_status !== "scanned" ||
        !i.scan_result ||
        !Object.prototype.hasOwnProperty.call(i.scan_result, "supplier_iban"),
    );
    const batch = pending.slice(0, limit);

    const scanOne = async (item: { id: string; attachment_path: string | null }) => {
      try {
        const resp = await fetch(`${supabaseUrl}/functions/v1/scan-purchase-invoice-internal`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${serviceKey}`,
          },
          body: JSON.stringify({ inbox_id: item.id, file_path: item.attachment_path }),
        });
        console.log(`Rescan ${item.id}: HTTP ${resp.status}`);
        await resp.text().catch(() => null);
      } catch (e) {
        console.error(`Rescan ${item.id} failed:`, e);
      }
    };

    // Background worker pool (concurrency 3) so we can respond immediately
    const queue = [...batch];
    const worker = async () => {
      while (queue.length > 0) {
        const item = queue.shift();
        if (!item) break;
        await scanOne(item);
      }
    };
    const allWork = Promise.allSettled([worker(), worker(), worker()]);

    // deno-lint-ignore no-explicit-any
    const edgeRuntime = (globalThis as any).EdgeRuntime;
    if (edgeRuntime?.waitUntil) {
      edgeRuntime.waitUntil(allWork);
    } else {
      allWork.catch(() => null);
    }

    return new Response(
      JSON.stringify({
        status: "started",
        queued: batch.length,
        remaining_after_batch: Math.max(0, pending.length - batch.length),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("rescan-inbox-invoices error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
