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
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Loader2, Info, Receipt, Building2, Mail, FileText, Calendar, Users, Clock, Euro } from "lucide-react";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import type { PartnerItem } from "@/types/partner";

interface BillingDetails {
  billing_company_name?: string | null;
  billing_kvk_number?: string | null;
  billing_vat_number?: string | null;
  billing_address_street?: string | null;
  billing_address_postal?: string | null;
  billing_address_city?: string | null;
  billing_contact_name?: string | null;
  billing_contact_email?: string | null;
  billing_reference?: string | null;
}

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
  billingDetails?: BillingDetails | null;
}

export const InvoiceRegistrationDialog = ({
  isOpen,
  onClose,
  onSubmit,
  item,
  commissionPercentage,
  billingDetails,
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
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
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
          {/* Item Details Section - What's being invoiced */}
          <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 space-y-3">
            <h4 className="text-sm font-semibold text-primary uppercase tracking-wide flex items-center gap-2">
              <Receipt className="h-4 w-4" />
              Te factureren
            </h4>
            <div className="space-y-2">
              <p className="font-semibold text-lg">{item.block_name}</p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                {item.proposed_date && (
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span>{format(new Date(item.proposed_date), "d MMMM yyyy", { locale: nl })}</span>
                  </div>
                )}
                {item.proposed_time && (
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span>{item.proposed_time}</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span>{item.program_requests.number_of_people} personen</span>
                </div>
                {item.duration && (
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span>{item.duration}</span>
                  </div>
                )}
              </div>
              {item.quoted_price && (
                <div className="pt-2 border-t border-primary/10 flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Geoffreerde prijs:</span>
                  <Badge variant="secondary" className="text-base font-semibold">
                    <Euro className="h-3 w-3 mr-1" />
                    {item.quoted_price.toLocaleString("nl-NL", { minimumFractionDigits: 2 })}
                  </Badge>
                </div>
              )}
              {item.quoted_notes && (
                <p className="text-sm text-muted-foreground italic">"{item.quoted_notes}"</p>
              )}
            </div>
          </div>

          <Separator />

          {/* Billing Details Section */}
          {billingDetails?.billing_company_name && (
            <div className="bg-muted/50 rounded-lg p-4 space-y-3">
              <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                Factureer aan
              </h4>
              <div className="space-y-2">
                <p className="font-medium">{billingDetails.billing_company_name}</p>
                {(billingDetails.billing_address_street || billingDetails.billing_address_city) && (
                  <p className="text-sm text-muted-foreground">
                    {[
                      billingDetails.billing_address_street,
                      [billingDetails.billing_address_postal, billingDetails.billing_address_city]
                        .filter(Boolean)
                        .join(" ")
                    ]
                      .filter(Boolean)
                      .join(", ")}
                  </p>
                )}
                <div className="grid grid-cols-2 gap-2 text-sm">
                  {billingDetails.billing_kvk_number && (
                    <div>
                      <span className="text-muted-foreground">KvK: </span>
                      <span>{billingDetails.billing_kvk_number}</span>
                    </div>
                  )}
                  {billingDetails.billing_vat_number && (
                    <div>
                      <span className="text-muted-foreground">BTW: </span>
                      <span>{billingDetails.billing_vat_number}</span>
                    </div>
                  )}
                </div>
                {(billingDetails.billing_contact_name || billingDetails.billing_contact_email) && (
                  <div className="pt-2 border-t border-border/50 space-y-1 text-sm">
                    {billingDetails.billing_contact_name && (
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">Contact:</span>
                        <span>{billingDetails.billing_contact_name}</span>
                      </div>
                    )}
                    {billingDetails.billing_contact_email && (
                      <div className="flex items-center gap-2">
                        <Mail className="h-3 w-3 text-muted-foreground" />
                        <a href={`mailto:${billingDetails.billing_contact_email}`} className="hover:underline">
                          {billingDetails.billing_contact_email}
                        </a>
                      </div>
                    )}
                  </div>
                )}
                {billingDetails.billing_reference && (
                  <div className="pt-2 border-t border-border/50 flex items-center gap-2 text-sm">
                    <FileText className="h-3 w-3 text-muted-foreground" />
                    <span className="text-muted-foreground">Referentie:</span>
                    <span className="font-medium">{billingDetails.billing_reference}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          <Separator />

          {/* Invoice Form Section */}
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
