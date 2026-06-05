import { useState } from "react";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { Check, ChevronsUpDown, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";

export interface ExtraAllocationRow {
  item_id: string;
  amount_excl_vat: string;
  vat_rate: string;
  notes?: string;
}

export interface ExtraProjectSplit {
  requestId: string;
  amountExclVat: string;
  vatRate: string;
  allocations: ExtraAllocationRow[];
}

interface ProjectOption {
  id: string;
  reference_number: string | null;
  customer_name: string;
  customer_company: string | null;
  created_at?: string | null;
  status?: string | null;
}

interface ItemOption {
  id: string;
  block_name: string;
  day_index: number;
  provider_id: string | null;
}

interface Props {
  index: number;
  split: ExtraProjectSplit;
  projects: ProjectOption[];
  itemsForProject: ItemOption[];
  partnerId: string;
  onChange: (patch: Partial<ExtraProjectSplit>) => void;
  onRemove: () => void;
}

export function ExtraProjectSplitBlock({
  index,
  split,
  projects,
  itemsForProject,
  partnerId,
  onChange,
  onRemove,
}: Props) {
  const [projectOpen, setProjectOpen] = useState(false);
  const selectedProject = projects.find((p) => p.id === split.requestId);

  const availableItems = itemsForProject.filter(
    (it) => !partnerId || !it.provider_id || it.provider_id === partnerId,
  );

  const excl = parseFloat(split.amountExclVat) || 0;
  const rate = parseFloat(split.vatRate) || 0;
  const incl = excl * (1 + rate / 100);

  const updateAlloc = (idx: number, patch: Partial<ExtraAllocationRow>) => {
    onChange({
      allocations: split.allocations.map((a, i) => (i === idx ? { ...a, ...patch } : a)),
    });
  };
  const removeAlloc = (idx: number) => {
    onChange({ allocations: split.allocations.filter((_, i) => i !== idx) });
  };
  const addAlloc = (item_id: string) => {
    onChange({
      allocations: [
        ...split.allocations,
        { item_id, amount_excl_vat: "", vat_rate: split.vatRate || "21", notes: "" },
      ],
    });
  };
  const splitAlloc = (idx: number) => {
    const src = split.allocations[idx];
    if (!src) return;
    const usedRates = split.allocations.filter((a) => a.item_id === src.item_id).map((a) => a.vat_rate);
    const nextRate = ["21", "9", "0"].find((r) => !usedRates.includes(r)) || "21";
    const copy = [...split.allocations];
    copy.splice(idx + 1, 0, { item_id: src.item_id, amount_excl_vat: "", vat_rate: nextRate, notes: "" });
    onChange({ allocations: copy });
  };

  const allocSumIncl = split.allocations.reduce((s, a) => {
    const e = parseFloat(a.amount_excl_vat) || 0;
    const r = parseFloat(a.vat_rate) || 0;
    return s + e * (1 + r / 100);
  }, 0);
  const allocMatches = split.allocations.length === 0 || Math.abs(allocSumIncl - incl) < 0.01;

  return (
    <div className="space-y-2 rounded-md border border-border p-3 bg-background">
      <div className="flex items-center justify-between gap-2">
        <Label className="text-sm font-medium">Extra project {index + 1}</Label>
        <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={onRemove}>
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      </div>

      <div className="grid grid-cols-12 gap-2">
        <div className="col-span-7">
          <Popover open={projectOpen} onOpenChange={setProjectOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" role="combobox" className="w-full justify-between h-9">
                <span className="truncate">
                  {selectedProject
                    ? `${selectedProject.reference_number || "Geen ref"} — ${selectedProject.customer_company || selectedProject.customer_name}`
                    : "Selecteer project..."}
                </span>
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
              <Command>
                <CommandInput placeholder="Zoek project..." autoFocus />
                <CommandList>
                  <CommandEmpty>Geen project gevonden</CommandEmpty>
                  <CommandGroup>
                    {projects.map((p) => {
                      const yearMonth = p.created_at
                        ? format(new Date(p.created_at), "yyyy MM MMM yyyy", { locale: nl })
                        : "";
                      const searchValue = [
                        p.reference_number || "",
                        p.customer_name || "",
                        p.customer_company || "",
                        yearMonth,
                        p.status || "",
                      ]
                        .join(" ")
                        .toLowerCase();
                      return (
                        <CommandItem
                          key={p.id}
                          value={searchValue}
                          onSelect={() => {
                            onChange({ requestId: p.id, allocations: [] });
                            setProjectOpen(false);
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              split.requestId === p.id ? "opacity-100" : "opacity-0",
                            )}
                          />
                          <div>
                            <div className="font-medium">{p.reference_number || "Geen ref"}</div>
                            <div className="text-xs text-muted-foreground">
                              {p.customer_company || p.customer_name}
                            </div>
                          </div>
                        </CommandItem>
                      );
                    })}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>
        <div className="col-span-3">
          <Input
            type="number"
            step="0.01"
            placeholder="Excl. €"
            value={split.amountExclVat}
            onChange={(e) => onChange({ amountExclVat: e.target.value })}
            className="h-9 text-right"
          />
        </div>
        <div className="col-span-2">
          <Select value={split.vatRate} onValueChange={(v) => onChange({ vatRate: v })}>
            <SelectTrigger className="h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="0">0%</SelectItem>
              <SelectItem value="9">9%</SelectItem>
              <SelectItem value="21">21%</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="text-xs text-right text-muted-foreground">Incl. BTW: €{incl.toFixed(2)}</div>

      {split.requestId && (
        <div className="space-y-1.5 pt-1">
          <Label className="text-xs text-muted-foreground">
            Onderdelen binnen dit project (optioneel)
          </Label>

          {split.allocations.length > 0 && (
            <div className="space-y-1.5">
              {split.allocations.map((alloc, idx) => {
                const it = itemsForProject.find((i) => i.id === alloc.item_id);
                const aExcl = parseFloat(alloc.amount_excl_vat) || 0;
                const aRate = parseFloat(alloc.vat_rate) || 0;
                const aIncl = aExcl * (1 + aRate / 100);
                return (
                  <div
                    key={alloc.item_id}
                    className="grid grid-cols-12 gap-2 items-center text-sm rounded-md p-2 border border-border bg-muted/30"
                  >
                    <div className="col-span-5 truncate">
                      <div className="font-medium truncate text-xs">
                        {it ? `Dag ${it.day_index + 1}: ${it.block_name}` : "Onbekend onderdeel"}
                      </div>
                    </div>
                    <div className="col-span-3">
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="Excl. €"
                        value={alloc.amount_excl_vat}
                        onChange={(e) => updateAlloc(idx, { amount_excl_vat: e.target.value })}
                        className="h-8"
                      />
                    </div>
                    <div className="col-span-2">
                      <Select
                        value={alloc.vat_rate}
                        onValueChange={(v) => updateAlloc(idx, { vat_rate: v })}
                      >
                        <SelectTrigger className="h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="0">0%</SelectItem>
                          <SelectItem value="9">9%</SelectItem>
                          <SelectItem value="21">21%</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-1 text-right text-xs tabular-nums text-muted-foreground">
                      €{aIncl.toFixed(2)}
                    </div>
                    <div className="col-span-1 flex justify-end">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => removeAlloc(idx)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {availableItems.length > 0 && (
            <Select value="" onValueChange={(v) => v && addAlloc(v)}>
              <SelectTrigger className="h-8">
                <SelectValue
                  placeholder={
                    split.allocations.length === 0
                      ? "+ Onderdeel toevoegen"
                      : "+ Nog een onderdeel toevoegen"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {availableItems.map((it) => (
                  <SelectItem key={it.id} value={it.id}>
                    Dag {it.day_index + 1}: {it.block_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {split.allocations.length > 0 && (
            <div
              className={cn(
                "text-xs px-2 py-1 rounded-md",
                allocMatches
                  ? "bg-green-100 dark:bg-green-950/40 text-green-800 dark:text-green-300"
                  : "bg-amber-100 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300",
              )}
            >
              Toegewezen: <strong>€{allocSumIncl.toFixed(2)}</strong> van €{incl.toFixed(2)}
              {allocMatches ? " ✓" : ` (verschil €${(incl - allocSumIncl).toFixed(2)})`}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
