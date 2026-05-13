import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { FileText, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import type { ProgramRequestItem } from "@/types/programRequest";

interface ProgramPdfDownloadProps {
  customerName: string;
  customerCompany?: string;
  selectedDates: Date[];
  numberOfPeople: number;
  items: ProgramRequestItem[];
  referenceNumber?: string | null;
  variant?: "default" | "sm";
  /** Either provided directly or via the parent that resolves it. */
  requestId?: string;
  customerToken?: string;
}

/**
 * Downloads the program as a Word (.docx) document by invoking the
 * `generate-program-docx` edge function. Layout matches the bespoke
 * template (cover page, daily sections, image left + details right).
 */
export const ProgramPdfDownload = ({
  customerName,
  customerCompany,
  referenceNumber,
  requestId,
  customerToken,
}: ProgramPdfDownloadProps) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();

  const handleDownload = async () => {
    if (!requestId) {
      toast({
        title: "Niet beschikbaar",
        description: "Programma kan nog niet gedownload worden.",
        variant: "destructive",
      });
      return;
    }
    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-program-docx", {
        body: { request_id: requestId, customer_token: customerToken },
      });
      if (error) throw error;

      // data may be Blob or ArrayBuffer depending on runtime
      let blob: Blob;
      if (data instanceof Blob) {
        blob = data;
      } else if (data instanceof ArrayBuffer) {
        blob = new Blob([data], {
          type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        });
      } else {
        // Fallback: stringify (shouldn't happen for binary)
        blob = new Blob([data as any], {
          type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        });
      }

      const baseName = referenceNumber
        ? `Programma-${referenceNumber}`
        : `Programma-${customerCompany || customerName}-${format(new Date(), "yyyy-MM-dd")}`;
      const fileName = `${baseName}.docx`.replace(/\s+/g, "-");

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "Word-document gedownload",
        description: "Het programma is opgeslagen als .docx.",
      });
    } catch (err: any) {
      console.error("docx generation error:", err);
      toast({
        title: "Word-document genereren mislukt",
        description: err?.message ?? "Er ging iets mis bij het maken van het document.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Button
      onClick={handleDownload}
      disabled={isGenerating || !requestId}
      variant="outline"
      size="sm"
    >
      {isGenerating ? (
        <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
      ) : (
        <FileText className="h-4 w-4 mr-1.5" />
      )}
      Word-document (.docx)
    </Button>
  );
};
