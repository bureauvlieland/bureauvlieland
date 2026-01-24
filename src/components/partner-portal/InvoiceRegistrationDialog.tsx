import { useState, useEffect } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Info, Receipt } from "lucide-react";
import { format } from "date-fns";
import type { PartnerItem } from "@/types/partner";

interface InvoiceRegistrationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (
    amount: number,
    invoiceNumber: string,
    date: string,
    notes?: string
  ) => Promise<{ success: boolean; commission?: { percentage: number; amount: number } }>;
  item: PartnerItem | null;
  commissionPercentage: number;
}

export const InvoiceRegistrationDialog = ({
  isOpen,
  onClose,
  onSubmit,
  item,
  commissionPercentage,
}: InvoiceRegistrationDialogProps) => {
  const [amount, setAmount] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [invoiceDate, setInvoiceDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Reset form when dialog opens
  useEffect(() => {
    if (isOpen) {
      setAmount("");
      setInvoiceNumber("");
      setInvoiceDate(format(new Date(), "yyyy-MM-dd"));
      setNotes("");
      setErrors({});
    }
  }, [isOpen]);

  const parsedAmount = parseFloat(amount.replace(",", ".")) || 0;
  const commissionAmount = (parsedAmount * commissionPercentage) / 100;

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!amount || parsedAmount <= 0) {
      newErrors.amount = "Voer een geldig bedrag in";
    }

    if (!invoiceNumber.trim()) {
      newErrors.invoiceNumber = "Factuurnummer is verplicht";
    }

    if (!invoiceDate) {
      newErrors.invoiceDate = "Factuurdatum is verplicht";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      const result = await onSubmit(parsedAmount, invoiceNumber.trim(), invoiceDate, notes || undefined);
      if (!result.success) {
        setErrors({ submit: "Er is een fout opgetreden bij het registreren van de factuur" });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    onClose();
  };

  if (!item) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Facturatie registreren
          </DialogTitle>
          <DialogDescription>
            {item.block_name} - {item.program_requests.customer_company || item.program_requests.customer_name}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="invoiceNumber">Factuurnummer *</Label>
            <Input
              id="invoiceNumber"
              placeholder="Bijv. FA-2026-0042"
              value={invoiceNumber}
              onChange={(e) => setInvoiceNumber(e.target.value)}
              className={errors.invoiceNumber ? "border-destructive" : ""}
            />
            {errors.invoiceNumber && (
              <p className="text-sm text-destructive">{errors.invoiceNumber}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Bedrag excl. BTW *</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  €
                </span>
                <Input
                  id="amount"
                  type="text"
                  inputMode="decimal"
                  placeholder="0,00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className={`pl-7 ${errors.amount ? "border-destructive" : ""}`}
                />
              </div>
              {errors.amount && (
                <p className="text-sm text-destructive">{errors.amount}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="invoiceDate">Factuurdatum *</Label>
              <Input
                id="invoiceDate"
                type="date"
                value={invoiceDate}
                onChange={(e) => setInvoiceDate(e.target.value)}
                className={errors.invoiceDate ? "border-destructive" : ""}
              />
              {errors.invoiceDate && (
                <p className="text-sm text-destructive">{errors.invoiceDate}</p>
              )}
            </div>
          </div>

          {commissionPercentage > 0 && parsedAmount > 0 && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-1">
                  <p>
                    <strong>Commissie Bureau Vlieland ({commissionPercentage}%):</strong>{" "}
                    €{commissionAmount.toFixed(2)}
                  </p>
                  <p className="text-muted-foreground text-sm">
                    Je ontvangt hiervoor een factuur van Bureau Vlieland.
                  </p>
                </div>
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="notes">Opmerkingen (optioneel)</Label>
            <Textarea
              id="notes"
              placeholder="Eventuele opmerkingen over de facturatie..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
          </div>

          {errors.submit && (
            <p className="text-sm text-destructive">{errors.submit}</p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isSubmitting}>
            Annuleren
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Registreren
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
