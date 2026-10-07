/**
 * Weergaveregels van de commissiewerklijst (fase 3 van
 * docs/plan-commissiefacturen.md): in welke tegel een regel hoort, welke
 * pills hij draagt, hoe de lijst zoekt, sorteert en per partner en project
 * groepeert. Pure functies op `ReconRow`, los van React, zodat ze te testen
 * zijn en de component alleen nog tekent.
 */
import {
  COMMISSION_FREE_PARTNER_IDS,
  basisAmountForBasis,
  commissionForBasis,
  isArchivedRow,
  isBillableRow,
  isExpectedRow,
  isInDraftRow,
  isUnknownBaseRow,
  type CommissionBasis,
  type ReconRow,
} from "@/lib/commissionReconciliation";
import type { PillTone } from "@/components/system";

/** Precies één bucket per regel. "settled" = gefactureerd of betaald; die
 *  staan niet meer in de werklijst maar op Commissiefacturen. */
export type WorklistBucket =
  | "billable"
  | "in_draft"
  | "expected"
  | "unknown_base"
  | "exempt"
  | "settled";

/** De tegels. "deviation" is geen eigen bucket maar een zicht op "Te
 *  factureren": regels waar de partner meer factureerde dan wij verkochten. */
export type WorklistTab = "billable" | "in_draft" | "expected" | "deviation" | "unknown_base" | "exempt";

export const WORKLIST_TABS: WorklistTab[] = [
  "billable",
  "in_draft",
  "expected",
  "deviation",
  "unknown_base",
  "exempt",
];

export const WORKLIST_TAB_LABELS: Record<WorklistTab, string> = {
  billable: "Te factureren",
  in_draft: "In concept",
  expected: "Verwacht",
  deviation: "Afwijkingen",
  unknown_base: "Zonder grondslag",
  exempt: "Commissievrij",
};

export const WORKLIST_EMPTY: Record<WorklistTab, { title: string; description?: string }> = {
  billable: {
    title: "Niets te factureren",
    description: "Regels verschijnen hier zodra het werk is uitgevoerd of de partner heeft gefactureerd.",
  },
  in_draft: { title: "Geen concepten", description: "Regels op een concept- of definitieve factuur staan hier." },
  expected: { title: "Niets verwacht", description: "Verkochte onderdelen die nog moeten plaatsvinden." },
  deviation: { title: "Geen afwijkingen", description: "Geen partner factureerde meer dan wij verkochten." },
  unknown_base: {
    title: "Overal een grondslag",
    description: "Elke regel heeft een verkoopprijs of een inkoopfactuur.",
  },
  exempt: { title: "Niets commissievrij" },
};

export function bucketForRow(row: ReconRow): WorklistBucket {
  if (isArchivedRow(row)) return "exempt";
  if (row.commissionStatus === "paid" || row.commissionStatus === "invoiced") return "settled";
  if (isInDraftRow(row)) return "in_draft";
  if (isBillableRow(row)) return "billable";
  if (isUnknownBaseRow(row)) return "unknown_base";
  if (isExpectedRow(row)) return "expected";
  return "settled";
}

/** Afwijking: de partner factureerde meer dan wij verkochten. */
export function isDeviationRow(row: ReconRow): boolean {
  return row.status === "deviation" && (row.differenceExclVat ?? 0) > 0;
}

export function rowBelongsToTab(row: ReconRow, tab: WorklistTab): boolean {
  if (tab === "deviation") return bucketForRow(row) === "billable" && isDeviationRow(row);
  return bucketForRow(row) === tab;
}

export function rowsForTab(rows: ReconRow[], tab: WorklistTab): ReconRow[] {
  return rows.filter((row) => rowBelongsToTab(row, tab));
}

export type BasisResolver = (row: ReconRow) => CommissionBasis;

export const defaultBasisResolver: BasisResolver = (row) => row.defaultBasis;

export interface TabTotals {
  count: number;
  amount: number;
}

export function tabTotals(
  rows: ReconRow[],
  basisFor: BasisResolver = defaultBasisResolver,
): Record<WorklistTab, TabTotals> {
  const totals = Object.fromEntries(
    WORKLIST_TABS.map((tab) => [tab, { count: 0, amount: 0 }]),
  ) as Record<WorklistTab, TabTotals>;
  for (const row of rows) {
    for (const tab of WORKLIST_TABS) {
      if (!rowBelongsToTab(row, tab)) continue;
      totals[tab].count += 1;
      totals[tab].amount += commissionForBasis(row, basisFor(row));
    }
  }
  return totals;
}

export function matchesWorklistSearch(row: ReconRow, query: string): boolean {
  const term = query.trim().toLowerCase();
  if (!term) return true;
  return [
    row.label,
    row.partnerName,
    row.customerName,
    row.projectLabel,
    row.projectReference,
    row.invoiceNumber,
  ]
    .filter(Boolean)
    .some((value) => String(value).toLowerCase().includes(term));
}

export type WorklistSort = "age" | "amount" | "partner";

export const WORKLIST_SORT_LABELS: Record<WorklistSort, string> = {
  age: "Ouderdom: oudste eerst",
  amount: "Commissie: hoogste eerst",
  partner: "Partner: A–Z",
};

/** Datum waarop de regel speelt: uitvoering, anders factuurdatum. */
export function rowDate(row: ReconRow): string | null {
  return row.executionDate ?? row.invoiceDate ?? null;
}

export interface WorklistProject {
  key: string;
  label: string;
  reference: string | null;
  customerName: string | null;
  date: string | null;
  ageDays: number | null;
  rows: ReconRow[];
}

export interface WorklistGroup {
  partnerId: string;
  partnerName: string;
  rows: ReconRow[];
  total: number;
  /** Oudste regel in de groep (dagen), voor de sortering op ouderdom. */
  maxAgeDays: number;
  projects: WorklistProject[];
}

/**
 * Groepeert per partner en daarbinnen per project. Partners gesorteerd volgens
 * `sort`; projecten op datum (oudste eerst); regels op datum en label.
 */
export function groupWorklistRows(
  rows: ReconRow[],
  sort: WorklistSort,
  basisFor: BasisResolver = defaultBasisResolver,
): WorklistGroup[] {
  const groups = new Map<string, WorklistGroup>();
  for (const row of rows) {
    const group = groups.get(row.partnerId) ?? {
      partnerId: row.partnerId,
      partnerName: row.partnerName,
      rows: [],
      total: 0,
      maxAgeDays: -Infinity,
      projects: [],
    };
    group.rows.push(row);
    group.total += commissionForBasis(row, basisFor(row));
    group.maxAgeDays = Math.max(group.maxAgeDays, row.ageDays ?? -Infinity);
    groups.set(row.partnerId, group);
  }

  for (const group of groups.values()) {
    const projects = new Map<string, WorklistProject>();
    for (const row of group.rows) {
      const key = row.projectId ?? `los-${row.invoiceId ?? row.key}`;
      const project = projects.get(key) ?? {
        key,
        label: row.projectLabel ?? row.customerName ?? "Zonder project",
        reference: row.projectReference,
        customerName: row.customerName,
        date: rowDate(row),
        ageDays: row.ageDays,
        rows: [],
      };
      project.rows.push(row);
      const date = rowDate(row);
      if (date && (!project.date || date < project.date)) project.date = date;
      if (row.ageDays !== null && (project.ageDays === null || row.ageDays > project.ageDays)) {
        project.ageDays = row.ageDays;
      }
      projects.set(key, project);
    }
    group.projects = [...projects.values()].sort((a, b) => (a.date ?? "").localeCompare(b.date ?? ""));
    for (const project of group.projects) {
      project.rows.sort(
        (a, b) => (rowDate(a) ?? "").localeCompare(rowDate(b) ?? "") || a.label.localeCompare(b.label),
      );
    }
    if (group.maxAgeDays === -Infinity) group.maxAgeDays = 0;
  }

  const list = [...groups.values()];
  list.sort((a, b) => {
    if (sort === "amount") return b.total - a.total || a.partnerName.localeCompare(b.partnerName);
    if (sort === "age") return b.maxAgeDays - a.maxAgeDays || a.partnerName.localeCompare(b.partnerName);
    return a.partnerName.localeCompare(b.partnerName);
  });
  return list;
}

export interface WorklistPill {
  tone: PillTone;
  label: string;
  title?: string;
}

const formatEuro = (amount: number) =>
  new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" }).format(amount);

/** Tekst bij een commissievrije regel: waarom hij geen commissie oplevert. */
export function exemptLabel(row: ReconRow): string {
  if (row.exemptReason) return `Commissievrij: ${row.exemptReason}`;
  if (COMMISSION_FREE_PARTNER_IDS.has(row.partnerId)) return "Verrekend door partner";
  if (row.commissionPercentage === 0) return "0% commissie";
  return "Commissievrij";
}

/** De statuspills van een regel, in vaste volgorde. */
export function rowPills(row: ReconRow): WorklistPill[] {
  const pills: WorklistPill[] = [];
  if (row.commissionExempt) {
    pills.push({ tone: "neutral", label: exemptLabel(row) });
    return pills;
  }
  if (row.partnerDismissed) {
    pills.push({
      tone: "danger",
      label: "Partner: niet geleverd",
      title: "De partner heeft gemeld dat dit onderdeel niet is geleverd.",
    });
  }
  if (row.inDraft) {
    pills.push({ tone: "brand", label: "In concept", title: "Staat op een nog niet verstuurde commissiefactuur." });
  }
  if (row.readiness === "expected") {
    pills.push({ tone: "info", label: "Verwacht", title: "Moet nog plaatsvinden." });
  }
  if (row.readiness === "unknown_base") {
    pills.push({
      tone: "warning",
      label: "Grondslag onbekend",
      title: "Geen verkoopprijs en geen inkoopfactuur: er is niets om over te rekenen.",
    });
  }
  if (row.status === "missing_invoice" && row.readiness === "billable") {
    pills.push({
      tone: "warning",
      label: "Inkoopfactuur ontbreekt",
      title: "Nog geen inkoopfactuur geregistreerd; de commissie gaat over de verkoopwaarde.",
    });
  }
  if (row.itemType === "purchase_invoice") {
    pills.push({
      tone: "warning",
      label: "Niet gekoppeld",
      title: "Losse inkoopfactuur, nog niet aan een onderdeel of logies gekoppeld.",
    });
  }
  if (isDeviationRow(row)) {
    pills.push({
      tone: "warning",
      label: `Afwijking +${formatEuro(row.differenceExclVat ?? 0)}`,
      title: "De partner factureerde meer dan wij verkochten. De commissie gaat over de inkoopfactuur.",
    });
  }
  if (row.hasMixedRates) {
    pills.push({ tone: "neutral", label: "Gesplitst tarief", title: "Kamer en extra's op een eigen percentage." });
  }
  return pills;
}

/** De grondslagkeuze is er alleen als beide bedragen bestaan. */
export function canChooseBasis(row: ReconRow): boolean {
  return row.salesExclVat !== null && row.purchaseExclVat !== null;
}

/** "3 dagen geleden", "vandaag", of "" als de leeftijd onbekend is. */
export function ageLabel(ageDays: number | null): string {
  if (ageDays === null) return "";
  if (ageDays <= 0) return "vandaag";
  if (ageDays === 1) return "gisteren";
  return `${ageDays} dagen geleden`;
}

/** Eén regel uitleg bij de commissie van een rij. */
export function commissionExplanation(row: ReconRow, basis: CommissionBasis): string {
  if (row.commissionComponents && row.hasMixedRates) {
    return row.commissionComponents
      .map((c) => `${c.commissionPct}% van ${formatEuro(c.baseExclVat)}`)
      .join(" + ");
  }
  return `${row.commissionPercentage}% van ${formatEuro(basisAmountForBasis(row, basis))}`;
}
