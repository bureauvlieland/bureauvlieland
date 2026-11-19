import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Notice, Pill } from "@/components/system";
import { FileText, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { useNavigate } from "react-router-dom";
import type { ProjectInvoiceSpec } from "@/lib/projectInvoiceSpec";
import { activeProformaLines, proformaDeltaInclVat, totalsFromProformaLines, type Proforma, type ProformaLine } from "@/lib/proforma";

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" }).format(amount);

interface ProformaCardProps {
  requestId: string;
  proforma: Proforma | null;
  lines: ProformaLine[];
  spec: ProjectInvoiceSpec | null;
  loading: boolean;
  busy: boolean;
  isAccepted: boolean;
  canCreate: boolean;
  onCreate: () => void;
}

/**
 * Fase 1 van docs/plan-proforma-factuur.md: de proforma bestaat en loopt
 * parallel aan de berekening. Deze kaart toont of hij er is, wanneer de
 * offerte is bevroren en of zijn totaal gelijk is aan de berekening. In fase
 * 2 wordt dit het werkblad zelf.
 */
export function ProformaCard({ requestId, proforma, lines, spec, loading, busy, isAccepted, canCreate, onCreate }: ProformaCardProps) {
  const navigate = useNavigate();
  const active = activeProformaLines(lines);
  const totals = totalsFromProformaLines(lines);
  const delta = proformaDeltaInclVat(lines, spec);
  const hiddenCount = lines.filter((l) => l.line_status === "hidden").length;
  const replacedCount = lines.filter((l) => l.line_status === "replaced").length;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Proforma
              {proforma && (
                <Pill tone={delta === 0 ? "success" : delta == null ? "neutral" : "warning"}>
                  {delta == null ? "Berekening laadt" : delta === 0 ? "Gelijk aan berekening" : `Verschil ${formatCurrency(delta)}`}
                </Pill>
              )}
            </CardTitle>
            <CardDescription>
              De klantfactuur in wording: ontstaat bij akkoord uit de offerte en volgt de offerte zolang een regel niet is vervangen.
            </CardDescription>
          </div>
          {proforma && (
            <Button variant="outline" size="sm" onClick={() => navigate(`/admin/projecten/${requestId}/factuur`)}>
              Bekijk voorbeeld
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading ? (
          <p className="text-sm text-muted-foreground flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" /> Laden…
          </p>
        ) : !proforma ? (
          isAccepted ? (
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm text-muted-foreground">Dit project is akkoord, maar heeft nog geen proforma.</p>
              <Button size="sm" onClick={onCreate} disabled={!canCreate || busy}>
                {busy && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
                Proforma aanmaken
              </Button>
            </div>
          ) : (
            <Notice tone="info">Nog geen akkoord van de klant. De proforma ontstaat zodra de offerte akkoord is.</Notice>
          )
        ) : (
          <div className="grid gap-3 sm:grid-cols-3 text-sm">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Offerte bevroren</p>
              <p className="font-medium">{format(new Date(proforma.accepted_at), "d MMM yyyy HH:mm", { locale: nl })}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Regels</p>
              <p className="font-medium">
                {active.length} actief
                {replacedCount > 0 ? `, ${replacedCount} vervangen` : ""}
                {hiddenCount > 0 ? `, ${hiddenCount} verborgen` : ""}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Totaal incl. btw</p>
              <p className="font-medium tabular-nums">
                {formatCurrency(totals.inclVat)}
                {spec && delta !== 0 && (
                  <span className="text-muted-foreground font-normal"> · berekening {formatCurrency(spec.totals.inclVat)}</span>
                )}
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
