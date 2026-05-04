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
import { Pencil, Check, X, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface AdminQuotePriceEditorProps {
  originalPrice: number | null;
  overridePrice: number | null;
  priceNotes: string | null;
  numberOfPeople: number;
  numberOfDays?: number;
  priceType?: "per_person" | "per_person_per_day" | "total";
  onSave: (price: number | null, notes: string, priceType?: "per_person" | "per_person_per_day" | "total") => Promise<void>;
  disabled?: boolean;
  /** True wanneer de admin-override nieuwer is dan de laatste partner-acknowledge.
   *  In dat geval is de override de geldende prijs en is `quoted_price` verouderd. */
  hasOpenAdminPriceChange?: boolean;
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
  hasOpenAdminPriceChange = false,
}: AdminQuotePriceEditorProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [editPrice, setEditPrice] = useState<string>(
    overridePrice?.toString() || ""
  );
  const [editNotes, setEditNotes] = useState(priceNotes || "");
  const [editPriceType, setEditPriceType] = useState<"per_person" | "per_person_per_day" | "total">(priceType || "per_person");
  const [isSaving, setIsSaving] = useState(false);

  // originalPrice = quoted_price (definitieve partnerprijs, IS het groepstotaal)
  // overridePrice = admin_price_override (eenheidsprijs of totaal afhankelijk van priceType)
  const hasQuotedPrice = originalPrice !== null;
  const hasOverride = overridePrice !== null;

  // Effectief totaal van de admin-override (rekening houdend met price_type / personen / dagen)
  const overrideTotal = overridePrice !== null
    ? (priceType === "per_person"
        ? overridePrice * numberOfPeople
        : priceType === "per_person_per_day"
          ? overridePrice * numberOfPeople * numberOfDays
          : overridePrice)
    : null;

  // Welke prijs is leidend?
  // - Open admin-prijswijziging → admin-override is de nieuwe geldende prijs.
  //   quoted_price wordt dan getoond als doorgehaald (verouderde partnerbevestiging).
  // - Anders → quoted_price wint (bevestigde partnerprijs).
  const overrideIsLeading = hasOpenAdminPriceChange && hasOverride;
  const displayPrice = overrideIsLeading
    ? overrideTotal
    : (originalPrice ?? overrideTotal);
  // Toon de andere prijs als doorgehaalde context.
  const showStruckThrough = overrideIsLeading
    ? hasQuotedPrice // override leidend → toon oude quoted_price doorgehaald
    : (hasQuotedPrice && hasOverride); // quoted leidend → toon eerdere schatting doorgehaald
  const struckPrice = overrideIsLeading ? originalPrice : overrideTotal;

  // Mismatch-waarschuwing: partner heeft een quoted_price bevestigd die niet overeenkomt
  // met admin_price_override × personen × dagen, terwijl er géén open prijswijziging loopt.
  // Dit duidt op een handmatig ingevoerde inconsistentie die de admin moet checken.
  const mismatch =
    !overrideIsLeading &&
    hasQuotedPrice &&
    hasOverride &&
    overrideTotal !== null &&
    Math.abs((originalPrice ?? 0) - overrideTotal) > 0.5;

  const handleOpen = (open: boolean) => {
    if (open) {
      setEditPrice(overridePrice?.toString() || "");
      setEditNotes(priceNotes || "");
      setEditPriceType(priceType || "per_person");
    }
    setIsOpen(open);
  };

  const handleSave = async () => {
    const trimmed = editPrice.trim();
    const priceValue = trimmed === "" ? null : parseFloat(trimmed.replace(",", "."));

    if (trimmed !== "" && (Number.isNaN(priceValue!) || priceValue! < 0)) {
      toast.error("Voer een geldig bedrag in (≥ 0).");
      return;
    }
    if (priceValue !== null && priceValue > 100000) {
      toast.error("Bedrag lijkt onrealistisch hoog (> €100.000). Controleer de invoer.");
      return;
    }
    if (priceValue !== null && editPriceType !== "total" && numberOfPeople < 1) {
      toast.error("Aantal personen ontbreekt — kan totaal niet berekenen.");
      return;
    }
    if (priceValue !== null && editPriceType === "per_person_per_day" && numberOfDays < 1) {
      toast.error("Aantal dagen ontbreekt — kan totaal niet berekenen.");
      return;
    }

    setIsSaving(true);
    try {
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
    if (price === null) return null;
    if (priceType === "per_person") return price * numberOfPeople;
    if (priceType === "per_person_per_day") return price * numberOfPeople * numberOfDays;
    return null;
  };

  const priceTypeLabel = priceType === "per_person_per_day" ? "p.p.p.d." : priceType === "per_person" ? "p.p." : "totaal";

  // Label voor de leidende prijs:
  // - quoted_price IS het groepstotaal → "totaal"
  // - admin_price_override toont altijd het uitgerekende groepstotaal (overrideTotal) → "totaal"
  const displayLabel = "totaal";

  return (
    <Popover open={isOpen} onOpenChange={handleOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "h-auto p-1.5 gap-1.5 font-normal",
            overrideIsLeading && "text-amber-700 dark:text-amber-400",
            !overrideIsLeading && hasQuotedPrice && "text-emerald-700 dark:text-emerald-400",
            !overrideIsLeading && !hasQuotedPrice && hasOverride && "text-amber-700 dark:text-amber-400"
          )}
          disabled={disabled}
        >
          <div className="flex flex-col items-start text-left">
            <span className={cn("text-sm", (hasQuotedPrice || hasOverride) && "font-medium")}>
              {formatPrice(displayPrice)}
              {displayPrice !== null && ` ${displayLabel}`}
            </span>
            {hasOverride && priceType !== "total" && overridePrice !== null && (
              <span className="text-[11px] text-muted-foreground">
                {formatPrice(overridePrice)}
                {priceType === "per_person_per_day"
                  ? ` × ${numberOfPeople}p × ${numberOfDays}d`
                  : ` × ${numberOfPeople}p`}
                {" = "}
                {formatPrice(overrideTotal)}
              </span>
            )}
            {overrideIsLeading && (
              <span className="text-xs text-amber-600 dark:text-amber-500">
                Nieuwe prijs (wacht op partner)
              </span>
            )}
            {!overrideIsLeading && hasQuotedPrice && (
              <span className="text-xs text-emerald-600 dark:text-emerald-500">Partnerprijs</span>
            )}
            {!overrideIsLeading && !hasQuotedPrice && hasOverride && (
              <span className="text-xs text-amber-600 dark:text-amber-500">(schatting)</span>
            )}
            {showStruckThrough && struckPrice !== null && (
              <span className="text-xs text-muted-foreground line-through">
                {formatPrice(struckPrice)}
                {overrideIsLeading
                  ? ` totaal · oude partnerprijs`
                  : ` ${priceTypeLabel}`}
              </span>
            )}
            {mismatch && overrideTotal !== null && (
              <span className="flex items-center gap-1 text-[11px] text-destructive">
                <AlertTriangle className="h-3 w-3" />
                Partner: {formatPrice(originalPrice)} ≠ berekening: {formatPrice(overrideTotal)}
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
                {priceType !== "total" && ` ${priceTypeLabel} (${numberOfPeople}p${priceType === "per_person_per_day" ? ` × ${numberOfDays}d` : ""} = ${formatPrice(calculateTotal(originalPrice))})`}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="price-type">Prijsconfiguratie</Label>
            <Select value={editPriceType} onValueChange={(v) => setEditPriceType(v as "per_person" | "per_person_per_day" | "total")}>
              <SelectTrigger id="price-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="per_person">Per persoon</SelectItem>
                <SelectItem value="per_person_per_day">Per persoon per dag</SelectItem>
                <SelectItem value="total">Totaalprijs</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="override-price">
              Aangepaste prijs {editPriceType === "per_person" ? "(per persoon)" : editPriceType === "per_person_per_day" ? "(per persoon per dag)" : "(totaal)"}
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
            {editPrice && editPriceType !== "total" && (
              <p className="text-xs text-muted-foreground">
                Totaal: {formatPrice(parseFloat(editPrice) * numberOfPeople * (editPriceType === "per_person_per_day" ? numberOfDays : 1))} ({numberOfPeople} personen{editPriceType === "per_person_per_day" ? ` × ${numberOfDays} dagen` : ""})
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
