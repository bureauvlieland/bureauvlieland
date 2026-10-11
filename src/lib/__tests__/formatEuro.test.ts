import { describe, expect, it } from "vitest";
import { formatEuro, formatEuroRounded } from "../formatEuro";

// Intl zet een vaste (smalle) spatie tussen het euroteken en het getal; voor de
// vergelijking maken we er een gewone spatie van.
const plain = (s: string) => s.replace(/[  ]/g, " ");

describe("formatEuro", () => {
  it("schrijft bedragen op zijn Nederlands met twee decimalen", () => {
    expect(plain(formatEuro(12.5))).toBe("€ 12,50");
    expect(plain(formatEuro(1234.567))).toBe("€ 1.234,57");
    expect(plain(formatEuro(0))).toBe("€ 0,00");
  });
  it("toont een streepje als het bedrag ontbreekt", () => {
    expect(formatEuro(null)).toBe("–");
    expect(formatEuro(undefined)).toBe("–");
    expect(formatEuro(Number.NaN)).toBe("–");
  });
  it("rondt af voor jaarcijfers", () => {
    expect(plain(formatEuroRounded(12345.6))).toBe("€ 12.346");
  });
});
