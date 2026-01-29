import { useState } from "react";
import { format, parseISO } from "date-fns";
import { nl } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Download, Loader2 } from "lucide-react";
import type { PartnerItem, PartnerAccommodationQuote } from "@/types/partner";

interface ExportInvoicesButtonProps {
  items: PartnerItem[];
  accommodationQuotes: PartnerAccommodationQuote[];
  variant?: "to-invoice" | "invoiced" | "all";
}

export const ExportInvoicesButton = ({
  items,
  accommodationQuotes,
  variant = "all",
}: ExportInvoicesButtonProps) => {
  const [isExporting, setIsExporting] = useState(false);

  // Helper to determine effective status
  const getEffectiveStatus = (item: PartnerItem): string => {
    const hasCustomerAccepted = !!item.customer_accepted_at;
    return (item.status === "confirmed" && hasCustomerAccepted) ? "accepted" : item.status;
  };

  const handleExport = () => {
    setIsExporting(true);

    try {
      // Filter based on variant
      let filteredItems: PartnerItem[] = [];
      let filteredQuotes: PartnerAccommodationQuote[] = [];

      if (variant === "invoiced") {
        filteredItems = items.filter((i) => i.invoiced_number !== null);
        filteredQuotes = accommodationQuotes.filter((q) => q.invoiced_number !== null);
      } else if (variant === "to-invoice") {
        filteredItems = items.filter((i) => {
          const effectiveStatus = getEffectiveStatus(i);
          return (effectiveStatus === "accepted" || effectiveStatus === "executed") && 
            !i.invoiced_number && 
            i.program_requests.terms_accepted_at !== null;
        });
        filteredQuotes = accommodationQuotes.filter(
          (q) => q.status === "selected" && !q.invoiced_number
        );
      } else {
        filteredItems = items;
        filteredQuotes = accommodationQuotes;
      }

      // CSV headers
      const headers = [
        "Type",
        "Naam",
        "Klant",
        "Referentie",
        "Datum",
        "Aantal personen",
        "Bedrag",
        "Factuurnummer",
        "Factuurdatum",
        "Status",
        "Commissie",
      ];

      // Convert items to rows
      const itemRows = filteredItems.map((item) => {
        const dates = (item.program_requests.selected_dates || []) as string[];
        const activityDate = dates[item.day_index];
        const effectiveStatus = getEffectiveStatus(item);

        return [
          "Activiteit",
          item.block_name,
          item.program_requests.customer_company || item.program_requests.customer_name,
          item.program_requests.reference_number || "",
          activityDate ? format(parseISO(activityDate), "dd-MM-yyyy", { locale: nl }) : "",
          item.program_requests.number_of_people.toString(),
          (item.invoiced_amount || item.quoted_price || 0).toFixed(2).replace(".", ","),
          item.invoiced_number || "",
          item.invoiced_date ? format(parseISO(item.invoiced_date), "dd-MM-yyyy", { locale: nl }) : "",
          effectiveStatus,
          item.commission_amount ? item.commission_amount.toFixed(2).replace(".", ",") : "",
        ];
      });

      // Convert quotes to rows
      const quoteRows = filteredQuotes.map((quote) => {
        const req = quote.accommodation_requests;
        return [
          "Logies",
          quote.accommodation_name,
          req.customer_company || req.customer_name,
          "", // No reference_number on accommodation_requests in partner context
          `${format(parseISO(req.arrival_date), "dd-MM-yyyy", { locale: nl })} - ${format(parseISO(req.departure_date), "dd-MM-yyyy", { locale: nl })}`,
          req.number_of_guests.toString(),
          (quote.invoiced_amount || quote.price_total || 0).toFixed(2).replace(".", ","),
          quote.invoiced_number || "",
          quote.invoiced_date ? format(parseISO(quote.invoiced_date), "dd-MM-yyyy", { locale: nl }) : "",
          quote.status,
          quote.commission_amount ? quote.commission_amount.toFixed(2).replace(".", ",") : "",
        ];
      });

      // Combine and create CSV
      const allRows = [...itemRows, ...quoteRows];
      
      // Escape CSV values
      const escapeCSV = (value: string) => {
        if (value.includes(",") || value.includes('"') || value.includes("\n")) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      };

      const csvContent = [
        headers.map(escapeCSV).join(";"),
        ...allRows.map((row) => row.map(escapeCSV).join(";")),
      ].join("\n");

      // Add BOM for Excel compatibility with special characters
      const BOM = "\uFEFF";
      const blob = new Blob([BOM + csvContent], { type: "text/csv;charset=utf-8;" });
      
      // Create download link
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `facturatie-${variant}-${format(new Date(), "yyyy-MM-dd")}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } finally {
      setIsExporting(false);
    }
  };

  const totalCount = 
    (variant === "invoiced" 
      ? items.filter((i) => i.invoiced_number !== null).length + accommodationQuotes.filter((q) => q.invoiced_number !== null).length
      : variant === "to-invoice"
        ? items.filter((i) => {
            const effectiveStatus = getEffectiveStatus(i);
            return (effectiveStatus === "accepted" || effectiveStatus === "executed") && 
              !i.invoiced_number && 
              i.program_requests.terms_accepted_at !== null;
          }).length + accommodationQuotes.filter((q) => q.status === "selected" && !q.invoiced_number).length
        : items.length + accommodationQuotes.length);

  if (totalCount === 0) return null;

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleExport}
      disabled={isExporting}
    >
      {isExporting ? (
        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
      ) : (
        <Download className="h-4 w-4 mr-2" />
      )}
      Export CSV ({totalCount})
    </Button>
  );
};
