import { describe, expect, it } from "vitest";
import { summarizeWerkbank, werkbankHeadline, type WerkbankRow } from "../partnerWerkbank";

const row = (bucket: WerkbankRow["bucket"]): WerkbankRow => ({
  id: bucket,
  bucket,
  href: "/partner/project/x",
  reference: null,
  customerLabel: "Klant",
  date: null,
  itemLabel: "Onderdeel",
  hint: "",
});

describe("werkbankHeadline", () => {
  it("zegt niets als er niets te doen is", () => {
    expect(werkbankHeadline(summarizeWerkbank([]))).toBeNull();
  });
  it("zet beoordelen voorop, in de u-vorm en met het juiste aantal", () => {
    const h = werkbankHeadline(summarizeWerkbank([row("review"), row("review"), row("invoice")]));
    expect(h?.tone).toBe("warning");
    expect(h?.title).toBe("2 aanvragen wachten op uw reactie");
  });
  it("factureren is informatief, geen alarm", () => {
    const h = werkbankHeadline(summarizeWerkbank([row("invoice")]));
    expect(h).toMatchObject({ tone: "info", title: "1 onderdeel kan gefactureerd worden" });
  });
});
