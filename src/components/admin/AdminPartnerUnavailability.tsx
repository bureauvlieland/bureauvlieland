import { useState, useEffect } from "react";
import { format, isPast, isFuture, isToday, isWithinInterval } from "date-fns";
import { nl } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { CalendarOff, AlertTriangle, CheckCircle2, Plus, Trash2, Edit } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { logAdminActivity, AdminActions, EntityTypes } from "@/lib/adminLogger";
import { checkConflictsForNewUnavailability } from "@/lib/conflictChecker";

interface UnavailabilityPeriod {
  id: string;
  partner_id: string;
  start_date: string;
  end_date: string;
  reason: string | null;
  created_at: string;
}

interface AdminPartnerUnavailabilityProps {
  partnerId: string;
}

export function AdminPartnerUnavailability({ partnerId }: AdminPartnerUnavailabilityProps) {
  const [periods, setPeriods] = useState<UnavailabilityPeriod[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPeriod, setEditingPeriod] = useState<UnavailabilityPeriod | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [periodToDelete, setPeriodToDelete] = useState<UnavailabilityPeriod | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    start_date: "",
    end_date: "",
    reason: "",
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchUnavailability();
  }, [partnerId]);

  const fetchUnavailability = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("partner_unavailability")
        .select("*")
        .eq("partner_id", partnerId)
        .order("start_date", { ascending: true });

      if (error) throw error;
      setPeriods(data || []);
    } catch (error) {
      console.error("Error fetching unavailability:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const getPeriodStatus = (startDate: string, endDate: string) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const today = new Date();

    if (isWithinInterval(today, { start, end }) || isToday(start) || isToday(end)) {
      return "active";
    }
    if (isFuture(start)) {
      return "upcoming";
    }
    return "past";
  };

  // Filter out past periods for display, only show active and upcoming
  const relevantPeriods = periods.filter((period) => {
    const status = getPeriodStatus(period.start_date, period.end_date);
    return status === "active" || status === "upcoming";
  });

  const resetForm = () => {
    setFormData({ start_date: "", end_date: "", reason: "" });
    setEditingPeriod(null);
  };

  const openCreateDialog = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  const openEditDialog = (period: UnavailabilityPeriod) => {
    setEditingPeriod(period);
    setFormData({
      start_date: period.start_date,
      end_date: period.end_date,
      reason: period.reason || "",
    });
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.start_date || !formData.end_date) {
      toast({
        title: "Vul alle velden in",
        description: "Start- en einddatum zijn verplicht",
        variant: "destructive",
      });
      return;
    }

    if (new Date(formData.end_date) < new Date(formData.start_date)) {
      toast({
        title: "Ongeldige datums",
        description: "Einddatum moet na startdatum liggen",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      if (editingPeriod) {
        // Update existing
        const { error } = await supabase
          .from("partner_unavailability")
          .update({
            start_date: formData.start_date,
            end_date: formData.end_date,
            reason: formData.reason || null,
          })
          .eq("id", editingPeriod.id);

        if (error) throw error;

        await logAdminActivity({
          action: "unavailability_updated",
          entityType: EntityTypes.PARTNER,
          entityId: partnerId,
          details: {
            period_id: editingPeriod.id,
            start_date: formData.start_date,
            end_date: formData.end_date,
          },
        });

        toast({ title: "Periode bijgewerkt" });
      } else {
        // Create new
        const { error } = await supabase
          .from("partner_unavailability")
          .insert({
            partner_id: partnerId,
            start_date: formData.start_date,
            end_date: formData.end_date,
            reason: formData.reason || null,
          });

        if (error) throw error;

        await logAdminActivity({
          action: "unavailability_created",
          entityType: EntityTypes.PARTNER,
          entityId: partnerId,
          details: {
            start_date: formData.start_date,
            end_date: formData.end_date,
          },
        });

        // Check for conflicts and create auto-todos if needed
        await checkConflictsForNewUnavailability(partnerId, formData.start_date, formData.end_date);

        toast({ title: "Periode toegevoegd" });
      }

      setIsDialogOpen(false);
      resetForm();
      fetchUnavailability();
    } catch (error) {
      console.error("Error saving unavailability:", error);
      toast({
        title: "Fout bij opslaan",
        description: "Kon periode niet opslaan",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!periodToDelete) return;

    try {
      const { error } = await supabase
        .from("partner_unavailability")
        .delete()
        .eq("id", periodToDelete.id);

      if (error) throw error;

      await logAdminActivity({
        action: "unavailability_deleted",
        entityType: EntityTypes.PARTNER,
        entityId: partnerId,
        details: {
          period_id: periodToDelete.id,
          start_date: periodToDelete.start_date,
          end_date: periodToDelete.end_date,
        },
      });

      toast({ title: "Periode verwijderd" });
      setDeleteDialogOpen(false);
      setPeriodToDelete(null);
      fetchUnavailability();
    } catch (error) {
      console.error("Error deleting unavailability:", error);
      toast({
        title: "Fout bij verwijderen",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarOff className="h-5 w-5" />
            Niet beschikbaar periodes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-16 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <CalendarOff className="h-5 w-5" />
              Niet beschikbaar periodes
            </CardTitle>
            <CardDescription>
              Periodes waarin deze partner niet inzetbaar is
            </CardDescription>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            if (!open) resetForm();
            setIsDialogOpen(open);
          }}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline" onClick={openCreateDialog}>
                <Plus className="h-4 w-4 mr-1" />
                Toevoegen
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingPeriod ? "Periode bewerken" : "Nieuwe periode"}
                </DialogTitle>
                <DialogDescription>
                  Voeg een periode toe waarin de partner niet beschikbaar is
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="start_date">Startdatum</Label>
                    <Input
                      id="start_date"
                      type="date"
                      value={formData.start_date}
                      onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="end_date">Einddatum</Label>
                    <Input
                      id="end_date"
                      type="date"
                      value={formData.end_date}
                      onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reason">Reden (optioneel)</Label>
                  <Textarea
                    id="reason"
                    placeholder="Bijv. vakantie, onderhoud, etc."
                    value={formData.reason}
                    onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Annuleren
                </Button>
                <Button onClick={handleSave} disabled={isSaving}>
                  {isSaving ? "Opslaan..." : "Opslaan"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {relevantPeriods.length === 0 ? (
          <div className="flex items-center gap-2 text-slate-500 py-2">
            <CheckCircle2 className="h-4 w-4 text-green-500" />
            <span>Geen geblokkeerde periodes</span>
          </div>
        ) : (
          <div className="space-y-3">
            {relevantPeriods.map((period) => {
              const status = getPeriodStatus(period.start_date, period.end_date);
              const isActive = status === "active";

              return (
                <div
                  key={period.id}
                  className={`flex items-start justify-between gap-3 p-3 rounded-lg border ${
                    isActive
                      ? "bg-amber-50 border-amber-200"
                      : "bg-slate-50 border-slate-200"
                  }`}
                >
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    {isActive && (
                      <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm">
                          {format(new Date(period.start_date), "EEE d MMM", { locale: nl })}
                          {" – "}
                          {format(new Date(period.end_date), "EEE d MMM yyyy", { locale: nl })}
                        </span>
                        <Badge
                          variant={isActive ? "destructive" : "secondary"}
                          className="text-xs"
                        >
                          {isActive ? "Nu actief" : "Gepland"}
                        </Badge>
                      </div>
                      {period.reason && (
                        <p className="text-sm text-slate-600 mt-1">
                          {period.reason}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => openEditDialog(period)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => {
                        setPeriodToDelete(period);
                        setDeleteDialogOpen(true);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {periods.length > relevantPeriods.length && (
          <p className="text-xs text-slate-400 mt-3">
            + {periods.length - relevantPeriods.length} verlopen periode(s) niet getoond
          </p>
        )}
      </CardContent>

      {/* Delete confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Periode verwijderen?</AlertDialogTitle>
            <AlertDialogDescription>
              Weet je zeker dat je deze blokkering wilt verwijderen?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuleren</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Verwijderen</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
