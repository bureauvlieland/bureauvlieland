import { useEffect, useMemo, useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Euro } from "lucide-react";
import { formatEuro } from "@/lib/formatEuro";
import {
  costVatRateFor,
  invoiceAmountIncl,
  invoicePartnerName,
  sortInvoicesForCost,
  type CostInvoiceLike,
} from "@/lib/extraCostLinks";

interface EditingCostItem {
  id: string;
  block_name?: string | null;
  admin_price_override?: number | null;
  admin_price_notes?: string | null;
  vat_rate?: number | null;
  purchase_invoice_id?: string | null;
}

interface PrefillData {
  description?: string;
  amount?: number;
  vatRate?: number;
  notes?: string;
  providerName?: string;
  bookingReference?: string;
  /** Inkoopfactuur waar deze kostenregel uit voortkomt ("Als kosten opvoeren"). */
  purchaseInvoiceId?: string | null;
}

interface AdminAddCostSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  requestId: string;
  onSuccess: () => void;
  editingItem?: EditingCostItem | null;
  prefill?: PrefillData | null;
  onCreatedItem?: (itemId: string) => void | Promise<void>;
  /** Inkoopfacturen van dit project, te koppelen aan de kostenregel (optioneel). */
  purchaseInvoices?: CostInvoiceLike[];
}

/** Radix Select kent geen lege waarde; dit is "geen inkoopfactuur". */
const NO_INVOICE = "none";

const parseAmount = (value: string) => parseFloat(value.replace(",", "."));

export const AdminAddCostSheet = ({
  open,
  onOpenChange,
  requestId,
  onSuccess,
  editingItem,
  prefill,
  onCreatedItem,
  purchaseInvoices = [],
}: AdminAddCostSheetProps) => {
  const isEdit = !!editingItem;
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [vatRate, setVatRate] = useState("21");
  const [notes, setNotes] = useState("");
  const [invoiceId, setInvoiceId] = useState<string>(NO_INVOICE);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      if (editingItem) {
        setDescription(editingItem.block_name ?? "");
        setAmount(
          editingItem.admin_price_override != null
            ? String(editingItem.admin_price_override).replace(".", ",")
            : ""
        );
        setVatRate(editingItem.vat_rate != null ? String(editingItem.vat_rate) : "21");
        setNotes(editingItem.admin_price_notes ?? "");
        setInvoiceId(editingItem.purchase_invoice_id ?? NO_INVOICE);
      } else if (prefill) {
        setDescription(prefill.description ?? "");
        setAmount(
          prefill.amount != null ? String(prefill.amount).replace(".", ",") : ""
        );
        setVatRate(prefill.vatRate != null ? String(prefill.vatRate) : "21");
        setNotes(prefill.notes ?? "");
        setInvoiceId(prefill.purchaseInvoiceId ?? NO_INVOICE);
      } else {
        setDescription("");
        setAmount("");
        setVatRate("21");
        setNotes("");
        setInvoiceId(NO_INVOICE);
      }
    }
  }, [open, editingItem, prefill]);

  // De gekoppelde factuur blijft kiesbaar, ook als hij in creditering staat.
  const parsedAmount = parseAmount(amount);
  const invoiceOptions = useMemo(
    () => sortInvoicesForCost(purchaseInvoices, Number.isFinite(parsedAmount) ? parsedAmount : null),
    [purchaseInvoices, parsedAmount],
  );
  const selectedInvoice = invoiceId === NO_INVOICE ? null : purchaseInvoices.find((inv) => inv.id === invoiceId) ?? null;
  const selectedInvoiceAmount = selectedInvoice ? invoiceAmountIncl(selectedInvoice) : null;
  const belowPurchase =
    selectedInvoiceAmount !== null && Number.isFinite(parsedAmount) && parsedAmount < selectedInvoiceAmount;

  // Factuur kiezen vult alleen wat nog leeg is; wat je al typte blijft staan.
  const handleInvoiceChange = (value: string) => {
    setInvoiceId(value);
    const invoice = value === NO_INVOICE ? null : purchaseInvoices.find((inv) => inv.id === value);
    if (!invoice) return;
    if (!description.trim()) {
      const partner = invoicePartnerName(invoice);
      const text = invoice.description?.trim();
      setDescription(text ? `${partner}: ${text}` : partner);
    }
    if (!amount.trim()) setAmount(String(invoiceAmountIncl(invoice)).replace(".", ","));
    setVatRate(String(costVatRateFor(invoice)));
  };

  const handleSubmit = async () => {
    if (!description.trim()) {
      toast.error("Omschrijving is verplicht");
      return;
    }
    if (isNaN(parsedAmount) || !isFinite(parsedAmount)) {
      toast.error("Voer een geldig bedrag in");
      return;
    }
    const purchaseInvoiceId = invoiceId === NO_INVOICE ? null : invoiceId;

    setIsSubmitting(true);
    try {
      if (isEdit && editingItem) {
        const { error } = await supabase
          .from("program_request_items")
          .update({
            block_name: description.trim(),
            admin_price_override: parsedAmount,
            admin_price_notes: notes.trim() || null,
            purchase_invoice_id: purchaseInvoiceId,
          })
          .eq("id", editingItem.id);
        if (error) throw error;
        toast.success("Kosten bijgewerkt");
      } else {
        const providerName =
          prefill?.providerName || (selectedInvoice ? invoicePartnerName(selectedInvoice) : "Bureau Vlieland");
        const { data: inserted, error } = await supabase
          .from("program_request_items")
          .insert({
            request_id: requestId,
            block_id: null as any,
            block_name: description.trim(),
            block_category: "overig",
            block_type: "bureau",
            provider_name: providerName,
            provider_id: "bureau",
            day_index: -1,
            status: "confirmed",
            admin_price_override: parsedAmount,
            admin_price_notes: notes.trim() || null,
            skip_partner_notification: true,
            price_type: "total",
            vat_rate: Number(vatRate),
            purchase_invoice_id: purchaseInvoiceId,
            ...(prefill?.bookingReference
              ? { booking_reference: prefill.bookingReference }
              : {}),
          })
          .select("id")
          .single();
        if (error) throw error;
        toast.success("Kosten toegevoegd");
        if (inserted && onCreatedItem) {
          await onCreatedItem((inserted as { id: string }).id);
        }
      }

      onOpenChange(false);
      onSuccess();
    } catch (error) {
      console.error("Error saving cost:", error);
      toast.error(isEdit ? "Fout bij bijwerken kosten" : "Fout bij toevoegen kosten");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Euro className="h-5 w-5" />
            {isEdit ? "Kosten bewerken" : "Kosten toevoegen"}
          </SheetTitle>
          <SheetDescription>
            {isEdit
              ? "Pas de omschrijving, het bedrag of de toelichting aan."
              : "Voeg losse kosten toe die niet bij het programma horen, zoals uren, toeristenbelasting of materiaalhuur."}
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-4 py-6">
          {purchaseInvoices.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="cost-invoice">Inkoopfactuur (optioneel)</Label>
              <Select value={invoiceId} onValueChange={handleInvoiceChange}>
                <SelectTrigger id="cost-invoice">
                  <SelectValue placeholder="Geen inkoopfactuur" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_INVOICE}>Geen inkoopfactuur</SelectItem>
                  {invoiceOptions.map((inv) => (
                    <SelectItem key={inv.id} value={inv.id}>
                      {inv.invoice_number} · {invoicePartnerName(inv)} · {formatEuro(invoiceAmountIncl(inv))}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedInvoice ? (
                <p className={belowPurchase ? "text-xs text-destructive" : "text-xs text-muted-foreground"}>
                  Inkoop {formatEuro(selectedInvoiceAmount)} incl. btw
                  {belowPurchase ? ". Het bedrag hieronder is lager dan de inkoop." : "."}
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Koppel de factuur waar deze kosten uit voortkomen; dan zie je inkoop en marge naast elkaar.
                </p>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="cost-description">Omschrijving *</Label>
            <Input
              id="cost-description"
              placeholder="Bijv. Toeristenbelasting, Gewerkte uren..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="cost-amount">Bedrag (incl. BTW) *</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">€</span>
              <Input
                id="cost-amount"
                type="text"
                inputMode="decimal"
                placeholder="0,00"
                className="pl-7"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="cost-vat">BTW-tarief</Label>
            <Select value={vatRate} onValueChange={setVatRate}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="21">21% (standaard)</SelectItem>
                <SelectItem value="9">9% (verlaagd)</SelectItem>
                <SelectItem value="0">0% (vrijgesteld)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="cost-notes">Toelichting (optioneel)</Label>
            <Textarea
              id="cost-notes"
              placeholder="Extra informatie over deze kosten..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <SheetFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuleren
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? "Opslaan..." : isEdit ? "Opslaan" : "Kosten toevoegen"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
};
