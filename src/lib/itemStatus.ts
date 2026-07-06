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
import { hasOpenAdminPriceChange, priceChangeRequiresReapproval } from "@/lib/portalPricing";

export type ItemDisplayStatus =
  | "wacht_op_partner"
  | "wacht_op_klant"
  | "prijs_gewijzigd"
  | "klant_akkoord_wacht_partner"
  | "klant_akkoord_bureau"
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
    adminLabel: "Wacht op klant-goedkeuring",
    customerLabel: "Goedkeuring nodig",
    partnerLabel: "Voorstel verstuurd",
    adminTooltip: "Dit onderdeel wacht op goedkeuring door de klant voordat Bureau Vlieland verder kan.",
    customerTooltip: "Keur dit onderdeel goed als onderdeel van uw programmavoorstel.",
    partnerTooltip: "Dit onderdeel staat bij de klant ter goedkeuring.",
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
  klant_akkoord_wacht_partner: {
    adminLabel: "Klant akkoord — wacht op aanbieder",
    customerLabel: "Door u goedgekeurd",
    partnerLabel: "Klant akkoord — reactie gevraagd",
    adminTooltip: "Klant heeft dit onderdeel goedgekeurd. We wachten nog op bevestiging van de aanbieder.",
    customerTooltip: "U hebt dit onderdeel goedgekeurd. Wij wachten nog op bevestiging van de aanbieder en houden u op de hoogte.",
    partnerTooltip: "De klant heeft dit onderdeel goedgekeurd. Bevestig of stel een alternatief voor.",
    actor: "partner",
    color: "text-green-700 dark:text-green-400",
    bgColor: "bg-green-100 dark:bg-green-950/50",
    icon: "CheckCircle",
  },
  klant_akkoord_bureau: {
    adminLabel: "Klant akkoord — Bureau regelt zelf",
    customerLabel: "Door u goedgekeurd",
    partnerLabel: "Door Bureau Vlieland geregeld",
    adminTooltip: "Klant heeft dit onderdeel goedgekeurd. Bureau Vlieland regelt dit zelf — geen aanbieder-bevestiging nodig.",
    customerTooltip: "U hebt dit onderdeel goedgekeurd. Bureau Vlieland regelt dit zelf — geen aanbieder-bevestiging nodig.",
    partnerTooltip: "Bureau Vlieland regelt dit onderdeel zelf.",
    actor: "geen",
    color: "text-green-700 dark:text-green-400",
    bgColor: "bg-green-100 dark:bg-green-950/50",
    icon: "CheckCircle",
  },
  geaccepteerd: {
    adminLabel: "Klant akkoord — aanbieder bevestigd",
    customerLabel: "Door u goedgekeurd",
    partnerLabel: "Klant akkoord — bevestig in planning",
    adminTooltip: "Klant heeft goedgekeurd en de aanbieder heeft bevestigd. Geen actie nodig tot uitvoering.",
    customerTooltip: "U hebt dit onderdeel goedgekeurd. De aanbieder heeft het bevestigd.",
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
  /**
   * Projectfase (`program_requests.quote_status`). Bepaalt of de klant nog
   * akkoord moet geven vóórdat we überhaupt naar de aanbieder gaan. Optioneel
   * voor backwards-compat met views die deze context (nog) niet meegeven —
   * dan vallen we terug op de oude itemstatus-gebaseerde afleiding.
   */
  quoteStatus?: string | null;
  /**
   * Voor wie wordt het label berekend? De pre-offerte maskering
   * (alles → "Wacht op aanbieder" tijdens concept/in_afstemming) is alléén
   * bedoeld voor het klantportaal — admin en partner-views willen de feitelijke
   * itemstatus zien. Default = "customer" voor backwards-compat.
   */
  audience?: "admin" | "customer" | "partner";
}

/**
 * Bepaalt het label voor één onderdeel op basis van de feitelijke staat.
 *
 * Volgorde van checks:
 *   1. Terminale toestanden (cancelled, executed, invoiced, unavailable, self_arranged)
 *   2. Klant heeft akkoord gegeven (customer_accepted_at)
 *      - met openstaande nieuwe prijs → prijs_gewijzigd
 *      - bureau-onderdeel → klant_akkoord_bureau
 *      - partner nog niet bevestigd → klant_akkoord_wacht_partner
 *      - anders → geaccepteerd
 *   3. Projectfase = offerte_verstuurd en klant heeft nog niet goedgekeurd
 *      → wacht_op_klant voor alle actieve onderdelen (ook Bureau-onderdelen)
 *   4. Partner heeft gereageerd maar klant nog niet akkoord → wacht_op_klant
 *   5. Default → wacht_op_partner
 */
export function deriveItemDisplayStatus(
  item: ProgramRequestItem,
  ctx: DeriveContext,
): ItemDisplayStatus {
  if (item.block_type === "self_arranged") return "self_arranged";
  if (item.status === "cancelled") return "geannuleerd";
  if (item.status === "executed" || item.status === "invoiced") return "uitgevoerd";
  if (item.status === "unavailable") return "niet_beschikbaar";

  // Een eerder gegeven klant-akkoord vervalt zodra de aanbieder een
  // ALTERNATIEF voorstel doet — TENZIJ de klant ná dat alternatief opnieuw
  // heeft goedgekeurd (customer_approved_at >= status_updated_at).
  const approvedAfterAlternative =
    item.status === "alternative" &&
    !!item.customer_approved_at &&
    !!(item as any).status_updated_at &&
    new Date(item.customer_approved_at).getTime() >=
      new Date((item as any).status_updated_at).getTime();

  const hasAcceptance =
    !!item.customer_accepted_at &&
    (item.status !== "alternative" || approvedAfterAlternative);
  const hasApproval =
    !!item.customer_approved_at &&
    (item.status !== "alternative" || approvedAfterAlternative);

  // Open admin-prijswijziging die de klant nog niet heeft afgehandeld.
  const openPriceChange = hasOpenAdminPriceChange(
    item,
    item.override_people ?? ctx.programPeople,
    ctx.numberOfDays,
  );

  if (hasAcceptance) {
    if (
      openPriceChange &&
      item.admin_price_override_updated_at &&
      new Date(item.admin_price_override_updated_at).getTime() >
        new Date(item.customer_accepted_at!).getTime()
    ) {
      return "prijs_gewijzigd";
    }
    if ((item as any).provider_id === "bureau") return "klant_akkoord_bureau";
    // Klant heeft (her)bevestigd; bij een alternatief moet de aanbieder de
    // nieuwe tijd/prijs nog definitief vastleggen.
    if (item.status === "pending" || item.status === "alternative") {
      return "klant_akkoord_wacht_partner";
    }
    return "geaccepteerd";
  }

  // Zolang de klant dit onderdeel niet heeft goedgekeurd, is de klant aan zet —
  // ongeacht de projectfase (concept, in_afstemming of offerte_verstuurd) en
  // ongeacht of het een bureau- of partneronderdeel is. Alleen wanneer de
  // aanbieder ná klant-akkoord een ALTERNATIEF voorstel heeft gedaan (status
  // "alternative" zonder herbevestiging) valt het onderdeel terug op de
  // partner-flow hieronder.
  const isPreApprovalPhase =
    ctx.quoteStatus === "concept" ||
    ctx.quoteStatus === "in_afstemming" ||
    ctx.quoteStatus === "offerte_verstuurd";
  if (isPreApprovalPhase && !hasApproval && item.status !== "alternative") {
    return "wacht_op_klant";
  }


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
    quoteStatus: ctx?.quoteStatus ?? null,
    audience: ctx?.audience,
  });
}
