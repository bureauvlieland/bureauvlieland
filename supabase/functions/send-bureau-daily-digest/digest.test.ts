import { assert, assertEquals, assertStringIncludes } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  buildDailyDigest,
  localDate,
  localDayBounds,
  previousDate,
  type DigestInput,
} from "./digest.ts";

const empty: DigestInput = {
  today: "2026-11-22",
  yesterday: "2026-11-21",
  inboundYesterday: [],
  dueToday: [],
  expiringToday: [],
  openLongerThan: [],
  conversationsLongerThan: [],
  failedYesterday: [],
  sentYesterday: 14,
};

Deno.test("lege dag: 'niets nieuws' in onderwerp en tekst, mail gaat toch", () => {
  const out = buildDailyDigest(empty);
  assert(out.isEmpty);
  assertStringIncludes(out.subject, "niets nieuws");
  assertStringIncludes(out.html, "Niets nieuws");
  assertStringIncludes(out.html, "Alle 14 mails van gisteren zijn verzonden");
  assertEquals(out.summaryLine, "binnengekomen=0 vandaag=0 open>3d=0 mislukt=0 verstuurd_gisteren=14");
});

Deno.test("volle dag: tellingen in onderwerp, secties met links naar het dossier, oudste eerst", () => {
  const out = buildDailyDigest({
    ...empty,
    inboundYesterday: [
      { id: "a", title: "Partner Fortuna reageert op \"Rondleiding\" — bevestigd", auto_type: "partner_status_update", priority: "normal", created_at: "2026-11-21T09:00:00Z", related_request_id: "req-1", project_label: "BV-2611-0001 · Haze" },
      { id: "b", title: "Klant Haze heeft getekend", auto_type: "customer_terms_signed", priority: "normal", created_at: "2026-11-21T15:00:00Z", related_request_id: "req-1", project_label: "BV-2611-0001 · Haze" },
    ],
    expiringToday: [{ reference_number: "BV-2610-0003", customer_label: "Dijkstra", request_id: "req-2", valid_until: "2026-11-22" }],
    openLongerThan: [
      { id: "c", title: "Inkoopfactuur ontbreekt: Zuiver", auto_type: "commission_missing_invoice", priority: "high", created_at: "2026-11-10T08:00:00Z", related_request_id: "req-3", project_label: "BV-2605-0001 · Zuiver" },
    ],
    conversationsLongerThan: [
      { from: "Richard Dijkstra", channel: "e-mail", since: "2026-11-17T10:00:00Z", related_request_id: "req-2", project_label: "BV-2610-0003 · Dijkstra" },
    ],
    failedYesterday: [{ email_type: "item_changes_customer", recipient_email: "x@example.com", status: "bounced" }],
  });
  assert(!out.isEmpty);
  assertStringIncludes(out.subject, "2 binnengekomen");
  assertStringIncludes(out.subject, "1 verloopt vandaag");
  assertStringIncludes(out.subject, "2 staan langer open");
  assertStringIncludes(out.subject, "1 mail mislukt");
  assertStringIncludes(out.html, "/admin/aanvragen/req-1");
  assertStringIncludes(out.html, "Offerte verloopt vandaag: Dijkstra");
  assertStringIncludes(out.html, "E-mail van Richard Dijkstra wacht 5 dagen");
  assertStringIncludes(out.html, "(12 dagen open)");
  assertStringIncludes(out.html, "item_changes_customer aan x@example.com: bounced");
  // nieuwste gebeurtenis bovenaan
  assert(out.html.indexOf("heeft getekend") < out.html.indexOf("Fortuna reageert"));
});

Deno.test("meer dan het maximum: '… en nog N'", () => {
  const many = Array.from({ length: 15 }, (_, i) => ({
    id: String(i), title: `Gebeurtenis ${i}`, auto_type: "partner_status_update", priority: "normal",
    created_at: `2026-11-21T${String(i).padStart(2, "0")}:00:00Z`,
  }));
  const out = buildDailyDigest({ ...empty, inboundYesterday: many });
  assertStringIncludes(out.html, "… en nog 3");
});

Deno.test("vrije tekst wordt ontsmet", () => {
  const out = buildDailyDigest({
    ...empty,
    inboundYesterday: [{ id: "x", title: "<img src=x onerror=alert(1)> test", auto_type: null, priority: null, created_at: "2026-11-21T09:00:00Z" }],
  });
  assert(!out.html.includes("<img"));
});

Deno.test("datumhulpen: lokale dag, gisteren en daggrenzen in de Nederlandse tijdzone", () => {
  // 23:30 UTC op 21 november is 00:30 op 22 november in Nederland (winter, +1).
  assertEquals(localDate(new Date("2026-11-21T23:30:00Z")), "2026-11-22");
  assertEquals(previousDate("2026-11-22"), "2026-11-21");
  assertEquals(previousDate("2026-03-01"), "2026-02-28");
  const nov = localDayBounds("2026-11-21");
  assertEquals(nov.start, "2026-11-20T23:00:00.000Z");
  assertEquals(nov.end, "2026-11-21T23:00:00.000Z");
  const jul = localDayBounds("2026-07-10");
  assertEquals(jul.start, "2026-07-09T22:00:00.000Z");
});
