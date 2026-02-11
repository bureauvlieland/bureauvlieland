import { LayoutGrid, List } from "lucide-react";
import { Toggle } from "@/components/ui/toggle";

type ViewMode = "grid" | "list";

interface ViewToggleProps {
  viewMode: ViewMode;
  onChange: (mode: ViewMode) => void;
}

export const ViewToggle = ({ viewMode, onChange }: ViewToggleProps) => (
  <div className="flex items-center border rounded-md">
    <Toggle
      size="sm"
      pressed={viewMode === "grid"}
      onPressedChange={() => onChange("grid")}
      aria-label="Grid weergave"
      className="rounded-r-none"
    >
      <LayoutGrid className="h-4 w-4" />
    </Toggle>
    <Toggle
      size="sm"
      pressed={viewMode === "list"}
      onPressedChange={() => onChange("list")}
      aria-label="Lijst weergave"
      className="rounded-l-none"
    >
      <List className="h-4 w-4" />
    </Toggle>
  </div>
);
