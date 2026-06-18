import { useMemo, useState } from "react";
import {
  useBlockComponents,
  useCreateBlockComponent,
  useUpdateBlockComponent,
  useDeleteBlockComponent,
} from "@/hooks/useBlockComponents";
import { useAdminBuildingBlocks } from "@/hooks/useBuildingBlocks";
import { quantityModeLabels, type BlockComponentQuantityMode } from "@/types/blockComponent";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Loader2, Plus, Trash2, AlertTriangle, Check, ChevronsUpDown } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Props {
  parentBlockId: string;
}

const QUANTITY_MODES: BlockComponentQuantityMode[] = [
  "fixed",
  "per_group",
  "per_n_people",
  "per_people_per_day",
];

export const BlockComponentsEditor = ({ parentBlockId }: Props) => {
  const { data: components = [], isLoading } = useBlockComponents(parentBlockId);
  const { data: allBlocks = [] } = useAdminBuildingBlocks();
  const create = useCreateBlockComponent();
  const update = useUpdateBlockComponent();
  const remove = useDeleteBlockComponent();

  const [pickerOpen, setPickerOpen] = useState(false);

  // Block IDs already used as child, plus self → not selectable
  const usedChildIds = useMemo(
    () => new Set(components.map((c) => c.child_block_id).concat(parentBlockId)),
    [components, parentBlockId],
  );

  const selectableBlocks = useMemo(
    () => allBlocks.filter((b) => !usedChildIds.has(b.id)),
    [allBlocks, usedChildIds],
  );

  const handleAdd = async (childId: string) => {
    setPickerOpen(false);
    try {
      await create.mutateAsync({
        parent_block_id: parentBlockId,
        child_block_id: childId,
        is_required: true,
        quantity_mode: "fixed",
        quantity_value: 1,
        sort_order: components.length,
      });
      toast.success("Onderdeel toegevoegd");
    } catch (e: any) {
      toast.error(e.message ?? "Toevoegen mislukt");
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-md border bg-muted/30 p-3 text-sm text-muted-foreground">
        <p>
          Voeg hier <strong>onderdelen</strong> toe die automatisch met deze
          bouwsteen mee worden geboekt. <strong>Verplichte</strong> onderdelen
          worden direct toegevoegd zodra deze bouwsteen in een programma komt.{" "}
          <strong>Optionele</strong> onderdelen verschijnen als upsell-suggestie.
        </p>
        <p className="mt-1 text-xs">
          Max. 1 niveau diep — een onderdeel mag zelf geen samenstelling hebben.
        </p>
      </div>

      {components.length === 0 ? (
        <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
          Nog geen onderdelen — voeg er eentje toe om deze bouwsteen samengesteld te maken.
        </div>
      ) : (
        <div className="space-y-3">
          {components.map((row) => {
            const child = row.child;
            if (!child) {
              return (
                <div
                  key={row.id}
                  className="flex items-center justify-between rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm"
                >
                  <span className="flex items-center gap-2 text-destructive">
                    <AlertTriangle className="h-4 w-4" />
                    Onbekende bouwsteen ({row.child_block_id})
                  </span>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() =>
                      remove.mutate({ id: row.id, parent_block_id: parentBlockId })
                    }
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              );
            }
            return (
              <div key={row.id} className="rounded-md border bg-card p-3 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-medium">{child.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {child.provider?.name ?? "Bureau Vlieland"} •{" "}
                      {child.price_adult != null
                        ? `€ ${Number(child.price_adult).toFixed(2)}`
                        : "Op aanvraag"}
                    </div>
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="text-destructive hover:text-destructive"
                    onClick={() =>
                      remove.mutate({ id: row.id, parent_block_id: parentBlockId })
                    }
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-center justify-between rounded-md border px-3 py-2">
                    <Label htmlFor={`req-${row.id}`} className="text-sm">
                      Verplicht
                    </Label>
                    <Switch
                      id={`req-${row.id}`}
                      checked={row.is_required}
                      onCheckedChange={(checked) =>
                        update.mutate({
                          id: row.id,
                          parent_block_id: parentBlockId,
                          updates: { is_required: checked },
                        })
                      }
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs">Hoeveelheidsmodus</Label>
                    <Select
                      value={row.quantity_mode}
                      onValueChange={(v: BlockComponentQuantityMode) =>
                        update.mutate({
                          id: row.id,
                          parent_block_id: parentBlockId,
                          updates: { quantity_mode: v },
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {QUANTITY_MODES.map((m) => (
                          <SelectItem key={m} value={m}>
                            {quantityModeLabels[m]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {(row.quantity_mode === "fixed" || row.quantity_mode === "per_n_people") && (
                  <div className="space-y-1">
                    <Label className="text-xs">
                      {row.quantity_mode === "per_n_people"
                        ? "1 stuk per … personen"
                        : "Aantal"}
                    </Label>
                    <Input
                      type="number"
                      min={1}
                      defaultValue={row.quantity_value}
                      onBlur={(e) => {
                        const v = Math.max(1, Number(e.target.value) || 1);
                        if (v !== row.quantity_value) {
                          update.mutate({
                            id: row.id,
                            parent_block_id: parentBlockId,
                            updates: { quantity_value: v },
                          });
                        }
                      }}
                    />
                  </div>
                )}

                <div className="space-y-1">
                  <Label className="text-xs">Notitie (intern)</Label>
                  <Textarea
                    rows={1}
                    defaultValue={row.notes ?? ""}
                    placeholder="Optionele toelichting…"
                    onBlur={(e) => {
                      const v = e.target.value.trim() || null;
                      if (v !== (row.notes ?? null)) {
                        update.mutate({
                          id: row.id,
                          parent_block_id: parentBlockId,
                          updates: { notes: v },
                        });
                      }
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" className="w-full" type="button">
            <Plus className="mr-2 h-4 w-4" />
            Component toevoegen
            <ChevronsUpDown className="ml-auto h-4 w-4 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
          <Command>
            <CommandInput placeholder="Zoek bouwsteen…" />
            <CommandList>
              <CommandEmpty>Geen bouwstenen gevonden.</CommandEmpty>
              <CommandGroup>
                {selectableBlocks.map((b) => (
                  <CommandItem
                    key={b.id}
                    value={`${b.name} ${b.id}`}
                    onSelect={() => handleAdd(b.id)}
                  >
                    <Check className={cn("mr-2 h-4 w-4 opacity-0")} />
                    <span className="flex-1 truncate">{b.name}</span>
                    <span className="ml-2 text-xs text-muted-foreground">
                      {b.provider?.name ?? "BV"}
                    </span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
};
