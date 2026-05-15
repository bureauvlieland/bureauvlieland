import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getRenderedTemplate } from "../_shared/email-templates.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/**
 * Renders an email template with supplied + auto-enriched variables.
 * Admin-only — used by the project communication composer to preview templates.
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Niet geautoriseerd" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsErr } = await userClient.auth.getClaims(token);
    if (claimsErr || !claimsData?.claims?.sub) {
      return new Response(JSON.stringify({ error: "Niet geautoriseerd" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = claimsData.claims.sub as string;

    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleData) {
      return new Response(JSON.stringify({ error: "Geen admin rechten" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({} as any));
    const {
      templateId,
      variables = {},
      requestId,
      accommodationId,
      partnerId,
    } = body || {};

    if (!templateId || typeof templateId !== "string") {
      return new Response(JSON.stringify({ error: "templateId is verplicht" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Auto-enrich variables from project data
    const enriched: Record<string, string | number | undefined | null> = { ...variables };

    if (requestId) {
      const { data: pr } = await supabase
        .from("program_requests")
        .select("reference_number, customer_name, customer_company, number_of_people, customer_token, selected_dates")
        .eq("id", requestId)
        .maybeSingle();
      if (pr) {
        enriched.reference_number = enriched.reference_number ?? pr.reference_number ?? "";
        enriched.customer_name = enriched.customer_name ?? (pr.customer_company || pr.customer_name || "");
        enriched.number_of_people = enriched.number_of_people ?? pr.number_of_people ?? "";
        enriched.portal_url = enriched.portal_url ?? `https://bureauvlieland.nl/mijn-programma/${pr.customer_token}`;
        if (Array.isArray(pr.selected_dates) && pr.selected_dates.length > 0) {
          enriched.event_date = enriched.event_date ?? String(pr.selected_dates[0]);
        }
      }
    }

    if (accommodationId && !enriched.reference_number) {
      const { data: ar } = await supabase
        .from("accommodation_requests")
        .select("reference_number, customer_name, customer_company, number_of_guests, customer_token, arrival_date")
        .eq("id", accommodationId)
        .maybeSingle();
      if (ar) {
        enriched.reference_number = enriched.reference_number ?? ar.reference_number ?? "";
        enriched.customer_name = enriched.customer_name ?? (ar.customer_company || ar.customer_name || "");
        enriched.number_of_people = enriched.number_of_people ?? ar.number_of_guests ?? "";
        enriched.event_date = enriched.event_date ?? ar.arrival_date ?? "";
      }
    }

    if (partnerId) {
      const { data: p } = await supabase
        .from("partners")
        .select("name, booking_contact_name")
        .eq("id", partnerId)
        .maybeSingle();
      if (p) {
        enriched.partner_name = enriched.partner_name ?? (p.booking_contact_name || p.name || "");
      }
    }

    const rendered = await getRenderedTemplate(templateId, enriched);
    if (!rendered) {
      return new Response(JSON.stringify({ error: "Template niet gevonden" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Strip HTML to plaintext for the textarea body — admin can still edit before sending
    const plain = rendered.body
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/p>/gi, "\n\n")
      .replace(/<\/li>/gi, "\n")
      .replace(/<li[^>]*>/gi, "• ")
      .replace(/<\/h[1-6]>/gi, "\n\n")
      .replace(/<[^>]*>/g, "")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#039;/g, "'")
      .replace(/\n{3,}/g, "\n\n")
      .trim();

    return new Response(
      JSON.stringify({ subject: rendered.subject, body: plain, html: rendered.body }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in render-email-template:", error);
    const msg = error instanceof Error ? error.message : "Interne fout";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
