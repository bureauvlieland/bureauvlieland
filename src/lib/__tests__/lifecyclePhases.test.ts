import { describe, it, expect } from "vitest";
import {
  getItemPhase,
  getProjectPhase,
  getProjectPhaseInfo,
  getItemPhaseInfo,
  type ItemForLifecycle,
  type ProjectForLifecycle,
} from "@/lib/lifecycle";

const project = (over: Partial<ProjectForLifecycle> = {}): ProjectForLifecycle => ({ ...over });
const item = (over: Partial<ItemForLifecycle> = {}): ItemForLifecycle => ({ ...over });

describe("getItemPhase", () => {
  it("geannuleerd wint op alles", () => {
    expect(getItemPhase(item({ status: "cancelled", invoiced_date: "2026-05-01" }), {})).toBe(
      "geannuleerd",
    );
    expect(getItemPhase(item({ status: "confirmed" }), { cancelled_at: "2026-05-01" })).toBe(
      "geannuleerd",
    );
  });

  it("gefactureerd gaat voor uitgevoerd", () => {
    expect(
      getItemPhase(item({ invoiced_date: "2026-06-01", executed_at: "2026-05-20" }), {}),
    ).toBe("gefactureerd");
    expect(getItemPhase(item({ status: "invoiced" }), {})).toBe("gefactureerd");
  });

  it("uitgevoerd op basis van executed_at of status", () => {
    expect(getItemPhase(item({ executed_at: "2026-05-20" }), {})).toBe("uitgevoerd");
    expect(getItemPhase(item({ status: "executed" }), {})).toBe("uitgevoerd");
  });

  it("mapt tegenvoorstellen en niet-beschikbaar", () => {
    expect(getItemPhase(item({ status: "unavailable" }), {})).toBe("niet_beschikbaar");
    expect(getItemPhase(item({ status: "counter_proposed" }), {})).toBe("tegenvoorstel_klant");
    expect(getItemPhase(item({ status: "alternative" }), {})).toBe("tegenvoorstel_partner");
  });

  it("bevestigd via status of item_quote_status", () => {
    expect(getItemPhase(item({ status: "confirmed" }), {})).toBe("bevestigd");
    expect(getItemPhase(item({ status: "accepted" }), {})).toBe("bevestigd");
    expect(getItemPhase(item({ status: "pending", item_quote_status: "bevestigd" }), {})).toBe(
      "bevestigd",
    );
  });

  it("toont 'wacht op klant' tijdens de offertefase in plaats van concept", () => {
    const notReleased = item({ status: "pending", skip_partner_notification: true });
    expect(getItemPhase(notReleased, { quote_status: "offerte_verstuurd" })).toBe("wacht_klant");
    expect(getItemPhase(notReleased, { quote_status: "concept" })).toBe("concept");
  });

  it("wacht op partner zodra de klant het onderdeel heeft vrijgegeven", () => {
    expect(
      getItemPhase(
        item({
          status: "pending",
          skip_partner_notification: true,
          customer_approved_at: "2026-05-02",
        }),
        { quote_status: "offerte_verstuurd" },
      ),
    ).toBe("wacht_partner");
    expect(getItemPhase(item({ status: "pending" }), {})).toBe("wacht_partner");
  });

  it("valt terug op concept bij onbekende status", () => {
    expect(getItemPhase(item({ status: "draft" }), {})).toBe("concept");
    expect(getItemPhase(item(), {})).toBe("concept");
  });
});

describe("getProjectPhase", () => {
  it("geannuleerd en afgerond gaan voor item-afgeleide fases", () => {
    expect(getProjectPhase(project({ status: "cancelled" }), [])).toBe("geannuleerd");
    expect(getProjectPhase(project({ cancelled_at: "2026-05-01" }), [])).toBe("geannuleerd");
    expect(getProjectPhase(project({ completion_status: "fully_invoiced" }), [])).toBe("afgerond");
    expect(getProjectPhase(project({ completion_status: "completed" }), [])).toBe("afgerond");
  });

  it("facturatie bij klaar-voor-factuur en deels gefactureerd", () => {
    expect(getProjectPhase(project({ completion_status: "ready_for_invoice" }), [])).toBe(
      "facturatie",
    );
    expect(getProjectPhase(project({ completion_status: "partially_invoiced" }), [])).toBe(
      "facturatie",
    );
  });

  it("uitvoering wanneer alle actieve onderdelen bevestigd zijn na klant-akkoord", () => {
    expect(
      getProjectPhase(project({ quote_status: "akkoord_ontvangen", terms_accepted_at: "2026-05-03", billing_company_name: "Scherp BV" }), [
        item({ status: "confirmed" }),
        item({ status: "cancelled" }),
      ]),
    ).toBe("uitvoering");
  });

  it("klant_actie_voorwaarden bij ontbrekende voorwaarden of factuurgegevens", () => {
    expect(
      getProjectPhase(project({ quote_status: "akkoord_ontvangen", billing_company_name: "Scherp BV" }), [
        item({ status: "pending" }),
      ]),
    ).toBe("klant_actie_voorwaarden");
    expect(
      getProjectPhase(project({ quote_status: "akkoord_ontvangen", terms_accepted_at: "2026-05-03" }), [
        item({ status: "pending" }),
      ]),
    ).toBe("klant_actie_voorwaarden");
  });

  it("klant_actie_voorwaarden zolang gekoppelde logies nog niet gekozen is", () => {
    expect(
      getProjectPhase(
        project({
          quote_status: "akkoord_ontvangen",
          terms_accepted_at: "2026-05-03",
          billing_company_name: "Scherp BV",
          linked_accommodation_id: "acc-1",
          hasSelectedAccommodation: false,
        }),
        [item({ status: "pending" })],
      ),
    ).toBe("klant_actie_voorwaarden");
  });

  it("partners_wachten wanneer onderdelen bij de partner liggen", () => {
    expect(
      getProjectPhase(
        project({
          quote_status: "akkoord_ontvangen",
          terms_accepted_at: "2026-05-03",
          billing_company_name: "Scherp BV",
        }),
        [item({ status: "pending" }), item({ status: "confirmed" })],
      ),
    ).toBe("partners_wachten");
  });

  it("partners_benaderen wanneer er nog concepten open staan", () => {
    expect(
      getProjectPhase(
        project({
          quote_status: "akkoord_ontvangen",
          terms_accepted_at: "2026-05-03",
          billing_company_name: "Scherp BV",
        }),
        [item({ status: "confirmed" }), item({ status: "draft" })],
      ),
    ).toBe("partners_benaderen");
  });

  it("klant_actie_offerte zolang de offerte bij de klant ligt", () => {
    expect(
      getProjectPhase(project({ quote_status: "offerte_verstuurd" }), [
        item({ status: "pending", skip_partner_notification: true }),
      ]),
    ).toBe("klant_actie_offerte");
  });

  it("concept als er nog niets verstuurd is", () => {
    expect(getProjectPhase(project(), [item({ status: "draft" })])).toBe("concept");
    expect(getProjectPhase(project(), [])).toBe("concept");
  });
});

describe("phase-info helpers", () => {
  it("geeft een label en kleur mee voor project- en itemfases", () => {
    const proj = getProjectPhaseInfo(project({ completion_status: "completed" }), []);
    expect(proj.phase).toBe("afgerond");
    expect(proj.config.label).toBeTruthy();

    const it1 = getItemPhaseInfo(item({ status: "confirmed" }), {});
    expect(it1.phase).toBe("bevestigd");
    expect(it1.config.label).toBeTruthy();
  });
});
