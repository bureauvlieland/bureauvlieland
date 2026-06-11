import { useState } from "react";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { Moon, Calendar as CalendarIcon, Loader2, Sun } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

interface SnoozeProjectButtonProps {
  requestId: string;
  snoozedUntil: string | null;
  snoozedReason: string | null;
  /** Inline-variant geeft alleen icoonknoppen terug (voor dichte headers). */
  variant?: "default" | "compact";
}

const addDays = (days: number): Date => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + days);
  return d;
};

const PRESETS: { label: string; days: number }[] = [
  { label: "+3 dagen", days: 3 },
  { label: "+1 week", days: 7 },
  { label: "+2 weken", days: 14 },
  { label: "+1 maand", days: 30 },
];

export function SnoozeProjectButton({
  requestId,
  snoozedUntil,
  snoozedReason,
  variant = "default",
}: SnoozeProjectButtonProps) {
  const qc = useQueryClient();
  const isActivelySnoozed =
    !!snoozedUntil && new Date(snoozedUntil).getTime() > Date.now();

  const [open, setOpen] = useState(false);
  const [date, setDate] = useState<Date | undefined>(
    isActivelySnoozed ? new Date(snoozedUntil!) : addDays(7),
  );
  const [reason, setReason] = useState<string>(snoozedReason ?? "");
  const [saving, setSaving] = useState(false);
  const [waking, setWaking] = useState(false);

  const minDate = addDays(1);
  const maxDate = addDays(365);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["werkbank-projects"] });
    qc.invalidateQueries({ queryKey: ["werkbank-inbox"] });
    qc.invalidateQueries({ queryKey: ["admin-request"] });
    qc.invalidateQueries({ queryKey: ["projects-overview"] });
  };

  const handleSave = async () => {
    if (!date) return;
    setSaving(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData?.user?.id ?? null;
      const untilIso = date.toISOString();

      const { error: updErr } = await supabase
        .from("program_requests")
        .update({
          snoozed_until: untilIso,
          snoozed_reason: reason.trim() || null,
          snoozed_at: new Date().toISOString(),
          snoozed_by: userId,
        })
        .eq("id", requestId);
      if (updErr) throw updErr;

      // Sluit lopende auto-todos direct — zodat de Werkbank niet hoeft te
      // wachten op de eerstvolgende reconcile-cron.
      await supabase
        .from("admin_todos")
        .update({ status: "done", completed_at: new Date().toISOString() })
        .eq("related_request_id", requestId)
        .not("auto_type", "is", null)
        .in("status", ["todo", "in_progress"]);

      await supabase.from("program_request_history").insert({
        request_id: requestId,
        action: "snoozed",
        actor: "admin",
        new_value: {
          snoozed_until: untilIso,
          reason: reason.trim() || null,
        },
      });

      toast.success(
        `Project gesnoozed tot ${format(date, "EEEE d MMMM", { locale: nl })}`,
      );
      setOpen(false);
      invalidate();
    } catch (err: any) {
      console.error("snooze failed", err);
      toast.error(err?.message ?? "Snoozen mislukt");
    } finally {
      setSaving(false);
    }
  };

  const handleWake = async () => {
    setWaking(true);
    try {
      const { error: updErr } = await supabase
        .from("program_requests")
        .update({
          snoozed_until: null,
          snoozed_reason: null,
          snoozed_at: null,
          snoozed_by: null,
        })
        .eq("id", requestId);
      if (updErr) throw updErr;

      await supabase.from("program_request_history").insert({
        request_id: requestId,
        action: "unsnoozed",
        actor: "admin",
      });

      toast.success("Project is weer wakker. Acties worden direct geactualiseerd.");
      invalidate();
    } catch (err: any) {
      console.error("unsnooze failed", err);
      toast.error(err?.message ?? "Wakker maken mislukt");
    } finally {
      setWaking(false);
    }
  };

  if (isActivelySnoozed) {
    return (
      <div className="flex items-center gap-1.5">
        <Button
          size={variant === "compact" ? "sm" : "default"}
          variant="outline"
          onClick={handleWake}
          disabled={waking}
          className="gap-1.5 border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100"
          title={`Gesnoozed tot ${format(new Date(snoozedUntil!), "d MMMM yyyy", { locale: nl })}`}
        >
          {waking ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sun className="h-4 w-4" />}
          Wakker maken
        </Button>
        <Button
          size={variant === "compact" ? "sm" : "default"}
          variant="ghost"
          onClick={() => setOpen(true)}
          className="gap-1.5"
          title="Snooze-datum aanpassen"
        >
          <CalendarIcon className="h-4 w-4" />
          {format(new Date(snoozedUntil!), "d MMM", { locale: nl })}
        </Button>

        <SnoozeDialog
          open={open}
          onOpenChange={setOpen}
          date={date}
          setDate={setDate}
          reason={reason}
          setReason={setReason}
          minDate={minDate}
          maxDate={maxDate}
          saving={saving}
          onSave={handleSave}
        />
      </div>
    );
  }

  return (
    <>
      <Button
        size={variant === "compact" ? "sm" : "default"}
        variant="outline"
        onClick={() => setOpen(true)}
        className="gap-1.5"
      >
        <Moon className="h-4 w-4" />
        Snooze
      </Button>

      <SnoozeDialog
        open={open}
        onOpenChange={setOpen}
        date={date}
        setDate={setDate}
        reason={reason}
        setReason={setReason}
        minDate={minDate}
        maxDate={maxDate}
        saving={saving}
        onSave={handleSave}
      />
    </>
  );
}

interface SnoozeDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  date: Date | undefined;
  setDate: (d: Date | undefined) => void;
  reason: string;
  setReason: (s: string) => void;
  minDate: Date;
  maxDate: Date;
  saving: boolean;
  onSave: () => void;
}

function SnoozeDialog(props: SnoozeDialogProps) {
  const { open, onOpenChange, date, setDate, reason, setReason, minDate, maxDate, saving, onSave } = props;
  const [calOpen, setCalOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Project snoozen</DialogTitle>
          <DialogDescription>
            Tot de wek-datum krijgt u geen automatische taken of herinneringen voor dit project.
            Klant- en partnerportalen blijven gewoon werken.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Wek mij op</Label>
            <div className="flex flex-wrap gap-1.5">
              {PRESETS.map((p) => (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => setDate(addDays(p.days))}
                  className="rounded-full border px-3 py-1 text-xs hover:bg-muted transition-colors"
                >
                  {p.label}
                </button>
              ))}
            </div>
            <Popover open={calOpen} onOpenChange={setCalOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn("w-full justify-start text-left font-normal", !date && "text-muted-foreground")}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date ? format(date, "EEEE d MMMM yyyy", { locale: nl }) : "Kies een datum"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={(d) => { setDate(d); setCalOpen(false); }}
                  disabled={(d) => d < minDate || d > maxDate}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label htmlFor="snooze-reason">Reden (optioneel)</Label>
            <Textarea
              id="snooze-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Bijv. klant overlegt intern tot 20 juni"
              rows={2}
              maxLength={500}
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={saving}>
            Annuleren
          </Button>
          <Button onClick={onSave} disabled={!date || saving} className="gap-1.5">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Moon className="h-4 w-4" />}
            {date ? `Snooze tot ${format(date, "d MMM", { locale: nl })}` : "Snoozen"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
