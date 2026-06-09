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

    // Auto-enrich variables from project data.
    const enriched: Record<string, string | number | undefined | null> = { ...variables };

    // Helper: greeting first-name, prefer contact-person, never company.
    const firstNameOrPolite = (contactName: string | null | undefined): string => {
      const name = (contactName || "").trim();
      if (!name) return "heer/mevrouw";
      return name.split(/\s+/)[0];
    };

    const daysSince = (iso: string | null | undefined): number | undefined => {
      if (!iso) return undefined;
      const t = new Date(iso).getTime();
      if (!Number.isFinite(t)) return undefined;
      return Math.max(0, Math.floor((Date.now() - t) / 86400000));
    };

    if (requestId) {
      const { data: pr } = await supabase
        .from("program_requests")
        .select(
          "reference_number, customer_name, customer_company, customer_email, number_of_people, customer_token, selected_dates, created_at, quote_sent_at",
        )
        .eq("id", requestId)
        .maybeSingle();
      if (pr) {
        const contact = pr.customer_name || ""; // customer_name = contactpersoon
        enriched.customer_contact_name = enriched.customer_contact_name ?? contact;
        enriched.customer_company = enriched.customer_company ?? (pr.customer_company || "");
        enriched.customer_email = enriched.customer_email ?? (pr.customer_email || "");
        // {{customer_name}} wordt in templates ná "Beste " gebruikt — moet de
        // contactpersoon zijn, nooit de bedrijfsnaam. Gebruik {{customer_company}}
        // expliciet als bedrijfsnaam nodig is.
        enriched.customer_name = enriched.customer_name ?? firstNameOrPolite(contact);
        enriched.salutation = enriched.salutation ?? `Beste ${firstNameOrPolite(contact)}`;
        enriched.reference_number = enriched.reference_number ?? pr.reference_number ?? "";
        enriched.number_of_people = enriched.number_of_people ?? pr.number_of_people ?? "";

        const portalUrl = `https://bureauvlieland.nl/mijn-programma/${pr.customer_token}`;
        // Vul alle URL-aliassen die in templates voorkomen.
        enriched.portal_url = enriched.portal_url ?? portalUrl;
        enriched.portal_link = enriched.portal_link ?? portalUrl;
        enriched.programma_url = enriched.programma_url ?? portalUrl;
        enriched.customer_portal_url = enriched.customer_portal_url ?? portalUrl;

        if (Array.isArray(pr.selected_dates) && pr.selected_dates.length > 0) {
          enriched.event_date = enriched.event_date ?? String(pr.selected_dates[0]);
        }
        const dRequest = daysSince(pr.created_at);
        if (dRequest !== undefined) {
          enriched.days_since = enriched.days_since ?? dRequest;
          enriched.days_ago = enriched.days_ago ?? dRequest;
          enriched.days_since_request = enriched.days_since_request ?? dRequest;
        }
        const dQuote = daysSince(pr.quote_sent_at);
        if (dQuote !== undefined) {
          enriched.days_since_quote = enriched.days_since_quote ?? dQuote;
        }
      }
    }

    if (accommodationId) {
      const { data: ar } = await supabase
        .from("accommodation_requests")
        .select(
          "reference_number, customer_name, customer_company, number_of_guests, customer_token, arrival_date, departure_date, created_at",
        )
        .eq("id", accommodationId)
        .maybeSingle();
      if (ar) {
        const contact = ar.customer_name || "";
        enriched.customer_contact_name = enriched.customer_contact_name ?? contact;
        enriched.customer_company = enriched.customer_company ?? (ar.customer_company || "");
        enriched.customer_name = enriched.customer_name ?? firstNameOrPolite(contact);
        enriched.salutation = enriched.salutation ?? `Beste ${firstNameOrPolite(contact)}`;
        enriched.reference_number = enriched.reference_number ?? ar.reference_number ?? "";
        enriched.number_of_people = enriched.number_of_people ?? ar.number_of_guests ?? "";
        enriched.number_of_guests = enriched.number_of_guests ?? ar.number_of_guests ?? "";
        enriched.arrival_date = enriched.arrival_date ?? ar.arrival_date ?? "";
        enriched.departure_date = enriched.departure_date ?? ar.departure_date ?? "";
        enriched.event_date = enriched.event_date ?? ar.arrival_date ?? "";

        const portalUrl = `https://bureauvlieland.nl/mijn-logies/${ar.customer_token}`;
        enriched.portal_url = enriched.portal_url ?? portalUrl;
        enriched.portal_link = enriched.portal_link ?? portalUrl;

        const dReq = daysSince(ar.created_at);
        if (dReq !== undefined) {
          enriched.days_since = enriched.days_since ?? dReq;
          enriched.days_ago = enriched.days_ago ?? dReq;
        }
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
        const partnerUrl = `https://bureauvlieland.nl/partner`;
        enriched.partner_portal_link = enriched.partner_portal_link ?? partnerUrl;
        enriched.partner_portal_url = enriched.partner_portal_url ?? partnerUrl;
      }
    }

    const rendered = await getRenderedTemplate(templateId, enriched);
    if (!rendered) {
      return new Response(JSON.stringify({ error: "Template niet gevonden" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Strip HTML to plaintext for the textarea body — admin can still edit
    // before sending. Anchor URLs blijven behouden zodat de admin de link
    // ziet en kan controleren.
    const plain = rendered.body
      .replace(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi, (_m, url, text) => {
        const clean = String(text).replace(/<[^>]*>/g, "").trim();
        if (!clean) return String(url);
        if (clean === url) return String(url);
        return `${clean} (${url})`;
      })
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
