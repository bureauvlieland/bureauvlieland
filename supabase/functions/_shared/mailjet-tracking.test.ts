/**
 * Repo-guard: elke edge function die Mailjet aanroept MOET de MessageID
 * doorgeven aan `logEmail(...)` via `mailjet_message_id`, of het Mailjet-
 * antwoord doorsturen naar een van de gedeelde helpers die dat afdwingen.
 *
 * Zonder deze koppeling kan de webhook opens/clicks/bounces nooit aan de
 * rij koppelen — de mail verdwijnt uit onze feedback.
 *
 * Deze test scant de gehele supabase/functions map en faalt zodra een
 * function `api.mailjet.com` (of `MAILJET_API_KEY`) gebruikt zonder ergens
 * in het bestand `mailjet_message_id` te loggen of `extractMessageIds` /
 * `sendMailjet` uit `_shared/mailjet-send.ts` aan te roepen.
 *
 * Uitzonderingen (allowlist) zijn:
 *  - de gedeelde helper zelf
 *  - de webhook die events ontvangt (verzendt niks)
 */

import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { walk } from "https://deno.land/std@0.224.0/fs/walk.ts";
import { fromFileUrl, relative } from "https://deno.land/std@0.224.0/path/mod.ts";

const FUNCTIONS_DIR = fromFileUrl(new URL("..", import.meta.url));

const ALLOWLIST = new Set<string>([
  "_shared/mailjet-send.ts",
  "_shared/mailjet-tracking.test.ts",
  "mailjet-event-webhook/index.ts",
  // inbound-email is een Mailjet Parse webhook receiver, geen sender.
  "inbound-email/index.ts",
]);

const MAILJET_SEND_PATTERNS = [
  /api\.mailjet\.com/,
  /MAILJET_API_KEY/,
];

const TRACKS_PATTERNS = [
  /mailjet_message_id/,
  /extractMessageIds/,
  /sendMailjet/,
];

Deno.test("elke edge function die Mailjet gebruikt moet MessageID loggen", async () => {
  const offenders: string[] = [];

  for await (
    const entry of walk(FUNCTIONS_DIR, {
      exts: [".ts"],
      includeDirs: false,
      skip: [/\/node_modules\//, /\.test\.ts$/],
    })
  ) {
    const rel = relative(FUNCTIONS_DIR, entry.path).replaceAll("\\", "/");
    if (ALLOWLIST.has(rel)) continue;

    const src = await Deno.readTextFile(entry.path);
    const usesMailjet = MAILJET_SEND_PATTERNS.some((r) => r.test(src));
    if (!usesMailjet) continue;

    const tracksMessageId = TRACKS_PATTERNS.some((r) => r.test(src));
    if (!tracksMessageId) {
      offenders.push(rel);
    }
  }

  assertEquals(
    offenders,
    [],
    `Deze edge functions versturen mail zonder de Mailjet MessageID te loggen. ` +
      `Voeg 'mailjet_message_id' toe aan de logEmail-call of gebruik ` +
      `extractMessageIds/sendMailjet uit _shared/mailjet-send.ts:\n  - ${
        offenders.join("\n  - ")
      }`,
  );
});
