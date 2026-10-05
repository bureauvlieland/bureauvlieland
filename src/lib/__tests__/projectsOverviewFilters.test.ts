import { describe, expect, it } from "vitest";
import { splitReferred } from "@/lib/projectsOverviewFilters";
import { referralsByRequest } from "@/lib/getProjectsOverview";

const referral = { partnerName: "Paal 50", status: "referred" };
const rows = [
  { id: "a", referral: null },
  { id: "b", referral },
  { id: "c" },
];

describe("splitReferred", () => {
  it("laat doorverwezen projecten standaard weg", () => {
    const r = splitReferred(rows, false);
    expect(r.visible.map(x => x.id)).toEqual(["a", "c"]);
    expect(r.referredCount).toBe(1);
  });

  it("toont met het filter alleen de doorverwezen projecten", () => {
    expect(splitReferred(rows, true).visible.map(x => x.id)).toEqual(["b"]);
  });
});

describe("referralsByRequest", () => {
  const partners = [{ id: "paal-50", name: "Paal 50" }, { id: "strandhotel-seeduyn", name: "WestCord Strandhotel Seeduyn" }];

  it("koppelt per aanvraag de nieuwste doorverwijzing aan de partnernaam", () => {
    const map = referralsByRequest(
      [
        { request_id: "r1", partner_id: "paal-50", status: "booked" },
        { request_id: "r1", partner_id: "strandhotel-seeduyn", status: "expired" },
        { request_id: null, partner_id: "paal-50", status: "referred" },
      ],
      partners,
    );
    expect(map.size).toBe(1);
    expect(map.get("r1")).toEqual({ partnerName: "Paal 50", status: "booked" });
  });

  it("valt terug op 'partner' als de partner niet gevonden is, en kan tegen lege data", () => {
    expect(referralsByRequest([{ request_id: "r2", partner_id: "weg", status: "referred" }], partners).get("r2")?.partnerName).toBe("partner");
    expect(referralsByRequest(null, null).size).toBe(0);
  });
});
