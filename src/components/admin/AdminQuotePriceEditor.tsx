import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Pencil, Check, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface AdminQuotePriceEditorProps {
  originalPrice: number | null;
  overridePrice: number | null;
  priceNotes: string | null;
  numberOfPeople: number;
  numberOfDays?: number;
  priceType?: "per_person" | "per_person_per_day" | "total";
  onSave: (price: number | null, notes: string, priceType?: "per_person" | "per_person_per_day" | "total") => Promise<void>;
  disabled?: boolean;
}

export const AdminQuotePriceEditor = ({
  originalPrice,
  overridePrice,
  priceNotes,
  numberOfPeople,
  numberOfDays = 1,
  priceType = "per_person",
  onSave,
  disabled = false,
}: AdminQuotePriceEditorProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [editPrice, setEditPrice] = useState<string>(
    overridePrice?.toString() || ""
  );
  const [editNotes, setEditNotes] = useState(priceNotes || "");
  const [editPriceType, setEditPriceType] = useState<"per_person" | "per_person_per_day" | "total">(priceType || "per_person");
  const [isSaving, setIsSaving] = useState(false);

  const displayPrice = overridePrice ?? originalPrice;
  const hasOverride = overridePrice !== null;

  const handleOpen = (open: boolean) => {
    if (open) {
      setEditPrice(overridePrice?.toString() || "");
      setEditNotes(priceNotes || "");
      setEditPriceType(priceType || "per_person");
    }
    setIsOpen(open);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const priceValue = editPrice ? parseFloat(editPrice) : null;
      await onSave(priceValue, editNotes, editPriceType);
      setIsOpen(false);
    } finally {
      setIsSaving(false);
    }
  };

  const handleClear = async () => {
    setIsSaving(true);
    try {
      await onSave(null, "");
      setEditPrice("");
      setEditNotes("");
      setIsOpen(false);
    } finally {
      setIsSaving(false);
    }
  };

  const formatPrice = (price: number | null) => {
    if (price === null) return "Op aanvraag";
    return new Intl.NumberFormat("nl-NL", {
      style: "currency",
      currency: "EUR",
    }).format(price);
  };

  const calculateTotal = (price: number | null) => {
    if (price === null || priceType !== "per_person") return null;
    return price * numberOfPeople;
  };

  return (
    <Popover open={isOpen} onOpenChange={handleOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "h-auto p-1.5 gap-1.5 font-normal",
            hasOverride && "text-amber-700 dark:text-amber-400"
          )}
          disabled={disabled}
        >
          <div className="flex flex-col items-start text-left">
            <span className={cn("text-sm", hasOverride && "font-medium")}>
              {formatPrice(displayPrice)}
              {displayPrice !== null && (priceType === "per_person" ? " p.p." : " totaal")}
            </span>
            {hasOverride && originalPrice !== null && (
              <span className="text-xs text-muted-foreground line-through">
                {formatPrice(originalPrice)}
                {priceType === "per_person" && " p.p."}
              </span>
            )}
          </div>
          <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="start">
        <div className="space-y-4">
          <div className="space-y-2">
            <h4 className="font-medium">Prijsaanpassing</h4>
            {originalPrice !== null && (
              <p className="text-sm text-muted-foreground">
                Standaardprijs: {formatPrice(originalPrice)}
                {priceType === "per_person" && ` p.p. (${numberOfPeople}p = ${formatPrice(calculateTotal(originalPrice))})`}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="price-type">Prijsconfiguratie</Label>
            <Select value={editPriceType} onValueChange={(v) => setEditPriceType(v as "per_person" | "total")}>
              <SelectTrigger id="price-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="per_person">Per persoon</SelectItem>
                <SelectItem value="total">Totaalprijs</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="override-price">
              Aangepaste prijs {editPriceType === "per_person" ? "(per persoon)" : "(totaal)"}
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                €
              </span>
              <Input
                id="override-price"
                type="number"
                step="0.01"
                min="0"
                placeholder={originalPrice?.toString() || "0.00"}
                value={editPrice}
                onChange={(e) => setEditPrice(e.target.value)}
                className="pl-7"
              />
            </div>
            {editPrice && editPriceType === "per_person" && (
              <p className="text-xs text-muted-foreground">
                Totaal: {formatPrice(parseFloat(editPrice) * numberOfPeople)} ({numberOfPeople} personen)
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="price-notes">Toelichting (intern)</Label>
            <Textarea
              id="price-notes"
              placeholder="Bijv. hogere seizoensprijs + marge"
              value={editNotes}
              onChange={(e) => setEditNotes(e.target.value)}
              rows={2}
            />
          </div>

          <div className="flex justify-between gap-2">
            {hasOverride && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClear}
                disabled={isSaving}
                className="text-destructive hover:text-destructive"
              >
                <X className="h-4 w-4 mr-1" />
                Wissen
              </Button>
            )}
            <div className="flex gap-2 ml-auto">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsOpen(false)}
                disabled={isSaving}
              >
                Annuleren
              </Button>
              <Button size="sm" onClick={handleSave} disabled={isSaving}>
                <Check className="h-4 w-4 mr-1" />
                Opslaan
              </Button>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};
