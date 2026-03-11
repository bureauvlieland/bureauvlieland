import { useState, useEffect } from "react";
import { format, addDays } from "date-fns";
import { nl } from "date-fns/locale";
import { Calendar as CalendarIcon, Send, Loader2, Eye, Edit2, Mail } from "lucide-react";
import DOMPurify from "dompurify";
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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Separator } from "@/components/ui/separator";
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
  customerCompany?: string | null;
  numberOfPeople?: number;
  programDates: string[];
  currentValidUntil?: string | null;
  portalUrl?: string;
  onSuccess?: () => void;
  trigger?: React.ReactNode;
}

export const AdminSendQuoteDialog = ({
  requestId,
  customerName,
  customerEmail,
  customerCompany,
  numberOfPeople,
  programDates,
  currentValidUntil,
  portalUrl,
  onSuccess,
  trigger,
}: AdminSendQuoteDialogProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [isLoadingTemplate, setIsLoadingTemplate] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const defaultValidUntil = currentValidUntil
    ? new Date(currentValidUntil)
    : addDays(new Date(), 14);

  const [validUntil, setValidUntil] = useState<Date>(defaultValidUntil);
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");

  const formattedDates = programDates
    .map((d) => format(new Date(d), "EEE d MMMM yyyy", { locale: nl }))
    .join(", ");

  const getDefaultIntro = () => {
    const validUntilFormatted = format(validUntil, "d MMMM yyyy", { locale: nl });
    const companyName = customerCompany || "u";
    
    // Default plain text intro that will be wrapped in HTML by the edge function
    return `Beste ${customerName},

Hierbij ontvangt u ons maatwerkvoorstel voor uw evenement op Vlieland. Wij hebben dit programma speciaal voor ${companyName} samengesteld.

Programmadetails:
- Data: ${formattedDates}
- Aantal personen: ${numberOfPeople || ""}
- Geldig tot: ${validUntilFormatted}

U kunt het voorstel bekijken en akkoord geven via de knop in de e-mail. Uiteraard kunnen we het programma qua onderdelen en tijden nog aanpassen.

Heeft u vragen? Neem contact op via hallo@bureauvlieland.nl of 0562 700 208.

Met vriendelijke groet,
Erwin Soolsma
Bureau Vlieland`;
  };

  const loadTemplate = () => {
    // No longer fetching from DB to avoid double HTML wrapping
    // The edge function now handles the HTML structure
    setEmailSubject("Uw maatwerkvoorstel van Bureau Vlieland");
    setEmailBody(getDefaultIntro());
  };

  const handleOpen = (open: boolean) => {
    if (open) {
      setValidUntil(currentValidUntil ? new Date(currentValidUntil) : addDays(new Date(), 14));
      setIsEditing(false);
      loadTemplate();
    }
    setIsOpen(open);
  };

  // Re-render template when validUntil changes (only in preview mode)
  useEffect(() => {
    if (isOpen && !isEditing && emailBody) {
      // Don't reload from DB, just re-render with new date
      loadTemplate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [validUntil]);

  const handleSend = async () => {
    setIsSending(true);
    try {
      const { error } = await supabase.functions.invoke("send-quote-offer", {
        body: {
          requestId,
          validUntil: format(validUntil, "yyyy-MM-dd"),
          emailSubject,
          emailBody,
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

  const handleSendTest = async () => {
    setIsSendingTest(true);
    try {
      const { error } = await supabase.functions.invoke("send-quote-offer", {
        body: {
          requestId,
          validUntil: format(validUntil, "yyyy-MM-dd"),
          emailSubject,
          emailBody,
          origin: window.location.origin,
          testRecipient: "erwin@bureauvlieland.nl",
        },
      });

      if (error) throw error;

      toast.success("Testmail verstuurd naar erwin@bureauvlieland.nl");
    } catch (error) {
      console.error("Error sending test quote:", error);
      toast.error("Fout bij versturen testmail");
    } finally {
      setIsSendingTest(false);
    }
  };

  const formatPreviewBody = (text: string) => {
    return text
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
      .replace(/\n/g, "<br>");
  };

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
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Offerte versturen</DialogTitle>
          <DialogDescription>
            Bekijk en pas de e-mail aan voordat deze naar de klant wordt verstuurd
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Recipient info */}
          <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
            <Mail className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">{customerName}</span>
            <span className="text-sm text-muted-foreground">({customerEmail})</span>
          </div>

          {/* Summary */}
          <div className="rounded-lg border bg-muted/50 p-3 space-y-1">
            <p className="text-sm">
              <span className="text-muted-foreground">Datum(s):</span>{" "}
              {formattedDates}
            </p>
            {numberOfPeople && (
              <p className="text-sm">
                <span className="text-muted-foreground">Aantal personen:</span>{" "}
                {numberOfPeople}
              </p>
            )}
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

          <Separator />

          {/* Email Content */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">E-mail inhoud</Label>
              <Button variant="ghost" size="sm" onClick={() => setIsEditing(!isEditing)}>
                {isEditing ? (
                  <>
                    <Eye className="h-4 w-4 mr-1" />
                    Preview
                  </>
                ) : (
                  <>
                    <Edit2 className="h-4 w-4 mr-1" />
                    Bewerken
                  </>
                )}
              </Button>
            </div>

            {isLoadingTemplate ? (
              <div className="flex items-center justify-center py-8 text-muted-foreground">
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Template laden...
              </div>
            ) : isEditing ? (
              <div className="space-y-3">
                <div>
                  <Label htmlFor="quote-subject" className="text-xs text-muted-foreground">
                    Onderwerp
                  </Label>
                  <Input
                    id="quote-subject"
                    value={emailSubject}
                    onChange={(e) => setEmailSubject(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="quote-body" className="text-xs text-muted-foreground">
                    Begeleidende tekst
                  </Label>
                  <Textarea
                    id="quote-body"
                    value={emailBody}
                    onChange={(e) => setEmailBody(e.target.value)}
                    className="mt-1 min-h-[200px] font-mono text-sm"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Deze tekst wordt als persoonlijk bericht in de e-mailtemplate geplaatst.
                  </p>
                </div>
              </div>
            ) : (
              <div className="border rounded-lg overflow-hidden">
                <div className="bg-muted px-4 py-2 border-b">
                  <p className="text-sm font-medium">{emailSubject}</p>
                </div>
                <div
                  className="p-4 text-sm bg-background prose prose-sm max-w-none"
                  dangerouslySetInnerHTML={{
                    __html: DOMPurify.sanitize(formatPreviewBody(emailBody), {
                      ALLOWED_TAGS: ["strong", "br"],
                      ALLOWED_ATTR: [],
                    }),
                  }}
                />
                <div className="bg-muted/50 px-4 py-2 border-t text-xs text-muted-foreground italic">
                  De volledige e-mail wordt opgemaakt vanuit de database-template
                </div>
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <div className="flex w-full justify-between sm:justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setIsOpen(false)}
              disabled={isSending || isSendingTest}
            >
              Annuleren
            </Button>
            <div className="flex gap-2">
              <Button 
                variant="secondary" 
                onClick={handleSendTest} 
                disabled={isSending || isSendingTest || !emailSubject || !emailBody}
              >
                {isSendingTest ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Versturen...
                  </>
                ) : (
                  <>
                    Testmail versturen
                  </>
                )}
              </Button>
              <Button onClick={handleSend} disabled={isSending || isSendingTest || !emailSubject || !emailBody}>
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
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
