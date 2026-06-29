import { describe, it, expect } from "vitest";
import {
  deriveItemDisplayStatus,
  deriveItemDisplayStatusLoose,
  itemDisplayStatusConfig,
} from "@/lib/itemStatus";
import type { ProgramRequestItem } from "@/types/programRequest";

const ctx = { programPeople: 10, numberOfDays: 2 };

/**
 * Bouw een minimaal ProgramRequestItem met overrides. We castten omdat het
 * type veel niet-relevante velden bevat voor deze unit tests.
 */
function makeItem(overrides: Partial<ProgramRequestItem> = {}): ProgramRequestItem {
  return {
    id: "item-1",
    program_request_id: "req-1",
    status: "pending",
    customer_accepted_at: null,
    customer_approved_at: null,
    block_type: null,
    admin_price_override: null,
    admin_price_override_updated_at: null,
    override_people: null,
    quoted_price: null,
    ...(overrides as object),
  } as unknown as ProgramRequestItem;
}

describe("deriveItemDisplayStatus — terminale toestanden", () => {
  it("self_arranged block_type → self_arranged", () => {
    expect(deriveItemDisplayStatus(makeItem({ block_type: "self_arranged" } as any), ctx))
      .toBe("self_arranged");
  });

  it("status=cancelled → geannuleerd (ook als klant ooit akkoord gaf)", () => {
    expect(deriveItemDisplayStatus(
      makeItem({ status: "cancelled", customer_accepted_at: "2024-01-01T00:00:00Z" } as any),
      ctx,
    )).toBe("geannuleerd");
  });

  it("status=executed → uitgevoerd", () => {
    expect(deriveItemDisplayStatus(makeItem({ status: "executed" } as any), ctx)).toBe("uitgevoerd");
  });

  it("status=invoiced → uitgevoerd", () => {
    expect(deriveItemDisplayStatus(makeItem({ status: "invoiced" } as any), ctx)).toBe("uitgevoerd");
  });

  it("status=unavailable → niet_beschikbaar", () => {
    expect(deriveItemDisplayStatus(makeItem({ status: "unavailable" } as any), ctx))
      .toBe("niet_beschikbaar");
  });
});

describe("deriveItemDisplayStatus — workflow zonder klant-akkoord", () => {
  it("status=pending → wacht_op_partner", () => {
    expect(deriveItemDisplayStatus(makeItem({ status: "pending" } as any), ctx))
      .toBe("wacht_op_partner");
  });

  it("status=confirmed zonder klant-akkoord → wacht_op_klant", () => {
    expect(deriveItemDisplayStatus(makeItem({ status: "confirmed" } as any), ctx))
      .toBe("wacht_op_klant");
  });

  it("status=alternative zonder klant-akkoord → wacht_op_klant", () => {
    expect(deriveItemDisplayStatus(makeItem({ status: "alternative" } as any), ctx))
      .toBe("wacht_op_klant");
  });
});

describe("deriveItemDisplayStatus — klant-akkoord scenarios", () => {
  it("klant akkoord + status=pending (partner nog niet bevestigd) → klant_akkoord_wacht_partner", () => {
    expect(deriveItemDisplayStatus(
      makeItem({ status: "pending", customer_accepted_at: "2024-05-01T10:00:00Z" } as any),
      ctx,
    )).toBe("klant_akkoord_wacht_partner");
  });

  it("klant akkoord + provider_id=bureau → klant_akkoord_bureau", () => {
    expect(deriveItemDisplayStatus(
      makeItem({
        status: "pending",
        customer_accepted_at: "2024-05-01T10:00:00Z",
        provider_id: "bureau",
      } as any),
      ctx,
    )).toBe("klant_akkoord_bureau");
  });

  it("klant akkoord + status=confirmed → geaccepteerd", () => {
    expect(deriveItemDisplayStatus(
      makeItem({ status: "confirmed", customer_accepted_at: "2024-05-01T10:00:00Z" } as any),
      ctx,
    )).toBe("geaccepteerd");
  });

  it("alle drie klant-akkoord-varianten tonen hetzelfde klantlabel", () => {
    const label = "Door u goedgekeurd";
    expect(itemDisplayStatusConfig.klant_akkoord_wacht_partner.customerLabel).toBe(label);
    expect(itemDisplayStatusConfig.klant_akkoord_bureau.customerLabel).toBe(label);
    expect(itemDisplayStatusConfig.geaccepteerd.customerLabel).toBe(label);
  });

  it("admin-prijswijziging ná klant-akkoord → prijs_gewijzigd", () => {
    expect(deriveItemDisplayStatus(
      makeItem({
        status: "confirmed",
        customer_accepted_at: "2024-05-01T10:00:00Z",
        admin_price_override: 250,
        admin_price_override_updated_at: "2024-05-02T10:00:00Z",
        quoted_price: 200,
      } as any),
      ctx,
    )).toBe("prijs_gewijzigd");
  });

  it("admin-prijswijziging vóór klant-akkoord → geaccepteerd (klant zag de prijs al)", () => {
    expect(deriveItemDisplayStatus(
      makeItem({
        status: "confirmed",
        customer_accepted_at: "2024-05-05T10:00:00Z",
        admin_price_override: 250,
        admin_price_override_updated_at: "2024-05-01T10:00:00Z",
        quoted_price: 200,
      } as any),
      ctx,
    )).toBe("geaccepteerd");
  });
});

describe("Eén bron van waarheid: admin/klant/partner gebruiken dezelfde key", () => {
  // Dit is de kern van de gevraagde regressie-bescherming: zolang alle
  // audience-views deze ene functie gebruiken, krijgen ze automatisch
  // dezelfde afgeleide status. We checken hier dat voor elke status er een
  // label per audience bestaat.
  const allStatuses = Object.keys(itemDisplayStatusConfig) as Array<
    keyof typeof itemDisplayStatusConfig
  >;

  it.each(allStatuses)("status %s heeft een label voor admin, klant én partner", (status) => {
    const cfg = itemDisplayStatusConfig[status];
    expect(cfg.adminLabel).toBeTruthy();
    expect(cfg.customerLabel).toBeTruthy();
    expect(cfg.partnerLabel).toBeTruthy();
    expect(cfg.adminTooltip).toBeTruthy();
    expect(cfg.customerTooltip).toBeTruthy();
    expect(cfg.partnerTooltip).toBeTruthy();
  });

  it("zelfde input levert zelfde afgeleide status voor elke audience", () => {
    // Admin, klant en partner roepen allemaal deriveItemDisplayStatus aan;
    // er is per definitie maar één resultaat. We bevestigen dit door drie
    // representatieve cases te draaien en te checken dat het label dat elke
    // audience zou tonen consistent uit dezelfde config-key komt.
    const cases: Array<{ item: ProgramRequestItem; expected: keyof typeof itemDisplayStatusConfig }> = [
      { item: makeItem({ status: "pending" } as any), expected: "wacht_op_partner" },
      { item: makeItem({ status: "confirmed" } as any), expected: "wacht_op_klant" },
      {
        item: makeItem({ status: "confirmed", customer_accepted_at: "2024-05-01T10:00:00Z" } as any),
        expected: "geaccepteerd",
      },
      { item: makeItem({ status: "cancelled" } as any), expected: "geannuleerd" },
    ];

    for (const { item, expected } of cases) {
      const derived = deriveItemDisplayStatus(item, ctx);
      expect(derived).toBe(expected);
      const cfg = itemDisplayStatusConfig[derived];
      // Alle drie de audiences delen dezelfde key, dus dezelfde semantiek.
      expect(cfg.adminLabel).toBe(itemDisplayStatusConfig[expected].adminLabel);
      expect(cfg.customerLabel).toBe(itemDisplayStatusConfig[expected].customerLabel);
      expect(cfg.partnerLabel).toBe(itemDisplayStatusConfig[expected].partnerLabel);
    }
  });
});

describe("deriveItemDisplayStatusLoose", () => {
  it("werkt met partiële item-data (partner/planning views) en gebruikt sensible defaults", () => {
    expect(deriveItemDisplayStatusLoose({ status: "pending" })).toBe("wacht_op_partner");
    expect(deriveItemDisplayStatusLoose({ status: "confirmed" })).toBe("wacht_op_klant");
    expect(deriveItemDisplayStatusLoose({
      status: "confirmed",
      customer_accepted_at: "2024-05-01T10:00:00Z",
    })).toBe("geaccepteerd");
    expect(deriveItemDisplayStatusLoose({ status: "cancelled" })).toBe("geannuleerd");
  });

  it("levert hetzelfde resultaat als deriveItemDisplayStatus voor identieke input", () => {
    const item = makeItem({ status: "confirmed", customer_accepted_at: "2024-05-01T10:00:00Z" } as any);
    expect(deriveItemDisplayStatusLoose(item, ctx)).toBe(deriveItemDisplayStatus(item, ctx));
  });
});

describe("regressie: partner-alternatief vraagt opnieuw klant-akkoord", () => {
  // Scenario uit BV-2606-0020: klant gaf bulk-akkoord, partner kwam daarna
  // met andere tijd. Item moet terugvallen op "Akkoord nodig" — niet groen
  // blijven door een achtergebleven customer_approved_at.
  it("status=alternative zonder customer_accepted_at → wacht_op_klant", () => {
    expect(deriveItemDisplayStatus(
      makeItem({
        status: "alternative",
        customer_approved_at: "2024-05-01T10:00:00Z",
        customer_accepted_at: null,
      } as any),
      ctx,
    )).toBe("wacht_op_klant");
  });

  it("status=alternative met verse customer_accepted_at → geaccepteerd", () => {
    expect(deriveItemDisplayStatus(
      makeItem({
        status: "alternative",
        customer_accepted_at: "2024-05-02T10:00:00Z",
      } as any),
      ctx,
    )).toBe("geaccepteerd");
  });
});

describe("regressie: projectfase offerte_verstuurd — partner-respons bepaalt label", () => {
  // Workflow: in de offerte-fase tonen we per item de feitelijke staat:
  //   - bureau-onderdelen → "Bevestigd" (klant_akkoord_bureau)
  //   - partner heeft gereageerd → klant moet akkoord geven (wacht_op_klant)
  //   - partner is nog pending → wacht_op_partner
  const phaseCtx = { ...ctx, quoteStatus: "offerte_verstuurd" };

  it("pending partner-item zonder respons → wacht_op_partner", () => {
    expect(deriveItemDisplayStatus(
      makeItem({ status: "pending" } as any),
      phaseCtx,
    )).toBe("wacht_op_partner");
  });

  it("partner confirmed zonder klant-akkoord → wacht_op_klant", () => {
    expect(deriveItemDisplayStatus(
      makeItem({ status: "confirmed" } as any),
      phaseCtx,
    )).toBe("wacht_op_klant");
  });

  it("partner heeft quoted_price gegeven → wacht_op_klant (re-approval na prijswijziging)", () => {
    expect(deriveItemDisplayStatus(
      makeItem({
        status: "confirmed",
        quoted_price: 190,
        partner_price_change_acknowledged_at: "2024-05-03T10:00:00Z",
      } as any),
      phaseCtx,
    )).toBe("wacht_op_klant");
  });

  it("bureau-item zonder klant-akkoord in offerte-fase → klant_akkoord_bureau", () => {
    expect(deriveItemDisplayStatus(
      makeItem({
        status: "pending",
        provider_id: "bureau",
      } as any),
      phaseCtx,
    )).toBe("klant_akkoord_bureau");
  });

  it("pending item met customer_approved_at in offerte-fase → klant_akkoord_wacht_partner", () => {
    expect(deriveItemDisplayStatus(
      makeItem({
        status: "pending",
        customer_approved_at: "2024-05-01T10:00:00Z",
        customer_accepted_at: "2024-05-01T10:00:00Z",
      } as any),
      phaseCtx,
    )).toBe("klant_akkoord_wacht_partner");
  });

  it("akkoord_ontvangen-fase blijft bestaande logica volgen (pending → wacht_op_partner)", () => {
    expect(deriveItemDisplayStatus(
      makeItem({ status: "pending" } as any),
      { ...ctx, quoteStatus: "akkoord_ontvangen" },
    )).toBe("wacht_op_partner");
  });

  it("zonder quoteStatus-context blijft bestaande logica gelden (backwards-compat)", () => {
    expect(deriveItemDisplayStatus(makeItem({ status: "pending" } as any), ctx))
      .toBe("wacht_op_partner");
  });
});

describe("deriveItemDisplayStatus — pre-offerte fase (concept/in_afstemming)", () => {
  const inAfstemming = { ...ctx, quoteStatus: "in_afstemming" as const };
  const concept = { ...ctx, quoteStatus: "concept" as const };

  it("in_afstemming + pending partner zonder respons → wacht_op_partner", () => {
    expect(deriveItemDisplayStatus(
      makeItem({ status: "pending" } as any),
      inAfstemming,
    )).toBe("wacht_op_partner");
  });

  it("in_afstemming + bureau-item zonder klant-akkoord → klant_akkoord_bureau", () => {
    expect(deriveItemDisplayStatus(
      makeItem({ status: "pending", provider_id: "bureau" } as any),
      inAfstemming,
    )).toBe("klant_akkoord_bureau");
  });

  it("concept + pending partner zonder respons → wacht_op_partner", () => {
    expect(deriveItemDisplayStatus(
      makeItem({ status: "pending" } as any),
      concept,
    )).toBe("wacht_op_partner");
  });

  it("in_afstemming + confirmed → wacht_op_klant", () => {
    expect(deriveItemDisplayStatus(
      makeItem({ status: "confirmed" } as any),
      inAfstemming,
    )).toBe("wacht_op_klant");
  });
});


