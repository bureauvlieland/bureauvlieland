/**
 * Eén bron van waarheid voor het label dat een onderdeel krijgt — dezelfde
 * key wordt gebruikt door admin, klantportaal en partner-overzichten zodat
 * de terminologie consistent is.
 *
 * De afgeleide status is altijd gebaseerd op feiten in de rij (status,
 * customer_accepted_at, eventuele open admin-prijswijziging) en NIET op de
 * interne workflow-vlag `item_quote_status`. Die laatste is enkel nog een
 * stuurmiddel voor edge functions, niet voor UI-labels.
 */
import type { ProgramRequestItem } from "@/types/programRequest";
import { hasOpenAdminPriceChange } from "@/lib/portalPricing";

export type ItemDisplayStatus =
  | "wacht_op_partner"
  | "wacht_op_klant"
  | "prijs_gewijzigd"
  | "geaccepteerd"
  | "uitgevoerd"
  | "geannuleerd"
  | "niet_beschikbaar"
  | "self_arranged";

export interface ItemDisplayStatusInfo {
  /** Label voor admin- en interne views */
  adminLabel: string;
  /** Label voor de klant (formele toon) */
  customerLabel: string;
  /** Tailwind text-color (semantisch via tokens waar mogelijk) */
  color: string;
  /** Tailwind background-color */
  bgColor: string;
  /** Lucide icon naam */
  icon:
    | "Clock"
    | "AlertCircle"
    | "AlertTriangle"
    | "CheckCircle"
    | "CheckCircle2"
    | "Ban"
    | "XCircle"
    | "ExternalLink";
}

export const itemDisplayStatusConfig: Record<ItemDisplayStatus, ItemDisplayStatusInfo> = {
  wacht_op_partner: {
    adminLabel: "Wacht op aanbieder",
    customerLabel: "Wacht op aanbieder",
    color: "text-amber-700 dark:text-amber-400",
    bgColor: "bg-amber-100 dark:bg-amber-950/50",
    icon: "Clock",
  },
  wacht_op_klant: {
    adminLabel: "Wacht op klant-akkoord",
    customerLabel: "Akkoord nodig",
    color: "text-blue-700 dark:text-blue-400",
    bgColor: "bg-blue-100 dark:bg-blue-950/50",
    icon: "AlertCircle",
  },
  prijs_gewijzigd: {
    adminLabel: "Wacht op klant (nieuwe prijs)",
    customerLabel: "Nieuwe prijs — akkoord nodig",
    color: "text-amber-700 dark:text-amber-400",
    bgColor: "bg-amber-100 dark:bg-amber-950/50",
    icon: "AlertTriangle",
  },
  geaccepteerd: {
    adminLabel: "Klant akkoord",
    customerLabel: "Akkoord",
    color: "text-green-700 dark:text-green-400",
    bgColor: "bg-green-100 dark:bg-green-950/50",
    icon: "CheckCircle",
  },
  uitgevoerd: {
    adminLabel: "Uitgevoerd",
    customerLabel: "Uitgevoerd",
    color: "text-emerald-700 dark:text-emerald-400",
    bgColor: "bg-emerald-100 dark:bg-emerald-950/50",
    icon: "CheckCircle2",
  },
  geannuleerd: {
    adminLabel: "Geannuleerd",
    customerLabel: "Geannuleerd",
    color: "text-muted-foreground",
    bgColor: "bg-muted",
    icon: "Ban",
  },
  niet_beschikbaar: {
    adminLabel: "Niet beschikbaar",
    customerLabel: "Niet beschikbaar",
    color: "text-red-700 dark:text-red-400",
    bgColor: "bg-red-100 dark:bg-red-950/50",
    icon: "XCircle",
  },
  self_arranged: {
    adminLabel: "Zelf te regelen",
    customerLabel: "Zelf te regelen",
    color: "text-amber-700 dark:text-amber-400",
    bgColor: "bg-amber-100 dark:bg-amber-950/50",
    icon: "ExternalLink",
  },
};

interface DeriveContext {
  programPeople: number;
  numberOfDays: number;
}

/**
 * Bepaalt het label voor één onderdeel op basis van de feitelijke staat.
 *
 * Volgorde van checks:
 *   1. Terminale toestanden (cancelled, executed, invoiced, unavailable, self_arranged)
 *   2. Klant heeft akkoord gegeven (customer_accepted_at)
 *      - met openstaande nieuwe prijs → prijs_gewijzigd
 *      - anders → geaccepteerd
 *   3. Partner heeft gereageerd maar klant nog niet akkoord → wacht_op_klant
 *   4. Default → wacht_op_partner
 */
export function deriveItemDisplayStatus(
  item: ProgramRequestItem,
  ctx: DeriveContext,
): ItemDisplayStatus {
  if (item.block_type === "self_arranged") return "self_arranged";
  if (item.status === "cancelled") return "geannuleerd";
  if (item.status === "executed" || item.status === "invoiced") return "uitgevoerd";
  if (item.status === "unavailable") return "niet_beschikbaar";

  const hasAcceptance = !!item.customer_accepted_at;

  // Open admin-prijswijziging die de klant nog niet heeft afgehandeld.
  const openPriceChange = hasOpenAdminPriceChange(
    item,
    item.override_people ?? ctx.programPeople,
    ctx.numberOfDays,
  );

  if (hasAcceptance) {
    // Edge case: admin heeft ná het klant-akkoord een nieuwe override gezet.
    if (
      openPriceChange &&
      item.admin_price_override_updated_at &&
      new Date(item.admin_price_override_updated_at).getTime() >
        new Date(item.customer_accepted_at!).getTime()
    ) {
      return "prijs_gewijzigd";
    }
    return "geaccepteerd";
  }

  // De Status-kolom toont uitsluitend de klant-as. De vraag of het onderdeel
  // al naar de partner is gestuurd staat hier los van en wordt elders getoond
  // (zie de "Nog naar partner" / "Verstuurd"-chip).
  return "wacht_op_klant";
}
