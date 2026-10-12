import type { PartnerItem } from "@/types/partner";
import { getItemLineTotal } from "./portalPricing";

/**
 * Het bedrag dat de partner voor een onderdeel factureert (incl. btw): de
 * eigen prijsopgave, anders de inschatting van Bureau Vlieland × personen ×
 * dagen. Eén helper voor de facturatiepagina en de twee factuurdialogen
 * (partnerportaal fase 3); sluit aan op `portalPricing.ts`, dat ook het
 * klantportaal en de adminfinanciën gebruiken.
 */
export const getPartnerBillableAmount = (item: PartnerItem): number => {
  const people = item.program_requests.number_of_people || 1;
  const days = Math.max((item.program_requests.selected_dates || []).length, 1);
  return getItemLineTotal(item as unknown as Parameters<typeof getItemLineTotal>[0], people, days) ?? 0;
};

/** Waar: het bedrag is een inschatting van het bureau, de partner gaf nog geen prijs. */
export const isPartnerEstimatedAmount = (item: PartnerItem): boolean => item.quoted_price == null && item.admin_price_override != null;
