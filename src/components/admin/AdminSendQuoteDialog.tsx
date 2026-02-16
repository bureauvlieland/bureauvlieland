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
  const [isLoadingTemplate, setIsLoadingTemplate] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const defaultValidUntil = currentValidUntil
    ? new Date(currentValidUntil)
    : addDays(new Date(), 14);

  const [validUntil, setValidUntil] = useState<Date>(defaultValidUntil);
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");

  const formattedDates = programDates
    .map((d) => format(new Date(d), "d MMMM yyyy", { locale: nl }))
    .join(", ");

  const replaceVariables = (text: string) => {
    const validUntilFormatted = format(validUntil, "d MMMM yyyy", { locale: nl });
    const companyName = customerCompany || "u";

    // Process conditionals first: {{#if var}}...{{else}}...{{/if}} and {{#if var}}...{{/if}}
    let result = text;
    let iterations = 0;
    while (iterations < 20) {
      const ifElsePattern = /\{\{#if\s+(\w+)\}\}([\s\S]*?)\{\{else\}\}([\s\S]*?)\{\{\/if\}\}/;
      const ifOnlyPattern = /\{\{#if\s+(\w+)\}\}([\s\S]*?)\{\{\/if\}\}/;
      const elseMatch = result.match(ifElsePattern);
      const ifMatch = result.match(ifOnlyPattern);

      let matchToProcess: RegExpMatchArray | null = null;
      let hasElse = false;

      if (elseMatch && ifMatch) {
        if ((elseMatch.index ?? Infinity) <= (ifMatch.index ?? Infinity)) {
          matchToProcess = elseMatch;
          hasElse = true;
        } else {
          matchToProcess = ifMatch;
        }
      } else if (elseMatch) {
        matchToProcess = elseMatch;
        hasElse = true;
      } else if (ifMatch) {
        matchToProcess = ifMatch;
      }

      if (!matchToProcess) break;

      const varName = matchToProcess[1];
      // personal_message is always empty in preview (it's part of the body now)
      const isTruthy = false; // personal_message block should be removed

      if (hasElse) {
        result = result.replace(matchToProcess[0], isTruthy ? matchToProcess[2] : matchToProcess[3]);
      } else {
        result = result.replace(matchToProcess[0], isTruthy ? matchToProcess[2] : "");
      }
      iterations++;
    }

    // Replace simple variables
    result = result
      .replace(/\{\{customer_name\}\}/g, customerName)
      .replace(/\{\{company_name\}\}/g, companyName)
      .replace(/\{\{dates\}\}/g, formattedDates)
      .replace(/\{\{number_of_people\}\}/g, String(numberOfPeople || ""))
      .replace(/\{\{valid_until\}\}/g, validUntilFormatted)
      .replace(/\{\{portal_url\}\}/g, portalUrl || "")
      .replace(/\{\{\w+\}\}/g, ""); // Remove any remaining placeholders

    // Clean up double whitespace from removed conditionals
    result = result.replace(/\n{3,}/g, "\n\n").trim();

    return result;
  };

  const loadTemplate = async () => {
    setIsLoadingTemplate(true);
    try {
      const { data: template, error } = await supabase
        .from("email_templates")
        .select("subject, body_html")
        .eq("id", "quote_offer_customer")
        .eq("is_active", true)
        .maybeSingle();

      if (error) throw error;

      if (template) {
        setEmailSubject(replaceVariables(template.subject));
        setEmailBody(replaceVariables(template.body_html));
      } else {
        // Fallback
        setEmailSubject("Uw maatwerkvoorstel van Bureau Vlieland");
        setEmailBody(
          `Beste ${customerName},\n\nHierbij ontvangt u ons maatwerkvoorstel voor uw evenement op Vlieland. Wij hebben dit programma speciaal voor ${customerCompany || "u"} samengesteld.\n\nDit voorstel is geldig tot ${format(validUntil, "d MMMM yyyy", { locale: nl })}. U kunt het voorstel bekijken en akkoord geven in uw persoonlijke klantomgeving.\n\nHeeft u vragen over dit voorstel? Neem gerust contact met ons op.\n\nMet vriendelijke groet,\nBureau Vlieland`
        );
      }
    } catch (error) {
      console.error("Error loading template:", error);
      toast.error("Fout bij laden e-mailtemplate");
    } finally {
      setIsLoadingTemplate(false);
    }
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
                    De programmatabel en de akkoord-knop worden automatisch onder deze tekst geplaatst.
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
                  ↓ Hieronder wordt automatisch de programmatabel en akkoord-knop toegevoegd
                </div>
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => setIsOpen(false)}
            disabled={isSending}
          >
            Annuleren
          </Button>
          <Button onClick={handleSend} disabled={isSending || !emailSubject || !emailBody}>
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
