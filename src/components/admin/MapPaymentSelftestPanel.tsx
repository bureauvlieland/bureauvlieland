import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { Copy, Loader2, PlayCircle } from "lucide-react";

interface Props {
  tenantSlug: string;
  partnerName?: string | null;
}

type SelftestResult =
  | "ok"
  | "no_api_key"
  | "no_activity"
  | "return_url_not_whitelisted"
  | "booking_failed"
  | "payment_unavailable";

const RESULT_LABELS: Record<SelftestResult, { label: string; tone: "ok" | "warn" | "error" }> = {
  ok: { label: "Whitelist OK — online betalen werkt", tone: "ok" },
  return_url_not_whitelisted: { label: "Return-URL niet toegestaan in MAP", tone: "error" },
  no_api_key: { label: "Geen API-sleutel ingesteld", tone: "error" },
  no_activity: { label: "Geen boekbaar moment gevonden om te testen", tone: "warn" },
  booking_failed: { label: "Testboeking kon niet worden aangemaakt", tone: "error" },
  payment_unavailable: { label: "Betaling starten mislukte (andere fout)", tone: "error" },
};

const RETURN_HOSTS = [
  "bureauvlieland.nl",
  "www.bureauvlieland.nl",
  "visitvlieland.nl",
  "www.visitvlieland.nl",
];

const INSTRUCTION = `Hoi,

Om gasten via onze site direct bij jullie te laten boeken en betalen, moet in MijnActiviteitenPlanner één instelling aan staan.

1. Ga naar Instellingen > API Keys.
2. Klik bij de sleutel die Bureau Vlieland gebruikt op de knop RETURN-URLS.
3. Vul daar alleen de hosts in (dus zonder https:// en zonder pad), elk op een eigen regel:

${RETURN_HOSTS.join("\n")}

4. Opslaan. In de kolom RETURN-URLS staan dan deze hosts in plaats van "geen".

Zonder deze instelling weigert MAP elke betaling met de melding "returnUrl ... not whitelisted".

Dank!`;

interface EventRow {
  id: string;
  created_at: string;
  status: string;
  booking_id: number | null;
}

export function MapPaymentSelftestPanel({ tenantSlug, partnerName }: Props) {
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState<SelftestResult | null>(null);
  const [detail, setDetail] = useState<string | null>(null);
  const [events, setEvents] = useState<EventRow[]>([]);

  const loadEvents = async () => {
    const { data } = await supabase
      .from("booking_events")
      .select("id, created_at, status, booking_id")
      .eq("tenant_slug", tenantSlug)
      .order("created_at", { ascending: false })
      .limit(8);
    setEvents((data as EventRow[] | null) ?? []);
  };

  useEffect(() => {
    void loadEvents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantSlug]);

  const runTest = async () => {
    setTesting(true);
    setResult(null);
    setDetail(null);
    try {
      const { data, error } = await supabase.functions.invoke("map-payment-selftest", {
        body: { tenantSlug },
      });
      if (error) throw error;
      const payload = data as { result?: SelftestResult; detail?: string | null };
      if (!payload?.result) throw new Error("Onbekend antwoord van de test.");
      setResult(payload.result);
      setDetail(payload.detail ?? null);
      if (payload.result === "ok") toast.success("Online betalen werkt bij deze aanbieder.");
      else toast.error(RESULT_LABELS[payload.result].label);
      void loadEvents();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "De test kon niet worden uitgevoerd.");
    } finally {
      setTesting(false);
    }
  };

  const info = result ? RESULT_LABELS[result] : null;

  return (
    <div className="space-y-3 rounded-md border p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="space-y-0.5">
          <Label>Online betalen testen</Label>
          <p className="text-xs text-muted-foreground">
            Maakt één testboeking bij {partnerName || "deze aanbieder"}, probeert de betaling te
            starten en annuleert de boeking direct weer. Er wordt nooit betaald.
          </p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={runTest} disabled={testing}>
          {testing ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <PlayCircle className="mr-2 h-4 w-4" />
          )}
          Test online betalen
        </Button>
      </div>

      {info && (
        <div className="space-y-1">
          <Badge
            variant={
              info.tone === "ok" ? "default" : info.tone === "warn" ? "secondary" : "destructive"
            }
          >
            {info.label}
          </Badge>
          {detail && <p className="text-xs text-muted-foreground break-all">{detail}</p>}
        </div>
      )}

      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium">Instructie voor de aanbieder</p>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              void navigator.clipboard
                .writeText(INSTRUCTION)
                .then(() => toast.success("Instructietekst gekopieerd."))
                .catch(() => toast.error("Kopiëren lukte niet."));
            }}
          >
            <Copy className="mr-2 h-3.5 w-3.5" />
            Kopieer
          </Button>
        </div>
        <pre className="max-h-40 overflow-auto whitespace-pre-wrap rounded bg-muted p-2 text-xs text-muted-foreground">
          {INSTRUCTION}
        </pre>
      </div>

      <div className="space-y-1">
        <p className="text-xs font-medium">Laatste boekingsgebeurtenissen</p>
        {events.length === 0 ? (
          <p className="text-xs text-muted-foreground">Nog geen boekingen of tests gelogd.</p>
        ) : (
          <ul className="space-y-1 text-xs text-muted-foreground">
            {events.map((e) => (
              <li key={e.id} className="flex flex-wrap gap-2">
                <span className="tabular-nums">
                  {format(new Date(e.created_at), "d MMM HH:mm", { locale: nl })}
                </span>
                <span className="font-medium">{e.status}</span>
                {e.booking_id && <span>#{e.booking_id}</span>}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
