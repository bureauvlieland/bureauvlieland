import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface Body {
  source: "customer_portal" | "partner_portal";
  sourceToken?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  try {
    const body = (await req.json()) as Body;
    if (!body?.source || body.source !== "customer_portal" || !body.sourceToken || typeof body.sourceToken !== "string" || body.sourceToken.length < 8) {
      return new Response(JSON.stringify({ error: "Invalid request" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Validate token belongs to a real program_request
    const { data: program } = await supabase
      .from("program_requests")
      .select("id")
      .eq("customer_token", body.sourceToken)
      .maybeSingle();
    if (!program) {
      return new Response(JSON.stringify({ error: "Invalid token" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Find latest open conversation for this token
    const { data: convs } = await supabase
      .from("chat_conversations")
      .select("*")
      .eq("source", "customer_portal")
      .eq("source_token", body.sourceToken)
      .neq("status", "closed")
      .order("created_at", { ascending: false })
      .limit(1);
    const conversation = convs?.[0] ?? null;

    let messages: unknown[] = [];
    if (conversation) {
      const { data: msgs } = await supabase
        .from("chat_messages")
        .select("*")
        .eq("conversation_id", conversation.id)
        .order("created_at", { ascending: true });
      messages = msgs ?? [];
    }

    // Admin presence (boolean)
    const { data: presence } = await supabase
      .from("chat_admin_presence")
      .select("is_online")
      .eq("is_online", true)
      .limit(1);
    const isAdminOnline = !!presence && presence.length > 0;

    return new Response(
      JSON.stringify({ conversation, messages, isAdminOnline }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("chat-visitor-thread error:", err);
    return new Response(JSON.stringify({ error: "Server error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
