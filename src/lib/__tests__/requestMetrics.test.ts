import { describe, expect, it } from "vitest";
import {
  countByFormSource,
  formSourceFor,
  isSignedBeforeFirstDay,
  isWon,
  median,
  metricsByOrigin,
  signingSummary,
  type RequestMetricRow,
} from "@/lib/requestMetrics";

const row = (o: Partial<RequestMetricRow>): RequestMetricRow => ({ origin: "self_service", status: "active", ...o });

describe("isWon en tekenen vooraf", () => {
  it("telt akkoord, uitgevoerd of gefactureerd als gewonnen, maar alleen actief", () => {
    expect(isWon(row({ quote_status: "akkoord_ontvangen" }))).toBe(true);
    expect(isWon(row({ completed_at: "2026-07-01" }))).toBe(true);
    expect(isWon(row({ invoice_spec_total_incl_vat: 1200 }))).toBe(true);
    expect(isWon(row({ quote_status: "offerte_verstuurd" }))).toBe(false);
    expect(isWon(row({ status: "cancelled", quote_status: "akkoord_ontvangen" }))).toBe(false);
  });

  it("getekend vóór of op de eerste dag telt als vooraf", () => {
    expect(isSignedBeforeFirstDay(row({ terms_accepted_at: "2026-05-04T10:00:00Z", selected_dates: ["2026-06-18"] }))).toBe(true);
    expect(isSignedBeforeFirstDay(row({ terms_accepted_at: "2026-09-15T10:00:00Z", selected_dates: ["2026-09-15"] }))).toBe(true);
    expect(isSignedBeforeFirstDay(row({ terms_accepted_at: "2026-10-02T10:00:00Z", selected_dates: ["2026-09-15"] }))).toBe(false);
    expect(isSignedBeforeFirstDay(row({ terms_accepted_at: null, selected_dates: ["2026-09-15"] }))).toBe(false);
  });
});

describe("metricsByOrigin", () => {
  const rows: RequestMetricRow[] = [
    row({ origin: "self_service", status: "cancelled", number_of_people: 8 }),
    row({ origin: "self_service", quote_status: "akkoord_ontvangen", terms_accepted_at: "2026-06-01", selected_dates: ["2026-06-20"], invoice_spec_total_incl_vat: 2461.4, number_of_people: 32 }),
    row({ origin: "self_service", number_of_people: 10 }),
    row({ origin: "maatwerk_zakelijk", completed_at: "2026-07-24", terms_accepted_at: "2026-09-03", selected_dates: ["2026-08-25"], invoice_spec_total_incl_vat: 3086, number_of_people: 12 }),
    row({ origin: "maatwerk_zakelijk", status: "deleted", number_of_people: 99 }),
  ];

  it("telt per herkomst, zonder verwijderde, gesorteerd op aantal", () => {
    const m = metricsByOrigin(rows);
    expect(m.map((x) => x.origin)).toEqual(["self_service", "maatwerk_zakelijk"]);
    expect(m[0]).toMatchObject({ requests: 3, cancelled: 1, won: 1, signed: 1, signedBeforeEvent: 1, revenue: 2461, medianPeople: 10 });
    expect(m[1]).toMatchObject({ requests: 1, won: 1, signed: 1, signedBeforeEvent: 0, revenue: 3086, medianPeople: 12, label: "Aanvraagformulier, zakelijk" });
  });

  it("vat de ondertekening van gewonnen projecten samen", () => {
    expect(signingSummary(rows)).toEqual({ won: 2, signedBeforeEvent: 1, signedAfterEvent: 1, unsigned: 0 });
  });

  it("median: oneven, even en leeg", () => {
    expect(median([3, 1, 2])).toBe(2);
    expect(median([1, 2, 3, 10])).toBe(3);
    expect(median([])).toBeNull();
  });
});

describe("formSourceFor en countByFormSource", () => {
  it("een voorbeeld of vinkje in de URL gaat vóór de instappagina", () => {
    expect(formSourceFor({ templateSlug: "eilanddag", entryPath: "/" })).toBe("voorbeeldprogramma");
    expect(formSourceFor({ needsParam: "eten,overnachting", entryPath: "/" })).toBe("vinkje:eten");
    expect(formSourceFor({ eventTypeParam: "heisessie", entryPath: "/" })).toBe("soort");
  });

  it("herkent homepage, landingspagina's, het formulier zelf en de rest", () => {
    expect(formSourceFor({ entryPath: "/" })).toBe("homepage");
    expect(formSourceFor({ entryPath: "/heisessie-vlieland" })).toBe("landingspagina:heisessie-vlieland");
    expect(formSourceFor({ entryPath: "/bedrijfsuitje-vlieland-2?utm=x" })).toBe("landingspagina:bedrijfsuitje-vlieland-2");
    expect(formSourceFor({ entryPath: "/programma-op-maat" })).toBe("formulier-direct");
    expect(formSourceFor({ entryPath: "/catering" })).toBe("overig:catering");
    expect(formSourceFor({ entryPath: "direct" })).toBe("direct");
    expect(formSourceFor({})).toBe("direct");
  });

  it("telt bronnen uit attribution", () => {
    const rows = [
      row({ attribution: { form_source: "homepage" } }),
      row({ attribution: { form_source: "homepage" } }),
      row({ attribution: { form_source: "voorbeeldprogramma" } }),
      row({ attribution: {} }),
    ];
    expect(countByFormSource(rows)).toEqual([["homepage", 2], ["voorbeeldprogramma", 1]]);
  });
});
