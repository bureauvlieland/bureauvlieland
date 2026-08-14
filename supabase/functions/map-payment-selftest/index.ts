import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  cancelBooking,
  mapFetch,
  providerFor,
  resolveReturnUrl,
  classifySelftest,
  type SelftestResult,
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

const DEFAULT_RETURN_URL = "https://bureauvlieland.nl/boeking-status";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Niet geauthenticeerd" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, anon, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) return json({ error: "Niet geauthenticeerd" }, 401);

    const admin = createClient(supabaseUrl, serviceKey);
    const { data: isAdmin } = await admin.rpc("has_role", {
      _user_id: userData.user.id,
      _role: "admin",
    });
    if (!isAdmin) return json({ error: "Alleen admins mogen deze test uitvoeren" }, 403);

    const body = await req.json().catch(() => null);
    const tenantSlug = (body as Record<string, unknown> | null)?.tenantSlug;
    if (typeof tenantSlug !== "string" || !/^[a-z0-9-]+$/i.test(tenantSlug)) {
      return json({ error: "tenantSlug ontbreekt of is ongeldig." }, 400);
    }

    const provider = await providerFor(tenantSlug);
    const logEvent = async (status: string, note?: string) => {
      try {
        await admin.from("booking_events").insert({
          tenant_slug: tenantSlug,
          status,
          note: note ? note.slice(0, 2000) : null,
        });
      } catch (e) {
        console.error("selftest log failed:", e instanceof Error ? e.message : String(e));
      }
    };

    if (!provider.apiKey) {
      await logEvent("selftest_no_api_key");
      return json({ result: "no_api_key" as SelftestResult, providerName: provider.name });
    }

    // Zoek een aankomend moment met plek.
    const today = new Date();
    const end = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
    const fmt = (d: Date) => d.toISOString().slice(0, 10);
    const activitiesRes = await mapFetch<Array<Record<string, unknown>>>(
      `/api/v1/activities?dateStart=${fmt(today)}&dateEnd=${fmt(end)}`,
      provider.apiKey,
    );
    const activities = Array.isArray(activitiesRes.data) ? activitiesRes.data : [];
    const candidate = activities.find((a) => Number(a.RemainingSlots ?? 0) > 0);
    if (!candidate) {
      await logEvent("selftest_no_activity");
      return json({ result: "no_activity" as SelftestResult, providerName: provider.name });
    }

    const bookingRes = await mapFetch<Record<string, unknown>>("/api/v1/bookings", provider.apiKey, {
      method: "POST",
      body: {
        ActivityId: candidate.Id,
        Name: "Bureau Vlieland testboeking",
        EmailAddress: "hallo@bureauvlieland.nl",
        PhoneNumber: "0612345678",
        NumberOfAdults: 1,
        NumberOfChildren: 0,
      },
    });

    const bookingIdRaw =
      (bookingRes.data?.Id as unknown) ??
      (bookingRes.data?.id as unknown) ??
      (bookingRes.data?.BookingId as unknown) ??
      null;

    if (!bookingRes.ok || bookingIdRaw === null) {
      await logEvent(
        "selftest_booking_failed",
        `status=${bookingRes.status} body=${bookingRes.body.slice(0, 500)}`,
      );
      return json({
        result: "booking_failed" as SelftestResult,
        providerName: provider.name,
        detail: bookingRes.body.slice(0, 300),
      });
    }

    const bookingId = Number(bookingIdRaw);
    const returnUrl =
      resolveReturnUrl(DEFAULT_RETURN_URL, provider.returnOrigin) ?? DEFAULT_RETURN_URL;
    const paymentUrl = (() => {
      const u = new URL(returnUrl);
      u.searchParams.set("b", String(bookingId));
      u.searchParams.set("t", tenantSlug);
      return u.toString();
    })();

    const paymentRes = await mapFetch<Record<string, unknown>>(
      "/api/v1/payments",
      provider.apiKey,
      { method: "POST", body: { BookingId: bookingId, ReturnUrl: paymentUrl } },
    );
    const checkoutUrl =
      (paymentRes.data?.CheckoutUrl as string | undefined) ??
      (paymentRes.data?.Url as string | undefined) ??
      (paymentRes.data?.PaymentUrl as string | undefined) ??
      null;

    const result = classifySelftest(paymentRes.status, paymentRes.body, checkoutUrl);

    // Testboeking altijd opruimen; er wordt nooit betaald.
    await cancelBooking(bookingId, provider.apiKey);

    await logEvent(
      `selftest_${result}`,
      result === "ok"
        ? `returnUrl=${returnUrl}`
        : `status=${paymentRes.status} body=${paymentRes.body.slice(0, 400)}`,
    );

    return json({
      result,
      providerName: provider.name,
      returnUrl,
      detail: result === "ok" ? null : paymentRes.body.slice(0, 300),
    });
  } catch (error) {
    console.error("map-payment-selftest error:", error instanceof Error ? error.message : String(error));
    return json({ error: "De test kon niet worden uitgevoerd." }, 500);
  }
});
