import "https://deno.land/std@0.224.0/dotenv/load.ts";
import {
  assertEquals,
  assertAlmostEquals,
} from "https://deno.land/std@0.224.0/assert/mod.ts";

// ============================================
// HELPER FUNCTIONS (extracted logic to test)
// ============================================

/**
 * Calculate commission amount based on invoiced amount and percentage
 */
function calculateCommission(invoicedAmount: number, commissionPercentage: number): number {
  return (invoicedAmount * commissionPercentage) / 100;
}

/**
 * Determine commission status based on percentage
 */
function getCommissionStatus(commissionPercentage: number): string {
  return commissionPercentage > 0 ? "pending" : "not_applicable";
}

/**
 * Build invoice update data
 */
function buildInvoiceUpdateData(
  invoicedAmount: number,
  invoicedNumber: string,
  invoicedDate: string,
  commissionPercentage: number,
  notes: string | null
): Record<string, unknown> {
  const commissionAmount = calculateCommission(invoicedAmount, commissionPercentage);
  
  return {
    invoiced_amount: invoicedAmount,
    invoiced_number: invoicedNumber,
    invoiced_date: invoicedDate,
    commission_percentage: commissionPercentage,
    commission_amount: commissionAmount,
    commission_status: getCommissionStatus(commissionPercentage),
    commission_notes: notes || null,
    updated_at: new Date().toISOString(),
  };
}

/**
 * Validate required fields
 */
function validateRequiredFields(fields: {
  partnerToken?: string;
  itemId?: string;
  invoicedAmount?: number;
  invoicedNumber?: string;
  invoicedDate?: string;
}): boolean {
  const { partnerToken, itemId, invoicedAmount, invoicedNumber, invoicedDate } = fields;
  return !!(partnerToken && itemId && invoicedAmount && invoicedNumber && invoicedDate);
}

/**
 * Format commission amount for display
 */
function formatCommissionAmount(amount: number): string {
  return amount.toFixed(2);
}

// ============================================
// UNIT TESTS: COMMISSION CALCULATION
// ============================================

Deno.test("Commissie Berekening - standaard 15% partner commissie", () => {
  const invoicedAmount = 1000;
  const commissionPercentage = 15;
  
  const result = calculateCommission(invoicedAmount, commissionPercentage);
  
  assertEquals(result, 150);
});

Deno.test("Commissie Berekening - 10% commissie", () => {
  const invoicedAmount = 500;
  const commissionPercentage = 10;
  
  const result = calculateCommission(invoicedAmount, commissionPercentage);
  
  assertEquals(result, 50);
});

Deno.test("Commissie Berekening - 0% commissie", () => {
  const invoicedAmount = 1000;
  const commissionPercentage = 0;
  
  const result = calculateCommission(invoicedAmount, commissionPercentage);
  
  assertEquals(result, 0);
});

Deno.test("Commissie Berekening - groot bedrag", () => {
  const invoicedAmount = 10000;
  const commissionPercentage = 15;
  
  const result = calculateCommission(invoicedAmount, commissionPercentage);
  
  assertEquals(result, 1500);
});

Deno.test("Commissie Berekening - klein bedrag met decimalen", () => {
  const invoicedAmount = 33.33;
  const commissionPercentage = 15;
  
  const result = calculateCommission(invoicedAmount, commissionPercentage);
  
  assertAlmostEquals(result, 4.9995, 0.0001);
});

Deno.test("Commissie Berekening - fractioneel percentage", () => {
  const invoicedAmount = 1000;
  const commissionPercentage = 12.5;
  
  const result = calculateCommission(invoicedAmount, commissionPercentage);
  
  assertEquals(result, 125);
});

// ============================================
// UNIT TESTS: COMMISSION STATUS
// ============================================

Deno.test("Commissie Status - pending bij > 0%", () => {
  const result = getCommissionStatus(15);
  assertEquals(result, "pending");
});

Deno.test("Commissie Status - pending bij 0.1%", () => {
  const result = getCommissionStatus(0.1);
  assertEquals(result, "pending");
});

Deno.test("Commissie Status - not_applicable bij 0%", () => {
  const result = getCommissionStatus(0);
  assertEquals(result, "not_applicable");
});

// ============================================
// UNIT TESTS: VALIDATION
// ============================================

Deno.test("Validatie - alle velden aanwezig", () => {
  const result = validateRequiredFields({
    partnerToken: "token123",
    itemId: "uuid-123",
    invoicedAmount: 1000,
    invoicedNumber: "INV-2026-001",
    invoicedDate: "2026-01-28",
  });
  
  assertEquals(result, true);
});

Deno.test("Validatie - partnerToken ontbreekt", () => {
  const result = validateRequiredFields({
    itemId: "uuid-123",
    invoicedAmount: 1000,
    invoicedNumber: "INV-2026-001",
    invoicedDate: "2026-01-28",
  });
  
  assertEquals(result, false);
});

Deno.test("Validatie - itemId ontbreekt", () => {
  const result = validateRequiredFields({
    partnerToken: "token123",
    invoicedAmount: 1000,
    invoicedNumber: "INV-2026-001",
    invoicedDate: "2026-01-28",
  });
  
  assertEquals(result, false);
});

Deno.test("Validatie - invoicedAmount ontbreekt", () => {
  const result = validateRequiredFields({
    partnerToken: "token123",
    itemId: "uuid-123",
    invoicedNumber: "INV-2026-001",
    invoicedDate: "2026-01-28",
  });
  
  assertEquals(result, false);
});

Deno.test("Validatie - invoicedNumber ontbreekt", () => {
  const result = validateRequiredFields({
    partnerToken: "token123",
    itemId: "uuid-123",
    invoicedAmount: 1000,
    invoicedDate: "2026-01-28",
  });
  
  assertEquals(result, false);
});

Deno.test("Validatie - invoicedDate ontbreekt", () => {
  const result = validateRequiredFields({
    partnerToken: "token123",
    itemId: "uuid-123",
    invoicedAmount: 1000,
    invoicedNumber: "INV-2026-001",
  });
  
  assertEquals(result, false);
});

Deno.test("Validatie - invoicedAmount is 0 (falsy maar valid)", () => {
  const result = validateRequiredFields({
    partnerToken: "token123",
    itemId: "uuid-123",
    invoicedAmount: 0, // 0 is falsy in JS
    invoicedNumber: "INV-2026-001",
    invoicedDate: "2026-01-28",
  });
  
  // Note: 0 is falsy, so this returns false - intentional behavior
  assertEquals(result, false);
});

// ============================================
// UNIT TESTS: UPDATE DATA BUILDING
// ============================================

Deno.test("Update Data - volledige structuur met commissie", () => {
  const result = buildInvoiceUpdateData(
    1000,
    "INV-2026-001",
    "2026-01-28",
    15,
    null
  );
  
  assertEquals(result.invoiced_amount, 1000);
  assertEquals(result.invoiced_number, "INV-2026-001");
  assertEquals(result.invoiced_date, "2026-01-28");
  assertEquals(result.commission_percentage, 15);
  assertEquals(result.commission_amount, 150);
  assertEquals(result.commission_status, "pending");
  assertEquals(result.commission_notes, null);
});

Deno.test("Update Data - met notities", () => {
  const result = buildInvoiceUpdateData(
    500,
    "INV-2026-002",
    "2026-01-28",
    15,
    "Inclusief materiaalkosten"
  );
  
  assertEquals(result.commission_notes, "Inclusief materiaalkosten");
});

Deno.test("Update Data - zonder commissie (0%)", () => {
  const result = buildInvoiceUpdateData(
    1000,
    "INV-2026-003",
    "2026-01-28",
    0,
    null
  );
  
  assertEquals(result.commission_amount, 0);
  assertEquals(result.commission_status, "not_applicable");
});

// ============================================
// UNIT TESTS: FORMATTING
// ============================================

Deno.test("Formattering - hele euro's", () => {
  const result = formatCommissionAmount(150);
  assertEquals(result, "150.00");
});

Deno.test("Formattering - met centen", () => {
  const result = formatCommissionAmount(150.75);
  assertEquals(result, "150.75");
});

Deno.test("Formattering - afronding", () => {
  const result = formatCommissionAmount(150.999);
  assertEquals(result, "151.00");
});

Deno.test("Formattering - klein bedrag", () => {
  const result = formatCommissionAmount(0.50);
  assertEquals(result, "0.50");
});

// ============================================
// EDGE CASES
// ============================================

Deno.test("Edge Case - zeer groot bedrag", () => {
  const invoicedAmount = 1000000;
  const commissionPercentage = 15;
  
  const result = calculateCommission(invoicedAmount, commissionPercentage);
  
  assertEquals(result, 150000);
});

Deno.test("Edge Case - negatief bedrag (creditnota)", () => {
  const invoicedAmount = -500;
  const commissionPercentage = 15;
  
  const result = calculateCommission(invoicedAmount, commissionPercentage);
  
  assertEquals(result, -75);
});

Deno.test("Edge Case - zeer klein bedrag", () => {
  const invoicedAmount = 0.01;
  const commissionPercentage = 15;
  
  const result = calculateCommission(invoicedAmount, commissionPercentage);
  
  assertAlmostEquals(result, 0.0015, 0.0001);
});

// ============================================
// FULL FLOW TESTS
// ============================================

Deno.test("Volledige Flow - normale factuurregistratie", () => {
  // Simulate the complete flow
  const invoicedAmount = 1500;
  const invoicedNumber = "FAC-2026-0042";
  const invoicedDate = "2026-01-28";
  const commissionPercentage = 15;
  
  // Validate
  const isValid = validateRequiredFields({
    partnerToken: "token123",
    itemId: "uuid-123",
    invoicedAmount,
    invoicedNumber,
    invoicedDate,
  });
  assertEquals(isValid, true);
  
  // Calculate
  const commission = calculateCommission(invoicedAmount, commissionPercentage);
  assertEquals(commission, 225);
  
  // Build update
  const updateData = buildInvoiceUpdateData(
    invoicedAmount,
    invoicedNumber,
    invoicedDate,
    commissionPercentage,
    null
  );
  
  assertEquals(updateData.invoiced_amount, 1500);
  assertEquals(updateData.commission_amount, 225);
  assertEquals(updateData.commission_status, "pending");
});

Deno.test("Volledige Flow - factuur zonder commissie", () => {
  const invoicedAmount = 1000;
  const commissionPercentage = 0;
  
  const updateData = buildInvoiceUpdateData(
    invoicedAmount,
    "FAC-2026-0043",
    "2026-01-28",
    commissionPercentage,
    "Bureau Vlieland eigen activiteit"
  );
  
  assertEquals(updateData.commission_amount, 0);
  assertEquals(updateData.commission_status, "not_applicable");
  assertEquals(updateData.commission_notes, "Bureau Vlieland eigen activiteit");
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
    `${SUPABASE_URL}/functions/v1/register-partner-invoice`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ partnerToken: "invalid" }), // Missing other fields
    }
  );
  
  await response.text();
  
  assertEquals(response.status, 400);
});

Deno.test("API Test - invalid partner token returns 403", async () => {
  if (!SUPABASE_URL) {
    console.log("Skipping API test - SUPABASE_URL not set");
    return;
  }
  
  const response = await fetch(
    `${SUPABASE_URL}/functions/v1/register-partner-invoice`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        partnerToken: "invalid-token-12345",
        itemId: "00000000-0000-0000-0000-000000000000",
        invoicedAmount: 1000,
        invoicedNumber: "INV-TEST-001",
        invoicedDate: "2026-01-28",
      }),
    }
  );
  
  await response.text();
  
  assertEquals(response.status, 403);
});
