import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Helmet } from "react-helmet";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  ArrowLeft,
  User,
  Mail,
  Phone,
  Building2,
  Calendar,
  Users,
  ExternalLink,
  Hotel,
  Clock,
  History,
  FileText,
  AlertCircle,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Ban,
  Sparkles,
  Plus,
  Pencil,
  Layers,
  Save,
  Euro,
  Trash2,
} from "lucide-react";
import { logAdminActivity, AdminActions, EntityTypes } from "@/lib/adminLogger";
import { 
  itemStatusConfig, 
  type ItemStatus, 
  type ProgramType,
  type QuoteStatus,
  type ItemQuoteStatus,
} from "@/types/programRequest";
import { FinancialOverviewCard } from "@/components/admin/FinancialOverviewCard";
import { RegisterBureauInvoiceDialog } from "@/components/admin/RegisterBureauInvoiceDialog";
import { RequestCompletionStatus } from "@/components/admin/RequestCompletionStatus";
import { AdminPartnerConflictBanner } from "@/components/admin/AdminPartnerConflictBanner";
import { AdminQuoteStatusBadge } from "@/components/admin/AdminQuoteStatusBadge";
import { AdminItemQuoteStatusSelect } from "@/components/admin/AdminItemQuoteStatusSelect";
import { AdminQuotePriceEditor } from "@/components/admin/AdminQuotePriceEditor";
import { AdminSendQuoteDialog } from "@/components/admin/AdminSendQuoteDialog";
import { AdminAddActivitySheet } from "@/components/admin/AdminAddActivitySheet";
import { AdminEditActivitySheet } from "@/components/admin/AdminEditActivitySheet";
import { calculateBureauFee } from "@/types/buildingBlock";
import type { BureauInvoice } from "@/types/bureauInvoice";
import type { CompletionStatus } from "@/types/bureauInvoice";
import { ProjectCommunicationsCard } from "@/components/admin/ProjectCommunicationsCard";
import { InvoicingModeSelector } from "@/components/admin/InvoicingModeSelector";
import { PurchaseInvoicesCard } from "@/components/admin/PurchaseInvoicesCard";
import { ApplyTemplateDialog } from "@/components/admin/ApplyTemplateDialog";
import { SaveAsTemplateDialog } from "@/components/admin/SaveAsTemplateDialog";
import { AdminAddCostSheet } from "@/components/admin/AdminAddCostSheet";

interface ProgramRequest {
  id: string;
  reference_number: string | null;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  customer_company: string | null;
  number_of_people: number;
  selected_dates: string[];
  general_notes: string | null;
  status: string;
  completion_status: CompletionStatus | null;
  terms_accepted_at: string | null;
  created_at: string;
  updated_at: string;
  expires_at: string;
  customer_token: string;
  cancelled_at: string | null;
  cancellation_reason: string | null;
  linked_accommodation_id: string | null;
  // Quote mode fields
  program_type: ProgramType;
  quote_status: QuoteStatus | null;
  quote_valid_until: string | null;
  quote_sent_at: string | null;
  quote_personal_message: string | null;
  // Program description
  program_description: string | null;
  // Invoicing mode
  invoicing_mode: 'partner_direct' | 'bureau_central';
}

interface LinkedAccommodation {
  id: string;
  customer_name: string;
  status: string;
  arrival_date: string;
  departure_date: string;
  number_of_guests: number;
}

interface ProgramRequestItem {
  id: string;
  block_id: string | null;
  block_name: string;
  block_category: string;
  block_type: string;
  provider_name: string;
  provider_id: string;
  provider_email: string | null;
  day_index: number;
  preferred_time: string | null;
  customer_notes: string | null;
  status: ItemStatus;
  status_note: string | null;
  quoted_price: number | null;
  invoiced_amount: number | null;
  invoiced_number: string | null;
  commission_status: string | null;
  // Quote mode fields
  item_quote_status: ItemQuoteStatus | null;
  admin_price_override: number | null;
  admin_price_notes: string | null;
}

interface HistoryEntry {
  id: string;
  action: string;
  actor: string;
  actor_name: string | null;
  notes: string | null;
  old_value: Record<string, unknown> | null;
  new_value: Record<string, unknown> | null;
  created_at: string;
}

const statusIcons: Record<string, React.ReactNode> = {
  pending: <Clock className="h-4 w-4" />,
  confirmed: <CheckCircle2 className="h-4 w-4" />,
  unavailable: <XCircle className="h-4 w-4" />,
  alternative: <HelpCircle className="h-4 w-4" />,
  cancelled: <Ban className="h-4 w-4" />,
};

const AdminRequestDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [request, setRequest] = useState<ProgramRequest | null>(null);
  const [items, setItems] = useState<ProgramRequestItem[]>([]);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [bureauInvoices, setBureauInvoices] = useState<BureauInvoice[]>([]);
  const [linkedAccommodation, setLinkedAccommodation] = useState<LinkedAccommodation | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [invoiceDialogOpen, setInvoiceDialogOpen] = useState(false);
  const [addActivityOpen, setAddActivityOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ProgramRequestItem | null>(null);
  const [applyTemplateOpen, setApplyTemplateOpen] = useState(false);
  const [saveAsTemplateOpen, setSaveAsTemplateOpen] = useState(false);
  const [addCostOpen, setAddCostOpen] = useState(false);
  const [cancellationReason, setCancellationReason] = useState("");
  const [isCancelling, setIsCancelling] = useState(false);

  useEffect(() => {
    if (!id) return;
    
    fetchRequestData();
    logAdminActivity({
      action: AdminActions.REQUEST_VIEWED,
      entityType: EntityTypes.REQUEST,
      entityId: id,
    });
    
    // Subscribe to realtime changes for live updates
    const channel = supabase
      .channel(`admin-request-${id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'program_request_items',
          filter: `request_id=eq.${id}`,
        },
        () => fetchRequestData()
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'program_requests',
          filter: `id=eq.${id}`,
        },
        () => fetchRequestData()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id]);

  const fetchRequestData = async () => {
    setIsLoading(true);
    try {
      // Fetch request
      const { data: requestData, error: requestError } = await supabase
        .from("program_requests")
        .select("*")
        .eq("id", id)
        .maybeSingle();

      if (requestError) throw requestError;
      if (!requestData) {
        toast.error("Aanvraag niet gevonden");
        navigate("/admin/aanvragen");
        return;
      }

      setRequest(requestData as ProgramRequest);

      // Fetch items
      const { data: itemsData, error: itemsError } = await supabase
        .from("program_request_items")
        .select("*")
        .eq("request_id", id)
        .order("day_index", { ascending: true })
        .order("preferred_time", { ascending: true, nullsFirst: false });

      if (itemsError) throw itemsError;
      setItems(itemsData as ProgramRequestItem[]);

      // Fetch history
      const { data: historyData, error: historyError } = await supabase
        .from("program_request_history")
        .select("*")
        .eq("request_id", id)
        .order("created_at", { ascending: false });

      if (historyError) throw historyError;
      setHistory(historyData as HistoryEntry[]);

      // Fetch bureau invoices
      const { data: invoicesData, error: invoicesError } = await supabase
        .from("bureau_invoices")
        .select("*")
        .eq("request_id", id)
        .order("invoice_date", { ascending: false });

      if (invoicesError) throw invoicesError;
      setBureauInvoices(invoicesData as BureauInvoice[]);

      // Fetch linked accommodation if exists
      if (requestData.linked_accommodation_id) {
        const { data: accData, error: accError } = await supabase
          .from("accommodation_requests")
          .select("id, customer_name, status, arrival_date, departure_date, number_of_guests")
          .eq("id", requestData.linked_accommodation_id)
          .maybeSingle();

        if (!accError && accData) {
          setLinkedAccommodation(accData as LinkedAccommodation);
        }
      } else {
        setLinkedAccommodation(null);
      }
    } catch (error) {
      console.error("Error fetching request:", error);
      toast.error("Fout bij ophalen aanvraag");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelRequest = async () => {
    if (!request) return;
    setIsCancelling(true);

    try {
      const { error } = await supabase
        .from("program_requests")
        .update({
          status: "cancelled",
          cancelled_at: new Date().toISOString(),
          cancellation_reason: cancellationReason || null,
        })
        .eq("id", request.id);

      if (error) throw error;

      await logAdminActivity({
        action: AdminActions.REQUEST_CANCELLED,
        entityType: EntityTypes.REQUEST,
        entityId: request.id,
        details: { reason: cancellationReason },
      });

      toast.success("Aanvraag geannuleerd");
      setCancelDialogOpen(false);
      fetchRequestData();
    } catch (error) {
      console.error("Error cancelling request:", error);
      toast.error("Fout bij annuleren aanvraag");
    } finally {
      setIsCancelling(false);
    }
  };

  const getStatusSummary = () => {
    const summary = {
      pending: 0,
      confirmed: 0,
      unavailable: 0,
      alternative: 0,
      cancelled: 0,
    };
    items.forEach((item) => {
      if (summary[item.status as keyof typeof summary] !== undefined) {
        summary[item.status as keyof typeof summary]++;
      }
    });
    return summary;
  };

  const calculateOutstandingAmount = () => {
    // Calculate items to be invoiced by Bureau Vlieland
    const bureauItems = items.filter(
      (item) => item.block_type === "bureau" && item.status === "confirmed" && item.quoted_price
    );
    const itemsTotal = bureauItems.reduce((sum, item) => sum + (item.quoted_price || 0), 0);
    const coordinationFee = calculateBureauFee(request?.number_of_people || 0);
    const totalInclVat = itemsTotal + coordinationFee;

    // Calculate invoiced amounts
    const invoicedInclVat = bureauInvoices
      .filter((inv) => inv.invoice_type !== "credit")
      .reduce((sum, inv) => sum + inv.amount_incl_vat, 0);
    const creditedInclVat = bureauInvoices
      .filter((inv) => inv.invoice_type === "credit")
      .reduce((sum, inv) => sum + inv.amount_incl_vat, 0);

    return Math.max(0, totalInclVat - (invoicedInclVat - creditedInclVat));
  };

  if (isLoading) {
    return (
      <>
        <Helmet>
          <title>Aanvraag laden... | Admin | Bureau Vlieland</title>
          <meta name="robots" content="noindex, nofollow" />
        </Helmet>
        <AdminLayout>
          <div className="p-6 space-y-6">
            <Skeleton className="h-8 w-64" />
            <div className="grid md:grid-cols-3 gap-6">
              <Skeleton className="h-48" />
              <Skeleton className="h-48" />
              <Skeleton className="h-48" />
            </div>
            <Skeleton className="h-64" />
          </div>
        </AdminLayout>
      </>
    );
  }

  if (!request) {
    return null;
  }

  const statusSummary = getStatusSummary();
  const customerPortalUrl = `/mijn-programma/${request.customer_token}`;
  const isQuoteMode = request.program_type === "quote";

  // Build URL for accommodation request with pre-filled data
  const buildLogiesUrl = () => {
    const params = new URLSearchParams();
    const dates = request.selected_dates as string[];
    
    if (dates.length > 0) {
      // Sort dates and use first as arrival, last as departure
      const sorted = [...dates].sort();
      params.set("arrival", format(new Date(sorted[0]), "yyyy-MM-dd"));
      params.set("departure", format(new Date(sorted[sorted.length - 1]), "yyyy-MM-dd"));
    }
    
    params.set("guests", request.number_of_people.toString());
    params.set("programToken", request.customer_token);
    
    return `/logies-aanvragen?${params.toString()}`;
  };

  const handleQuoteStatusChange = async (newStatus: QuoteStatus) => {
    try {
      const { error } = await supabase
        .from("program_requests")
        .update({ quote_status: newStatus })
        .eq("id", request.id);

      if (error) throw error;

      await logAdminActivity({
        action: "quote_status_changed",
        entityType: EntityTypes.REQUEST,
        entityId: request.id,
        details: { old_status: request.quote_status, new_status: newStatus },
      });

      toast.success("Offerte-status bijgewerkt");
      fetchRequestData();
    } catch (error) {
      console.error("Error updating quote status:", error);
      toast.error("Fout bij bijwerken status");
    }
  };

  const handleItemQuoteStatusChange = async (itemId: string, newStatus: ItemQuoteStatus) => {
    try {
      const { error } = await supabase
        .from("program_request_items")
        .update({ item_quote_status: newStatus })
        .eq("id", itemId);

      if (error) throw error;
      toast.success("Item status bijgewerkt");
      fetchRequestData();
    } catch (error) {
      console.error("Error updating item status:", error);
      toast.error("Fout bij bijwerken status");
    }
  };

  const handleItemPriceUpdate = async (itemId: string, price: number | null, notes: string) => {
    try {
      const { error } = await supabase
        .from("program_request_items")
        .update({ 
          admin_price_override: price,
          admin_price_notes: notes || null,
        })
        .eq("id", itemId);

      if (error) throw error;
      toast.success("Prijs bijgewerkt");
      fetchRequestData();
    } catch (error) {
      console.error("Error updating item price:", error);
      toast.error("Fout bij bijwerken prijs");
    }
  };

  return (
    <>
      <Helmet>
        <title>Aanvraag {request.customer_name} | Admin | Bureau Vlieland</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>
      <AdminLayout>
        <div className="p-6 space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => navigate("/admin/projecten")}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <div className="flex items-center gap-3 flex-wrap">
                  <h1 className="text-2xl font-bold text-slate-900">
                    {request.customer_name}
                  </h1>
                  {request.reference_number && (
                    <code className="text-sm font-mono bg-slate-100 px-2 py-1 rounded">
                      {request.reference_number}
                    </code>
                  )}
                  {isQuoteMode && (
                    <Badge variant="outline" className="gap-1 border-primary/30 bg-primary/5 text-primary">
                      <Sparkles className="h-3 w-3" />
                      Maatwerk
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-3 mt-1">
                  <p className="text-slate-500">
                    Aanvraag van {format(new Date(request.created_at), "d MMMM yyyy", { locale: nl })}
                  </p>
                  {isQuoteMode && request.quote_status && (
                    <AdminQuoteStatusBadge status={request.quote_status} />
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {/* Quote mode actions */}
              {isQuoteMode && request.quote_status && ["concept", "in_afstemming"].includes(request.quote_status) && (
                <>
                  <Button variant="outline" asChild>
                    <Link to={`/admin/projecten/${request.id}/offerte-preview`}>
                      <FileText className="h-4 w-4 mr-2" />
                      Preview PDF
                    </Link>
                  </Button>
                  <AdminSendQuoteDialog
                    requestId={request.id}
                    customerName={request.customer_name}
                    customerEmail={request.customer_email}
                    programDates={request.selected_dates as string[]}
                    currentValidUntil={request.quote_valid_until}
                    onSuccess={fetchRequestData}
                  />
                </>
              )}
              <Button variant="outline" asChild>
                <Link to={customerPortalUrl} target="_blank">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Klantportaal
                </Link>
              </Button>
              {request.status !== "cancelled" && (
                <Button variant="destructive" onClick={() => setCancelDialogOpen(true)}>
                  <Ban className="h-4 w-4 mr-2" />
                  Annuleren
                </Button>
              )}
            </div>
          </div>

          {/* Quote mode info banner */}
          {isQuoteMode && (
            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="p-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <Sparkles className="h-5 w-5 text-primary mt-0.5" />
                    <div>
                      <p className="font-medium text-primary">Maatwerkofferte</p>
                      <p className="text-sm text-muted-foreground">
                        Geen automatische partner-notificaties. Stem handmatig af en verstuur offerte wanneer gereed.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Status: </span>
                      <Select
                        value={request.quote_status || "concept"}
                        onValueChange={(v) => handleQuoteStatusChange(v as QuoteStatus)}
                      >
                        <SelectTrigger className="h-8 w-[180px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="concept">Concept</SelectItem>
                          <SelectItem value="in_afstemming">In afstemming</SelectItem>
                          <SelectItem value="offerte_verstuurd">Offerte verstuurd</SelectItem>
                          <SelectItem value="akkoord_ontvangen">Akkoord ontvangen</SelectItem>
                          <SelectItem value="definitief_bevestigd">Definitief bevestigd</SelectItem>
                          <SelectItem value="verlopen">Verlopen</SelectItem>
                          <SelectItem value="geannuleerd">Geannuleerd</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {request.quote_valid_until && (
                      <div>
                        <span className="text-muted-foreground">Geldig tot: </span>
                        <span className="font-medium">
                          {format(new Date(request.quote_valid_until), "d MMM yyyy", { locale: nl })}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Status banner if cancelled */}
          {request.status === "cancelled" && (
            <Card className="bg-red-50 border-red-200">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
                  <div>
                    <p className="font-semibold text-red-900">Aanvraag geannuleerd</p>
                    <p className="text-sm text-red-700">
                      {request.cancelled_at && (
                        <>Op {format(new Date(request.cancelled_at), "d MMMM yyyy 'om' HH:mm", { locale: nl })}</>
                      )}
                      {request.cancellation_reason && (
                        <> - {request.cancellation_reason}</>
                      )}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Compact combined customer + event card */}
          <Card>
            <CardContent className="p-6">
              <div className="grid md:grid-cols-2 gap-6">
                {/* Customer info */}
                <div className="space-y-3">
                  <h3 className="font-semibold text-sm uppercase tracking-wider text-slate-500 flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Klantgegevens
                  </h3>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <User className="h-4 w-4 text-slate-400" />
                      <span>{request.customer_name}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Mail className="h-4 w-4 text-slate-400" />
                      <a href={`mailto:${request.customer_email}`} className="text-primary hover:underline">
                        {request.customer_email}
                      </a>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="h-4 w-4 text-slate-400" />
                      <a href={`tel:${request.customer_phone}`} className="hover:underline">
                        {request.customer_phone}
                      </a>
                    </div>
                    {request.customer_company && (
                      <div className="flex items-center gap-2 text-sm">
                        <Building2 className="h-4 w-4 text-slate-400" />
                        <span>{request.customer_company}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Event details */}
                <div className="space-y-3">
                  <h3 className="font-semibold text-sm uppercase tracking-wider text-slate-500 flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Evenement details
                  </h3>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <Users className="h-4 w-4 text-slate-400" />
                      <span>{request.number_of_people} personen</span>
                    </div>
                    <div className="flex items-start gap-2 text-sm">
                      <Calendar className="h-4 w-4 text-slate-400 mt-0.5" />
                      <div>
                        {(request.selected_dates as string[]).map((date, idx) => (
                          <div key={idx}>
                            Dag {idx + 1}: {format(new Date(date), "d MMMM yyyy", { locale: nl })}
                          </div>
                        ))}
                      </div>
                    </div>
                    {request.general_notes && (
                      <p className="text-sm text-slate-600 pt-1 border-t">{request.general_notes}</p>
                    )}
                    {request.program_description && (
                      <div className="pt-1 border-t">
                        <p className="text-xs text-slate-400 mb-1">Omschrijving</p>
                        <p className="text-sm text-slate-700 italic whitespace-pre-line">
                          "{request.program_description}"
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Status summary + linked accommodation row */}
          <div className="grid md:grid-cols-3 gap-6">
            {/* Status summary */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Activiteiten status
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600">In afwachting</span>
                  <Badge variant="outline">{statusSummary.pending}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600">Bevestigd</span>
                  <Badge className="bg-green-100 text-green-800">{statusSummary.confirmed}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600">Niet beschikbaar</span>
                  <Badge className="bg-red-100 text-red-800">{statusSummary.unavailable}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600">Alternatief</span>
                  <Badge className="bg-amber-100 text-amber-800">{statusSummary.alternative}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600">Geannuleerd</span>
                  <Badge className="bg-slate-100 text-slate-800">{statusSummary.cancelled}</Badge>
                </div>
                <Separator className="my-2" />
                <div className="flex items-center justify-between font-semibold">
                  <span>Totaal</span>
                  <span>{items.length} activiteiten</span>
                </div>
              </CardContent>
            </Card>

            {/* Linked Accommodation */}
            {linkedAccommodation && (
              <Card className="border-indigo-200 bg-indigo-50/50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Hotel className="h-5 w-5 text-indigo-600" />
                    Gekoppelde logies
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-slate-400" />
                    <span>
                      {format(new Date(linkedAccommodation.arrival_date), "d MMM", { locale: nl })} -{" "}
                      {format(new Date(linkedAccommodation.departure_date), "d MMM yyyy", { locale: nl })}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-slate-400" />
                    <span>{linkedAccommodation.number_of_guests} gasten</span>
                  </div>
                  <div className="flex items-center justify-between pt-2">
                    <Badge variant={
                      linkedAccommodation.status === "accepted" ? "default" :
                      linkedAccommodation.status === "quoted" ? "outline" :
                      "secondary"
                    }>
                      {linkedAccommodation.status === "submitted" ? "Nieuw" :
                       linkedAccommodation.status === "processing" ? "In behandeling" :
                       linkedAccommodation.status === "quoted" ? "Offertes verstuurd" :
                       linkedAccommodation.status === "accepted" ? "Geaccepteerd" :
                       linkedAccommodation.status}
                    </Badge>
                    <Button variant="outline" size="sm" asChild>
                      <Link to={`/admin/logies/${linkedAccommodation.id}`}>
                        Bekijken
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Logies CTA when no accommodation linked */}
            {!linkedAccommodation && (request.selected_dates as string[]).length > 1 && (
              <Card className="border-dashed border-2 border-primary/30 bg-primary/5">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Hotel className="h-5 w-5 text-primary" />
                    Logies regelen
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Meerdaags programma — logies regelen?
                  </p>
                  <Button asChild>
                    <Link to={buildLogiesUrl()}>
                      <Plus className="h-4 w-4 mr-2" />
                      Logiesaanvraag maken
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Partner Conflict Detection */}
          <AdminPartnerConflictBanner
            items={items.map(item => ({
              id: item.id,
              block_name: item.block_name,
              provider_id: item.provider_id,
              provider_name: item.provider_name,
              day_index: item.day_index,
            }))}
            selectedDates={request.selected_dates as string[]}
          />

          {/* Tabs */}
          <Tabs defaultValue="activiteiten" className="space-y-4">
            <TabsList>
              <TabsTrigger value="activiteiten">Activiteiten</TabsTrigger>
              <TabsTrigger value="financien">Financiën</TabsTrigger>
              <TabsTrigger value="communicatie">Communicatie</TabsTrigger>
              <TabsTrigger value="geschiedenis">Geschiedenis</TabsTrigger>
            </TabsList>

            {/* Tab: Activiteiten */}
            <TabsContent value="activiteiten">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0">
                  <div>
                    <CardTitle>Activiteiten</CardTitle>
                    <CardDescription>
                      {isQuoteMode 
                        ? "Beheer de activiteiten en prijzen in deze offerte"
                        : "Alle activiteiten in dit programma"
                      }
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Button variant="outline" onClick={() => setApplyTemplateOpen(true)}>
                      <Layers className="h-4 w-4 mr-2" />
                      Template toepassen
                    </Button>
                    {items.length > 0 && (
                      <Button variant="outline" onClick={() => setSaveAsTemplateOpen(true)}>
                        <Save className="h-4 w-4 mr-2" />
                        Opslaan als template
                      </Button>
                    )}
                    <Button variant="outline" onClick={() => setAddCostOpen(true)}>
                      <Euro className="h-4 w-4 mr-2" />
                      Kosten toevoegen
                    </Button>
                    <Button onClick={() => setAddActivityOpen(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Activiteit toevoegen
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Dag</TableHead>
                          <TableHead>Activiteit</TableHead>
                          <TableHead>Partner</TableHead>
                          <TableHead>Gefactureerd door</TableHead>
                          <TableHead>Tijd</TableHead>
                          {isQuoteMode ? (
                            <>
                              <TableHead>Offerte-status</TableHead>
                              <TableHead>Prijs (aanpasbaar)</TableHead>
                              <TableHead className="w-[80px]"></TableHead>
                            </>
                          ) : (
                            <>
                              <TableHead>Status</TableHead>
                              <TableHead>Prijs</TableHead>
                              <TableHead>Factuur</TableHead>
                            </>
                          )}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {items.filter(item => item.day_index >= 0).map((item) => {
                          const statusInfo = itemStatusConfig[item.status];
                          const isBureauInvoiced = request?.invoicing_mode === "bureau_central" || item.block_type === "bureau";
                          return (
                            <TableRow key={item.id}>
                              <TableCell className="font-medium">
                                Dag {item.day_index + 1}
                              </TableCell>
                              <TableCell>
                                <div>
                                  <div className="font-medium">{item.block_name}</div>
                                  <div className="text-xs text-slate-500">{item.block_category}</div>
                                  {item.admin_price_notes && (
                                    <div className="text-xs text-muted-foreground italic mt-1">{item.admin_price_notes}</div>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>
                                <Link 
                                  to={`/admin/partners/${item.provider_id}`}
                                  className="text-primary hover:underline"
                                >
                                  {item.provider_name}
                                </Link>
                              </TableCell>
                              <TableCell>
                                {isBureauInvoiced ? (
                                  <Badge variant="outline" className="gap-1 border-primary/30 bg-primary/5 text-primary whitespace-nowrap">
                                    <Building2 className="h-3 w-3" />
                                    Bureau → Klant
                                  </Badge>
                                ) : (
                                  <Badge variant="outline" className="gap-1 border-slate-300 bg-slate-50 text-slate-700 whitespace-nowrap">
                                    <Users className="h-3 w-3" />
                                    Partner → Klant
                                  </Badge>
                                )}
                              </TableCell>
                              <TableCell>
                                {item.preferred_time || "-"}
                              </TableCell>
                              
                              {isQuoteMode ? (
                                <>
                                  <TableCell>
                                    <AdminItemQuoteStatusSelect
                                      status={item.item_quote_status}
                                      onStatusChange={(newStatus) => handleItemQuoteStatusChange(item.id, newStatus)}
                                    />
                                  </TableCell>
                                  <TableCell>
                                    <AdminQuotePriceEditor
                                      originalPrice={item.quoted_price}
                                      overridePrice={item.admin_price_override}
                                      priceNotes={item.admin_price_notes}
                                      numberOfPeople={request.number_of_people}
                                      onSave={(price, notes) => handleItemPriceUpdate(item.id, price, notes)}
                                    />
                                  </TableCell>
                                  <TableCell>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => setEditingItem(item)}
                                      className="h-8 w-8"
                                    >
                                      <Pencil className="h-4 w-4" />
                                    </Button>
                                  </TableCell>
                                </>
                              ) : (
                                <>
                                  <TableCell>
                                    <div className="flex items-center gap-2">
                                      {statusIcons[item.status]}
                                      <Badge className={`${statusInfo.bgColor} ${statusInfo.color}`}>
                                        {request?.invoicing_mode === "bureau_central" && item.status === "pending"
                                          ? "Nog niet verstuurd"
                                          : statusInfo.label}
                                      </Badge>
                                    </div>
                                    {item.status_note && (
                                      <p className="text-xs text-slate-500 mt-1">{item.status_note}</p>
                                    )}
                                  </TableCell>
                                  <TableCell>
                                    {item.quoted_price ? (
                                      <span className="font-medium">
                                        €{item.quoted_price.toLocaleString("nl-NL", { minimumFractionDigits: 2 })}
                                      </span>
                                    ) : (
                                      <span className="text-slate-400">-</span>
                                    )}
                                  </TableCell>
                                  <TableCell>
                                    {item.invoiced_number ? (
                                      <div className="text-sm">
                                        <div className="font-medium">{item.invoiced_number}</div>
                                        <div className="text-slate-500">
                                          €{item.invoiced_amount?.toLocaleString("nl-NL", { minimumFractionDigits: 2 })}
                                        </div>
                                      </div>
                                    ) : (
                                      <span className="text-slate-400">-</span>
                                    )}
                                  </TableCell>
                                </>
                              )}
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Tab: Financiën */}
            <TabsContent value="financien" className="space-y-6">
              {/* Overige kosten section */}
              {items.filter(item => item.day_index === -1).length > 0 && (
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0">
                    <div>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Euro className="h-5 w-5" />
                        Overige kosten
                      </CardTitle>
                      <CardDescription>Losse facturabele kosten buiten het programma</CardDescription>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => setAddCostOpen(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Kosten toevoegen
                    </Button>
                  </CardHeader>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Omschrijving</TableHead>
                          <TableHead>Toelichting</TableHead>
                          <TableHead>Bedrag</TableHead>
                          <TableHead className="w-[60px]"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {items.filter(item => item.day_index === -1).map((item) => (
                          <TableRow key={item.id}>
                            <TableCell className="font-medium">{item.block_name}</TableCell>
                            <TableCell className="text-muted-foreground text-sm">
                              {item.admin_price_notes || "-"}
                            </TableCell>
                            <TableCell className="font-medium">
                              €{(item.admin_price_override ?? 0).toLocaleString("nl-NL", { minimumFractionDigits: 2 })}
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive hover:text-destructive"
                                onClick={async () => {
                                  const { error } = await supabase
                                    .from("program_request_items")
                                    .delete()
                                    .eq("id", item.id);
                                  if (error) {
                                    toast.error("Fout bij verwijderen");
                                  } else {
                                    toast.success("Kosten verwijderd");
                                    fetchRequestData();
                                  }
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              )}

              <div className="grid md:grid-cols-3 gap-6">
                <InvoicingModeSelector
                  requestId={request.id}
                  currentMode={request.invoicing_mode || 'partner_direct'}
                  onModeChange={fetchRequestData}
                />
                {request.invoicing_mode === 'bureau_central' && (
                  <div className="md:col-span-2">
                    <PurchaseInvoicesCard requestId={request.id} />
                  </div>
                )}
              </div>
              <div className="grid md:grid-cols-2 gap-6">
                <RequestCompletionStatus
                  status={request.status}
                  completionStatus={request.completion_status}
                  termsAcceptedAt={request.terms_accepted_at}
                  items={items}
                  outstandingAmount={calculateOutstandingAmount()}
                />
                <FinancialOverviewCard
                  numberOfPeople={request.number_of_people}
                  items={items}
                  invoices={bureauInvoices}
                  onRegisterInvoice={() => setInvoiceDialogOpen(true)}
                  isQuoteMode={isQuoteMode}
                />
              </div>
            </TabsContent>

            {/* Tab: Communicatie */}
            <TabsContent value="communicatie">
              <ProjectCommunicationsCard
                requestId={request.id}
                customerName={request.customer_name}
                customerEmail={request.customer_email}
                partnerRecipients={
                  Array.from(
                    new Map(
                      items
                        .filter((i) => i.provider_email && i.provider_id)
                        .map((i) => [i.provider_id, { name: i.provider_name, email: i.provider_email!, partnerId: i.provider_id }])
                    ).values()
                  )
                }
              />
            </TabsContent>

            {/* Tab: Geschiedenis */}
            <TabsContent value="geschiedenis">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <History className="h-5 w-5" />
                    Geschiedenis
                  </CardTitle>
                  <CardDescription>
                    Alle wijzigingen en updates
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {history.length === 0 ? (
                    <p className="text-slate-500 text-center py-6">
                      Nog geen geschiedenis beschikbaar
                    </p>
                  ) : (
                    <div className="space-y-4">
                      {history.map((entry, idx) => (
                        <div key={entry.id} className="flex gap-4">
                          <div className="flex flex-col items-center">
                            <div className="w-2 h-2 rounded-full bg-primary" />
                            {idx < history.length - 1 && (
                              <div className="flex-1 w-px bg-slate-200" />
                            )}
                          </div>
                          <div className="flex-1 pb-4">
                            <div className="flex items-center gap-2 text-sm">
                              <span className="font-medium">{entry.actor_name || entry.actor}</span>
                              <span className="text-slate-500">
                                {format(new Date(entry.created_at), "d MMM yyyy 'om' HH:mm", { locale: nl })}
                              </span>
                            </div>
                            <p className="text-sm text-slate-600 mt-1">{entry.action}</p>
                            {entry.notes && (
                              <p className="text-sm text-slate-500 mt-1">{entry.notes}</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </AdminLayout>

      {/* Cancel dialog */}
      <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Aanvraag annuleren</DialogTitle>
            <DialogDescription>
              Weet je zeker dat je deze aanvraag wilt annuleren? De klant wordt hiervan op de hoogte gesteld.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Textarea
              placeholder="Reden voor annulering (optioneel)"
              value={cancellationReason}
              onChange={(e) => setCancellationReason(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelDialogOpen(false)}>
              Terug
            </Button>
            <Button variant="destructive" onClick={handleCancelRequest} disabled={isCancelling}>
              {isCancelling ? "Annuleren..." : "Aanvraag annuleren"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Invoice registration dialog */}
      <RegisterBureauInvoiceDialog
        isOpen={invoiceDialogOpen}
        onClose={() => setInvoiceDialogOpen(false)}
        requestId={request?.id || ""}
        suggestedAmount={calculateOutstandingAmount()}
        onSuccess={fetchRequestData}
      />

      {/* Add activity sheet */}
      {request && (
        <AdminAddActivitySheet
          open={addActivityOpen}
          onOpenChange={setAddActivityOpen}
          requestId={request.id}
          selectedDates={request.selected_dates as string[]}
          existingBlockIds={items.map(item => item.block_id)}
          onSuccess={fetchRequestData}
        />
      )}

      {/* Edit activity sheet */}
      {request && (
        <AdminEditActivitySheet
          open={editingItem !== null}
          onOpenChange={(open) => !open && setEditingItem(null)}
          item={editingItem}
          requestId={request.id}
          selectedDates={request.selected_dates as string[]}
          onSuccess={fetchRequestData}
        />
      )}

      {/* Apply template dialog */}
      {request && (
        <ApplyTemplateDialog
          open={applyTemplateOpen}
          onOpenChange={setApplyTemplateOpen}
          requestId={request.id}
          onSuccess={fetchRequestData}
        />
      )}

      {/* Save as template dialog */}
      {request && (
        <SaveAsTemplateDialog
          open={saveAsTemplateOpen}
          onOpenChange={setSaveAsTemplateOpen}
          items={items}
        />
      )}
      {/* Add cost sheet */}
      {request && (
        <AdminAddCostSheet
          open={addCostOpen}
          onOpenChange={setAddCostOpen}
          requestId={request.id}
          onSuccess={fetchRequestData}
        />
      )}
    </>
  );
};

export default AdminRequestDetail;
