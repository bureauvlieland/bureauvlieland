import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { apiKeyFor, cancelBooking, mapFetch } from "../_shared/map.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

async function logEvent(entry: {
  tenant_slug: string;
  booking_id?: number | null;
  payment_id?: string | null;
  status: string;
  note?: string | null;
}) {
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    await supabase.from("booking_events").insert({
      tenant_slug: entry.tenant_slug,
      booking_id: entry.booking_id ?? null,
      payment_id: entry.payment_id ?? null,
      status: entry.status,
      note: entry.note ? entry.note.slice(0, 2000) : null,
    });
  } catch (e) {
    console.error("booking_events log failed:", e instanceof Error ? e.message : String(e));
  }
}

const PAID = new Set(["paid", "authorized"]);
const FAILED = new Set(["failed", "canceled", "cancelled", "expired"]);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return json({ error: "Ongeldige aanvraag." }, 400);
    }
    const { paymentId, tenantSlug, bookingId } = body as Record<string, unknown>;

    if (typeof tenantSlug !== "string" || !/^[a-z0-9-]+$/i.test(tenantSlug)) {
      return json({ error: "Aanbieder ontbreekt of is ongeldig." }, 400);
    }
    if (
      (typeof paymentId !== "string" && typeof paymentId !== "number") ||
      `${paymentId}`.trim() === "" ||
      !/^[A-Za-z0-9_-]{1,64}$/.test(`${paymentId}`)
    ) {
      return json({ error: "Betaalkenmerk ontbreekt of is ongeldig." }, 400);
    }

    const resolvedBookingId =
      bookingId === undefined || bookingId === null || `${bookingId}`.trim() === ""
        ? null
        : Number(bookingId);
    if (resolvedBookingId !== null && !Number.isInteger(resolvedBookingId)) {
      return json({ error: "Boekingskenmerk is ongeldig." }, 400);
    }

    const apiKey = await apiKeyFor(tenantSlug);
    if (!apiKey) {
      return json({ error: "Deze aanbieder ondersteunt geen online betaling." }, 400);
    }

    const res = await mapFetch<Record<string, unknown>>(
      `/api/v1/payments/${encodeURIComponent(String(paymentId))}`,
      apiKey,
    );

    if (!res.ok) {
      return json(
        { error: "De betaalstatus kon niet worden opgehaald." },
        res.status >= 500 || res.status === 0 ? 502 : 400,
      );
    }

    const rawStatus = String(
      (res.data?.Status as unknown) ?? (res.data?.status as unknown) ?? "",
    );
    const normalized = rawStatus.toLowerCase();
    const state = PAID.has(normalized) ? "paid" : FAILED.has(normalized) ? "failed" : "pending";

    const amount =
      (res.data?.Amount as number | undefined) ??
      (res.data?.amount as number | undefined) ??
      (res.data?.TotalCost as number | undefined) ??
      null;

    const eventBookingId =
      resolvedBookingId ??
      (Number.isInteger(Number(res.data?.BookingId)) ? Number(res.data?.BookingId) : null);

    if (state === "paid") {
      await logEvent({
        tenant_slug: tenantSlug,
        booking_id: eventBookingId,
        payment_id: String(paymentId),
        status: "payment_paid",
      });
    } else if (state === "failed") {
      if (eventBookingId !== null) {
        await cancelBooking(eventBookingId, apiKey);
      }
      await logEvent({
        tenant_slug: tenantSlug,
        booking_id: eventBookingId,
        payment_id: String(paymentId),
        status: "payment_failed_cancelled",
        note: `rawStatus=${rawStatus}`,
      });
    }

    return json({ state, rawStatus, bookingId: eventBookingId, amount });
  } catch (error) {
    console.error(
      "map-payment-status error:",
      error instanceof Error ? error.message : String(error),
    );
    return json({ error: "Er ging iets mis bij het ophalen van de betaalstatus." }, 500);
  }
});
