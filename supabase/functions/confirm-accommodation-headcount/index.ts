import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendLodgingBureauAlert } from "../_shared/lodging-bureau-alert.ts";
import { formatCurrencyNL } from "../_shared/email-templates.ts";
import { describeHeadcountChange, type HeadcountProposal } from "../_shared/accommodationHeadcount.ts";

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

const MAX_PRICE = 1_000_000;

interface RoomInput {
  type: string;
  count: number;
  price_per_night: number;
  occupancy: number;
  room_type_id?: string | null;
}

/** Kamerindeling uit de client: alleen de velden die de offerte-sheet ook schrijft. */
export function sanitizeRoomConfiguration(raw: unknown): RoomInput[] | null {
  if (!Array.isArray(raw)) return null;
  const rooms: RoomInput[] = [];
  for (const r of raw) {
    if (!r || typeof r !== "object") continue;
    const o = r as Record<string, unknown>;
    const count = Number(o.count);
    if (!Number.isFinite(count) || count < 1) continue;
    rooms.push({
      ...o,
      type: typeof o.type === "string" ? o.type.slice(0, 120) : "",
      count: Math.round(count),
      price_per_night: Number.isFinite(Number(o.price_per_night)) ? Number(o.price_per_night) : 0,
      occupancy: Number.isFinite(Number(o.occupancy)) ? Number(o.occupancy) : 2,
      room_type_id: typeof o.room_type_id === "string" ? o.room_type_id : null,
    } as RoomInput);
  }
  return rooms;
}

/**
 * confirm-accommodation-headcount
 *
 * De logiespartner bevestigt na een aantalwijziging het nieuwe aantal gasten
 * voor een gekozen offerte, met het bijbehorende totaal. De offerte blijft
 * "selected" en de klant hoeft niet opnieuw te kiezen: het voorstel komt in
 * `headcount_proposal` en wacht op het bureau (approve-accommodation-headcount).
 * Loopt via service role zodat werkbanktaak, historie en bureau-melding
 * gegarandeerd landen (admin_todos en historie zijn admin-only onder RLS).
 */
export const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
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

    let body: { quoteId?: unknown; priceTotal?: unknown; roomConfiguration?: unknown; note?: unknown };
    try {
      body = await req.json();
    } catch {
      return jsonResponse({ error: "Ongeldige request body" }, 400);
    }

    const quoteId = typeof body.quoteId === "string" ? body.quoteId : "";
    if (!quoteId) {
      return jsonResponse({ error: "quoteId is verplicht" }, 400);
    }
    const priceTotal = typeof body.priceTotal === "number" ? body.priceTotal : Number(body.priceTotal);
    if (!Number.isFinite(priceTotal) || priceTotal <= 0 || priceTotal > MAX_PRICE) {
      return jsonResponse({ error: "priceTotal moet een bedrag groter dan 0 zijn" }, 400);
    }
    const note = typeof body.note === "string" ? body.note.trim().slice(0, 1000) : "";
    const roomConfiguration = sanitizeRoomConfiguration(body.roomConfiguration);

    const { data: quote, error: quoteError } = await supabase
      .from("accommodation_quotes")
      .select(`
        id, status, partner_id, request_id, accommodation_name, price_total,
        priced_for_guests, headcount_proposal, headcount_change_requested_at, valid_until,
        partner:partners(id, name),
        request:accommodation_requests(
          id, customer_name, customer_company, reference_number, linked_program_id,
          arrival_date, departure_date, number_of_guests
        )
      `)
      .eq("id", quoteId)
      .single();

    if (quoteError || !quote) {
      return jsonResponse({ error: "Offerte niet gevonden" }, 404);
    }

    const partner = quote.partner as unknown as { id: string; name: string } | null;
    const request = quote.request as unknown as {
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

    const [{ data: isAdmin }, { data: callerPartnerId }] = await Promise.all([
      supabase.rpc("is_admin", { _user_id: user.id }),
      supabase.rpc("get_partner_id", { _user_id: user.id }),
    ]);
    if (!isAdmin && callerPartnerId !== quote.partner_id) {
      return jsonResponse({ error: "Geen toegang tot deze offerte" }, 403);
    }

    if (quote.status !== "selected") {
      return jsonResponse({ error: "Alleen een door de klant gekozen offerte kan op deze manier worden aangepast" }, 409);
    }
    const newGuests = request.number_of_guests ?? 0;
    if (newGuests < 1) {
      return jsonResponse({ error: "De aanvraag heeft geen aantal gasten" }, 409);
    }
    const previousGuests = (quote.priced_for_guests as number | null) ?? null;
    if (previousGuests !== null && previousGuests === newGuests && !quote.headcount_change_requested_at) {
      return jsonResponse({ error: "Er is geen aantalwijziging om te bevestigen" }, 409);
    }

    const previousPriceTotal = Number(quote.price_total) || 0;
    const proposal: HeadcountProposal = {
      price_total: Math.round(priceTotal * 100) / 100,
      guests: newGuests,
      previous_price_total: previousPriceTotal,
      previous_guests: previousGuests,
      room_configuration: roomConfiguration && roomConfiguration.length > 0 ? roomConfiguration : null,
      note: note || null,
      proposed_at: new Date().toISOString(),
    };

    const { error: updateError } = await supabase
      .from("accommodation_quotes")
      .update({ headcount_proposal: proposal, updated_at: proposal.proposed_at })
      .eq("id", quoteId);
    if (updateError) {
      console.error("confirm-accommodation-headcount update error:", updateError);
      return jsonResponse({ error: "Kon het voorstel niet opslaan" }, 500);
    }

    const customerLabel = request.customer_company || request.customer_name;
    const ref = request.reference_number ? ` (${request.reference_number})` : "";
    const change = describeHeadcountChange(previousGuests, newGuests);
    const priceLine = proposal.price_total === previousPriceTotal
      ? `De prijs blijft ${formatCurrencyNL(previousPriceTotal)}.`
      : `Voorgesteld totaal ${formatCurrencyNL(proposal.price_total)} (was ${formatCurrencyNL(previousPriceTotal)}).`;

    // Werkbanktaak voor het bureau; een tweede bevestiging ververst de open taak.
    const { data: existingTodo } = await supabase
      .from("admin_todos")
      .select("id")
      .eq("auto_type", "quote_headcount_review")
      .eq("auto_entity_id", quoteId)
      .neq("status", "done")
      .maybeSingle();
    const todoTitle = `Nieuw aantal bevestigd: ${partner.name} voor ${customerLabel}${ref}`;
    const todoDescription =
      `${partner.name} bevestigt ${change} voor "${quote.accommodation_name}". ${priceLine}` +
      `${proposal.note ? ` Toelichting: ${proposal.note}` : ""} Beoordeel het voorstel; na goedkeuring informeren wij de klant.`;
    if (existingTodo) {
      await supabase
        .from("admin_todos")
        .update({ title: todoTitle, description: todoDescription, updated_at: proposal.proposed_at })
        .eq("id", existingTodo.id);
    } else {
      const { error: todoError } = await supabase.from("admin_todos").insert({
        title: todoTitle,
        description: todoDescription,
        priority: "normal",
        status: "todo",
        related_request_id: request.linked_program_id || null,
        related_partner_id: partner.id,
        auto_type: "quote_headcount_review",
        auto_entity_id: quoteId,
      });
      if (todoError) console.error("confirm-accommodation-headcount todo error:", todoError);
    }

    // De herinnering "staat nog open" hoeft niet meer.
    await supabase
      .from("admin_todos")
      .update({ status: "done", completed_at: proposal.proposed_at, completion_reason: "Partner heeft het nieuwe aantal bevestigd" })
      .eq("auto_type", "quote_headcount_pending_partner")
      .eq("auto_entity_id", quoteId)
      .neq("status", "done");

    if (request.linked_program_id) {
      await supabase.from("program_request_history").insert({
        request_id: request.linked_program_id,
        action: "accommodation_headcount_confirmed",
        actor: "partner",
        actor_name: partner.name,
        old_value: { price_total: previousPriceTotal, guests: previousGuests },
        new_value: { price_total: proposal.price_total, guests: newGuests, quote_id: quoteId },
        notes: `${partner.name} bevestigt ${change}. ${priceLine} Wacht op beoordeling door Bureau Vlieland.`,
      });
    }

    await sendLodgingBureauAlert({
      kind: "headcount_confirmed",
      quoteId,
      partner,
      accommodationName: quote.accommodation_name,
      priceTotal: proposal.price_total,
      previousPriceTotal,
      validUntil: (quote as { valid_until?: string | null }).valid_until ?? null,
      request,
      origin: req.headers.get("origin") ?? undefined,
      versionKey: proposal.proposed_at,
    });

    return jsonResponse({ success: true, proposal });
  } catch (error) {
    console.error("confirm-accommodation-headcount error:", error);
    return jsonResponse({ error: "Interne fout" }, 500);
  }
};

if (import.meta.main) Deno.serve(handler);
