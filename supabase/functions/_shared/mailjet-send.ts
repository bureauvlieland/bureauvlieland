/**
 * Centrale Mailjet-verzender.
 *
 * Waarom deze helper bestaat:
 * - Elke edge function die mail verstuurt moet de Mailjet `MessageID` uit
 *   de response halen en meegeven aan `logEmail(...)`. Zonder die ID kan
 *   de webhook nooit een open/click/bounce/delivery-event aan de rij
 *   koppelen — de mail verdwijnt uit onze feedback.
 * - Voorheen deed elke function dit zelf (of vergat het). Dat leverde
 *   tientallen rijen `status='sent'` op zonder `mailjet_message_id`, wat
 *   permanente blind spots opleverde.
 *
 * Gebruik:
 *   const result = await sendMailjet({ messages: [...] });
 *   if (!result.ok) { ... }
 *   // result.messageId bevat de Mailjet MessageID (string) — direct
 *   // doorgeven aan logEmail({ mailjet_message_id: result.messageId, ... }).
 *
 * De helper handelt CREDENTIAL-check, HTTP-fout, en MessageID-extractie
 * af. Retries doet Mailjet zelf; wij loggen alleen wat er gebeurde.
 */

const MAILJET_API_URL = "https://api.mailjet.com/v3.1/send";

export interface MailjetMessage {
  From: { Email: string; Name?: string };
  To: Array<{ Email: string; Name?: string }>;
  Cc?: Array<{ Email: string; Name?: string }>;
  Bcc?: Array<{ Email: string; Name?: string }>;
  ReplyTo?: { Email: string; Name?: string };
  Subject: string;
  HTMLPart?: string;
  TextPart?: string;
  Attachments?: Array<{
    ContentType: string;
    Filename: string;
    Base64Content: string;
  }>;
  Headers?: Record<string, string>;
  TrackOpens?: "enabled" | "disabled" | "account_default";
  TrackClicks?: "enabled" | "disabled" | "account_default";
  CustomID?: string;
  [key: string]: unknown;
}

export interface SendMailjetOptions {
  messages: MailjetMessage[];
  /**
   * Optionele label voor console-logging (bijv. "send-quote-offer"). Zorgt
   * dat je in de edge function logs terugziet welke aanroep faalde.
   */
  source?: string;
  /**
   * Als deze key aanwezig is, controleert de helper eerst of dezelfde send
   * de afgelopen `idempotencyWindowMinutes` (default 10) al succesvol is
   * uitgevoerd. Zo ja: send wordt overgeslagen en `skipped: 'duplicate'`
   * geretourneerd — de aanroeper kan dan gewoon `logEmail(status='sent',
   * mailjet_message_id=<vorige>)` doen zonder dubbele mail te sturen.
   */
  idempotencyKey?: string;
  idempotencyWindowMinutes?: number;
  /**
   * Als true, wordt vóór verzending gecheckt of één van de ontvangers op
   * de suppression-lijst staat. Standaard `true` — alleen uitzetten voor
   * technische alerts naar admins die altijd door moeten.
   */
  checkSuppression?: boolean;
}

export type SendMailjetResult =
  | {
      ok: true;
      /** MessageID van de eerste ontvanger van het eerste bericht. */
      messageId: string | null;
      /** Alle MessageID's (1 per Message × To combinatie). */
      messageIds: string[];
      raw: unknown;
      /** Gezet als de send is overgeslagen (dedupe of suppressed). */
      skipped?: "duplicate" | "suppressed" | "test_mode";
      /** Bij `skipped='suppressed'`: welk adres + reden. */
      suppressedRecipient?: { email: string; reason: string };
    }
  | {
      ok: false;
      error: string;
      status?: number;
    };


/**
 * Extract Mailjet MessageID uit een geslaagde v3.1 response.
 * Response-vorm:
 * {
 *   Messages: [
 *     {
 *       Status: "success",
 *       To: [{ Email, MessageID: 1234, MessageUUID, MessageHref }],
 *       ...
 *     }
 *   ]
 * }
 * MessageID kan `number` zijn — we stringify'en altijd.
 */
// ---------------------------------------------------------------------------
// Body-registry: bewaart per verzending de daadwerkelijke HTML/tekst zodat
// `logEmail(...)` die automatisch in `email_log` kan opslaan. Zonder dit
// moest elke edge function zelf `html_body` meegeven — wat vrijwel nergens
// gebeurde, waardoor het admin-dialoog altijd "inhoud niet bewaard" toonde.
// ---------------------------------------------------------------------------

export interface SentBody {
  html_body?: string;
  text_body?: string;
  subject?: string;
  from_email?: string;
  reply_to?: string;
}

const sentBodies = new Map<string, SentBody>();
const MAX_REGISTRY_ENTRIES = 200;

function registryKeys(msg: MailjetMessage, messageId?: string | null): string[] {
  const keys: string[] = [];
  if (messageId) keys.push(`id:${messageId}`);
  for (const to of msg.To ?? []) {
    if (to?.Email) keys.push(`to:${to.Email.trim().toLowerCase()}`);
  }
  return keys;
}

function rememberBody(msg: MailjetMessage, messageId?: string | null): void {
  const body: SentBody = {
    html_body: msg.HTMLPart,
    text_body: msg.TextPart,
    subject: msg.Subject,
    from_email: msg.From?.Email,
    reply_to: msg.ReplyTo?.Email,
  };
  for (const key of registryKeys(msg, messageId)) {
    sentBodies.set(key, body);
  }
  // Simpele FIFO-cap zodat een langlevende isolate niet volloopt.
  while (sentBodies.size > MAX_REGISTRY_ENTRIES) {
    const oldest = sentBodies.keys().next().value;
    if (oldest === undefined) break;
    sentBodies.delete(oldest);
  }
}

/** Zoek de bewaarde inhoud op via MessageID of ontvangeradres. */
export function lookupSentBody(opts: {
  messageId?: string | null;
  recipientEmail?: string | null;
}): SentBody | null {
  if (opts.messageId) {
    const byId = sentBodies.get(`id:${opts.messageId}`);
    if (byId) return byId;
  }
  if (opts.recipientEmail) {
    const byTo = sentBodies.get(`to:${opts.recipientEmail.trim().toLowerCase()}`);
    if (byTo) return byTo;
  }
  return null;
}

/** Alleen voor tests. */
export function __clearSentBodies(): void {
  sentBodies.clear();
}

/**
 * De meeste edge functions posten (historisch) zelf naar de Mailjet API in
 * plaats van via `sendMailjet`. Daardoor bleef `html_body` in `email_log`
 * altijd leeg en toonde het admin-dialoog "inhoud niet bewaard".
 *
 * Deze interceptor wrapt `fetch` één keer en onthoudt de verstuurde
 * HTML/tekst van élke Mailjet-send, ongeacht welke function hem doet.
 * `email-logger.ts` importeert deze module, en elke verzendende function
 * importeert `logEmail`, dus de capture is overal actief.
 */
export function installMailjetBodyCapture(): void {
  const g = globalThis as typeof globalThis & { __mailjetBodyCapture?: boolean };
  if (g.__mailjetBodyCapture) return;
  g.__mailjetBodyCapture = true;

  const originalFetch = globalThis.fetch;
  globalThis.fetch = async function (input: RequestInfo | URL, init?: RequestInit) {
    const url =
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.toString()
          : input.url;
    const isMailjetSend =
      typeof url === "string" && url.includes("api.mailjet.com") && url.includes("/send");

    let messages: MailjetMessage[] = [];
    if (isMailjetSend && typeof init?.body === "string") {
      try {
        const parsedBody = JSON.parse(init.body) as { Messages?: MailjetMessage[] };
        messages = Array.isArray(parsedBody?.Messages) ? parsedBody.Messages : [];
      } catch {
        messages = [];
      }
    }

    const response = await originalFetch(input as RequestInfo, init);

    if (isMailjetSend && messages.length > 0 && response.ok) {
      try {
        const raw = JSON.parse(await response.clone().text()) as {
          Messages?: Array<{ To?: Array<{ MessageID?: unknown }> }>;
        };
        messages.forEach((msg, i) => {
          const id = raw?.Messages?.[i]?.To?.[0]?.MessageID;
          rememberBody(msg, id !== undefined && id !== null ? String(id) : null);
        });
      } catch {
        messages.forEach((msg) => rememberBody(msg, null));
      }
    }

    return response;
  };
}


export function extractMessageIds(raw: unknown): string[] {

  const ids: string[] = [];
  if (!raw || typeof raw !== "object") return ids;
  const messages = (raw as { Messages?: unknown }).Messages;
  if (!Array.isArray(messages)) return ids;
  for (const msg of messages) {
    if (!msg || typeof msg !== "object") continue;
    const to = (msg as { To?: unknown }).To;
    if (!Array.isArray(to)) continue;
    for (const recipient of to) {
      const id = (recipient as { MessageID?: unknown })?.MessageID;
      if (id !== undefined && id !== null && id !== "") {
        ids.push(String(id));
      }
    }
  }
  return ids;
}

/**
 * Verstuur één of meer berichten via Mailjet en geef gestructureerd
 * resultaat terug inclusief de MessageID's die je verplicht meegeeft aan
 * `logEmail(...)`.
 */
export async function sendMailjet(
  opts: SendMailjetOptions,
): Promise<SendMailjetResult> {
  const apiKey = Deno.env.get("MAILJET_API_KEY");
  const secretKey = Deno.env.get("MAILJET_SECRET_KEY");
  const source = opts.source ?? "unknown";
  const testMode = Deno.env.get("MAILJET_TEST_MODE") === "1";

  // Test mode: geen echte call, deterministische fake MessageID zodat
  // E2E-tests wél de logEmail-rij en downstream logica kunnen asserteren.
  if (testMode) {
    const fakeId = `test-${crypto.randomUUID()}`;
    console.log(`[mailjet-send:${source}] TEST MODE — skipping real send, returning ${fakeId}`);
    for (const msg of opts.messages) rememberBody(msg, fakeId);
    return { ok: true, messageId: fakeId, messageIds: [fakeId], raw: null, skipped: "test_mode" };
  }


  if (!apiKey || !secretKey) {
    console.error(`[mailjet-send:${source}] Mailjet credentials not configured`);
    return { ok: false, error: "Mailjet credentials not configured" };
  }

  // Suppression pre-flight: als één van de To-adressen op de lijst staat,
  // versturen we niets. Default aan; alleen expliciet uit te schakelen.
  if (opts.checkSuppression !== false) {
    for (const msg of opts.messages) {
      for (const to of msg.To ?? []) {
        const supp = await checkEmailSuppressed(to.Email);
        if (supp) {
          console.warn(
            `[mailjet-send:${source}] Skipping — recipient ${to.Email} is suppressed (${supp.reason})`,
          );
          return {
            ok: true,
            messageId: null,
            messageIds: [],
            raw: null,
            skipped: "suppressed",
            suppressedRecipient: { email: to.Email, reason: supp.reason },
          };
        }
      }
    }
  }

  // Idempotency: als recent dezelfde key succesvol is verstuurd, hergebruik
  // de oude MessageID en sla nieuwe send over. Voorkomt dubbele facturen.
  if (opts.idempotencyKey) {
    const prev = await findRecentIdempotentSend(
      opts.idempotencyKey,
      opts.idempotencyWindowMinutes ?? 10,
    );
    if (prev) {
      console.warn(
        `[mailjet-send:${source}] Skipping — idempotency key '${opts.idempotencyKey}' already sent at ${prev.sentAt}`,
      );
      return {
        ok: true,
        messageId: prev.mailjetMessageId,
        messageIds: prev.mailjetMessageId ? [prev.mailjetMessageId] : [],
        raw: null,
        skipped: "duplicate",
      };
    }
  }


  let response: Response;
  try {
    response = await fetch(MAILJET_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${btoa(`${apiKey}:${secretKey}`)}`,
      },
      body: JSON.stringify({ Messages: opts.messages }),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[mailjet-send:${source}] Network error:`, msg);
    return { ok: false, error: `Network error: ${msg}` };
  }

  const text = await response.text();
  let parsed: unknown = null;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    parsed = null;
  }

  if (!response.ok) {
    console.error(
      `[mailjet-send:${source}] HTTP ${response.status}:`,
      text.slice(0, 500),
    );
    return {
      ok: false,
      error: text.slice(0, 500) || `HTTP ${response.status}`,
      status: response.status,
    };
  }

  const messageIds = extractMessageIds(parsed);
  if (messageIds.length === 0) {
    console.warn(
      `[mailjet-send:${source}] No MessageID in response — feedback tracking blind for this send.`,
      text.slice(0, 300),
    );
  }

  // Bewaar de verstuurde inhoud per bericht (op MessageID én op ontvanger),
  // zodat logEmail die zonder extra werk in `email_log` kan opslaan.
  const perMessage = Array.isArray((parsed as { Messages?: unknown })?.Messages)
    ? ((parsed as { Messages: unknown[] }).Messages)
    : [];
  opts.messages.forEach((msg, i) => {
    const to = (perMessage[i] as { To?: Array<{ MessageID?: unknown }> } | undefined)?.To;
    const id = to?.[0]?.MessageID;
    rememberBody(msg, id !== undefined && id !== null ? String(id) : null);
  });



  return {
    ok: true,
    messageId: messageIds[0] ?? null,
    messageIds,
    raw: parsed,
  };
}

// ---------------------------------------------------------------------------
// Suppression + idempotency helpers
// ---------------------------------------------------------------------------
//
// Beide helpers maken hun eigen service-role client aan zodat elke edge
// function ze kan gebruiken zonder een client door te geven. Ze zijn
// bewust "fail open": als de check zelf een DB-fout gooit, laten we de
// send doorgaan (beter een dubbele mail dan een gemiste mail). Wel
// loggen we luid zodat we het in de function-logs terugvinden.

import { createClient as _createClient } from "https://esm.sh/@supabase/supabase-js@2";

function serviceClient() {
  const url = Deno.env.get("SUPABASE_URL")!;
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  return _createClient(url, key);
}

/**
 * Check of `email` op de suppressielijst staat (bounce/spam/blocked/unsub/
 * handmatig). Retourneert `null` als het adres mag, of `{ reason }` als
 * het adres geblokt is. Fail-open bij DB-fouten.
 */
export async function checkEmailSuppressed(
  email: string,
): Promise<{ reason: string; source?: string | null } | null> {
  try {
    const supabase = serviceClient();
    const { data, error } = await supabase
      .from("email_suppressions")
      .select("reason, source")
      .ilike("email", email.trim())
      .maybeSingle();
    if (error) {
      console.warn("[mailjet-send] suppression lookup failed:", error.message);
      return null;
    }
    return data ? { reason: data.reason, source: data.source } : null;
  } catch (err) {
    console.warn("[mailjet-send] suppression lookup threw:", err);
    return null;
  }
}

/**
 * Idempotency-check: kijkt of er in het `windowMinutes`-venster al een
 * geslaagde send-rij bestaat met dezelfde `idempotencyKey`. Als dat zo is,
 * retourneert de bestaande `mailjet_message_id` zodat de aanroeper de send
 * kan overslaan en toch consistent logt.
 */
export async function findRecentIdempotentSend(
  idempotencyKey: string,
  windowMinutes = 10,
): Promise<{ mailjetMessageId: string | null; sentAt: string } | null> {
  try {
    const supabase = serviceClient();
    const since = new Date(Date.now() - windowMinutes * 60_000).toISOString();
    const { data, error } = await supabase
      .from("email_log")
      .select("mailjet_message_id, sent_at")
      .eq("idempotency_key", idempotencyKey)
      .in("status", ["sent", "delivered", "opened", "clicked"])
      .gte("sent_at", since)
      .order("sent_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) {
      console.warn("[mailjet-send] idempotency lookup failed:", error.message);
      return null;
    }
    if (!data) return null;
    return {
      mailjetMessageId: data.mailjet_message_id ?? null,
      sentAt: data.sent_at,
    };
  } catch (err) {
    console.warn("[mailjet-send] idempotency lookup threw:", err);
    return null;
  }
}

