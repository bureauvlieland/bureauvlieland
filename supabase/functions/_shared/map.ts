import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export const MAP_BASE_URL = "https://portal.mijnactiviteitenplanner.nl";

/**
 * Haalt de MAP API-sleutel op voor een aanbieder op basis van de tenant-slug.
 * Retourneert null wanneer de aanbieder geen eigen checkout heeft.
 * De sleutel verlaat de server nooit.
 */
export async function apiKeyFor(tenantSlug: string): Promise<string | null> {
  if (!tenantSlug) return null;
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
  const { data } = await supabase
    .from("partners")
    .select("map_api_key")
    .eq("map_tenant_slug", tenantSlug)
    .maybeSingle();

  return data?.map_api_key ?? null;
}

export interface MapFetchResult<T = unknown> {
  ok: boolean;
  status: number;
  data: T | null;
  body: string;
}

/** Doet een request naar de MAP API. Gooit niet bij een niet-ok status. */
export async function mapFetch<T = unknown>(
  path: string,
  apiKey: string,
  options: { method?: string; body?: unknown } = {},
): Promise<MapFetchResult<T>> {
  const url = `${MAP_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;
  const method = options.method ?? "GET";

  try {
    const res = await fetch(url, {
      method,
      headers: {
        "X-Api-Key": apiKey,
        Accept: "application/json",
        ...(options.body !== undefined ? { "Content-Type": "application/json" } : {}),
      },
      ...(options.body !== undefined ? { body: JSON.stringify(options.body) } : {}),
    });

    const body = await res.text();
    let data: T | null = null;
    try {
      data = body ? (JSON.parse(body) as T) : null;
    } catch {
      data = null;
    }

    if (!res.ok) {
      // Nooit de API-sleutel loggen.
      console.error(`MAP ${method} ${path} failed [${res.status}]: ${body.slice(0, 1000)}`);
    }

    return { ok: res.ok, status: res.status, data, body };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`MAP ${method} ${path} network error: ${message}`);
    return { ok: false, status: 0, data: null, body: message };
  }
}

/** Annuleert een boeking bij MAP. Faalt stil. */
export async function cancelBooking(
  bookingId: string | number,
  apiKey: string,
): Promise<void> {
  try {
    await mapFetch(`/api/v1/bookings/${bookingId}`, apiKey, { method: "DELETE" });
  } catch {
    // stil falen
  }
}

const ALLOWED_RETURN_HOSTS = new Set([
  "visitvlieland.nl",
  "www.visitvlieland.nl",
  "bureauvlieland.nl",
  "www.bureauvlieland.nl",
]);


/** Valideert een return-URL: alleen https en toegestane hosts. */
export function safeReturnUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  if (parsed.protocol !== "https:") return null;
  const host = parsed.hostname.toLowerCase();
  if (ALLOWED_RETURN_HOSTS.has(host)) return parsed.toString();
  if (host === "lovable.app" || host.endsWith(".lovable.app")) return parsed.toString();
  return null;
}

/** Publieke MAP-boekingspagina van de aanbieder als terugvaloptie. */
export function fallbackBookingUrl(tenantSlug: string): string {
  return `${MAP_BASE_URL}/${tenantSlug}`;
}
