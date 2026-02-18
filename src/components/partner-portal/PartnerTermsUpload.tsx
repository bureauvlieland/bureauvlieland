import { useState, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { FileText, Upload, Eye, Trash2, Loader2, CheckCircle, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format, parseISO } from "date-fns";
import { nl } from "date-fns/locale";

interface PartnerTermsUploadProps {
  partnerId: string;
  termsPdfPath: string | null;
  termsUploadedAt: string | null;
  usesDefaultTerms: boolean;
  onUpdate: () => void;
}

const DEFAULT_TERMS_URL = "/partner-voorwaarden";

export const PartnerTermsUpload = ({
  partnerId,
  termsPdfPath,
  termsUploadedAt,
  usesDefaultTerms,
  onUpdate,
}: PartnerTermsUploadProps) => {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Determine the selected option based on current state
  const getSelectedOption = () => {
    if (usesDefaultTerms) return "default";
    if (termsPdfPath) return "custom";
    return "custom"; // Default to custom when nothing is set yet
  };
  const [selectedOption, setSelectedOption] = useState<"custom" | "default">(getSelectedOption());

  const getPublicUrl = (path: string) => {
    const { data } = supabase.storage.from("partner-terms").getPublicUrl(path);
    return data.publicUrl;
  };

  const handleOptionChange = async (value: "custom" | "default") => {
    setSelectedOption(value);
    
    if (value === "default") {
      setIsSaving(true);
      try {
        // Update partner to use default terms
        const { error } = await supabase
          .from("partners")
          .update({
            uses_default_terms: true,
          })
          .eq("id", partnerId);

        if (error) throw error;

        toast({
          title: "Opgeslagen",
          description: "U gebruikt nu de standaardvoorwaarden van Bureau Vlieland.",
        });
        onUpdate();
      } catch (err) {
        console.error("Error updating terms preference:", err);
        toast({
          title: "Opslaan mislukt",
          description: "Kon de voorkeur niet opslaan. Probeer het opnieuw.",
          variant: "destructive",
        });
      } finally {
        setIsSaving(false);
      }
    } else if (value === "custom" && usesDefaultTerms) {
      // Switching back to custom - update the flag
      setIsSaving(true);
      try {
        const { error } = await supabase
          .from("partners")
          .update({
            uses_default_terms: false,
          })
          .eq("id", partnerId);

        if (error) throw error;
        onUpdate();
      } catch (err) {
        console.error("Error updating terms preference:", err);
      } finally {
        setIsSaving(false);
      }
    }
  };

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (file.type !== "application/pdf") {
      toast({
        title: "Ongeldig bestandstype",
        description: "Upload alleen PDF-bestanden.",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "Bestand te groot",
        description: "Maximale bestandsgrootte is 5MB.",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);

    try {
      // Delete old file if exists
      if (termsPdfPath) {
        await supabase.storage.from("partner-terms").remove([termsPdfPath]);
      }

      // Upload new file
      const fileName = `${partnerId}/algemene-voorwaarden.pdf`;
      const { error: uploadError } = await supabase.storage
        .from("partner-terms")
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Update partner record - set uses_default_terms to false when uploading custom
      const { error: updateError } = await supabase
        .from("partners")
        .update({
          terms_pdf_path: fileName,
          terms_uploaded_at: new Date().toISOString(),
          uses_default_terms: false,
        })
        .eq("id", partnerId);

      if (updateError) throw updateError;

      toast({
        title: "Voorwaarden geüpload",
        description: "Uw algemene voorwaarden zijn succesvol opgeslagen.",
      });

      onUpdate();
    } catch (err) {
      console.error("Error uploading terms:", err);
      toast({
        title: "Upload mislukt",
        description: "Kon het bestand niet uploaden. Probeer het opnieuw.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleDelete = async () => {
    if (!termsPdfPath) return;

    setIsDeleting(true);

    try {
      // Delete file from storage
      const { error: deleteError } = await supabase.storage
        .from("partner-terms")
        .remove([termsPdfPath]);

      if (deleteError) throw deleteError;

      // Update partner record
      const { error: updateError } = await supabase
        .from("partners")
        .update({
          terms_pdf_path: null,
          terms_uploaded_at: null,
        })
        .eq("id", partnerId);

      if (updateError) throw updateError;

      toast({
        title: "Voorwaarden verwijderd",
        description: "Uw algemene voorwaarden zijn verwijderd.",
      });

      onUpdate();
    } catch (err) {
      console.error("Error deleting terms:", err);
      toast({
        title: "Verwijderen mislukt",
        description: "Kon het bestand niet verwijderen. Probeer het opnieuw.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" />
          <CardTitle>Algemene Voorwaarden</CardTitle>
        </div>
        <CardDescription>
          Kies hoe uw voorwaarden worden getoond aan klanten.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <RadioGroup
          value={selectedOption}
          onValueChange={(value) => handleOptionChange(value as "custom" | "default")}
          disabled={isSaving}
        >
          {/* Option 1: Custom PDF */}
          <div className="flex items-start space-x-3">
            <RadioGroupItem value="custom" id="custom" className="mt-1" />
            <div className="flex-1 space-y-3">
              <Label htmlFor="custom" className="text-base font-medium cursor-pointer">
                Eigen voorwaarden uploaden (PDF)
              </Label>
              
              {selectedOption === "custom" && (
                <div className="space-y-3 pl-0">
                  {termsPdfPath && !usesDefaultTerms ? (
                    <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                      <div className="flex items-start gap-3">
                        <div className="p-2 rounded bg-green-100 dark:bg-green-900/30">
                          <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">algemene-voorwaarden.pdf</p>
                          {termsUploadedAt && (
                            <p className="text-sm text-muted-foreground">
                              Geüpload op {format(parseISO(termsUploadedAt), "d MMMM yyyy", { locale: nl })}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(getPublicUrl(termsPdfPath), "_blank")}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          Bekijken
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleDelete}
                          disabled={isDeleting}
                          className="text-destructive hover:text-destructive"
                        >
                          {isDeleting ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4 mr-2" />
                          )}
                          Verwijderen
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-4 text-center">
                      <FileText className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
                      <p className="text-sm text-muted-foreground mb-2">
                        Nog geen voorwaarden geüpload
                      </p>
                    </div>
                  )}

                  <input
                    type="file"
                    ref={fileInputRef}
                    accept=".pdf,application/pdf"
                    onChange={handleUpload}
                    className="hidden"
                  />

                  <Button
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    className="w-full"
                  >
                    {isUploading ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Upload className="h-4 w-4 mr-2" />
                    )}
                    {termsPdfPath && !usesDefaultTerms ? "Nieuwe PDF uploaden" : "PDF uploaden"}
                  </Button>

                  <p className="text-xs text-muted-foreground text-center">
                    Maximale bestandsgrootte: 5MB
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Option 2: Default Bureau Vlieland Terms */}
          <div className="flex items-start space-x-3 pt-4 border-t">
            <RadioGroupItem value="default" id="default" className="mt-1" />
            <div className="flex-1 space-y-2">
              <Label htmlFor="default" className="text-base font-medium cursor-pointer">
                Standaardvoorwaarden Bureau Vlieland
              </Label>
              <p className="text-sm text-muted-foreground">
                De standaard partnervoorwaarden van Bureau Vlieland worden getoond aan klanten. 
                Deze dekken de meeste situaties.
              </p>
              <Button
                variant="link"
                size="sm"
                className="h-auto p-0"
                onClick={() => window.open(DEFAULT_TERMS_URL, "_blank")}
              >
                <ExternalLink className="h-3 w-3 mr-1" />
                Bekijk standaardvoorwaarden
              </Button>
            </div>
          </div>
        </RadioGroup>

        {isSaving && (
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Opslaan...
          </div>
        )}
      </CardContent>
    </Card>
  );
};
