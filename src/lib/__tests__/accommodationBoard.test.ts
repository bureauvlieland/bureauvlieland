import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import {
  BOARD_UNKNOWN_LABEL,
  getBoardDisplay,
  getBoardLabel,
  validateBoardSelection,
} from "@/types/accommodation";

describe("getBoardDisplay", () => {
  it("geeft het label voor een bekende verzorging", () => {
    expect(getBoardDisplay("breakfast")).toEqual({
      label: "Logies & ontbijt",
      isKnown: true,
    });
  });

  it("valt terug op een expliciete 'nog niet bevestigd'-tekst", () => {
    for (const value of [null, undefined, ""]) {
      expect(getBoardDisplay(value as string | null)).toEqual({
        label: BOARD_UNKNOWN_LABEL,
        isKnown: false,
      });
    }
  });

  it("laat getBoardLabel leeg zodat helpers onderscheid kunnen maken", () => {
    expect(getBoardLabel(null)).toBeNull();
  });
});

describe("validateBoardSelection", () => {
  it("blokkeert een lege keuze", () => {
    expect(validateBoardSelection("", "")).toMatch(/Kies de verzorging/);
    expect(validateBoardSelection(null, null)).toMatch(/Kies de verzorging/);
  });

  it("blokkeert een onbekende waarde", () => {
    expect(validateBoardSelection("brunch", "")).toMatch(/geldige verzorging/);
  });

  it("eist een toelichting bij 'anders / in overleg'", () => {
    expect(validateBoardSelection("other", "   ")).toMatch(/toelichting/);
    expect(validateBoardSelection("other", "3-gangen diner dag 2")).toBeNull();
  });

  it("accepteert geldige waarden zonder toelichting", () => {
    for (const v of ["room_only", "breakfast", "half_board", "full_board", "all_inclusive"]) {
      expect(validateBoardSelection(v, "")).toBeNull();
    }
  });
});

describe("verzorging is nergens meer stil", () => {
  const read = (p: string) => fs.readFileSync(path.join(process.cwd(), p), "utf8");

  it("klantweergaven gebruiken de altijd-zichtbare helper", () => {
    for (const file of [
      "src/components/customer-portal/AccommodationSection.tsx",
      "src/components/customer-portal/AccommodationQuoteItem.tsx",
      "src/components/accommodation-portal/AccommodationQuoteCard.tsx",
      "src/components/accommodation-portal/AccommodationQuoteDetailSheet.tsx",
      "src/lib/stayOverviewPdf.ts",
    ]) {
      expect(read(file)).toContain("getBoardDisplay");
    }
  });

  it("partner-offerteformulier valideert de verzorging bij verzenden", () => {
    const src = read("src/components/partner-portal/PartnerAccommodationQuoteSheet.tsx");
    expect(src).toContain("validateBoardSelection(boardType, boardNotes)");
  });

  it("gekozen offertes zonder verzorging leveren een taak op die weer sluit", () => {
    expect(read("supabase/functions/check-pending-items/index.ts")).toContain(
      "lodging_board_missing",
    );
    expect(read("supabase/functions/reconcile-admin-todos/index.ts")).toContain(
      "lodging_board_missing",
    );
  });
});
