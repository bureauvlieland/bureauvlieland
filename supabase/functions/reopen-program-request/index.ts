// reopen-program-request
//
// Draait een annulering terug. Annuleren was tot nu toe eenrichtingsverkeer:
// status='cancelled', alle onderdelen op 'cancelled', project gearchiveerd.
// Als een klant zich later alsnog meldt, moest dat handmatig in de database.
//
// Deze functie zet het project weer actief, met verplichte reden, en laat
// bevestigde/uitgevoerde onderdelen expliciet ongemoeid. Er gaat GEEN mail
// uit — de admin verstuurt daarna zelf de status-mail of de offerte.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://esm.sh/zod@3.23.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

export const BodySchema = z.object({
  requestId: z.string().uuid(),
  reason: z.string().trim().min(3, "Reden van heropening is verplicht").max(2000),
  reopenItems: z.boolean().optional().default(true),
  extendValidity: z.boolean().optional().default(false),
});

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

export const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // ── Auth: uitsluitend admins ────────────────────────────────────────────
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json(401, { error: "Unauthorized" });
    const jwt = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(jwt);
    if (authError || !user) return json(401, { error: "Unauthorized" });

    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();
    if (!roleData) return json(403, { error: "Admin access required" });

    // ── Validatie ───────────────────────────────────────────────────────────
    const parsed = BodySchema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) {
      return json(400, { error: parsed.error.flatten().fieldErrors });
    }
    const { requestId, reason, reopenItems, extendValidity } = parsed.data;

    const { data: request, error: loadError } = await supabase
      .from("program_requests")
      .select("id, reference_number, status, linked_accommodation_id, quote_valid_until")
      .eq("id", requestId)
      .maybeSingle();
    if (loadError) throw loadError;
    if (!request) return json(404, { error: "Aanvraag niet gevonden" });
    if (request.status !== "cancelled") {
      return json(400, { error: "Deze aanvraag staat niet op geannuleerd" });
    }

    // ── Project weer actief ─────────────────────────────────────────────────
    const update: Record<string, unknown> = {
      status: "active",
      cancelled_at: null,
      cancellation_reason: null,
      archived_at: null,
      reopened_reason: reason,
      updated_at: new Date().toISOString(),
    };
    if (extendValidity) {
      const until = new Date(Date.now() + 14 * 86_400_000);
      update.quote_valid_until = until.toISOString().slice(0, 10);
    }

    const { error: updateError } = await supabase
      .from("program_requests")
      .update(update)
      .eq("id", requestId);
    if (updateError) throw updateError;

    // ── Onderdelen ──────────────────────────────────────────────────────────
    // Alleen geannuleerde onderdelen gaan terug naar 'pending'. Bevestigde en
    // uitgevoerde onderdelen blijven staan: die zijn nooit geannuleerd geweest
    // of al afgehandeld, en terugzetten zou de partnerafspraak wissen.
    let itemsReopened = 0;
    const itemErrors: Array<{ id: string; block_name: string; error: string }> = [];

    if (reopenItems) {
      const { data: cancelledItems, error: itemsError } = await supabase
        .from("program_request_items")
        .select("id, block_name")
        .eq("request_id", requestId)
        .eq("status", "cancelled");
      if (itemsError) throw itemsError;

      for (const item of cancelledItems ?? []) {
        const { error } = await supabase
          .from("program_request_items")
          .update({ status: "pending", updated_at: new Date().toISOString() })
          .eq("id", item.id);
        if (error) {
          itemErrors.push({ id: item.id, block_name: item.block_name, error: error.message });
        } else {
          itemsReopened++;
        }
      }
    }

    // ── Gekoppelde logies-aanvraag ──────────────────────────────────────────
    let accommodationReopened = false;
    if (request.linked_accommodation_id) {
      const { data: accommodation } = await supabase
        .from("accommodation_requests")
        .select("id, status")
        .eq("id", request.linked_accommodation_id)
        .maybeSingle();
      if (accommodation?.status === "cancelled") {
        const { error } = await supabase
          .from("accommodation_requests")
          .update({ status: "pending", archived_at: null, updated_at: new Date().toISOString() })
          .eq("id", accommodation.id);
        if (!error) accommodationReopened = true;
      }
    }

    // ── Historie ────────────────────────────────────────────────────────────
    await supabase.from("program_request_history").insert({
      request_id: requestId,
      action: "reopened",
      actor: "admin",
      actor_name: user.email ?? "admin",
      new_value: {
        reason,
        items_reopened: itemsReopened,
        accommodation_reopened: accommodationReopened,
        validity_extended: !!extendValidity,
      },
    });

    return json(200, {
      ok: true,
      reference_number: request.reference_number,
      itemsReopened,
      itemErrors,
      accommodationReopened,
      quoteValidUntil: (update.quote_valid_until as string | undefined) ?? request.quote_valid_until,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[reopen-program-request] failed:", message);
    return json(500, { error: message });
  }
};

Deno.serve(handler);
