import { describe, expect, it } from "vitest";
import {
  changeFieldFromChangeLog,
  changeFieldFromHistoryAction,
  changesSinceResponse,
  describePartnerItemChange,
  describePreviousResponse,
  partnerRespondedAt,
} from "@/lib/partnerItemChanges";

const euro = (n: number) => `€ ${n.toFixed(2).replace(".", ",")}`;

describe("partnerItemChanges", () => {
  it("vertaalt historie-acties en change-log velden", () => {
    expect(changeFieldFromHistoryAction("time_changed")).toBe("time");
    expect(changeFieldFromHistoryAction("customer_accepted")).toBeNull();
    expect(changeFieldFromChangeLog("day")).toBe("day");
    expect(changeFieldFromChangeLog("invoicing")).toBeNull();
  });

  it("beschrijft een tijd- en dagwijziging van de klant", () => {
    expect(
      describePartnerItemChange({ field: "time", old_value: { value: "14:45:00" }, new_value: { value: "16:00" }, changed_at: "2026-11-01", actor: "customer" }),
    ).toBe("Tijd: 14:45 → 16:00");
    expect(
      describePartnerItemChange({ field: "day", old_value: { value: "Dag 1" }, new_value: { value: "Dag 2" }, changed_at: "2026-11-01", actor: "customer" }),
    ).toBe("Dag: dag 1 → dag 2");
  });

  it("beschrijft bureau-wijzigingen uit de change log (ruwe waarden)", () => {
    expect(describePartnerItemChange({ field: "day", old_value: 0, new_value: 1, changed_at: "x", actor: "bureau" })).toBe("Dag: dag 1 → dag 2");
    expect(describePartnerItemChange({ field: "time", old_value: null, new_value: "10:00", changed_at: "x", actor: "bureau" })).toBe("Tijd: flexibel → 10:00");
    expect(describePartnerItemChange({ field: "people", old_value: 15, new_value: 12, changed_at: "x", actor: "bureau" })).toBe("Aantal personen: 15 pers. → 12 pers.");
  });

  it("beschrijft een datumwijziging van het hele programma", () => {
    expect(
      describePartnerItemChange({ field: "dates", old_value: { dates: ["2026-11-20"] }, new_value: { dates: ["2026-11-27"] }, changed_at: "x", actor: "customer" }),
    ).toBe("Data van het programma: 2026-11-20 → 2026-11-27");
  });

  it("vat het eerdere voorstel samen", () => {
    expect(
      describePreviousResponse({ status: "pending", proposed_time: "14:45:00", confirmed_time: null, quoted_price: 750, status_updated_at: null, quoted_at: null }, euro),
    ).toBe("Uw eerdere voorstel: 14:45, € 750,00");
    expect(describePreviousResponse({ status: "pending", proposed_time: null, confirmed_time: null, quoted_price: null, status_updated_at: null, quoted_at: null }, euro)).toBeNull();
  });

  it("houdt alleen wijzigingen van ná de reactie over, nieuwste eerst", () => {
    const respondedAt = partnerRespondedAt({ status_updated_at: "2026-11-01T10:00:00Z", quoted_at: "2026-11-01T09:00:00Z" });
    expect(respondedAt).toBe("2026-11-01T10:00:00Z");
    const list = changesSinceResponse(
      [
        { field: "time", old_value: "a", new_value: "b", changed_at: "2026-10-31T10:00:00Z", actor: "customer" },
        { field: "day", old_value: "a", new_value: "b", changed_at: "2026-11-02T10:00:00Z", actor: "customer" },
        { field: "people", old_value: "a", new_value: "b", changed_at: "2026-11-03T10:00:00Z", actor: "bureau" },
      ],
      respondedAt,
    );
    expect(list.map((c) => c.field)).toEqual(["people", "day"]);
    expect(changesSinceResponse(list, null)).toEqual([]);
  });
});
