/**
 * Alle e-mails als test naar het bureau sturen, in batches van tien.
 *
 * De edge function send-template-test-batch rendert elke template met
 * voorbeeldgegevens (dossier BV-2611-TEST) plus de mails uit de
 * opbouwfuncties, en stuurt ze naar het vaste testadres. Eerst een
 * proefrun (niets versturen) voor de lijst; daarna per batch versturen.
 */
import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2, Send } from "lucide-react";

interface DryRunItem {
  index: number;
  kind: "template" | "generated";
  id: string;
  name: string;
  subject: string;
  unknownVariables: string[];
}

interface DryRunResult {
  total: number;
  batches: number;
  size: number;
  recipient: string;
  items: DryRunItem[];
}

interface SendResult {
  ok: boolean;
  batch: number;
  results: Array<{ index: number; id: string; status: string; error?: string }>;
}

export function TemplateTestBatchDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [sentBatches, setSentBatches] = useState<Record<number, SendResult>>({});

  const dryRun = useQuery({
    queryKey: ["template-test-batch", "dry-run"],
    enabled: open,
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("send-template-test-batch", { body: { dryRun: true } });
      if (error) throw error;
      return data as DryRunResult;
    },
  });

  const send = useMutation({
    mutationFn: async (batch: number) => {
      const { data, error } = await supabase.functions.invoke("send-template-test-batch", { body: { dryRun: false, batch } });
      if (error) throw error;
      return data as SendResult;
    },
    onSuccess: (result, batch) => {
      setSentBatches((prev) => ({ ...prev, [batch]: result }));
      const failed = result.results.filter((r) => r.status !== "sent").length;
      if (failed === 0) toast.success(`Batch ${batch} verstuurd (${result.results.length} mails)`);
      else toast.error(`Batch ${batch}: ${failed} van ${result.results.length} mislukt`);
    },
    onError: (e: Error) => toast.error("Versturen mislukt", { description: e.message }),
  });

  const info = dryRun.data;
  const batchNumbers = info ? Array.from({ length: info.batches }, (_, i) => i + 1) : [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Alle e-mails als test versturen</DialogTitle>
          <DialogDescription>
            Elke template met voorbeeldgegevens (dossier BV-2611-TEST) plus de mails uit de
            opbouwfuncties, in batches van tien naar het testadres. Onderwerpen beginnen met
            "[TEST n/totaal]"; in het Berichtencentrum staan ze als "Testmail".
          </DialogDescription>
        </DialogHeader>

        {dryRun.isLoading && <Skeleton className="h-24 w-full" />}
        {dryRun.error && (
          <p className="text-sm text-destructive">Lijst ophalen mislukt: {(dryRun.error as Error).message}</p>
        )}

        {info && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {info.total} mails naar <strong>{info.recipient}</strong>, in {info.batches} batches van {info.size}.
              Verstuur ze één voor één en kijk tussendoor de inbox na.
            </p>

            <div className="flex flex-wrap gap-2">
              {batchNumbers.map((b) => {
                const done = sentBatches[b];
                const first = (b - 1) * info.size + 1;
                const last = Math.min(b * info.size, info.total);
                return (
                  <Button
                    key={b}
                    variant={done ? "secondary" : "default"}
                    size="sm"
                    disabled={send.isPending}
                    onClick={() => send.mutate(b)}
                  >
                    {send.isPending && send.variables === b ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4 mr-2" />
                    )}
                    {done ? `Batch ${b} opnieuw` : `Batch ${b}`} ({first}–{last})
                  </Button>
                );
              })}
            </div>

            <ol className="space-y-1 text-sm">
              {info.items.map((item) => {
                const batch = Math.ceil(item.index / info.size);
                const result = sentBatches[batch]?.results.find((r) => r.index === item.index);
                return (
                  <li key={item.index} className="flex items-start gap-2">
                    <span className="w-8 shrink-0 text-right tabular-nums text-muted-foreground">{item.index}.</span>
                    <span className="min-w-0 flex-1">
                      <span className="font-medium">{item.name}</span>
                      <span className="text-muted-foreground"> — {item.subject}</span>
                      {item.unknownVariables.length > 0 && (
                        <span className="block text-xs text-muted-foreground">
                          zonder voorbeeldwaarde: {item.unknownVariables.join(", ")}
                        </span>
                      )}
                    </span>
                    {result && (
                      <Badge variant={result.status === "sent" ? "secondary" : "destructive"}>
                        {result.status === "sent" ? "verstuurd" : "mislukt"}
                      </Badge>
                    )}
                  </li>
                );
              })}
            </ol>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
