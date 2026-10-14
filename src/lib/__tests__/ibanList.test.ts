import { describe, expect, it } from "vitest";
import { invalidIbans, parseIbanList } from "@/lib/ibanList";

describe("parseIbanList", () => {
  it("één per regel of met komma's, genormaliseerd en zonder dubbelen", () => {
    expect(parseIbanList("nl91 abna 0417 1643 00\nNL39RABO0300065264, NL91ABNA0417164300\n\n")).toEqual([
      "NL91ABNA0417164300",
      "NL39RABO0300065264",
    ]);
    expect(parseIbanList("")).toEqual([]);
  });
});

describe("invalidIbans", () => {
  it("wijst invoer aan die niet op een IBAN lijkt", () => {
    expect(invalidIbans(["NL91ABNA0417164300", "DOEKSEN", "NL12"])).toEqual(["DOEKSEN", "NL12"]);
  });
});
