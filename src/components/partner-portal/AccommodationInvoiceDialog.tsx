import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { Euro, FileText, Calendar } from "lucide-react";

interface AccommodationInvoiceDialogProps {
  isOpen: boolean;
  onClose: () => void;
  quoteId: string;
  partnerToken: string;
  accommodationName: string;
  priceTotal: number;
  commissionPercentage: number;
  onSuccess: () => void;
}

export const AccommodationInvoiceDialog = ({
  isOpen,
  onClose,
  quoteId,
  partnerToken,
  accommodationName,
  priceTotal,
  commissionPercentage,
  onSuccess,
}: AccommodationInvoiceDialogProps) => {
  const [invoicedAmount, setInvoicedAmount] = useState(priceTotal.toString());
  const [invoicedNumber, setInvoicedNumber] = useState("");
  const [invoicedDate, setInvoicedDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const calculatedCommission = (parseFloat(invoicedAmount) || 0) * (commissionPercentage / 100);

  const handleSubmit = async () => {
    const amount = parseFloat(invoicedAmount);
    if (!invoicedNumber.trim()) {
      toast({
        title: "Factuurnummer vereist",
        description: "Vul een factuurnummer in",
        variant: "destructive",
      });
      return;
    }

    if (isNaN(amount) || amount <= 0) {
      toast({
        title: "Ongeldig bedrag",
        description: "Vul een geldig factuurbedrag in",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const { data, error } = await supabase.functions.invoke("register-accommodation-invoice", {
        body: {
          quoteId,
          partnerToken,
          invoicedAmount: amount,
          invoicedNumber: invoicedNumber.trim(),
          invoicedDate,
        },
      });

      if (error) throw error;

      toast({
        title: "Factuur geregistreerd",
        description: `Commissie van €${data.commission.amount.toFixed(2)} wordt berekend`,
      });

      onSuccess();
      onClose();
    } catch (error) {
      console.error("Error registering invoice:", error);
      toast({
        title: "Fout bij registreren",
        description: error instanceof Error ? error.message : "Er ging iets mis",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Factuur registreren</DialogTitle>
          <DialogDescription>
            Registreer uw factuur voor {accommodationName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="invoicedAmount">Factuurbedrag (excl. BTW)</Label>
            <div className="relative">
              <Euro className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="invoicedAmount"
                type="number"
                step="0.01"
                min="0"
                value={invoicedAmount}
                onChange={(e) => setInvoicedAmount(e.target.value)}
                className="pl-10"
                placeholder="0.00"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Oorspronkelijk offertebedrag: €{priceTotal.toFixed(2)}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="invoicedNumber">Factuurnummer *</Label>
            <div className="relative">
              <FileText className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="invoicedNumber"
                value={invoicedNumber}
                onChange={(e) => setInvoicedNumber(e.target.value)}
                className="pl-10"
                placeholder="2024-001"
                maxLength={50}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="invoicedDate">Factuurdatum</Label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="invoicedDate"
                type="date"
                value={invoicedDate}
                onChange={(e) => setInvoicedDate(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <div className="bg-muted/50 p-3 rounded-lg text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Commissie ({commissionPercentage}%):</span>
              <span className="font-medium">€{calculatedCommission.toFixed(2)}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Bureau Vlieland factureert deze commissie na afloop van het verblijf.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Annuleren
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? "Bezig..." : "Registreren"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
