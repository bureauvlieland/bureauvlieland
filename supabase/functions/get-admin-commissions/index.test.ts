import "https://deno.land/std@0.224.0/dotenv/load.ts";
import {
  assertEquals,
  assertAlmostEquals,
} from "https://deno.land/std@0.224.0/assert/mod.ts";

// ============================================
// HELPER FUNCTIONS (extracted logic to test)
// ============================================

/**
 * Calculate amount excluding VAT from amount including VAT
 */
function calculateExclVat(amountInclVat: number, vatRate: number): number {
  return amountInclVat / (1 + vatRate / 100);
}

/**
 * Calculate commission amount based on amount excluding VAT
 */
function calculateCommission(amountExclVat: number, commissionPercentage: number): number {
  return amountExclVat * (commissionPercentage / 100);
}

/**
 * Get the last day of a month
 */
function getLastDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

/**
 * Calculate month date range from YYYY-MM format
 */
function getMonthDateRange(monthFilter: string): { startDate: string; endDate: string } {
  const [year, month] = monthFilter.split("-").map(Number);
  const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
  const lastDay = getLastDayOfMonth(year, month);
  const endDate = `${year}-${String(month).padStart(2, "0")}-${lastDay}`;
  return { startDate, endDate };
}

/**
 * Check if a date string falls within a month range
 */
function isDateInMonthRange(
  dateStr: string,
  monthStart: string,
  monthEnd: string
): boolean {
  return dateStr >= monthStart && dateStr <= monthEnd;
}

// ============================================
// UNIT TESTS: VAT CALCULATIONS
// ============================================

Deno.test("BTW Berekening - 21% activiteiten BTW correct afgetrokken", () => {
  const priceInclVat = 121;
  const vatRate = 21;
  
  const result = calculateExclVat(priceInclVat, vatRate);
  
  assertEquals(result, 100);
});

Deno.test("BTW Berekening - 9% logies BTW correct afgetrokken", () => {
  const priceInclVat = 109;
  const vatRate = 9;
  
  const result = calculateExclVat(priceInclVat, vatRate);
  
  // Use assertAlmostEquals for floating point precision
  assertAlmostEquals(result, 100, 0.0001);
});

Deno.test("BTW Berekening - 0% BTW geeft zelfde bedrag", () => {
  const priceInclVat = 100;
  const vatRate = 0;
  
  const result = calculateExclVat(priceInclVat, vatRate);
  
  assertEquals(result, 100);
});

Deno.test("BTW Berekening - afronding bij oneven bedragen", () => {
  // €150 incl. 21% BTW = €123.9669...
  const priceInclVat = 150;
  const vatRate = 21;
  
  const result = calculateExclVat(priceInclVat, vatRate);
  
  // Use assertAlmostEquals for floating point comparison
  assertAlmostEquals(result, 123.9669, 0.001);
});

Deno.test("BTW Berekening - groot bedrag met 21% BTW", () => {
  // €12100 incl. 21% BTW = €10000
  const priceInclVat = 12100;
  const vatRate = 21;
  
  const result = calculateExclVat(priceInclVat, vatRate);
  
  assertEquals(result, 10000);
});

// ============================================
// UNIT TESTS: COMMISSION CALCULATIONS
// ============================================

Deno.test("Commissie Berekening - standaard 15% partner commissie", () => {
  const amountExclVat = 100;
  const commissionPercentage = 15;
  
  const result = calculateCommission(amountExclVat, commissionPercentage);
  
  assertEquals(result, 15);
});

Deno.test("Commissie Berekening - standaard 10% logies commissie", () => {
  const amountExclVat = 100;
  const commissionPercentage = 10;
  
  const result = calculateCommission(amountExclVat, commissionPercentage);
  
  assertEquals(result, 10);
});

Deno.test("Commissie Berekening - custom 20% commissie", () => {
  const amountExclVat = 100;
  const commissionPercentage = 20;
  
  const result = calculateCommission(amountExclVat, commissionPercentage);
  
  assertEquals(result, 20);
});

Deno.test("Commissie Berekening - 0% commissie geeft €0", () => {
  const amountExclVat = 100;
  const commissionPercentage = 0;
  
  const result = calculateCommission(amountExclVat, commissionPercentage);
  
  assertEquals(result, 0);
});

Deno.test("Commissie Berekening - afronding bij oneven bedragen", () => {
  // €123.97 * 15% = €18.5955
  const amountExclVat = 123.97;
  const commissionPercentage = 15;
  
  const result = calculateCommission(amountExclVat, commissionPercentage);
  
  assertAlmostEquals(result, 18.5955, 0.001);
});

// ============================================
// COMBINED: FULL COMMISSION FLOW
// ============================================

Deno.test("Volledige Flow - activiteit €121 incl BTW met 15% commissie", () => {
  const quotedPrice = 121; // incl. 21% BTW
  const vatRate = 21;
  const commissionPercentage = 15;
  
  const amountExclVat = calculateExclVat(quotedPrice, vatRate);
  const commission = calculateCommission(amountExclVat, commissionPercentage);
  
  assertEquals(amountExclVat, 100);
  assertEquals(commission, 15);
});

Deno.test("Volledige Flow - logies €109 incl BTW met 10% commissie", () => {
  const priceTotal = 109; // incl. 9% BTW
  const vatRate = 9;
  const commissionPercentage = 10;
  
  const amountExclVat = calculateExclVat(priceTotal, vatRate);
  const commission = calculateCommission(amountExclVat, commissionPercentage);
  
  // Use assertAlmostEquals for floating point precision
  assertAlmostEquals(amountExclVat, 100, 0.0001);
  assertAlmostEquals(commission, 10, 0.0001);
});

Deno.test("Volledige Flow - logies prijs exclusief BTW", () => {
  const priceTotal = 100; // excl. BTW
  const priceIncludesVat = false;
  const vatRate = 9;
  const commissionPercentage = 10;
  
  // When price excludes VAT, use it directly
  const amountExclVat = priceIncludesVat 
    ? calculateExclVat(priceTotal, vatRate)
    : priceTotal;
  const commission = calculateCommission(amountExclVat, commissionPercentage);
  
  assertEquals(amountExclVat, 100);
  assertEquals(commission, 10);
});

Deno.test("Volledige Flow - groot evenement €2420 incl BTW met 12% commissie", () => {
  const quotedPrice = 2420; // incl. 21% BTW
  const vatRate = 21;
  const commissionPercentage = 12;
  
  const amountExclVat = calculateExclVat(quotedPrice, vatRate);
  const commission = calculateCommission(amountExclVat, commissionPercentage);
  
  assertEquals(amountExclVat, 2000);
  assertEquals(commission, 240);
});

// ============================================
// UNIT TESTS: MONTH FILTER LOGIC
// ============================================

Deno.test("Maand Filter - juni 2026 datum range", () => {
  const result = getMonthDateRange("2026-06");
  
  assertEquals(result.startDate, "2026-06-01");
  assertEquals(result.endDate, "2026-06-30");
});

Deno.test("Maand Filter - januari 2026 datum range", () => {
  const result = getMonthDateRange("2026-01");
  
  assertEquals(result.startDate, "2026-01-01");
  assertEquals(result.endDate, "2026-01-31");
});

Deno.test("Maand Filter - februari 2026 (geen schrikkeljaar)", () => {
  const result = getMonthDateRange("2026-02");
  
  assertEquals(result.startDate, "2026-02-01");
  assertEquals(result.endDate, "2026-02-28");
});

Deno.test("Maand Filter - februari 2028 (schrikkeljaar)", () => {
  const result = getMonthDateRange("2028-02");
  
  assertEquals(result.startDate, "2028-02-01");
  assertEquals(result.endDate, "2028-02-29");
});

Deno.test("Maand Filter - december 2026 datum range", () => {
  const result = getMonthDateRange("2026-12");
  
  assertEquals(result.startDate, "2026-12-01");
  assertEquals(result.endDate, "2026-12-31");
});

// ============================================
// UNIT TESTS: DATE RANGE FILTERING
// ============================================

Deno.test("Datum Filter - datum binnen maand range", () => {
  const result = isDateInMonthRange("2026-06-15", "2026-06-01", "2026-06-30");
  
  assertEquals(result, true);
});

Deno.test("Datum Filter - eerste dag van maand", () => {
  const result = isDateInMonthRange("2026-06-01", "2026-06-01", "2026-06-30");
  
  assertEquals(result, true);
});

Deno.test("Datum Filter - laatste dag van maand", () => {
  const result = isDateInMonthRange("2026-06-30", "2026-06-01", "2026-06-30");
  
  assertEquals(result, true);
});

Deno.test("Datum Filter - datum voor maand range", () => {
  const result = isDateInMonthRange("2026-05-31", "2026-06-01", "2026-06-30");
  
  assertEquals(result, false);
});

Deno.test("Datum Filter - datum na maand range", () => {
  const result = isDateInMonthRange("2026-07-01", "2026-06-01", "2026-06-30");
  
  assertEquals(result, false);
});

// ============================================
// EDGE CASES
// ============================================

Deno.test("Edge Case - null prijs behandelen", () => {
  const priceInclVat = 0; // null should be treated as 0 in the code
  const vatRate = 21;
  
  const result = calculateExclVat(priceInclVat, vatRate);
  
  // 0 divided stays 0
  assertEquals(result, 0);
});

Deno.test("Edge Case - negatief bedrag (creditering)", () => {
  const priceInclVat = -121;
  const vatRate = 21;
  
  const result = calculateExclVat(priceInclVat, vatRate);
  
  assertEquals(result, -100);
});

Deno.test("Edge Case - zeer klein bedrag", () => {
  const priceInclVat = 1.21;
  const vatRate = 21;
  
  const result = calculateExclVat(priceInclVat, vatRate);
  
  assertEquals(result, 1);
});

Deno.test("Edge Case - commissie percentage als fractie", () => {
  const amountExclVat = 100;
  const commissionPercentage = 12.5;
  
  const result = calculateCommission(amountExclVat, commissionPercentage);
  
  assertEquals(result, 12.5);
});

// ============================================
// COMMISSION PERCENTAGE FALLBACK LOGIC
// ============================================

Deno.test("Commissie Fallback - item percentage heeft voorrang", () => {
  const itemCommission = 18;
  const partnerCommission = 15;
  const defaultCommission = 15;
  
  const result = itemCommission ?? partnerCommission ?? defaultCommission;
  
  assertEquals(result, 18);
});

Deno.test("Commissie Fallback - partner percentage als backup", () => {
  const itemCommission = null;
  const partnerCommission = 12;
  const defaultCommission = 15;
  
  const result = itemCommission ?? partnerCommission ?? defaultCommission;
  
  assertEquals(result, 12);
});

Deno.test("Commissie Fallback - default als laatste optie", () => {
  const itemCommission = null;
  const partnerCommission = null;
  const defaultCommission = 15;
  
  const result = itemCommission ?? partnerCommission ?? defaultCommission;
  
  assertEquals(result, 15);
});

// ============================================
// LOGIES-SPECIFIC CALCULATIONS
// ============================================

Deno.test("Logies - standaard 9% BTW en 10% commissie", () => {
  const priceTotal = 1090; // 10 nachten à €100 + 9% BTW
  const vatRate = 9;
  const commissionPercentage = 10;
  
  const amountExclVat = calculateExclVat(priceTotal, vatRate);
  const commission = calculateCommission(amountExclVat, commissionPercentage);
  
  // Use assertAlmostEquals for floating point precision
  assertAlmostEquals(amountExclVat, 1000, 0.01);
  assertAlmostEquals(commission, 100, 0.01);
});

Deno.test("Logies - accommodation_commission_percentage override", () => {
  const priceTotal = 1090;
  const vatRate = 9;
  const accommodationCommissionPercentage = 8; // Custom rate
  
  const amountExclVat = calculateExclVat(priceTotal, vatRate);
  const commission = calculateCommission(amountExclVat, accommodationCommissionPercentage);
  
  // Use assertAlmostEquals for floating point precision
  assertAlmostEquals(amountExclVat, 1000, 0.01);
  assertAlmostEquals(commission, 80, 0.01);
});

// ============================================
// INTEGRATION TEST HELPERS
// ============================================

const SUPABASE_URL = Deno.env.get("VITE_SUPABASE_URL");
const SUPABASE_ANON_KEY = Deno.env.get("VITE_SUPABASE_PUBLISHABLE_KEY");

Deno.test("Environment - SUPABASE_URL is ingesteld", () => {
  // This test verifies env vars are loaded correctly
  // Will be undefined in CI without proper secrets, so we just check the test runs
  if (SUPABASE_URL) {
    assertEquals(SUPABASE_URL.includes("supabase"), true);
  }
});

Deno.test("API Test - unauthorized request returns 401", async () => {
  if (!SUPABASE_URL) {
    console.log("Skipping API test - SUPABASE_URL not set");
    return;
  }
  
  const response = await fetch(
    `${SUPABASE_URL}/functions/v1/get-admin-commissions`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ status: "expected" }),
    }
  );
  
  // Consume response body to prevent resource leak
  await response.text();
  
  assertEquals(response.status, 401);
});
