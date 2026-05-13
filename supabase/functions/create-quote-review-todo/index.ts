import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  getRenderedTemplate,
  SENDER_EMAIL,
  SENDER_NAME,
  getPortalBaseUrl,
  getSubjectPrefix,
  getRecipientEmail,
  formatCurrencyNL,
  buildReplyTo,
} from "../_shared/email-templates.ts";
import { logEmail, EmailTypes } from "../_shared/email-logger.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const ADMIN_EMAIL = "erwin@bureauvlieland.nl";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { quoteId } = await req.json();

    if (!quoteId) {
      return new Response(
        JSON.stringify({ error: "quoteId is verplicht" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch the quote with request and partner data
    const { data: quote, error: quoteError } = await supabase
      .from("accommodation_quotes")
      .select(`
        id,
        accommodation_name,
        price_total,
        partner_id,
        request_id,
        partner:partners(id, name, email),
        request:accommodation_requests(
          id,
          customer_name,
          customer_company,
          reference_number,
          linked_program_id
        )
      `)
      .eq("id", quoteId)
      .single();

    if (quoteError || !quote) {
      console.error("Quote error:", quoteError);
      return new Response(
        JSON.stringify({ error: "Offerte niet gevonden" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const partner = quote.partner as { id: string; name: string; email: string } | null;
    const request = quote.request as { 
      id: string; 
      customer_name: string; 
      customer_company: string | null;
      reference_number: string | null;
      linked_program_id: string | null;
    } | null;

    if (!partner || !request) {
      return new Response(
        JSON.stringify({ error: "Partner of aanvraag niet gevonden" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const customerDisplay = request.customer_company || request.customer_name;
    const refPrefix = request.reference_number ? ` (${request.reference_number})` : "";

    // Check if auto-todo already exists
    const { data: existingTodo } = await supabase
      .from("admin_todos")
      .select("id")
      .eq("auto_type", "quote_review")
      .eq("auto_entity_id", quoteId)
      .neq("status", "done")
      .maybeSingle();

    if (existingTodo) {
      console.log(`Auto todo already exists for quote ${quoteId}`);
      return new Response(
        JSON.stringify({ success: true, todo_id: existingTodo.id, existing: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create the auto-todo
    const { data: todo, error: todoError } = await supabase
      .from("admin_todos")
      .insert({
        title: `Nieuwe logiesofferte: ${partner.name} voor ${customerDisplay}${refPrefix}`,
        description: `Partner ${partner.name} heeft een offerte ingediend voor "${quote.accommodation_name}" (€${quote.price_total.toLocaleString()}). Beoordeel de offerte en stuur deze door naar de klant.`,
        priority: "normal",
        status: "todo",
        related_request_id: request.linked_program_id || null,
        related_partner_id: partner.id,
        auto_type: "quote_review",
        auto_entity_id: quoteId,
      })
      .select("id")
      .single();

    if (todoError) {
      console.error("Error creating todo:", todoError);
      return new Response(
        JSON.stringify({ error: "Kon todo niet aanmaken" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Created quote_review todo for quote ${quoteId}: ${todo.id}`);

    // Bureau-mail bij nieuwe offerte is geschrapt — admin ziet de todo direct in dashboard.

    return new Response(
      JSON.stringify({ success: true, todo_id: todo.id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in create-quote-review-todo:", error);
    return new Response(
      JSON.stringify({ error: "Interne fout" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
