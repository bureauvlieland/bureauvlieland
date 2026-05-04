import { useEffect, useState, useCallback } from "react";
import { Mail, Send, User, Building2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { toast } from "@/hooks/use-toast";

interface ThreadMessage {
  id: string;
  direction: string;
  subject: string | null;
  content: string;
  contact_name: string | null;
  communication_date: string;
  metadata: Record<string, unknown> | null;
}

interface PartnerCustomerMessagesPanelProps {
  quoteId: string;
  accommodationRequestId: string;
  customerLabel: string;
  accommodationName: string;
}

export const PartnerCustomerMessagesPanel = ({
  quoteId,
  accommodationRequestId,
  customerLabel,
  accommodationName,
}: PartnerCustomerMessagesPanelProps) => {
  const [messages, setMessages] = useState<ThreadMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [composeOpen, setComposeOpen] = useState(false);
  const [subject, setSubject] = useState(`Bericht over uw verblijf bij ${accommodationName}`);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from("project_communications")
      .select("id, direction, subject, content, contact_name, communication_date, metadata")
      .eq("accommodation_id", accommodationRequestId)
      .eq("audience", "customer_partner")
      .order("communication_date", { ascending: true });
    if (error) {
      console.error(error);
    } else {
      setMessages((data as ThreadMessage[]) || []);
    }
    setLoading(false);
  }, [accommodationRequestId]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const channel = supabase
      .channel(`partner-thread-${accommodationRequestId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "project_communications",
          filter: `accommodation_id=eq.${accommodationRequestId}`,
        },
        () => load(),
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [accommodationRequestId, load]);

  const handleSend = async () => {
    if (!subject.trim() || !body.trim()) {
      toast({ title: "Vul alle velden in", variant: "destructive" });
      return;
    }
    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke(
        "send-partner-customer-message",
        { body: { quoteId, subject: subject.trim(), message: body.trim() } },
      );
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast({ title: "Bericht verstuurd", description: `Uw bericht is verzonden naar ${customerLabel}.` });
      setComposeOpen(false);
      setBody("");
      load();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Onbekende fout";
      toast({ title: "Versturen mislukt", description: msg, variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <Card>
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Mail className="h-4 w-4" />
            Berichten met klant
          </CardTitle>
          <Button size="sm" variant="outline" onClick={() => setComposeOpen(true)}>
            <Send className="h-4 w-4 mr-2" />
            Nieuw bericht
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading ? (
            <div className="flex items-center justify-center py-4 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Laden…
            </div>
          ) : messages.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nog geen berichten met deze klant. Stuur een bericht — dat komt direct bij de klant aan en wordt hier ook gelogd.
            </p>
          ) : (
            messages.map((m) => {
              const isPartner = (m.metadata as any)?.sender === "partner" || m.direction === "outbound";
              const isCustomerInbound = m.direction === "inbound";
              const isPartnerOutbound = isPartner && !isCustomerInbound;
              return (
                <div
                  key={m.id}
                  className={`rounded-lg p-3 border ${
                    isPartnerOutbound
                      ? "bg-primary/5 border-primary/20 ml-6"
                      : "bg-muted/50 border-border mr-6"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1.5 font-medium text-foreground">
                      {isPartnerOutbound ? <Building2 className="h-3 w-3" /> : <User className="h-3 w-3" />}
                      {isPartnerOutbound ? "U" : customerLabel}
                    </span>
                    <span>{format(new Date(m.communication_date), "d MMM yyyy HH:mm", { locale: nl })}</span>
                  </div>
                  {m.subject && <p className="font-medium text-sm mb-1">{m.subject}</p>}
                  <p className="text-sm whitespace-pre-wrap">{m.content}</p>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      <Dialog open={composeOpen} onOpenChange={setComposeOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Bericht aan {customerLabel}</DialogTitle>
            <DialogDescription>
              Uw bericht wordt direct via Bureau Vlieland aan de klant verzonden. De klant kan rechtstreeks per e-mail antwoorden.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="psubject">Onderwerp</Label>
              <Input id="psubject" value={subject} onChange={(e) => setSubject(e.target.value)} maxLength={200} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pbody">Bericht</Label>
              <Textarea id="pbody" value={body} onChange={(e) => setBody(e.target.value)} rows={6} maxLength={5000} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setComposeOpen(false)} disabled={sending}>Annuleren</Button>
            <Button onClick={handleSend} disabled={sending || !body.trim()}>
              {sending ? "Versturen…" : (<><Send className="h-4 w-4 mr-2" />Versturen</>)}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
