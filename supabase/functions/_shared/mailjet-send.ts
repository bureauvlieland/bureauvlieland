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
}

export type SendMailjetResult =
  | {
      ok: true;
      /** MessageID van de eerste ontvanger van het eerste bericht. */
      messageId: string | null;
      /** Alle MessageID's (1 per Message × To combinatie). */
      messageIds: string[];
      raw: unknown;
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

  if (!apiKey || !secretKey) {
    console.error(`[mailjet-send:${source}] Mailjet credentials not configured`);
    return { ok: false, error: "Mailjet credentials not configured" };
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

  return {
    ok: true,
    messageId: messageIds[0] ?? null,
    messageIds,
    raw: parsed,
  };
}
