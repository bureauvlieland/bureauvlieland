import { useEffect, useState, useCallback } from "react";
import { Mail, Send, User, Building2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { ContactAccommodationDialog } from "./ContactAccommodationDialog";

interface ThreadMessage {
  id: string;
  direction: "inbound" | "outbound" | "internal";
  subject: string | null;
  content: string;
  contact_name: string | null;
  communication_date: string;
  metadata: Record<string, unknown> | null;
}

interface AccommodationMessageThreadProps {
  customerToken: string;
  quoteId: string;
  accommodationName: string;
  isBureauCentral?: boolean;
}

export const AccommodationMessageThread = ({
  customerToken,
  quoteId,
  accommodationName,
  isBureauCentral = false,
}: AccommodationMessageThreadProps) => {
  const [messages, setMessages] = useState<ThreadMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [composeOpen, setComposeOpen] = useState(false);

  const load = useCallback(async () => {
    try {
      const { data, error } = await supabase.functions.invoke(
        "get-customer-accommodation-thread",
        { body: { customerToken, quoteId } },
      );
      if (error) throw error;
      setMessages((data?.messages as ThreadMessage[]) || []);
    } catch (e) {
      console.error("Thread load failed", e);
    } finally {
      setLoading(false);
    }
  }, [customerToken, quoteId]);

  useEffect(() => {
    load();
  }, [load]);

  // realtime: refresh on new message for this accommodation
  useEffect(() => {
    const channel = supabase
      .channel(`thread-${quoteId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "project_communications" },
        () => load(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [quoteId, load]);

  return (
    <>
      <Card>
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Mail className="h-4 w-4" />
            Berichten met {accommodationName}
          </CardTitle>
          <Button size="sm" variant="outline" onClick={() => setComposeOpen(true)}>
            <Send className="h-4 w-4 mr-2" />
            Nieuw bericht
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading ? (
            <div className="flex items-center justify-center py-6 text-muted-foreground text-sm">
              <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Berichten laden…
            </div>
          ) : messages.length === 0 ? (
            <p className="text-sm text-muted-foreground py-2">
              Nog geen berichten. Stel een vraag of geef extra wensen door — uw bericht gaat direct naar {accommodationName}, antwoorden ontvangt u per e-mail én hier in het overzicht.
            </p>
          ) : (
            messages.map((m) => {
              const isCustomer = m.direction === "outbound" && (m.metadata as any)?.sender !== "partner";
              return (
                <div
                  key={m.id}
                  className={`rounded-lg p-3 border ${
                    isCustomer
                      ? "bg-primary/5 border-primary/20 ml-6"
                      : "bg-muted/50 border-border mr-6"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1.5 font-medium text-foreground">
                      {isCustomer ? <User className="h-3 w-3" /> : <Building2 className="h-3 w-3" />}
                      {isCustomer ? "U" : accommodationName}
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

      <ContactAccommodationDialog
        open={composeOpen}
        onOpenChange={(open) => {
          setComposeOpen(open);
          if (!open) setTimeout(load, 500);
        }}
        accommodationName={accommodationName}
        quoteId={quoteId}
        customerToken={customerToken}
        isBureauCentral={isBureauCentral}
      />
    </>
  );
};
