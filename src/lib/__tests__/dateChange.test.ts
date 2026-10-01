import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { describeDateChange, sameDates } from "../dateChange";

describe("describeDateChange", () => {
  it("koppelt dag-voor-dag bij een verschuiving van 4+5 naar 5+6 november", () => {
    expect(describeDateChange(["2026-11-04", "2026-11-05"], ["2026-11-05", "2026-11-06"])).toEqual([
      { index: 0, oldDate: "2026-11-04", newDate: "2026-11-05" },
      { index: 1, oldDate: "2026-11-05", newDate: "2026-11-06" },
    ]);
  });

  it("markeert extra en vervallen dagen", () => {
    const rows = describeDateChange(["2026-11-04"], ["2026-11-04", "2026-11-05"]);
    expect(rows[1]).toEqual({ index: 1, oldDate: null, newDate: "2026-11-05" });
    expect(describeDateChange(["2026-11-04", "2026-11-05"], ["2026-11-04"])[1].newDate).toBeNull();
  });
});

describe("sameDates", () => {
  it("negeert volgorde", () => {
    expect(sameDates(["2026-11-05", "2026-11-04"], ["2026-11-04", "2026-11-05"])).toBe(true);
  });
  it("detecteert verschil", () => {
    expect(sameDates(["2026-11-04"], ["2026-11-05"])).toBe(false);
    expect(sameDates(["2026-11-04"], ["2026-11-04", "2026-11-05"])).toBe(false);
  });
});

describe("notify-date-change — waarborgen", () => {
  const src = readFileSync("supabase/functions/notify-date-change/index.ts", "utf8");

  it("vereist een admin", () => {
    expect(src).toContain('.eq("role", "admin")');
  });
  it("mailt partners alleen na klantakkoord en na versturen naar partner", () => {
    expect(src).toContain("it.customer_approved_at || it.customer_accepted_at");
    expect(src).toContain("it.skip_partner_notification === false");
  });
  it("sluit bureau-items uit van partner-mail", () => {
    expect(src).toContain("isBureauItem(it)");
  });
  it("zet partnerbevestiging terug naar open aanvraag", () => {
    expect(src).toContain('upd.status = "pending"');
    expect(src).toContain("quoted_at: null");
  });
});

describe("klantwijziging → notify-date-change", () => {
  const fn = readFileSync("supabase/functions/notify-date-change/index.ts", "utf8");
  const customer = readFileSync("supabase/functions/update-customer-program/index.ts", "utf8");

  it("update-customer-program roept notify-date-change aan als klant", () => {
    expect(customer).toContain('"notify-date-change"');
    expect(customer).toContain('actor: "customer"');
  });
  it("service-aanroep mag nooit klantmail of akkoord-reset triggeren", () => {
    expect(fn).toContain('const send_customer = actor === "admin" && sendCustomerRequested');
    expect(fn).toContain('const reset_customer_approval = actor === "admin" && resetRequested');
    expect(fn).toContain('isServiceCall && requestedActor === "customer"');
  });
});
