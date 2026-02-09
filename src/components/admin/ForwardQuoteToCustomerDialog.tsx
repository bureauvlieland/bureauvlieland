import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Send, Eye, Edit2, Mail, Euro } from "lucide-react";

interface ForwardQuoteToCustomerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  quote: {
    id: string;
    accommodation_name: string;
    price_total: number;
    partner: { name: string } | null;
  };
  customerName: string;
  customerEmail: string;
  onSend: (emailSubject: string, emailBody: string) => void;
  isSending: boolean;
}

export function ForwardQuoteToCustomerDialog({
  open,
  onOpenChange,
  quote,
  customerName,
  customerEmail,
  onSend,
  isSending,
}: ForwardQuoteToCustomerDialogProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");

  useEffect(() => {
    if (open) {
      const partnerName = quote.partner?.name || "partner";
      const defaultSubject = `Nieuwe offerte ontvangen: ${quote.accommodation_name}`;

      const defaultBody = `Beste ${customerName},

Goed nieuws! We hebben een nieuwe logiesofferte voor u ontvangen.

**Accommodatie:** ${quote.accommodation_name}
**Aanbieder:** ${partnerName}
**Totaalprijs:** €${quote.price_total.toLocaleString("nl-NL", { minimumFractionDigits: 2 })}

U kunt deze offerte bekijken en vergelijken in uw persoonlijke omgeving. Daar kunt u ook direct uw keuze maken.

Heeft u vragen over deze offerte? Neem gerust contact met ons op via hallo@bureauvlieland.nl of 0562 700 208.

Met vriendelijke groet,
Bureau Vlieland`;

      setEmailSubject(defaultSubject);
      setEmailBody(defaultBody);
      setIsEditing(false);
    }
  }, [open, quote, customerName]);

  const handleSend = () => {
    onSend(emailSubject, emailBody);
  };

  const formatPreviewBody = (text: string) => {
    return text
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
      .replace(/\n/g, "<br>");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="h-5 w-5" />
            Offerte doorsturen naar klant
          </DialogTitle>
          <DialogDescription>
            Bekijk en pas de e-mail aan voordat deze naar de klant wordt verstuurd
          </DialogDescription>
        </DialogHeader>

        {/* Recipient */}
        <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
          <Mail className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">{customerName}</span>
          <span className="text-sm text-muted-foreground">({customerEmail})</span>
        </div>

        {/* Quote summary */}
        <div className="flex items-center gap-4 p-3 bg-muted/50 rounded-lg text-sm">
          <span className="font-medium">{quote.accommodation_name}</span>
          <span className="text-muted-foreground">•</span>
          <span className="flex items-center gap-1">
            <Euro className="h-3 w-3" />
            {quote.price_total.toLocaleString("nl-NL", { minimumFractionDigits: 2 })}
          </span>
        </div>

        <Separator />

        {/* Email Content */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">Email inhoud</Label>
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

          {isEditing ? (
            <div className="space-y-3">
              <div>
                <Label htmlFor="fw-subject" className="text-xs text-muted-foreground">
                  Onderwerp
                </Label>
                <Input
                  id="fw-subject"
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="fw-body" className="text-xs text-muted-foreground">
                  Bericht
                </Label>
                <Textarea
                  id="fw-body"
                  value={emailBody}
                  onChange={(e) => setEmailBody(e.target.value)}
                  className="mt-1 min-h-[250px] font-mono text-sm"
                />
              </div>
            </div>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <div className="bg-muted px-4 py-2 border-b">
                <p className="text-sm font-medium">{emailSubject}</p>
              </div>
              <div
                className="p-4 text-sm bg-background prose prose-sm max-w-none"
                dangerouslySetInnerHTML={{ __html: formatPreviewBody(emailBody) }}
              />
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSending}>
            Annuleren
          </Button>
          <Button onClick={handleSend} disabled={isSending || !emailSubject || !emailBody}>
            <Send className="h-4 w-4 mr-2" />
            {isSending ? "Versturen..." : "Doorsturen naar klant"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
