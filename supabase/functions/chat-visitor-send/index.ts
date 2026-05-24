import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface Body {
  source: "customer_portal";
  sourceToken: string;
  visitorName: string;
  visitorEmail: string;
  content: string;
  requestId?: string | null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  try {
    const body = (await req.json()) as Body;
    if (
      !body?.sourceToken ||
      typeof body.sourceToken !== "string" ||
      body.sourceToken.length < 8 ||
      !body.content ||
      typeof body.content !== "string" ||
      body.content.trim().length === 0 ||
      body.content.length > 4000
    ) {
      return new Response(JSON.stringify({ error: "Invalid request" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Validate token
    const { data: program } = await supabase
      .from("program_requests")
      .select("id, customer_name, customer_email")
      .eq("customer_token", body.sourceToken)
      .maybeSingle();
    if (!program) {
      return new Response(JSON.stringify({ error: "Invalid token" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Find or create conversation
    const { data: existing } = await supabase
      .from("chat_conversations")
      .select("*")
      .eq("source", "customer_portal")
      .eq("source_token", body.sourceToken)
      .neq("status", "closed")
      .order("created_at", { ascending: false })
      .limit(1);

    let conversation = existing?.[0] ?? null;
    if (!conversation) {
      const { data: created, error } = await supabase
        .from("chat_conversations")
        .insert({
          source: "customer_portal",
          source_token: body.sourceToken,
          visitor_name: (body.visitorName || program.customer_name || "").slice(0, 200),
          visitor_email: (body.visitorEmail || program.customer_email || "").slice(0, 200),
          request_id: body.requestId || program.id,
          status: "active",
          last_message_at: new Date().toISOString(),
        })
        .select()
        .single();
      if (error || !created) {
        console.error("create conv error", error);
        return new Response(JSON.stringify({ error: "Could not create conversation" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      conversation = created;
    }

    // Insert message
    const { data: msg, error: msgErr } = await supabase
      .from("chat_messages")
      .insert({
        conversation_id: conversation.id,
        sender_type: "visitor",
        sender_name: (body.visitorName || program.customer_name || "Klant").slice(0, 200),
        content: body.content.trim(),
      })
      .select()
      .single();
    if (msgErr) {
      console.error("insert msg error", msgErr);
      return new Response(JSON.stringify({ error: "Could not send message" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    await supabase
      .from("chat_conversations")
      .update({ last_message_at: new Date().toISOString(), status: "active" })
      .eq("id", conversation.id);

    // Fire-and-forget email notification
    supabase.functions
      .invoke("notify-new-chat", { body: { conversation_id: conversation.id } })
      .catch((e) => console.error("notify-new-chat invoke failed", e));

    return new Response(
      JSON.stringify({ conversation, message: msg }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("chat-visitor-send error:", err);
    return new Response(JSON.stringify({ error: "Server error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
