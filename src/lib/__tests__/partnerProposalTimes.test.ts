/**
 * Partner stelt een andere prijs voor maar laat de tijd staan.
 *
 * Regressie: de keuzelijst bood de gewenste tijd van de klant aan, maar de
 * controle bij verzenden wees diezelfde tijd af ("Op deze tijd staat al een
 * ander onderdeel") zodra hij volgens de planningsregels botste met een ander
 * onderdeel. Een partner kon daardoor de prijs niet aanpassen zonder de tijd
 * te wijzigen.
 */
import { describe, it, expect } from "vitest";
import { getBlockedTimeSlotsFromPartnerItems, isTimeSlotBlocked, type PartnerConflictItem } from "@/lib/timeUtils";
import { getAlwaysAllowedProposalTimes, isProposalTimeBlocked } from "@/lib/partnerProposalTimes";

// Dag uit de melding van Watertaxi Bazuin: overtocht 07:30, lunch op locatie 08:15.
const lunch: PartnerConflictItem = {
  id: "lunch",
  day_index: 0,
  block_name: "Lunch op locatie",
  confirmed_time: "08:15",
  proposed_time: null,
  preferred_time: null,
  duration: "1 uur",
  status: "confirmed",
};
const blocked = getBlockedTimeSlotsFromPartnerItems([lunch], 0, "watertaxi");

const watertaxi = {
  preferred_time: "07:30",
  proposed_time: null,
  confirmed_time: null,
  customer_counter_time: null,
  duration: "1,5 uur",
};

describe("isProposalTimeBlocked", () => {
  it("de gewenste tijd van de klant botst volgens de planningsregels met de lunch", () => {
    expect(isTimeSlotBlocked("07:30", watertaxi.duration, blocked)).toBe(true);
  });

  it("maar de partner mag die tijd toch voorstellen, bijvoorbeeld om alleen de prijs aan te passen", () => {
    expect(isProposalTimeBlocked("07:30", watertaxi, blocked)).toBe(false);
    expect(isProposalTimeBlocked("07:30:00", watertaxi, blocked)).toBe(false);
  });

  it("een andere botsende tijd blijft geweigerd", () => {
    expect(isProposalTimeBlocked("08:00", watertaxi, blocked)).toBe(true);
  });

  it("een vrije tijd blijft toegestaan", () => {
    expect(isProposalTimeBlocked("11:00", watertaxi, blocked)).toBe(false);
  });

  it("ook de tijd die de klant liever wil, de bevestigde tijd en het eigen voorstel zijn vrijgesteld", () => {
    const item = {
      preferred_time: "07:30:00",
      proposed_time: "08:00",
      confirmed_time: "08:30",
      customer_counter_time: "09:00",
      duration: "1 uur",
    };
    expect(getAlwaysAllowedProposalTimes(item)).toEqual(["09:00", "08:30", "08:00", "07:30"]);
    for (const t of ["07:30", "08:00", "08:30", "09:00"]) {
      expect(isProposalTimeBlocked(t, item, blocked)).toBe(false);
    }
  });

  it("flexibel en lege tijden tellen niet als vrijstelling", () => {
    expect(getAlwaysAllowedProposalTimes({ preferred_time: "flexibel", proposed_time: null, confirmed_time: "", customer_counter_time: null })).toEqual([]);
  });
});
