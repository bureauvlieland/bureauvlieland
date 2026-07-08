import { describe, it, expect } from "vitest";
import {
  getProjectExecutionState,
  isPreExecutionTodoType,
  PRE_EXECUTION_TODO_TYPES,
} from "@/lib/projectExecutionState";

const on = (iso: string) => new Date(`${iso}T12:00:00.000Z`);

describe("getProjectExecutionState", () => {
  const NOW = on("2026-07-08");

  it("geeft 'future' als er geen datums zijn", () => {
    expect(getProjectExecutionState({ selected_dates: [] }, NOW)).toBe("future");
    expect(getProjectExecutionState({ selected_dates: null }, NOW)).toBe("future");
    expect(getProjectExecutionState({}, NOW)).toBe("future");
  });

  it("geeft 'future' als geannuleerd — auto-close moet dit niet raken", () => {
    expect(
      getProjectExecutionState(
        { selected_dates: ["2026-01-01"], cancelled_at: "2026-01-05T10:00:00Z" },
        NOW,
      ),
    ).toBe("future");
  });

  it("geeft 'past_execution' bij completion_status ready_for_invoice/partially/fully", () => {
    for (const cs of ["ready_for_invoice", "partially_invoiced", "fully_invoiced"]) {
      expect(
        getProjectExecutionState({ selected_dates: ["2026-12-01"], completion_status: cs }, NOW),
      ).toBe("past_execution");
    }
  });

  it("negeert onparsbare datums", () => {
    expect(
      getProjectExecutionState({ selected_dates: ["helemaal geen datum"] }, NOW),
    ).toBe("future");
  });

  it("geeft 'past_execution' als laatste datum vóór vandaag ligt", () => {
    expect(
      getProjectExecutionState({ selected_dates: ["2026-07-06", "2026-07-07"] }, NOW),
    ).toBe("past_execution");
  });

  it("geeft 'in_progress' als project vandaag loopt", () => {
    expect(
      getProjectExecutionState({ selected_dates: ["2026-07-07", "2026-07-08"] }, NOW),
    ).toBe("in_progress");
    expect(
      getProjectExecutionState({ selected_dates: ["2026-07-08"] }, NOW),
    ).toBe("in_progress");
  });

  it("geeft 'future' als project pas morgen begint", () => {
    expect(
      getProjectExecutionState({ selected_dates: ["2026-07-09", "2026-07-10"] }, NOW),
    ).toBe("future");
  });
});

describe("PRE_EXECUTION_TODO_TYPES whitelist", () => {
  it("bevat de goedkeuring-todo types", () => {
    expect(PRE_EXECUTION_TODO_TYPES).toContain("quote_pending_partner");
    expect(PRE_EXECUTION_TODO_TYPES).toContain("quote_pending_customer");
    expect(PRE_EXECUTION_TODO_TYPES).toContain("customer_inputs_missing");
  });

  it("bevat GEEN facturatie/voorwaarden types — die moeten na uitvoering openblijven", () => {
    for (const t of [
      "customer_billing_missing",
      "customer_terms_missing",
      "partner_invoice_pending",
      "commission_pending",
      "bureau_invoice_pending",
      "customer_aftersales",
      "feedback_collect",
      "partner_post_charge",
    ]) {
      expect(PRE_EXECUTION_TODO_TYPES).not.toContain(t);
      expect(isPreExecutionTodoType(t)).toBe(false);
    }
  });

  it("isPreExecutionTodoType is defensief voor null/undefined", () => {
    expect(isPreExecutionTodoType(null)).toBe(false);
    expect(isPreExecutionTodoType(undefined)).toBe(false);
    expect(isPreExecutionTodoType("")).toBe(false);
    expect(isPreExecutionTodoType("onbekend_type")).toBe(false);
  });
});
