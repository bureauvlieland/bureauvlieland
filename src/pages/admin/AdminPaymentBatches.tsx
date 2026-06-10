import { useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Banknote, Download, AlertTriangle, Loader2, FileDown } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { nl } from "date-fns/locale";

function nextWorkingDay(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  while (d.getDay() === 0 || d.getDay() === 6) d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

function triggerDownload(filename: string, base64: string) {
  const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
  const blob = new Blob([bytes], { type: "application/xml" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export default function AdminPaymentBatches() {
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<string[]>([]);
  const [executionDate, setExecutionDate] = useState<string>(nextWorkingDay());
  const [isGenerating, setIsGenerating] = useState(false);

  const { data: candidates, isLoading } = useQuery({
    queryKey: ["payment-batch-candidates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("partner_purchase_invoices")
        .select(`
          id, invoice_number, invoice_date, amount_incl_vat, description, status, payment_batch_id,
          partners!inner(id, name, iban, pays_by_direct_debit),
          program_requests!inner(reference_number)
        `)
        .eq("status", "forwarded")
        .eq("partners.pays_by_direct_debit", false)
        .is("payment_batch_id", null)
        .order("invoice_date", { ascending: true });
      if (error) throw error;
      return data || [];
    },
  });

  const { data: batches } = useQuery({
    queryKey: ["payment-batches"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payment_batches")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  // Default: select all with valid IBAN on first load
  const allEligible = (candidates || []).filter((c: any) => !!c.partners?.iban).map((c: any) => c.id);
  const allSelected = allEligible.length > 0 && selected.length === allEligible.length;

  const toggleAll = (checked: boolean) => {
    setSelected(checked ? allEligible : []);
  };

  const toggleOne = (id: string, checked: boolean) => {
    setSelected((prev) => (checked ? [...prev, id] : prev.filter((x) => x !== id)));
  };

  const selectedRows = (candidates || []).filter((c: any) => selected.includes(c.id));
  const selectedTotal = selectedRows.reduce((s, r: any) => s + Number(r.amount_incl_vat || 0), 0);

  const handleGenerate = async () => {
    if (selected.length === 0) {
      toast.error("Selecteer minstens één factuur");
      return;
    }
    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-payment-batch", {
        body: { invoiceIds: selected, executionDate },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      triggerDownload(data.filename, data.xmlBase64);
      toast.success(`Batch ${data.batchReference} aangemaakt (€${Number(data.totalAmount).toFixed(2)})`);
      setSelected([]);
      queryClient.invalidateQueries({ queryKey: ["payment-batch-candidates"] });
      queryClient.invalidateQueries({ queryKey: ["payment-batches"] });
      queryClient.invalidateQueries({ queryKey: ["purchase-invoices"] });
    } catch (e: any) {
      toast.error(e.message || "Genereren mislukt");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownloadBatch = async (filePath: string, filename: string) => {
    const { data, error } = await supabase.storage.from("payment-batches").download(filePath);
    if (error || !data) {
      toast.error("Download mislukt");
      return;
    }
    const url = URL.createObjectURL(data);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleCancelBatch = async (id: string) => {
    if (!confirm("Batch annuleren? De facturen komen weer beschikbaar voor een nieuwe batch.")) return;
    const { error: e1 } = await supabase
      .from("partner_purchase_invoices")
      .update({ payment_batch_id: null })
      .eq("payment_batch_id", id);
    if (e1) {
      toast.error(e1.message);
      return;
    }
    const { error: e2 } = await supabase
      .from("payment_batches")
      .update({ status: "cancelled" })
      .eq("id", id);
    if (e2) {
      toast.error(e2.message);
      return;
    }
    toast.success("Batch geannuleerd");
    queryClient.invalidateQueries({ queryKey: ["payment-batch-candidates"] });
    queryClient.invalidateQueries({ queryKey: ["payment-batches"] });
  };

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Banknote className="h-8 w-8" />
            ING Betaalbatches
          </h1>
          <p className="text-muted-foreground">
            Genereer een SEPA-bestand (pain.001) op basis van doorgestuurde inkoopfacturen en upload het in Mijn ING Zakelijk.
          </p>
        </div>

        <Tabs defaultValue="new">
          <TabsList>
            <TabsTrigger value="new">Nieuwe batch ({allEligible.length})</TabsTrigger>
            <TabsTrigger value="history">Historie ({(batches || []).length})</TabsTrigger>
          </TabsList>

          <TabsContent value="new" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Selectie</CardTitle>
                <CardDescription>
                  Standaard: alle naar Snelstart doorgestuurde inkoopfacturen die nog niet in een batch zitten.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap items-end gap-4">
                  <div className="space-y-1">
                    <label className="text-sm font-medium">Uitvoeringsdatum</label>
                    <Input
                      type="date"
                      value={executionDate}
                      onChange={(e) => setExecutionDate(e.target.value)}
                      className="w-48"
                    />
                  </div>
                  <div className="ml-auto text-right">
                    <div className="text-sm text-muted-foreground">Geselecteerd</div>
                    <div className="text-2xl font-bold">
                      €{selectedTotal.toLocaleString("nl-NL", { minimumFractionDigits: 2 })}
                    </div>
                    <div className="text-xs text-muted-foreground">{selected.length} transacties</div>
                  </div>
                  <Button onClick={handleGenerate} disabled={isGenerating || selected.length === 0}>
                    {isGenerating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <FileDown className="h-4 w-4 mr-2" />}
                    Genereer SEPA-bestand
                  </Button>
                </div>

                {isLoading ? (
                  <div className="text-center py-8 text-muted-foreground">Laden…</div>
                ) : (candidates || []).length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Geen openstaande inkoopfacturen om te batchen. Stuur eerst facturen door naar Snelstart.
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-10">
                          <Checkbox checked={allSelected} onCheckedChange={(c) => toggleAll(!!c)} />
                        </TableHead>
                        <TableHead>Factuur</TableHead>
                        <TableHead>Partner</TableHead>
                        <TableHead>IBAN</TableHead>
                        <TableHead>Project</TableHead>
                        <TableHead className="text-right">Bedrag incl.</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(candidates || []).map((c: any) => {
                        const hasIban = !!c.partners?.iban;
                        return (
                          <TableRow key={c.id} className={!hasIban ? "opacity-60" : ""}>
                            <TableCell>
                              <Checkbox
                                disabled={!hasIban}
                                checked={selected.includes(c.id)}
                                onCheckedChange={(ch) => toggleOne(c.id, !!ch)}
                              />
                            </TableCell>
                            <TableCell className="font-medium">
                              {c.invoice_number}
                              <div className="text-xs text-muted-foreground">
                                {format(new Date(c.invoice_date), "d MMM yyyy", { locale: nl })}
                              </div>
                            </TableCell>
                            <TableCell>{c.partners?.name}</TableCell>
                            <TableCell className="font-mono text-xs">
                              {hasIban ? (
                                c.partners.iban
                              ) : (
                                <span className="inline-flex items-center gap-1 text-amber-600">
                                  <AlertTriangle className="h-3 w-3" />
                                  IBAN ontbreekt
                                </span>
                              )}
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                              {c.program_requests?.reference_number || "-"}
                            </TableCell>
                            <TableCell className="text-right font-mono">
                              €{Number(c.amount_incl_vat).toFixed(2)}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history" className="space-y-4">
            <Card>
              <CardContent className="pt-6">
                {(batches || []).length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">Nog geen batches gegenereerd.</div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Referentie</TableHead>
                        <TableHead>Aangemaakt</TableHead>
                        <TableHead>Uitvoeringsdatum</TableHead>
                        <TableHead className="text-right">Aantal</TableHead>
                        <TableHead className="text-right">Bedrag</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Acties</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(batches || []).map((b: any) => (
                        <TableRow key={b.id}>
                          <TableCell className="font-medium">{b.batch_reference}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {format(new Date(b.created_at), "d MMM yyyy HH:mm", { locale: nl })}
                          </TableCell>
                          <TableCell>{format(new Date(b.requested_execution_date), "d MMM yyyy", { locale: nl })}</TableCell>
                          <TableCell className="text-right">{b.transaction_count}</TableCell>
                          <TableCell className="text-right font-mono">
                            €{Number(b.total_amount).toFixed(2)}
                          </TableCell>
                          <TableCell>
                            {b.status === "generated" ? (
                              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                                Gegenereerd
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="bg-slate-100 text-slate-600">
                                Geannuleerd
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              {b.xml_file_path && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleDownloadBatch(b.xml_file_path, `${b.batch_reference}.xml`)}
                                  title="Download XML"
                                >
                                  <Download className="h-4 w-4" />
                                </Button>
                              )}
                              {b.status === "generated" && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleCancelBatch(b.id)}
                                  className="text-destructive hover:text-destructive"
                                >
                                  Annuleer
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
