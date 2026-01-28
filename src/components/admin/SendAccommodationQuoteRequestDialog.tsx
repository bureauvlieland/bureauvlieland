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
import { Badge } from "@/components/ui/badge";
import { Send, Eye, Edit2, Mail, Users, Calendar, Building2 } from "lucide-react";
import { format } from "date-fns";
import { nl } from "date-fns/locale";

interface Partner {
  id: string;
  name: string;
  email: string;
}

interface AccommodationRequest {
  id: string;
  reference_number?: string;
  customer_name: string;
  customer_company?: string;
  customer_email: string;
  arrival_date: string;
  departure_date: string;
  number_of_guests: number;
  accommodation_type: string;
  special_requests?: string;
}

interface SendAccommodationQuoteRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  request: AccommodationRequest;
  selectedPartners: Partner[];
  onSend: (emailSubject: string, emailBody: string) => void;
  isSending: boolean;
}

const TYPE_LABELS: Record<string, string> = {
  hotel: "Hotel",
  vacation_home: "Vakantiewoning",
  group_accommodation: "Groepsaccommodatie",
  camping: "Camping",
  no_preference: "Geen voorkeur",
};

export function SendAccommodationQuoteRequestDialog({
  open,
  onOpenChange,
  request,
  selectedPartners,
  onSend,
  isSending,
}: SendAccommodationQuoteRequestDialogProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");

  const nights = Math.ceil(
    (new Date(request.departure_date).getTime() - new Date(request.arrival_date).getTime()) /
      (1000 * 60 * 60 * 24)
  );

  // Generate default email content
  useEffect(() => {
    if (open) {
      const defaultSubject = `Offerteaanvraag logies - ${request.customer_name} (${request.number_of_guests} gasten)`;
      
      const defaultBody = `Beste partner,

We ontvingen een logiesaanvraag die goed bij jullie aanbod past. Graag ontvangen we jullie offerte.

**Aanvraaggegevens:**
- Klant: ${request.customer_name}${request.customer_company ? ` (${request.customer_company})` : ""}
- Periode: ${format(new Date(request.arrival_date), "d MMMM yyyy", { locale: nl })} - ${format(new Date(request.departure_date), "d MMMM yyyy", { locale: nl })} (${nights} nachten)
- Aantal gasten: ${request.number_of_guests} personen
- Type accommodatie: ${TYPE_LABELS[request.accommodation_type] || request.accommodation_type}
${request.special_requests ? `\n**Bijzondere wensen:**\n${request.special_requests}` : ""}

Jullie kunnen de offerte indienen via het partnerportaal. We zien jullie offerte graag binnen 5 werkdagen tegemoet.

Met vriendelijke groet,
Bureau Vlieland`;

      setEmailSubject(defaultSubject);
      setEmailBody(defaultBody);
      setIsEditing(false);
    }
  }, [open, request, nights]);

  const handleSend = () => {
    onSend(emailSubject, emailBody);
  };

  // Convert markdown-style bold to HTML for preview
  const formatPreviewBody = (text: string) => {
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\n/g, '<br>');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Offerteaanvraag versturen
          </DialogTitle>
          <DialogDescription>
            Controleer de email voordat deze naar de geselecteerde partners wordt verstuurd
          </DialogDescription>
        </DialogHeader>

        {/* Recipients */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Ontvangers ({selectedPartners.length})</Label>
          <div className="flex flex-wrap gap-2">
            {selectedPartners.map((partner) => (
              <Badge key={partner.id} variant="secondary" className="py-1">
                <Mail className="h-3 w-3 mr-1" />
                {partner.name}
              </Badge>
            ))}
          </div>
        </div>

        <Separator />

        {/* Request Summary */}
        <div className="grid grid-cols-3 gap-3 text-sm">
          <div className="flex items-center gap-2 p-2 bg-muted rounded">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span>{nights} nachten</span>
          </div>
          <div className="flex items-center gap-2 p-2 bg-muted rounded">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span>{request.number_of_guests} gasten</span>
          </div>
          <div className="flex items-center gap-2 p-2 bg-muted rounded">
            <Building2 className="h-4 w-4 text-muted-foreground" />
            <span>{TYPE_LABELS[request.accommodation_type] || "Logies"}</span>
          </div>
        </div>

        <Separator />

        {/* Email Content */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">Email inhoud</Label>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsEditing(!isEditing)}
            >
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
                <Label htmlFor="subject" className="text-xs text-muted-foreground">Onderwerp</Label>
                <Input
                  id="subject"
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="body" className="text-xs text-muted-foreground">Bericht</Label>
                <Textarea
                  id="body"
                  value={emailBody}
                  onChange={(e) => setEmailBody(e.target.value)}
                  className="mt-1 min-h-[300px] font-mono text-sm"
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
            {isSending ? "Versturen..." : `Verstuur naar ${selectedPartners.length} partner(s)`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
