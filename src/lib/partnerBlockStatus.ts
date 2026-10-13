import type { CustomerStatusTone } from "./itemStatus";

/**
 * De status van een stuk aanbod (bouwsteen) zoals de partner hem ziet
 * (partnerportaal fase 4): één woordenlijst voor de aanbodpagina, de rij
 * en de MAP-koppeling. `warning` wacht op het bureau, `info` goedgekeurd
 * maar nog niet publiek, `success` staat op de site.
 */
export type PartnerBlockStatusKey = "concept" | "active" | "published" | "archived";

export interface PartnerBlockStatus {
  key: PartnerBlockStatusKey;
  label: string;
  tone: CustomerStatusTone;
  hint: string;
}

const STATUSES: Record<PartnerBlockStatusKey, Omit<PartnerBlockStatus, "key">> = {
  concept: { label: "Wacht op goedkeuring", tone: "warning", hint: "Bureau Vlieland beoordeelt uw voorstel." },
  active: { label: "Goedgekeurd", tone: "info", hint: "Beschikbaar voor maatwerk en offertes, nog niet op de site." },
  published: { label: "Gepubliceerd", tone: "success", hint: "Zichtbaar voor klanten op de site." },
  archived: { label: "Gearchiveerd", tone: "neutral", hint: "Niet meer in gebruik." },
};

export function partnerBlockStatus(raw: string | null | undefined): PartnerBlockStatus {
  const key: PartnerBlockStatusKey = raw === "active" || raw === "published" || raw === "archived" ? raw : "concept";
  return { key, ...STATUSES[key] };
}

/** De volgorde van de groepen op de aanbodpagina. */
export const PARTNER_BLOCK_GROUPS: PartnerBlockStatusKey[] = ["published", "active", "concept"];
