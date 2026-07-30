import { describe, it, expect } from "vitest";
import {
  EMAIL_INTENTS,
  buildComposerPrompt,
  buildDossier,
  findIntent,
  formatDossier,
  goalForIntent,
  suggestIntent,
  truncate,
  type DossierEntry,
} from "../emailComposerIntents";

const now = new Date("2026-07-20T12:00:00Z");

const entries: DossierEntry[] = [
  { at: "2026-07-01T09:00:00Z", kind: "email_out", subject: "Uw voorstel", content: "Beste Nancy, hierbij het voorstel." },
  { at: "2026-07-05T09:00:00Z", kind: "email_in", who: "Nancy", content: "Dank, we kijken ernaar. Kan de boot later?" },
  { at: "2026-07-06T09:00:00Z", kind: "system_email", subject: "Herinnering offerte" },
  { at: "not-a-date", kind: "note", content: "kapot" },
];

describe("emailComposerIntents – intenties", () => {
  it("bevat unieke ids met label, hint en doel", () => {
    const ids = EMAIL_INTENTS.map((i) => i.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const i of EMAIL_INTENTS) {
      expect(i.label.length).toBeGreaterThan(2);
      expect(i.hint.length).toBeGreaterThan(5);
      expect(i.goal.length).toBeGreaterThan(20);
    }
  });

  it("valt terug op een generiek doel bij onbekende intentie", () => {
    expect(findIntent("bestaat-niet")).toBeNull();
    expect(goalForIntent(null)).toMatch(/opvolgmail/i);
    expect(goalForIntent("ask_approval")).toMatch(/goed te keuren/i);
  });
});

describe("emailComposerIntents – dossier", () => {
  it("filtert ongeldige datums, sorteert chronologisch en vat samen", () => {
    const { entries: out, summary } = buildDossier(entries, { now });
    expect(out).toHaveLength(3);
    expect(out[0].at).toBe("2026-07-01T09:00:00Z");
    expect(summary.outgoingCount).toBe(1);
    expect(summary.incomingCount).toBe(1);
    expect(summary.systemEmailCount).toBe(1);
    expect(summary.lastCustomerContactAt).toBe("2026-07-05T09:00:00Z");
    expect(summary.daysSinceCustomerContact).toBe(15);
    expect(summary.lastIncomingExcerpt).toMatch(/Kan de boot later/);
  });

  it("kapt af op max en houdt de nieuwste items", () => {
    const many: DossierEntry[] = Array.from({ length: 30 }, (_, i) => ({
      at: `2026-07-${String(i + 1).padStart(2, "0")}T09:00:00Z`,
      kind: "email_out",
      content: `bericht ${i + 1}`,
    }));
    const { entries: out } = buildDossier(many, { max: 5, now });
    expect(out).toHaveLength(5);
    expect(out[out.length - 1].content).toBe("bericht 30");
  });

  it("meldt netjes dat er nog geen communicatie is", () => {
    const { summary } = buildDossier([], { now });
    expect(summary.totalEntries).toBe(0);
    expect(summary.daysSinceCustomerContact).toBeNull();
    expect(formatDossier([])).toMatch(/nog geen eerdere communicatie/i);
  });

  it("truncate voegt ellips toe en normaliseert whitespace", () => {
    expect(truncate("a\n\n  b")).toBe("a b");
    expect(truncate("abcdef", 3)).toBe("abc…");
  });
});

describe("emailComposerIntents – suggestIntent", () => {
  const base = buildDossier(entries, { now }).summary;

  it("kiest antwoorden als de klant net gereageerd heeft", () => {
    const recent = buildDossier(
      [{ at: "2026-07-19T09:00:00Z", kind: "email_in", content: "vraagje" }],
      { now },
    ).summary;
    expect(suggestIntent({ summary: recent })).toBe("reply_last");
  });

  it("kiest herinnering als er al meerdere mails uit zijn zonder akkoord", () => {
    const summary = buildDossier(
      [
        { at: "2026-07-01T09:00:00Z", kind: "email_out", content: "1" },
        { at: "2026-07-08T09:00:00Z", kind: "email_out", content: "2" },
      ],
      { now },
    ).summary;
    expect(suggestIntent({ quoteSentAt: "2026-07-01", summary })).toBe("reminder_proposal");
  });

  it("kiest akkoord vragen bij een eerste verstuurde offerte", () => {
    const summary = buildDossier(
      [{ at: "2026-07-01T09:00:00Z", kind: "email_out", content: "1" }],
      { now },
    ).summary;
    expect(suggestIntent({ quoteSentAt: "2026-07-01", summary })).toBe("ask_approval");
  });

  it("kiest nazorg of factuur-opvolging na uitvoering", () => {
    const summary = buildDossier([], { now }).summary;
    expect(suggestIntent({ executionDone: true, summary })).toBe("aftercare");
    expect(suggestIntent({ executionDone: true, hasOpenInvoice: true, summary })).toBe(
      "payment_followup",
    );
  });

  it("valt terug op statusupdate", () => {
    expect(suggestIntent({ summary: { ...base, incomingCount: 0, lastCustomerContactAt: null, daysSinceCustomerContact: null } })).toBe(
      "status_update",
    );
  });
});

describe("emailComposerIntents – prompt", () => {
  const dossier = buildDossier(entries, { now });

  const promptInput = {
    contactFirstName: "Nancy",
    recipientName: "Nancy Scherp",
    recipientEmail: "nancy@example.nl",
    recipientType: "customer" as const,
    referenceNumber: "BV-2606-0004",
    portalUrl: "https://bureauvlieland.nl/mijn-programma/tok",
    projectContext: { project: { status: "active" } },
    dossier: dossier.entries,
    summary: dossier.summary,
  };

  it("dwingt formele toon, platte tekst en JSON-output af voor klanten", () => {
    const { system, user } = buildComposerPrompt({ intent: "ask_approval", ...promptInput });
    expect(system).toMatch(/u\/uw/);
    expect(system).toMatch(/Geen markdown/);
    expect(system).toMatch(/STRICT JSON/);
    expect(system).toContain("Beste Nancy,");
    expect(user).toMatch(/DOEL VAN DEZE MAIL/);
    expect(user).toMatch(/goed te keuren/);
    expect(user).toMatch(/BV-2606-0004/);
    expect(user).toMatch(/GESPREKSGESCHIEDENIS/);
    expect(user).toMatch(/Kan de boot later/);
  });

  it("gebruikt informele toon voor partners", () => {
    const { system } = buildComposerPrompt({
      ...promptInput,
      recipientType: "partner",
      intent: "status_update",
    });
    expect(system).toMatch(/je\/jouw/);
  });

  it("schakelt naar herschrijf-modus met de bestaande tekst", () => {
    const { user } = buildComposerPrompt({
      ...promptInput,
      intent: "status_update",
      currentBody: "Beste Nancy,\n\nEen eerste concept.",
      refineInstruction: "Korter",
    });
    expect(user).toMatch(/HERSCHRIJF-OPDRACHT/);
    expect(user).toMatch(/Korter/);
    expect(user).toMatch(/Een eerste concept/);
  });

  it("neemt de admin-instructie mee", () => {
    const { user } = buildComposerPrompt({
      ...promptInput,
      intent: "free",
      instruction: "noem dat we morgen bellen",
    });
    expect(user).toMatch(/INSTRUCTIE VAN DE ADMIN: noem dat we morgen bellen/);
  });

  it("verwijst naar de portal-placeholder in plaats van een verzonnen URL", () => {
    const { system, user } = buildComposerPrompt({ intent: "ask_approval", ...promptInput });
    expect(system).toMatch(/\{\{portal_url\}\}/);
    expect(user).toMatch(/\{\{portal_url\}\}/);
  });
});
