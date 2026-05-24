// ensure-smoke-test-fixture — idempotent CI fixture for smoke tests.
// Batch 5 #5. Looks up (or creates) a fixed-label program_request + one
// program_request_item used by the pending-flow smoke test. Returns
// { request_id, item_id }.
//
// Auth: shared header `x-ci-secret` MUST equal env CI_FIXTURE_SECRET.
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-ci-secret",
};

const FIXTURE_LABEL = "CI smoke test fixture — do not delete";
const FIXTURE_EMAIL = "ci-fixture@bureauvlieland.invalid";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const secret = req.headers.get("x-ci-secret") ?? "";
    const expected = Deno.env.get("CI_FIXTURE_SECRET") ?? "";
    if (!expected || secret !== expected) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // 1. Find or create program_request
    const { data: existingReq } = await supabase
      .from("program_requests")
      .select("id, customer_token")
      .eq("customer_email", FIXTURE_EMAIL)
      .eq("customer_name", FIXTURE_LABEL)
      .maybeSingle();

    let requestId = existingReq?.id as string | undefined;
    if (!requestId) {
      const token = crypto.randomUUID().replace(/-/g, "");
      const { data: inserted, error } = await supabase
        .from("program_requests")
        .insert({
          customer_token: token,
          customer_name: FIXTURE_LABEL,
          customer_email: FIXTURE_EMAIL,
          customer_phone: "0000000000",
          number_of_people: 2,
          selected_dates: [new Date().toISOString().slice(0,10)],
          status: "draft",
        })
        .select("id")
        .single();
      if (error) throw error;
      requestId = inserted.id;
    }

    // 2. Find or create test item (label-based dedup)
    const { data: existingItem } = await supabase
      .from("program_request_items")
      .select("id")
      .eq("request_id", requestId!)
      .eq("block_name", "CI smoke test item")
      .maybeSingle();

    let itemId = existingItem?.id as string | undefined;
    if (!itemId) {
      const { data: insItem, error } = await supabase
        .from("program_request_items")
        .insert({
          request_id: requestId!,
          block_id: "ci-smoke-block",
          block_name: "CI smoke test item",
          block_category: "activity",
          provider_name: "CI Fixture Provider",
          provider_id: "ci-fixture",
          block_type: "bureau",
          day_index: 0,
          status: "pending",
          skip_partner_notification: true,
        })
        .select("id")
        .single();
      if (error) throw error;
      itemId = insItem.id;
    } else {
      // Reset any leftover pending_* from a previous failed run
      await supabase
        .from("program_request_items")
        .update({
          pending_preferred_time: null,
          pending_day_index: null,
          pending_customer_notes: null,
          pending_override_people: null,
          pending_marked_for_removal: false,
          pending_added: false,
          pending_changed_at: null,
          pending_changed_by: null,
          pending_baseline: null,
        })
        .eq("id", itemId);
    }

    return new Response(JSON.stringify({
      request_id: requestId,
      item_id: itemId,
      fixture_label: FIXTURE_LABEL,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("ensure-smoke-test-fixture error:", e);
    return new Response(JSON.stringify({ error: String((e as Error).message ?? e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
