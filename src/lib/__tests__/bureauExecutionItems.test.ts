import { describe, it, expect } from "vitest";
import {
  isBureauExecutionItem,
  getBureauExecutionStatus,
} from "@/lib/bureauExecutionItems";

describe("isBureauExecutionItem", () => {
  it("is true voor bureau-items die geen ticket zijn", () => {
    expect(
      isBureauExecutionItem({ provider_id: "bureau", block_id: "vuurtoren-bezoek" }),
    ).toBe(true);
    expect(
      isBureauExecutionItem({ provider_id: "bureau", block_id: "begeleide-fietstocht" }),
    ).toBe(true);
  });

  it("is false voor ferry/bike tickets ook al is provider bureau", () => {
    expect(
      isBureauExecutionItem({ provider_id: "bureau", block_id: "boot-retour" }),
    ).toBe(false);
    expect(
      isBureauExecutionItem({ provider_id: "bureau", block_id: "fiets-huur" }),
    ).toBe(false);
  });

  it("is false voor partner-items", () => {
    expect(
      isBureauExecutionItem({ provider_id: "some-partner-uuid", block_id: "zeehondentocht" }),
    ).toBe(false);
  });

  it("is false als provider_id ontbreekt", () => {
    expect(
      isBureauExecutionItem({ provider_id: null, block_id: "vuurtoren" }),
    ).toBe(false);
  });
});

describe("getBureauExecutionStatus", () => {
  it("is 'arranged' als bureau_arranged_at gezet is", () => {
    expect(
      getBureauExecutionStatus({ bureau_arranged_at: "2026-06-24T10:00:00Z" }),
    ).toBe("arranged");
  });

  it("is 'open' zonder bureau_arranged_at", () => {
    expect(getBureauExecutionStatus({ bureau_arranged_at: null })).toBe("open");
    expect(getBureauExecutionStatus({ bureau_arranged_at: undefined as never })).toBe("open");
  });
});
