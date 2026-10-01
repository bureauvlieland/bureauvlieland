import { useMemo, useState } from "react";
import { Sheet, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { ResponsiveSheetContent, Notice, FormField } from "@/components/system";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import type { ProgramRequestItem } from "@/types/programRequest";
import { timeSlots } from "@/types/buildingBlock";
import { formatTimeHHmm, getAvailableTimeSlots, getBlockedTimeSlots, hasTimeConflict } from "@/lib/timeUtils";

/**
 * Tijd wijzigen als één sheet (klantportaal fase 2): de gewenste, voorgestelde
 * en bevestigde tijd naast elkaar, met in gewone taal wat er met een nieuwe
 * tijd gebeurt. Twee standen:
 * - gewenst: het onderdeel is nog niet bevestigd; de nieuwe tijd is een lokale
 *   wijziging die met "Versturen" naar Bureau Vlieland en de aanbieder gaat;
 * - tegenvoorstel: de klant heeft het onderdeel al goedgekeurd; een andere
 *   tijd gaat direct naar de aanbieder, de prijs blijft gelijk.
 */
interface TimeSheetProps {
  item: ProgramRequestItem;
  allItems: ProgramRequestItem[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChangePreferred?: (time: string | null) => void;
  onCounterProposal?: (time: string, note: string) => Promise<boolean>;
}

const Tile = ({ label, value, muted = false }: { label: string; value: string; muted?: boolean }) => (
  <div className="rounded-lg border bg-muted/30 px-3 py-2">
    <p className="text-eyebrow font-medium uppercase text-muted-foreground">{label}</p>
    <p className={muted ? "mt-1 text-sm text-muted-foreground" : "mt-1 text-base font-semibold tabular-nums"}>{value}</p>
  </div>
);

export const TimeSheet = ({ item, allItems, open, onOpenChange, onChangePreferred, onCounterProposal }: TimeSheetProps) => {
  const counterMode = !!item.customer_accepted_at && !!onCounterProposal;
  const [time, setTime] = useState<string>("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const blockedSlots = useMemo(() => getBlockedTimeSlots(allItems, item.day_index, item.id), [allItems, item.day_index, item.id]);
  const counterSlots = useMemo(() => getAvailableTimeSlots(blockedSlots, item.duration), [blockedSlots, item.duration]);
  const conflict = counterMode && time ? hasTimeConflict(time, item.duration, blockedSlots) : null;

  const close = () => {
    setTime("");
    setNote("");
    setError(null);
    onOpenChange(false);
  };

  const submit = async () => {
    setError(null);
    if (counterMode) {
      if (!time) {
        setError("Kies een tijd voor uw tegenvoorstel.");
        return;
      }
      if (conflict) {
        setError("Deze tijd overlapt met een ander onderdeel op deze dag.");
        return;
      }
      setBusy(true);
      const ok = await onCounterProposal!(time, note);
      setBusy(false);
      if (ok) close();
      else setError("Er ging iets mis. Probeer het opnieuw.");
      return;
    }
    if (!time) {
      setError("Kies een tijd.");
      return;
    }
    onChangePreferred?.(time === "flexibel" ? null : time);
    close();
  };

  const wished = item.preferred_time ? (item.preferred_time === "flexibel" ? "Flexibel" : formatTimeHHmm(item.preferred_time) ?? item.preferred_time) : "Flexibel";
  const proposed = item.proposed_time ? formatTimeHHmm(item.proposed_time) ?? item.proposed_time : null;
  const confirmed = item.confirmed_time ? formatTimeHHmm(item.confirmed_time) ?? item.confirmed_time : null;

  return (
    <Sheet open={open} onOpenChange={(o) => (o ? onOpenChange(true) : close())}>
      <ResponsiveSheetContent className="w-full sm:max-w-md">
        <SheetHeader className="text-left">
          <SheetTitle>Tijd van {item.block_name}</SheetTitle>
          <SheetDescription>
            {counterMode
              ? "U heeft dit onderdeel al goedgekeurd. Een andere tijd gaat als tegenvoorstel direct naar de aanbieder; de prijs blijft gelijk."
              : "Uw gewenste tijd gaat met de knop Versturen naar Bureau Vlieland en de aanbieder. De aanbieder bevestigt de tijd of stelt een andere voor."}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-5">
          <div className="grid grid-cols-3 gap-2">
            <Tile label="Gewenst" value={wished} />
            <Tile label="Voorstel" value={proposed ?? "nog geen"} muted={!proposed} />
            <Tile label="Bevestigd" value={confirmed ?? "nog niet"} muted={!confirmed} />
          </div>

          {blockedSlots.length > 0 && (
            <Notice tone="info" title="Al bezet op deze dag">
              <ul className="mt-1 space-y-0.5">
                {blockedSlots.map((slot) => (
                  <li key={slot.itemId}>
                    {formatTimeHHmm(slot.startTime) ?? slot.startTime} tot {formatTimeHHmm(slot.endTime) ?? slot.endTime}: {slot.itemName}
                  </li>
                ))}
              </ul>
            </Notice>
          )}

          <FormField label={counterMode ? "Nieuwe tijd (tegenvoorstel)" : "Nieuwe gewenste tijd"} htmlFor="tijd-nieuw" required error={error}>
            <Select value={time} onValueChange={setTime}>
              <SelectTrigger id="tijd-nieuw">
                <SelectValue placeholder="Kies een tijd" />
              </SelectTrigger>
              <SelectContent>
                {counterMode
                  ? counterSlots.length > 0
                    ? counterSlots.map((slot) => (
                        <SelectItem key={slot} value={slot}>
                          {slot}
                        </SelectItem>
                      ))
                    : (
                        <SelectItem value="geen" disabled>
                          Geen vrije tijden op deze dag
                        </SelectItem>
                      )
                  : timeSlots.map((slot) => (
                      <SelectItem key={slot.value} value={slot.value}>
                        {slot.label}
                      </SelectItem>
                    ))}
              </SelectContent>
            </Select>
          </FormField>

          {counterMode && (
            <FormField label="Toelichting" htmlFor="tijd-toelichting" help="Waarom komt deze tijd u beter uit?">
              <Textarea id="tijd-toelichting" rows={3} value={note} onChange={(e) => setNote(e.target.value)} />
            </FormField>
          )}

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="outline" onClick={close} disabled={busy}>
              Annuleren
            </Button>
            <Button onClick={submit} disabled={busy || !time}>
              {busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
              {counterMode ? (busy ? "Versturen…" : "Tegenvoorstel versturen") : "Tijd aanpassen"}
            </Button>
          </div>
        </div>
      </ResponsiveSheetContent>
    </Sheet>
  );
};
