import { describe, expect, it } from "vitest";
import {
  acceptanceMatrix,
  agreementsForPartner,
  appliesToPartner,
  currentAgreements,
  daysOpen,
  nextVersion,
  openAgreementsForPartner,
  partnerAgreementState,
  weddingAgreementAccepted,
  type AcceptanceLike,
  type AgreementLike,
  type AgreementPartnerLike,
} from "@/lib/partnerAgreements";

const afspraak = (extra: Partial<AgreementLike> = {}): AgreementLike => ({
  id: extra.id ?? `${extra.key ?? "wedding_referral"}-v${extra.version ?? 1}`,
  key: "wedding_referral",
  version: 1,
  title: "Doorverwijsregeling bruiloften",
  status: "published",
  applies_to: "wedding_referral_partners",
  effective_from: "2026-10-01",
  published_at: "2026-09-30T10:00:00Z",
  ...extra,
});

const akkoord = (agreement_id: string, partner_id: string, version: number, accepted_at = "2026-10-02T09:00:00Z"): AcceptanceLike => ({
  agreement_id,
  partner_id,
  version,
  accepted_at,
});

const paal50: AgreementPartnerLike = { id: "paal-50", name: "Paal 50", is_active: true, receives_wedding_referrals: true };
const seeduyn: AgreementPartnerLike = { id: "strandhotel-seeduyn", name: "WestCord Strandhotel Seeduyn", is_active: true, receives_wedding_referrals: true };
const tuktuk: AgreementPartnerLike = { id: "tuktuk", name: "Tuktuk Vlieland", is_active: true, receives_wedding_referrals: false };
const oud: AgreementPartnerLike = { id: "oud", name: "Oude partner", is_active: false, receives_wedding_referrals: true };

describe("voor wie een afspraak geldt", () => {
  it("bruiloftsafspraken alleen voor partners met de instelling, en nooit voor inactieve partners", () => {
    const a = afspraak();
    expect(appliesToPartner(a, paal50)).toBe(true);
    expect(appliesToPartner(a, tuktuk)).toBe(false);
    expect(appliesToPartner(a, oud)).toBe(false);
    expect(appliesToPartner(afspraak({ applies_to: "all" }), tuktuk)).toBe(true);
  });
});

describe("versies", () => {
  it("neemt per sleutel de laatste gepubliceerde versie en slaat concepten en ingetrokken versies over", () => {
    const alle = [
      afspraak({ version: 1 }),
      afspraak({ version: 2 }),
      afspraak({ version: 3, status: "draft" }),
      afspraak({ key: "samenwerking", version: 1, title: "Samenwerkingsafspraken", applies_to: "all" }),
      afspraak({ key: "samenwerking", version: 2, title: "Samenwerkingsafspraken", applies_to: "all", status: "withdrawn" }),
    ];
    expect(currentAgreements(alle).map((a) => `${a.key}@${a.version}`)).toEqual(["wedding_referral@2", "samenwerking@1"]);
    expect(nextVersion(alle, "wedding_referral")).toBe(4);
    expect(nextVersion(alle, "nieuw")).toBe(1);
  });
});

describe("stand per partner", () => {
  const v1 = afspraak({ version: 1 });
  const v2 = afspraak({ version: 2, published_at: "2026-12-01T10:00:00Z" });

  it("akkoord op de huidige versie, verouderd bij een eerdere versie, anders open", () => {
    const alle = [v1, v2];
    expect(partnerAgreementState(v2, alle, [akkoord(v2.id, "paal-50", 2)], "paal-50").state).toBe("accepted");
    const verouderd = partnerAgreementState(v2, alle, [akkoord(v1.id, "paal-50", 1)], "paal-50");
    expect(verouderd.state).toBe("outdated");
    expect(verouderd.previous?.version).toBe(1);
    expect(partnerAgreementState(v2, alle, [akkoord(v2.id, "strandhotel-seeduyn", 2)], "paal-50").state).toBe("open");
  });

  it("toont een partner alleen de afspraken die voor hem gelden, en meldt wat open staat", () => {
    const alle = [v1, v2, afspraak({ key: "samenwerking", version: 1, title: "Samenwerkingsafspraken", applies_to: "all" })];
    const akkoorden = [akkoord(v1.id, "paal-50", 1)];
    expect(agreementsForPartner(alle, akkoorden, paal50).map((s) => [s.agreement.key, s.state])).toEqual([
      ["wedding_referral", "outdated"],
      ["samenwerking", "open"],
    ]);
    expect(openAgreementsForPartner(alle, akkoorden, paal50)).toHaveLength(2);
    expect(agreementsForPartner(alle, akkoorden, tuktuk).map((s) => s.agreement.key)).toEqual(["samenwerking"]);
  });

  it("de matrix voor de admin telt akkoord en open per afspraak", () => {
    const alle = [v1, v2];
    const rows = acceptanceMatrix(alle, [akkoord(v2.id, "paal-50", 2), akkoord(v1.id, "strandhotel-seeduyn", 1)], [paal50, seeduyn, tuktuk, oud]);
    expect(rows).toHaveLength(1);
    expect(rows[0].partners.map((p) => [p.partner.id, p.state])).toEqual([
      ["paal-50", "accepted"],
      ["strandhotel-seeduyn", "outdated"],
    ]);
    expect(rows[0].accepted).toBe(1);
    expect(rows[0].open).toBe(1);
  });

  it("de doorverwijzing weet of de partner de huidige regeling heeft geaccepteerd", () => {
    const alle = [v1, v2];
    expect(weddingAgreementAccepted(alle, [akkoord(v2.id, "paal-50", 2)], paal50)?.state).toBe("accepted");
    expect(weddingAgreementAccepted(alle, [], paal50)?.state).toBe("open");
    expect(weddingAgreementAccepted([afspraak({ status: "draft" })], [], paal50)).toBeNull();
    expect(weddingAgreementAccepted(alle, [], tuktuk)).toBeNull();
  });
});

describe("dagen open", () => {
  it("rekent vanaf publicatie, of vanaf de ingangsdatum als die later ligt", () => {
    expect(daysOpen(afspraak({ published_at: "2026-09-20T10:00:00Z", effective_from: "2026-09-01" }), "2026-09-30")).toBe(10);
    expect(daysOpen(afspraak({ published_at: "2026-09-20T10:00:00Z", effective_from: "2026-10-01" }), "2026-10-15")).toBe(14);
    expect(daysOpen(afspraak({ published_at: null, effective_from: "2026-10-01" }), "2026-09-15")).toBe(0);
  });
});
