import { useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Sparkles, ChevronDown, ChevronUp } from "lucide-react";

type Change = {
  item_id: string;
  request_id: string;
  block_name: string;
  field: string;
  old_value: unknown;
  new_value: unknown;
  published_at: string;
};

interface Props {
  changes: Change[] | null | undefined;
  previousLastSeenAt: string | null | undefined;
}

const fieldLabel = (f: string) => {
  const map: Record<string, string> = {
    preferred_time: "Tijd",
    day_index: "Dag",
    customer_notes: "Klantnotities",
    override_people: "Aantal personen",
    block_name: "Activiteit",
    location_address: "Locatie",
    provider_name: "Aanbieder",
    quoted_price: "Prijs",
    marked_for_removal: "Geannuleerd",
    added: "Nieuw toegevoegd",
  };
  return map[f] ?? f;
};

const formatValue = (v: unknown): string => {
  if (v === null || v === undefined) return "—";
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
};

export const PartnerChangesSinceBanner = ({ changes, previousLastSeenAt }: Props) => {
  const [open, setOpen] = useState(false);
  if (!previousLastSeenAt || !changes || changes.length === 0) return null;

  return (
    <Alert className="border-primary/40 bg-primary/5">
      <Sparkles className="h-4 w-4" />
      <AlertTitle className="flex items-center justify-between gap-2">
        <span>{changes.length} {changes.length === 1 ? "wijziging" : "wijzigingen"} sinds je laatste bezoek</span>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setOpen((v) => !v)}
          className="h-7"
        >
          {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          {open ? "Verbergen" : "Toon"}
        </Button>
      </AlertTitle>
      {open && (
        <AlertDescription className="mt-2 space-y-2">
          <ul className="text-sm space-y-1.5">
            {changes.slice(0, 10).map((c, i) => (
              <li key={`${c.item_id}-${c.field}-${i}`} className="flex flex-wrap gap-x-2">
                <span className="font-medium">{c.block_name}</span>
                <span className="text-muted-foreground">·</span>
                <span>{fieldLabel(c.field)}:</span>
                <span className="line-through text-muted-foreground">{formatValue(c.old_value)}</span>
                <span>→</span>
                <span className="font-medium">{formatValue(c.new_value)}</span>
              </li>
            ))}
            {changes.length > 10 && (
              <li className="text-xs text-muted-foreground">… en {changes.length - 10} meer</li>
            )}
          </ul>
        </AlertDescription>
      )}
    </Alert>
  );
};
