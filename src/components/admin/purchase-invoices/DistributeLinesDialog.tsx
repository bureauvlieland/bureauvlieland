import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Notice, Pill } from "@/components/system";
import { Loader2, Scissors, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  useMoveLinesToProject,
  usePurchaseInvoiceLinesByInvoice,
  useSplitInvoiceLines,
  type PurchaseInvoiceLineRow,
} from "@/hooks/usePurchaseInvoiceLines";
import { SplitLineEditor } from "./SplitLineEditor";
import {
  PROJECT_MATCH_LABELS,
  suggestProjectFromText,
  type ProjectSuggestion,
} from "@/lib/purchaseInvoiceProjectSuggestion";
import { ProjectPickerPopover } from "./ProjectPickerPopover";
import { projectLabel, usePickableProjects } from "@/hooks/usePickableProjects";
import type { PurchaseInvoiceWithRelations } from "@/types/purchaseInvoice";

/**
 * Verdelen van de regels van één inkoopfactuur over projecten (verzamelfactuur,
 * docs/plan-inkoopfacturen-doorbelasten.md §3.5). De kop blijft één factuur;
 * elke regel krijgt een project. Suggesties per regel: ons referentienummer of
 * de klantnaam in de regeltekst, en bij overtochten de boekingsreferentie op
 * een onderdeel. Eén verzamelregel voor meerdere klanten (Jan van Vlieland:
 * "arrangementen sept.") kan hier eerst in delen worden geknipt, elk deel op
 * zijn eigen project.
 */

interface Props {
  invoice: PurchaseInvoiceWithRelations | null;
  onClose: () => void;
}

const formatCurrency = (n: number) =>
  new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" }).format(n);

type Suggestion =
  | { projectId: string; reason: "booking"; matchedOn: string }
  | ProjectSuggestion;

export function DistributeLinesDialog({ invoice, onClose }: Props) {
  const open = !!invoice;
  const { data: lines, isLoading } = usePurchaseInvoiceLinesByInvoice(invoice?.id);
  const { data: projects } = usePickableProjects(open);
  const move = useMoveLinesToProject();
  const split = useSplitInvoiceLines();
  const [choice, setChoice] = useState<Record<string, string | null>>({});
  const [splittingId, setSplittingId] = useState<string | null>(null);

  // Boekingsreferenties (Doeksen) → onderdeel → project.
  const bookingRefs = useMemo(
    () => Array.from(new Set((lines ?? []).map((l) => l.booking_reference).filter((r): r is string => !!r))),
    [lines],
  );
  const { data: bookingProjects } = useQuery({
    queryKey: ["booking-reference-projects", bookingRefs.join(",")],
    enabled: bookingRefs.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("program_request_items")
        .select("booking_reference, request_id")
        .in("booking_reference", bookingRefs);
      if (error) throw error;
      const map = new Map<string, string>();
      for (const row of data ?? []) {
        if (row.booking_reference && row.request_id && !map.has(row.booking_reference)) {
          map.set(row.booking_reference, row.request_id);
        }
      }
      return map;
    },
  });

  const suggestions = useMemo(() => {
    const out = new Map<string, Suggestion>();
    if (!lines || !projects) return out;
    for (const line of lines) {
      const viaBooking = line.booking_reference ? bookingProjects?.get(line.booking_reference) : undefined;
      if (viaBooking) {
        out.set(line.id, { projectId: viaBooking, reason: "booking", matchedOn: line.booking_reference! });
        continue;
      }
      const s = suggestProjectFromText(line.description, projects);
      if (s) out.set(line.id, s);
    }
    return out;
  }, [lines, projects, bookingProjects]);

  useEffect(() => {
    if (!open) {
      setChoice({});
      setSplittingId(null);
      return;
    }
    if (!lines) return;
    setChoice((prev) => {
      const next = { ...prev };
      for (const line of lines) {
        if (!(line.id in next)) next[line.id] = line.request_id;
      }
      return next;
    });
  }, [open, lines]);

  const applyAllSuggestions = () => {
    setChoice((prev) => {
      const next = { ...prev };
      for (const [lineId, s] of suggestions) next[lineId] = s.projectId;
      return next;
    });
  };

  const changes = useMemo(
    () => (lines ?? []).filter((l) => (choice[l.id] ?? null) !== (l.request_id ?? null)),
    [lines, choice],
  );
  const changesWithCharges = changes.filter((l) => l.charge_status === "charged" || l.charge_status === "kept_quote");
  const projectCount = new Set(Object.values(choice).filter(Boolean)).size;

  const handleSave = async () => {
    if (!invoice || changes.length === 0) return;
    await move.mutateAsync({
      invoiceId: invoice.id,
      moves: changes.map((l) => ({ lineId: l.id, requestId: choice[l.id] ?? null })),
    });
    onClose();
  };

  const renderLine = (line: PurchaseInvoiceLineRow) => {
    const s = suggestions.get(line.id);
    const current = choice[line.id] ?? null;
    const suggestedProject = s ? projects?.find((p) => p.id === s.projectId) : undefined;
    const splittable = line.charge_status === "open" || line.charge_status === "skipped";
    return (
      <div key={line.id} className="rounded-md border px-3 py-2 text-sm space-y-1.5">
        <div className="flex items-baseline justify-between gap-3">
          <span className="font-medium truncate">{line.description || "Regel"}</span>
          <span className="text-xs text-muted-foreground tabular-nums shrink-0">
            {formatCurrency(Number(line.amount_incl_vat))} incl.
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ProjectPickerPopover
            value={current}
            onChange={(id) => setChoice((prev) => ({ ...prev, [line.id]: id }))}
            projects={projects}
            size="sm"
            className="max-w-[420px]"
          />
          {line.charge_status !== "open" && (
            <Pill tone={line.charge_status === "skipped" ? "neutral" : "success"}>
              {line.charge_status === "skipped" ? "Niet doorbelast" : "Al verwerkt"}
            </Pill>
          )}
          {splittable && splittingId !== line.id && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-xs"
              onClick={() => setSplittingId(line.id)}
              disabled={split.isPending}
              title="Deze regel in delen knippen, elk deel op een eigen project"
            >
              <Scissors className="h-3.5 w-3.5 mr-1" /> Splitsen
            </Button>
          )}
        </div>
        {splittingId === line.id && invoice && (
          <SplitLineEditor
            line={line}
            otherLines={(lines ?? []).filter(
              (o) => o.id !== line.id && (o.charge_status === "open" || o.charge_status === "skipped"),
            )}
            projects={projects}
            saving={split.isPending}
            onCancel={() => setSplittingId(null)}
            onSave={async (splits) => {
              await split.mutateAsync({ invoiceId: invoice.id, splits });
              setSplittingId(null);
            }}
          />
        )}
        {s && suggestedProject && s.projectId !== current && (
          <button
            type="button"
            className="text-xs text-primary hover:underline flex items-start gap-1 text-left"
            onClick={() => setChoice((prev) => ({ ...prev, [line.id]: s.projectId }))}
          >
            <Sparkles className="h-3 w-3 mt-0.5 shrink-0" />
            <span>
              Suggestie: {projectLabel(suggestedProject)}
              <span className="block text-muted-foreground">
                op grond van {s.reason === "booking" ? "de boekingsreferentie" : `de ${PROJECT_MATCH_LABELS[s.reason]}`}:
                {" "}&ldquo;{s.matchedOn}&rdquo;
              </span>
            </span>
          </button>
        )}
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && !move.isPending && !split.isPending && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Regels verdelen over projecten</DialogTitle>
          <DialogDescription>
            {invoice
              ? `${invoice.partner?.name ?? invoice.partner_id} · factuur ${invoice.invoice_number} · ${formatCurrency(Number(invoice.amount_incl_vat ?? 0))} incl.`
              : ""}
            {" "}De factuur blijft één betaling; elke regel komt in het werkblad van zijn project.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : !lines || lines.length === 0 ? (
          <Notice tone="info">
            Deze factuur heeft geen orderregels. Maak ze eerst aan in het werkblad Doorbelasten van het project.
          </Notice>
        ) : (
          <div className="space-y-3">
            {suggestions.size > 0 && (
              <div className="flex justify-end">
                <Button variant="outline" size="sm" onClick={applyAllSuggestions}>
                  <Sparkles className="h-3.5 w-3.5 mr-1" />
                  Alle suggesties overnemen ({suggestions.size})
                </Button>
              </div>
            )}
            <div className="space-y-2">{lines.map(renderLine)}</div>
            {changesWithCharges.length > 0 && (
              <Notice tone="warning">
                {changesWithCharges.length === 1 ? "Eén verplaatste regel is" : `${changesWithCharges.length} verplaatste regels zijn`} al
                doorbelast; de klantregels daarvan gaan weg en de regel begint op het nieuwe project opnieuw.
              </Notice>
            )}
            <p className="text-xs text-muted-foreground">
              {projectCount <= 1
                ? "Alle regels op één project: dat project komt op de factuur te staan."
                : `${projectCount} projecten: de factuur wordt een verzamelfactuur zonder project op de kop. Snelstart en de betaalbatch blijven op de kop werken.`}
            </p>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={move.isPending}>Annuleren</Button>
          <Button onClick={handleSave} disabled={move.isPending || changes.length === 0}>
            {move.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Verdeling opslaan{changes.length > 0 ? ` (${changes.length})` : ""}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
