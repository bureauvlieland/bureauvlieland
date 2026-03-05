import { useState } from "react";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CalendarIcon, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { ACCOMMODATION_TYPES } from "@/types/accommodation";

interface AdminCreateAccommodationSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project: {
    id: string;
    customer_name: string;
    customer_email: string;
    customer_phone: string;
    customer_company: string | null;
    number_of_people: number;
    selected_dates: string[];
  };
  onCreated: () => void;
}

export const AdminCreateAccommodationSheet = ({
  open,
  onOpenChange,
  project,
  onCreated,
}: AdminCreateAccommodationSheetProps) => {
  const sortedDates = [...project.selected_dates].sort();
  const defaultArrival = sortedDates[0] ? new Date(sortedDates[0]) : undefined;
  const defaultDeparture = sortedDates.length > 1 ? new Date(sortedDates[sortedDates.length - 1]) : undefined;

  const [arrivalDate, setArrivalDate] = useState<Date | undefined>(defaultArrival);
  const [departureDate, setDepartureDate] = useState<Date | undefined>(defaultDeparture);
  const [numberOfGuests, setNumberOfGuests] = useState(project.number_of_people);
  const [accommodationType, setAccommodationType] = useState("no_preference");
  const [specialRequests, setSpecialRequests] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!arrivalDate || !departureDate) {
      toast.error("Vul aankomst- en vertrekdatum in");
      return;
    }

    setIsSubmitting(true);
    try {
      // Insert accommodation request linked to this project
      const { data: accRequest, error: insertError } = await supabase
        .from("accommodation_requests")
        .insert({
          customer_name: project.customer_name,
          customer_email: project.customer_email,
          customer_phone: project.customer_phone,
          customer_company: project.customer_company,
          arrival_date: format(arrivalDate, "yyyy-MM-dd"),
          departure_date: format(departureDate, "yyyy-MM-dd"),
          number_of_guests: numberOfGuests,
          accommodation_type: accommodationType,
          special_requests: specialRequests || null,
          linked_program_id: project.id,
          status: "submitted",
        })
        .select("id")
        .single();

      if (insertError) throw insertError;

      // Link back: update program_requests.linked_accommodation_id
      const { error: updateError } = await supabase
        .from("program_requests")
        .update({ linked_accommodation_id: accRequest.id })
        .eq("id", project.id);

      if (updateError) {
        console.error("Failed to link accommodation back to project:", updateError);
      }

      toast.success("Logiesaanvraag aangemaakt");
      onOpenChange(false);
      onCreated();
    } catch (err: any) {
      console.error(err);
      toast.error("Kon logiesaanvraag niet aanmaken: " + (err.message || "Onbekende fout"));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Logiesaanvraag maken</SheetTitle>
          <SheetDescription>
            Aanvraag wordt aangemaakt namens Bureau Vlieland, gekoppeld aan dit project.
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-5 py-4">
          {/* Customer info (read-only) */}
          <div className="rounded-md bg-muted/50 p-3 space-y-1 text-sm">
            <p className="font-medium">Klantgegevens (uit project)</p>
            <p>{project.customer_name}</p>
            <p className="text-muted-foreground">{project.customer_email} · {project.customer_phone}</p>
            {project.customer_company && (
              <p className="text-muted-foreground">{project.customer_company}</p>
            )}
          </div>

          {/* Arrival date */}
          <div className="space-y-2">
            <Label>Aankomstdatum</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !arrivalDate && "text-muted-foreground")}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {arrivalDate ? format(arrivalDate, "d MMMM yyyy", { locale: nl }) : "Selecteer datum"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={arrivalDate} onSelect={setArrivalDate} initialFocus />
              </PopoverContent>
            </Popover>
          </div>

          {/* Departure date */}
          <div className="space-y-2">
            <Label>Vertrekdatum</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !departureDate && "text-muted-foreground")}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {departureDate ? format(departureDate, "d MMMM yyyy", { locale: nl }) : "Selecteer datum"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={departureDate} onSelect={setDepartureDate} initialFocus />
              </PopoverContent>
            </Popover>
          </div>

          {/* Number of guests */}
          <div className="space-y-2">
            <Label>Aantal gasten</Label>
            <Input
              type="number"
              min={1}
              value={numberOfGuests}
              onChange={(e) => setNumberOfGuests(parseInt(e.target.value) || 1)}
            />
          </div>

          {/* Accommodation type */}
          <div className="space-y-2">
            <Label>Type accommodatie</Label>
            <Select value={accommodationType} onValueChange={setAccommodationType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ACCOMMODATION_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.icon} {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Special requests */}
          <div className="space-y-2">
            <Label>Bijzondere wensen</Label>
            <Textarea
              value={specialRequests}
              onChange={(e) => setSpecialRequests(e.target.value)}
              placeholder="Eventuele wensen voor de accommodatie..."
              rows={3}
            />
          </div>
        </div>

        <SheetFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Annuleren
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Aanvraag aanmaken
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
};
