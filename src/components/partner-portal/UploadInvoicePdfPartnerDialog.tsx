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
import type { PartnerItem } from "@/types/partner";

interface UploadInvoicePdfPartnerDialogProps {
  item: PartnerItem | null;
  onClose: () => void;
  onUploaded?: () => void;
}

export function UploadInvoicePdfPartnerDialog({
  item,
  onClose,
  onUploaded,
}: UploadInvoicePdfPartnerDialogProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!item) return null;

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
    if (!selectedFile || !item) return;
    setIsSubmitting(true);
    try {
      const fileExt = selectedFile.name.split(".").pop();
      const fileName = `${item.provider_id}/${item.request_id}/${item.id}-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("partner-invoices")
        .upload(fileName, selectedFile);
      if (uploadError) throw uploadError;

      // Update purchase invoice row (RLS: partner can update own)
      const { error: invErr } = await supabase
        .from("partner_purchase_invoices")
        .update({ file_path: fileName, updated_at: new Date().toISOString() })
        .eq("item_id", item.id)
        .is("file_path", null);
      if (invErr) throw invErr;

      // Update item link
      const { error: itemErr } = await supabase
        .from("program_request_items")
        .update({ invoiced_file_path: fileName, updated_at: new Date().toISOString() })
        .eq("id", item.id);
      if (itemErr) throw itemErr;

      toast.success("PDF toegevoegd aan factuur");
      onUploaded?.();
      handleClose();
    } catch (err) {
      console.error("Upload error:", err);
      toast.error("Fout bij uploaden PDF");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={!!item} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            PDF toevoegen aan factuur
          </DialogTitle>
          <DialogDescription>
            Factuur{item.invoiced_number ? ` ${item.invoiced_number}` : ""} voor {item.block_name}
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
