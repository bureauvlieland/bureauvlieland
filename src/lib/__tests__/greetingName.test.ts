import { describe, expect, it } from "vitest";
import { greetingName } from "@/lib/greetingName";

describe("greetingName", () => {
  it("haalt een meegetypte aanhef weg", () => {
    expect(greetingName("Mevrouw. M. Swagerman")).toBe("M. Swagerman");
    expect(greetingName("Dhr. Jansen")).toBe("Jansen");
    expect(greetingName("de heer P. de Vries")).toBe("P. de Vries");
    expect(greetingName("Mw Pietersen")).toBe("Pietersen");
  });

  it("laat een gewone naam met rust", () => {
    expect(greetingName("Marieke Swagerman")).toBe("Marieke Swagerman");
    expect(greetingName("Mevrouwtje de Wit")).toBe("Mevrouwtje de Wit");
    expect(greetingName("Heerema B.V.")).toBe("Heerema B.V.");
  });

  it("geeft leeg terug zonder bruikbare naam", () => {
    expect(greetingName("")).toBe("");
    expect(greetingName(null)).toBe("");
    expect(greetingName("Mevrouw")).toBe("");
    expect(greetingName("   ")).toBe("");
  });
});
