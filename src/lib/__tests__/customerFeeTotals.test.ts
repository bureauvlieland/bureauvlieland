import { describe, it, expect } from "vitest";
import { computeAutomaticFees } from "@/lib/customerFeeTotals";

const settings = {
  tourist_tax_pp_per_day: 2.58,
  nature_contribution_pp: 1.0,
  bureau_central_surcharge_pp: 1.5,
};

const base = {
  numberOfPeople: 27,
  numberOfDays: 1,
  isBureauCentral: true,
  coordinationFeeForPeople: 250,
  settings,
};

describe("computeAutomaticFees", () => {
  it("rekent alle posten zonder uitsluitingen", () => {
    const fees = computeAutomaticFees({ ...base, excludedFees: [] });
    expect(fees.touristTax).toBeCloseTo(69.66, 2);
    expect(fees.natureContribution).toBeCloseTo(27, 2);
    expect(fees.coordinationFee).toBe(250);
    expect(fees.centralSurcharge).toBeCloseTo(40.5, 2);
    expect(fees.zeroVatFeeTotal).toBeCloseTo(96.66, 2);
    expect(fees.standardVatFeeTotal).toBeCloseTo(290.5, 2);
    expect(fees.totalInclVat).toBeCloseTo(387.16, 2);
    expect(fees.showTouristTax).toBe(true);
    expect(fees.showNatureContribution).toBe(true);
    expect(fees.showCoordinationFee).toBe(true);
  });

  it("gedraagt zich identiek bij null/undefined uitsluitingen", () => {
    const a = computeAutomaticFees({ ...base, excludedFees: [] });
    expect(computeAutomaticFees({ ...base, excludedFees: null })).toEqual(a);
    expect(computeAutomaticFees({ ...base })).toEqual(a);
  });

  it("sluit toeristenbelasting uit", () => {
    const fees = computeAutomaticFees({ ...base, excludedFees: ["tourist_tax"] });
    expect(fees.touristTax).toBe(0);
    expect(fees.showTouristTax).toBe(false);
    expect(fees.zeroVatFeeTotal).toBeCloseTo(27, 2);
    expect(fees.totalInclVat).toBeCloseTo(317.5, 2);
  });

  it("sluit natuurbijdrage uit", () => {
    const fees = computeAutomaticFees({ ...base, excludedFees: ["nature_contribution"] });
    expect(fees.natureContribution).toBe(0);
    expect(fees.showNatureContribution).toBe(false);
    expect(fees.zeroVatFeeTotal).toBeCloseTo(69.66, 2);
  });

  it("sluit coördinatiefee uit", () => {
    const fees = computeAutomaticFees({ ...base, excludedFees: ["coordination_fee"] });
    expect(fees.coordinationFee).toBe(0);
    expect(fees.showCoordinationFee).toBe(false);
    expect(fees.standardVatFeeTotal).toBeCloseTo(40.5, 2);
  });

  it("sluit opslag centrale facturatie uit", () => {
    const fees = computeAutomaticFees({ ...base, excludedFees: ["central_surcharge"] });
    expect(fees.centralSurcharge).toBe(0);
    expect(fees.standardVatFeeTotal).toBe(250);
  });

  it("rekent geen opslag bij niet-centrale facturatie", () => {
    const fees = computeAutomaticFees({ ...base, isBureauCentral: false, excludedFees: [] });
    expect(fees.centralSurcharge).toBe(0);
  });

  it("zet alles op nul als alle vier posten zijn uitgesloten (BV-2608-0001)", () => {
    const fees = computeAutomaticFees({
      ...base,
      excludedFees: ["tourist_tax", "coordination_fee", "nature_contribution", "central_surcharge"],
    });
    expect(fees.totalInclVat).toBe(0);
    expect(fees.zeroVatFeeTotal).toBe(0);
    expect(fees.standardVatFeeTotal).toBe(0);
    expect(fees.showTouristTax).toBe(false);
    expect(fees.showNatureContribution).toBe(false);
    expect(fees.showCoordinationFee).toBe(false);
  });

  it("schaalt toeristenbelasting per dag", () => {
    const fees = computeAutomaticFees({ ...base, numberOfDays: 3, excludedFees: [] });
    expect(fees.touristTax).toBeCloseTo(2.58 * 27 * 3, 2);
    expect(fees.natureContribution).toBeCloseTo(27, 2);
  });

  it("negeert onbekende sleutels in de uitsluitingslijst", () => {
    const fees = computeAutomaticFees({ ...base, excludedFees: ["onzin_fee"] });
    expect(fees.totalInclVat).toBeCloseTo(387.16, 2);
  });
});
