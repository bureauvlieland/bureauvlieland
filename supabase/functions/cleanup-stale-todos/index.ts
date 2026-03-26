import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const anonClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await anonClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Use service role for bulk updates
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const now = new Date().toISOString();
    const results: Record<string, number> = {};

    // 1. Cancelled projects → all open todos done
    const { data: cancelledIds } = await supabase
      .from("program_requests")
      .select("id")
      .not("cancelled_at", "is", null);

    if (cancelledIds?.length) {
      const ids = cancelledIds.map((r: any) => r.id);
      const { data } = await supabase
        .from("admin_todos")
        .update({ status: "done", completed_at: now })
        .in("related_request_id", ids)
        .neq("status", "done")
        .select("id");
      results.cancelled_projects = data?.length || 0;
    }

    // 2. Completed projects → all open todos done
    const { data: completedIds } = await supabase
      .from("program_requests")
      .select("id")
      .eq("completion_status", "completed");

    if (completedIds?.length) {
      const ids = completedIds.map((r: any) => r.id);
      const { data } = await supabase
        .from("admin_todos")
        .update({ status: "done", completed_at: now })
        .in("related_request_id", ids)
        .neq("status", "done")
        .select("id");
      results.completed_projects = data?.length || 0;
    }

    // 3. quote_pending_partner but quote no longer pending
    const { data: pendingPartnerTodos } = await supabase
      .from("admin_todos")
      .select("id, auto_entity_id")
      .eq("auto_type", "quote_pending_partner")
      .neq("status", "done");

    if (pendingPartnerTodos?.length) {
      const quoteIds = pendingPartnerTodos.map((t: any) => t.auto_entity_id).filter(Boolean);
      const { data: stillPending } = await supabase
        .from("accommodation_quotes")
        .select("id")
        .in("id", quoteIds)
        .eq("status", "pending");
      const stillPendingIds = new Set((stillPending || []).map((q: any) => q.id));
      const staleIds = pendingPartnerTodos
        .filter((t: any) => !stillPendingIds.has(t.auto_entity_id))
        .map((t: any) => t.id);
      if (staleIds.length) {
        await supabase
          .from("admin_todos")
          .update({ status: "done", completed_at: now })
          .in("id", staleIds);
        results.quote_pending_partner = staleIds.length;
      }
    }

    // 4. quote_review but quote no longer submitted
    const { data: reviewTodos } = await supabase
      .from("admin_todos")
      .select("id, auto_entity_id")
      .eq("auto_type", "quote_review")
      .neq("status", "done");

    if (reviewTodos?.length) {
      const quoteIds = reviewTodos.map((t: any) => t.auto_entity_id).filter(Boolean);
      const { data: stillSubmitted } = await supabase
        .from("accommodation_quotes")
        .select("id")
        .in("id", quoteIds)
        .eq("status", "submitted");
      const stillSubmittedIds = new Set((stillSubmitted || []).map((q: any) => q.id));
      const staleIds = reviewTodos
        .filter((t: any) => !stillSubmittedIds.has(t.auto_entity_id))
        .map((t: any) => t.id);
      if (staleIds.length) {
        await supabase
          .from("admin_todos")
          .update({ status: "done", completed_at: now })
          .in("id", staleIds);
        results.quote_review = staleIds.length;
      }
    }

    // 5. forward_accommodation_quote but already forwarded
    const { data: forwardTodos } = await supabase
      .from("admin_todos")
      .select("id, auto_entity_id")
      .eq("auto_type", "forward_accommodation_quote")
      .neq("status", "done");

    if (forwardTodos?.length) {
      const quoteIds = forwardTodos.map((t: any) => t.auto_entity_id).filter(Boolean);
      const { data: alreadyForwarded } = await supabase
        .from("accommodation_quotes")
        .select("id")
        .in("id", quoteIds)
        .not("forwarded_at", "is", null);
      const forwardedIds = new Set((alreadyForwarded || []).map((q: any) => q.id));
      const staleIds = forwardTodos
        .filter((t: any) => forwardedIds.has(t.auto_entity_id))
        .map((t: any) => t.id);
      if (staleIds.length) {
        await supabase
          .from("admin_todos")
          .update({ status: "done", completed_at: now })
          .in("id", staleIds);
        results.forward_accommodation_quote = staleIds.length;
      }
    }

    // 6. quote_ready_to_send but quote already sent
    const { data: readyToSendTodos } = await supabase
      .from("admin_todos")
      .select("id, related_request_id")
      .eq("auto_type", "quote_ready_to_send")
      .neq("status", "done");

    if (readyToSendTodos?.length) {
      const reqIds = readyToSendTodos.map((t: any) => t.related_request_id).filter(Boolean);
      const { data: alreadySent } = await supabase
        .from("program_requests")
        .select("id")
        .in("id", reqIds)
        .not("quote_sent_at", "is", null);
      const sentIds = new Set((alreadySent || []).map((r: any) => r.id));
      const staleIds = readyToSendTodos
        .filter((t: any) => sentIds.has(t.related_request_id))
        .map((t: any) => t.id);
      if (staleIds.length) {
        await supabase
          .from("admin_todos")
          .update({ status: "done", completed_at: now })
          .in("id", staleIds);
        results.quote_ready_to_send = staleIds.length;
      }
    }

    // 7. send_items_to_partners but no pending items left
    const { data: sendItemsTodos } = await supabase
      .from("admin_todos")
      .select("id, related_request_id")
      .eq("auto_type", "send_items_to_partners")
      .neq("status", "done");

    if (sendItemsTodos?.length) {
      const staleIds: string[] = [];
      for (const todo of sendItemsTodos) {
        if (!todo.related_request_id) { staleIds.push(todo.id); continue; }
        const { data: pendingItems } = await supabase
          .from("program_request_items")
          .select("id")
          .eq("request_id", todo.related_request_id)
          .eq("status", "pending")
          .limit(1);
        if (!pendingItems?.length) staleIds.push(todo.id);
      }
      if (staleIds.length) {
        await supabase
          .from("admin_todos")
          .update({ status: "done", completed_at: now })
          .in("id", staleIds);
        results.send_items_to_partners = staleIds.length;
      }
    }

    // 8. accommodation_selected but quote already selected
    const { data: accomSelectedTodos } = await supabase
      .from("admin_todos")
      .select("id, auto_entity_id")
      .eq("auto_type", "accommodation_selected")
      .neq("status", "done");

    if (accomSelectedTodos?.length) {
      const quoteIds = accomSelectedTodos.map((t: any) => t.auto_entity_id).filter(Boolean);
      const { data: selectedQuotes } = await supabase
        .from("accommodation_quotes")
        .select("id")
        .in("id", quoteIds)
        .eq("status", "selected");
      const selectedIds = new Set((selectedQuotes || []).map((q: any) => q.id));
      const staleIds = accomSelectedTodos
        .filter((t: any) => selectedIds.has(t.auto_entity_id))
        .map((t: any) => t.id);
      if (staleIds.length) {
        await supabase
          .from("admin_todos")
          .update({ status: "done", completed_at: now })
          .in("id", staleIds);
        results.accommodation_selected = staleIds.length;
      }
    }

    const totalCleaned = Object.values(results).reduce((a, b) => a + b, 0);

    return new Response(
      JSON.stringify({ cleaned: totalCleaned, details: results }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("Cleanup error:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
