import { describe, it, expect } from "vitest";
import {
  isProjectItemClosable,
  selectClosableProjectItems,
  canPartnerCloseProject,
} from "../partnerProjectDismiss";

const item = (over: Partial<Parameters<typeof isProjectItemClosable>[0]> = {}) => ({
  id: "i1",
  status: "executed",
  invoiced_number: null,
  partner_dismissed_at: null,
  ...over,
});

describe("partnerProjectDismiss", () => {
  it("sluit uitgevoerde en bevestigde onderdelen zonder factuur", () => {
    expect(isProjectItemClosable(item({ status: "executed" }))).toBe(true);
    expect(isProjectItemClosable(item({ status: "confirmed" }))).toBe(true);
    expect(isProjectItemClosable(item({ status: "accepted" }))).toBe(true);
  });

  it("laat onderdelen met openstaande actie met rust", () => {
    expect(isProjectItemClosable(item({ status: "pending" }))).toBe(false);
    expect(isProjectItemClosable(item({ status: "counter_proposed" }))).toBe(false);
    expect(isProjectItemClosable(item({ status: "alternative" }))).toBe(false);
  });

  it("slaat reeds gefactureerde of gesloten onderdelen over", () => {
    expect(isProjectItemClosable(item({ invoiced_number: "F-1" }))).toBe(false);
    expect(isProjectItemClosable(item({ partner_dismissed_at: "2026-07-31" }))).toBe(false);
  });

  it("selecteert alleen sluitbare onderdelen", () => {
    const items = [
      item({ id: "a", status: "executed" }),
      item({ id: "b", status: "pending" }),
      item({ id: "c", status: "confirmed", invoiced_number: "F-2" }),
    ];
    expect(selectClosableProjectItems(items).map((i) => i.id)).toEqual(["a"]);
  });

  it("staat project sluiten toe zonder openstaande acties", () => {
    expect(
      canPartnerCloseProject([
        item({ id: "a", status: "executed" }),
        item({ id: "b", status: "confirmed" }),
      ]),
    ).toBe(true);
  });

  it("blokkeert project sluiten bij een openstaande aanvraag", () => {
    expect(
      canPartnerCloseProject([
        item({ id: "a", status: "executed" }),
        item({ id: "b", status: "pending" }),
      ]),
    ).toBe(false);
  });

  it("blokkeert project sluiten als alles al gesloten of gefactureerd is", () => {
    expect(canPartnerCloseProject([item({ partner_dismissed_at: "2026-07-31" })])).toBe(false);
    expect(canPartnerCloseProject([item({ invoiced_number: "F-9" })])).toBe(false);
    expect(canPartnerCloseProject([])).toBe(false);
  });
});
