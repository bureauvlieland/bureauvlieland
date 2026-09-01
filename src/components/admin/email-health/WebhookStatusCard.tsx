/**
 * Webhook-status: de feedbackketen van Mailjet (afgeleverd / geopend /
 * geklikt / bounce / spam / afmelding) liep van 8 juli t/m 1 september 2026
 * dood omdat de URL in Mailjet het verplichte token miste. Deze kaart toont
 * de kant-en-klare URL, de laatst ontvangen events en de laatste geweigerde
 * pogingen, plus een testknop die de hele keten aanroept.
 */
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertTriangle, CheckCircle2, Copy, Eye, EyeOff, PlayCircle, RefreshCw } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { nl } from "date-fns/locale";
import { toast } from "sonner";

type WebhookAttempt = {
  received_at: string;
  authorized: boolean;
  reason: string;
  event_count: number;
  source_ip: string | null;
};

type WebhookStatus = {
  ok: boolean;
  tokenConfigured: boolean;
  webhookUrl: string | null;
  lastSentAt: string | null;
  lastDelivered: string | null;
  lastOpened: string | null;
  lastClicked: string | null;
  lastBounced: string | null;
  suppressionCount: number;
  attempts: WebhookAttempt[];
  missingMessageIdByType: Array<{ email_type: string; count: number; last: string }>;
};

function fmt(value: string | null) {
  if (!value) return "nooit";
  return `${format(new Date(value), "d MMM yyyy HH:mm", { locale: nl })} (${formatDistanceToNow(new Date(value), { addSuffix: true, locale: nl })})`;
}

export function WebhookStatusCard() {
  const [revealed, setRevealed] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; hint?: string; status?: number } | null>(null);

  const { data, isFetching, refetch } = useQuery({
    queryKey: ["mailjet-webhook-status"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("mailjet-webhook-status", {
        body: { action: "status" },
      });
      if (error) throw error;
      return data as WebhookStatus;
    },
  });

  const lastEvent = [data?.lastDelivered, data?.lastOpened, data?.lastClicked, data?.lastBounced]
    .filter(Boolean)
    .sort()
    .pop() ?? null;

  const stale =
    !lastEvent || Date.now() - new Date(lastEvent).getTime() > 48 * 3600_000;

  const runSelftest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const { data: result, error } = await supabase.functions.invoke("mailjet-webhook-status", {
        body: { action: "selftest" },
      });
      if (error) throw error;
      const r = result as { ok: boolean; hint?: string; status?: number; error?: string };
      setTestResult(r);
      if (r.ok) toast.success("Webhook is bereikbaar en accepteert het token.");
      else toast.error(r.hint || r.error || "Webhooktest faalde.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Webhooktest faalde.");
    } finally {
      setTesting(false);
    }
  };

  const copyUrl = async () => {
    if (!data?.webhookUrl) return;
    await navigator.clipboard.writeText(data.webhookUrl);
    toast.success("Webhook-URL gekopieerd — zet deze in Mailjet bij alle event-types.");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {stale ? (
            <AlertTriangle className="h-4 w-4 text-destructive" />
          ) : (
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          )}
          Webhook-status (Mailjet-feedback)
          <Button
            variant="ghost"
            size="icon"
            className="ml-auto"
            onClick={() => refetch()}
            disabled={isFetching}
          >
            <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
          </Button>
        </CardTitle>
        <CardDescription>
          Zonder deze events weten we niet of mail is afgeleverd en worden onbereikbare adressen niet
          geblokkeerd.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {stale && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Er komt geen terugkoppeling binnen</AlertTitle>
            <AlertDescription>
              Laatste event: {fmt(lastEvent)}. Zet de onderstaande URL in Mailjet → Account settings →
              Event notifications (webhook) voor alle event-types: sent, open, click, bounce, blocked,
              spam en unsub. Eerdere events komen niet terug; vanaf dat moment loopt het weer live.
            </AlertDescription>
          </Alert>
        )}

        <div className="grid gap-2 sm:grid-cols-2 text-sm">
          <div>Laatste mail verstuurd: <span className="text-muted-foreground">{fmt(data?.lastSentAt ?? null)}</span></div>
          <div>Laatst afgeleverd: <span className="text-muted-foreground">{fmt(data?.lastDelivered ?? null)}</span></div>
          <div>Laatst geopend: <span className="text-muted-foreground">{fmt(data?.lastOpened ?? null)}</span></div>
          <div>Laatst geklikt: <span className="text-muted-foreground">{fmt(data?.lastClicked ?? null)}</span></div>
          <div>Laatste bounce: <span className="text-muted-foreground">{fmt(data?.lastBounced ?? null)}</span></div>
          <div>Geblokkeerde adressen: <span className="text-muted-foreground">{data?.suppressionCount ?? 0}</span></div>
        </div>

        <div className="space-y-2">
          <div className="text-sm font-medium">Webhook-URL voor Mailjet</div>
          {data?.tokenConfigured ? (
            <div className="flex items-center gap-2">
              <code className="flex-1 truncate rounded bg-muted px-2 py-1 text-xs">
                {revealed ? data.webhookUrl : (data.webhookUrl ?? "").replace(/token=[^&]+/, "token=••••••••")}
              </code>
              <Button variant="outline" size="icon" onClick={() => setRevealed((v) => !v)}>
                {revealed ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
              <Button variant="outline" size="icon" onClick={copyUrl}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>Het webhook-token ontbreekt op de server.</AlertDescription>
            </Alert>
          )}
          <Button variant="secondary" size="sm" onClick={runSelftest} disabled={testing}>
            <PlayCircle className="mr-2 h-4 w-4" />
            {testing ? "Testen…" : "Test webhook"}
          </Button>
          {testResult && (
            <p className={`text-xs ${testResult.ok ? "text-emerald-600" : "text-destructive"}`}>
              {testResult.hint ?? (testResult.ok ? "Geslaagd" : "Gefaald")}
              {testResult.status ? ` (HTTP ${testResult.status})` : ""}
            </p>
          )}
        </div>

        {(data?.missingMessageIdByType?.length ?? 0) > 0 && (
          <div className="space-y-2">
            <div className="text-sm font-medium">Sends zonder MessageID (60 dagen)</div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Aantal</TableHead>
                  <TableHead>Laatste</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data!.missingMessageIdByType.map((row) => (
                  <TableRow key={row.email_type}>
                    <TableCell className="font-mono text-xs">{row.email_type}</TableCell>
                    <TableCell className="text-right">{row.count}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(row.last), { addSuffix: true, locale: nl })}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {(data?.attempts?.length ?? 0) > 0 && (
          <div className="space-y-2">
            <div className="text-sm font-medium">Laatste inkomende pogingen</div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tijd</TableHead>
                  <TableHead>Resultaat</TableHead>
                  <TableHead>Reden</TableHead>
                  <TableHead className="text-right">Events</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data!.attempts.map((a, i) => (
                  <TableRow key={`${a.received_at}-${i}`}>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {formatDistanceToNow(new Date(a.received_at), { addSuffix: true, locale: nl })}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={a.authorized ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800"}>
                        {a.authorized ? "geaccepteerd" : "geweigerd"}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-xs">{a.reason}</TableCell>
                    <TableCell className="text-right">{a.event_count}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
