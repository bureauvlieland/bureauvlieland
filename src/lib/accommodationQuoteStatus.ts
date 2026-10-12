import type { CustomerStatusTone } from "./itemStatus";

/**
 * Eén woordenlijst voor de status van een logiesofferte zoals de partner
 * hem ziet (partnerportaal fase 1). Voorheen stonden er drie naast elkaar
 * (de aanvraagkaart, de projectpagina en de tabs). De tonen betekenen
 * hetzelfde als overal: `warning` u bent aan zet, `info` wacht op een
 * ander, `success` geregeld, `danger` kan niet, `neutral` informatief.
 *
 * De ruwe status komt uit `accommodation_quotes.status`: pending,
 * submitted, selected, rejected, expired, declined, cancelled.
 */
export type PartnerQuoteStatusKey = "requested" | "submitted" | "selected" | "not_selected" | "expired" | "declined" | "cancelled";

export interface PartnerQuoteStatus {
  key: PartnerQuoteStatusKey;
  label: string;
  tone: CustomerStatusTone;
  /** Korte uitleg: wat er nu gebeurt of van de partner wordt verwacht. */
  hint: string;
}

const STATUSES: Record<PartnerQuoteStatusKey, Omit<PartnerQuoteStatus, "key">> = {
  requested: { label: "Offerte gevraagd", tone: "warning", hint: "Bureau Vlieland wacht op uw offerte." },
  submitted: { label: "Verstuurd, wacht op de klant", tone: "info", hint: "De klant kiest uit de offertes; u hoort het zodra hij kiest." },
  selected: { label: "Gekozen door de klant", tone: "success", hint: "De klant heeft uw offerte gekozen." },
  not_selected: { label: "Niet gekozen", tone: "neutral", hint: "De klant koos een andere accommodatie." },
  expired: { label: "Verlopen, te verlengen", tone: "warning", hint: "De geldigheid is verstreken; u kunt de offerte verlengen." },
  declined: { label: "Door u afgewezen", tone: "neutral", hint: "U heeft deze aanvraag afgewezen." },
  cancelled: { label: "Geannuleerd", tone: "danger", hint: "De aanvraag is geannuleerd." },
};

const RAW_TO_KEY: Record<string, PartnerQuoteStatusKey> = {
  pending: "requested",
  submitted: "submitted",
  selected: "selected",
  rejected: "not_selected",
  expired: "expired",
  declined: "declined",
  cancelled: "cancelled",
};

export function partnerQuoteStatusKey(rawStatus: string | null | undefined): PartnerQuoteStatusKey {
  return RAW_TO_KEY[rawStatus ?? ""] ?? "requested";
}

export function partnerQuoteStatus(rawStatus: string | null | undefined): PartnerQuoteStatus {
  const key = partnerQuoteStatusKey(rawStatus);
  return { key, ...STATUSES[key] };
}

/** De tabs op de logiespagina, in deze volgorde. */
export type PartnerQuoteTab = "gevraagd" | "wacht" | "verlopen" | "gekozen" | "afgerond";

export const PARTNER_QUOTE_TABS: { id: PartnerQuoteTab; label: string }[] = [
  { id: "gevraagd", label: "Offerte gevraagd" },
  { id: "wacht", label: "Wacht op de klant" },
  { id: "verlopen", label: "Verlopen" },
  { id: "gekozen", label: "Gekozen" },
  { id: "afgerond", label: "Afgerond" },
];

export function partnerQuoteTab(rawStatus: string | null | undefined): PartnerQuoteTab {
  switch (partnerQuoteStatusKey(rawStatus)) {
    case "requested":
      return "gevraagd";
    case "submitted":
      return "wacht";
    case "expired":
      return "verlopen";
    case "selected":
      return "gekozen";
    default:
      return "afgerond";
  }
}
