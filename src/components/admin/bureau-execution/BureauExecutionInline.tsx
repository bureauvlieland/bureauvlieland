import { useState } from "react";
import { UserCheck, Check, RotateCcw } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

export interface BureauExecutionInlineItem {
  id: string;
  block_name: string | null;
  bureau_guide_name: string | null;
  bureau_guide_contact: string | null;
  bureau_arranged_at: string | null;
  bureau_arranged_notes: string | null;
}

interface Props {
  item: BureauExecutionInlineItem;
  onChanged?: () => void;
}

export function BureauExecutionInline({ item, onChanged }: Props) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [guide, setGuide] = useState(item.bureau_guide_name ?? "");
  const [contact, setContact] = useState(item.bureau_guide_contact ?? "");
  const [notes, setNotes] = useState(item.bureau_arranged_notes ?? "");
  const [busy, setBusy] = useState(false);

  const isArranged = !!item.bureau_arranged_at;

  const save = async (markArranged: boolean) => {
    setBusy(true);
    const { error } = await supabase
      .from("program_request_items")
      .update({
        bureau_guide_name: guide.trim() || null,
        bureau_guide_contact: contact.trim() || null,
        bureau_arranged_notes: notes.trim() || null,
        bureau_arranged_at: markArranged ? new Date().toISOString() : item.bureau_arranged_at,
      })
      .eq("id", item.id);
    setBusy(false);
    if (error) {
      toast({ title: "Opslaan mislukt", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: markArranged ? "Gemarkeerd als geregeld" : "Opgeslagen" });
    onChanged?.();
    if (markArranged) setOpen(false);
  };

  const reopen = async () => {
    setBusy(true);
    const { error } = await supabase
      .from("program_request_items")
      .update({ bureau_arranged_at: null })
      .eq("id", item.id);
    setBusy(false);
    if (error) {
      toast({ title: "Heropenen mislukt", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Heropend" });
    onChanged?.();
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "mt-1 inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] transition-colors",
            isArranged
              ? "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
              : "border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100",
          )}
        >
          <UserCheck className="h-3 w-3" />
          {isArranged ? (
            <>
              <Check className="h-3 w-3" />
              <span className="font-medium">
                {item.bureau_guide_name || "Geregeld"}
              </span>
            </>
          ) : (
            <span>Regelen</span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="start">
        <div className="space-y-3">
          <div>
            <div className="text-sm font-semibold">Bureau-uitvoering</div>
            <div className="text-xs text-muted-foreground">
              Wie begeleidt {item.block_name ?? "dit onderdeel"}?
            </div>
          </div>
          <div className="space-y-2">
            <div>
              <Label htmlFor="guide-name" className="text-xs">Begeleider</Label>
              <Input
                id="guide-name"
                value={guide}
                onChange={(e) => setGuide(e.target.value)}
                placeholder="Bijv. Jan de Vuurtorenwachter"
                disabled={busy}
              />
            </div>
            <div>
              <Label htmlFor="guide-contact" className="text-xs">Contact (optioneel)</Label>
              <Input
                id="guide-contact"
                value={contact}
                onChange={(e) => setContact(e.target.value)}
                placeholder="Telefoon of e-mail"
                disabled={busy}
              />
            </div>
            <div>
              <Label htmlFor="guide-notes" className="text-xs">Interne notitie</Label>
              <Textarea
                id="guide-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Optioneel"
                rows={2}
                disabled={busy}
              />
            </div>
          </div>
          <div className="flex gap-2 justify-end pt-1">
            {isArranged ? (
              <>
                <Button size="sm" variant="ghost" onClick={reopen} disabled={busy}>
                  <RotateCcw className="h-3 w-3 mr-1" /> Heropenen
                </Button>
                <Button size="sm" onClick={() => save(false)} disabled={busy}>
                  Bijwerken
                </Button>
              </>
            ) : (
              <Button size="sm" onClick={() => save(true)} disabled={busy || !guide.trim()}>
                <Check className="h-3 w-3 mr-1" /> Markeer als geregeld
              </Button>
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
