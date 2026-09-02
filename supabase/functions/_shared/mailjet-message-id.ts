/**
 * Precisie-veilige verwerking van Mailjet MessageID's.
 *
 * WAAROM DIT BESTAAT
 * Mailjet MessageID's zijn 64-bits integers (19 cijfers, bijv.
 * 1152921544126870016). `JSON.parse` zet die om naar een JavaScript-number
 * (IEEE-754 double, max veilig 2^53) en **rondt af**:
 *   JSON.parse('{"MessageID":1152921544126870016}').MessageID
 *     → 1152921544126870000
 *
 * Gevolg: de ID die we bij verzending opslaan en de ID die we uit een
 * webhook-event lezen zijn twee verschillende afgeronde waarden, en de
 * koppeling mislukt stil. Precies de reden dat opens/afleveringen nooit
 * matchten.
 *
 * Oplossing: de MessageID ALTIJD als string uit de ruwe JSON-tekst halen,
 * vóór (of naast) `JSON.parse`.
 */

/** Alle MessageID's in volgorde van voorkomen, als exacte strings. */
export function extractMessageIdsFromRawText(text: string): string[] {
  const ids: string[] = [];
  if (!text) return ids;
  const re = /"MessageID"\s*:\s*"?(\d+)"?/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(text)) !== null) {
    ids.push(match[1]);
  }
  return ids;
}

/** Eerste MessageID uit ruwe tekst, of null. */
export function firstMessageIdFromRawText(text: string): string | null {
  return extractMessageIdsFromRawText(text)[0] ?? null;
}

/**
 * Splits een ruwe JSON-payload in de losse top-level objecten.
 * - Is de payload een array (`[{...},{...}]`) → één chunk per element.
 * - Is het één object → één chunk (de hele tekst).
 *
 * Nodig omdat we per event de MessageID uit de RUWE tekst moeten halen;
 * `JSON.parse` van de hele payload zou de ID's al hebben afgerond.
 */
export function splitJsonObjects(text: string): string[] {
  const trimmed = (text ?? "").trim();
  if (!trimmed) return [];
  if (!trimmed.startsWith("[")) return [trimmed];

  const chunks: string[] = [];
  let depth = 0;
  let start = -1;
  let inString = false;
  let escaped = false;

  for (let i = 0; i < trimmed.length; i++) {
    const ch = trimmed[i];

    if (inString) {
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }

    if (ch === '"') {
      inString = true;
    } else if (ch === "{") {
      if (depth === 0) start = i;
      depth++;
    } else if (ch === "}") {
      depth--;
      if (depth === 0 && start >= 0) {
        chunks.push(trimmed.slice(start, i + 1));
        start = -1;
      }
    }
  }

  return chunks;
}

export interface RawEventChunk<T> {
  /** Het geparseerde event (MessageID hierin is AFGEROND — niet gebruiken). */
  event: T;
  /** De exacte MessageID als string, uit de ruwe tekst. */
  messageId: string | null;
}

/**
 * Parse een webhook-payload zó dat elk event zijn exacte MessageID houdt.
 * Onparseerbare chunks worden overgeslagen (met een tellertje voor de logs).
 */
export function parseEventsPreservingIds<T = Record<string, unknown>>(
  rawText: string,
): { events: Array<RawEventChunk<T>>; skipped: number } {
  const chunks = splitJsonObjects(rawText);
  const events: Array<RawEventChunk<T>> = [];
  let skipped = 0;

  for (const chunk of chunks) {
    let parsed: T;
    try {
      parsed = JSON.parse(chunk) as T;
    } catch {
      skipped++;
      continue;
    }
    events.push({ event: parsed, messageId: firstMessageIdFromRawText(chunk) });
  }

  return { events, skipped };
}
