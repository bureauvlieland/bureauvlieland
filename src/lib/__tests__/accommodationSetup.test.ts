import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
import {
  accommodationSetupChanged,
  accommodationSetupEmailLines,
  normalizeAccommodationSetup,
  summarizeBoard,
  summarizeRooms,
  validateAccommodationSetup,
} from "@/lib/accommodationSetup";
import { BOARD_PREFERENCE_OPTIONS, ROOM_OCCUPANCY_OPTIONS, ROOM_TYPES } from "@/types/accommodation";

describe("accommodationSetup — normalisatie", () => {
  it("maakt lege invoer null in plaats van 0 of leeg", () => {
    expect(normalizeAccommodationSetup({ room_count: 0, room_occupancy: "  " })).toEqual({
      room_count: null,
      room_occupancy: null,
      room_types: [],
      board_preference: null,
    });
  });

  it("filtert onbekende kamertypes en dedupliceert", () => {
    const out = normalizeAccommodationSetup({
      room_types: ["double", "double", "penthouse"],
    });
    expect(out.room_types).toEqual(["double"]);
  });

  it("rondt fractionele kamers af naar beneden", () => {
    expect(normalizeAccommodationSetup({ room_count: 3.7 }).room_count).toBe(3);
  });
});

describe("accommodationSetup — validatie", () => {
  it("blokkeert meer kamers dan gasten", () => {
    expect(validateAccommodationSetup({ room_count: 12 }, 8)).toMatch(/Meer kamers/);
  });

  it("blokkeert te weinig capaciteit voor het aantal gasten", () => {
    expect(validateAccommodationSetup({ room_count: 2, room_occupancy: "2" }, 10)).toMatch(
      /te weinig/,
    );
  });

  it("accepteert een passende configuratie", () => {
    expect(validateAccommodationSetup({ room_count: 5, room_occupancy: "2", board_preference: "breakfast" }, 10)).toBeNull();
  });

  it("negeert capaciteitsrekenen bij gemengde bezetting", () => {
    expect(validateAccommodationSetup({ room_count: 2, room_occupancy: "mixed" }, 10)).toBeNull();
  });

  it("weigert een onbekende verzorging", () => {
    expect(validateAccommodationSetup({ board_preference: "brunch" })).toMatch(/geldige verzorging/);
  });
});

describe("accommodationSetup — samenvatting en mailregels", () => {
  it("vat kamers en verzorging leesbaar samen", () => {
    const setup = {
      room_count: 3,
      room_occupancy: "2",
      room_types: ["double"],
      board_preference: "half_board",
    };
    expect(summarizeRooms(setup)).toContain("3 kamers");
    expect(summarizeBoard(setup)).toBe("Halfpension");
  });

  it("geeft null bij lege wensen zodat de UI het blok kan verbergen", () => {
    expect(summarizeRooms({})).toBeNull();
    expect(summarizeBoard({})).toBeNull();
    expect(accommodationSetupEmailLines({})).toEqual([]);
  });

  it("stuurt alleen gevulde regels naar de partner", () => {
    const lines = accommodationSetupEmailLines({ board_preference: "breakfast" });
    expect(lines).toHaveLength(1);
    expect(lines[0]).toContain("Gewenste verzorging");
  });

  it("detecteert wijzigingen ongeacht de volgorde van kamertypes", () => {
    expect(
      accommodationSetupChanged({ room_types: ["double", "suite"] }, { room_types: ["suite", "double"] }),
    ).toBe(false);
    expect(accommodationSetupChanged({ room_count: 2 }, { room_count: 3 })).toBe(true);
  });
});

describe("accommodationSetup — edge function spiegelt de front-end waarden", () => {
  // De edge function valideert serverside met eigen whitelists. Als de front-end
  // opties uitbreiden zonder de function bij te werken, verdwijnen wensen stil.
  const src = fs.readFileSync(
    path.resolve(process.cwd(), "supabase/functions/update-customer-program/index.ts"),
    "utf-8",
  );

  const listFromSource = (name: string): string[] => {
    const match = src.match(new RegExp(`const ${name} = \\[([^\\]]*)\\]`));
    if (!match) throw new Error(`${name} niet gevonden in edge function`);
    return match[1]
      .split(",")
      .map((v) => v.trim().replace(/^["']|["']$/g, ""))
      .filter(Boolean);
  };

  it("kent dezelfde bezettingsopties", () => {
    expect(listFromSource("allowedOccupancy").sort()).toEqual(
      ROOM_OCCUPANCY_OPTIONS.map((o) => o.value as string).sort(),
    );
  });

  it("kent dezelfde verzorgingsopties", () => {
    expect(listFromSource("allowedBoard").sort()).toEqual(
      BOARD_PREFERENCE_OPTIONS.map((o) => o.value as string).sort(),
    );
  });

  it("kent dezelfde kamertypes", () => {
    expect(listFromSource("allowedRoomTypes").sort()).toEqual(
      ROOM_TYPES.map((o) => o.value as string).sort(),
    );
  });
});
