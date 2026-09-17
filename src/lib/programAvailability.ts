/**
 * Beschikbaarheid van een programma (voorbeeldprogramma of het programma in
 * de wizard) op de gekozen datums en voor de gekozen groepsgrootte.
 *
 * Twee bronnen, allebei al in het systeem:
 * - sluitingen die partners zelf doorgeven (`partner_unavailability`),
 * - minimum/maximum groepsgrootte op de bouwsteen (`capacityCheck.ts`).
 *
 * Bewust puur: geen React, geen supabase. Nooit een blokkade: het bureau kan
 * altijd bellen. Wel eerlijk: wat niet kan, krijgt een label en een uitleg.
 */
import { checkCapacity } from "./capacityCheck";
import type { PublicUnavailability } from "@/hooks/usePublicPartnerUnavailability";

export type ItemAvailabilityStatus =
  | "beschikbaar"
  | "partner_gesloten"
  | "te_groot"
  | "te_klein"
  | "onbekend";

export interface AvailabilityBlock {
  id: string;
  name: string;
  category?: string | null;
  block_type?: string | null;
  provider_id?: string | null;
  min_people?: number | null;
  max_people?: number | null;
  sort_order?: number | null;
}

export interface AvailabilityItem {
  blockId: string;
  dayIndex: number;
}

export interface ItemAvailability {
  blockId: string;
  blockName: string;
  dayIndex: number;
  /** yyyy-MM-dd van de dag, of null als er geen datum voor die dag is. */
  dateIso: string | null;
  status: ItemAvailabilityStatus;
  /** Korte uitleg voor de klant, leeg bij "beschikbaar"/"onbekend". */
  message: string;
  /** Bij "partner_gesloten": einde van de sluiting (yyyy-MM-dd). */
  closedUntil?: string;
  /** Bij "te_groot": aantal rondes waarin de groep kan. */
  rounds?: number;
  /** Bij "te_klein"/"te_groot": de grens. */
  limit?: number;
}

export interface ProgramAvailability {
  items: ItemAvailability[];
  /** Alleen de onderdelen met een probleem (gesloten, te groot, te klein). */
  problems: ItemAvailability[];
  closedCount: number;
  capacityCount: number;
  /** Eén regel voor op een kaart, of null als er niets te melden is. */
  summary: string | null;
}

const MONTHS_NL = ["januari", "februari", "maart", "april", "mei", "juni", "juli", "augustus", "september", "oktober", "november", "december"];

/** "12 oktober" uit "2026-10-12", zonder date-fns zodat dit puur blijft. */
export const formatIsoDayNL = (iso: string): string => {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!m) return iso;
  return `${parseInt(m[3], 10)} ${MONTHS_NL[parseInt(m[2], 10) - 1] ?? m[2]}`;
};

/** De sluiting van deze partner die de datum raakt, of null. */
export const closureOn = (
  periods: PublicUnavailability[] | undefined,
  partnerId: string | null | undefined,
  dateIso: string | null | undefined,
): PublicUnavailability | null => {
  if (!periods || !partnerId || !dateIso) return null;
  return periods.find((p) => p.partner_id === partnerId && p.start_date <= dateIso && p.end_date >= dateIso) ?? null;
};

export function assessItemAvailability(
  item: AvailabilityItem,
  block: AvailabilityBlock | undefined,
  dateIso: string | null,
  numberOfPeople: number,
  periods: PublicUnavailability[] | undefined,
): ItemAvailability {
  const base = { blockId: item.blockId, dayIndex: item.dayIndex, dateIso };
  if (!block) {
    return { ...base, blockName: item.blockId, status: "onbekend", message: "" };
  }

  const closure = closureOn(periods, block.provider_id, dateIso);
  if (closure) {
    return {
      ...base,
      blockName: block.name,
      status: "partner_gesloten",
      closedUntil: closure.end_date,
      message: `De aanbieder is gesloten t/m ${formatIsoDayNL(closure.end_date)}.`,
    };
  }

  const cap = checkCapacity(
    { itemId: block.id, itemName: block.name, minPeople: block.min_people, maxPeople: block.max_people },
    numberOfPeople,
  );
  if (cap.status === "over" && cap.max != null) {
    const rounds = Math.ceil(cap.effectivePeople / cap.max);
    return {
      ...base,
      blockName: block.name,
      status: "te_groot",
      rounds,
      limit: cap.max,
      message: `Maximaal ${cap.max} personen per keer; wij splitsen uw groep in ${rounds} rondes.`,
    };
  }
  if (cap.status === "under" && cap.min != null) {
    return {
      ...base,
      blockName: block.name,
      status: "te_klein",
      limit: cap.min,
      message: `Minimaal ${cap.min} personen; wij overleggen met de aanbieder of het toch kan.`,
    };
  }

  return { ...base, blockName: block.name, status: "beschikbaar", message: "" };
}

export function assessProgramAvailability(
  items: AvailabilityItem[],
  datesIso: (string | null)[],
  numberOfPeople: number,
  periods: PublicUnavailability[] | undefined,
  blocks: AvailabilityBlock[],
): ProgramAvailability {
  const byId = new Map(blocks.map((b) => [b.id, b]));
  const assessed = items.map((item) =>
    assessItemAvailability(item, byId.get(item.blockId), datesIso[item.dayIndex] ?? null, numberOfPeople, periods),
  );
  const problems = assessed.filter((a) => a.status !== "beschikbaar" && a.status !== "onbekend");
  const closedCount = problems.filter((p) => p.status === "partner_gesloten").length;
  const capacityCount = problems.length - closedCount;

  let summary: string | null = null;
  const hasDates = datesIso.some((d) => !!d);
  if (problems.length === 0) {
    summary = hasDates && assessed.length > 0 ? "Volledig beschikbaar op uw datum" : null;
  } else {
    const first = problems[0];
    const rest = problems.length - 1;
    const detail =
      first.status === "partner_gesloten"
        ? `${first.blockName} (aanbieder gesloten t/m ${formatIsoDayNL(first.closedUntil ?? "")})`
        : first.status === "te_groot"
          ? `${first.blockName} (max ${first.limit} personen, ${first.rounds} rondes)`
          : `${first.blockName} (min ${first.limit} personen)`;
    summary =
      problems.length === 1
        ? `1 onderdeel vraagt aandacht: ${detail}`
        : `${problems.length} onderdelen vragen aandacht: ${detail}${rest > 0 ? ` en ${rest} ${rest === 1 ? "ander" : "andere"}` : ""}`;
  }

  return { items: assessed, problems, closedCount, capacityCount, summary };
}

/**
 * Eén vervanger voor een onderdeel dat niet kan: zelfde categorie, aanbieder
 * open op die dag, groep past, nog niet in het programma. Bij gelijke
 * kandidaten wint de laagste sort_order (zoals in de catalogus).
 */
export function suggestReplacement(
  problem: ItemAvailability,
  blocks: AvailabilityBlock[],
  numberOfPeople: number,
  periods: PublicUnavailability[] | undefined,
  existingBlockIds: string[],
): AvailabilityBlock | null {
  const original = blocks.find((b) => b.id === problem.blockId);
  if (!original) return null;
  const taken = new Set(existingBlockIds);
  const candidates = blocks
    .filter((b) => b.id !== original.id && !taken.has(b.id))
    .filter((b) => (b.category ?? null) === (original.category ?? null))
    .filter((b) => (b.block_type ?? "partner") !== "self_arranged")
    .filter(
      (b) =>
        assessItemAvailability({ blockId: b.id, dayIndex: problem.dayIndex }, b, problem.dateIso, numberOfPeople, periods)
          .status === "beschikbaar",
    )
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
  return candidates[0] ?? null;
}
