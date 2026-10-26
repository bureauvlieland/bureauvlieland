import { describe, it, expect } from "vitest";
import {
  buildTimeline,
  bundleRecipients,
  bundleSummary,
  focusItemId,
  oldestUnansweredDate,
  senderRole,
  isPartnerEmailType,
  type TimelineItem,
} from "../emailThreadTimeline";

const t = (minutes: number) => new Date(Date.UTC(2026, 9, 22, 14, minutes)).toISOString();

const auto = (id: string, minutes: number, type = "program_request_partner", name = `Partner ${id}`): TimelineItem => ({
  id,
  origin: "automatic",
  date: t(minutes),
  email_type: type,
  contact_name: name,
});
const inbound = (id: string, minutes: number, answered: string | null = null): TimelineItem => ({
  id,
  origin: "inbound",
  date: t(minutes),
  contact_name: "Klant",
  answered_at: answered,
});
const manual = (id: string, minutes: number): TimelineItem => ({ id, origin: "manual", date: t(minutes) });

describe("buildTimeline", () => {
  it("maakt een kaart van elk bericht en een regel van een losse automatische mail", () => {
    const tl = buildTimeline([auto("a", 0), inbound("b", 5), manual("c", 10)]);
    expect(tl.map((e) => e.kind)).toEqual(["event", "message", "message"]);
  });

  it("bundelt opeenvolgende automatische mails van hetzelfde type binnen tien minuten", () => {
    const tl = buildTimeline([auto("a", 0), auto("b", 1), auto("c", 2), inbound("d", 30)]);
    expect(tl).toHaveLength(2);
    expect(tl[0].kind).toBe("bundle");
    if (tl[0].kind === "bundle") {
      expect(tl[0].items.map((i) => i.id)).toEqual(["a", "b", "c"]);
      expect(tl[0].emailType).toBe("program_request_partner");
      expect(tl[0].date).toBe(t(0));
    }
  });

  it("breekt een bundel bij een ander type of een te groot gat", () => {
    const tl = buildTimeline([
      auto("a", 0),
      auto("b", 1, "quote_offer_customer"),
      auto("c", 2),
      auto("d", 20),
    ]);
    expect(tl.map((e) => e.kind)).toEqual(["event", "event", "event", "event"]);
  });

  it("meet het gat ten opzichte van de laatste mail in de bundel, niet de eerste", () => {
    const tl = buildTimeline([auto("a", 0), auto("b", 8), auto("c", 16)]);
    expect(tl).toHaveLength(1);
    expect(tl[0].kind).toBe("bundle");
  });

  it("onderbreekt een bundel door een bericht van een mens", () => {
    const tl = buildTimeline([auto("a", 0), inbound("x", 1), auto("b", 2)]);
    expect(tl.map((e) => e.kind)).toEqual(["event", "message", "event"]);
  });

  it("geeft een lege tijdlijn voor een leeg gesprek", () => {
    expect(buildTimeline([])).toEqual([]);
  });
});

describe("bundleRecipients en bundleSummary", () => {
  it("telt elke ontvanger één keer, in volgorde", () => {
    const items = [
      auto("a", 0, undefined, "Zuiver Traiteur"),
      auto("b", 0, undefined, "Zuiver Traiteur"),
      auto("c", 0, undefined, "Brouwerij Fortuna"),
    ];
    expect(bundleRecipients(items)).toEqual(["Zuiver Traiteur", "Brouwerij Fortuna"]);
    expect(bundleSummary(items)).toBe("3 mails naar Zuiver Traiteur, Brouwerij Fortuna");
  });

  it("kort een lange lijst af", () => {
    const items = ["A", "B", "C", "D", "E"].map((n, i) => auto(String(i), 0, undefined, n));
    expect(bundleSummary(items)).toBe("5 mails naar A, B, C en 2 anderen");
    expect(bundleSummary(items.slice(0, 4))).toBe("4 mails naar A, B, C en 1 ander");
  });

  it("valt terug op het e-mailadres als er geen naam is", () => {
    const items: TimelineItem[] = [
      { id: "a", origin: "automatic", date: t(0), contact_email: "x@y.nl" },
      { id: "b", origin: "automatic", date: t(0), contact_email: "X@Y.nl" },
    ];
    expect(bundleSummary(items)).toBe("2 mails naar x@y.nl");
  });
});

describe("focusItemId", () => {
  it("kiest het eerste onbeantwoorde inkomende bericht", () => {
    const items = [auto("a", 0), inbound("b", 1, t(2)), inbound("c", 3), inbound("d", 4)];
    expect(focusItemId(items)).toBe("c");
  });

  it("kiest anders het laatste bericht van een mens", () => {
    expect(focusItemId([inbound("a", 0, t(1)), manual("b", 2), auto("c", 3)])).toBe("b");
  });

  it("kiest anders het laatste item", () => {
    expect(focusItemId([auto("a", 0), auto("b", 1)])).toBe("b");
    expect(focusItemId([])).toBeNull();
  });

  it("slaat gearchiveerde berichten over", () => {
    const items: TimelineItem[] = [{ ...inbound("a", 0), archived_at: t(1) }, inbound("b", 2)];
    expect(focusItemId(items)).toBe("b");
  });
});

describe("oldestUnansweredDate", () => {
  it("geeft de datum van het oudste open bericht", () => {
    expect(oldestUnansweredDate([inbound("a", 0, t(1)), inbound("b", 5), inbound("c", 9)])).toBe(t(5));
  });
  it("geeft null als alles beantwoord is", () => {
    expect(oldestUnansweredDate([inbound("a", 0, t(1)), auto("b", 2)])).toBeNull();
  });
});

describe("senderRole", () => {
  const partners = new Set(["info@brouwerij.nl"]);
  it("herkent de klant op het dossieradres, ongeacht hoofdletters", () => {
    expect(senderRole("Richard@Example.nl", "richard@example.nl", partners)).toBe("klant");
  });
  it("herkent een partner op eerdere partnermail", () => {
    expect(senderRole("info@brouwerij.nl", "richard@example.nl", partners)).toBe("partner");
  });
  it("geeft null voor onbekende adressen", () => {
    expect(senderRole("x@y.nl", "richard@example.nl", partners)).toBeNull();
    expect(senderRole(null, "richard@example.nl", partners)).toBeNull();
  });
});

describe("isPartnerEmailType", () => {
  it("herkent partnermails en sluit klant- en bureaumails uit", () => {
    expect(isPartnerEmailType("program_request_partner")).toBe(true);
    expect(isPartnerEmailType("partner_invoice_reminder_t7")).toBe(true);
    expect(isPartnerEmailType("partner_customer_message")).toBe(false);
    expect(isPartnerEmailType("partner_invoice_registered_bureau")).toBe(false);
    expect(isPartnerEmailType("quote_offer_customer")).toBe(false);
    expect(isPartnerEmailType(null)).toBe(false);
  });
});
