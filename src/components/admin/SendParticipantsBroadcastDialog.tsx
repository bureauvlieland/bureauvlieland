import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Users } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface SendResult {
  phone_number: string;
  name: string | null;
  success: boolean;
  error?: string;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  requestId: string;
  contextLabel?: string;
}

export function SendParticipantsBroadcastDialog({ open, onOpenChange, requestId, contextLabel }: Props) {
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [lastResults, setLastResults] = useState<SendResult[] | null>(null);

  const handleSend = async () => {
    const trimmed = body.trim();
    if (!trimmed) return toast.error("Bericht is leeg");
    setSending(true);
    setLastResults(null);
    try {
      const { data, error } = await supabase.functions.invoke("send-participant-broadcast", {
        body: { request_id: requestId, content: trimmed },
      });
      const err = error || (data as { error?: string })?.error;
      if (err) throw new Error((data as { details?: string })?.details || (err as Error)?.message || String(err));

      const results = (data as { results?: SendResult[] })?.results ?? [];
      const sent = (data as { sent?: number })?.sent ?? 0;
      const total = (data as { total?: number })?.total ?? results.length;
      setLastResults(results);
      if (sent === total) {
        toast.success(`Verstuurd naar ${sent} van ${total} deelnemer${total !== 1 ? "s" : ""}`);
        setBody("");
      } else {
        toast.warning(`Verstuurd naar ${sent} van ${total} deelnemer${total !== 1 ? "s" : ""} — zie details hieronder`);
      }
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
            <Users className="h-4 w-4 text-emerald-600" />
            Bericht naar deelnemers {contextLabel ? `— ${contextLabel}` : ""}
          </DialogTitle>
          <DialogDescription>
            Gaat via WhatsApp naar iedereen die zich via de deelnemerspagina heeft aangemeld. Bij een deelnemer wiens
            24-uursvenster verlopen is, komt het bericht niet aan — die moet dan eerst opnieuw "Open WhatsApp" gebruiken.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <Textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={6}
            maxLength={4000}
            placeholder="Bijvoorbeeld: het programma van morgen is gewijzigd, de wadloopexcursie start nu om 10:00 in plaats van 9:00."
          />
          {lastResults && lastResults.length > 0 && (
            <div className="space-y-1 text-xs">
              {lastResults.map((r, i) => (
                <div key={i} className={r.success ? "text-muted-foreground" : "text-destructive"}>
                  {r.name || r.phone_number}: {r.success ? "verstuurd" : r.error}
                </div>
              ))}
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={sending}>Annuleren</Button>
          <Button onClick={handleSend} disabled={sending || !body.trim()}>
            <Send className="h-4 w-4 mr-2" />
            {sending ? "Versturen…" : "Versturen"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
