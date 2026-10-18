import { useState, type ReactNode } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Button } from "@/components/ui/button";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { projectLabel, type PickableProject } from "@/hooks/usePickableProjects";

interface ProjectPickerPopoverProps {
  value: string | null;
  onChange: (projectId: string) => void;
  projects: PickableProject[] | undefined;
  placeholder?: string;
  className?: string;
  size?: "sm" | "default";
  trigger?: ReactNode;
}

/** Zoekbare projectkeuze, als combobox. */
export function ProjectPickerPopover({
  value,
  onChange,
  projects,
  placeholder = "Kies project…",
  className,
  size = "default",
  trigger,
}: ProjectPickerPopoverProps) {
  const [open, setOpen] = useState(false);
  const selected = projects?.find((p) => p.id === value);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {trigger ?? (
          <Button
            variant="outline"
            role="combobox"
            size={size === "sm" ? "sm" : "default"}
            className={cn("w-full justify-between font-normal", size === "sm" && "h-8 text-xs", className)}
          >
            <span className="truncate">{selected ? projectLabel(selected) : placeholder}</span>
            <ChevronsUpDown className="ml-2 h-3.5 w-3.5 shrink-0 opacity-50" />
          </Button>
        )}
      </PopoverTrigger>
      <PopoverContent className="w-[360px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Zoek op referentie, klant of bedrijf..." autoFocus />
          <CommandList>
            <CommandEmpty>Geen project gevonden</CommandEmpty>
            <CommandGroup>
              {(projects ?? []).map((p) => (
                <CommandItem
                  key={p.id}
                  value={[p.reference_number, p.customer_name, p.customer_company].filter(Boolean).join(" ").toLowerCase()}
                  onSelect={() => {
                    onChange(p.id);
                    setOpen(false);
                  }}
                >
                  <Check className={cn("mr-2 h-4 w-4", value === p.id ? "opacity-100" : "opacity-0")} />
                  <div className="min-w-0">
                    <div className="font-medium">{p.reference_number || "Geen ref"}</div>
                    <div className="text-xs text-muted-foreground truncate">{p.customer_company || p.customer_name}</div>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
