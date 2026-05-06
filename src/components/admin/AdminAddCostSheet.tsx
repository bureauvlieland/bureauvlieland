import { useEffect, useState } from "react";
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

interface EditingCostItem {
  id: string;
  block_name?: string | null;
  admin_price_override?: number | null;
  admin_price_notes?: string | null;
  vat_rate?: number | null;
}

interface AdminAddCostSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  requestId: string;
  onSuccess: () => void;
  editingItem?: EditingCostItem | null;
}

export const AdminAddCostSheet = ({
  open,
  onOpenChange,
  requestId,
  onSuccess,
  editingItem,
}: AdminAddCostSheetProps) => {
  const isEdit = !!editingItem;
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [vatRate, setVatRate] = useState("21");
  const [notes, setNotes] = useState("");
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
      } else {
        setDescription("");
        setAmount("");
        setVatRate("21");
        setNotes("");
      }
    }
  }, [open, editingItem]);

  const handleSubmit = async () => {
    if (!description.trim()) {
      toast.error("Omschrijving is verplicht");
      return;
    }
    const parsedAmount = parseFloat(amount.replace(",", "."));
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      toast.error("Voer een geldig bedrag in");
      return;
    }

    setIsSubmitting(true);
    try {
      if (isEdit && editingItem) {
        const { error } = await supabase
          .from("program_request_items")
          .update({
            block_name: description.trim(),
            admin_price_override: parsedAmount,
            admin_price_notes: notes.trim() || null,
          })
          .eq("id", editingItem.id);
        if (error) throw error;
        toast.success("Kosten bijgewerkt");
      } else {
        const { error } = await supabase.from("program_request_items").insert({
          request_id: requestId,
          block_id: null as any,
          block_name: description.trim(),
          block_category: "overig",
          block_type: "bureau",
          provider_name: "Bureau Vlieland",
          provider_id: "bureau",
          day_index: -1,
          status: "confirmed",
          admin_price_override: parsedAmount,
          admin_price_notes: notes.trim() || null,
          skip_partner_notification: true,
          price_type: "total",
        });
        if (error) throw error;
        toast.success("Kosten toegevoegd");
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
