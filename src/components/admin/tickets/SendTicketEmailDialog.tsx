import { useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
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
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Mail, FileText, AlertCircle } from "lucide-react";

interface TicketDialogItem {
  id: string;
  block_name: string;
  booking_reference: string | null;
  booking_document_path: string | null;
  ticketDate: string | null;
}

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  items: TicketDialogItem[];
  defaultEmail: string;
  customerName: string;
  referenceNumber: string | null;
  onSent?: () => void;
}

const emailListSchema = z
  .string()
  .trim()
  .min(1, "Vul een e-mailadres in")
  .refine((v) => v.split(/[,;]/).every((s) => z.string().email().safeParse(s.trim()).success), {
    message: "Eén of meerdere e-mailadressen zijn ongeldig",
  });

export function SendTicketEmailDialog({
  open,
  onOpenChange,
  items,
  defaultEmail,
  customerName,
  referenceNumber,
  onSent,
}: Props) {
  const { toast } = useToast();
  const [recipient, setRecipient] = useState(defaultEmail);
  const [subject, setSubject] = useState(() => {
    const refs = items.map((i) => i.booking_reference).filter(Boolean).join(", ");
    return refs ? `Uw tickets — boeking ${refs}` : "Uw tickets voor uw verblijf op Vlieland";
  });
  const [message, setMessage] = useState(
    `Beste ${customerName},\n\nIn de bijlage vindt u uw ticket${items.length > 1 ? "s" : ""} voor uw verblijf op Vlieland.\n\nWij wensen u een fijne reis. Mocht u vragen hebben, dan kunt u eenvoudig op deze e-mail reageren.\n\nMet vriendelijke groet,\nBureau Vlieland`
  );
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    const parsed = emailListSchema.safeParse(recipient);
    if (!parsed.success) {
      toast({ title: "Ongeldig e-mailadres", description: parsed.error.issues[0]?.message, variant: "destructive" });
      return;
    }
    setSending(true);
    const { error } = await supabase.functions.invoke("send-ticket-email", {
      body: {
        itemIds: items.map((i) => i.id),
        recipientEmail: recipient,
        subject,
        message,
      },
    });
    setSending(false);
    if (error) {
      toast({ title: "Versturen mislukt", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Tickets verstuurd" });
    onSent?.();
  };

  const itemsWithoutPdf = items.filter((i) => !i.booking_document_path);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Mail className="h-5 w-5" /> Tickets mailen naar klant
          </DialogTitle>
          <DialogDescription className="text-sm">
            {items.length} ticket{items.length > 1 ? "s" : ""}
            {referenceNumber ? ` • project ${referenceNumber}` : ""}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 text-sm">
          <div>
            <Label className="text-xs">Aan</Label>
            <Input
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              placeholder="naam@voorbeeld.nl"
            />
            <p className="text-[11px] text-slate-500 mt-1">
              Meerdere adressen scheiden met een komma of puntkomma.
            </p>
          </div>
          <div>
            <Label className="text-xs">Onderwerp</Label>
            <Input value={subject} onChange={(e) => setSubject(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">Bericht</Label>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={8}
              className="text-sm"
            />
          </div>

          <div className="rounded border bg-slate-50 p-2 text-xs space-y-1">
            <div className="font-medium text-slate-700">Bijlagen</div>
            {items.map((i) => (
              <div key={i.id} className="flex items-center gap-1.5 text-slate-600">
                <FileText className="h-3.5 w-3.5" />
                <span>{i.block_name}</span>
                {i.booking_reference && <span className="text-slate-400">({i.booking_reference})</span>}
                {!i.booking_document_path && <span className="text-amber-600 ml-1">— geen PDF</span>}
              </div>
            ))}
            {itemsWithoutPdf.length > 0 && (
              <div className="flex items-start gap-1 text-amber-700 mt-1">
                <AlertCircle className="h-3.5 w-3.5 mt-0.5" />
                <span>{itemsWithoutPdf.length} item zonder PDF wordt alleen vermeld in het bericht.</span>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={sending}>
            Annuleren
          </Button>
          <Button onClick={handleSend} disabled={sending}>
            {sending ? "Verzenden…" : "Verstuur"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
