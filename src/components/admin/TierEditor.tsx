import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2 } from "lucide-react";
import {
  type PriceTier,
  type TiersAboveMax,
  parseTiersFromText,
  validateTiers,
  resolveTier,
} from "@/lib/tieredPricing";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

interface TierEditorProps {
  tiers: PriceTier[];
  onChange: (tiers: PriceTier[]) => void;
  tiersAboveMax: TiersAboveMax;
  onTiersAboveMaxChange: (v: TiersAboveMax) => void;
}

export const TierEditor = ({ tiers, onChange, tiersAboveMax, onTiersAboveMaxChange }: TierEditorProps) => {
  const [pasteOpen, setPasteOpen] = useState(false);
  const [pasteText, setPasteText] = useState("");
  const [previewPeople, setPreviewPeople] = useState<number>(45);

  const error = validateTiers(tiers);
  const preview = resolveTier(tiers, previewPeople);

  const updateTier = (idx: number, patch: Partial<PriceTier>) => {
    onChange(tiers.map((t, i) => (i === idx ? { ...t, ...patch } : t)));
  };

  const removeTier = (idx: number) => {
    onChange(tiers.filter((_, i) => i !== idx));
  };

  const addTier = () => {
    const last = tiers[tiers.length - 1];
    const nextMin = last ? last.max_people + 1 : 0;
    onChange([...tiers, { min_people: nextMin, max_people: nextMin + 9, price: 0 }]);
  };

  const handlePaste = () => {
    const parsed = parseTiersFromText(pasteText);
    if (parsed.length > 0) {
      onChange(parsed);
      setPasteText("");
      setPasteOpen(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="rounded-lg border">
        <div className="grid grid-cols-[1fr_1fr_1.5fr_auto] gap-2 px-3 py-2 bg-muted/50 text-xs font-medium">
          <span>Vanaf (pers.)</span>
          <span>T/m (pers.)</span>
          <span>Prijs (€, incl. BTW)</span>
          <span className="w-8" />
        </div>
        {tiers.length === 0 && (
          <p className="px-3 py-4 text-sm text-muted-foreground">
            Nog geen staffels. Klik "Staffel toevoegen" of plak vanuit lijst.
          </p>
        )}
        {tiers.map((tier, idx) => (
          <div key={idx} className="grid grid-cols-[1fr_1fr_1.5fr_auto] gap-2 px-3 py-2 border-t items-center">
            <Input
              type="number"
              min={0}
              value={tier.min_people}
              onChange={(e) => updateTier(idx, { min_people: Number(e.target.value) || 0 })}
            />
            <Input
              type="number"
              min={0}
              value={tier.max_people}
              onChange={(e) => updateTier(idx, { max_people: Number(e.target.value) || 0 })}
            />
            <Input
              type="number"
              step="0.01"
              min={0}
              value={tier.price}
              onChange={(e) => updateTier(idx, { price: Number(e.target.value) || 0 })}
            />
            <Button type="button" variant="ghost" size="icon" onClick={() => removeTier(idx)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" size="sm" onClick={addTier}>
          <Plus className="h-4 w-4 mr-1" /> Staffel toevoegen
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={() => setPasteOpen((o) => !o)}>
          Plak vanuit lijst
        </Button>
      </div>

      {pasteOpen && (
        <div className="space-y-2 rounded-md border p-3 bg-muted/30">
          <Label className="text-xs">
            Plak per regel "min-max prijs", bijv. "0-29 750" of "30-39 €850":
          </Label>
          <Textarea
            rows={6}
            value={pasteText}
            onChange={(e) => setPasteText(e.target.value)}
            placeholder={"0-29  750\n30-39 850\n40-49 950"}
          />
          <div className="flex gap-2">
            <Button type="button" size="sm" onClick={handlePaste}>
              Importeer
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => { setPasteOpen(false); setPasteText(""); }}>
              Annuleren
            </Button>
          </div>
        </div>
      )}

      <div className="space-y-2 rounded-md border p-3">
        <Label className="text-xs">Boven hoogste staffel</Label>
        <Select value={tiersAboveMax} onValueChange={(v) => onTiersAboveMaxChange(v as TiersAboveMax)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="highest">Gebruik hoogste staffel-prijs</SelectItem>
            <SelectItem value="on_request">Prijs op aanvraag</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2 rounded-md border p-3 bg-muted/30">
        <Label className="text-xs">Live preview</Label>
        <div className="flex items-center gap-2">
          <span className="text-sm">Bij</span>
          <Input
            type="number"
            className="w-24"
            min={0}
            value={previewPeople}
            onChange={(e) => setPreviewPeople(Number(e.target.value) || 0)}
          />
          <span className="text-sm">personen →</span>
          <span className="text-sm font-medium">
            {preview
              ? `€ ${preview.price.toFixed(2)} (staffel ${preview.min_people}-${preview.max_people})`
              : tiersAboveMax === "on_request"
                ? "Op aanvraag"
                : tiers.length > 0
                  ? `€ ${tiers[tiers.length - 1].price.toFixed(2)} (boven hoogste staffel)`
                  : "—"}
          </span>
        </div>
      </div>
    </div>
  );
};
