import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2, Save, RotateCcw } from "lucide-react";
import { autoTodoTypeConfig, type AutoTodoType } from "@/lib/autoTodoCreator";
import type { TodoAgeThresholdsConfig, TodoAgeThreshold } from "@/types/appSettings";

interface TodoThresholdsEditorProps {
  value: TodoAgeThresholdsConfig;
  onSave: (next: TodoAgeThresholdsConfig) => void;
  isSaving?: boolean;
}

const cloneConfig = (cfg: TodoAgeThresholdsConfig): TodoAgeThresholdsConfig => ({
  default: { ...cfg.default },
  byType: Object.fromEntries(Object.entries(cfg.byType ?? {}).map(([k, v]) => [k, { ...v }])),
});

const ThresholdInputs = ({
  threshold,
  onChange,
}: {
  threshold: TodoAgeThreshold;
  onChange: (next: TodoAgeThreshold) => void;
}) => (
  <div className="flex items-center gap-2">
    <div className="flex items-center gap-1.5">
      <span className="inline-block h-3 w-3 rounded-full bg-amber-400" aria-hidden />
      <Input
        type="number"
        min={1}
        value={threshold.amber}
        onChange={(e) => onChange({ ...threshold, amber: Math.max(1, parseInt(e.target.value) || 1) })}
        className="w-20"
      />
      <span className="text-xs text-muted-foreground">d</span>
    </div>
    <div className="flex items-center gap-1.5">
      <span className="inline-block h-3 w-3 rounded-full bg-destructive" aria-hidden />
      <Input
        type="number"
        min={1}
        value={threshold.red}
        onChange={(e) => onChange({ ...threshold, red: Math.max(1, parseInt(e.target.value) || 1) })}
        className="w-20"
      />
      <span className="text-xs text-muted-foreground">d</span>
    </div>
  </div>
);

export const TodoThresholdsEditor = ({ value, onSave, isSaving }: TodoThresholdsEditorProps) => {
  const [draft, setDraft] = useState<TodoAgeThresholdsConfig>(cloneConfig(value));
  const [addingType, setAddingType] = useState<string>("");

  const isDirty = JSON.stringify(draft) !== JSON.stringify(value);

  const allTypes = Object.keys(autoTodoTypeConfig) as AutoTodoType[];
  const usedTypes = new Set(Object.keys(draft.byType ?? {}));
  const availableTypes = allTypes.filter((t) => !usedTypes.has(t));

  const handleAddOverride = () => {
    if (!addingType) return;
    setDraft((prev) => ({
      ...prev,
      byType: {
        ...prev.byType,
        [addingType]: { ...prev.default },
      },
    }));
    setAddingType("");
  };

  const handleRemoveOverride = (type: string) => {
    setDraft((prev) => {
      const next = { ...prev.byType };
      delete next[type];
      return { ...prev, byType: next };
    });
  };

  return (
    <div className="space-y-4">
      {/* Default thresholds */}
      <div className="rounded-md border p-3 space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium">Standaard drempels</Label>
          <span className="text-[11px] text-muted-foreground">geldt voor alle todo-types zonder eigen instelling</span>
        </div>
        <ThresholdInputs
          threshold={draft.default}
          onChange={(next) => setDraft((prev) => ({ ...prev, default: next }))}
        />
        <p className="text-[11px] text-muted-foreground">
          Voorbeeld: amber=3, rood=7 → een todo wordt na 3 dagen oranje en na 7 dagen rood gemarkeerd.
        </p>
      </div>

      <Separator />

      {/* Per-type overrides */}
      <div className="space-y-3">
        <div>
          <Label className="text-sm font-medium">Specifieke drempels per todo-type</Label>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Overschrijf de standaard voor specifieke types — bijvoorbeeld strengere drempels voor verlopen offertes.
          </p>
        </div>

        {Object.entries(draft.byType ?? {}).length === 0 && (
          <p className="text-xs text-muted-foreground italic">Geen specifieke drempels — standaard wordt overal gebruikt.</p>
        )}

        {Object.entries(draft.byType ?? {}).map(([type, threshold]) => {
          const config = autoTodoTypeConfig[type as AutoTodoType];
          return (
            <div key={type} className="flex items-center justify-between gap-3 rounded-md border p-2.5">
              <div className="flex items-center gap-2 min-w-0">
                <Badge variant="outline" className={`${config?.bgColor ?? ""} ${config?.color ?? ""} text-[11px]`}>
                  {config?.label ?? type}
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <ThresholdInputs
                  threshold={threshold}
                  onChange={(next) =>
                    setDraft((prev) => ({
                      ...prev,
                      byType: { ...prev.byType, [type]: next },
                    }))
                  }
                />
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                  onClick={() => handleRemoveOverride(type)}
                  title="Verwijder override"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          );
        })}

        {/* Add new override */}
        {availableTypes.length > 0 && (
          <div className="flex items-center gap-2 pt-1">
            <Select value={addingType} onValueChange={setAddingType}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Kies todo-type om aan te passen…" />
              </SelectTrigger>
              <SelectContent>
                {availableTypes.map((type) => (
                  <SelectItem key={type} value={type}>
                    {autoTodoTypeConfig[type].label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button size="sm" variant="outline" onClick={handleAddOverride} disabled={!addingType}>
              <Plus className="h-4 w-4 mr-1" />
              Toevoegen
            </Button>
          </div>
        )}
      </div>

      {/* Action bar */}
      {isDirty && (
        <div className="flex items-center gap-2 pt-2 border-t">
          <Button size="sm" onClick={() => onSave(draft)} disabled={isSaving}>
            <Save className="h-4 w-4 mr-1" />
            Opslaan
          </Button>
          <Button size="sm" variant="outline" onClick={() => setDraft(cloneConfig(value))}>
            <RotateCcw className="h-4 w-4 mr-1" />
            Terugdraaien
          </Button>
          <span className="text-[11px] text-muted-foreground">Wijzigingen nog niet opgeslagen</span>
        </div>
      )}
    </div>
  );
};
