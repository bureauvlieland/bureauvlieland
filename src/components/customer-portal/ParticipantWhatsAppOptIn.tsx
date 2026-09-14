import { useState } from "react";
import { MessageCircle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { isDutchMobileNumber, DUTCH_MOBILE_PHONE_ERROR } from "@/lib/dutchMobilePhone";
import { openWhatsApp } from "@/lib/whatsappLink";
import { useAppSettings } from "@/hooks/useAppSettings";

interface ParticipantWhatsAppOptInProps {
  requestId: string;
  participantToken: string;
}

const optedInKey = (token: string) => `bv:participant-optin:${token}`;

export const ParticipantWhatsAppOptIn = ({ requestId, participantToken }: ParticipantWhatsAppOptInProps) => {
  const { toast } = useToast();
  const { settings } = useAppSettings();
  const bureauWhatsAppNumber = settings.bureau_phone;
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [optedIn, setOptedIn] = useState(() => {
    try {
      return sessionStorage.getItem(optedInKey(participantToken)) === "true"
        || localStorage.getItem(optedInKey(participantToken)) === "true";
    } catch {
      return false;
    }
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isDutchMobileNumber(phone)) {
      setPhoneError(DUTCH_MOBILE_PHONE_ERROR);
      return;
    }
    setPhoneError(null);
    setIsSubmitting(true);

    const { error } = await supabase.from("program_participants").insert({
      request_id: requestId,
      participant_token: participantToken,
      name: name.trim() || null,
      phone_number: phone.trim(),
      whatsapp_opt_in: true,
    });

    setIsSubmitting(false);

    if (error) {
      toast({
        title: "Aanmelden mislukt",
        description: "Probeer het later nog eens, of neem contact op met Bureau Vlieland.",
        variant: "destructive",
      });
      return;
    }

    try {
      localStorage.setItem(optedInKey(participantToken), "true");
    } catch {
      // localStorage kan geblokkeerd zijn; niet blokkerend voor de opt-in zelf.
    }
    setOptedIn(true);

    // Open WhatsApp met een voorgevuld berichtje. Dit is ook functioneel
    // nodig: WhatsApp Business staat een vrij bericht ván Bureau Vlieland
    // alleen toe binnen 24 uur nadat de deelnemer zelf iets heeft gestuurd.
    openWhatsApp({
      phone: bureauWhatsAppNumber,
      text: "Ja, ik wil WhatsApp-updates ontvangen over mijn programma bij Bureau Vlieland.",
    });
  };

  if (optedIn) {
    return (
      <Card className="bg-accent-soft border-none">
        <CardContent className="py-4 flex items-center gap-3">
          <CheckCircle2 className="h-5 w-5 text-primary shrink-0" />
          <p className="text-sm text-foreground">
            Aangemeld voor WhatsApp-updates. Heb je zonet geen WhatsApp-venster geopend?{" "}
            <button
              type="button"
              className="text-primary underline underline-offset-2"
              onClick={() =>
                openWhatsApp({
                  phone: bureauWhatsAppNumber,
                  text: "Ja, ik wil WhatsApp-updates ontvangen over mijn programma bij Bureau Vlieland.",
                })
              }
            >
              Open WhatsApp
            </button>{" "}
            en stuur het bericht — anders komen updates niet aan.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="py-5">
        <div className="flex items-start gap-3 mb-4">
          <div className="rounded-md bg-primary/10 text-primary p-2 shrink-0">
            <MessageCircle className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">Blijf op de hoogte via WhatsApp</h3>
            <p className="text-sm text-muted-foreground">
              Meld je aan om wijzigingen in dit programma via WhatsApp te ontvangen.
            </p>
          </div>
        </div>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-3 items-end">
          <div className="space-y-1.5">
            <Label htmlFor="participant-name">Naam (optioneel)</Label>
            <Input
              id="participant-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Uw naam"
              maxLength={100}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="participant-phone">Mobiel nummer (06)</Label>
            <Input
              id="participant-phone"
              type="tel"
              value={phone}
              onChange={(e) => {
                setPhone(e.target.value);
                if (phoneError) setPhoneError(null);
              }}
              placeholder="06 12345678"
              maxLength={20}
            />
            {phoneError && <p className="text-xs font-medium text-destructive">{phoneError}</p>}
          </div>
          <Button type="submit" disabled={isSubmitting}>
            Aanmelden
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};
