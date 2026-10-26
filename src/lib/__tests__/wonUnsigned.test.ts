import { describe, expect, it } from "vitest";
import { isWonUnsigned } from "@/lib/projectWorkflow";

describe("isWonUnsigned", () => {
  it("telt akkoord en facturatie zonder handtekening", () => {
    expect(isWonUnsigned({ programPipeline: "akkoord_ontvangen", termsAcceptedAt: null })).toBe(true);
    expect(isWonUnsigned({ programPipeline: "facturatie", termsAcceptedAt: null })).toBe(true);
  });

  it("laat getekende projecten en projecten zonder akkoord met rust", () => {
    expect(isWonUnsigned({ programPipeline: "akkoord_ontvangen", termsAcceptedAt: "2026-10-01T10:00:00Z" })).toBe(false);
    expect(isWonUnsigned({ programPipeline: "av_getekend", termsAcceptedAt: "2026-10-01T10:00:00Z" })).toBe(false);
    expect(isWonUnsigned({ programPipeline: "offerte_verstuurd", termsAcceptedAt: null })).toBe(false);
    expect(isWonUnsigned({ programPipeline: "concept", termsAcceptedAt: null })).toBe(false);
    expect(isWonUnsigned({ programPipeline: "geannuleerd", termsAcceptedAt: null })).toBe(false);
  });
});
