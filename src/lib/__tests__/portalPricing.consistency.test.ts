/**
 * QA-suite die afdwingt dat admin / partner / klant exact hetzelfde groepstotaal
 * tonen voor één en hetzelfde program_request_item.
 *
 * Run: `bun run src/lib/__tests__/portalPricing.consistency.test.ts`
 *
 * Dit bestand gebruikt geen test-framework (geen Vitest/Bun-test types nodig).
 * Het exporteert `runPortalPricingConsistencyChecks()` die alle assertions doet
 * en een samenvatting print. Faalt het script, dan exit code 1.
 */
import {
  getDisplayUnitPrice,
  getDisplayLineTotal,
  getEffectivePeople,
  getItemLineTotal,
  hasOpenAdminPriceChange,
} from "../portalPricing";

type Case = { name: string; run: () => void };

function assertEq<T>(actual: T, expected: T, label: string) {
  if (actual !== expected) {
    throw new Error(`${label}\n  expected: ${String(expected)}\n  actual:   ${String(actual)}`);
  }
}

const baseItem = {
  quoted_price: null as number | null,
  admin_price_override: null as number | null,
  price_type: "per_person" as string | null,
  override_people: null as number | null,
};

const cases: Case[] = [
  {
    name: "per_person item: unit × people === group total (admin override)",
    run: () => {
      const item = { ...baseItem, admin_price_override: 25, price_type: "per_person" };
      assertEq(getDisplayUnitPrice(item, 12), 25, "unit");
      assertEq(getDisplayLineTotal(item, 12), 300, "line total");
    },
  },
  {
    name: "per_person_per_day: unit × people × days === group total",
    run: () => {
      const item = { ...baseItem, admin_price_override: 10, price_type: "per_person_per_day" };
      assertEq(getDisplayLineTotal(item, 8, 3), 240, "line total");
    },
  },
  {
    name: "quoted_price wint altijd van admin_price_override",
    run: () => {
      const item = { ...baseItem, quoted_price: 500, admin_price_override: 999, price_type: "per_person" };
      assertEq(getDisplayLineTotal(item, 10), 500, "quoted_price wins");
    },
  },
  {
    name: "override_people overschrijft programPeople voor unit én totaal (Trattoria-case)",
    run: () => {
      const item = { ...baseItem, admin_price_override: 44.5, price_type: "per_person", override_people: 12 };
      assertEq(getEffectivePeople(item, 18), 12, "effective people");
      assertEq(getDisplayLineTotal(item, 18), 44.5 * 12, "line total");
    },
  },
  {
    name: "quoted_price + override_people: unit price = quoted_price ÷ override_people",
    run: () => {
      const item = { ...baseItem, quoted_price: 534, price_type: "per_person", override_people: 12 };
      assertEq(getDisplayUnitPrice(item, 18), 534 / 12, "unit");
      assertEq(getDisplayLineTotal(item, 18), 534, "line total");
    },
  },
  {
    name: "getItemLineTotal en getDisplayLineTotal produceren identieke totalen",
    run: () => {
      const item: any = {
        id: "x", request_id: "r", block_id: null, block_name: "t", block_category: "c",
        provider_name: "p", provider_id: "pp", provider_email: null, block_type: "activity",
        price_indication: null, duration: null, day_index: 0, preferred_time: null,
        customer_notes: null, status: "pending", status_note: null, status_updated_at: null,
        status_updated_by: null, version: 1, created_at: "", updated_at: "", executed_at: null,
        customer_accepted_at: null, customer_counter_time: null, customer_counter_note: null,
        customer_counter_at: null, confirmed_time: null, quoted_price: null, quoted_at: null,
        quoted_notes: null, proposed_time: null, proposed_date: null, image_url: null,
        image_asset: null, customer_approved_at: null, item_quote_status: null,
        admin_price_override: 30, admin_price_notes: null, skip_partner_notification: false,
        price_type: "per_person", external_url: null, override_people: null,
      };
      assertEq(getItemLineTotal(item, 10), getDisplayLineTotal(item, 10), "totalen gelijk");
    },
  },
  {
    name: "hasOpenAdminPriceChange — false zonder override",
    run: () => {
      assertEq(hasOpenAdminPriceChange({ admin_price_override: null, admin_price_override_updated_at: null }), false, "no override");
    },
  },
  {
    name: "hasOpenAdminPriceChange — true wanneer override nieuwer is dan ack",
    run: () => {
      assertEq(hasOpenAdminPriceChange({
        admin_price_override: 25,
        admin_price_override_updated_at: "2026-05-01T12:00:00Z",
        partner_price_change_acknowledged_at: "2026-04-30T10:00:00Z",
      }), true, "needs ack");
    },
  },
  {
    name: "hasOpenAdminPriceChange — false na recente ack",
    run: () => {
      assertEq(hasOpenAdminPriceChange({
        admin_price_override: 25,
        admin_price_override_updated_at: "2026-05-01T12:00:00Z",
        partner_price_change_acknowledged_at: "2026-05-02T10:00:00Z",
      }), false, "ack newer");
    },
  },
  {
    name: "Partner accepteert nieuwe admin-prijs → quoted_price = admin-totaal en banner sluit",
    run: () => {
      // Initieel: admin override €25 p.p., 10 personen, oude bevestigde prijs €200
      const before = {
        quoted_price: 200,
        admin_price_override: 25,
        price_type: "per_person" as const,
        override_people: null,
        admin_price_override_updated_at: "2026-05-01T12:00:00Z",
        partner_price_change_acknowledged_at: null as string | null,
        quoted_at: "2026-04-20T09:00:00Z",
      };
      assertEq(hasOpenAdminPriceChange(before), true, "open vóór ack");
      // Partner klikt 'Bevestig nieuwe prijs' → UI berekent admin × people
      const adminTotal = before.admin_price_override * 10;
      assertEq(adminTotal, 250, "berekend admin-totaal");
      // Resultaat: quoted_price wordt overschreven, ack=now
      const after = {
        ...before,
        quoted_price: adminTotal,
        partner_price_change_acknowledged_at: "2026-05-01T13:00:00Z",
      };
      assertEq(hasOpenAdminPriceChange(after), false, "ack sluit banner");
      assertEq(getDisplayLineTotal(after, 10), 250, "klant ziet €250");
    },
  },
  {
    name: "Doeksen-case: open admin-prijswijziging — klant blijft oude quoted_price zien tot partner bevestigt",
    run: () => {
      // Reproduceert exact het echte scenario: quoted_price=503.58, override=570.60 (total)
      const item = {
        quoted_price: 503.58,
        admin_price_override: 570.60,
        price_type: "total" as const,
        override_people: 30,
        admin_price_override_updated_at: "2026-05-01T13:13:00Z",
        partner_price_change_acknowledged_at: "2026-05-01T12:11:00Z",
        quoted_at: "2026-05-01T12:11:00Z",
      };
      // Klantportaal blijft de bevestigde partnerprijs tonen
      assertEq(getDisplayLineTotal(item, 30), 503.58, "klant ziet bevestigde prijs");
      // Maar admin/partner zien een open prijswijziging
      assertEq(hasOpenAdminPriceChange(item), true, "open admin-wijziging gedetecteerd");
    },
  },
];

export function runPortalPricingConsistencyChecks(): { passed: number; failed: number } {
  let passed = 0;
  let failed = 0;
  for (const c of cases) {
    try {
      c.run();
      passed += 1;
      // eslint-disable-next-line no-console
      console.log(`  ✓ ${c.name}`);
    } catch (err) {
      failed += 1;
      // eslint-disable-next-line no-console
      console.error(`  ✗ ${c.name}\n    ${(err as Error).message}`);
    }
  }
  // eslint-disable-next-line no-console
  console.log(`\nportalPricing consistency: ${passed} passed, ${failed} failed`);
  return { passed, failed };
}

// Allow direct execution: `bun run src/lib/__tests__/portalPricing.consistency.test.ts`
if (typeof import.meta !== "undefined" && (import.meta as any).main) {
  const result = runPortalPricingConsistencyChecks();
  if (result.failed > 0) {
    // @ts-ignore — process is available in bun/node runtime
    (globalThis as any).process?.exit?.(1);
  }
}
