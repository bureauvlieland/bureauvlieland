import { describe, expect, it } from "vitest";
import { buildPartnerOverviewRows, ARCHIVE_STATUSES } from "@/lib/getPartnerProjectsOverview";
import type { PartnerItem, PartnerDashboardData } from "@/types/partner";

type ItemOverrides = Partial<Omit<PartnerItem, "program_requests">> & {
  program_requests?: Partial<PartnerItem["program_requests"]>;
};

function makeItem(overrides: ItemOverrides): PartnerItem {
  const { program_requests, ...itemOverrides } = overrides;
  return {
    id: "item-1",
    request_id: "req-1",
    block_id: "block-1",
    block_name: "Fietsverhuur",
    block_category: "activity",
    provider_name: "Test Partner",
    provider_id: "partner-1",
    block_type: "activity",
    price_indication: null,
    day_index: 0,
    preferred_time: null,
    customer_notes: null,
    status: "pending",
    status_note: null,
    status_updated_at: null,
    executed_at: null,
    customer_accepted_at: null,
    customer_approved_at: null,
    version: 1,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    duration: null,
    admin_price_notes: null,
    partner_instructions: null,
    location_address: null,
    location_lat: null,
    location_lng: null,
    proposed_time: null,
    proposed_date: null,
    confirmed_time: null,
    admin_price_override: null,
    price_type: null,
    quoted_price: null,
    quoted_at: null,
    quoted_notes: null,
    customer_counter_time: null,
    customer_counter_note: null,
    customer_counter_at: null,
    invoiced_amount: null,
    vat_rate: null,
    invoiced_number: null,
    invoiced_date: null,
    invoiced_file_path: null,
    commission_percentage: null,
    commission_amount: null,
    commission_status: null,
    is_concept: false,
    ...itemOverrides,
    program_requests: {
      id: "req-1",
      customer_name: "Jack Frieling",
      customer_email: "jack@example.com",
      customer_phone: "0612345678",
      customer_company: "Univé Samen",
      number_of_people: 40,
      selected_dates: ["2026-09-25", "2026-09-26", "2026-09-27"],
      status: "pending",
      reference_number: "BV-2602-0001",
      terms_accepted_at: null,
      ...program_requests,
    },
  };
}

function makeData(items: PartnerItem[]): PartnerDashboardData {
  return {
    partner: { id: "partner-1", name: "Test Partner", email: "partner@example.com", commission_percentage: 10 },
    items,
    summary: { pending: 0, confirmed: 0, accepted: 0, executed: 0, closed: 0, readyForInvoice: 0, invoiced: 0, total: 0 },
  };
}

describe("buildPartnerOverviewRows", () => {
  it("cancelled request still marked pending/concept → geannuleerd, not concept (regression)", () => {
    // Reproduces the reported bug: a request cancelled before its concept item
    // was ever released to the partner must show as cancelled, not linger as
    // an open "Concept — nog niet vrijgegeven" option.
    const item = makeItem({
      status: "pending",
      is_concept: true,
      program_requests: { status: "cancelled", cancelled_at: "2026-09-15T10:00:00Z" },
    });

    const [row] = buildPartnerOverviewRows(makeData([item]));

    expect(row.derivedStatus).toBe("geannuleerd");
    expect(ARCHIVE_STATUSES.has(row.derivedStatus)).toBe(true);
  });

  it("cancelled request with released (non-concept) items → geannuleerd", () => {
    const item = makeItem({
      status: "cancelled",
      is_concept: false,
      program_requests: { status: "cancelled", cancelled_at: "2026-09-15T10:00:00Z" },
    });

    const [row] = buildPartnerOverviewRows(makeData([item]));

    expect(row.derivedStatus).toBe("geannuleerd");
  });

  it("still-active concept request keeps showing as concept", () => {
    const item = makeItem({
      status: "pending",
      is_concept: true,
      program_requests: { status: "pending", cancelled_at: null },
    });

    const [row] = buildPartnerOverviewRows(makeData([item]));

    expect(row.derivedStatus).toBe("concept");
    expect(row.customerLabel).toBe("Aanvraag in voorbereiding");
  });
});
