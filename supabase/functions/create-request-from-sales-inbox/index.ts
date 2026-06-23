// Create a program_request from a sales_inbox row. Called by the admin UI after
// the user reviews/edits the AI-parsed lead data.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface LeadInput {
  inbox_id: string;
  customer_name: string;
  customer_email: string;
  customer_phone?: string | null;
  customer_company?: string | null;
  number_of_people?: number | null;
  selected_dates?: string[];
  general_notes?: string | null;
}

function generateToken(): string {
  return crypto.randomUUID().replace(/-/g, "");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Verify caller is an authenticated admin
    const authHeader = req.headers.get("Authorization") || "";
    const jwt = authHeader.replace(/^Bearer\s+/i, "");
    if (!jwt) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: userData, error: userErr } = await supabase.auth.getUser(jwt);
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: roleRow } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userData.user.id)
      .eq("role", "admin")
      .maybeSingle();
    if (!roleRow) {
      return new Response(JSON.stringify({ error: "Admin required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = (await req.json()) as LeadInput;
    if (!body?.inbox_id || !body?.customer_name || !body?.customer_email) {
      return new Response(JSON.stringify({ error: "inbox_id, customer_name and customer_email are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: inbox, error: inboxErr } = await supabase
      .from("sales_inbox")
      .select("id, status, processed_request_id, attachments, subject, from_email")
      .eq("id", body.inbox_id)
      .single();
    if (inboxErr || !inbox) {
      return new Response(JSON.stringify({ error: "sales_inbox row not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (inbox.status === "processed" && inbox.processed_request_id) {
      return new Response(JSON.stringify({ request_id: inbox.processed_request_id, already_processed: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const selectedDates = Array.isArray(body.selected_dates) ? body.selected_dates : [];
    const numberOfPeople = Number.isFinite(body.number_of_people as number) && (body.number_of_people as number) > 0
      ? Math.floor(body.number_of_people as number)
      : 20;

    const { data: newRequest, error: insErr } = await supabase
      .from("program_requests")
      .insert({
        customer_token: generateToken(),
        customer_name: body.customer_name,
        customer_email: body.customer_email,
        customer_phone: body.customer_phone || "",
        customer_company: body.customer_company || null,
        number_of_people: numberOfPeople,
        selected_dates: selectedDates,
        general_notes: body.general_notes || null,
        status: "active",
        origin: "sales_inbox",
        admin_created_by: userData.user.id,
      })
      .select("id, reference_number")
      .single();

    if (insErr || !newRequest) {
      console.error("create program_request error:", insErr);
      return new Response(JSON.stringify({ error: insErr?.message || "Insert failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Mark inbox row as processed
    await supabase
      .from("sales_inbox")
      .update({
        status: "processed",
        processed_request_id: newRequest.id,
        processed_by: userData.user.id,
        processed_at: new Date().toISOString(),
      })
      .eq("id", body.inbox_id);

    // Log the original email as inbound communication on the new project
    await supabase.from("project_communications").insert({
      request_id: newRequest.id,
      communication_type: "email_in",
      direction: "inbound",
      audience: "admin",
      subject: inbox.subject || "Sales-aanvraag",
      content: "Bron: Sales Inbox (zie originele mail in inbox).",
      contact_email: inbox.from_email,
      communication_date: new Date().toISOString(),
      metadata: {
        source: "sales_inbox",
        sales_inbox_id: body.inbox_id,
        attachments: inbox.attachments || [],
      },
    });

    return new Response(
      JSON.stringify({
        status: "ok",
        request_id: newRequest.id,
        reference_number: newRequest.reference_number,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("create-request-from-sales-inbox error:", err);
    return new Response(
      JSON.stringify({ status: "error", message: err instanceof Error ? err.message : "Unknown" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
