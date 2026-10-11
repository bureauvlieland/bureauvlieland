import { useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Upload, File, X, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { reportError } from "@/lib/errorReporting";
import type { PartnerItem, PartnerAccommodationQuote } from "@/types/partner";

/**
 * Waar de pdf bij hoort: een onderdeel (activiteit) of een logiesofferte.
 * Bij een onderdeel schrijft de partner het pad zelf (RLS); bij logies
 * beschermt een trigger het veld, dus dat gaat via
 * attach-accommodation-invoice-pdf met het partnertoken.
 */
export type UploadPdfTarget =
  | { kind: "item"; item: PartnerItem }
  | { kind: "accommodation"; quote: PartnerAccommodationQuote; partnerToken: string };

interface UploadInvoicePdfPartnerDialogProps {
  target: UploadPdfTarget | null;
  onClose: () => void;
  onUploaded?: () => void;
}

export function UploadInvoicePdfPartnerDialog({
  target,
  onClose,
  onUploaded,
}: UploadInvoicePdfPartnerDialogProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!target) return null;
  const label =
    target.kind === "item"
      ? { invoiceNumber: target.item.invoiced_number, subject: target.item.block_name }
      : { invoiceNumber: target.quote.invoiced_number, subject: `logies ${target.quote.accommodation_name}` };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== "application/pdf") {
      toast.error("Alleen PDF-bestanden zijn toegestaan");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Bestand is te groot (max 10MB)");
      return;
    }
    setSelectedFile(file);
  };

  const handleClose = () => {
    setSelectedFile(null);
    onClose();
  };

  const handleUpload = async () => {
    if (!selectedFile || !target) return;
    setIsSubmitting(true);
    try {
      // De map is altijd de partner zelf: de opslagregels staan alleen uploads in de eigen map toe.
      const fileName =
        target.kind === "item"
          ? `${target.item.provider_id}/${target.item.request_id}/${target.item.id}-${Date.now()}.pdf`
          : `${target.quote.partner_id}/${target.quote.request_id}/${target.quote.id}-${Date.now()}.pdf`;
      const { error: uploadError } = await supabase.storage
        .from("partner-invoices")
        .upload(fileName, selectedFile);
      if (uploadError) throw uploadError;

      if (target.kind === "item") {
        // Update purchase invoice row (RLS: partner can update own)
        const { error: invErr } = await supabase
          .from("partner_purchase_invoices")
          .update({ file_path: fileName, updated_at: new Date().toISOString() })
          .eq("item_id", target.item.id)
          .is("file_path", null);
        if (invErr) throw invErr;
        // Update item link
        const { error: itemErr } = await supabase
          .from("program_request_items")
          .update({ invoiced_file_path: fileName, updated_at: new Date().toISOString() })
          .eq("id", target.item.id);
        if (itemErr) throw itemErr;
      } else {
        const { data, error: attachErr } = await supabase.functions.invoke("attach-accommodation-invoice-pdf", {
          body: { quoteId: target.quote.id, partnerToken: target.partnerToken, filePath: fileName },
        });
        if (attachErr) throw attachErr;
        if (data?.error) throw new Error(data.error);
      }

      toast.success("PDF toegevoegd aan factuur");
      onUploaded?.();
      handleClose();
    } catch (err) {
      reportError(err, { where: "UploadInvoicePdfPartnerDialog: Upload error" });
      toast.error(err instanceof Error && err.message ? `PDF niet toegevoegd: ${err.message}` : "PDF niet toegevoegd. Probeer het opnieuw.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={!!target} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            PDF toevoegen aan factuur
          </DialogTitle>
          <DialogDescription>
            Factuur{label.invoiceNumber ? ` ${label.invoiceNumber}` : ""} voor {label.subject}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <Label>PDF-bestand</Label>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf"
            onChange={handleFileSelect}
            className="hidden"
          />
          {selectedFile ? (
            <div className="flex items-center justify-between gap-2 rounded-md border border-border bg-muted/30 p-2">
              <div className="flex items-center gap-2 min-w-0">
                <File className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="text-sm truncate">{selectedFile.name}</span>
                <span className="text-xs text-muted-foreground shrink-0">
                  ({(selectedFile.size / 1024).toFixed(0)} KB)
                </span>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7 shrink-0"
                onClick={() => setSelectedFile(null)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="h-4 w-4 mr-2" />
              PDF kiezen (max 10MB)
            </Button>
          )}
          <p className="text-xs text-muted-foreground">
            De PDF wordt gekoppeld aan de eerder geregistreerde factuur, zodat Bureau Vlieland deze kan verwerken.
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isSubmitting}>
            Annuleren
          </Button>
          <Button onClick={handleUpload} disabled={!selectedFile || isSubmitting}>
            {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Uploaden
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
