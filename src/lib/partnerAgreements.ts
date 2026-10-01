/**
 * Partnerafspraken met akkoord in het portaal
 * (docs/plan-bruiloftsdoorverwijzingen.md → Partnerafspraken).
 *
 * Een afspraak heeft een vaste sleutel en versies; alleen de laatste
 * gepubliceerde versie per sleutel telt. Een partner is "akkoord" als hij die
 * versie heeft geaccepteerd, "verouderd" als hij een eerdere versie
 * accepteerde, en anders "open".
 */
import { differenceInCalendarDays, parseISO } from "date-fns";

export type AgreementStatus = "draft" | "published" | "withdrawn";
export type AgreementAppliesTo = "all" | "wedding_referral_partners";
export type AgreementState = "accepted" | "outdated" | "open";

export const AGREEMENT_STATUS_LABEL: Record<AgreementStatus, string> = {
  draft: "Concept",
  published: "Gepubliceerd",
  withdrawn: "Ingetrokken",
};

export const APPLIES_TO_LABEL: Record<AgreementAppliesTo, string> = {
  all: "Alle actieve partners",
  wedding_referral_partners: "Partners die bruiloftsdoorverwijzingen ontvangen",
};

export const AGREEMENT_STATE_LABEL: Record<AgreementState, string> = {
  accepted: "Akkoord",
  outdated: "Eerdere versie akkoord",
  open: "Wacht op akkoord",
};

/** Sleutel van de doorverwijsregeling bruiloften; het doorverwijsdialoog controleert hierop. */
export const WEDDING_REFERRAL_AGREEMENT_KEY = "wedding_referral";

export interface AgreementLike {
  id: string;
  key: string;
  version: number;
  title: string;
  status: string;
  applies_to: string;
  effective_from: string;
  published_at: string | null;
}

export interface AcceptanceLike {
  agreement_id: string;
  partner_id: string;
  version: number;
  accepted_at: string;
}

export interface AgreementPartnerLike {
  id: string;
  name: string;
  is_active: boolean;
  receives_wedding_referrals: boolean;
}

/** Geldt een afspraak voor deze partner? Inactieve partners tellen nergens mee. */
export function appliesToPartner(agreement: Pick<AgreementLike, "applies_to">, partner: AgreementPartnerLike): boolean {
  if (!partner.is_active) return false;
  if (agreement.applies_to === "wedding_referral_partners") return partner.receives_wedding_referrals;
  return true;
}

/** Per sleutel de laatste gepubliceerde versie. */
export function currentAgreements<T extends AgreementLike>(agreements: T[]): T[] {
  const perKey = new Map<string, T>();
  for (const a of agreements) {
    if (a.status !== "published") continue;
    const huidig = perKey.get(a.key);
    if (!huidig || a.version > huidig.version) perKey.set(a.key, a);
  }
  return [...perKey.values()].sort((a, b) => a.title.localeCompare(b.title, "nl"));
}

/** Het volgende versienummer voor een sleutel. */
export function nextVersion(agreements: Pick<AgreementLike, "key" | "version">[], key: string): number {
  return agreements.filter((a) => a.key === key).reduce((max, a) => Math.max(max, a.version), 0) + 1;
}

export interface PartnerAgreementState<A extends AgreementLike = AgreementLike, C extends AcceptanceLike = AcceptanceLike> {
  agreement: A;
  state: AgreementState;
  /** Akkoord op precies deze versie. */
  acceptance: C | null;
  /** Laatste akkoord op een eerdere versie van dezelfde afspraak. */
  previous: C | null;
}

/** Stand van één (huidige) afspraak voor één partner. */
export function partnerAgreementState<A extends AgreementLike, C extends AcceptanceLike>(
  agreement: A,
  allAgreements: AgreementLike[],
  acceptances: C[],
  partnerId: string,
): PartnerAgreementState<A, C> {
  const eigen = acceptances.filter((c) => c.partner_id === partnerId);
  const acceptance = eigen.find((c) => c.agreement_id === agreement.id) ?? null;
  if (acceptance) return { agreement, state: "accepted", acceptance, previous: null };
  const eerdereIds = new Set(allAgreements.filter((a) => a.key === agreement.key && a.version < agreement.version).map((a) => a.id));
  const previous = eigen
    .filter((c) => eerdereIds.has(c.agreement_id))
    .sort((a, b) => b.version - a.version)[0] ?? null;
  return { agreement, state: previous ? "outdated" : "open", acceptance: null, previous };
}

/** Wat een partner in het portaal te zien krijgt: de huidige afspraken die voor hem gelden, met zijn stand. */
export function agreementsForPartner<A extends AgreementLike, C extends AcceptanceLike>(
  agreements: A[],
  acceptances: C[],
  partner: AgreementPartnerLike,
): PartnerAgreementState<A, C>[] {
  return currentAgreements(agreements)
    .filter((a) => appliesToPartner(a, partner))
    .map((a) => partnerAgreementState(a, agreements, acceptances, partner.id));
}

/** De afspraken waar de partner nog akkoord op moet geven (nieuw of nieuwe versie). */
export function openAgreementsForPartner<A extends AgreementLike, C extends AcceptanceLike>(
  agreements: A[],
  acceptances: C[],
  partner: AgreementPartnerLike,
): PartnerAgreementState<A, C>[] {
  return agreementsForPartner(agreements, acceptances, partner).filter((s) => s.state !== "accepted");
}

export interface AcceptanceMatrixRow<A extends AgreementLike = AgreementLike, C extends AcceptanceLike = AcceptanceLike> {
  agreement: A;
  partners: Array<{ partner: AgreementPartnerLike } & Pick<PartnerAgreementState<A, C>, "state" | "acceptance" | "previous">>;
  accepted: number;
  open: number;
}

/** Voor de admin: per huidige afspraak de stand van elke partner waarvoor hij geldt. */
export function acceptanceMatrix<A extends AgreementLike, C extends AcceptanceLike>(
  agreements: A[],
  acceptances: C[],
  partners: AgreementPartnerLike[],
): AcceptanceMatrixRow<A, C>[] {
  return currentAgreements(agreements).map((agreement) => {
    const rows = partners
      .filter((p) => appliesToPartner(agreement, p))
      .sort((a, b) => a.name.localeCompare(b.name, "nl"))
      .map((partner) => {
        const s = partnerAgreementState(agreement, agreements, acceptances, partner.id);
        return { partner, state: s.state, acceptance: s.acceptance, previous: s.previous };
      });
    return {
      agreement,
      partners: rows,
      accepted: rows.filter((r) => r.state === "accepted").length,
      open: rows.filter((r) => r.state !== "accepted").length,
    };
  });
}

/** Dagen dat een gepubliceerde afspraak open staat, gerekend vanaf publicatie (of ingangsdatum als die later is). */
export function daysOpen(agreement: Pick<AgreementLike, "published_at" | "effective_from">, today: string): number {
  const start = agreement.published_at ? agreement.published_at.slice(0, 10) : agreement.effective_from;
  const vanaf = start > agreement.effective_from ? start : agreement.effective_from;
  return Math.max(0, differenceInCalendarDays(parseISO(today), parseISO(vanaf)));
}

/** Heeft de partner de huidige doorverwijsregeling bruiloften geaccepteerd? Null als er geen gepubliceerde regeling is. */
export function weddingAgreementAccepted(
  agreements: AgreementLike[],
  acceptances: AcceptanceLike[],
  partner: AgreementPartnerLike,
): { agreement: AgreementLike; state: AgreementState } | null {
  const huidig = currentAgreements(agreements).find((a) => a.key === WEDDING_REFERRAL_AGREEMENT_KEY);
  if (!huidig || !appliesToPartner(huidig, partner)) return null;
  return { agreement: huidig, state: partnerAgreementState(huidig, agreements, acceptances, partner.id).state };
}
