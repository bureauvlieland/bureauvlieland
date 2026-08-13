import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  apiKeyFor,
  cancelBooking,
  fallbackBookingUrl,
  mapFetch,
  safeReturnUrl,
} from "../_shared/map.ts";

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

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i;
const PHONE_RE = /^[+0-9][0-9\s\-()]{6,19}$/;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return json({ error: "Ongeldige aanvraag." }, 400);
    }

    const {
      tenantSlug,
      activityId,
      name,
      email,
      phone,
      adults,
      children,
      couponCode,
      returnUrl,
    } = body as Record<string, unknown>;

    if (typeof tenantSlug !== "string" || !/^[a-z0-9-]+$/i.test(tenantSlug)) {
      return json({ error: "Aanbieder ontbreekt of is ongeldig." }, 400);
    }
    if (activityId === undefined || activityId === null || `${activityId}`.trim() === "") {
      return json({ error: "Het gekozen moment ontbreekt." }, 400);
    }
    if (typeof name !== "string" || name.trim().length < 2 || name.length > 120) {
      return json({ error: "Vul een geldige naam in." }, 400);
    }
    if (typeof email !== "string" || !EMAIL_RE.test(email.trim())) {
      return json({ error: "Vul een geldig e-mailadres in." }, 400);
    }
    if (typeof phone !== "string" || !PHONE_RE.test(phone.trim())) {
      return json({ error: "Vul een geldig telefoonnummer in." }, 400);
    }

    const adultCount = Number(adults);
    const childCount = children === undefined || children === null ? 0 : Number(children);
    const validCount = (n: number) => Number.isInteger(n) && n >= 0 && n <= 50;
    if (!validCount(adultCount) || !validCount(childCount)) {
      return json({ error: "Het aantal personen moet tussen 0 en 50 liggen." }, 400);
    }
    if (adultCount + childCount < 1) {
      return json({ error: "Geef minimaal één deelnemer op." }, 400);
    }
    if (couponCode !== undefined && couponCode !== null && typeof couponCode !== "string") {
      return json({ error: "Ongeldige kortingscode." }, 400);
    }

    const safeReturn = safeReturnUrl(typeof returnUrl === "string" ? returnUrl : null);
    if (!safeReturn) {
      return json({ error: "De terugkeer-URL is niet toegestaan." }, 400);
    }

    const apiKey = await apiKeyFor(tenantSlug);
    if (!apiKey) {
      return json({
        mode: "redirect",
        redirectUrl: fallbackBookingUrl(tenantSlug),
        reason: "no_api_key",
      });
    }

    // 1. Boeking aanmaken — bedragen komen nooit uit de aanvraag, MAP rekent zelf.
    const bookingPayload: Record<string, unknown> = {
      ActivityId: typeof activityId === "number" ? activityId : Number(activityId) || activityId,
      Name: name.trim(),
      EmailAddress: email.trim(),
      PhoneNumber: phone.trim(),
      NumberOfAdults: adultCount,
      NumberOfChildren: childCount,
    };
    if (typeof couponCode === "string" && couponCode.trim()) {
      bookingPayload.CouponCode = couponCode.trim();
    }

    const bookingRes = await mapFetch<Record<string, unknown>>("/api/v1/bookings", apiKey, {
      method: "POST",
      body: bookingPayload,
    });

    const bookingIdRaw =
      (bookingRes.data?.Id as unknown) ??
      (bookingRes.data?.id as unknown) ??
      (bookingRes.data?.BookingId as unknown) ??
      null;

    if (!bookingRes.ok || bookingIdRaw === null) {
      await logEvent({
        tenant_slug: tenantSlug,
        status: "booking_failed",
        note: `status=${bookingRes.status} body=${bookingRes.body.slice(0, 500)}`,
      });
      return json(
        {
          error:
            "De boeking kon niet worden aangemaakt. Mogelijk is dit moment net volgeboekt.",
        },
        bookingRes.status >= 500 || bookingRes.status === 0 ? 502 : 400,
      );
    }

    const bookingId = Number(bookingIdRaw);
    const totalCost =
      (bookingRes.data?.TotalCost as number | undefined) ??
      (bookingRes.data?.totalCost as number | undefined) ??
      null;

    // 2. Betaling starten
    const paymentReturnUrl = (() => {
      const u = new URL(safeReturn);
      u.searchParams.set("b", String(bookingId));
      u.searchParams.set("t", tenantSlug);
      return u.toString();
    })();

    const paymentRes = await mapFetch<Record<string, unknown>>("/api/v1/payments", apiKey, {
      method: "POST",
      body: { BookingId: bookingId, ReturnUrl: paymentReturnUrl },
    });

    const checkoutUrl =
      (paymentRes.data?.CheckoutUrl as string | undefined) ??
      (paymentRes.data?.Url as string | undefined) ??
      (paymentRes.data?.PaymentUrl as string | undefined) ??
      null;

    if (!paymentRes.ok || !checkoutUrl) {
      await logEvent({
        tenant_slug: tenantSlug,
        booking_id: bookingId,
        status: "payment_start_failed",
        note: `status=${paymentRes.status} body=${paymentRes.body.slice(0, 500)}`,
      });
      await cancelBooking(bookingId, apiKey);
      return json({
        mode: "redirect",
        redirectUrl: fallbackBookingUrl(tenantSlug),
        reason: "payment_unavailable",
      });
    }

    const paymentId =
      (paymentRes.data?.Id as unknown) ??
      (paymentRes.data?.id as unknown) ??
      (paymentRes.data?.PaymentId as unknown) ??
      null;

    await logEvent({
      tenant_slug: tenantSlug,
      booking_id: bookingId,
      payment_id: paymentId === null ? null : String(paymentId),
      status: "payment_started",
    });

    return json({
      mode: "checkout",
      bookingId,
      paymentId: paymentId === null ? null : String(paymentId),
      checkoutUrl,
      totalCost,
    });
  } catch (error) {
    console.error("map-book error:", error instanceof Error ? error.message : String(error));
    return json({ error: "Er ging iets mis bij het boeken. Probeer het later opnieuw." }, 500);
  }
});
