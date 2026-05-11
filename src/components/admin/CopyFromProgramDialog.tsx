import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { logAdminActivity, EntityTypes } from "@/lib/adminLogger";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Clock, Users, Check, Layers, Search, Star } from "lucide-react";

interface CopyFromProgramDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  requestId: string;
  durationDays: number;
  numberOfPeople: number;
  programType: string;
  onSuccess: () => void;
}

interface ProgramCandidate {
  id: string;
  reference_number: string | null;
  customer_name: string;
  customer_company: string | null;
  number_of_people: number;
  selected_dates: string[];
  origin: string | null;
  program_description: string | null;
  created_at: string;
  item_count: number;
  duration_days: number;
  score: number;
}

export const CopyFromProgramDialog = ({
  open,
  onOpenChange,
  requestId,
  durationDays,
  numberOfPeople,
  programType,
  onSuccess,
}: CopyFromProgramDialogProps) => {
  const [selectedProgramId, setSelectedProgramId] = useState<string | null>(null);
  const [isApplying, setIsApplying] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Fetch all programs with their item counts
  const { data: programs, isLoading: programsLoading } = useQuery({
    queryKey: ["copy-program-candidates", requestId],
    queryFn: async () => {
      // Fetch programs that are not cancelled and not the current one
      const { data: requests, error } = await supabase
        .from("program_requests")
        .select("id, reference_number, customer_name, customer_company, number_of_people, selected_dates, origin, program_description, created_at")
        .neq("id", requestId)
        .neq("status", "cancelled")
        .order("created_at", { ascending: false })
        .limit(200);

      if (error) throw error;

      // Fetch item counts per request
      const requestIds = requests?.map((r) => r.id) || [];
      if (requestIds.length === 0) return [];

      const { data: itemCounts, error: countError } = await supabase
        .from("program_request_items")
        .select("request_id")
        .in("request_id", requestIds);

      if (countError) throw countError;

      // Count items per request
      const countMap = new Map<string, number>();
      itemCounts?.forEach((item) => {
        countMap.set(item.request_id, (countMap.get(item.request_id) || 0) + 1);
      });

      // Build candidates with scores, only those with items
      return requests
        ?.map((r) => {
          const dates = (r.selected_dates as string[]) || [];
          const duration = dates.length > 1
            ? Math.ceil(
                (new Date(dates[dates.length - 1]).getTime() - new Date(dates[0]).getTime()) /
                  (1000 * 60 * 60 * 24)
              ) + 1
            : dates.length;
          const count = countMap.get(r.id) || 0;
          if (count === 0) return null;

          let score = 0;
          if (duration === durationDays) score += 2;
          if (numberOfPeople > 0 && Math.abs(r.number_of_people - numberOfPeople) / numberOfPeople <= 0.3) score += 1;
          if (r.origin === programType) score += 1;

          return {
            ...r,
            selected_dates: dates,
            item_count: count,
            duration_days: duration,
            score,
          } as ProgramCandidate;
        })
        .filter((r): r is ProgramCandidate => r !== null)
        .sort((a, b) => b.score - a.score || b.item_count - a.item_count)
        .slice(0, 30);
    },
    enabled: open,
  });

  // Filter by search
  const filteredPrograms = useMemo(() => {
    if (!programs) return [];
    if (!searchQuery.trim()) return programs;
    const q = searchQuery.toLowerCase();
    return programs.filter(
      (p) =>
        p.customer_name.toLowerCase().includes(q) ||
        p.reference_number?.toLowerCase().includes(q) ||
        p.customer_company?.toLowerCase().includes(q) ||
        p.program_description?.toLowerCase().includes(q)
    );
  }, [programs, searchQuery]);

  // Fetch items for selected program
  const { data: selectedItems, isLoading: itemsLoading } = useQuery({
    queryKey: ["copy-program-items", selectedProgramId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("program_request_items")
        .select("id, block_id, block_name, block_category, block_type, provider_id, provider_name, provider_email, day_index, preferred_time, admin_price_override, admin_price_notes, price_type, duration")
        .eq("request_id", selectedProgramId!)
        .order("day_index")
        .order("preferred_time", { ascending: true, nullsFirst: false });

      if (error) throw error;
      return data;
    },
    enabled: !!selectedProgramId,
  });

  const handleApply = async () => {
    if (!selectedItems?.length) return;
    setIsApplying(true);

    try {
      const rowsToInsert = selectedItems.map((item) => ({
        request_id: requestId,
        block_id: item.block_id,
        block_name: item.block_name,
        block_category: item.block_category,
        block_type: item.block_type,
        provider_id: item.provider_id,
        provider_name: item.provider_name,
        provider_email: item.provider_email,
        day_index: item.day_index,
        preferred_time: item.preferred_time,
        status: "pending",
        item_quote_status: "concept",
        skip_partner_notification: true,
        admin_price_override: item.admin_price_override,
        price_type: item.price_type,
        duration: item.duration,
        admin_price_notes: item.admin_price_notes,
      }));

      const { error: insertError } = await supabase
        .from("program_request_items")
        .insert(rowsToInsert as any);

      if (insertError) throw insertError;

      const selectedProgram = programs?.find((p) => p.id === selectedProgramId);
      await logAdminActivity({
        action: "program_copied",
        entityType: EntityTypes.REQUEST,
        entityId: requestId,
        details: {
          source_program_id: selectedProgramId,
          source_reference: selectedProgram?.reference_number,
          items_copied: rowsToInsert.length,
        },
      });

      toast.success(`${rowsToInsert.length} activiteiten gekopieerd vanuit ${selectedProgram?.reference_number || "programma"}`);
      onOpenChange(false);
      setSelectedProgramId(null);
      setSearchQuery("");
      onSuccess();
    } catch (error) {
      console.error("Error copying program:", error);
      toast.error("Fout bij kopiëren programma");
    } finally {
      setIsApplying(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Kopieer vanuit eerder programma</DialogTitle>
          <DialogDescription>
            Selecteer een eerder programma om de activiteiten over te nemen. Programma's zijn gesorteerd op relevantie.
          </DialogDescription>
        </DialogHeader>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Zoek op klantnaam, referentie..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        <ScrollArea className="flex-1 min-h-0 max-h-[50vh]">
          <div className="space-y-2 pr-4">
            {programsLoading ? (
              Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20" />)
            ) : !filteredPrograms.length ? (
              <p className="text-sm text-muted-foreground py-8 text-center">
                {searchQuery ? "Geen programma's gevonden." : "Geen eerdere programma's met activiteiten beschikbaar."}
              </p>
            ) : (
              filteredPrograms.map((prog) => (
                <button
                  key={prog.id}
                  onClick={() => setSelectedProgramId(prog.id)}
                  className={`w-full text-left border rounded-lg p-4 transition-colors hover:bg-accent/50 ${
                    selectedProgramId === prog.id
                      ? "border-primary bg-primary/5 ring-1 ring-primary"
                      : "border-border"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{prog.customer_name}</span>
                      {prog.customer_company && (
                        <span className="text-sm text-muted-foreground">({prog.customer_company})</span>
                      )}
                      {prog.score >= 3 && (
                        <Badge variant="secondary" className="text-xs gap-1">
                          <Star className="h-3 w-3" />
                          Aanbevolen
                        </Badge>
                      )}
                    </div>
                    {selectedProgramId === prog.id && (
                      <Check className="h-4 w-4 text-primary" />
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground flex-wrap">
                    {prog.reference_number && (
                      <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">
                        {prog.reference_number}
                      </code>
                    )}
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {prog.duration_days} {prog.duration_days === 1 ? "dag" : "dagen"}
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      {prog.number_of_people} personen
                    </span>
                    <span className="flex items-center gap-1">
                      <Layers className="h-3 w-3" />
                      {prog.item_count} activiteiten
                    </span>
                  </div>
                  {prog.program_description && (
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-1">
                      {prog.program_description}
                    </p>
                  )}
                </button>
              ))
            )}
          </div>

          {/* Preview of selected program */}
          {selectedProgramId && (
            <>
              <Separator className="my-4" />
              {itemsLoading ? (
                <Skeleton className="h-32" />
              ) : selectedItems?.length ? (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium flex items-center gap-2">
                    <Layers className="h-4 w-4" />
                    Activiteiten ({selectedItems.length})
                  </h4>
                  {Array.from(new Set(selectedItems.map((i) => i.day_index)))
                    .sort((a, b) => a - b)
                    .map((dayIdx) => (
                      <div key={dayIdx} className="space-y-1">
                        <p className="text-xs font-semibold text-muted-foreground">
                          Dag {dayIdx + 1}
                        </p>
                        {selectedItems
                          .filter((i) => i.day_index === dayIdx)
                          .map((item) => (
                            <div
                              key={item.id}
                              className="flex items-center justify-between text-sm pl-3 py-1 border-l-2 border-primary/30"
                            >
                              <div>
                                <span>{item.block_name}</span>
                                <span className="text-muted-foreground ml-2 text-xs">
                                  ({item.provider_name})
                                </span>
                              </div>
                              {item.preferred_time && (
                                <Badge variant="outline" className="text-xs">
                                  {item.preferred_time}
                                </Badge>
                              )}
                            </div>
                          ))}
                      </div>
                    ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Geen activiteiten gevonden.
                </p>
              )}
            </>
          )}
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuleren
          </Button>
          <Button
            onClick={handleApply}
            disabled={!selectedItems?.length || isApplying}
          >
            {isApplying ? "Kopiëren..." : "Toepassen"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
