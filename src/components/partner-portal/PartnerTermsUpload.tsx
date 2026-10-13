import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField, Notice, OptionCard, OptionGroup } from "@/components/system";
import { ExternalLink, Eye, Loader2, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format, parseISO } from "date-fns";
import { nl } from "date-fns/locale";
import { reportError } from "@/lib/errorReporting";
import { SheetSection } from "./SheetSection";

/**
 * Algemene voorwaarden (partnerportaal fase 4): twee `OptionCard`s (eigen
 * pdf of de standaardvoorwaarden van het bureau), de geüploade pdf als
 * `Notice`, de upload als gewoon bestandsveld op `FormField`.
 */
interface PartnerTermsUploadProps {
  partnerId: string;
  termsPdfPath: string | null;
  termsUploadedAt: string | null;
  usesDefaultTerms: boolean;
  onUpdate: () => void;
}

const DEFAULT_TERMS_URL = "/partner-voorwaarden";
const MAX_PDF_BYTES = 5 * 1024 * 1024;

export const PartnerTermsUpload = ({ partnerId, termsPdfPath, termsUploadedAt, usesDefaultTerms, onUpdate }: PartnerTermsUploadProps) => {
  const { toast } = useToast();
  const [isUploading, setIsUploading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [selectedOption, setSelectedOption] = useState<"custom" | "default">(usesDefaultTerms ? "default" : "custom");

  const publicUrl = (path: string) => supabase.storage.from("partner-terms").getPublicUrl(path).data.publicUrl;

  const handleOptionChange = async (value: "custom" | "default") => {
    setSelectedOption(value);
    if (value === "default" || (value === "custom" && usesDefaultTerms)) {
      setIsSaving(true);
      try {
        const { error } = await supabase.from("partners").update({ uses_default_terms: value === "default" }).eq("id", partnerId);
        if (error) throw error;
        if (value === "default") toast({ title: "Opgeslagen", description: "U gebruikt de standaardvoorwaarden van Bureau Vlieland." });
        onUpdate();
      } catch (err) {
        reportError(err, { where: "PartnerTermsUpload: Error updating terms preference" });
        toast({ title: "Keuze niet opgeslagen", description: "Probeer het opnieuw.", variant: "destructive" });
      } finally {
        setIsSaving(false);
      }
    }
  };

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (file.type !== "application/pdf") {
      setUploadError("Alleen een pdf is toegestaan.");
      return;
    }
    if (file.size > MAX_PDF_BYTES) {
      setUploadError("Het bestand is te groot (maximaal 5 MB).");
      return;
    }
    setUploadError(null);
    setIsUploading(true);
    try {
      if (termsPdfPath) await supabase.storage.from("partner-terms").remove([termsPdfPath]);
      // Willekeurig achtervoegsel, zodat het publieke pad niet te raden is.
      const fileName = `${partnerId}/${crypto.randomUUID()}-algemene-voorwaarden.pdf`;
      const { error: storageError } = await supabase.storage.from("partner-terms").upload(fileName, file, { upsert: true });
      if (storageError) throw storageError;
      const { error: updateError } = await supabase.from("partners").update({ terms_pdf_path: fileName, terms_uploaded_at: new Date().toISOString(), uses_default_terms: false }).eq("id", partnerId);
      if (updateError) throw updateError;
      toast({ title: "Voorwaarden opgeslagen" });
      onUpdate();
    } catch (err) {
      reportError(err, { where: "PartnerTermsUpload: Error uploading terms" });
      setUploadError("De upload is mislukt. Probeer het opnieuw.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async () => {
    if (!termsPdfPath) return;
    setIsDeleting(true);
    try {
      const { error: storageError } = await supabase.storage.from("partner-terms").remove([termsPdfPath]);
      if (storageError) throw storageError;
      const { error: updateError } = await supabase.from("partners").update({ terms_pdf_path: null, terms_uploaded_at: null }).eq("id", partnerId);
      if (updateError) throw updateError;
      toast({ title: "Voorwaarden verwijderd" });
      onUpdate();
    } catch (err) {
      reportError(err, { where: "PartnerTermsUpload: Error deleting terms" });
      toast({ title: "Verwijderen mislukt", description: "Probeer het opnieuw.", variant: "destructive" });
    } finally {
      setIsDeleting(false);
    }
  };

  const hasOwnPdf = !!termsPdfPath && !usesDefaultTerms;

  return (
    <SheetSection title="Algemene voorwaarden" help="De klant ziet uw voorwaarden bij elke boeking en gaat ermee akkoord.">
      <OptionGroup name="Voorwaarden" columns={2}>
        <OptionCard selected={selectedOption === "custom"} onSelect={() => void handleOptionChange("custom")} disabled={isSaving} title="Eigen voorwaarden" description="Upload uw eigen voorwaarden als pdf." />
        <OptionCard selected={selectedOption === "default"} onSelect={() => void handleOptionChange("default")} disabled={isSaving} title="Standaardvoorwaarden van Bureau Vlieland" description="Dekken de meeste situaties." />
      </OptionGroup>

      {selectedOption === "custom" ? (
        <>
          {hasOwnPdf && (
            <Notice tone="success" title="Uw voorwaarden staan klaar">
              {termsUploadedAt && <p>Geüpload op {format(parseISO(termsUploadedAt), "d MMMM yyyy", { locale: nl })}.</p>}
              <div className="mt-2 flex flex-wrap gap-2">
                <Button type="button" variant="outline" size="sm" asChild>
                  <a href={publicUrl(termsPdfPath!)} target="_blank" rel="noreferrer">
                    <Eye className="mr-1.5 h-4 w-4" aria-hidden="true" />
                    Bekijken
                  </a>
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={() => void handleDelete()} disabled={isDeleting} className="text-destructive hover:text-destructive">
                  {isDeleting ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" aria-hidden="true" /> : <Trash2 className="mr-1.5 h-4 w-4" aria-hidden="true" />}
                  Verwijderen
                </Button>
              </div>
            </Notice>
          )}
          <FormField label={hasOwnPdf ? "Nieuwe pdf uploaden" : "Pdf uploaden"} htmlFor="voorwaarden-pdf" error={uploadError} help="Maximaal 5 MB.">
            <Input type="file" accept=".pdf,application/pdf" onChange={(e) => void handleUpload(e)} disabled={isUploading} />
          </FormField>
          {isUploading && (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              Uploaden
            </p>
          )}
        </>
      ) : (
        <p className="text-sm text-muted-foreground">
          De standaardvoorwaarden voor partneraanbod van Bureau Vlieland worden aan de klant getoond.{" "}
          <a href={DEFAULT_TERMS_URL} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-medium text-primary underline">
            Bekijk ze
            <ExternalLink className="h-3 w-3" aria-hidden="true" />
          </a>
        </p>
      )}
    </SheetSection>
  );
};
