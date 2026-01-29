import { useState } from "react";
import { format, addDays } from "date-fns";
import { nl } from "date-fns/locale";
import { Calendar as CalendarIcon, Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface AdminSendQuoteDialogProps {
  requestId: string;
  customerName: string;
  customerEmail: string;
  programDates: string[];
  currentValidUntil?: string | null;
  onSuccess?: () => void;
  trigger?: React.ReactNode;
}

export const AdminSendQuoteDialog = ({
  requestId,
  customerName,
  customerEmail,
  programDates,
  currentValidUntil,
  onSuccess,
  trigger,
}: AdminSendQuoteDialogProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isSending, setIsSending] = useState(false);
  
  // Default validity: 14 days from now or existing date
  const defaultValidUntil = currentValidUntil 
    ? new Date(currentValidUntil) 
    : addDays(new Date(), 14);
  
  const [validUntil, setValidUntil] = useState<Date>(defaultValidUntil);
  const [personalMessage, setPersonalMessage] = useState("");

  const handleOpen = (open: boolean) => {
    if (open) {
      // Reset form
      setValidUntil(currentValidUntil ? new Date(currentValidUntil) : addDays(new Date(), 14));
      setPersonalMessage("");
    }
    setIsOpen(open);
  };

  const handleSend = async () => {
    setIsSending(true);
    try {
      const { error } = await supabase.functions.invoke("send-quote-offer", {
        body: {
          requestId,
          validUntil: format(validUntil, "yyyy-MM-dd"),
          personalMessage: personalMessage || undefined,
          origin: window.location.origin,
        },
      });

      if (error) throw error;

      toast.success("Offerte verstuurd naar klant");
      setIsOpen(false);
      onSuccess?.();
    } catch (error) {
      console.error("Error sending quote:", error);
      toast.error("Fout bij versturen offerte");
    } finally {
      setIsSending(false);
    }
  };

  const formattedDates = programDates
    .map((d) => format(new Date(d), "d MMMM yyyy", { locale: nl }))
    .join(", ");

  return (
    <Dialog open={isOpen} onOpenChange={handleOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button>
            <Send className="h-4 w-4 mr-2" />
            Offerte versturen
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Offerte versturen</DialogTitle>
          <DialogDescription>
            Verstuur de offerte naar {customerName} ({customerEmail})
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Summary */}
          <div className="rounded-lg border bg-muted/50 p-3 space-y-1">
            <p className="text-sm">
              <span className="text-muted-foreground">Klant:</span>{" "}
              <strong>{customerName}</strong>
            </p>
            <p className="text-sm">
              <span className="text-muted-foreground">E-mail:</span>{" "}
              {customerEmail}
            </p>
            <p className="text-sm">
              <span className="text-muted-foreground">Datum(s):</span>{" "}
              {formattedDates}
            </p>
          </div>

          {/* Validity date */}
          <div className="space-y-2">
            <Label>Offerte geldig tot</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !validUntil && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {validUntil
                    ? format(validUntil, "d MMMM yyyy", { locale: nl })
                    : "Selecteer datum"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={validUntil}
                  onSelect={(date) => date && setValidUntil(date)}
                  disabled={(date) => date < new Date()}
                  initialFocus
                  className="pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
            <p className="text-xs text-muted-foreground">
              Na deze datum kan de klant niet meer akkoord geven.
            </p>
          </div>

          {/* Personal message */}
          <div className="space-y-2">
            <Label htmlFor="personal-message">
              Persoonlijke tekst (optioneel)
            </Label>
            <Textarea
              id="personal-message"
              placeholder={`Beste ${customerName},\n\nHierbij ons maatwerkvoorstel voor uw evenement op Vlieland...`}
              value={personalMessage}
              onChange={(e) => setPersonalMessage(e.target.value)}
              rows={4}
            />
            <p className="text-xs text-muted-foreground">
              Deze tekst wordt toegevoegd aan de e-mail naar de klant.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setIsOpen(false)}
            disabled={isSending}
          >
            Annuleren
          </Button>
          <Button onClick={handleSend} disabled={isSending}>
            {isSending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Versturen...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Offerte versturen
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
