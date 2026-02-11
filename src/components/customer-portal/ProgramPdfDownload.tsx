import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import jsPDF from "jspdf";
import type { ProgramRequestItem } from "@/types/programRequest";

interface ProgramPdfDownloadProps {
  customerName: string;
  customerCompany?: string;
  selectedDates: Date[];
  numberOfPeople: number;
  items: ProgramRequestItem[];
  referenceNumber?: string | null;
  variant?: "default" | "sm";
}

export const ProgramPdfDownload = ({
  customerName,
  customerCompany,
  selectedDates,
  numberOfPeople,
  items,
  referenceNumber,
  variant = "default",
}: ProgramPdfDownloadProps) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();

  const generatePdf = async () => {
    setIsGenerating(true);

    try {
      const doc = new jsPDF("p", "mm", "a4");
      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 20;
      const contentWidth = pageWidth - margin * 2;
      let y = 20;

      const checkPage = (needed: number) => {
        if (y + needed > 270) {
          doc.addPage();
          y = 20;
        }
      };

      // Header
      doc.setFontSize(20);
      doc.setFont("helvetica", "bold");
      doc.text("Programma", margin, y);
      y += 8;

      doc.setFontSize(14);
      doc.setFont("helvetica", "normal");
      doc.text(customerCompany || customerName, margin, y);
      y += 8;

      if (referenceNumber) {
        doc.setFontSize(10);
        doc.setTextColor(120);
        doc.text(`Referentie: ${referenceNumber}`, margin, y);
        doc.setTextColor(0);
        y += 6;
      }

      // Dates & group size
      doc.setFontSize(10);
      doc.setTextColor(100);
      const dateStr = selectedDates.length > 0
        ? selectedDates.map((d) => format(d, "d MMMM yyyy", { locale: nl })).join(" – ")
        : "Datum nader te bepalen";
      doc.text(`${dateStr}  •  ${numberOfPeople} personen`, margin, y);
      doc.setTextColor(0);
      y += 4;

      // Divider
      y += 4;
      doc.setDrawColor(200);
      doc.line(margin, y, pageWidth - margin, y);
      y += 8;

      // Group items by day
      const activeItems = items
        .filter((i) => i.status !== "cancelled")
        .sort((a, b) => {
          if (a.day_index !== b.day_index) return a.day_index - b.day_index;
          const at = a.confirmed_time || a.proposed_time || a.preferred_time || "zz";
          const bt = b.confirmed_time || b.proposed_time || b.preferred_time || "zz";
          return at.localeCompare(bt);
        });

      const dayGroups: Record<number, ProgramRequestItem[]> = {};
      activeItems.forEach((item) => {
        if (!dayGroups[item.day_index]) dayGroups[item.day_index] = [];
        dayGroups[item.day_index].push(item);
      });

      const sortedDays = Object.keys(dayGroups)
        .map(Number)
        .sort((a, b) => a - b);

      for (const dayIndex of sortedDays) {
        const dayItems = dayGroups[dayIndex];
        const dayDate = selectedDates[dayIndex];

        checkPage(20);

        // Day header
        doc.setFontSize(13);
        doc.setFont("helvetica", "bold");
        const dayLabel = dayDate
          ? `Dag ${dayIndex + 1} – ${format(dayDate, "EEEE d MMMM", { locale: nl })}`
          : `Dag ${dayIndex + 1}`;
        doc.text(dayLabel, margin, y);
        y += 8;

        for (const item of dayItems) {
          checkPage(30);

          // Activity name
          doc.setFontSize(11);
          doc.setFont("helvetica", "bold");
          doc.text(item.block_name, margin + 2, y);
          y += 5;

          // Time + duration
          const time = item.confirmed_time || item.proposed_time || item.preferred_time;
          const metaParts: string[] = [];
          if (time && time !== "flexibel") metaParts.push(`Tijd: ${time}`);
          else metaParts.push("Tijd: Flexibel");
          if (item.duration) metaParts.push(`Duur: ${item.duration}`);
          metaParts.push(`Aanbieder: ${item.provider_name}`);

          doc.setFontSize(9);
          doc.setFont("helvetica", "normal");
          doc.setTextColor(100);
          doc.text(metaParts.join("  •  "), margin + 2, y);
          doc.setTextColor(0);
          y += 5;

          // Location
          if ((item as any).location_address) {
            doc.setFontSize(9);
            doc.setTextColor(100);
            doc.text(`📍 ${(item as any).location_address}`, margin + 2, y);
            doc.setTextColor(0);
            y += 5;
          }

          // Description (wrap text)
          const description = (item as any).block_description || (item as any).description;
          if (description) {
            doc.setFontSize(9);
            doc.setFont("helvetica", "normal");
            const lines = doc.splitTextToSize(description, contentWidth - 4);
            const linesToShow = lines.slice(0, 4);
            checkPage(linesToShow.length * 4 + 2);
            doc.text(linesToShow, margin + 2, y);
            y += linesToShow.length * 4;
          }

          // Customer notes
          if (item.customer_notes) {
            doc.setFontSize(8);
            doc.setTextColor(120);
            doc.setFont("helvetica", "italic");
            const noteLines = doc.splitTextToSize(`Opmerking: ${item.customer_notes}`, contentWidth - 4);
            checkPage(noteLines.length * 3.5 + 2);
            doc.text(noteLines.slice(0, 2), margin + 2, y);
            y += noteLines.slice(0, 2).length * 3.5;
            doc.setFont("helvetica", "normal");
            doc.setTextColor(0);
          }

          y += 4;
        }

        y += 4;
      }

      // Footer
      checkPage(20);
      y += 6;
      doc.setDrawColor(200);
      doc.line(margin, y, pageWidth - margin, y);
      y += 6;
      doc.setFontSize(9);
      doc.setTextColor(120);
      doc.text(
        `Samengesteld door Bureau Vlieland  •  ${format(new Date(), "d MMMM yyyy", { locale: nl })}`,
        margin,
        y
      );

      // Download
      const fileName = `Programma-${customerCompany || customerName}-${format(new Date(), "yyyy-MM-dd")}.pdf`;
      doc.save(fileName.replace(/\s+/g, "-"));

      toast({
        title: "PDF gedownload",
        description: "Het programma-overzicht is als PDF opgeslagen.",
      });
    } catch (error) {
      console.error("PDF generation error:", error);
      toast({
        title: "PDF generatie mislukt",
        description: "Er ging iets mis bij het maken van de PDF.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Button
      onClick={generatePdf}
      disabled={isGenerating}
      variant="outline"
      size={variant === "sm" ? "sm" : "default"}
    >
      {isGenerating ? (
        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
      ) : (
        <Download className="h-4 w-4 mr-2" />
      )}
      {variant === "sm" ? "PDF" : "Download PDF"}
    </Button>
  );
};
