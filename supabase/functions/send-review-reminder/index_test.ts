import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { BodySchema, DEFAULT_DAYS, isDue, reminderVariables, skipReason, type ReminderProgram, type ReminderReview } from "./index.ts";

const now = new Date("2026-09-22T12:00:00Z");
const review = (extra: Partial<ReminderReview> = {}): ReminderReview => ({
  id: "r1",
  request_id: "p1",
  source: "portal",
  text_positive: "Alles liep <perfect>.\nTop dag.",
  author_name: "Ilona",
  created_at: "2026-09-10T10:00:00Z",
  google_clicked_at: null,
  reminder_sent_at: null,
  reminder_skipped_at: null,
  ...extra,
});
const program = (extra: Partial<ReminderProgram> = {}): ReminderProgram => ({
  id: "p1",
  reference_number: "BV-2026-041",
  customer_name: "Ilona de Vries",
  customer_email: "ilona@example.com",
  review_token: "tok123",
  status: "completed",
  cancelled_at: null,
  ...extra,
});

Deno.test("BodySchema: review_id of mode 'due'", () => {
  assertEquals(BodySchema.safeParse({ mode: "due" }).success, true);
  assertEquals(BodySchema.safeParse({ review_id: "6f1a2b3c-4d5e-4f60-8a9b-0c1d2e3f4a5b" }).success, true);
  assertEquals(BodySchema.safeParse({}).success, false);
  assertEquals(BodySchema.safeParse({ review_id: "geen-uuid" }).success, false);
});

Deno.test("isDue: alleen eigen beoordelingen zonder klik, herinnering of overslaan, en oud genoeg", () => {
  assertEquals(isDue(review(), now, DEFAULT_DAYS), true);
  assertEquals(isDue(review({ created_at: "2026-09-16T10:00:00Z" }), now, DEFAULT_DAYS), false);
  assertEquals(isDue(review({ created_at: "2026-09-15T11:00:00Z" }), now, DEFAULT_DAYS), true);
  assertEquals(isDue(review({ google_clicked_at: "2026-09-11T10:00:00Z" }), now, DEFAULT_DAYS), false);
  assertEquals(isDue(review({ reminder_sent_at: "2026-09-17T10:00:00Z" }), now, DEFAULT_DAYS), false);
  assertEquals(isDue(review({ reminder_skipped_at: "2026-09-17T10:00:00Z" }), now, DEFAULT_DAYS), false);
  assertEquals(isDue(review({ source: "legacy" }), now, DEFAULT_DAYS), false);
  assertEquals(isDue(review({ created_at: "rommel" }), now, DEFAULT_DAYS), false);
  assertEquals(isDue(review({ created_at: "2026-09-19T10:00:00Z" }), now, 3), true);
});

Deno.test("skipReason: geen adres, geannuleerd of geen link", () => {
  assertEquals(skipReason(program()), null);
  assertEquals(skipReason(null), "programma niet gevonden");
  assertEquals(skipReason(program({ customer_email: null })), "geen e-mailadres");
  assertEquals(skipReason(program({ status: "cancelled" })), "programma geannuleerd");
  assertEquals(skipReason(program({ cancelled_at: "2026-09-01T00:00:00Z" })), "programma geannuleerd");
  assertEquals(skipReason(program({ review_token: null })), "geen beoordelingslink");
});

Deno.test("reminderVariables: ontsmet de tekst en zet regeleinden om", () => {
  const vars = reminderVariables(review(), program(), "https://g.page/r/x", "https://bureauvlieland.nl/beoordeling/tok123");
  assertEquals(vars.customer_name, "Ilona");
  assertEquals(vars.reference_number, "BV-2026-041");
  assertEquals(vars.review_text, "Alles liep &lt;perfect&gt;.<br>Top dag.");
  assertEquals(vars.google_review_url, "https://g.page/r/x");
  assertEquals(vars.own_review_url, "https://bureauvlieland.nl/beoordeling/tok123");
  assertEquals(reminderVariables(review({ author_name: "", text_positive: "" }), program(), "g", "o").customer_name, "Ilona de Vries");
  assertEquals(reminderVariables(review({ text_positive: "" }), program(), "g", "o").review_text, "");
});
