import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { logAdminActivity, AdminActions, EntityTypes } from "@/lib/adminLogger";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import {
  Euro,
  FileText,
  CheckCircle2,
  Clock,
  Building2,
  Send,
  RefreshCw,
  Home,
  Activity,
} from "lucide-react";

interface CommissionItem {
  id: string;
  block_name: string;
  invoiced_amount: number;
  invoiced_number: string;
  invoiced_date: string;
  commission_percentage: number;
  commission_amount: number;
  commission_status: string;
  provider_id: string;
  provider_name: string;
  item_type: "activity" | "accommodation";
  program_requests: {
    id: string;
    customer_name: string;
    customer_company: string | null;
    selected_dates: unknown;
  } | null;
  accommodation_requests: {
    id: string;
    customer_name: string;
    customer_company: string | null;
    arrival_date: string;
    departure_date: string;
  } | null;
  partner: {
    id: string;
    name: string;
    email: string;
    kvk_number: string | null;
    address_street: string | null;
    address_postal: string | null;
    address_city: string | null;
  } | null;
}

interface PartnerGroup {
  partner: CommissionItem["partner"];
  items: CommissionItem[];
  totalCommission: number;
}

interface CommissionsResponse {
  items: CommissionItem[];
  byPartner: PartnerGroup[];
  summary: {
    totalItems: number;
    totalCommission: number;
    status: string;
    activityCount: number;
    accommodationCount: number;
  };
}

const statusLabels: Record<string, string> = {
  pending: "Te factureren",
  invoiced: "Gefactureerd",
  paid: "Betaald",
};

const statusColors: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800",
  invoiced: "bg-blue-100 text-blue-800",
  paid: "bg-green-100 text-green-800",
};

export default function AdminCommissions() {
  const [statusFilter, setStatusFilter] = useState("pending");
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [invoiceDialogOpen, setInvoiceDialogOpen] = useState(false);
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [invoiceDate, setInvoiceDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch commissions via edge function
  const { data, isLoading, error, refetch } = useQuery<CommissionsResponse>({
    queryKey: ["admin-commissions", statusFilter],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const response = await supabase.functions.invoke("get-admin-commissions", {
        body: { status: statusFilter },
      });

      if (response.error) throw response.error;
      return response.data;
    },
  });

  // Mutation to update commission status
  const updateStatusMutation = useMutation({
    mutationFn: async ({
      itemIds,
      status,
      invoiceNumber,
      invoiceDate,
    }: {
      itemIds: string[];
      status: string;
      invoiceNumber?: string;
      invoiceDate?: string;
    }) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const response = await supabase.functions.invoke("update-commission-status", {
        body: { itemIds, status, invoiceNumber, invoiceDate },
      });

      if (response.error) throw response.error;
      return response.data;
    },
    onSuccess: async (_, variables) => {
      await logAdminActivity({
        action: AdminActions.COMMISSION_STATUS_CHANGED,
        entityType: EntityTypes.COMMISSION,
        entityId: variables.itemIds.join(","),
        details: {
          new_status: variables.status,
          item_count: variables.itemIds.length,
          invoice_number: variables.invoiceNumber,
        },
      });

      queryClient.invalidateQueries({ queryKey: ["admin-commissions"] });
      setSelectedItems(new Set());
      setInvoiceDialogOpen(false);
      setInvoiceNumber("");

      toast({
        title: "Commissies bijgewerkt",
        description: `${variables.itemIds.length} item(s) gemarkeerd als ${statusLabels[variables.status]}`,
      });
    },
    onError: (error) => {
      toast({
        title: "Fout bij bijwerken",
        description: error instanceof Error ? error.message : "Onbekende fout",
        variant: "destructive",
      });
    },
  });

  const handleSelectAll = (partnerId: string, checked: boolean) => {
    const partnerItems = data?.byPartner.find(
      (p) => p.partner?.id === partnerId
    )?.items;
    if (!partnerItems) return;

    const newSelected = new Set(selectedItems);
    partnerItems.forEach((item) => {
      if (checked) {
        newSelected.add(item.id);
      } else {
        newSelected.delete(item.id);
      }
    });
    setSelectedItems(newSelected);
  };

  const handleSelectItem = (itemId: string, checked: boolean) => {
    const newSelected = new Set(selectedItems);
    if (checked) {
      newSelected.add(itemId);
    } else {
      newSelected.delete(itemId);
    }
    setSelectedItems(newSelected);
  };

  const handleMarkAsInvoiced = () => {
    if (selectedItems.size === 0) return;
    setInvoiceDialogOpen(true);
  };

  const handleConfirmInvoice = () => {
    if (!invoiceNumber.trim()) {
      toast({
        title: "Factuurnummer vereist",
        description: "Vul een factuurnummer in",
        variant: "destructive",
      });
      return;
    }

    updateStatusMutation.mutate({
      itemIds: Array.from(selectedItems),
      status: "invoiced",
      invoiceNumber: invoiceNumber.trim(),
      invoiceDate,
    });
  };

  const handleMarkAsPaid = () => {
    if (selectedItems.size === 0) return;
    updateStatusMutation.mutate({
      itemIds: Array.from(selectedItems),
      status: "paid",
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("nl-NL", {
      style: "currency",
      currency: "EUR",
    }).format(amount);
  };

  const formatDate = (dateStr: string) => {
    return format(new Date(dateStr), "d MMM yyyy", { locale: nl });
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="p-6 space-y-6">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </AdminLayout>
    );
  }

  if (error) {
    return (
      <AdminLayout>
        <div className="p-6">
          <Card className="border-destructive">
            <CardContent className="p-6 text-center">
              <p className="text-destructive">
                Fout bij laden: {error instanceof Error ? error.message : "Onbekende fout"}
              </p>
              <Button onClick={() => refetch()} className="mt-4">
                Opnieuw proberen
              </Button>
            </CardContent>
          </Card>
        </div>
      </AdminLayout>
    );
  }

  const selectedTotal = Array.from(selectedItems).reduce((sum, itemId) => {
    const item = data?.items.find((i) => i.id === itemId);
    return sum + (item?.commission_amount || 0);
  }, 0);

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Commissie Beheer</h1>
            <p className="text-muted-foreground">
              Beheer partner commissies en facturatie
            </p>
          </div>
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Vernieuwen
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 bg-amber-100 rounded-lg">
                <Clock className="h-6 w-6 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Te factureren</p>
                <p className="text-2xl font-bold">
                  {statusFilter === "pending" ? data?.summary.totalItems || 0 : "-"}
                </p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 bg-primary/10 rounded-lg">
                <Euro className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Totaal bedrag</p>
                <p className="text-2xl font-bold">
                  {formatCurrency(data?.summary.totalCommission || 0)}
                </p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 bg-green-100 rounded-lg">
                <CheckCircle2 className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Geselecteerd</p>
                <p className="text-2xl font-bold">
                  {selectedItems.size} ({formatCurrency(selectedTotal)})
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters & Actions */}
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pending">Te factureren</SelectItem>
              <SelectItem value="invoiced">Gefactureerd</SelectItem>
              <SelectItem value="paid">Betaald</SelectItem>
            </SelectContent>
          </Select>

          <div className="flex gap-2">
            {statusFilter === "pending" && selectedItems.size > 0 && (
              <Button onClick={handleMarkAsInvoiced}>
                <Send className="h-4 w-4 mr-2" />
                Markeer als gefactureerd ({selectedItems.size})
              </Button>
            )}
            {statusFilter === "invoiced" && selectedItems.size > 0 && (
              <Button onClick={handleMarkAsPaid} variant="outline">
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Markeer als betaald ({selectedItems.size})
              </Button>
            )}
          </div>
        </div>

        {/* Partner Groups */}
        {data?.byPartner && data.byPartner.length > 0 ? (
          <div className="space-y-6">
            {data.byPartner.map((group) => (
              <Card key={group.partner?.id || "unknown"}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Checkbox
                        checked={group.items.every((item) =>
                          selectedItems.has(item.id)
                        )}
                        onCheckedChange={(checked) =>
                          handleSelectAll(group.partner?.id || "", !!checked)
                        }
                      />
                      <Building2 className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <CardTitle className="text-lg">
                          {group.partner?.name || "Onbekende partner"}
                        </CardTitle>
                        <p className="text-sm text-muted-foreground">
                          {group.partner?.email}
                          {group.partner?.kvk_number && ` • KvK: ${group.partner.kvk_number}`}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">
                        {group.items.length} item(s)
                      </p>
                      <p className="text-lg font-semibold text-primary">
                        {formatCurrency(group.totalCommission)}
                      </p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-10"></TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Naam</TableHead>
                        <TableHead>Klant</TableHead>
                        <TableHead>Factuurnr.</TableHead>
                        <TableHead className="text-right">Bedrag</TableHead>
                        <TableHead className="text-right">Commissie</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {group.items.map((item) => {
                        const customerName = item.item_type === "accommodation" 
                          ? item.accommodation_requests?.customer_name 
                          : item.program_requests?.customer_name;
                        const customerCompany = item.item_type === "accommodation"
                          ? item.accommodation_requests?.customer_company
                          : item.program_requests?.customer_company;
                        
                        return (
                          <TableRow key={item.id}>
                            <TableCell>
                              <Checkbox
                                checked={selectedItems.has(item.id)}
                                onCheckedChange={(checked) =>
                                  handleSelectItem(item.id, !!checked)
                                }
                              />
                            </TableCell>
                            <TableCell>
                              {item.item_type === "accommodation" ? (
                                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                                  <Home className="h-3 w-3 mr-1" />
                                  Logies
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                  <Activity className="h-3 w-3 mr-1" />
                                  Activiteit
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              <div>
                                <p className="font-medium">{item.block_name}</p>
                                <p className="text-xs text-muted-foreground">
                                  {item.invoiced_date && formatDate(item.invoiced_date)}
                                </p>
                              </div>
                            </TableCell>
                            <TableCell>
                              <p>{customerName}</p>
                              {customerCompany && (
                                <p className="text-xs text-muted-foreground">
                                  {customerCompany}
                                </p>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1">
                                <FileText className="h-4 w-4 text-muted-foreground" />
                                {item.invoiced_number}
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              {formatCurrency(item.invoiced_amount)}
                            </TableCell>
                            <TableCell className="text-right">
                              <div>
                                <p className="font-medium">
                                  {formatCurrency(item.commission_amount)}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {item.commission_percentage}%
                                </p>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge
                                className={statusColors[item.commission_status] || ""}
                                variant="secondary"
                              >
                                {statusLabels[item.commission_status] || item.commission_status}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="p-12 text-center">
              <Euro className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">Geen commissies gevonden</h3>
              <p className="text-muted-foreground">
                Er zijn geen items met status "{statusLabels[statusFilter]}"
              </p>
            </CardContent>
          </Card>
        )}

        {/* Invoice Dialog */}
        <Dialog open={invoiceDialogOpen} onOpenChange={setInvoiceDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Commissie factureren</DialogTitle>
              <DialogDescription>
                Markeer {selectedItems.size} item(s) als gefactureerd voor een totaal van{" "}
                {formatCurrency(selectedTotal)}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Factuurnummer *</label>
                <Input
                  value={invoiceNumber}
                  onChange={(e) => setInvoiceNumber(e.target.value)}
                  placeholder="BV-2024-001"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Factuurdatum</label>
                <Input
                  type="date"
                  value={invoiceDate}
                  onChange={(e) => setInvoiceDate(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setInvoiceDialogOpen(false)}>
                Annuleren
              </Button>
              <Button
                onClick={handleConfirmInvoice}
                disabled={updateStatusMutation.isPending}
              >
                {updateStatusMutation.isPending ? "Bezig..." : "Bevestigen"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
