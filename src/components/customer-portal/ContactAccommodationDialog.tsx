import { useState } from "react";
import { Mail, Send, CheckCircle2, Info } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface ContactAccommodationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accommodationName: string;
  quoteId: string;
  customerToken: string;
  isBureauCentral?: boolean;
}

export const ContactAccommodationDialog = ({
  open,
  onOpenChange,
  accommodationName,
  quoteId,
  customerToken,
  isBureauCentral = false,
}: ContactAccommodationDialogProps) => {
  const [subject, setSubject] = useState(
    `Vraag over mijn verblijf - ${accommodationName}`
  );
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isSent, setIsSent] = useState(false);

  const handleSend = async () => {
    if (!subject.trim() || !message.trim()) {
      toast({
        title: "Vul alle velden in",
        description: "Onderwerp en bericht zijn verplicht.",
        variant: "destructive",
      });
      return;
    }

    setIsSending(true);
    try {
      const { data, error } = await supabase.functions.invoke(
        "send-customer-accommodation-message",
        {
          body: { customerToken, quoteId, subject: subject.trim(), message: message.trim() },
        }
      );

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setIsSent(true);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Onbekende fout";
      toast({
        title: "Versturen mislukt",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    setTimeout(() => {
      if (isSent) {
        setIsSent(false);
        setMessage("");
        setSubject(`Vraag over mijn verblijf - ${accommodationName}`);
      }
    }, 300);
  };

  if (isSent) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md">
          <div className="flex flex-col items-center text-center py-4 space-y-3">
            <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle2 className="h-6 w-6 text-green-600" />
            </div>
            <DialogTitle>Bericht verstuurd</DialogTitle>
            <DialogDescription>
              {isBureauCentral
                ? "Uw bericht is verzonden naar Bureau Vlieland. Zij nemen contact op met de accommodatie en koppelen het antwoord aan u terug."
                : `Uw bericht is verzonden naar ${accommodationName}. Zij zullen rechtstreeks per e-mail reageren.`}
            </DialogDescription>
            <Button onClick={handleClose} className="mt-2">Sluiten</Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            {isBureauCentral
              ? "Bericht via Bureau Vlieland"
              : `Contact opnemen met ${accommodationName}`}
          </DialogTitle>
          <DialogDescription>
            {isBureauCentral
              ? "Uw bericht wordt via Bureau Vlieland doorgestuurd naar de accommodatie. Bureau Vlieland fungeert als tussenpersoon voor alle communicatie."
              : "Stuur een bericht naar de accommodatie, bijvoorbeeld over wijzigingen in uw reservering. Zij antwoorden rechtstreeks per e-mail."}
          </DialogDescription>
        </DialogHeader>

        {isBureauCentral && (
          <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
            <Info className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <span>Alle communicatie met de accommodatie verloopt via Bureau Vlieland. Uw contactgegevens worden niet gedeeld met de accommodatie.</span>
          </div>
        )}

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="contact-subject">Onderwerp</Label>
            <Input
              id="contact-subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              maxLength={200}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="contact-message">Uw bericht</Label>
            <Textarea
              id="contact-message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Typ hier uw bericht..."
              rows={5}
              maxLength={5000}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isSending}>
            Annuleren
          </Button>
          <Button onClick={handleSend} disabled={isSending || !message.trim()}>
            {isSending ? "Versturen..." : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Versturen
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};