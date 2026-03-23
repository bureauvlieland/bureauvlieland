import { useState } from "react";
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

interface AdminAddCostSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  requestId: string;
  onSuccess: () => void;
}

export const AdminAddCostSheet = ({
  open,
  onOpenChange,
  requestId,
  onSuccess,
}: AdminAddCostSheetProps) => {
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [vatRate, setVatRate] = useState("21");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

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
      setDescription("");
      setAmount("");
      setVatRate("21");
      setNotes("");
      onOpenChange(false);
      onSuccess();
    } catch (error) {
      console.error("Error adding cost:", error);
      toast.error("Fout bij toevoegen kosten");
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
            Kosten toevoegen
          </SheetTitle>
          <SheetDescription>
            Voeg losse kosten toe die niet bij het programma horen, zoals uren, toeristenbelasting of materiaalhuur.
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
            {isSubmitting ? "Toevoegen..." : "Kosten toevoegen"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
};
