/**
 * Eén berekening van de klantfactuur van een project
 * (docs/plan-inkoopfacturen-doorbelasten.md, §3.4, fase 3).
 *
 * Tot 18 oktober 2026 rekenden zes plekken het projecttotaal elk anders uit:
 * het financieel overzicht op het project, de facturatiepagina, het
 * factuurvoorbeeld en de PDF, het klantportaal, de SQL-trigger voor de
 * voltooiingsstatus en de marge. Deze module is sindsdien de enige bron: zij
 * bouwt de regels, de btw-groepen en de totalen; de schermen tonen ze.
 *
 * Regels:
 *  - Klantregels aanwezig op een onderdeel (uit inkoop of met de hand) =
 *    klantregels leidend; anders de weergaveprijs (`getDisplayLineTotal`):
 *    een openstaande prijswijziging van het bureau wint van de oude
 *    partnerbevestiging, zoals de klant hem in het portaal ziet.
 *  - Btw per onderdeel uit de bouwsteen, anders het eigen tarief, anders het
 *    standaardtarief. Klantregels dragen hun eigen tarief en bedragen.
 *  - Logies: kamerprijs tegen het tarief van de offerte, extra's elk tegen hun
 *    eigen tarief. Logies dat de accommodatie rechtstreeks factureert telt niet.
 *  - Fees: organisatiefee en opslag centrale facturatie uit de fee-engine als
 *    er een (gesnapshotte) structuur is, anders de oude schaal en opslag per
 *    persoon; toeristenbelasting en natuurbijdrage uit de instellingen (0 %);
 *    wijzigingsrondes als eigen regel (standaardtarief). Uitgesloten posten
 *    (`excluded_fees`) tellen niet.
 *  - Btw-groepen uit de regels: excl. per groep afgerond, btw = incl. − excl.,
 *    zodat excl. + btw per groep exact het incl.-bedrag is.
 */

import { getDisplayLineTotal, getNumberOfDays, isPerDayItem, isPerPersonItem, getEffectivePeople } from "@/lib/portalPricing";
import { computeProjectFees, type FeeBreakdown } from "@/lib/feeEngine";
import { isFeeExcluded, type ExcludableFeeKey } from "@/lib/excludedFees";
import { resolveItemVatRate } from "@/lib/itemVatRate";
import { categoryLabels } from "@/types/buildingBlock";
import type { FeeStructureSet } from "@/types/pricing";
import type { FeeTier } from "@/types/appSettings";

const round2 = (n: number) => Math.round(n * 100) / 100;

export interface SpecRequestInput {
  number_of_people: number;
  selected_dates?: string[] | null;
  invoicing_mode?: string | null;
  excluded_fees?: string[] | null;
  /** Datum van de aanvraag; bepaalt de spoedtoeslag. */
  created_at?: string | null;
  reference_number?: string | null;
}

export interface SpecItemInput {
  id: string;
  block_id?: string | null;
  block_name: string;
  block_category?: string | null;
  block_type?: string | null;
  provider_name?: string | null;
  provider_id?: string | null;
  status: string;
  day_index: number;
  quoted_price: number | null;
  admin_price_override?: number | null;
  admin_price_notes?: string | null;
  admin_price_override_updated_at?: string | null;
  partner_price_change_acknowledged_at?: string | null;
  quoted_at?: string | null;
  price_type?: string | null;
  override_people?: number | null;
  override_children?: number | null;
  child_unit_price?: number | null;
  vat_rate?: number | null;
  booking_reference?: string | null;
}

export interface SpecBillingLineInput {
  id?: string;
  item_id: string;
  description: string;
  quantity: number;
  unit_price_excl_vat: number;
  vat_rate: number;
  amount_excl_vat: number;
  vat_amount: number;
  amount_incl_vat: number;
  source?: string | null;
}

export interface SpecExtraInput {
  id?: string;
  name: string;
  description?: string | null;
  quantity: number;
  unit_price: number;
  pricing_type: string | null;
  vat_rate?: number | null;
}

export interface SpecAccommodationInput {
  id?: string;
  accommodation_name: string;
  partner_name?: string | null;
  price_total: number;
  vat_rate?: number | null;
  nights?: number | null;
  extras: SpecExtraInput[];
}

export interface SpecSettingsInput {
  coordination_fee_tiers?: FeeTier[] | null;
  tourist_tax_pp_per_day: number;
  nature_contribution_pp: number;
  bureau_central_surcharge_pp: number;
  default_vat_rate?: number | null;
  accommodation_vat_rate?: number | null;
}

export interface SpecInvoiceInput {
  amount_excl_vat: number;
  vat_amount: number;
  amount_incl_vat: number | null;
  invoice_type: string;
}

export interface BuildSpecInput {
  request: SpecRequestInput;
  items: SpecItemInput[];
  linesByItem?: Record<string, SpecBillingLineInput[]>;
  blockVatRates?: Record<string, number>;
  accommodation?: SpecAccommodationInput | null;
  settings: SpecSettingsInput;
  /** Opgeloste feestructuur (snapshot wint). Zonder structuur: de oude schaal. */
  feeStructure?: FeeStructureSet | null;
  revisionFeesTotal?: number;
  invoices?: SpecInvoiceInput[];
  /** Identieke logies-extra's samenvoegen tot één regel (factuur en PDF). */
  bundleExtras?: boolean;
  /** Aantal dagen als de datums niet beschikbaar zijn (klantportaal). */
  numberOfDays?: number;
}

export type SpecLineKind = "program" | "extra_cost" | "lodging" | "lodging_extra" | "fee" | "revision";

export interface SpecSubLine {
  id?: string;
  description: string;
  quantity: number;
  unitPriceExclVat: number;
  vatRate: number;
  amountExclVat: number;
  vatAmount: number;
  amountInclVat: number;
  source?: string | null;
}

export interface SpecLine {
  key: string;
  kind: SpecLineKind;
  feeKey?: ExcludableFeeKey;
  /** Kop op de factuur: categorie van het onderdeel, Logies, Extra's bij logies, Coördinatie & bijdragen. */
  section: string;
  itemId?: string;
  item?: SpecItemInput;
  description: string;
  subDescription?: string;
  quantity: number;
  /** Tekst in de kolom Aantal, bv. "20", "20×2d", "1". */
  quantityLabel: string;
  unitPriceInclVat: number;
  unitSuffix: "" | "p.p." | "p.p.p.d.";
  vatRate: number;
  amountExclVat: number;
  vatAmount: number;
  amountInclVat: number;
  /** Klantregels (uit inkoop of met de hand) die de prijs van dit onderdeel vormen. */
  subLines?: SpecSubLine[];
  /** Prijs van het bureau zonder partnerbevestiging. */
  isPreliminary?: boolean;
  /** Aantal gebundelde identieke extra's. */
  bundleCount?: number;
}

export interface SpecVatGroup {
  rate: number;
  exclVat: number;
  vatAmount: number;
  inclVat: number;
}

export interface SpecTotals {
  programItems: number;
  extraCosts: number;
  lodging: number;
  lodgingExtras: number;
  coordinationFee: number;
  centralSurcharge: number;
  revisionFees: number;
  touristTax: number;
  natureContribution: number;
  exclVat: number;
  vat: number;
  inclVat: number;
  /** Netto geregistreerd (creditnota's negatief). */
  invoiced: number;
  outstanding: number;
}

export interface ProjectInvoiceSpec {
  lines: SpecLine[];
  sections: Array<{ label: string; lines: SpecLine[] }>;
  vatGroups: SpecVatGroup[];
  totals: SpecTotals;
  feeBreakdown?: FeeBreakdown;
  /** Onderdelen zonder prijs: niet op de factuur, wel te melden. */
  unpricedItems: SpecItemInput[];
  /** Zelf geregelde onderdelen: niet op de factuur. */
  selfArrangedItems: SpecItemInput[];
  numberOfPeople: number;
  numberOfDays: number;
  isBureauCentral: boolean;
  /** Logies rechtstreeks door de accommodatie gefactureerd. */
  accommodationBilledDirectly: boolean;
}

const FEE_SECTION = "Coördinatie & bijdragen";
const LODGING_SECTION = "Logies";
const LODGING_EXTRAS_SECTION = "Extra's bij logies";

/** Volgorde van de categorieën op de factuur, zoals het voorbeeld die altijd had. */
const CATEGORY_ORDER = ["locaties", "catering", "outdoor", "excursies", "entertainment", "vervoer", "overig", "services"];

export const sectionLabelForCategory = (category: string | null | undefined): string => {
  const cat = category || "overig";
  return (categoryLabels as Record<string, string>)[cat] || cat.charAt(0).toUpperCase() + cat.slice(1);
};

const exclFromIncl = (incl: number, rate: number) => (rate > 0 ? incl / (1 + rate / 100) : incl);

const inclLine = (base: Omit<SpecLine, "amountExclVat" | "vatAmount">): SpecLine => {
  const excl = exclFromIncl(base.amountInclVat, base.vatRate);
  return { ...base, amountExclVat: excl, vatAmount: base.amountInclVat - excl };
};

/** Legacy schaal voor de coördinatiefee: eerste staffel waar het aantal in past. */
export function legacyCoordinationFee(tiers: FeeTier[] | null | undefined, people: number): number {
  if (!Array.isArray(tiers) || tiers.length === 0) return 0;
  const sorted = [...tiers].sort((a, b) => a.maxPeople - b.maxPeople);
  return sorted.find((t) => people <= t.maxPeople)?.fee ?? 0;
}

export function buildProjectInvoiceSpec(input: BuildSpecInput): ProjectInvoiceSpec {
  const {
    request,
    items,
    linesByItem = {},
    blockVatRates = {},
    accommodation,
    settings,
    feeStructure,
    revisionFeesTotal = 0,
    invoices = [],
    bundleExtras = true,
  } = input;

  const people = Number(request.number_of_people) || 0;
  const days = input.numberOfDays && input.numberOfDays > 0 ? input.numberOfDays : getNumberOfDays(request.selected_dates ?? undefined);
  const standardRate = Number(settings.default_vat_rate ?? 21);
  const excluded = request.excluded_fees ?? null;
  const isBureauCentral = request.invoicing_mode === "bureau_central";
  const lines: SpecLine[] = [];
  const unpricedItems: SpecItemInput[] = [];
  const selfArrangedItems: SpecItemInput[] = [];

  // ── Onderdelen (programma en overige kosten) ────────────────────────────
  const activeItems = items.filter((it) => it.status !== "cancelled");
  for (const item of activeItems) {
    if (item.block_type === "self_arranged") {
      selfArrangedItems.push(item);
      continue;
    }
    const kind: SpecLineKind = item.day_index === -1 ? "extra_cost" : "program";
    const section = sectionLabelForCategory(item.block_category);
    const billing = linesByItem[item.id];
    const subInfo = [item.provider_name, item.booking_reference ? `Boekingsnr: ${item.booking_reference}` : null]
      .filter(Boolean)
      .join(" • ");

    if (Array.isArray(billing) && billing.length > 0) {
      const subLines: SpecSubLine[] = billing.map((l) => ({
        id: l.id,
        description: l.description || "Regel",
        quantity: Number(l.quantity) || 1,
        unitPriceExclVat: Number(l.unit_price_excl_vat) || 0,
        vatRate: Number(l.vat_rate) || 0,
        amountExclVat: Number(l.amount_excl_vat) || 0,
        vatAmount: Number(l.vat_amount) || 0,
        amountInclVat: Number(l.amount_incl_vat) || 0,
        source: l.source ?? null,
      }));
      const amountExclVat = subLines.reduce((s, l) => s + l.amountExclVat, 0);
      const vatAmount = subLines.reduce((s, l) => s + l.vatAmount, 0);
      const amountInclVat = subLines.reduce((s, l) => s + l.amountInclVat, 0);
      const rates = new Set(subLines.map((l) => l.vatRate));
      lines.push({
        key: `item:${item.id}`,
        kind,
        section,
        itemId: item.id,
        item,
        description: item.block_name,
        subDescription: subInfo || undefined,
        quantity: 1,
        quantityLabel: "",
        unitPriceInclVat: amountInclVat,
        unitSuffix: "",
        vatRate: rates.size === 1 ? [...rates][0] : standardRate,
        amountExclVat,
        vatAmount,
        amountInclVat,
        subLines,
      });
      continue;
    }

    const total = getDisplayLineTotal(item, people, days);
    if (total == null) {
      unpricedItems.push(item);
      continue;
    }
    const rate = resolveItemVatRate(item, blockVatRates, standardRate);
    const perPerson = isPerPersonItem(item);
    const perDay = isPerDayItem(item);
    const effectivePeople = getEffectivePeople(item, people);
    const quantity = perPerson ? (perDay ? effectivePeople * days : effectivePeople) : 1;
    const quantityLabel = perPerson ? (perDay ? `${effectivePeople}×${days}d` : String(effectivePeople)) : "1";
    lines.push(
      inclLine({
        key: `item:${item.id}`,
        kind,
        section,
        itemId: item.id,
        item,
        description: item.block_name,
        subDescription: [item.admin_price_notes || item.provider_name, item.booking_reference ? `Boekingsnr: ${item.booking_reference}` : null]
          .filter(Boolean)
          .join(" • ") || undefined,
        quantity,
        quantityLabel,
        unitPriceInclVat: quantity > 0 ? total / quantity : total,
        unitSuffix: perDay ? "p.p.p.d." : perPerson ? "p.p." : "",
        vatRate: rate,
        amountInclVat: total,
        isPreliminary: item.quoted_price == null && item.admin_price_override != null,
      }),
    );
  }

  // ── Logies ──────────────────────────────────────────────────────────────
  const accommodationBilledDirectly = isFeeExcluded(excluded, "accommodation");
  const lodging = accommodationBilledDirectly ? null : accommodation ?? null;
  if (lodging && Number(lodging.price_total) > 0) {
    const rate = Number(lodging.vat_rate ?? settings.accommodation_vat_rate ?? 9);
    const nights = lodging.nights ?? 0;
    lines.push(
      inclLine({
        key: `lodging:${lodging.id ?? "quote"}`,
        kind: "lodging",
        section: LODGING_SECTION,
        description: lodging.accommodation_name,
        subDescription: [lodging.partner_name, nights > 0 ? `${nights} ${nights === 1 ? "nacht" : "nachten"}` : null]
          .filter(Boolean)
          .join(" • ") || undefined,
        quantity: 1,
        quantityLabel: "1",
        unitPriceInclVat: Number(lodging.price_total),
        unitSuffix: "",
        vatRate: rate,
        amountInclVat: Number(lodging.price_total),
      }),
    );
  }
  if (lodging && lodging.extras.length > 0) {
    const extraTotal = (e: SpecExtraInput) =>
      e.pricing_type === "fixed" ? Number(e.unit_price) || 0 : (Number(e.unit_price) || 0) * (Number(e.quantity) || 0);
    const extraRate = (e: SpecExtraInput) => Number(e.vat_rate ?? settings.accommodation_vat_rate ?? 9);
    const groups = new Map<string, { extra: SpecExtraInput; count: number; quantity: number; total: number }>();
    lodging.extras.forEach((extra, idx) => {
      const key = bundleExtras
        ? `${extra.name}|${extra.description ?? ""}|${extra.unit_price}|${extraRate(extra)}|${extra.pricing_type}`
        : extra.id ?? String(idx);
      const existing = groups.get(key);
      if (existing) {
        existing.count += 1;
        existing.quantity += Number(extra.quantity) || 0;
        existing.total += extraTotal(extra);
      } else {
        groups.set(key, { extra, count: 1, quantity: Number(extra.quantity) || 0, total: extraTotal(extra) });
      }
    });
    for (const g of groups.values()) {
      const isFixed = g.extra.pricing_type === "fixed";
      const quantity = isFixed ? g.count : g.quantity;
      lines.push(
        inclLine({
          key: `lodging-extra:${g.extra.id ?? g.extra.name}:${g.count}`,
          kind: "lodging_extra",
          section: LODGING_EXTRAS_SECTION,
          description: g.extra.name,
          subDescription: g.extra.description ?? undefined,
          quantity,
          quantityLabel: String(quantity),
          unitPriceInclVat: Number(g.extra.unit_price) || 0,
          unitSuffix: isFixed ? "" : "p.p.",
          vatRate: extraRate(g.extra),
          amountInclVat: g.total,
          bundleCount: g.count,
        }),
      );
    }
  }

  // ── Fees ────────────────────────────────────────────────────────────────
  const partnerCostsTotal = lines.reduce((s, l) => s + l.amountInclVat, 0);
  const feeBreakdown = feeStructure
    ? computeProjectFees({
        structure: feeStructure,
        numberOfPeople: people,
        numberOfDays: days,
        isBureauCentral,
        partnerCostsTotal,
        excludedFees: excluded,
        requestDate: request.created_at ?? null,
        arrivalDate: request.selected_dates?.[0] ?? null,
        revisionFeesTotal,
      })
    : undefined;

  const coordinationFee = feeBreakdown
    ? feeBreakdown.coordinationFee
    : isFeeExcluded(excluded, "coordination_fee")
      ? 0
      : legacyCoordinationFee(settings.coordination_fee_tiers, people);
  const centralSurcharge = feeBreakdown
    ? feeBreakdown.centralSurcharge
    : isBureauCentral && !isFeeExcluded(excluded, "central_surcharge")
      ? (Number(settings.bureau_central_surcharge_pp) || 0) * people
      : 0;
  const revisionFees = feeBreakdown ? feeBreakdown.revisionFeesTotal : 0;
  const touristTax = isFeeExcluded(excluded, "tourist_tax")
    ? 0
    : (Number(settings.tourist_tax_pp_per_day) || 0) * people * days;
  const natureContribution = isFeeExcluded(excluded, "nature_contribution")
    ? 0
    : (Number(settings.nature_contribution_pp) || 0) * people;

  if (coordinationFee > 0) {
    lines.push(
      inclLine({
        key: "fee:coordination_fee",
        kind: "fee",
        feeKey: "coordination_fee",
        section: FEE_SECTION,
        description: "Coördinatiekosten",
        subDescription: feeBreakdown
          ? `${people} personen · staffel ${feeBreakdown.tierLabel}${feeBreakdown.rushApplies ? " · incl. spoedtoeslag" : ""}`
          : `${people} personen`,
        quantity: 1,
        quantityLabel: "1",
        unitPriceInclVat: coordinationFee,
        unitSuffix: "",
        vatRate: standardRate,
        amountInclVat: coordinationFee,
      }),
    );
  }
  if (centralSurcharge > 0) {
    const perPerson = !feeBreakdown || feeBreakdown.centralSurchargeMode === "per_person";
    lines.push(
      inclLine({
        key: "fee:central_surcharge",
        kind: "fee",
        feeKey: "central_surcharge",
        section: FEE_SECTION,
        description: "Opslag centrale facturatie",
        subDescription: perPerson
          ? `${people} personen`
          : `${feeBreakdown!.centralSurchargePct}% over de partnerkosten`,
        quantity: perPerson ? people : 1,
        quantityLabel: perPerson ? String(people) : "1",
        unitPriceInclVat: perPerson ? centralSurcharge / Math.max(people, 1) : centralSurcharge,
        unitSuffix: perPerson ? "p.p." : "",
        vatRate: standardRate,
        amountInclVat: centralSurcharge,
      }),
    );
  }
  if (revisionFees > 0) {
    lines.push(
      inclLine({
        key: "fee:revision",
        kind: "revision",
        section: FEE_SECTION,
        description: "Programmawijzigingen",
        subDescription: "Wijzigingsrondes na akkoord",
        quantity: 1,
        quantityLabel: "1",
        unitPriceInclVat: revisionFees,
        unitSuffix: "",
        vatRate: standardRate,
        amountInclVat: revisionFees,
      }),
    );
  }
  if (touristTax > 0) {
    const qty = people * days;
    lines.push(
      inclLine({
        key: "fee:tourist_tax",
        kind: "fee",
        feeKey: "tourist_tax",
        section: FEE_SECTION,
        description: "Toeristenbelasting",
        subDescription: `${people} pers. × ${days} ${days === 1 ? "dag" : "dagen"}`,
        quantity: qty,
        quantityLabel: String(qty),
        unitPriceInclVat: touristTax / Math.max(qty, 1),
        unitSuffix: "p.p.p.d.",
        vatRate: 0,
        amountInclVat: touristTax,
      }),
    );
  }
  if (natureContribution > 0) {
    lines.push(
      inclLine({
        key: "fee:nature_contribution",
        kind: "fee",
        feeKey: "nature_contribution",
        section: FEE_SECTION,
        description: "Natuurbijdrage",
        subDescription: `Bijdrage natuurbeheer Staatsbosbeheer · ${people} personen`,
        quantity: people,
        quantityLabel: String(people),
        unitPriceInclVat: natureContribution / Math.max(people, 1),
        unitSuffix: "p.p.",
        vatRate: 0,
        amountInclVat: natureContribution,
      }),
    );
  }

  // ── Secties in factuurvolgorde ──────────────────────────────────────────
  const sectionOrder = (label: string, kind: SpecLineKind, category: string | null | undefined) => {
    if (kind === "lodging") return 100;
    if (kind === "lodging_extra") return 101;
    if (kind === "fee" || kind === "revision") return 200;
    const idx = CATEGORY_ORDER.indexOf(category || "overig");
    return idx === -1 ? 99 : idx;
  };
  const sectionMap = new Map<string, { label: string; order: number; lines: SpecLine[] }>();
  for (const line of lines) {
    const entry = sectionMap.get(line.section) ?? {
      label: line.section,
      order: sectionOrder(line.section, line.kind, line.item?.block_category),
      lines: [],
    };
    entry.lines.push(line);
    sectionMap.set(line.section, entry);
  }
  const sections = [...sectionMap.values()]
    .sort((a, b) => a.order - b.order)
    .map(({ label, lines: sectionLines }) => ({ label, lines: sectionLines }));

  // ── Btw-groepen en totalen ──────────────────────────────────────────────
  const groupMap = new Map<number, { excl: number; vat: number; incl: number }>();
  const addToGroup = (rate: number, excl: number, vat: number, incl: number) => {
    const key = Number(rate) || 0;
    const cur = groupMap.get(key) ?? { excl: 0, vat: 0, incl: 0 };
    cur.excl += excl;
    cur.vat += vat;
    cur.incl += incl;
    groupMap.set(key, cur);
  };
  for (const line of lines) {
    if (line.subLines && line.subLines.length > 0) {
      for (const sub of line.subLines) addToGroup(sub.vatRate, sub.amountExclVat, sub.vatAmount, sub.amountInclVat);
    } else {
      addToGroup(line.vatRate, line.amountExclVat, line.vatAmount, line.amountInclVat);
    }
  }
  const vatGroups: SpecVatGroup[] = [...groupMap.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([rate, g]) => {
      const inclVat = round2(g.incl);
      const exclVat = round2(g.excl);
      return { rate, exclVat, vatAmount: round2(inclVat - exclVat), inclVat };
    });

  const sumKind = (...kinds: SpecLineKind[]) =>
    lines.filter((l) => kinds.includes(l.kind)).reduce((s, l) => s + l.amountInclVat, 0);
  const inclVat = round2(lines.reduce((s, l) => s + l.amountInclVat, 0));
  const exclVat = round2(vatGroups.reduce((s, g) => s + g.exclVat, 0));
  const vat = round2(vatGroups.reduce((s, g) => s + g.vatAmount, 0));
  const invoiced = invoices.reduce((sum, invoice) => {
    const amount = Math.abs(Number(invoice.amount_incl_vat ?? Number(invoice.amount_excl_vat || 0) + Number(invoice.vat_amount || 0)));
    return sum + (invoice.invoice_type === "credit" ? -amount : amount);
  }, 0);

  return {
    lines,
    sections,
    vatGroups,
    totals: {
      programItems: sumKind("program"),
      extraCosts: sumKind("extra_cost"),
      lodging: sumKind("lodging"),
      lodgingExtras: sumKind("lodging_extra"),
      coordinationFee,
      centralSurcharge,
      revisionFees,
      touristTax,
      natureContribution,
      exclVat,
      vat,
      inclVat,
      invoiced: round2(invoiced),
      outstanding: Math.max(0, round2(inclVat - invoiced)),
    },
    feeBreakdown,
    unpricedItems,
    selfArrangedItems,
    numberOfPeople: people,
    numberOfDays: days,
    isBureauCentral,
    accommodationBilledDirectly,
  };
}

/** Btw-groepen van een deelbedrag, pro rata over de groepen van het hele project; sluitend op de cent. */
export function scaleVatGroups(groups: SpecVatGroup[], targetInclVat: number): SpecVatGroup[] {
  const fullIncl = groups.reduce((s, g) => s + g.inclVat, 0);
  if (fullIncl <= 0.005 || groups.length === 0) {
    return [{ rate: 21, exclVat: round2(targetInclVat / 1.21), vatAmount: round2(targetInclVat - targetInclVat / 1.21), inclVat: round2(targetInclVat) }];
  }
  const factor = targetInclVat / fullIncl;
  const scaled = groups.map((g) => {
    const inclVat = round2(g.inclVat * factor);
    const exclVat = round2(exclFromIncl(inclVat, g.rate));
    return { rate: g.rate, inclVat, exclVat, vatAmount: round2(inclVat - exclVat) };
  });
  const diff = round2(targetInclVat - scaled.reduce((s, g) => s + g.inclVat, 0));
  if (Math.abs(diff) >= 0.005) {
    const idx = Math.max(0, scaled.findIndex((g) => g.rate > 0));
    const g = scaled[idx];
    g.inclVat = round2(g.inclVat + diff);
    g.exclVat = round2(exclFromIncl(g.inclVat, g.rate));
    g.vatAmount = round2(g.inclVat - g.exclVat);
  }
  return scaled;
}
