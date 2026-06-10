// Past een inkoopfactuur 1-op-1 toe op een logies-offerte:
// - Kamer-regels (target=room) → overschrijven accommodation_quotes.price_total
//   (oorspronkelijke prijs als snapshot naar accommodation_quote_history)
// - Extra-regels (target=extra) → één accommodation_quote_extras-rij per regel
//   met juist commission_percentage (extras-commissie van de partner)
// - Toeristenbelasting/exclude → genegeerd (toeristenbelasting zit al in onze verkoopfactuur)
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface RoomLine {
  amount_incl_vat: number;
  amount_excl_vat: number;
  vat_rate: number;
  description?: string;
}
interface ExtraLine {
  category: "fb" | "facilities" | "transport" | "other";
  description: string;
  amount_incl_vat: number;
  vat_rate: number;
}
interface Payload {
  quote_id: string;
  purchase_invoice_id: string;
  partner_id: string;
  invoice_number?: string;
  room_lines: RoomLine[];
  extra_lines: ExtraLine[];
  tourist_tax_total_excluded?: number;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // Admin auth via JWT
    const supabaseUser = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: req.headers.get("Authorization") || "" } } },
    );
    const { data: { user } } = await supabaseUser.auth.getUser();
    if (!user) return jsonResp({ error: "Unauthorized" }, 401);
    const { data: role } = await supabaseUser
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();
    if (!role) return jsonResp({ error: "Forbidden" }, 403);

    const payload: Payload = await req.json();
    if (!payload.quote_id || !payload.purchase_invoice_id || !payload.partner_id) {
      return jsonResp({ error: "quote_id, purchase_invoice_id en partner_id zijn verplicht" }, 400);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Haal de quote + partner op
    const { data: quote, error: qErr } = await supabase
      .from("accommodation_quotes")
      .select("id, request_id, price_total, vat_rate, price_includes_vat, room_configuration, includes, conditions, description, accommodation_name, purchase_room_cost_incl_vat")
      .eq("id", payload.quote_id)
      .maybeSingle();
    if (qErr || !quote) return jsonResp({ error: "Quote niet gevonden" }, 404);

    const { data: partner } = await supabase
      .from("partners")
      .select("id, name, commission_percentage, accommodation_commission_percentage, extras_commission_percentage")
      .eq("id", payload.partner_id)
      .maybeSingle();

    const extrasRate = partner?.extras_commission_percentage != null
      ? Number(partner.extras_commission_percentage)
      : partner?.accommodation_commission_percentage != null
        ? Number(partner.accommodation_commission_percentage)
        : 10;

    const round2 = (n: number) => Math.round(n * 100) / 100;

    // --- Kamer-regels: overschrijf price_total ---
    let newRoomTotalIncl: number | null = null;
    if (payload.room_lines && payload.room_lines.length > 0) {
      newRoomTotalIncl = round2(
        payload.room_lines.reduce((s, r) => s + Number(r.amount_incl_vat || 0), 0),
      );

      // Snapshot oorspronkelijke prijs naar history (alleen eerste keer)
      const originalPrice = quote.purchase_room_cost_incl_vat ?? quote.price_total;
      if (quote.purchase_room_cost_incl_vat == null) {
        // Bepaal volgende version
        const { data: lastHist } = await supabase
          .from("accommodation_quote_history")
          .select("version")
          .eq("quote_id", quote.id)
          .order("version", { ascending: false })
          .limit(1)
          .maybeSingle();
        const nextVersion = (lastHist?.version ?? 0) + 1;

        await supabase.from("accommodation_quote_history").insert({
          quote_id: quote.id,
          version: nextVersion,
          price_total: quote.price_total,
          room_configuration: quote.room_configuration,
          includes: quote.includes,
          conditions: quote.conditions,
          description: quote.description
            ? `${quote.description}\n\n[Snapshot vóór inkoopfactuur ${payload.invoice_number || ""}]`
            : `Snapshot vóór inkoopfactuur ${payload.invoice_number || ""}`,
        });
      }

      // Dominante BTW: meest voorkomende rate
      const rates = payload.room_lines.map((r) => Number(r.vat_rate || 0));
      const dominantRate = rates.length === 1
        ? rates[0]
        : rates.reduce((acc, r) => {
            acc[r] = (acc[r] || 0) + 1;
            return acc;
          }, {} as Record<number, number>);
      const finalVatRate = Array.isArray(rates) && rates.length > 0
        ? typeof dominantRate === "number"
          ? dominantRate
          : Number(Object.entries(dominantRate).sort((a, b) => b[1] - a[1])[0][0])
        : Number(quote.vat_rate || 9);

      const { error: upErr } = await supabase
        .from("accommodation_quotes")
        .update({
          price_total: newRoomTotalIncl,
          price_includes_vat: true,
          vat_rate: finalVatRate,
          purchase_room_cost_incl_vat: originalPrice,
          purchase_invoice_id: payload.purchase_invoice_id,
          updated_at: new Date().toISOString(),
        })
        .eq("id", quote.id);
      if (upErr) return jsonResp({ error: `Update quote: ${upErr.message}` }, 500);
    }

    // --- Extra-regels: insert in accommodation_quote_extras met juiste commissie ---
    const insertedExtras: any[] = [];
    if (payload.extra_lines && payload.extra_lines.length > 0) {
      const rows = payload.extra_lines.map((e) => ({
        quote_id: quote.id,
        category: e.category,
        description: e.description,
        quantity: 1,
        unit_price: round2(Number(e.amount_incl_vat || 0)),
        pricing_type: "fixed",
        price_includes_vat: true,
        vat_rate: Number(e.vat_rate || 9),
        commission_percentage: extrasRate,
        source: "purchase_invoice",
        source_invoice_id: payload.purchase_invoice_id,
        notes: `Bron: inkoopfactuur ${payload.invoice_number || ""}`.trim(),
      }));
      const { data: ins, error: exErr } = await supabase
        .from("accommodation_quote_extras")
        .insert(rows)
        .select();
      if (exErr) return jsonResp({ error: `Insert extras: ${exErr.message}` }, 500);
      insertedExtras.push(...(ins || []));
    }

    // --- Log naar project_communications ---
    if (quote.request_id) {
      const summary: string[] = [];
      if (newRoomTotalIncl != null) summary.push(`Kamer overschreven naar €${newRoomTotalIncl.toFixed(2)}`);
      if (insertedExtras.length > 0) summary.push(`${insertedExtras.length} extra(s) toegevoegd (commissie ${extrasRate}%)`);
      if (payload.tourist_tax_total_excluded && payload.tourist_tax_total_excluded > 0) {
        summary.push(`Toeristenbelasting €${payload.tourist_tax_total_excluded.toFixed(2)} uitgesloten (zit al in verkoopfactuur)`);
      }
      if (summary.length > 0) {
        await supabase.from("project_communications").insert({
          accommodation_id: quote.request_id,
          communication_type: "note",
          direction: "internal",
          audience: "internal",
          subject: `Inkoopfactuur ${payload.invoice_number || ""} toegepast op logies-offerte`,
          content: summary.join(" · "),
          contact_name: partner?.name || null,
          metadata: {
            template_name: "purchase_invoice_applied_to_lodging",
            actor: "admin",
            quote_id: quote.id,
            purchase_invoice_id: payload.purchase_invoice_id,
          },
        });
      }
    }

    return jsonResp({
      status: "ok",
      room_total_incl: newRoomTotalIncl,
      extras_inserted: insertedExtras.length,
      extras_commission_percentage: extrasRate,
    });
  } catch (err) {
    console.error("apply-purchase-invoice-to-lodging error:", err);
    return jsonResp({ error: err instanceof Error ? err.message : "Unknown" }, 500);
  }
});

function jsonResp(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
