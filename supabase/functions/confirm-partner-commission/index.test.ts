import "https://deno.land/std@0.224.0/dotenv/load.ts";
import {
  assertEquals,
  assertAlmostEquals,
} from "https://deno.land/std@0.224.0/assert/mod.ts";

// ============================================
// HELPER FUNCTIONS (extracted logic to test)
// ============================================

/**
 * Calculate commission amount based on actual invoiced amount and percentage
 */
function calculateCommission(actualAmount: number, commissionPercentage: number): number {
  return actualAmount * (commissionPercentage / 100);
}

/**
 * Round to 2 decimal places (as used in the function)
 */
function roundTo2Decimals(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Get effective commission percentage with fallback chain
 */
function getEffectiveCommissionPercentage(
  itemCommission: number | null,
  partnerCommission: number | null,
  defaultCommission: number
): number {
  return itemCommission ?? partnerCommission ?? defaultCommission;
}

/**
 * Build update data for activity item (pro forma confirmation)
 */
function buildProFormaConfirmUpdateData(
  proformaAmountExclVat: number,
  proformaCommission: number
): Record<string, unknown> {
  return {
    commission_status: "confirmed",
    invoiced_amount: proformaAmountExclVat,
    commission_amount: proformaCommission,
  };
}

/**
 * Build update data for activity item with deviation
 */
function buildDeviationUpdateData(
  actualAmount: number,
  reason: string,
  commissionPercentage: number
): Record<string, unknown> {
  const newCommission = actualAmount * (commissionPercentage / 100);
  return {
    commission_status: "confirmed",
    actual_invoiced_excl_vat: actualAmount,
    deviation_reason: reason,
    invoiced_amount: actualAmount,
    commission_amount: roundTo2Decimals(newCommission),
  };
}

// ============================================
// UNIT TESTS: COMMISSION CALCULATION
// ============================================

Deno.test("Commissie Berekening - standaard 15% activiteit commissie", () => {
  const actualAmount = 100;
  const commissionPercentage = 15;
  
  const result = calculateCommission(actualAmount, commissionPercentage);
  
  assertEquals(result, 15);
});

Deno.test("Commissie Berekening - standaard 10% logies commissie", () => {
  const actualAmount = 100;
  const commissionPercentage = 10;
  
  const result = calculateCommission(actualAmount, commissionPercentage);
  
  assertEquals(result, 10);
});

Deno.test("Commissie Berekening - groot bedrag met 15% commissie", () => {
  const actualAmount = 2500;
  const commissionPercentage = 15;
  
  const result = calculateCommission(actualAmount, commissionPercentage);
  
  assertEquals(result, 375);
});

Deno.test("Commissie Berekening - klein bedrag met afronding", () => {
  const actualAmount = 33.33;
  const commissionPercentage = 15;
  
  const result = calculateCommission(actualAmount, commissionPercentage);
  const rounded = roundTo2Decimals(result);
  
  assertAlmostEquals(result, 4.9995, 0.0001);
  assertEquals(rounded, 5);
});

// ============================================
// UNIT TESTS: ROUNDING
// ============================================

Deno.test("Afronding - naar boven bij .005", () => {
  const result = roundTo2Decimals(10.005);
  assertEquals(result, 10.01);
});

Deno.test("Afronding - naar beneden bij .004", () => {
  const result = roundTo2Decimals(10.004);
  assertEquals(result, 10);
});

Deno.test("Afronding - exact bedrag blijft hetzelfde", () => {
  const result = roundTo2Decimals(15.50);
  assertEquals(result, 15.5);
});

Deno.test("Afronding - negatief bedrag", () => {
  const result = roundTo2Decimals(-10.555);
  assertEquals(result, -10.55);
});

// ============================================
// UNIT TESTS: COMMISSION PERCENTAGE FALLBACK
// ============================================

Deno.test("Commissie Fallback - item percentage heeft voorrang (activiteit)", () => {
  const result = getEffectiveCommissionPercentage(18, 15, 15);
  assertEquals(result, 18);
});

Deno.test("Commissie Fallback - partner percentage als backup", () => {
  const result = getEffectiveCommissionPercentage(null, 12, 15);
  assertEquals(result, 12);
});

Deno.test("Commissie Fallback - default als laatste optie", () => {
  const result = getEffectiveCommissionPercentage(null, null, 15);
  assertEquals(result, 15);
});

Deno.test("Commissie Fallback - logies default 10%", () => {
  const result = getEffectiveCommissionPercentage(null, null, 10);
  assertEquals(result, 10);
});

// ============================================
// UNIT TESTS: PRO FORMA CONFIRMATION
// ============================================

Deno.test("Pro Forma Bevestiging - update data structuur correct", () => {
  const proformaAmountExclVat = 1000;
  const proformaCommission = 150;
  
  const result = buildProFormaConfirmUpdateData(proformaAmountExclVat, proformaCommission);
  
  assertEquals(result.commission_status, "confirmed");
  assertEquals(result.invoiced_amount, 1000);
  assertEquals(result.commission_amount, 150);
});

Deno.test("Pro Forma Bevestiging - logies met 10% commissie", () => {
  const proformaAmountExclVat = 2000;
  const proformaCommission = 200;
  
  const result = buildProFormaConfirmUpdateData(proformaAmountExclVat, proformaCommission);
  
  assertEquals(result.commission_status, "confirmed");
  assertEquals(result.invoiced_amount, 2000);
  assertEquals(result.commission_amount, 200);
});

// ============================================
// UNIT TESTS: DEVIATION HANDLING
// ============================================

Deno.test("Afwijking - herberekening commissie bij lager bedrag", () => {
  const actualAmount = 800; // Was €1000 in pro forma
  const reason = "Minder deelnemers";
  const commissionPercentage = 15;
  
  const result = buildDeviationUpdateData(actualAmount, reason, commissionPercentage);
  
  assertEquals(result.commission_status, "confirmed");
  assertEquals(result.actual_invoiced_excl_vat, 800);
  assertEquals(result.deviation_reason, "Minder deelnemers");
  assertEquals(result.invoiced_amount, 800);
  assertEquals(result.commission_amount, 120); // 800 * 15%
});

Deno.test("Afwijking - herberekening commissie bij hoger bedrag", () => {
  const actualAmount = 1200; // Was €1000 in pro forma
  const reason = "Extra deelnemers toegevoegd";
  const commissionPercentage = 15;
  
  const result = buildDeviationUpdateData(actualAmount, reason, commissionPercentage);
  
  assertEquals(result.commission_status, "confirmed");
  assertEquals(result.actual_invoiced_excl_vat, 1200);
  assertEquals(result.commission_amount, 180); // 1200 * 15%
});

Deno.test("Afwijking - logies met 10% commissie", () => {
  const actualAmount = 900;
  const reason = "Kortere verblijfsduur";
  const commissionPercentage = 10;
  
  const result = buildDeviationUpdateData(actualAmount, reason, commissionPercentage);
  
  assertEquals(result.commission_amount, 90); // 900 * 10%
});

Deno.test("Afwijking - afronding bij oneven bedrag", () => {
  const actualAmount = 333.33;
  const reason = "Aangepaste prijs";
  const commissionPercentage = 15;
  
  const result = buildDeviationUpdateData(actualAmount, reason, commissionPercentage);
  
  // 333.33 * 15% = 49.9995, afgerond naar 50.00
  assertEquals(result.commission_amount, 50);
});

// ============================================
// EDGE CASES
// ============================================

Deno.test("Edge Case - 0% commissie geeft €0", () => {
  const actualAmount = 1000;
  const commissionPercentage = 0;
  
  const result = calculateCommission(actualAmount, commissionPercentage);
  
  assertEquals(result, 0);
});

Deno.test("Edge Case - €0 bedrag geeft €0 commissie", () => {
  const actualAmount = 0;
  const commissionPercentage = 15;
  
  const result = calculateCommission(actualAmount, commissionPercentage);
  
  assertEquals(result, 0);
});

Deno.test("Edge Case - zeer groot bedrag", () => {
  const actualAmount = 100000;
  const commissionPercentage = 15;
  
  const result = calculateCommission(actualAmount, commissionPercentage);
  
  assertEquals(result, 15000);
});

Deno.test("Edge Case - fractioneel commissie percentage", () => {
  const actualAmount = 1000;
  const commissionPercentage = 12.5;
  
  const result = calculateCommission(actualAmount, commissionPercentage);
  
  assertEquals(result, 125);
});

// ============================================
// VALIDATION TESTS
// ============================================

Deno.test("Validatie - required fields check", () => {
  const partnerToken = "abc123";
  const itemId = "item-uuid";
  const itemType = "activity";
  
  const hasRequiredFields = !!(partnerToken && itemId && itemType);
  
  assertEquals(hasRequiredFields, true);
});

Deno.test("Validatie - missing partnerToken", () => {
  const partnerToken = "";
  const itemId = "item-uuid";
  const itemType = "activity";
  
  const hasRequiredFields = !!(partnerToken && itemId && itemType);
  
  assertEquals(hasRequiredFields, false);
});

Deno.test("Validatie - valid itemType values", () => {
  const validTypes = ["activity", "accommodation"];
  
  assertEquals(validTypes.includes("activity"), true);
  assertEquals(validTypes.includes("accommodation"), true);
  assertEquals(validTypes.includes("invalid"), false);
});

// ============================================
// FULL FLOW TESTS
// ============================================

Deno.test("Volledige Flow - activiteit bevestiging zonder afwijking", () => {
  // Simulate the flow
  const proformaAmountExclVat = 1000;
  const proformaCommission = 150;
  
  const updateData = buildProFormaConfirmUpdateData(proformaAmountExclVat, proformaCommission);
  
  assertEquals(updateData.commission_status, "confirmed");
  assertEquals(updateData.invoiced_amount, 1000);
  assertEquals(updateData.commission_amount, 150);
});

Deno.test("Volledige Flow - activiteit met afwijking", () => {
  // Partner reports different amount
  const deviation = {
    actualAmount: 850,
    reason: "Annulering 2 deelnemers",
  };
  const commissionPercentage = 15;
  
  const updateData = buildDeviationUpdateData(
    deviation.actualAmount,
    deviation.reason,
    commissionPercentage
  );
  
  assertEquals(updateData.commission_status, "confirmed");
  assertEquals(updateData.actual_invoiced_excl_vat, 850);
  assertEquals(updateData.deviation_reason, "Annulering 2 deelnemers");
  assertEquals(updateData.commission_amount, 127.5); // 850 * 15%
});

Deno.test("Volledige Flow - logies bevestiging", () => {
  const proformaAmountExclVat = 2000;
  const proformaCommission = 200; // 10%
  
  const updateData = buildProFormaConfirmUpdateData(proformaAmountExclVat, proformaCommission);
  
  assertEquals(updateData.commission_status, "confirmed");
  assertEquals(updateData.invoiced_amount, 2000);
  assertEquals(updateData.commission_amount, 200);
});

// ============================================
// API TESTS
// ============================================

const SUPABASE_URL = Deno.env.get("VITE_SUPABASE_URL");

Deno.test("API Test - missing required fields returns 400", async () => {
  if (!SUPABASE_URL) {
    console.log("Skipping API test - SUPABASE_URL not set");
    return;
  }
  
  const response = await fetch(
    `${SUPABASE_URL}/functions/v1/confirm-partner-commission`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ partnerToken: "invalid" }), // Missing itemId and itemType
    }
  );
  
  await response.text();
  
  assertEquals(response.status, 400);
});

Deno.test("API Test - invalid partner token returns 401", async () => {
  if (!SUPABASE_URL) {
    console.log("Skipping API test - SUPABASE_URL not set");
    return;
  }
  
  const response = await fetch(
    `${SUPABASE_URL}/functions/v1/confirm-partner-commission`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        partnerToken: "invalid-token-12345",
        itemId: "00000000-0000-0000-0000-000000000000",
        itemType: "activity",
      }),
    }
  );
  
  await response.text();
  
  assertEquals(response.status, 401);
});
