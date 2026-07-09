import { BedDouble, Calendar, ClipboardList, Receipt, FileSignature } from "lucide-react";
import type { TabHeaderProps } from "./TabHeader";
import type { AccommodationQuote } from "@/types/accommodation";

interface StatusSummary {
  total: number;
  confirmed: number;
  pending: number;
  alternative: number;
  counter_proposed?: number;
}

interface BuildArgs {
  section: "accommodation" | "program" | "practical" | "billing" | "accept";
  statusSummary: StatusSummary;
  accommodationQuotes: AccommodationQuote[];
  hasAccommodationRequest: boolean;
  billingComplete: boolean;
  termsAccepted: boolean;
  customerApprovedCount: number;
  customerApprovableCount: number;
  customerActionsCount: number;
  /**
   * Projectfase. Pas vanaf 'offerte_verstuurd' kan de klant onderdelen
   * goedkeuren — daarvoor werkt Bureau Vlieland nog aan het voorstel.
   */
  quoteStatus?: string | null;
  isPostExecution?: boolean;
}

type TabHeaderConfig = Pick<TabHeaderProps, "icon" | "title" | "subtitle" | "badge">;

/**
 * Eén centrale plek voor de per-tab koppen, zodat Desktop- en Mobile-views
 * exact dezelfde teksten en statussen tonen.
 */
export function buildTabHeader({
  section,
  statusSummary,
  accommodationQuotes,
  hasAccommodationRequest,
  billingComplete,
  termsAccepted,
  customerApprovedCount,
  customerApprovableCount,
  customerActionsCount,
  quoteStatus,
  isPostExecution = false,
}: BuildArgs): TabHeaderConfig {
  switch (section) {
    case "accommodation": {
      const selected = accommodationQuotes.some((q) => q.status === "selected");
      const received = accommodationQuotes.filter((q) => q.status === "submitted").length;
      const badge = selected
        ? { label: "Gekozen", variant: "default" as const }
        : received > 0
          ? { label: `${received} offerte${received !== 1 ? "s" : ""}`, variant: "secondary" as const }
          : hasAccommodationRequest
            ? { label: "In behandeling", variant: "outline" as const }
            : { label: "Nog te regelen", variant: "outline" as const };
      return {
        icon: BedDouble,
        title: "Uw logies",
        subtitle: selected
          ? "U heeft uw logies vastgelegd. Hieronder vindt u de details."
          : received > 0
            ? "Vergelijk de logies-offertes en kies waar u slaapt."
            : "Wij verzamelen logies-offertes voor u — u hoort het zodra ze binnen zijn.",
        badge,
      };
    }
    case "program": {
      if (isPostExecution) {
        return {
          icon: Calendar,
          title: "Uw programma",
          subtitle: "Het programma is uitgevoerd. De resterende acties staan bij facturatie en voorwaarden.",
          badge: { label: "Uitgevoerd", variant: "default" as const },
        };
      }

      const isPreOfferte =
        quoteStatus === "concept" || quoteStatus === "in_afstemming";
      const allConfirmed =
        statusSummary.total > 0 &&
        statusSummary.pending === 0 &&
        statusSummary.alternative === 0 &&
        (statusSummary.counter_proposed || 0) === 0;
      const allApproved =
        customerApprovableCount > 0 && customerApprovedCount >= customerApprovableCount;
      const badge =
        statusSummary.total === 0
          ? { label: "In voorbereiding", variant: "outline" as const }
          : isPreOfferte
            ? { label: "In voorbereiding", variant: "outline" as const }
            : allApproved
              ? { label: "Alles goedgekeurd", variant: "default" as const }
              : customerActionsCount > 0
                ? {
                    // Amber 'secondary' — geen rood alarm, wél duidelijk dat u aan zet bent.
                    label: `${customerActionsCount} goed te keuren`,
                    variant: "secondary" as const,
                  }
                : allConfirmed
                  ? { label: "Klaar voor ondertekening", variant: "secondary" as const }
                  : { label: "Wacht op partners", variant: "outline" as const };
      return {
        icon: Calendar,
        title: "Uw programma",
        subtitle:
          statusSummary.total === 0 || isPreOfferte
            ? "Bureau Vlieland stelt uw programma samen. Zodra het klaarstaat, vindt u het hier terug."
            : "",
        badge,
      };
    }
    case "practical":
      return {
        icon: ClipboardList,
        title: "Praktische info",
        subtitle: "Boot, fietsen, bagage en alles wat handig is om te weten.",
      };
    case "billing":
      return {
        icon: Receipt,
        title: "Facturatie",
        subtitle: "Aan wie sturen we de factuur? Vul of controleer uw gegevens.",
        badge: billingComplete
          ? { label: "Compleet", variant: "default" as const }
          : { label: "Nog invullen", variant: "destructive" as const },
      };
    case "accept":
      return {
        icon: FileSignature,
        title: "Akkoord & voorwaarden",
        subtitle: termsAccepted
          ? "U heeft akkoord gegeven. Hieronder vindt u uw ondertekening terug."
          : "Laatste stap: bekijk de voorwaarden en geef akkoord om de boeking definitief te maken.",
        badge: termsAccepted
          ? { label: "Ondertekend", variant: "default" as const }
          : { label: "Nog open", variant: "secondary" as const },
      };
  }
}
