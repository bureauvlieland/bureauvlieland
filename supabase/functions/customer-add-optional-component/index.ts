import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "npm:zod@3.22.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const BodySchema = z.object({
  token: z.string().min(1),
  parent_item_id: z.string().uuid(),
  component_id: z.string().uuid(),
  origin: z.string().optional(),
});

const BUREAU_IDS = new Set([
  "bureau",
  "bureau-vlieland",
  "rederij",
  "fietsverhuur",
  "bagagevervoer-vlieland",
]);

type QuantityMode = "fixed" | "per_group" | "per_n_people" | "per_people_per_day";

function computeQuantity(
  mode: QuantityMode,
  value: number,
  people: number,
  days: number,
): number {
  const p = Math.max(1, Math.floor(people || 1));
  const d = Math.max(1, Math.floor(days || 1));
  const v = Math.max(1, Number(value) || 1);
  switch (mode) {
    case "fixed":
      return Math.max(1, Math.floor(v));
    case "per_group":
      return 1;
    case "per_n_people":
      return Math.max(1, Math.ceil(p / v));
    case "per_people_per_day":
      return p * d;
    default:
      return 1;
  }
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    const parsed = BodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return new Response(
        JSON.stringify({ error: parsed.error.flatten().fieldErrors }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    const { token, parent_item_id, component_id } = parsed.data;

    // 1. Validate token + phase
    const { data: program, error: programError } = await supabase
      .from("program_requests")
      .select("id, quote_status, number_of_people, selected_dates, customer_name, reference_number")
      .eq("customer_token", token)
      .single();

    if (programError || !program) {
      return new Response(JSON.stringify({ error: "Programma niet gevonden" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const allowedPhases = ["offerte_verstuurd", "akkoord_ontvangen", "definitief_bevestigd"];
    if (!allowedPhases.includes(program.quote_status)) {
      return new Response(
        JSON.stringify({ error: "Optionele extra's kunnen in deze fase niet meer worden toegevoegd" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // 2. Fetch parent item (must belong to program, not cancelled)
    const { data: parentItem, error: parentError } = await supabase
      .from("program_request_items")
      .select("*")
      .eq("id", parent_item_id)
      .eq("request_id", program.id)
      .single();

    if (parentError || !parentItem) {
      return new Response(JSON.stringify({ error: "Hoofdactiviteit niet gevonden" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (parentItem.status === "cancelled" || parentItem.executed_at) {
      return new Response(
        JSON.stringify({ error: "Aan dit onderdeel kan niet meer worden toegevoegd" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    if (!parentItem.block_id) {
      return new Response(JSON.stringify({ error: "Hoofdactiviteit heeft geen bouwsteen" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 3. Fetch component definition + child block, verify it is an OPTIONAL child of the parent block
    const { data: component, error: compError } = await supabase
      .from("building_block_components")
      .select(`
        id, parent_block_id, child_block_id, is_required, quantity_mode, quantity_value, notes,
        child:building_blocks!building_block_components_child_block_id_fkey(
          id, name, description, short_description, price_adult, price_type, price_extras, block_type,
          provider_id, category, duration, location_lat, location_lng, location_address,
          image_url, image_asset, external_url,
          provider:partners!building_blocks_provider_id_fkey(id, name, email, contact_email)
        )
      `)
      .eq("id", component_id)
      .eq("parent_block_id", parentItem.block_id)
      .eq("is_required", false)
      .single();

    if (compError || !component || !component.child) {
      return new Response(
        JSON.stringify({ error: "Optioneel onderdeel hoort niet bij deze activiteit" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // 4. Idempotency: don't add twice for the same parent_item
    const { data: existing } = await supabase
      .from("program_request_items")
      .select("id")
      .eq("request_id", program.id)
      .eq("parent_item_id", parent_item_id)
      .eq("block_id", component.child.id)
      .neq("status", "cancelled")
      .maybeSingle();

    if (existing) {
      return new Response(
        JSON.stringify({ error: "Dit onderdeel is al toegevoegd", already_added: true }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // 5. Build insert row (mirrors AdminAddActivitySheet auto-add logic)
    const child = component.child as any;
    const people = Number(program.number_of_people || 1);
    const days = Math.max(1, Array.isArray(program.selected_dates) ? program.selected_dates.length : 1);
    const qty = computeQuantity(component.quantity_mode as QuantityMode, Number(component.quantity_value), people, days);

    const childProviderId: string = child.provider_id || "bureau";
    const blockType: "bureau" | "partner" | "self_arranged" = BUREAU_IDS.has(childProviderId)
      ? "bureau"
      : (child.block_type === "self_arranged" ? "self_arranged" : "partner");

    const rawType = (child.price_type ?? "per_person") as
      | "per_person" | "per_person_per_day" | "total" | "on_request" | "tiered_total";
    const isTiered = rawType === "tiered_total";
    const priceType: "per_person" | "per_person_per_day" | "total" | "on_request" =
      isTiered ? "total" : (rawType as any);
    const isPerHead = priceType === "per_person" || priceType === "per_person_per_day";

    let overridePeople: number | null = isPerHead ? qty : null;
    let quotedPrice: number | null = null;
    let adminOverride: number | null = child.price_adult ?? null;

    if (isTiered) {
      // Staffel op groepsgrootte — lookup op `people`, niet op qty.
      const extras = (child.price_extras ?? {}) as Record<string, unknown>;
      const rawTiers = Array.isArray(extras.tiers) ? extras.tiers as Array<{ min_people: number; max_people: number; price: number }> : [];
      const tiers = rawTiers
        .filter((t) => typeof t?.min_people === "number" && typeof t?.max_people === "number" && typeof t?.price === "number")
        .slice()
        .sort((a, b) => a.min_people - b.min_people);
      const aboveMax = extras.tiers_above_max === "on_request" ? "on_request" : "highest";
      if (tiers.length === 0) {
        quotedPrice = null;
      } else {
        const match = tiers.find((t) => people >= t.min_people && people <= t.max_people)
          ?? (people < tiers[0].min_people ? tiers[0] : null);
        if (match) {
          quotedPrice = match.price;
        } else {
          quotedPrice = aboveMax === "on_request" ? null : tiers[tiers.length - 1].price;
        }
      }
      adminOverride = null;
      overridePeople = null;
    } else if (!isPerHead && child.price_adult != null) {
      quotedPrice = Number(child.price_adult) * qty;
    }

    // Customer-added during proposal phases: instantly request approval — set as
    // pending + concept, customer can approve via the standard per-item flow.
    // Bureau items skip partner notification entirely.
    const nowIso = new Date().toISOString();
    const isBureau = blockType === "bureau";

    const insertRow = {
      request_id: program.id,
      parent_item_id: parent_item_id,
      block_id: child.id,
      block_name: child.name,
      block_category: child.category,
      block_type: blockType,
      provider_id: childProviderId,
      provider_name: child.provider?.name || "Bureau Vlieland",
      provider_email: child.provider?.email ?? null,
      day_index: parentItem.day_index,
      preferred_time: parentItem.confirmed_time || parentItem.proposed_time || parentItem.preferred_time,
      customer_notes: component.notes || null,
      duration: child.duration,
      status: "pending" as const,
      item_quote_status: isBureau ? "bevestigd" : "concept",
      admin_price_override: adminOverride,
      admin_price_notes: child.description || child.short_description || null,
      price_type: priceType,
      override_people: overridePeople,
      quoted_price: quotedPrice,
      quoted_at: isBureau ? nowIso : null,
      location_lat: child.location_lat ?? null,
      location_lng: child.location_lng ?? null,
      location_address: child.location_address ?? null,
      image_url: child.image_url ?? null,
      image_asset: child.image_asset ?? null,
      external_url: child.external_url ?? null,
      skip_partner_notification: true, // partner-uitvraag pas na klant-akkoord
      awaiting_customer_for_partner_send: !isBureau,
      pending_added: false,
      created_at: nowIso,
      updated_at: nowIso,
    };

    const { data: inserted, error: insertError } = await supabase
      .from("program_request_items")
      .insert(insertRow)
      .select("id")
      .single();

    if (insertError || !inserted) {
      console.error("Insert failed:", insertError);
      return new Response(JSON.stringify({ error: "Toevoegen mislukt" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 6. History entry
    await supabase.from("program_request_history").insert({
      request_id: program.id,
      item_id: inserted.id,
      action: "item_added",
      actor: "customer",
      actor_name: program.customer_name,
      notes: `Klant heeft optioneel onderdeel "${child.name}" toegevoegd bij "${parentItem.block_name}".`,
    });

    return new Response(
      JSON.stringify({ success: true, item_id: inserted.id }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("customer-add-optional-component error:", err);
    return new Response(JSON.stringify({ error: "Onverwachte fout" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
