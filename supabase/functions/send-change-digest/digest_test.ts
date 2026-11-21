// Contracttest voor send-change-digest (notificaties fase 3): de functie leest
// alleen onverzonden rijen, bouwt de mail met _shared/changeDigest.ts, wrapt
// hem in de huisstijl, logt onder item_changes_* met template_name
// item_changes_digest en zet sent_at + email_log_id. Overgeslagen dossiers
// krijgen sent_at + skipped_reason; mislukte verzendingen blijven staan.
// De zuivere opbouw (groepering, tekst, lege run) staat in
// _shared/changeDigest.test.ts.
import { assert } from "https://deno.land/std@0.224.0/assert/mod.ts";

const src = await Deno.readTextFile(new URL("./index.ts", import.meta.url));

Deno.test("send-change-digest: alleen onverzonden rijen, oudste eerst", () => {
  assert(src.includes('.from("pending_change_notifications")'));
  assert(src.includes('.is("sent_at", null)'));
  assert(src.includes('.order("created_at", { ascending: true })'));
  assert(src.includes("if (pending.length === 0)"), "lege run moet vroeg stoppen zonder mail");
});

Deno.test("send-change-digest: toegang voor cron (anon Bearer) of admin", () => {
  assert(src.includes('import { isAnonBearer } from "../_shared/jwt-role.ts";'));
  assert(src.includes("let allowed = isAnonBearer(authHeader);"));
  assert(src.includes('.eq("role", "admin")'));
});

Deno.test("send-change-digest: opbouw via changeDigest, wrapper, Mailjet en email_log", () => {
  assert(src.includes("groupPendingChanges(pending)"));
  assert(src.includes("buildChangeDigestEmail(group)"));
  assert(src.includes("await wrapEmailHtml(mail.html, admin)"));
  assert(src.includes('sendMailjet({ source: "send-change-digest", messages: [message] })'));
  assert(src.includes("email_type: emailType,"));
  assert(src.includes("template_name: DIGEST_TEMPLATE_NAME,"));
  assert(src.includes("ReplyTo: mail.replyTo"));
});

Deno.test("send-change-digest: sent_at + email_log_id na verzending, skipped_reason bij overgeslagen dossier", () => {
  assert(src.includes("skipReasonFor(requestById.get(group.request_id))"));
  assert(src.includes("{ sent_at: nowIso, skipped_reason: skipReason }"));
  assert(src.includes("{ sent_at: nowIso, email_log_id: logRow?.id ?? null }"));
  // Mislukt: geen sent_at, zodat de volgende run het opnieuw probeert.
  const failIdx = src.indexOf("if (!ok) {");
  const block = src.slice(failIdx, src.indexOf("continue;", failIdx));
  assert(!block.includes("markRows"), "een mislukte verzending mag de rij niet als verzonden markeren");
});
