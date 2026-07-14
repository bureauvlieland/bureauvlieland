// @vitest-environment jsdom
//
// Contract-tests voor de verwijder-flow in het klantportaal.
//
// Kernregel: als een klant op "Verwijderen" klikt is dat een LOKALE, nog niet
// opgeslagen wijziging. Het onderdeel moet zichtbaar blijven in de tijdlijn
// (`program.items`), maar wél als "removed"-change verschijnen in
// `getPendingChanges()` zodat de call-to-action-balk verschijnt. Alleen na
// `submitChanges()` mag de wijziging naar de database gaan.
//
// Deze test regressietest de klacht van klant Scherp (BV-2606-0004, 14-07-2026):
// verwijderen leek te werken maar was bij refresh weg omdat items lokaal op
// status="cancelled" werden gezet en gefilterd — waardoor de klant niet wist
// dat er nog iets opgeslagen moest worden. Zie /.lovable/plan.md.

import { describe, it, expect, vi, beforeEach, afterAll } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";


// Mock de supabase client BEFORE hook import.
const mockFunctionsInvoke = vi.fn().mockResolvedValue({ error: null });
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    functions: { invoke: (...args: unknown[]) => mockFunctionsInvoke(...args) },
    auth: { getSession: vi.fn().mockResolvedValue({ data: { session: null } }) },
  },
}));

// Mock fetch (get-customer-program edge function).
const mockProgramResponse = {
  program: {
    id: "req-1",
    customer_name: "Nancy",
    customer_token: "tok-1",
    number_of_people: 10,
    selected_dates: ["2026-11-05"],
    status: "active",
    quote_status: "offerte_verstuurd",
    program_published_at: "2026-06-02T14:47:05.85Z",
    items: [
      {
        id: "item-1",
        request_id: "req-1",
        block_id: "b1",
        block_name: "Café Boven",
        block_category: "avond",
        provider_name: "Café Boven",
        provider_id: "cafe-boven",
        provider_email: "info@cafeboven.nl",
        block_type: "activity",
        day_index: 0,
        status: "pending",
        version: 1,
        created_at: "2026-06-01T00:00:00Z",
        updated_at: "2026-06-01T00:00:00Z",
      },
      {
        id: "item-2",
        request_id: "req-1",
        block_id: "b2",
        block_name: "Vuurtorenbezoek",
        block_category: "activiteit",
        provider_name: "Bureau Vlieland",
        provider_id: "bureau",
        provider_email: null,
        block_type: "activity",
        day_index: 1,
        status: "pending",
        version: 1,
        created_at: "2026-06-01T00:00:00Z",
        updated_at: "2026-06-01T00:00:00Z",
      },
    ],
  },
  rawItems: null,
  history: [],
  linkedAccommodation: null,
  accommodationQuotes: [],
  billingLinesByItem: {},
  blockVatRates: {},
  extrasByQuoteId: {},
};

const originalFetch = global.fetch;

beforeEach(() => {
  mockFunctionsInvoke.mockClear();
  global.fetch = vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    json: async () => JSON.parse(JSON.stringify(mockProgramResponse)),
  }) as unknown as typeof fetch;
  // Vite env
  (import.meta as any).env = {
    VITE_SUPABASE_URL: "http://localhost",
    VITE_SUPABASE_PUBLISHABLE_KEY: "test-key",
  };
});

// Import AFTER mocks.
import { useCustomerProgram } from "@/hooks/useCustomerProgram";

describe("customer portal pending removal", () => {
  it("removeItem markeert het item als pending removal maar houdt het zichtbaar in program.items", async () => {
    const { result } = renderHook(() => useCustomerProgram("tok-1"));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.program?.items).toHaveLength(2);
    expect(result.current.pendingRemovals.size).toBe(0);

    act(() => result.current.removeItem("item-1"));

    // Blijft zichtbaar in de tijdlijn
    expect(result.current.program?.items).toHaveLength(2);
    expect(result.current.program?.items.find((i) => i.id === "item-1")?.status).toBe("pending");
    // Maar wél gemarkeerd
    expect(result.current.pendingRemovals.has("item-1")).toBe(true);
    expect(result.current.isPendingRemoval("item-1")).toBe(true);
    // En verschijnt als pending change zodat de opslaan-balk verschijnt
    const changes = result.current.getPendingChanges();
    expect(changes).toHaveLength(1);
    expect(changes[0]).toMatchObject({ type: "removed", itemId: "item-1", itemName: "Café Boven" });
  });

  it("removeItem is idempotent-toggle: nogmaals klikken doet het ongedaan", async () => {
    const { result } = renderHook(() => useCustomerProgram("tok-1"));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => result.current.removeItem("item-2"));
    expect(result.current.isPendingRemoval("item-2")).toBe(true);
    expect(result.current.getPendingChanges()).toHaveLength(1);

    act(() => result.current.removeItem("item-2"));
    expect(result.current.isPendingRemoval("item-2")).toBe(false);
    expect(result.current.getPendingChanges()).toHaveLength(0);
  });

  it("submitChanges stuurt items MET status='cancelled' voor pending removals naar de edge function en leegt de set", async () => {
    const { result } = renderHook(() => useCustomerProgram("tok-1"));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => result.current.removeItem("item-1"));

    await act(async () => {
      const ok = await result.current.submitChanges();
      expect(ok).toBe(true);
    });

    expect(mockFunctionsInvoke).toHaveBeenCalledTimes(1);
    const [fn, opts] = mockFunctionsInvoke.mock.calls[0] as [string, { body: any }];
    expect(fn).toBe("update-customer-program");
    // De change MOET type="removed" hebben
    expect(opts.body.changes).toEqual([
      expect.objectContaining({ type: "removed", itemId: "item-1" }),
    ]);
    // De items-payload moet item-1 op status="cancelled" tonen zodat de edge
    // function het als klant-annulering herkent.
    const payloadItem = opts.body.items.find((i: any) => i.id === "item-1");
    expect(payloadItem.status).toBe("cancelled");
    // Set is geleegd
    expect(result.current.pendingRemovals.size).toBe(0);
  });
});

afterAll(() => {
  global.fetch = originalFetch;
});

