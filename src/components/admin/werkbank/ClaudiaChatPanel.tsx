import { useEffect, useRef, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Sparkles, Send, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import ReactMarkdown from "react-markdown";
import { cn } from "@/lib/utils";

type Msg = { role: "user" | "assistant"; content: string };

const SUGGESTIONS = [
  "Wat is er vandaag urgent?",
  "Welke projecten wachten al langer dan een week op de klant?",
  "Geef me de stand van zaken voor het meest recente project in 5 zinnen.",
];

interface ClaudiaChatPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contextProjectId?: string | null;
}

export function ClaudiaChatPanel({ open, onOpenChange, contextProjectId }: ClaudiaChatPanelProps) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  const send = async (raw?: string) => {
    const text = (raw ?? input).trim();
    if (!text || loading) return;
    setInput("");
    setLoading(true);

    const userMsg: Msg = { role: "user", content: text };
    const contextHint = contextProjectId
      ? `\n\n(Context: admin kijkt nu naar project ${contextProjectId}.)`
      : "";
    const outgoing = [
      ...messages,
      { role: "user" as const, content: text + contextHint },
    ];
    setMessages((prev) => [...prev, userMsg]);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/claudia-chat`;
      const resp = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token ?? import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ messages: outgoing }),
      });
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        toast({
          title: "Claudia reageert niet",
          description: err.error || `Status ${resp.status}`,
          variant: "destructive",
        });
        setLoading(false);
        return;
      }
      if (!resp.body) throw new Error("Geen response stream");

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let assistantSoFar = "";
      let pushed = false;

      const upsert = (chunk: string) => {
        assistantSoFar += chunk;
        setMessages((prev) => {
          if (!pushed) {
            pushed = true;
            return [...prev, { role: "assistant", content: assistantSoFar }];
          }
          return prev.map((m, i) =>
            i === prev.length - 1 ? { ...m, content: assistantSoFar } : m,
          );
        });
      };

      let done = false;
      while (!done) {
        const { value, done: d } = await reader.read();
        if (d) break;
        buffer += decoder.decode(value, { stream: true });
        let nl;
        while ((nl = buffer.indexOf("\n")) !== -1) {
          let line = buffer.slice(0, nl);
          buffer = buffer.slice(nl + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line.startsWith("data: ")) continue;
          const json = line.slice(6).trim();
          if (json === "[DONE]") { done = true; break; }
          try {
            const parsed = JSON.parse(json);
            const delta = parsed.choices?.[0]?.delta?.content;
            if (delta) upsert(delta);
          } catch {
            buffer = line + "\n" + buffer;
            break;
          }
        }
      }
    } catch (e) {
      toast({
        title: "Verbinding mislukt",
        description: e instanceof Error ? e.message : "Onbekende fout",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-full flex-col p-0 sm:max-w-lg">
        <SheetHeader className="border-b px-4 py-3">
          <SheetTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            Overleg met Claudia
          </SheetTitle>
          <p className="text-xs text-muted-foreground">
            Je AI-co-piloot. Leest mee, denkt mee — schrijfacties komen later.
          </p>
        </SheetHeader>

        <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto p-4">
          {messages.length === 0 && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Stel een vraag of kies een suggestie:
              </p>
              <div className="flex flex-col gap-2">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => send(s)}
                    className="rounded-md border bg-muted/30 px-3 py-2 text-left text-sm hover:bg-muted"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}
          {messages.map((m, i) => (
            <div
              key={i}
              className={cn(
                "rounded-lg px-3 py-2 text-sm",
                m.role === "user"
                  ? "ml-auto max-w-[85%] bg-primary text-primary-foreground"
                  : "mr-auto max-w-[95%] bg-muted",
              )}
            >
              {m.role === "assistant" ? (
                <div className="prose prose-sm max-w-none dark:prose-invert [&_p]:my-1 [&_ul]:my-1">
                  <ReactMarkdown>{m.content || "…"}</ReactMarkdown>
                </div>
              ) : (
                <span className="whitespace-pre-wrap">{m.content}</span>
              )}
            </div>
          ))}
          {loading && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" /> Claudia denkt na…
            </div>
          )}
        </div>

        <div className="border-t p-3">
          <div className="flex gap-2">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
              placeholder="Stel een vraag aan Claudia… (Enter om te sturen)"
              className="min-h-[44px] resize-none"
              rows={1}
              disabled={loading}
            />
            <Button onClick={() => send()} disabled={loading || !input.trim()} size="icon">
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
