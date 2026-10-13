import { deriveItemDisplayStatusLoose, type CustomerStatusTone, type ItemDisplayStatus } from "./itemStatus";
import { partnerQuoteStatus } from "./accommodationQuoteStatus";

/**
 * De status van een project zoals de partner hem ziet (partnerportaal
 * fase 1): afgeleid uit zijn eigen onderdelen, in zijn woorden. Vervangt in
 * de projectentabel de adminlijst (`projectStatus.ts`, met "AV getekend").
 * Dezelfde tonen als overal: `warning` u bent aan zet, `info` wacht op een
 * ander, `success` geregeld, `danger` kan niet.
 */
export type PartnerProjectStatusKey =
  | "concept"
  | "wacht_op_u"
  | "wacht_op_klant"
  | "bevestigd"
  | "te_factureren"
  | "gefactureerd"
  | "afgesloten"
  | "geannuleerd";

export interface PartnerProjectStatus {
  key: PartnerProjectStatusKey;
  label: string;
  tone: CustomerStatusTone;
}

const STATUSES: Record<PartnerProjectStatusKey, Omit<PartnerProjectStatus, "key">> = {
  concept: { label: "Concept", tone: "neutral" },
  wacht_op_u: { label: "Wacht op uw reactie", tone: "warning" },
  wacht_op_klant: { label: "Wacht op de klant", tone: "info" },
  bevestigd: { label: "Bevestigd", tone: "success" },
  te_factureren: { label: "Uitgevoerd, nog te factureren", tone: "warning" },
  gefactureerd: { label: "Gefactureerd", tone: "success" },
  afgesloten: { label: "Afgesloten", tone: "neutral" },
  geannuleerd: { label: "Geannuleerd", tone: "danger" },
};

export const partnerProjectStatusInfo = (key: PartnerProjectStatusKey): PartnerProjectStatus => ({ key, ...STATUSES[key] });

/** Statussen van een onderdeel waarbij de partner aan zet is. */
export const PARTNER_TURN_STATUSES: ReadonlySet<ItemDisplayStatus> = new Set([
  "wacht_op_partner",
  "tegenvoorstel_klant",
  "klant_akkoord_wacht_partner",
  "geaccepteerd",
]);
/** Statussen waarbij de klant of het bureau aan zet is. */
export const OTHER_TURN_STATUSES: ReadonlySet<ItemDisplayStatus> = new Set(["wacht_op_klant", "prijs_gewijzigd", "klant_akkoord_bureau"]);

export interface PartnerProjectItemInput {
  status: string;
  invoiced_number?: string | null;
  partner_dismissed_at?: string | null;
  is_concept?: boolean;
}

export interface PartnerProjectRequestInput {
  status?: string | null;
  cancelled_at?: string | null;
}

/**
 * Projectstatus uit de onderdelen van deze partner. De volgorde is de
 * volgorde van belang: geannuleerd wint van alles, dan concept, dan "u bent
 * aan zet", dan "wacht op de klant", dan de staart (factureren, gefactureerd,
 * afgesloten), en wat overblijft is bevestigd.
 */
export function derivePartnerProjectStatus(items: PartnerProjectItemInput[], request?: PartnerProjectRequestInput | null): PartnerProjectStatus {
  if (request?.cancelled_at || request?.status === "cancelled") return partnerProjectStatusInfo("geannuleerd");
  if (items.length === 0) return partnerProjectStatusInfo("concept");
  if (items.every((i) => i.is_concept)) return partnerProjectStatusInfo("concept");

  const display = items.map((item) => ({
    item,
    status: deriveItemDisplayStatusLoose(item, { audience: "partner" }),
  }));
  const live = display.filter((d) => d.status !== "geannuleerd" && d.status !== "niet_beschikbaar" && d.status !== "self_arranged");
  if (live.length === 0) {
    const allCancelled = display.every((d) => d.status === "geannuleerd" || d.status === "niet_beschikbaar");
    return partnerProjectStatusInfo(allCancelled ? "geannuleerd" : "afgesloten");
  }
  if (live.some((d) => PARTNER_TURN_STATUSES.has(d.status))) return partnerProjectStatusInfo("wacht_op_u");
  if (live.some((d) => OTHER_TURN_STATUSES.has(d.status))) return partnerProjectStatusInfo("wacht_op_klant");

  const executed = live.filter((d) => d.status === "uitgevoerd");
  if (executed.length === live.length) {
    const open = executed.filter((d) => !d.item.invoiced_number && !d.item.partner_dismissed_at);
    if (open.length > 0) return partnerProjectStatusInfo("te_factureren");
    return partnerProjectStatusInfo(executed.some((d) => d.item.invoiced_number) ? "gefactureerd" : "afgesloten");
  }
  if (live.every((d) => d.status === "uitgevoerd" || d.status === "afgesloten_automatisch")) {
    return partnerProjectStatusInfo(live.some((d) => d.item.invoiced_number) ? "gefactureerd" : "afgesloten");
  }
  return partnerProjectStatusInfo("bevestigd");
}

/** Dezelfde lijst voor een logiesproject, afgeleid van de offerte. */
export function derivePartnerAccommodationProjectStatus(quote: { status: string; invoiced_number?: string | null }): PartnerProjectStatus {
  switch (partnerQuoteStatus(quote.status).key) {
    case "requested":
    case "expired":
      return partnerProjectStatusInfo("wacht_op_u");
    case "submitted":
      return partnerProjectStatusInfo("wacht_op_klant");
    case "selected":
      return partnerProjectStatusInfo(quote.invoiced_number ? "gefactureerd" : "bevestigd");
    case "cancelled":
      return partnerProjectStatusInfo("geannuleerd");
    default:
      return partnerProjectStatusInfo("afgesloten");
  }
}
