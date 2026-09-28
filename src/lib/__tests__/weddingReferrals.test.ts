import { describe, expect, it } from "vitest";
import {
  anonymizePatch,
  applyStatusChange,
  buildControlList,
  computeReferralFee,
  controlListCsv,
  effectiveWeddingDate,
  expiryDateFor,
  formatWeddingDate,
  isDueForAnonymization,
  referralsToExpire,
  seasonOf,
  shouldExpire,
  summarizeBySeason,
  validateFeeOverride,
  type ReferralLike,
} from "@/lib/weddingReferrals";
import { DEFAULT_FEE_TIERS } from "@/lib/weddingReferralFee";

const staffels = [
  { id: "s-2026", effective_from: "2026-01-01", tiers: DEFAULT_FEE_TIERS, multi_day_surcharge: 250 },
  { id: "s-2027", effective_from: "2027-01-01", tiers: [{ max_guests: null, fee: 999 }], multi_day_surcharge: 0 },
];

let teller = 0;
const doorverwijzing = (extra: Partial<ReferralLike> = {}): ReferralLike => ({
  id: `r-${++teller}`,
  partner_id: "paal-50",
  couple_names: "Anna & Bram",
  couple_email: "anna@example.com",
  couple_phone: "0612345678",
  requested_at: "2026-03-01",
  referred_at: "2026-03-05",
  expires_at: "2027-09-05",
  expected_wedding_date: "2027-06-12",
  expected_wedding_precision: "day",
  estimated_guests: 80,
  notes: "",
  status: "referred",
  status_changed_at: "2026-03-05T10:00:00Z",
  final_wedding_date: null,
  final_day_guests: null,
  is_multi_day: false,
  fee_schedule_id: null,
  fee_calculated_amount: null,
  fee_amount: null,
  fee_override_note: "",
  invoice_status: "not_applicable",
  invoice_number: null,
  invoice_date: null,
  invoice_paid_at: null,
  anonymized_at: null,
  ...extra,
});

describe("vervallen", () => {
  it("de vervaldatum ligt 18 maanden na de datum doorverwezen", () => {
    expect(expiryDateFor("2026-03-05")).toBe("2027-09-05");
    expect(expiryDateFor("2026-08-31")).toBe("2028-02-29");
  });

  it("vervalt pas ná de vervaldatum, en alleen vanuit 'doorverwezen'", () => {
    const r = doorverwijzing({ expires_at: "2027-09-05" });
    expect(shouldExpire(r, "2027-09-04")).toBe(false);
    expect(shouldExpire(r, "2027-09-05")).toBe(false);
    expect(shouldExpire(r, "2027-09-06")).toBe(true);
    expect(shouldExpire({ ...r, status: "booked" }, "2028-01-01")).toBe(false);
    expect(shouldExpire({ ...r, status: "not_proceeded" }, "2028-01-01")).toBe(false);
  });

  it("geeft de ids terug die vandaag moeten vervallen", () => {
    const oud = doorverwijzing({ id: "oud", expires_at: "2027-01-01" });
    const geboekt = doorverwijzing({ id: "geboekt", status: "booked", expires_at: "2027-01-01" });
    const vers = doorverwijzing({ id: "vers", expires_at: "2028-01-01" });
    expect(referralsToExpire([oud, geboekt, vers], "2027-06-01")).toEqual(["oud"]);
  });
});

describe("statusovergangen", () => {
  it("naar geboekt legt de vergoeding van de staffel op datum doorverwezen vast en zet 'te factureren'", () => {
    const r = doorverwijzing({ final_day_guests: 120, is_multi_day: true });
    const uitkomst = applyStatusChange(r, "booked", staffels);
    expect(uitkomst).toEqual({
      ok: true,
      patch: {
        status: "booked",
        fee_schedule_id: "s-2026",
        fee_calculated_amount: 1000,
        fee_amount: 1000,
        fee_override_note: "",
        invoice_status: "to_invoice",
      },
    });
  });

  it("gebruikt de staffel van de datum doorverwezen, niet die van vandaag", () => {
    const r = doorverwijzing({ referred_at: "2027-02-01", final_day_guests: 10 });
    const uitkomst = applyStatusChange(r, "booked", staffels);
    expect(uitkomst.ok && uitkomst.patch.fee_schedule_id).toBe("s-2027");
    expect(uitkomst.ok && uitkomst.patch.fee_amount).toBe(999);
  });

  it("weigert geboekt zonder aantal daggasten of zonder geldende staffel", () => {
    expect(applyStatusChange(doorverwijzing(), "booked", staffels)).toEqual({ ok: false, error: "Vul het definitieve aantal daggasten in." });
    const teVroeg = doorverwijzing({ referred_at: "2025-06-01", final_day_guests: 20 });
    const uitkomst = applyStatusChange(teVroeg, "booked", staffels);
    expect(uitkomst).toMatchObject({ ok: false, error: expect.stringMatching(/geen staffel/) });
  });

  it("behoudt een handmatig overschreven bedrag met opmerking", () => {
    const r = doorverwijzing({ final_day_guests: 40, fee_amount: 300, fee_override_note: "Korting afgesproken" });
    const uitkomst = applyStatusChange(r, "booked", staffels);
    expect(uitkomst.ok && uitkomst.patch.fee_calculated_amount).toBe(350);
    expect(uitkomst.ok && uitkomst.patch.fee_amount).toBe(300);
    expect(uitkomst.ok && uitkomst.patch.fee_override_note).toBe("Korting afgesproken");
  });

  it("weg van geboekt maakt vergoeding en factuurstatus leeg", () => {
    const r = doorverwijzing({ status: "booked", final_day_guests: 40, fee_schedule_id: "s-2026", fee_calculated_amount: 350, fee_amount: 350, invoice_status: "to_invoice" });
    expect(applyStatusChange(r, "not_proceeded", staffels)).toEqual({
      ok: true,
      patch: { status: "not_proceeded", fee_schedule_id: null, fee_calculated_amount: null, fee_amount: null, fee_override_note: "", invoice_status: "not_applicable" },
    });
  });

  it("blokkeert een statuswijziging zodra er gefactureerd of betaald is", () => {
    const gefactureerd = doorverwijzing({ status: "booked", fee_amount: 350, invoice_status: "invoiced" });
    expect(applyStatusChange(gefactureerd, "not_proceeded", staffels).ok).toBe(false);
    const betaald = doorverwijzing({ status: "booked", fee_amount: 350, invoice_status: "paid" });
    expect(applyStatusChange(betaald, "referred", staffels).ok).toBe(false);
  });

  it("dezelfde status is geen wijziging", () => {
    expect(applyStatusChange(doorverwijzing(), "referred", staffels)).toEqual({ ok: true, patch: {} });
  });

  it("een afwijkende vergoeding vraagt om een opmerking", () => {
    expect(validateFeeOverride(350, 350, "")).toBeNull();
    expect(validateFeeOverride(300, 350, "")).toMatch(/opmerking/);
    expect(validateFeeOverride(300, 350, "Korting")).toBeNull();
    expect(validateFeeOverride(null, 350, "")).toBeNull();
  });
});

describe("trouwdatum en seizoen", () => {
  it("neemt de definitieve trouwdatum, anders de verwachte; bij alleen een maand het einde van de maand", () => {
    expect(effectiveWeddingDate(doorverwijzing())).toBe("2027-06-12");
    expect(effectiveWeddingDate(doorverwijzing({ final_wedding_date: "2027-06-14" }))).toBe("2027-06-14");
    expect(effectiveWeddingDate(doorverwijzing({ expected_wedding_date: "2027-06-01", expected_wedding_precision: "month" }))).toBe("2027-06-30");
    expect(effectiveWeddingDate(doorverwijzing({ expected_wedding_date: null }))).toBeNull();
  });

  it("bepaalt het seizoen uit de trouwdatum en anders uit de datum doorverwezen", () => {
    expect(seasonOf(doorverwijzing())).toBe(2027);
    expect(seasonOf(doorverwijzing({ expected_wedding_date: null }))).toBe(2026);
  });

  it("toont een dag, een maand of een streepje", () => {
    expect(formatWeddingDate(doorverwijzing())).toBe("12 jun. 2027");
    expect(formatWeddingDate(doorverwijzing({ expected_wedding_date: "2027-06-01", expected_wedding_precision: "month" }))).toBe("juni 2027");
    expect(formatWeddingDate(doorverwijzing({ expected_wedding_date: null }))).toBe("–");
  });
});

describe("samenvatting per partner per seizoen", () => {
  it("telt statussen en sommeert bedragen per factuurstatus", () => {
    const rows = [
      doorverwijzing(),
      doorverwijzing({ status: "booked", fee_amount: 350, invoice_status: "to_invoice" }),
      doorverwijzing({ status: "booked", fee_amount: 550, invoice_status: "invoiced" }),
      doorverwijzing({ status: "booked", fee_amount: 800, invoice_status: "paid" }),
      doorverwijzing({ status: "not_proceeded" }),
      doorverwijzing({ status: "expired" }),
      doorverwijzing({ partner_id: "island-events", expected_wedding_date: "2026-09-01", status: "booked", fee_amount: 750, invoice_status: "paid" }),
    ];
    const samenvatting = summarizeBySeason(rows, { "paal-50": "Paal 50", "island-events": "Island Events" });
    expect(samenvatting).toEqual([
      { partnerId: "paal-50", partnerName: "Paal 50", season: 2027, referred: 1, booked: 3, notProceeded: 1, expired: 1, toInvoice: 350, invoiced: 550, paid: 800 },
      { partnerId: "island-events", partnerName: "Island Events", season: 2026, referred: 0, booked: 1, notProceeded: 0, expired: 0, toInvoice: 0, invoiced: 0, paid: 750 },
    ]);
  });
});

describe("controlelijst", () => {
  it("bevat alleen 'doorverwezen' met een verstreken (verwachte) trouwdatum, per partner", () => {
    const verstreken = doorverwijzing({ id: "verstreken", expected_wedding_date: "2026-06-12" });
    const maandVoorbij = doorverwijzing({ id: "maand", expected_wedding_date: "2026-05-01", expected_wedding_precision: "month" });
    const maandLoopt = doorverwijzing({ id: "loopt", expected_wedding_date: "2026-07-01", expected_wedding_precision: "month" });
    const toekomst = doorverwijzing({ id: "toekomst" });
    const geboekt = doorverwijzing({ id: "geboekt", status: "booked", expected_wedding_date: "2026-06-12" });
    const zonderDatum = doorverwijzing({ id: "geen", expected_wedding_date: null });
    const andere = doorverwijzing({ id: "andere", partner_id: "island-events", expected_wedding_date: "2026-06-12" });
    const alle = [toekomst, verstreken, maandVoorbij, maandLoopt, geboekt, zonderDatum, andere];
    expect(buildControlList(alle, "2026-07-15").map((r) => r.id)).toEqual(["andere", "maand", "verstreken"]);
    expect(buildControlList(alle, "2026-07-15", "paal-50").map((r) => r.id)).toEqual(["maand", "verstreken"]);
  });

  it("maakt een puntkomma-CSV met kopregel en ontsnapte waarden", () => {
    const csv = controlListCsv([doorverwijzing({ notes: 'Belt zelf; "misschien"' })], "Paal 50");
    const regels = csv.split("\n");
    expect(regels[0]).toBe("Partner;Bruidspaar;E-mail;Telefoon;Datum aanvraag;Datum doorverwezen;Verwachte trouwdatum;Geschat aantal gasten;Vervaldatum;Notities");
    expect(regels[1]).toBe('Paal 50;Anna & Bram;anna@example.com;0612345678;2026-03-01;2026-03-05;12 jun. 2027;80;2027-09-05;"Belt zelf; ""misschien"""');
  });
});

describe("anonimiseren", () => {
  it("komt 2 jaar na betaling of na niet doorgegaan/vervallen in aanmerking, nooit tijdens de looptijd", () => {
    const betaald = doorverwijzing({ status: "booked", fee_amount: 350, invoice_status: "paid", invoice_paid_at: "2026-09-01" });
    expect(isDueForAnonymization(betaald, "2028-08-31")).toBe(false);
    expect(isDueForAnonymization(betaald, "2028-09-01")).toBe(true);
    const nietDoorgegaan = doorverwijzing({ status: "not_proceeded", status_changed_at: "2026-04-01T10:00:00Z" });
    expect(isDueForAnonymization(nietDoorgegaan, "2028-04-01")).toBe(true);
    expect(isDueForAnonymization(doorverwijzing(), "2030-01-01")).toBe(false);
    expect(isDueForAnonymization({ ...betaald, anonymized_at: "2028-09-02T00:00:00Z" }, "2029-01-01")).toBe(false);
    const geboektOnbetaald = doorverwijzing({ status: "booked", fee_amount: 350, invoice_status: "invoiced" });
    expect(isDueForAnonymization(geboektOnbetaald, "2030-01-01")).toBe(false);
  });

  it("wist alleen de persoonsgegevens", () => {
    const patch = anonymizePatch(new Date("2028-09-02T09:00:00Z"));
    expect(patch).toEqual({ couple_names: "Geanonimiseerd", couple_email: null, couple_phone: null, notes: "", anonymized_at: "2028-09-02T09:00:00.000Z" });
    expect(Object.keys(patch)).not.toContain("fee_amount");
    expect(Object.keys(patch)).not.toContain("partner_id");
  });
});

describe("vastgelegde staffel", () => {
  it("een geboekte doorverwijzing blijft aan haar eigen staffel hangen, ook als er een eerdere ingangsdatum bijkomt", () => {
    const r = doorverwijzing({ referred_at: "2026-06-01", final_day_guests: 20, is_multi_day: false });
    const metNieuwe = [...staffels, { id: "s-terugwerkend", effective_from: "2026-05-01", tiers: [{ max_guests: null, fee: 1 }], multi_day_surcharge: 0 }];
    const los = applyStatusChange(r, "booked", metNieuwe);
    expect(los.ok && los.patch.fee_schedule_id).toBe("s-terugwerkend");
    const vast = computeReferralFee(r, metNieuwe, "s-2026");
    expect(vast.ok && vast.schedule.id).toBe("s-2026");
    expect(vast.ok && vast.calculation.total).toBe(350);
  });
});
