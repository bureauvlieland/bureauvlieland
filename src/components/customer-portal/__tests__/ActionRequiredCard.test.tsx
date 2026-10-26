// @vitest-environment jsdom
//
// De actiekaart bepaalt wat de klant als eerste ziet. Sinds fase 4 van het
// klantreisplan stuurt zij vanaf het verstuurde voorstel naar "Akkoord en
// ondertekenen", en na het akkoord naar de handtekening, zonder te wachten op
// de aanbieders. Deze tests borgen die volgorde.

import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { ActionRequiredCard } from "../ActionRequiredCard";

afterEach(cleanup);

const future = [new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)];

const base = {
  isMultiDay: false,
  hasAccommodation: false,
  billingComplete: false,
  termsAccepted: false,
  onOpenBilling: vi.fn(),
  programPublishedAt: "2026-10-01T10:00:00Z",
  selectedDates: future,
  completionStatus: "in_progress",
  cancelledAt: null,
};

describe("ActionRequiredCard: akkoord en ondertekenen", () => {
  it("stuurt in de voorstelfase naar akkoord en ondertekenen, ook zonder facturatiegegevens", () => {
    const onScrollToTerms = vi.fn();
    render(
      <ActionRequiredCard
        {...base}
        quoteStatus="offerte_verstuurd"
        statusSummary={{ total: 4, confirmed: 0, pending: 4, alternative: 0 }}
        customerActionsCount={4}
        canSignNow
        onScrollToTerms={onScrollToTerms}
      />,
    );
    expect(screen.getByText("Uw voorstel staat klaar: geef akkoord en onderteken")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /akkoord en ondertekenen/i }));
    expect(onScrollToTerms).toHaveBeenCalledTimes(1);
  });

  it("meldt een verlopen voorstel in plaats van een akkoordknop", () => {
    render(
      <ActionRequiredCard
        {...base}
        quoteStatus="offerte_verstuurd"
        statusSummary={{ total: 2, confirmed: 0, pending: 2, alternative: 0 }}
        canSignNow={false}
        proposalExpired
        onScrollToTerms={vi.fn()}
      />,
    );
    expect(screen.getByText("Uw voorstel is verlopen")).toBeTruthy();
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("vraagt na het akkoord om de handtekening, vóór het wachten op aanbieders", () => {
    render(
      <ActionRequiredCard
        {...base}
        quoteStatus="akkoord_ontvangen"
        statusSummary={{ total: 3, confirmed: 1, pending: 2, alternative: 0 }}
        customerActionsCount={0}
        canSignNow
        onScrollToTerms={vi.fn()}
      />,
    );
    expect(screen.getByText("Onderteken nog de voorwaarden")).toBeTruthy();
    expect(screen.getByText(/onder voorbehoud/)).toBeTruthy();
  });

  it("laat een open partnervoorstel vóórgaan op de handtekening", () => {
    render(
      <ActionRequiredCard
        {...base}
        quoteStatus="akkoord_ontvangen"
        statusSummary={{ total: 3, confirmed: 1, pending: 1, alternative: 1 }}
        customerActionsCount={1}
        alternativeActionsCount={1}
        pendingApprovalNames={["Wadexcursie"]}
        canSignNow={false}
        onScrollToTerms={vi.fn()}
      />,
    );
    expect(screen.getByText("Eén onderdeel wacht op uw akkoord")).toBeTruthy();
    expect(screen.queryByText("Onderteken nog de voorwaarden")).toBeNull();
  });

  it("toont na alle bevestigingen de handtekening, zonder aparte facturatiestap", () => {
    render(
      <ActionRequiredCard
        {...base}
        quoteStatus="definitief_bevestigd"
        statusSummary={{ total: 3, confirmed: 3, pending: 0, alternative: 0 }}
        customerActionsCount={0}
        canSignNow
        onScrollToTerms={vi.fn()}
      />,
    );
    expect(screen.getByText("Programma gereed voor ondertekening")).toBeTruthy();
    expect(screen.getByRole("button", { name: /ondertekenen/i })).toBeTruthy();
    expect(screen.queryByText("Facturatiegegevens invullen")).toBeNull();
  });

  it("is klaar zodra er getekend is", () => {
    render(
      <ActionRequiredCard
        {...base}
        termsAccepted
        billingComplete
        quoteStatus="definitief_bevestigd"
        statusSummary={{ total: 3, confirmed: 3, pending: 0, alternative: 0 }}
        customerActionsCount={0}
      />,
    );
    expect(screen.getByText("Uw boeking is compleet")).toBeTruthy();
  });
});
