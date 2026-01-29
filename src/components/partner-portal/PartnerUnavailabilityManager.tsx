import { useState, useEffect } from "react";
import { format, parseISO, isBefore } from "date-fns";
import { nl } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { 
  CalendarOff, 
  CalendarIcon, 
  Plus, 
  Trash2, 
  Loader2,
} from "lucide-react";

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

export const PartnerUnavailabilityManager = ({ partnerId }: PartnerUnavailabilityManagerProps) => {
  const [periods, setPeriods] = useState<UnavailabilityPeriod[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Form state
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();
  const [reason, setReason] = useState("");

  const fetchPeriods = async () => {
    try {
      const { data, error } = await supabase
        .from("partner_unavailability")
        .select("*")
        .eq("partner_id", partnerId)
        .order("start_date", { ascending: true });

      if (error) throw error;
      setPeriods(data || []);
    } catch (err) {
      console.error("Error fetching unavailability:", err);
      toast.error("Kon beschikbaarheid niet laden");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (partnerId) {
      fetchPeriods();
    }
  }, [partnerId]);

  const handleAddPeriod = async () => {
    if (!startDate || !endDate) {
      toast.error("Selecteer een begin- en einddatum");
      return;
    }

    if (isBefore(endDate, startDate)) {
      toast.error("Einddatum moet na begindatum liggen");
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase.from("partner_unavailability").insert({
        partner_id: partnerId,
        start_date: format(startDate, "yyyy-MM-dd"),
        end_date: format(endDate, "yyyy-MM-dd"),
        reason: reason.trim() || null,
      });

      if (error) throw error;

      toast.success("Periode toegevoegd");
      setIsAdding(false);
      setStartDate(undefined);
      setEndDate(undefined);
      setReason("");
      await fetchPeriods();
    } catch (err) {
      console.error("Error adding period:", err);
      toast.error("Kon periode niet toevoegen");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeletePeriod = async (id: string) => {
    setDeletingId(id);
    try {
      const { error } = await supabase
        .from("partner_unavailability")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast.success("Periode verwijderd");
      await fetchPeriods();
    } catch (err) {
      console.error("Error deleting period:", err);
      toast.error("Kon periode niet verwijderen");
    } finally {
      setDeletingId(null);
    }
  };

  const now = new Date();
  const futurePeriods = periods.filter((p) => !isBefore(parseISO(p.end_date), now));
  const pastPeriods = periods.filter((p) => isBefore(parseISO(p.end_date), now));

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <Skeleton className="h-5 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <CalendarOff className="h-5 w-5 text-muted-foreground" />
            Niet beschikbaar
          </CardTitle>
          {!isAdding && (
            <Button variant="outline" size="sm" onClick={() => setIsAdding(true)}>
              <Plus className="h-4 w-4 mr-1" />
              Periode toevoegen
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {/* Add form */}
        {isAdding && (
          <div className="border rounded-lg p-4 mb-4 bg-muted/30">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Begindatum</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !startDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {startDate ? format(startDate, "d MMMM yyyy", { locale: nl }) : "Kies datum"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={startDate}
                      onSelect={setStartDate}
                      disabled={(date) => isBefore(date, new Date())}
                      initialFocus
                      className="p-3 pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-2">
                <Label>Einddatum</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !endDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {endDate ? format(endDate, "d MMMM yyyy", { locale: nl }) : "Kies datum"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={endDate}
                      onSelect={setEndDate}
                      disabled={(date) => isBefore(date, startDate || new Date())}
                      initialFocus
                      className="p-3 pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
            <div className="mt-4 space-y-2">
              <Label>Reden (optioneel)</Label>
              <Textarea
                placeholder="Bijv. Vakantie, onderhoud boot, etc."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={2}
              />
            </div>
            <div className="flex gap-2 mt-4">
              <Button onClick={handleAddPeriod} disabled={isSaving || !startDate || !endDate}>
                {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Opslaan
              </Button>
              <Button
                variant="ghost"
                onClick={() => {
                  setIsAdding(false);
                  setStartDate(undefined);
                  setEndDate(undefined);
                  setReason("");
                }}
              >
                Annuleren
              </Button>
            </div>
          </div>
        )}

        {/* List of periods */}
        {periods.length === 0 && !isAdding ? (
          <div className="text-center py-6 text-muted-foreground">
            <CalendarOff className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Geen geblokkeerde periodes</p>
            <p className="text-xs mt-1">Voeg een periode toe wanneer je niet beschikbaar bent</p>
          </div>
        ) : (
          <div className="space-y-2">
            {futurePeriods.map((period) => (
              <div
                key={period.id}
                className="flex items-center justify-between p-3 border rounded-lg bg-card"
              >
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-lg bg-amber-100 dark:bg-amber-950/50 flex items-center justify-center">
                    <CalendarOff className="h-4 w-4 text-amber-600" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">
                      {format(parseISO(period.start_date), "d MMM", { locale: nl })} -{" "}
                      {format(parseISO(period.end_date), "d MMM yyyy", { locale: nl })}
                    </p>
                    {period.reason && (
                      <p className="text-xs text-muted-foreground">{period.reason}</p>
                    )}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDeletePeriod(period.id)}
                  disabled={deletingId === period.id}
                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                >
                  {deletingId === period.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                </Button>
              </div>
            ))}

            {/* Past periods (collapsed) */}
            {pastPeriods.length > 0 && (
              <div className="pt-2 border-t mt-4">
                <p className="text-xs text-muted-foreground mb-2">Verlopen periodes</p>
                {pastPeriods.slice(0, 3).map((period) => (
                  <div
                    key={period.id}
                    className="flex items-center justify-between p-2 rounded text-sm text-muted-foreground"
                  >
                    <span>
                      {format(parseISO(period.start_date), "d MMM", { locale: nl })} -{" "}
                      {format(parseISO(period.end_date), "d MMM yyyy", { locale: nl })}
                    </span>
                    {period.reason && <span className="text-xs">{period.reason}</span>}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
