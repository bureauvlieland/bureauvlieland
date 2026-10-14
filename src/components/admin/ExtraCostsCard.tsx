import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertTriangle, Euro, Pencil, Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { formatEuro } from "@/lib/formatEuro";
import { invoiceCoverage, summarizeExtraCosts, type CostInvoiceLike, type ExtraCostLike } from "@/lib/extraCostLinks";

/** Wat de kaart van een kostenregel nodig heeft; de projectpagina geeft zijn eigen itemtype door. */
export interface ExtraCostRow extends ExtraCostLike {
  admin_price_notes: string | null;
}

interface ExtraCostsCardProps<T extends ExtraCostRow> {
  /** De kostenregels van het project (bureau-onderdelen met day_index -1). */
  costs: T[];
  /** Inkoopfacturen van het project, voor de inkoopkolom en de marge. */
  invoices: CostInvoiceLike[];
  onAdd: () => void;
  onEdit: (item: T) => void;
  onChanged: () => void;
}

/**
 * "Overige kosten" op de projectpagina: losse facturabele kosten buiten het
 * programma. Een regel kan aan een inkoopfactuur hangen; dan staat de inkoop
 * naast de verkoop en waarschuwt de kaart als de gekoppelde regels de factuur
 * niet dekken (`src/lib/extraCostLinks.ts`).
 */
export function ExtraCostsCard<T extends ExtraCostRow>({ costs, invoices, onAdd, onEdit, onChanged }: ExtraCostsCardProps<T>) {
  const coverage = invoiceCoverage(costs, invoices);
  const summary = summarizeExtraCosts(costs, invoices);

  const handleDelete = async (item: T) => {
    if (!confirm("Weet je zeker dat je deze kostenpost wilt verwijderen?")) return;
    const { error } = await supabase.from("program_request_items").delete().eq("id", item.id);
    if (error) {
      toast.error("Fout bij verwijderen");
      return;
    }
    toast.success("Kosten verwijderd");
    onChanged();
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 py-3">
        <div>
          <CardTitle className="text-base flex items-center gap-2">
            <Euro className="h-4 w-4" />
            Overige kosten
          </CardTitle>
          <CardDescription className="text-xs">Losse facturabele kosten buiten het programma</CardDescription>
        </div>
        <Button variant="outline" size="sm" onClick={onAdd}>
          <Plus className="h-4 w-4 mr-2" />
          Kosten toevoegen
        </Button>
      </CardHeader>
      <CardContent className="p-0">
        {costs.length === 0 ? (
          <div className="px-6 py-6 text-center text-sm text-muted-foreground">Nog geen losse kosten geregistreerd.</div>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Omschrijving</TableHead>
                  <TableHead>Toelichting</TableHead>
                  <TableHead>Inkoop</TableHead>
                  <TableHead className="text-right">Bedrag</TableHead>
                  <TableHead className="w-[60px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {costs.map((item) => {
                  const entry = item.purchase_invoice_id ? coverage.get(item.purchase_invoice_id) : undefined;
                  const shared = entry && entry.costs.length > 1;
                  return (
                    <TableRow key={item.id} className="cursor-pointer hover:bg-muted/50" onClick={() => onEdit(item)}>
                      <TableCell className="font-medium">{item.block_name}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">{item.admin_price_notes || "-"}</TableCell>
                      <TableCell className="text-sm">
                        {entry ? (
                          <div className="flex items-center gap-1.5">
                            {entry.shortfall > 0 && (
                              <AlertTriangle
                                className="h-4 w-4 shrink-0 text-destructive"
                                aria-label="Inkoop niet gedekt"
                              />
                            )}
                            <div>
                              <div className={entry.shortfall > 0 ? "text-destructive" : undefined}>
                                {entry.invoice.invoice_number} · {formatEuro(entry.purchase)}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {shared
                                  ? `gedeeld met ${entry.costs.length - 1} ${entry.costs.length === 2 ? "andere regel" : "andere regels"}`
                                  : entry.shortfall > 0
                                    ? `${formatEuro(entry.shortfall)} niet gedekt`
                                    : "gedekt"}
                                {shared && entry.shortfall > 0 ? `, ${formatEuro(entry.shortfall)} niet gedekt` : ""}
                              </div>
                            </div>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="font-medium text-right tabular-nums">{formatEuro(item.admin_price_override ?? 0)}</TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEdit(item)} title="Bewerken">
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => handleDelete(item)}
                            title="Verwijderen"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            <div className="flex flex-wrap items-center justify-end gap-x-6 gap-y-1 border-t px-4 py-3 text-sm">
              <span>
                <span className="text-muted-foreground">Verkoop </span>
                <span className="font-medium tabular-nums">{formatEuro(summary.sale)}</span>
              </span>
              {summary.linkedCostCount > 0 && (
                <>
                  <span>
                    <span className="text-muted-foreground">Inkoop gekoppeld </span>
                    <span className="font-medium tabular-nums">{formatEuro(summary.purchase)}</span>
                  </span>
                  <span>
                    <span className="text-muted-foreground">Marge </span>
                    <span className={summary.margin < 0 ? "font-medium tabular-nums text-destructive" : "font-medium tabular-nums"}>
                      {formatEuro(summary.margin)}
                    </span>
                    <span className="text-xs text-muted-foreground"> over {summary.linkedCostCount === 1 ? "1 gekoppelde regel" : `${summary.linkedCostCount} gekoppelde regels`}</span>
                  </span>
                </>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
