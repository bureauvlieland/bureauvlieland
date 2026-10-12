import { useCallback, useEffect, useState } from "react";
import { format, isBefore, parseISO } from "date-fns";
import { nl } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { EmptyState, FormField, LoadingState } from "@/components/system";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { CalendarIcon, CalendarOff, Loader2, Plus, Trash2 } from "lucide-react";
import { reportError } from "@/lib/errorReporting";

/**
 * Periodes waarin de partner niet beschikbaar is (partnerportaal fase 4):
 * een sectie op Instellingen met een eigen lijst en een klein formulier
 * op `FormField`; leeg is een `EmptyState`.
 */
interface UnavailabilityPeriod {
  id: string;
  partner_id: string;
  start_date: string;
  end_date: string;
  reason: string | null;
  created_at: string;
}

interface PartnerUnavailabilityManagerProps {
  partnerId: string;
}

const periodLabel = (p: UnavailabilityPeriod) => `${format(parseISO(p.start_date), "d MMM", { locale: nl })} tot ${format(parseISO(p.end_date), "d MMM yyyy", { locale: nl })}`;

const DateButton = ({ id, value, placeholder, onSelect, disabled }: { id: string; value?: Date; placeholder: string; onSelect: (d?: Date) => void; disabled: (d: Date) => boolean }) => (
  <Popover>
    <PopoverTrigger asChild>
      <Button id={id} type="button" variant="outline" className={cn("w-full justify-start text-left font-normal", !value && "text-muted-foreground")}>
        <CalendarIcon className="mr-2 h-4 w-4" aria-hidden="true" />
        {value ? format(value, "d MMMM yyyy", { locale: nl }) : placeholder}
      </Button>
    </PopoverTrigger>
    <PopoverContent className="w-auto p-0" align="start">
      <Calendar mode="single" selected={value} onSelect={onSelect} disabled={disabled} initialFocus className="pointer-events-auto p-3" />
    </PopoverContent>
  </Popover>
);

export const PartnerUnavailabilityManager = ({ partnerId }: PartnerUnavailabilityManagerProps) => {
  const { toast } = useToast();
  const [periods, setPeriods] = useState<UnavailabilityPeriod[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  const fetchPeriods = useCallback(async () => {
    try {
      const { data, error: fetchError } = await supabase.from("partner_unavailability").select("*").eq("partner_id", partnerId).order("start_date", { ascending: true });
      if (fetchError) throw fetchError;
      setPeriods(data || []);
    } catch (err) {
      reportError(err, { where: "PartnerUnavailabilityManager: Error fetching unavailability" });
      toast({ title: "Beschikbaarheid niet geladen", description: "Kon de periodes niet laden.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [partnerId, toast]);

  useEffect(() => {
    if (partnerId) void fetchPeriods();
  }, [partnerId, fetchPeriods]);

  const resetForm = () => {
    setIsAdding(false);
    setStartDate(undefined);
    setEndDate(undefined);
    setReason("");
    setError(null);
  };

  const handleAddPeriod = async () => {
    if (!startDate || !endDate) {
      setError("Kies een begin- en einddatum.");
      return;
    }
    if (isBefore(endDate, startDate)) {
      setError("De einddatum moet na de begindatum liggen.");
      return;
    }
    setIsSaving(true);
    try {
      const { error: insertError } = await supabase.from("partner_unavailability").insert({
        partner_id: partnerId,
        start_date: format(startDate, "yyyy-MM-dd"),
        end_date: format(endDate, "yyyy-MM-dd"),
        reason: reason.trim() || null,
      });
      if (insertError) throw insertError;
      toast({ title: "Periode toegevoegd" });
      resetForm();
      await fetchPeriods();
    } catch (err) {
      reportError(err, { where: "PartnerUnavailabilityManager: Error adding period" });
      toast({ title: "Periode niet toegevoegd", description: "Probeer het opnieuw.", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeletePeriod = async (id: string) => {
    setDeletingId(id);
    try {
      const { error: deleteError } = await supabase.from("partner_unavailability").delete().eq("id", id);
      if (deleteError) throw deleteError;
      toast({ title: "Periode verwijderd" });
      await fetchPeriods();
    } catch (err) {
      reportError(err, { where: "PartnerUnavailabilityManager: Error deleting period" });
      toast({ title: "Periode niet verwijderd", description: "Probeer het opnieuw.", variant: "destructive" });
    } finally {
      setDeletingId(null);
    }
  };

  const now = new Date();
  const futurePeriods = periods.filter((p) => !isBefore(parseISO(p.end_date), now));
  const pastPeriods = periods.filter((p) => isBefore(parseISO(p.end_date), now));

  return (
    <section className="space-y-3 rounded-lg border bg-card p-4" aria-labelledby="niet-beschikbaar-kop">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 id="niet-beschikbaar-kop" className="font-medium">
            Niet beschikbaar
          </h3>
          <p className="text-xs text-muted-foreground">In deze periodes stuurt Bureau Vlieland u geen aanvragen.</p>
        </div>
        {!isAdding && (
          <Button type="button" variant="outline" size="sm" onClick={() => setIsAdding(true)}>
            <Plus className="mr-1.5 h-4 w-4" aria-hidden="true" />
            Periode toevoegen
          </Button>
        )}
      </div>

      {isAdding && (
        <div className="space-y-4 rounded-md border bg-muted/30 p-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="periode-begin">Begindatum</Label>
              <DateButton id="periode-begin" value={startDate} placeholder="Kies een datum" onSelect={setStartDate} disabled={(date) => isBefore(date, new Date())} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="periode-einde">Einddatum</Label>
              <DateButton id="periode-einde" value={endDate} placeholder="Kies een datum" onSelect={setEndDate} disabled={(date) => isBefore(date, startDate || new Date())} />
            </div>
          </div>
          <FormField label="Reden" htmlFor="periode-reden" error={error}>
            <Textarea placeholder="Bijvoorbeeld vakantie of onderhoud aan de boot." value={reason} onChange={(e) => setReason(e.target.value)} rows={2} />
          </FormField>
          <div className="flex flex-wrap gap-2">
            <Button type="button" onClick={() => void handleAddPeriod()} disabled={isSaving}>
              {isSaving && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" aria-hidden="true" />}
              Periode opslaan
            </Button>
            <Button type="button" variant="ghost" onClick={resetForm}>
              Annuleren
            </Button>
          </div>
        </div>
      )}

      {isLoading ? (
        <LoadingState label="Periodes laden" />
      ) : periods.length === 0 && !isAdding ? (
        <EmptyState icon={<CalendarOff />} title="Geen geblokkeerde periodes" description="Voeg een periode toe wanneer u niet beschikbaar bent." />
      ) : (
        <>
          {futurePeriods.length > 0 && (
            <ul className="space-y-2">
              {futurePeriods.map((period) => (
                <li key={period.id} className="flex items-center justify-between gap-3 rounded-md border p-3">
                  <div className="flex items-center gap-3">
                    <span className="flex h-8 w-8 items-center justify-center rounded-md bg-warning-soft text-warning-ink">
                      <CalendarOff className="h-4 w-4" aria-hidden="true" />
                    </span>
                    <div>
                      <p className="text-sm font-medium">{periodLabel(period)}</p>
                      {period.reason && <p className="text-xs text-muted-foreground">{period.reason}</p>}
                    </div>
                  </div>
                  <Button type="button" variant="ghost" size="icon" onClick={() => void handleDeletePeriod(period.id)} disabled={deletingId === period.id} aria-label="Periode verwijderen" className="text-destructive hover:text-destructive">
                    {deletingId === period.id ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Trash2 className="h-4 w-4" aria-hidden="true" />}
                  </Button>
                </li>
              ))}
            </ul>
          )}
          {pastPeriods.length > 0 && (
            <div className="border-t pt-3">
              <p className="mb-1 text-xs text-muted-foreground">Verlopen periodes</p>
              <ul className="space-y-1 text-sm text-muted-foreground">
                {pastPeriods.slice(0, 3).map((period) => (
                  <li key={period.id} className="flex items-center justify-between gap-2">
                    <span>{periodLabel(period)}</span>
                    {period.reason && <span className="text-xs">{period.reason}</span>}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </section>
  );
};
