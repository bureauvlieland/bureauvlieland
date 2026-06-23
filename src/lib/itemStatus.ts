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
  /** Label voor de partner/aanbieder (jij-vorm) */
  partnerLabel: string;
  /** Korte uitleg voor admin: betekenis + wie aan zet is */
  adminTooltip: string;
  /** Korte uitleg voor de klant (formele toon) */
  customerTooltip: string;
  /** Korte uitleg voor de partner (jij-vorm) */
  partnerTooltip: string;
  /** Wie moet er actie ondernemen? */
  actor: "partner" | "klant" | "bureau" | "geen";
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
    partnerLabel: "Reactie gevraagd",
    adminTooltip: "Aanvraag is verstuurd. De aanbieder moet bevestigen of een alternatief voorstellen.",
    customerTooltip: "We wachten op een reactie van de aanbieder. Bureau Vlieland volgt dit voor u op.",
    partnerTooltip: "Bureau Vlieland wacht op jouw reactie: bevestig, stel een alternatief voor of meld dat je niet beschikbaar bent.",
    actor: "partner",
    color: "text-amber-700 dark:text-amber-400",
    bgColor: "bg-amber-100 dark:bg-amber-950/50",
    icon: "Clock",
  },
  wacht_op_klant: {
    adminLabel: "Wacht op klant-akkoord",
    customerLabel: "Akkoord nodig",
    partnerLabel: "Voorstel verstuurd",
    adminTooltip: "De aanbieder heeft gereageerd. De klant moet dit onderdeel nog akkoord geven.",
    customerTooltip: "Dit onderdeel is beschikbaar. Geef akkoord om het definitief te bevestigen.",
    partnerTooltip: "Je voorstel staat bij de klant. Zodra de klant akkoord geeft is dit onderdeel definitief.",
    actor: "klant",
    color: "text-blue-700 dark:text-blue-400",
    bgColor: "bg-blue-100 dark:bg-blue-950/50",
    icon: "AlertCircle",
  },
  prijs_gewijzigd: {
    adminLabel: "Wacht op klant (nieuwe prijs)",
    customerLabel: "Nieuwe prijs — akkoord nodig",
    partnerLabel: "Nieuwe prijs — wacht op klant",
    adminTooltip: "De prijs is aangepast. De klant moet de nieuwe prijs nog goedkeuren.",
    customerTooltip: "De prijs van dit onderdeel is bijgewerkt. Bevestig de nieuwe prijs om door te gaan.",
    partnerTooltip: "De prijs is door Bureau Vlieland aangepast. De klant moet de nieuwe prijs nog goedkeuren.",
    actor: "klant",
    color: "text-amber-700 dark:text-amber-400",
    bgColor: "bg-amber-100 dark:bg-amber-950/50",
    icon: "AlertTriangle",
  },
  geaccepteerd: {
    adminLabel: "Klant akkoord",
    customerLabel: "Akkoord",
    partnerLabel: "Klantakkoord",
    adminTooltip: "Klant heeft akkoord gegeven. Geen actie nodig tot uitvoering.",
    customerTooltip: "U hebt dit onderdeel bevestigd. Het wordt op de afgesproken datum uitgevoerd.",
    partnerTooltip: "De klant heeft akkoord gegeven. Reserveer dit definitief in je planning.",
    actor: "geen",
    color: "text-green-700 dark:text-green-400",
    bgColor: "bg-green-100 dark:bg-green-950/50",
    icon: "CheckCircle",
  },
  uitgevoerd: {
    adminLabel: "Uitgevoerd",
    customerLabel: "Uitgevoerd",
    partnerLabel: "Uitgevoerd",
    adminTooltip: "Onderdeel is uitgevoerd. Klaar voor facturatie of al gefactureerd.",
    customerTooltip: "Dit onderdeel is uitgevoerd.",
    partnerTooltip: "Dit onderdeel is uitgevoerd. Je kunt het factureren als dat nog niet is gebeurd.",
    actor: "geen",
    color: "text-emerald-700 dark:text-emerald-400",
    bgColor: "bg-emerald-100 dark:bg-emerald-950/50",
    icon: "CheckCircle2",
  },
  geannuleerd: {
    adminLabel: "Geannuleerd",
    customerLabel: "Geannuleerd",
    partnerLabel: "Geannuleerd",
    adminTooltip: "Dit onderdeel is geannuleerd en telt niet meer mee in het programma.",
    customerTooltip: "Dit onderdeel is geannuleerd.",
    partnerTooltip: "Dit onderdeel is geannuleerd en telt niet meer mee in het programma.",
    actor: "geen",
    color: "text-muted-foreground",
    bgColor: "bg-muted",
    icon: "Ban",
  },
  niet_beschikbaar: {
    adminLabel: "Niet beschikbaar",
    customerLabel: "Niet beschikbaar",
    partnerLabel: "Niet beschikbaar gemeld",
    adminTooltip: "Aanbieder heeft afgewezen. Bureau moet vervanging zoeken of opnieuw uitvragen.",
    customerTooltip: "De aanbieder is niet beschikbaar. Bureau Vlieland zoekt een passend alternatief.",
    partnerTooltip: "Je hebt aangegeven niet beschikbaar te zijn. Bureau Vlieland zoekt een alternatief.",
    actor: "bureau",
    color: "text-red-700 dark:text-red-400",
    bgColor: "bg-red-100 dark:bg-red-950/50",
    icon: "XCircle",
  },
  self_arranged: {
    adminLabel: "Zelf te regelen",
    customerLabel: "Zelf te regelen",
    partnerLabel: "Klant regelt zelf",
    adminTooltip: "Klant regelt en betaalt dit onderdeel zelf — buiten Bureau Vlieland om.",
    customerTooltip: "U boekt en betaalt dit onderdeel zelf, rechtstreeks bij de aanbieder.",
    partnerTooltip: "De klant regelt en betaalt dit onderdeel rechtstreeks bij jou, buiten Bureau Vlieland om.",
    actor: "klant",
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

  // Klant heeft nog geen akkoord gegeven. Twee scenario's:
  //  - status = 'pending'  → partner heeft nog niet gereageerd, dus de klant
  //    kan ook nog niks goedkeuren → "wacht op aanbieder".
  //  - status = 'confirmed' / 'alternative' → partner heeft gereageerd, nu is
  //    de klant aan zet → "wacht op klant-akkoord".
  if (item.status === "pending") return "wacht_op_partner";
  return "wacht_op_klant";

}

/**
 * Loose variant van deriveItemDisplayStatus voor plekken die niet een volledig
 * ProgramRequestItem-record hebben (partner-portal, planning-overzichten,
 * werkbank). We castten naar ProgramRequestItem en geven sensible defaults voor
 * de prijs-context — partners zien immers nooit een admin-prijs-override.
 */
export function deriveItemDisplayStatusLoose(item: unknown, ctx?: Partial<DeriveContext>): ItemDisplayStatus {
  return deriveItemDisplayStatus(item as unknown as ProgramRequestItem, {
    programPeople: ctx?.programPeople ?? 0,
    numberOfDays: ctx?.numberOfDays ?? 1,
  });
}
