import { useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Package,
  Search,
  Mail,
  Check,
  Download,
  Clock,
  CheckCircle,
  ArrowRight,
  Euro,
} from "lucide-react";
import { Link } from "react-router-dom";
import { usePurchaseInvoices } from "@/hooks/usePurchaseInvoices";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { toast } from "sonner";
import { ForwardToAccountingDialog } from "@/components/admin/ForwardToAccountingDialog";
import type { PurchaseInvoiceWithRelations, PurchaseInvoiceStatus } from "@/types/purchaseInvoice";

export default function AdminPurchaseInvoices() {
  const [selectedRequestId, setSelectedRequestId] = useState<string>("all");
  const [selectedPartnerId, setSelectedPartnerId] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<PurchaseInvoiceStatus | "all">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedInvoices, setSelectedInvoices] = useState<string[]>([]);
  const [forwardDialogInvoice, setForwardDialogInvoice] = useState<PurchaseInvoiceWithRelations | null>(null);

  const { invoices, isLoading, stats, markAsPaid, markAsForwarded, getDownloadUrl } = usePurchaseInvoices({
    requestId: selectedRequestId !== "all" ? selectedRequestId : undefined,
    partnerId: selectedPartnerId !== "all" ? selectedPartnerId : undefined,
    status: selectedStatus,
    search: searchQuery || undefined,
  });

  // Fetch all partners for filter dropdown
  const { data: partners } = useQuery({
    queryKey: ["partners-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("partners")
        .select("id, name")
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  // Fetch all bureau_central projects for filter dropdown
  const { data: projects } = useQuery({
    queryKey: ["bureau-central-projects"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("program_requests")
        .select("id, reference_number, customer_name, customer_company")
        .eq("invoicing_mode", "bureau_central")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedInvoices(invoices?.map(i => i.id) || []);
    } else {
      setSelectedInvoices([]);
    }
  };

  const handleSelectInvoice = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedInvoices(prev => [...prev, id]);
    } else {
      setSelectedInvoices(prev => prev.filter(i => i !== id));
    }
  };

  const handleDownloadPdf = async (filePath: string) => {
    const url = await getDownloadUrl(filePath);
    if (url) {
      window.open(url, "_blank");
    }
  };

  const handleMarkAsPaid = async (id: string) => {
    await markAsPaid.mutateAsync(id);
  };

  const getStatusBadge = (invoice: PurchaseInvoiceWithRelations) => {
    switch (invoice.status) {
      case "pending":
        return (
          <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
            <Clock className="h-3 w-3 mr-1" />
            In afwachting
          </Badge>
        );
      case "forwarded":
        return (
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
            <ArrowRight className="h-3 w-3 mr-1" />
            Doorgestuurd {invoice.forwarded_to_accounting_at && format(new Date(invoice.forwarded_to_accounting_at), "EEE d MMM", { locale: nl })}
          </Badge>
        );
      case "paid":
        return (
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
            <CheckCircle className="h-3 w-3 mr-1" />
            Betaald {invoice.paid_at && format(new Date(invoice.paid_at), "d MMM", { locale: nl })}
          </Badge>
        );
    }
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="p-6 space-y-6">
          <Skeleton className="h-10 w-64" />
          <div className="grid grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24" />)}
          </div>
          <Skeleton className="h-96" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Package className="h-8 w-8" />
            Inkoopfacturen
          </h1>
          <p className="text-muted-foreground">
            Facturen van partners aan Bureau Vlieland
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="border-amber-200 bg-amber-50/50">
            <CardHeader className="pb-2">
              <CardDescription>In afwachting</CardDescription>
              <CardTitle className="text-2xl text-amber-700">{stats.pending}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="border-blue-200 bg-blue-50/50">
            <CardHeader className="pb-2">
              <CardDescription>Doorgestuurd</CardDescription>
              <CardTitle className="text-2xl text-blue-700">{stats.forwarded}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="border-green-200 bg-green-50/50">
            <CardHeader className="pb-2">
              <CardDescription>Betaald</CardDescription>
              <CardTitle className="text-2xl text-green-700">{stats.paid}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="border-slate-200">
            <CardHeader className="pb-2">
              <CardDescription>Totaal excl. BTW</CardDescription>
              <CardTitle className="text-2xl flex items-center gap-1">
                <Euro className="h-5 w-5" />
                {stats.totalAmount.toLocaleString("nl-NL", { minimumFractionDigits: 2 })}
              </CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">Filters</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              <Select value={selectedRequestId} onValueChange={setSelectedRequestId}>
                <SelectTrigger className="w-[250px]">
                  <SelectValue placeholder="Alle projecten" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle projecten</SelectItem>
                  {projects?.map(project => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.reference_number || "Geen ref"} - {project.customer_company || project.customer_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={selectedPartnerId} onValueChange={setSelectedPartnerId}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Alle partners" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle partners</SelectItem>
                  {partners?.map(partner => (
                    <SelectItem key={partner.id} value={partner.id}>
                      {partner.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={selectedStatus} onValueChange={(v) => setSelectedStatus(v as PurchaseInvoiceStatus | "all")}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Alle statussen" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle statussen</SelectItem>
                  <SelectItem value="pending">In afwachting</SelectItem>
                  <SelectItem value="forwarded">Doorgestuurd</SelectItem>
                  <SelectItem value="paid">Betaald</SelectItem>
                </SelectContent>
              </Select>

              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Zoek factuurnummer..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Invoices Table */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Facturen</CardTitle>
              <CardDescription>{invoices?.length || 0} facturen gevonden</CardDescription>
            </div>
            {selectedInvoices.length > 0 && (
              <Button
                onClick={() => {
                  // Bulk forward - open dialog for first, then mark rest
                  const pendingInvoices = invoices?.filter(i => selectedInvoices.includes(i.id) && i.status === "pending");
                  if (pendingInvoices && pendingInvoices.length > 0) {
                    toast.info(`${pendingInvoices.length} facturen geselecteerd voor doorsturen`);
                    // For now, just forward them one by one
                    pendingInvoices.forEach(async (invoice) => {
                      await markAsForwarded.mutateAsync(invoice.id);
                    });
                    toast.success("Facturen doorgestuurd naar boekhouding");
                    setSelectedInvoices([]);
                  }
                }}
              >
                <Mail className="h-4 w-4 mr-2" />
                Bulk doorsturen ({selectedInvoices.length})
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {!invoices || invoices.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Geen inkoopfacturen gevonden</p>
                <p className="text-sm">
                  Inkoopfacturen worden hier getoond zodra partners facturen registreren voor bureau_central projecten.
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox
                        checked={selectedInvoices.length === invoices.length && invoices.length > 0}
                        onCheckedChange={handleSelectAll}
                      />
                    </TableHead>
                    <TableHead>Factuurnummer</TableHead>
                    <TableHead>Partner</TableHead>
                    <TableHead>Project</TableHead>
                    <TableHead>Omschrijving</TableHead>
                    <TableHead className="text-right">Bedrag excl.</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Acties</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoices.map((invoice) => (
                    <TableRow key={invoice.id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedInvoices.includes(invoice.id)}
                          onCheckedChange={(checked) => handleSelectInvoice(invoice.id, !!checked)}
                        />
                      </TableCell>
                      <TableCell className="font-medium">
                        <div>
                          {invoice.invoice_number}
                          <div className="text-xs text-muted-foreground">
                            {format(new Date(invoice.invoice_date), "d MMM yyyy", { locale: nl })}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{invoice.partner?.name}</TableCell>
                      <TableCell>
                        <Link
                          to={`/admin/projecten/${invoice.request_id}`}
                          className="text-primary hover:underline"
                        >
                          {invoice.program_request?.reference_number || "Geen ref"}
                        </Link>
                        <div className="text-xs text-muted-foreground">
                          {invoice.program_request?.customer_company || invoice.program_request?.customer_name}
                        </div>
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate">
                        {invoice.description || invoice.program_request_item?.block_name || "-"}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        €{Number(invoice.amount_excl_vat).toLocaleString("nl-NL", { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell>{getStatusBadge(invoice)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          {invoice.file_path && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDownloadPdf(invoice.file_path!)}
                              title="Download PDF"
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                          )}
                          {invoice.status === "pending" && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setForwardDialogInvoice(invoice)}
                              title="Doorsturen naar Snelstart"
                            >
                              <Mail className="h-4 w-4" />
                            </Button>
                          )}
                          {invoice.status !== "paid" && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleMarkAsPaid(invoice.id)}
                              title="Markeer als betaald"
                            >
                              <Check className="h-4 w-4" />
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
      </div>

      {/* Forward to Accounting Dialog */}
      <ForwardToAccountingDialog
        invoice={forwardDialogInvoice}
        onClose={() => setForwardDialogInvoice(null)}
      />
    </AdminLayout>
  );
}
