import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Send, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  defaultPhone?: string | null;
  partnerId?: string | null;
  requestId?: string | null;
  contextLabel?: string;
}

export function SendWhatsAppDialog({ open, onOpenChange, defaultPhone, partnerId, requestId, contextLabel }: Props) {
  const [phone, setPhone] = useState(defaultPhone || "");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const navigate = useNavigate();

  const handleSend = async () => {
    const trimmed = body.trim();
    if (!trimmed) return toast.error("Bericht is leeg");
    if (!phone.trim()) return toast.error("Telefoonnummer ontbreekt");
    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("whatsapp-send", {
        body: {
          phone_number: phone.trim(),
          content: trimmed,
          partner_id: partnerId || undefined,
          request_id: requestId || undefined,
        },
      });
      const err = error || (data as { error?: string })?.error;
      if (err) throw new Error((data as { details?: string })?.details || (err as Error)?.message || String(err));
      toast.success("WhatsApp-bericht verzonden");
      onOpenChange(false);
      setBody("");
      const convId = (data as { conversation_id?: string })?.conversation_id;
      if (convId) navigate(`/admin/chat`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Versturen mislukt");
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageCircle className="h-4 w-4 text-emerald-600" />
            WhatsApp versturen {contextLabel ? `— ${contextLabel}` : ""}
          </DialogTitle>
          <DialogDescription>
            Het bericht wordt via Twilio verzonden vanaf het Bureau Vlieland WhatsApp-nummer. Buiten het 24-uurs sessievenster
            werkt alleen vrije tekst als de ontvanger eerder contact heeft gehad.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="wa-phone">Telefoonnummer (E.164, bijv. +316…)</Label>
            <Input id="wa-phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+316…" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="wa-body">Bericht</Label>
            <Textarea id="wa-body" value={body} onChange={(e) => setBody(e.target.value)} rows={6} maxLength={4000} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={sending}>Annuleren</Button>
          <Button onClick={handleSend} disabled={sending || !body.trim() || !phone.trim()}>
            <Send className="h-4 w-4 mr-2" />
            {sending ? "Versturen…" : "Versturen"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
