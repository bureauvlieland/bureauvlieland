import { useState, useMemo } from "react";
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
  priceIncludesVat: boolean;
  vatRate: number;
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
  priceIncludesVat,
  vatRate,
  commissionPercentage,
  onSuccess,
}: AccommodationInvoiceDialogProps) => {
  // priceTotal kan in oude data excl. zijn — converteer naar incl. voor de prefill.
  const initialIncl = useMemo(() => {
    const v = Number(priceTotal) || 0;
    return priceIncludesVat ? v : Math.round(v * (1 + (vatRate || 0) / 100) * 100) / 100;
  }, [priceTotal, priceIncludesVat, vatRate]);

  const [invoicedAmountIncl, setInvoicedAmountIncl] = useState(initialIncl.toString());
  const [invoicedNumber, setInvoicedNumber] = useState("");
  const [invoicedDate, setInvoicedDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const parsedIncl = parseFloat(invoicedAmountIncl) || 0;
  const rate = Number(vatRate) || 0;
  const parsedExcl = rate > 0 ? Math.round((parsedIncl / (1 + rate / 100)) * 100) / 100 : parsedIncl;
  const vatAmount = Math.round((parsedIncl - parsedExcl) * 100) / 100;
  const calculatedCommission = Math.round(parsedExcl * (commissionPercentage / 100) * 100) / 100;

  const handleSubmit = async () => {
    if (!invoicedNumber.trim()) {
      toast({
        title: "Factuurnummer vereist",
        description: "Vul een factuurnummer in",
        variant: "destructive",
      });
      return;
    }

    if (isNaN(parsedIncl) || parsedIncl <= 0) {
      toast({
        title: "Ongeldig bedrag",
        description: "Vul een geldig factuurbedrag in",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Edge function slaat invoicedAmount op als excl. BTW (zoals quoted_price excl.).
      const { data, error } = await supabase.functions.invoke("register-accommodation-invoice", {
        body: {
          quoteId,
          partnerToken,
          invoicedAmount: parsedExcl,
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
            Registreer je factuur voor {accommodationName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="invoicedAmount">Factuurbedrag incl. BTW *</Label>
            <div className="relative">
              <Euro className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="invoicedAmount"
                type="number"
                step="0.01"
                min="0"
                value={invoicedAmountIncl}
                onChange={(e) => setInvoicedAmountIncl(e.target.value)}
                className="pl-10"
                placeholder="0.00"
              />
            </div>
            {parsedIncl > 0 && (
              <p className="text-xs text-muted-foreground">
                Excl. BTW: €{parsedExcl.toFixed(2)} · BTW {rate}%: €{vatAmount.toFixed(2)}
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              Oorspronkelijk offertebedrag incl. BTW: €{initialIncl.toFixed(2)}
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
              <span className="text-muted-foreground">
                Commissie ({commissionPercentage}% over excl. BTW):
              </span>
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
