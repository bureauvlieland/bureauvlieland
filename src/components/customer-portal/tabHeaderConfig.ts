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
      // Woordenlijst klant (plan klantportaal): info = wacht op een ander,
      // warning = u bent aan zet, success = rond.
      const badge = selected
        ? { label: "Gekozen", tone: "info" as const }
        : received > 0
          ? { label: "Kies uw logies", tone: "warning" as const }
          : hasAccommodationRequest
            ? { label: "Aangevraagd", tone: "info" as const }
            : { label: "Nog te regelen", tone: "warning" as const };
      return {
        icon: BedDouble,
        title: "Uw logies",
        subtitle: selected
          ? "U heeft uw logies vastgelegd. Hieronder vindt u de details."
          : received > 0
            ? "Vergelijk de logies-offertes en kies waar u slaapt."
            : "Wij verzamelen logies-offertes voor u. U hoort het zodra ze binnen zijn.",
        badge,
      };
    }
    case "program": {
      if (isPostExecution) {
        return {
          icon: Calendar,
          title: "Uw programma",
          subtitle: "Het programma is uitgevoerd. De resterende acties staan bij facturatie en voorwaarden.",
          badge: { label: "Uitgevoerd", tone: "success" as const },
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
        statusSummary.total === 0 || isPreOfferte
          ? { label: "In voorbereiding", tone: "info" as const }
          : allApproved
            ? { label: "Alles goedgekeurd", tone: "success" as const }
            : customerActionsCount > 0
              ? { label: `${customerActionsCount} goed te keuren`, tone: "warning" as const }
              : allConfirmed
                ? { label: "Klaar voor ondertekening", tone: "warning" as const }
                : { label: "Wacht op aanbieders", tone: "info" as const };
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
          ? { label: "Compleet", tone: "success" as const }
          : { label: "Aanvullen", tone: "warning" as const },
      };
    case "accept":
      return {
        icon: FileSignature,
        title: "Akkoord en voorwaarden",
        subtitle: termsAccepted
          ? "U heeft akkoord gegeven. Hieronder vindt u uw ondertekening terug."
          : "Laatste stap: bekijk de voorwaarden en geef akkoord om de boeking definitief te maken.",
        badge: termsAccepted
          ? { label: "Ondertekend", tone: "success" as const }
          : { label: "Nog te ondertekenen", tone: "warning" as const },
      };
  }
}
