import type { PartnerDashboardData } from "@/types/partner";
import { hasOpenAdminPriceChange, getNumberOfDays } from "@/lib/portalPricing";
import { canPartnerDismissInvoiceItem } from "@/lib/partnerInvoiceDismiss";
import { canPartnerInvoiceItem } from "@/lib/partnerInvoicing";
import { formatDurationWindow, getEffectiveTime } from "@/lib/timeUtils";

/**
 * De werkbank van de partner: elk onderdeel en elke logiesaanvraag waar hij
 * iets mee moet, in vier groepen (beoordelen, wijzigingen, inplannen,
 * factureren) met per rij een hint in zijn woorden. Los van de component
 * zodat de werkbankpagina er ook de melding bovenaan uit kan afleiden.
 */
export type Bucket = "review" | "changes" | "schedule" | "invoice";

export interface WerkbankRow {
  id: string;
  bucket: Bucket;
  href: string;
  reference: string | null;
  customerLabel: string;
  date: Date | null;
  itemLabel: string;
  timeLabel?: string | null;
  hint: string;
  dismissable?: boolean;
}

export const BUCKET_ORDER: Bucket[] = ["review", "changes", "schedule", "invoice"];

export function buildWerkbankRows(data: PartnerDashboardData): WerkbankRow[] {
  const rows: WerkbankRow[] = [];

  data.items.forEach(i => {
    if (i.is_concept) return;
    if (i.invoiced_number || i.status === "invoiced") return;
    if ((i as any).partner_dismissed_at) return;
    const req = i.program_requests;
    if (req.cancelled_at || req.status === "cancelled" || i.status === "cancelled" || i.status === "unavailable") return;

    const customerLabel = req.customer_company || req.customer_name;
    const dates = (req.selected_dates || []) as string[];
    const dateStr = dates[i.day_index] || dates[0];
    const date = dateStr ? new Date(dateStr) : null;
    const base = {
      id: i.id,
      href: `/partner/project/${req.id}`,
      reference: req.reference_number ?? null,
      customerLabel,
      date,
      itemLabel: i.block_name,
      timeLabel: formatDurationWindow(getEffectiveTime(i as any), (i as any).duration),
    };

    if (i.status === "counter_proposed") {
      const wanted = (i as any).customer_counter_time;
      rows.push({
        ...base,
        bucket: "review",
        hint: wanted
          ? `De klant wil liever ${wanted}: ga akkoord of stel een andere tijd voor.`
          : "De klant stelt een andere tijd voor: reageer.",
      });
      return;
    }
    if (i.status === "pending") {
      rows.push({ ...base, bucket: "review", hint: "Beoordeel deze aanvraag." });
      return;
    }

    // Skip further buckets once uitgevoerd/gefactureerd staat vast, behalve invoice.
    const effPeople = i.override_people ?? req.number_of_people ?? 1;
    const numDays = getNumberOfDays(dates);
    if (!i.executed_at && i.status !== "executed" && hasOpenAdminPriceChange(i as any, effPeople, numDays)) {
      rows.push({ ...base, bucket: "changes", hint: "Bureau Vlieland heeft de prijs of het aantal aangepast." });
      return;
    }

    const customerOk = i.customer_accepted_at || i.customer_approved_at;
    const isConfirmed = i.status === "confirmed" || i.status === "accepted";
    if (isConfirmed && customerOk && !i.executed_at && req.terms_accepted_at) {
      if (!i.confirmed_time && !i.proposed_time) {
        rows.push({ ...base, bucket: "schedule", hint: "Plan tijd in en bevestig." });
        return;
      }
    }

    const canInvoice = canPartnerInvoiceItem(i, req);
    if (canInvoice) {
      const dismissable = canPartnerDismissInvoiceItem({
        status: i.status,
        invoiced_number: i.invoiced_number ?? null,
        partner_dismissed_at: (i as any).partner_dismissed_at ?? null,
      });
      rows.push({ ...base, bucket: "invoice", hint: "Registreer uw factuur.", dismissable });
    }
  });

  (data.accommodationQuotes ?? []).forEach(q => {
    const r = q.accommodation_requests;
    if (q.status === "cancelled" || q.status === "rejected" || q.status === "declined" || r.status === "cancelled")
      return;
    if (q.invoiced_number || q.status === "invoiced" || q.status === "executed") return;
    const customerLabel = r.customer_company || r.customer_name;
    const date = r.arrival_date ? new Date(r.arrival_date) : null;
    const base = {
      id: q.id,
      href: `/partner/logies/${r.id}`,
      reference: (r as any).reference_number ?? null,
      customerLabel,
      date,
      itemLabel: q.accommodation_name || "Logiesaanvraag",
    };

    if (q.status === "pending") {
      rows.push({ ...base, bucket: "review", hint: "Beoordeel deze logiesaanvraag." });
      return;
    }

    if (q.status === "selected" && !q.invoiced_number) {
      rows.push({ ...base, bucket: "invoice", hint: "Registreer factuur voor logies." });
    }
  });

  return rows.sort((a, b) => {
    if (!a.date && !b.date) return 0;
    if (!a.date) return 1;
    if (!b.date) return -1;
    return a.date.getTime() - b.date.getTime();
  });
}

export interface WerkbankSummary {
  total: number;
  review: number;
  changes: number;
  schedule: number;
  invoice: number;
}

export function summarizeWerkbank(rows: WerkbankRow[]): WerkbankSummary {
  const count = (b: Bucket) => rows.filter((r) => r.bucket === b).length;
  return { total: rows.length, review: count("review"), changes: count("changes"), schedule: count("schedule"), invoice: count("invoice") };
}

/** De melding bovenaan de werkbank: de belangrijkste volgende stap in één zin, of niets. */
export function werkbankHeadline(summary: WerkbankSummary): { tone: "warning" | "info"; title: string; text: string } | null {
  if (summary.review > 0) {
    return {
      tone: "warning",
      title: summary.review === 1 ? "1 aanvraag wacht op uw reactie" : `${summary.review} aanvragen wachten op uw reactie`,
      text: "Bevestig, stel een andere tijd voor of meld dat u niet beschikbaar bent; de klant hoort het direct.",
    };
  }
  if (summary.changes > 0) {
    return {
      tone: "warning",
      title: summary.changes === 1 ? "1 wijziging vraagt uw akkoord" : `${summary.changes} wijzigingen vragen uw akkoord`,
      text: "Bureau Vlieland of de klant heeft iets aangepast; kijk of het nog klopt.",
    };
  }
  if (summary.schedule > 0) {
    return {
      tone: "warning",
      title: summary.schedule === 1 ? "1 onderdeel wacht op een tijd" : `${summary.schedule} onderdelen wachten op een tijd`,
      text: "De klant heeft bevestigd; leg de tijd vast.",
    };
  }
  if (summary.invoice > 0) {
    return {
      tone: "info",
      title: summary.invoice === 1 ? "1 onderdeel kan gefactureerd worden" : `${summary.invoice} onderdelen kunnen gefactureerd worden`,
      text: "Registreer uw factuur, of sluit het onderdeel als er geen factuur volgt.",
    };
  }
  return null;
}
