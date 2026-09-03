// Centraal meldpunt voor fouten die anders alleen in de browserconsole van de
// klant belanden.
//
// Ontwerpregels:
//  1. GEEN nieuwe npm-dependency. De lockfiles van dit project wijzen naar een
//     private registry; een extra pakket zou `install --frozen-lockfile` in CI
//     breken. Het transport hieronder praat daarom rechtstreeks HTTP.
//  2. Leverancier-neutraal. `reportError` is de enige plek die de rest van de
//     app kent. Waar de melding heen gaat is één regel in `initErrorReporting`.
//  3. Nooit de app laten vallen. Een kapot meldpunt mag geen storing worden;
//     alles hier is defensief en faalt stil (behalve de console-log).
//  4. Geen geheimen versturen. Klantportaal- en partner-URL's bevatten
//     toegangstokens in het pad; die worden gescrubd. Zie `scrubUrl`.

export type ErrorSeverity = "fatal" | "error" | "warning";

export interface ErrorContext {
  /** Waar in de app het misging, bv. "CustomerProgram.submitChanges". */
  where?: string;
  [key: string]: unknown;
}

export interface Breadcrumb {
  message: string;
  data?: Record<string, unknown>;
  at: string;
}

export interface ReportedEvent {
  name: string;
  message: string;
  stack?: string;
  severity: ErrorSeverity;
  context: Record<string, unknown>;
  breadcrumbs: Breadcrumb[];
  url: string;
  at: string;
  /** Groepeersleutel: gelijke fouten krijgen dezelfde waarde. */
  fingerprint: string;
}

export type ErrorTransport = (event: ReportedEvent) => void;

// --- Instellingen -----------------------------------------------------------

/** Hoeveel breadcrumbs we meesturen als context bij een fout. */
const MAX_BREADCRUMBS = 20;
/** Binnen dit venster telt een identieke fout als duplicaat. */
const DEDUPE_WINDOW_MS = 60_000;
/** Harde bovengrens per venster, zodat een renderloop geen duizenden meldingen stuurt. */
const MAX_EVENTS_PER_WINDOW = 25;

// --- Interne staat ----------------------------------------------------------

let transport: ErrorTransport | null = null;
let breadcrumbs: Breadcrumb[] = [];
const lastSeen = new Map<string, number>();
let windowStart = 0;
let windowCount = 0;

/**
 * Stelt in waar meldingen heen gaan. `null` schakelt verzenden uit; de
 * console-log blijft dan gewoon werken.
 */
export function setErrorTransport(next: ErrorTransport | null): void {
  transport = next;
}

/**
 * Legt een stap vast die aan een eventuele fout voorafging. Bewust klein
 * gehouden: een fout zonder aanloop is vaak niet te reproduceren.
 */
export function addBreadcrumb(message: string, data?: Record<string, unknown>): void {
  breadcrumbs.push({ message, data, at: new Date().toISOString() });
  if (breadcrumbs.length > MAX_BREADCRUMBS) {
    breadcrumbs = breadcrumbs.slice(-MAX_BREADCRUMBS);
  }
}

// --- Scrubben ---------------------------------------------------------------

/**
 * Padprefixen waarvan het VOLGENDE segment een toegangstoken is. Wie zo'n
 * token heeft, kan bij de gegevens van die klant of partner — die mag dus
 * nooit meeliften in een foutmelding.
 */
const TOKEN_PATH_PREFIXES = [
  "mijn-programma",
  "programma-deelnemers",
  "mijn-logies",
  "concept",
  "programma",
  "partner",
];

const SENSITIVE_PARAM = /token|key|secret|password|auth|signature|code/i;

const REDACTED = "<verwijderd>";

/** Vervangt tokens in een URL door een placeholder. Bij twijfel: weglaten. */
export function scrubUrl(raw: string): string {
  if (!raw) return "";
  let parsed: URL;
  try {
    parsed = new URL(raw, "https://bureauvlieland.nl");
  } catch {
    return REDACTED;
  }

  const segments = parsed.pathname.split("/");
  for (let i = 0; i < segments.length; i++) {
    const previous = segments[i - 1];
    if (previous && TOKEN_PATH_PREFIXES.includes(previous) && segments[i]) {
      // "/partner/login" en "/partner/dashboard" zijn gewone pagina's, geen tokens.
      // Alles wat lang genoeg is om een token te zijn, redigeren we.
      if (segments[i].length >= 16) segments[i] = REDACTED;
    }
  }
  parsed.pathname = segments.join("/");

  parsed.searchParams.forEach((_value, key) => {
    if (SENSITIVE_PARAM.test(key)) parsed.searchParams.set(key, REDACTED);
  });

  // Fragmenten kunnen tokens bevatten en leveren zelden diagnostische waarde.
  parsed.hash = "";
  return parsed.toString();
}

function currentUrl(): string {
  if (typeof window === "undefined" || !window.location) return "";
  return scrubUrl(window.location.href);
}

// --- Normaliseren -----------------------------------------------------------

function normalise(error: unknown): { name: string; message: string; stack?: string } {
  if (error instanceof Error) {
    return { name: error.name || "Error", message: error.message, stack: error.stack };
  }
  if (typeof error === "string") {
    return { name: "Error", message: error };
  }
  // Supabase geeft foutobjecten terug die geen Error zijn maar wél een message hebben.
  if (error && typeof error === "object") {
    const candidate = error as { message?: unknown; name?: unknown; code?: unknown };
    if (typeof candidate.message === "string") {
      const code = typeof candidate.code === "string" ? ` (${candidate.code})` : "";
      return {
        name: typeof candidate.name === "string" ? candidate.name : "Error",
        message: candidate.message + code,
      };
    }
    try {
      return { name: "Error", message: JSON.stringify(error) };
    } catch {
      return { name: "Error", message: "Niet-serialiseerbare fout" };
    }
  }
  return { name: "Error", message: String(error) };
}

/**
 * Groepeersleutel. Regelnummers laten we bewust weg: dan blijft dezelfde fout
 * na een herbouw met andere bundelnamen toch één groep.
 */
function fingerprintOf(name: string, message: string, where: unknown): string {
  const normalisedMessage = message
    .replace(/\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi, "<uuid>")
    .replace(/\d+/g, "<n>");
  return [name, normalisedMessage, typeof where === "string" ? where : ""].join("|");
}

/** Laat door of de melding binnen de limieten past. */
function withinLimits(fingerprint: string, now: number): boolean {
  if (now - windowStart > DEDUPE_WINDOW_MS) {
    windowStart = now;
    windowCount = 0;
    lastSeen.clear();
  }
  const previous = lastSeen.get(fingerprint);
  if (previous !== undefined && now - previous < DEDUPE_WINDOW_MS) return false;
  if (windowCount >= MAX_EVENTS_PER_WINDOW) return false;

  lastSeen.set(fingerprint, now);
  windowCount++;
  return true;
}

// --- Melden -----------------------------------------------------------------

/**
 * Meldt een fout. Logt altijd naar de console (zodat bestaand gedrag gelijk
 * blijft) en stuurt daarnaast door naar het ingestelde transport.
 *
 * Geeft het opgebouwde event terug, of `null` als de melding is samengevat
 * met een eerdere identieke fout.
 */
export function reportError(
  error: unknown,
  context: ErrorContext = {},
  severity: ErrorSeverity = "error",
): ReportedEvent | null {
  const { name, message, stack } = normalise(error);

  // Console eerst: gaat dit meldpunt onderuit, dan is de fout nog steeds zichtbaar.
  if (context.where) {
    console.error(`[${String(context.where)}]`, error);
  } else {
    console.error(error);
  }

  const fingerprint = fingerprintOf(name, message, context.where);
  if (!withinLimits(fingerprint, Date.now())) return null;

  const event: ReportedEvent = {
    name,
    message,
    stack,
    severity,
    context: { ...context },
    breadcrumbs: [...breadcrumbs],
    url: currentUrl(),
    at: new Date().toISOString(),
    fingerprint,
  };

  try {
    transport?.(event);
  } catch {
    // Een kapot meldpunt mag nooit de aanleiding worden voor een nieuwe storing.
  }
  return event;
}

// --- Globale vangnetten -----------------------------------------------------

/**
 * Vangt fouten die geen enkele `try/catch` in de app bereikt: losse
 * exceptions en niet-afgehandelde promise-rejections. Geeft een opruimfunctie
 * terug.
 */
export function installGlobalErrorHandlers(): () => void {
  if (typeof window === "undefined") return () => {};

  const onError = (event: globalThis.ErrorEvent) => {
    reportError(event.error ?? event.message, { where: "window.onerror" }, "fatal");
  };
  const onRejection = (event: PromiseRejectionEvent) => {
    reportError(event.reason, { where: "unhandledrejection" }, "fatal");
  };

  window.addEventListener("error", onError);
  window.addEventListener("unhandledrejection", onRejection);

  return () => {
    window.removeEventListener("error", onError);
    window.removeEventListener("unhandledrejection", onRejection);
  };
}

/** Alleen voor tests: zet alle interne staat terug naar begin. */
export function __resetErrorReportingForTests(): void {
  transport = null;
  breadcrumbs = [];
  lastSeen.clear();
  windowStart = 0;
  windowCount = 0;
}
