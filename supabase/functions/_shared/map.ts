import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export const MAP_BASE_URL = "https://portal.mijnactiviteitenplanner.nl";

export interface MapProvider {
  /** Nooit naar de browser sturen. */
  apiKey: string | null;
  name: string | null;
  websiteUrl: string | null;
  phone: string | null;
  /** Optionele retour-origin die bij MAP op deze sleutel is toegestaan. */
  returnOrigin: string | null;
}

/**
 * Haalt de aanbiedergegevens (inclusief API-sleutel) op via de tenant-slug.
 * De sleutel verlaat de server nooit.
 */
export async function providerFor(tenantSlug: string): Promise<MapProvider> {
  const empty: MapProvider = {
    apiKey: null,
    name: null,
    websiteUrl: null,
    phone: null,
    returnOrigin: null,
  };
  if (!tenantSlug) return empty;

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
  const { data } = await supabase
    .from("partners")
    .select("name, map_api_key, website_url, phone, map_return_origin")
    .eq("map_tenant_slug", tenantSlug)
    .maybeSingle();

  if (!data) return empty;
  return {
    apiKey: (data.map_api_key as string | null) ?? null,
    name: (data.name as string | null) ?? null,
    websiteUrl: (data.website_url as string | null) ?? null,
    phone: (data.phone as string | null) ?? null,
    returnOrigin: (data.map_return_origin as string | null) ?? null,
  };
}

/**
 * Haalt de MAP API-sleutel op voor een aanbieder op basis van de tenant-slug.
 * Retourneert null wanneer de aanbieder geen eigen checkout heeft.
 * De sleutel verlaat de server nooit.
 */
export async function apiKeyFor(tenantSlug: string): Promise<string | null> {
  const provider = await providerFor(tenantSlug);
  return provider.apiKey;
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

/**
 * Terugvaloptie wanneer online betalen bij deze aanbieder niet kan.
 * Nooit een gegokte MAP-portal-URL (die geeft een 404), alleen de eigen site.
 */
export function providerFallbackUrl(
  provider: Pick<MapProvider, "websiteUrl">,
): string | null {
  const raw = provider.websiteUrl?.trim();
  if (!raw) return null;
  const candidate = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  try {
    const parsed = new URL(candidate);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return null;
    return parsed.toString();
  } catch {
    return null;
  }
}

/**
 * Kiest de retour-URL: een per aanbieder ingestelde origin krijgt voorrang,
 * omdat MAP de host per API-sleutel moet toestaan (Return-URLs).
 */
export function resolveReturnUrl(
  clientReturnUrl: string | null | undefined,
  providerReturnOrigin: string | null | undefined,
): string | null {
  const fromClient = safeReturnUrl(clientReturnUrl);
  const origin = providerReturnOrigin?.trim();
  if (!origin) return fromClient;
  try {
    const base = new URL(/^https?:\/\//i.test(origin) ? origin : `https://${origin}`);
    if (base.protocol !== "https:") return fromClient;
    const path = fromClient ? new URL(fromClient).pathname : "/boeking-status";
    return new URL(path, base.origin).toString();
  } catch {
    return fromClient;
  }
}

/** Herkent de MAP-melding dat de retour-host niet is toegestaan op de sleutel. */
export function isReturnUrlRejection(status: number, body: string): boolean {
  return status === 400 && /returnurl/i.test(body) && /whitelist|allowed/i.test(body);
}

