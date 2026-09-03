// Sentry-transport zonder de Sentry-SDK.
//
// Waarom met de hand: het toevoegen van `@sentry/react` vereist een wijziging
// in bun.lock/package-lock, en die lockfiles wijzen naar een private registry.
// De envelope-API van Sentry is een stabiel, gedocumenteerd HTTP-contract; een
// POST is genoeg. Wil je later alsnog de volledige SDK (sessies, source maps,
// performance), dan vervang je alleen deze factory — `reportError` blijft.

import type { ErrorTransport, ReportedEvent } from "./errorReporting";

interface ParsedDsn {
  endpoint: string;
  publicKey: string;
}

/**
 * Ontleedt een DSN van de vorm https://<publicKey>@<host>/<projectId>.
 * Geeft `null` bij een onbruikbare waarde, zodat een typefout in de
 * omgevingsvariabele geen storing oplevert.
 */
export function parseDsn(dsn: string): ParsedDsn | null {
  try {
    const url = new URL(dsn);
    const projectId = url.pathname.replace(/^\//, "");
    if (!url.username || !projectId) return null;
    return {
      endpoint: `${url.protocol}//${url.host}/api/${projectId}/envelope/`,
      publicKey: url.username,
    };
  } catch {
    return null;
  }
}

function eventId(): string {
  const bytes = new Uint8Array(16);
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
  }
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

/** Zet onze stacktrace-string om naar het veld dat Sentry verwacht. */
function toException(event: ReportedEvent) {
  return {
    values: [
      {
        type: event.name,
        value: event.message,
        // Sentry accepteert een onbewerkte stacktrace-string; zonder source maps
        // is dat net zo bruikbaar als een geparseerde variant.
        stacktrace: event.stack ? { frames: [], raw: event.stack } : undefined,
      },
    ],
  };
}

export interface SentryTransportOptions {
  /** Bv. "production" of "preview". */
  environment?: string;
  /** Versie-aanduiding, handig om een regressie aan een deploy te koppelen. */
  release?: string;
  /** Injecteerbaar voor tests. */
  fetchImpl?: typeof fetch;
}

/**
 * Bouwt een transport dat elk event als envelope naar Sentry stuurt.
 * Faalt stil: een onbereikbare Sentry mag de app niet raken.
 */
export function createSentryTransport(
  dsn: string,
  options: SentryTransportOptions = {},
): ErrorTransport | null {
  const parsed = parseDsn(dsn);
  if (!parsed) return null;

  const send = options.fetchImpl ?? (typeof fetch !== "undefined" ? fetch : undefined);
  if (!send) return null;

  const url = `${parsed.endpoint}?sentry_key=${parsed.publicKey}&sentry_version=7`;

  return (event: ReportedEvent) => {
    const id = eventId();
    const payload = {
      event_id: id,
      timestamp: new Date(event.at).getTime() / 1000,
      platform: "javascript",
      level: event.severity,
      logger: "bureauvlieland",
      environment: options.environment,
      release: options.release,
      exception: toException(event),
      request: { url: event.url },
      fingerprint: [event.fingerprint],
      tags: {
        where: typeof event.context.where === "string" ? event.context.where : "onbekend",
      },
      extra: event.context,
      breadcrumbs: {
        values: event.breadcrumbs.map((crumb) => ({
          timestamp: new Date(crumb.at).getTime() / 1000,
          message: crumb.message,
          data: crumb.data,
        })),
      },
    };

    const envelope =
      JSON.stringify({ event_id: id, sent_at: new Date().toISOString() }) +
      "\n" +
      JSON.stringify({ type: "event" }) +
      "\n" +
      JSON.stringify(payload) +
      "\n";

    try {
      void send(url, {
        method: "POST",
        body: envelope,
        headers: { "Content-Type": "application/x-sentry-envelope" },
        // Zorgt dat de melding ook vertrekt als de gebruiker meteen wegklikt.
        keepalive: true,
        mode: "cors",
      })?.catch(() => {
        /* onbereikbaar meldpunt is geen storing */
      });
    } catch {
      /* idem */
    }
  };
}
