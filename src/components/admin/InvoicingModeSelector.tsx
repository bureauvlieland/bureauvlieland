import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Users, Building2, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { InvoicingMode } from "@/types/purchaseInvoice";
import { useAppSettings } from "@/hooks/useAppSettings";
import { FALLBACK_SETTINGS } from "@/lib/appSettings";

interface InvoicingModeSelectorProps {
  requestId: string;
  currentMode: InvoicingMode;
  onModeChange: () => void;
  disabled?: boolean;
}

export function InvoicingModeSelector({
  requestId,
  currentMode,
  onModeChange,
  disabled = false,
}: InvoicingModeSelectorProps) {
  const [isUpdating, setIsUpdating] = useState(false);
  const { settings } = useAppSettings();
  const commissionPct = settings?.default_partner_commission ?? FALLBACK_SETTINGS.default_partner_commission;
  const handleModeChange = async (newMode: InvoicingMode) => {
    if (newMode === currentMode || isUpdating) return;

    setIsUpdating(true);
    try {
      const { error } = await supabase
        .from("program_requests")
        .update({ invoicing_mode: newMode })
        .eq("id", requestId);

      if (error) throw error;

      toast.success("Facturatiemodel bijgewerkt");
      onModeChange();
    } catch (error) {
      console.error("Error updating invoicing mode:", error);
      toast.error("Fout bij bijwerken facturatiemodel");
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-medium text-sm">Facturatiemodel</h4>
          {isUpdating && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
        </div>
        <RadioGroup
          value={currentMode}
          onValueChange={(v) => handleModeChange(v as InvoicingMode)}
          className="space-y-3"
          disabled={disabled || isUpdating}
        >
          <div className="flex items-start space-x-3">
            <RadioGroupItem value="partner_direct" id="partner_direct" className="mt-1" />
            <Label htmlFor="partner_direct" className="cursor-pointer flex-1">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">Partners factureren klant direct</span>
              </div>
               <p className="text-xs text-muted-foreground mt-0.5">
                 Partners sturen facturen naar de eindklant. Bureau Vlieland int {commissionPct}% commissie periodiek.
              </p>
            </Label>
          </div>
          <div className="flex items-start space-x-3">
            <RadioGroupItem value="bureau_central" id="bureau_central" className="mt-1" />
            <Label htmlFor="bureau_central" className="cursor-pointer flex-1">
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">Bureau Vlieland factureert klant</span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Partners factureren Bureau Vlieland (inkoop). Bureau Vlieland factureert klant.
              </p>
            </Label>
          </div>
        </RadioGroup>
      </CardContent>
    </Card>
  );
}
