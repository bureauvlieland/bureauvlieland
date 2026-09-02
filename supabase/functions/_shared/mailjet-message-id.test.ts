/**
 * Regressietest voor het precisieverlies dat opens/afleveringen onzichtbaar
 * maakte: 64-bits Mailjet MessageID's mogen NOOIT via JSON.parse lopen.
 */
import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  extractMessageIdsFromRawText,
  firstMessageIdFromRawText,
  parseEventsPreservingIds,
  splitJsonObjects,
} from "./mailjet-message-id.ts";

const BIG_ID = "1152921544126870016";

Deno.test("JSON.parse verliest precisie (de bug die we omzeilen)", () => {
  const parsed = JSON.parse(`{"MessageID":${BIG_ID}}`) as { MessageID: number };
  assertEquals(String(parsed.MessageID) === BIG_ID, false);
});

Deno.test("extractMessageIdsFromRawText houdt de exacte 64-bits ID", () => {
  const raw = `{"Messages":[{"To":[{"Email":"a@x.nl","MessageID":${BIG_ID}}]}]}`;
  assertEquals(extractMessageIdsFromRawText(raw), [BIG_ID]);
});

Deno.test("meerdere ontvangers geven hun eigen ID in verzendorde", () => {
  const raw = JSON.stringify({
    Messages: [
      { To: [{ Email: "a@x.nl", MessageID: 1 }] },
      { To: [{ Email: "b@x.nl", MessageID: 2 }] },
    ],
  }).replace('"MessageID":1', `"MessageID":${BIG_ID}`);
  assertEquals(extractMessageIdsFromRawText(raw), [BIG_ID, "2"]);
});

Deno.test("ID als string in de JSON werkt ook", () => {
  assertEquals(firstMessageIdFromRawText(`{"MessageID":"${BIG_ID}"}`), BIG_ID);
});

Deno.test("geen ID → null", () => {
  assertEquals(firstMessageIdFromRawText(`{"Messages":[]}`), null);
});

Deno.test("splitJsonObjects splitst een event-array, ook met accolades in strings", () => {
  const raw = `[{"event":"open","email":"a{b}@x.nl"},{"event":"bounce","email":"b@x.nl"}]`;
  const chunks = splitJsonObjects(raw);
  assertEquals(chunks.length, 2);
  assertEquals(JSON.parse(chunks[1]).event, "bounce");
});

Deno.test("splitJsonObjects op één object geeft één chunk", () => {
  assertEquals(splitJsonObjects(`{"event":"open"}`).length, 1);
});

Deno.test("parseEventsPreservingIds koppelt per event de exacte ID", () => {
  const raw =
    `[{"event":"open","MessageID":${BIG_ID},"email":"a@x.nl"},{"event":"bounce","MessageID":2,"email":"b@x.nl"}]`;
  const { events, skipped } = parseEventsPreservingIds<{ event: string; email: string }>(raw);
  assertEquals(skipped, 0);
  assertEquals(events.length, 2);
  assertEquals(events[0].messageId, BIG_ID);
  assertEquals(events[0].event.event, "open");
  assertEquals(events[1].messageId, "2");
});

Deno.test("onparseerbare payload levert geen events", () => {
  const { events } = parseEventsPreservingIds("niet json");
  assertEquals(events.length, 0);
});
