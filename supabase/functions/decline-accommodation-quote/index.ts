import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendLodgingBureauAlert } from "../_shared/lodging-bureau-alert.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const jsonResponse = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * decline-accommodation-quote
 *
 * Partner (of meekijkende admin) wijst een logies-offerteaanvraag af.
 * Loopt via service role zodat de neveneffecten — werkbanktaak, historie,
 * dossier-tijdlijn — gegarandeerd landen. Client-side inserts falen hierop
 * stilletjes door RLS (admin_todos / program_request_history zijn admin-only),
 * wat ertoe leidde dat een afwijzing onzichtbaar bleef voor het bureau.
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // 1) Authenticate caller
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return jsonResponse({ error: "Niet ingelogd" }, 401);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return jsonResponse({ error: "Ongeldige sessie" }, 401);
    }

    // 2) Validate input
    let body: {
      quoteId?: unknown;
      declineReason?: unknown;
      proposedArrival?: unknown;
      proposedDeparture?: unknown;
    };
    try {
      body = await req.json();
    } catch {
      return jsonResponse({ error: "Ongeldige request body" }, 400);
    }

    const quoteId = typeof body.quoteId === "string" ? body.quoteId : "";
    if (!quoteId) {
      return jsonResponse({ error: "quoteId is verplicht" }, 400);
    }

    const declineReason =
      typeof body.declineReason === "string" ? body.declineReason.trim().slice(0, 2000) : "";
    const proposedArrival =
      typeof body.proposedArrival === "string" && DATE_RE.test(body.proposedArrival)
        ? body.proposedArrival
        : null;
    const proposedDeparture =
      typeof body.proposedDeparture === "string" && DATE_RE.test(body.proposedDeparture)
        ? body.proposedDeparture
        : null;
    const hasAlternativeDates = !!(proposedArrival && proposedDeparture);

    // 3) Fetch quote with partner + request context
    const { data: quote, error: quoteError } = await supabase
      .from("accommodation_quotes")
      .select(`
        id,
        status,
        partner_id,
        request_id,
        partner:partners(id, name),
        request:accommodation_requests(
          id,
          customer_name,
          customer_company,
          reference_number,
          linked_program_id,
          arrival_date,
          departure_date,
          number_of_guests
        )
      `)
      .eq("id", quoteId)
      .single();

    if (quoteError || !quote) {
      console.error("Quote not found:", quoteError);
      return jsonResponse({ error: "Offerte niet gevonden" }, 404);
    }

    const partner = quote.partner as { id: string; name: string } | null;
    const request = quote.request as {
      id: string;
      customer_name: string;
      customer_company: string | null;
      reference_number: string | null;
      linked_program_id: string | null;
      arrival_date: string | null;
      departure_date: string | null;
      number_of_guests: number | null;
    } | null;

    if (!partner || !request) {
      return jsonResponse({ error: "Partner of aanvraag niet gevonden" }, 404);
    }

    // 4) Authorize: admin of eigenaar-partner
    const [{ data: isAdmin }, { data: callerPartnerId }] = await Promise.all([
      supabase.rpc("is_admin", { _user_id: user.id }),
      supabase.rpc("get_partner_id", { _user_id: user.id }),
    ]);
    if (!isAdmin && callerPartnerId !== quote.partner_id) {
      return jsonResponse({ error: "Geen toegang tot deze offerte" }, 403);
    }

    // 5) Idempotentie: al afgewezen? Dan niets meer doen.
    if (quote.status === "declined") {
      return jsonResponse({ success: true, alreadyDeclined: true });
    }
    if (quote.status !== "pending") {
      return jsonResponse(
        { error: `Offerte kan niet worden afgewezen vanuit status "${quote.status}"` },
        409,
      );
    }

    // 6) Status-update (declined-teller loopt via trg_update_declined_count)
    const { error: updateError } = await supabase
      .from("accommodation_quotes")
      .update({
        status: "declined",
        partner_notes: declineReason || null,
        submitted_at: new Date().toISOString(),
        proposed_arrival_date: proposedArrival,
        proposed_departure_date: proposedDeparture,
      })
      .eq("id", quoteId);

    if (updateError) {
      console.error("Error declining quote:", updateError);
      return jsonResponse({ error: "Kon aanvraag niet afwijzen" }, 500);
    }

    const customerLabel = request.customer_company || request.customer_name;
    const reasonSuffix = declineReason ? ` Reden: ${declineReason}` : "";

    // 7) Sluit openstaande wacht-taak voor deze offerte
    await supabase
      .from("admin_todos")
      .update({ status: "done", completed_at: new Date().toISOString() })
      .eq("auto_type", "quote_pending_partner")
      .eq("auto_entity_id", quoteId)
      .neq("status", "done");

    // 8) Historie-entry (activiteitenfeed)
    if (request.linked_program_id) {
      await supabase.from("program_request_history").insert({
        request_id: request.linked_program_id,
        action: hasAlternativeDates ? "accommodation_alternative_dates" : "accommodation_quote_declined",
        actor: "partner",
        actor_name: partner.name,
        notes: hasAlternativeDates
          ? `Alternatieve datums voorgesteld: ${proposedArrival} t/m ${proposedDeparture}${declineReason ? `. ${declineReason}` : ""}`
          : declineReason || null,
        new_value: {
          quote_id: quoteId,
          ...(hasAlternativeDates
            ? { proposed_arrival_date: proposedArrival, proposed_departure_date: proposedDeparture }
            : {}),
        },
      });
    }

    // 9) Werkbanktaak (dedupe op auto_type + entity)
    const autoType = hasAlternativeDates ? "accommodation_alternative_dates" : "accommodation_quote_declined";
    const { data: existingTodo } = await supabase
      .from("admin_todos")
      .select("id")
      .eq("auto_type", autoType)
      .eq("auto_entity_id", quoteId)
      .neq("status", "done")
      .maybeSingle();

    if (!existingTodo) {
      const title = hasAlternativeDates
        ? `Alternatieve datums: ${partner.name} voor ${customerLabel}`
        : `Logies afgewezen: ${partner.name} voor ${customerLabel}`;
      const description = hasAlternativeDates
        ? `${partner.name} is niet beschikbaar van ${request.arrival_date} t/m ${request.departure_date}, maar stelt voor: ${proposedArrival} t/m ${proposedDeparture}.${declineReason ? ` Toelichting: ${declineReason}` : ""}`
        : `${partner.name} heeft de logiesaanvraag voor ${customerLabel} afgewezen.${reasonSuffix}`;

      const { error: todoError } = await supabase.from("admin_todos").insert({
        title,
        description,
        priority: "high",
        status: "todo",
        related_request_id: request.linked_program_id || null,
        related_partner_id: partner.id,
        auto_type: autoType,
        auto_entity_id: quoteId,
      });
      if (todoError) {
        console.error("Error creating decline todo:", todoError);
      }
    }

    // 10) Dossier-tijdlijn
    if (request.linked_program_id) {
      await supabase.from("project_communications").insert({
        request_id: request.linked_program_id,
        accommodation_id: request.id,
        communication_type: "note",
        direction: "inbound",
        subject: hasAlternativeDates
          ? `Alternatieve datums voorgesteld door ${partner.name}`
          : `Logiesaanvraag afgewezen door ${partner.name}`,
        content: hasAlternativeDates
          ? `${partner.name} is niet beschikbaar van ${request.arrival_date} t/m ${request.departure_date}, maar stelt voor: ${proposedArrival} t/m ${proposedDeparture}.${declineReason ? ` Toelichting: ${declineReason}` : ""}`
          : `${partner.name} heeft de logiesaanvraag afgewezen.${reasonSuffix}`,
        contact_name: partner.name,
      });
    }

    console.log(
      `Quote ${quoteId} declined by ${partner.name}${hasAlternativeDates ? " with alternative dates" : ""}`,
    );

    return jsonResponse({ success: true, alternativeDates: hasAlternativeDates });
  } catch (error) {
    console.error("Error in decline-accommodation-quote:", error);
    return jsonResponse({ error: "Interne fout" }, 500);
  }
});
