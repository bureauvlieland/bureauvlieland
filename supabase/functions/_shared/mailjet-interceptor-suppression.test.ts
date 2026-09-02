/**
 * De suppressielijst moet gelden voor ÁLLE verzendpaden, niet alleen voor de
 * functies die `sendMailjet` gebruiken. De fetch-interceptor blokkeert daarom
 * elke directe Mailjet-post naar een geblokkeerd adres.
 *
 * Deze test controleert (bron-niveau, zonder netwerk) dat die handhaving en de
 * precisie-veilige ID-extractie in de interceptor aanwezig blijven.
 */
import { assertEquals, assertStringIncludes } from "https://deno.land/std@0.224.0/assert/mod.ts";

const src = await Deno.readTextFile(new URL("./mailjet-send.ts", import.meta.url));

Deno.test("interceptor controleert suppressie vóór het versturen", () => {
  const interceptor = src.slice(src.indexOf("export function installMailjetBodyCapture"));
  assertStringIncludes(interceptor, "checkEmailSuppressed");
  // De check moet vóór de daadwerkelijke fetch staan.
  const checkAt = interceptor.indexOf("checkEmailSuppressed");
  const fetchAt = interceptor.indexOf("await originalFetch(");
  assertEquals(checkAt < fetchAt, true, "suppressie-check staat ná de verzending");
});

Deno.test("geblokkeerde ontvanger levert een foutstatus, geen stille 'sent'", () => {
  assertStringIncludes(src, "status: 403");
  assertStringIncludes(src, "Suppressed: true");
});

Deno.test("interceptor leest MessageID uit de ruwe tekst", () => {
  assertStringIncludes(src, "extractMessageIdsFromRawText(await response.clone().text())");
});

Deno.test("email-logger corrigeert afgeronde MessageID's", async () => {
  const logger = await Deno.readTextFile(new URL("./email-logger.ts", import.meta.url));
  assertStringIncludes(logger, "resolveExactMessageId");
  assertStringIncludes(logger, "mailjet_message_id: exactMessageId");
});

Deno.test("geen enkele function leest MessageID nog uit een geparseerde respons via extractMessageIds", async () => {
  const offenders: string[] = [];
  const dir = new URL("../", import.meta.url);
  for await (const entry of Deno.readDir(dir)) {
    if (!entry.isDirectory) continue;
    const path = new URL(`../${entry.name}/index.ts`, import.meta.url);
    let text: string;
    try {
      text = await Deno.readTextFile(path);
    } catch {
      continue;
    }
    if (/extractMessageIds\(await\s+\w+\.clone\(\)\.json\(\)\)/.test(text)) {
      offenders.push(entry.name);
    }
  }
  assertEquals(
    offenders,
    [],
    `Deze functions halen de MessageID uit JSON.parse (precisieverlies): ${offenders.join(", ")}`,
  );
});
