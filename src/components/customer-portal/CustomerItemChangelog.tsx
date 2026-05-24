import { useEffect, useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { History, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface ChangeRow {
  field: string;
  old_value: unknown;
  new_value: unknown;
  published_at: string;
  admin_note: string | null;
}

interface Props {
  itemId: string;
  customerToken: string;
}

const fieldLabel = (f: string) => {
  const map: Record<string, string> = {
    preferred_time: "Tijd",
    day_index: "Dag",
    customer_notes: "Notities",
    override_people: "Aantal personen",
    block_name: "Activiteit",
    location_address: "Locatie",
    provider_name: "Aanbieder",
    quoted_price: "Prijs",
    marked_for_removal: "Geannuleerd",
    added: "Toegevoegd",
  };
  return map[f] ?? f;
};

const fmt = (v: unknown): string => {
  if (v === null || v === undefined) return "—";
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
};

export const CustomerItemChangelog = ({ itemId, customerToken }: Props) => {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<ChangeRow[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || rows !== null) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    (supabase.rpc as any)("get_item_changelog", {
      p_item_id: itemId,
      p_customer_token: customerToken,
    })
      .then(({ data, error }: any) => {
        if (cancelled) return;
        if (error) setError(error.message);
        else setRows((data as ChangeRow[]) ?? []);
      })
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, [open, itemId, customerToken, rows]);

  if (!customerToken) return null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-muted-foreground">
          <History className="h-3.5 w-3.5 mr-1" />
          Wijzigingen
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80">
        <div className="text-sm font-medium mb-2">Wijzigingsgeschiedenis</div>
        {loading && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="h-3 w-3 animate-spin" /> Laden…
          </div>
        )}
        {error && <div className="text-xs text-destructive">{error}</div>}
        {!loading && !error && rows && rows.length === 0 && (
          <div className="text-xs text-muted-foreground">Geen wijzigingen geregistreerd.</div>
        )}
        {!loading && rows && rows.length > 0 && (
          <ul className="space-y-2 text-xs max-h-72 overflow-y-auto">
            {rows.map((r, i) => (
              <li key={i} className="border-b pb-2 last:border-0">
                <div className="text-muted-foreground">
                  {new Date(r.published_at).toLocaleString("nl-NL", { dateStyle: "short", timeStyle: "short" })}
                </div>
                <div className="flex flex-wrap gap-x-1.5">
                  <span className="font-medium">{fieldLabel(r.field)}:</span>
                  <span className="line-through text-muted-foreground">{fmt(r.old_value)}</span>
                  <span>→</span>
                  <span className="font-medium">{fmt(r.new_value)}</span>
                </div>
                {r.admin_note && <div className="mt-1 italic text-muted-foreground">"{r.admin_note}"</div>}
              </li>
            ))}
          </ul>
        )}
      </PopoverContent>
    </Popover>
  );
};
