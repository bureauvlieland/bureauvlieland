import { useEffect, useRef, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Sparkles, Send, Loader2, ListPlus, Mail, Check, Copy } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import ReactMarkdown from "react-markdown";
import { cn } from "@/lib/utils";

type Proposal =
  | {
      type: "voorstel_taak";
      args: {
        project_id?: string;
        title: string;
        description?: string;
        priority: "low" | "normal" | "high" | "urgent";
        due_date?: string;
      };
    }
  | {
      type: "voorstel_email_concept";
      args: {
        project_id?: string;
        doelgroep: "klant" | "partner";
        onderwerp: string;
        body: string;
      };
    };

type Msg = {
  role: "user" | "assistant";
  content: string;
  proposals?: Proposal[];
  proposalAccepted?: boolean[];
};

const SUGGESTIONS = [
  "Wat is er vandaag urgent?",
  "Welke projecten wachten al langer dan een week op de klant?",
  "Maak een taak voor mij om morgen Hotel Badhuys te bellen.",
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

  const acceptProposal = async (msgIdx: number, propIdx: number) => {
    const msg = messages[msgIdx];
    const prop = msg.proposals?.[propIdx];
    if (!prop) return;

    if (prop.type === "voorstel_taak") {
      const { error } = await supabase.from("admin_todos").insert({
        title: prop.args.title,
        description: prop.args.description ?? null,
        priority: prop.args.priority,
        status: "todo",
        due_date: prop.args.due_date ?? null,
        related_request_id: prop.args.project_id ?? null,
      });
      if (error) {
        toast({ title: "Aanmaken mislukt", description: error.message, variant: "destructive" });
        return;
      }
      toast({ title: "Taak aangemaakt", description: prop.args.title });
    } else {
      // Email-concept: copy to clipboard
      const text = `Onderwerp: ${prop.args.onderwerp}\n\n${prop.args.body}`;
      try {
        await navigator.clipboard.writeText(text);
        toast({ title: "Concept gekopieerd", description: "Plak in je mailflow." });
      } catch {
        toast({ title: "Kopiëren mislukt", variant: "destructive" });
        return;
      }
    }

    setMessages((prev) =>
      prev.map((m, i) => {
        if (i !== msgIdx) return m;
        const accepted = [...(m.proposalAccepted ?? [])];
        accepted[propIdx] = true;
        return { ...m, proposalAccepted: accepted };
      }),
    );
  };

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
      ...messages.map(({ role, content }) => ({ role, content })),
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
      let proposalsCollected: Proposal[] = [];
      let pushed = false;

      const upsert = () => {
        setMessages((prev) => {
          const newMsg: Msg = {
            role: "assistant",
            content: assistantSoFar,
            proposals: proposalsCollected.length ? proposalsCollected : undefined,
          };
          if (!pushed) {
            pushed = true;
            return [...prev, newMsg];
          }
          return prev.map((m, i) => (i === prev.length - 1 ? newMsg : m));
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
            if (delta) { assistantSoFar += delta; upsert(); }
            if (Array.isArray(parsed.proposals)) {
              proposalsCollected = parsed.proposals;
              upsert();
            }
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
            Je AI-co-piloot. Leest mee, denkt mee en stelt taken & concept-mails voor — jij bevestigt.
          </p>
        </SheetHeader>

        <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto p-4">
          {messages.length === 0 && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">Stel een vraag of kies een suggestie:</p>
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
            <div key={i} className="space-y-2">
              <div
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

              {m.proposals?.map((p, pi) => (
                <ProposalCard
                  key={pi}
                  proposal={p}
                  accepted={!!m.proposalAccepted?.[pi]}
                  onAccept={() => acceptProposal(i, pi)}
                />
              ))}
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

function ProposalCard({
  proposal,
  accepted,
  onAccept,
}: {
  proposal: Proposal;
  accepted: boolean;
  onAccept: () => void;
}) {
  if (proposal.type === "voorstel_taak") {
    const { title, description, priority, due_date } = proposal.args;
    return (
      <div className="mr-auto max-w-[95%] rounded-lg border-2 border-dashed border-primary/40 bg-background p-3">
        <div className="flex items-center gap-2 text-xs font-medium text-primary">
          <ListPlus className="h-3.5 w-3.5" /> Voorstel: nieuwe taak
        </div>
        <div className="mt-2 space-y-1 text-sm">
          <div className="font-medium">{title}</div>
          {description && <div className="text-muted-foreground">{description}</div>}
          <div className="text-xs text-muted-foreground">
            Prioriteit: {priority}
            {due_date ? ` · deadline ${due_date}` : ""}
          </div>
        </div>
        <Button
          size="sm"
          className="mt-2 gap-1"
          disabled={accepted}
          onClick={onAccept}
        >
          {accepted ? <><Check className="h-3.5 w-3.5" /> Aangemaakt</> : "Taak aanmaken"}
        </Button>
      </div>
    );
  }

  const { doelgroep, onderwerp, body } = proposal.args;
  return (
    <div className="mr-auto max-w-[95%] rounded-lg border-2 border-dashed border-primary/40 bg-background p-3">
      <div className="flex items-center gap-2 text-xs font-medium text-primary">
        <Mail className="h-3.5 w-3.5" /> Concept-mail aan {doelgroep}
      </div>
      <div className="mt-2 space-y-1 text-sm">
        <div className="font-medium">{onderwerp}</div>
        <div className="max-h-48 overflow-y-auto whitespace-pre-wrap rounded bg-muted/40 p-2 text-xs text-muted-foreground">
          {body}
        </div>
      </div>
      <Button size="sm" className="mt-2 gap-1" disabled={accepted} onClick={onAccept}>
        {accepted ? <><Check className="h-3.5 w-3.5" /> Gekopieerd</> : <><Copy className="h-3.5 w-3.5" /> Kopieer concept</>}
      </Button>
    </div>
  );
}
