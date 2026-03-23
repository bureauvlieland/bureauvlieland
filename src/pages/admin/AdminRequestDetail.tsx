import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
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
  Send,
  Pencil,
  Layers,
  Save,
  Euro,
  Trash2,
  CalendarPlus,
  Check,
  
} from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { logAdminActivity, AdminActions, EntityTypes } from "@/lib/adminLogger";
import { 
  itemStatusConfig, 
  type ItemStatus, 
  type ProgramType,
  type QuoteStatus,
  type ItemQuoteStatus,
} from "@/types/programRequest";
import { getItemSendPhase, getItemSendCounts } from "@/lib/projectWorkflow";
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
import { SendProjectEmailSheet } from "@/components/admin/SendProjectEmailSheet";

import { PurchaseInvoicesCard } from "@/components/admin/PurchaseInvoicesCard";
import { ProjectProfitSummary } from "@/components/admin/ProjectProfitSummary";
import { usePurchaseInvoicesByRequest } from "@/hooks/usePurchaseInvoices";
import { getItemLineTotal as centralGetItemLineTotal } from "@/lib/portalPricing";
import { useAppSettings } from "@/hooks/useAppSettings";
import { isBureauItem } from "@/lib/projectWorkflow";
import { ApplyTemplateDialog } from "@/components/admin/ApplyTemplateDialog";
import { SaveAsTemplateDialog } from "@/components/admin/SaveAsTemplateDialog";
import { AdminAiProgramDialog } from "@/components/admin/AdminAiProgramDialog";
import { CopyFromProgramDialog } from "@/components/admin/CopyFromProgramDialog";
import { AdminAddCostSheet } from "@/components/admin/AdminAddCostSheet";
import { AdminCreateAccommodationSheet } from "@/components/admin/AdminCreateAccommodationSheet";
import { downloadAllEvents } from "@/lib/calendarExport";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Copy } from "lucide-react";

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
  invoicing_mode: 'bureau_central';
  // Publish flow
  program_published_at: string | null;
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
  // Price type
  price_type: string | null;
  // Partner notification flag
  skip_partner_notification: boolean | null;
  // Customer approval
  customer_approved_at: string | null;
  // Per-item participant override
  override_people: number | null;
  // Calendar export fields
  confirmed_time: string | null;
  proposed_time: string | null;
  duration: string | null;
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
  const [copyFromProgramOpen, setCopyFromProgramOpen] = useState(false);
  const [saveAsTemplateOpen, setSaveAsTemplateOpen] = useState(false);
  const [addCostOpen, setAddCostOpen] = useState(false);
  const [createAccommodationOpen, setCreateAccommodationOpen] = useState(false);
  const [statusEmailOpen, setStatusEmailOpen] = useState(false);
  const [aiProgramOpen, setAiProgramOpen] = useState(false);
  const [cancellationReason, setCancellationReason] = useState("");
  const [isCancelling, setIsCancelling] = useState(false);
  const [isSendingToPartners, setIsSendingToPartners] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [editingTimeItemId, setEditingTimeItemId] = useState<string | null>(null);
  const [editingTimeValue, setEditingTimeValue] = useState("");
  const [sendPreview, setSendPreview] = useState<{
    partners: { partnerId: string; partnerName: string; items: { id: string; block_name: string }[] }[];
    bureauItemsList: { id: string; block_name: string }[];
  } | null>(null);
  const [sendDialogOpen, setSendDialogOpen] = useState(false);

  // Purchase invoices for profit summary
  const { invoices: purchaseInvoices } = usePurchaseInvoicesByRequest(id || "");

  // App settings for coordination fee
  const { getCoordinationFee: calcCoordFee } = useAppSettings();

  // Calculate bureau invoiced amount for profit summary (incl. coordination fee)
  const numberOfPeople = request?.number_of_people ?? 20;
  const coordinationFeeForProfit = calcCoordFee(numberOfPeople);
  const bureauInvoicedAmount = (() => {
    if (!request) return 0;
    const programTotal = items
      .filter((i) => i.status !== "cancelled" && i.day_index !== -1)
      .reduce((sum, item) => sum + (centralGetItemLineTotal(item as any, request.number_of_people) ?? 0), 0);
    const extraCosts = items
      .filter((i) => i.day_index === -1)
      .reduce((sum, i) => sum + (i.admin_price_override ?? 0), 0);
    return programTotal + extraCosts + coordinationFeeForProfit;
  })();

  // Calculate expected partner costs from items (for when no purchase invoices exist yet)
  const expectedPartnerCosts = (() => {
    if (!request) return 0;
    return items
      .filter((i) => i.status !== "cancelled" && !isBureauItem(i))
      .reduce((sum, item) => sum + (centralGetItemLineTotal(item as any, request.number_of_people) ?? 0), 0);
  })();

  const generateProgramStatusEmailBody = (): { subject: string; body: string } => {
    if (!request || !items) return { subject: "", body: "" };
    
    const sentItems = items.filter(i => 
      i.block_type !== "self_arranged" && 
      (i.skip_partner_notification === false || i.skip_partner_notification === null)
    );
    
    const confirmed = sentItems.filter(i => i.status === "confirmed");
    const unavailable = sentItems.filter(i => i.status === "unavailable");
    const alternative = sentItems.filter(i => i.status === "alternative");
    const pending = sentItems.filter(i => i.status === "pending");
    
    const dates = (request.selected_dates as string[]) || [];
    const dateStr = dates.length > 0 
      ? dates.map(d => format(new Date(d), "d MMMM yyyy", { locale: nl })).join(" t/m ")
      : "nog niet bepaald";
    
    let body = `Beste ${request.customer_name},\n\n`;
    body += `Hierbij een update over de stand van zaken van uw programma${request.reference_number ? ` (${request.reference_number})` : ""}.\n\n`;
    body += `📋 Programma: ${dateStr} | ${request.number_of_people} personen\n\n`;
    body += `Samenvatting:\n`;
    body += `✅ ${confirmed.length} bevestigd\n`;
    if (alternative.length > 0) body += `🔄 ${alternative.length} alternatief voorgesteld\n`;
    if (unavailable.length > 0) body += `❌ ${unavailable.length} niet beschikbaar\n`;
    if (pending.length > 0) body += `⏳ ${pending.length} in afwachting\n`;
    body += `\n`;
    
    // Group by category
    const categories = [...new Set(sentItems.map(i => i.block_category))];
    for (const cat of categories) {
      const catItems = sentItems.filter(i => i.block_category === cat);
      body += `── ${cat} ──\n`;
      for (const item of catItems) {
        const statusLabel = item.status === "confirmed" ? "✅ Bevestigd" 
          : item.status === "unavailable" ? "❌ Niet beschikbaar"
          : item.status === "alternative" ? "🔄 Alternatief"
          : "⏳ In afwachting";
        body += `• ${item.block_name} (${item.provider_name}) — ${statusLabel}\n`;
      }
      body += `\n`;
    }
    
    body += `Bekijk uw volledige programma via: https://bureauvlieland.nl/mijn-programma/${request.customer_token}\n\n`;
    body += `Heeft u vragen? Neem gerust contact met ons op.\n`;
    
    const subject = `Status update programma${request.reference_number ? ` ${request.reference_number}` : ""} — Bureau Vlieland`;
    
    return { subject, body };
  };

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
  const isQuoteMode = true; // All projects now use the unified quote pipeline


  const handleQuoteStatusChange = async (newStatus: QuoteStatus) => {
    try {
      if (newStatus === "akkoord_ontvangen") {
        // Trigger the full accept flow including partner notifications
        const { error } = await supabase.functions.invoke("accept-quote-proposal", {
          body: {
            request_id: request.id,
            admin_override: true,
            origin: window.location.origin,
          },
        });
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("program_requests")
          .update({ quote_status: newStatus })
          .eq("id", request.id);
        if (error) throw error;
      }

      await logAdminActivity({
        action: "quote_status_changed",
        entityType: EntityTypes.REQUEST,
        entityId: request.id,
        details: { old_status: request.quote_status, new_status: newStatus },
      });

      toast.success(
        newStatus === "akkoord_ontvangen"
          ? "Akkoord verwerkt — partners zijn op de hoogte gebracht"
          : "Offerte-status bijgewerkt"
      );
      fetchRequestData();
    } catch (error) {
      console.error("Error updating quote status:", error);
      toast.error("Fout bij bijwerken status");
    }
  };

  const itemCounts = getItemSendCounts(items, request);
  const readyToSendCount = itemCounts.readyForPartner;
  const waitingForCustomerCount = itemCounts.waitingForCustomer;
  const bureauInternCount = itemCounts.bureauIntern;

  const handlePreviewSendToPartners = async () => {
    if (!request) return;
    try {
      const { data, error } = await supabase.functions.invoke("send-items-to-partners", {
        body: { request_id: request.id, origin: window.location.origin, dry_run: true },
      });
      if (error) throw error;
      setSendPreview(data);
      setSendDialogOpen(true);
    } catch (error) {
      console.error("Error previewing send:", error);
      toast.error("Fout bij ophalen verzendoverzicht");
    }
  };

  const handleConfirmSendToPartners = async () => {
    if (!request) return;
    setIsSendingToPartners(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-items-to-partners", {
        body: { request_id: request.id, origin: window.location.origin },
      });
      if (error) throw error;

      setSendDialogOpen(false);
      setSendPreview(null);
      toast.success(data?.message || "Items naar partners verstuurd");
      fetchRequestData();
    } catch (error) {
      console.error("Error sending to partners:", error);
      toast.error("Fout bij versturen naar partners");
    } finally {
      setIsSendingToPartners(false);
    }
  };

  const handlePublishProgram = async () => {
    if (!request) return;
    setIsPublishing(true);
    try {
      const { error } = await supabase
        .from("program_requests")
        .update({ program_published_at: new Date().toISOString() })
        .eq("id", request.id);
      if (error) throw error;

      await logAdminActivity({
        action: "program_published",
        entityType: EntityTypes.REQUEST,
        entityId: request.id,
        details: { items_count: items.length },
      });

      toast.success("Programma gepubliceerd naar de klant");
      fetchRequestData();
    } catch (error) {
      console.error("Error publishing program:", error);
      toast.error("Fout bij publiceren programma");
    } finally {
      setIsPublishing(false);
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

  const handleItemPriceUpdate = async (itemId: string, price: number | null, notes: string, newPriceType?: "per_person" | "per_person_per_day" | "total") => {
    try {
      const updateData: Record<string, unknown> = { 
        admin_price_override: price,
        admin_price_notes: notes || null,
      };
      if (newPriceType) {
        updateData.price_type = newPriceType;
      }
      const { error } = await supabase
        .from("program_request_items")
        .update(updateData)
        .eq("id", itemId);

      if (error) throw error;

      // Resolve bureau_item_pricing todo if a price was set
      if (price !== null) {
        const { resolveAutoTodo } = await import("@/lib/autoTodoCreator");
        await resolveAutoTodo("bureau_item_pricing", itemId);
      }

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
                    Aanvraag van {format(new Date(request.created_at), "EEE d MMMM yyyy", { locale: nl })}
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
                    customerCompany={request.customer_company}
                    numberOfPeople={request.number_of_people}
                    programDates={request.selected_dates as string[]}
                    currentValidUntil={request.quote_valid_until}
                    portalUrl={customerPortalUrl}
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
                        Bureau Vlieland beheert de offerte en factureert centraal.
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
                        <>Op {format(new Date(request.cancelled_at), "EEE d MMMM yyyy 'om' HH:mm", { locale: nl })}</>
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
                            Dag {idx + 1}: {format(new Date(date), "EEE d MMMM yyyy", { locale: nl })}
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
                  <Button onClick={() => setCreateAccommodationOpen(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Logiesaanvraag maken
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

          {/* Waiting for customer banner (offerte verstuurd, no customer approval yet) */}
          {waitingForCustomerCount > 0 && readyToSendCount === 0 && (
            <Card className="border-blue-300 bg-blue-50">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <Clock className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-blue-900">
                      Offerte verstuurd — wacht op akkoord van klant
                    </p>
                    <p className="text-sm text-blue-700">
                      {waitingForCustomerCount} {waitingForCustomerCount === 1 ? "onderdeel wacht" : "onderdelen wachten"} op klantakkoord voordat ze naar partners verstuurd kunnen worden.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Ready to send banner (customer approved, admin can send to partners) */}
          {readyToSendCount > 0 && (
            <Card className="border-amber-300 bg-amber-50">
              <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <Send className="h-5 w-5 text-amber-600 mt-0.5" />
                    <div>
                      <p className="font-medium text-amber-900">
                        {readyToSendCount} {readyToSendCount === 1 ? "onderdeel is" : "onderdelen zijn"} klaar om naar partners te sturen
                      </p>
                      <p className="text-sm text-amber-700">
                        Verstuur wanneer gereed.
                        {bureauInternCount > 0 && ` ${bureauInternCount} bureau-item(s) worden intern afgehandeld.`}
                      </p>
                    </div>
                  </div>
                  <Button
                    onClick={handlePreviewSendToPartners}
                    disabled={isSendingToPartners}
                    className="shrink-0"
                  >
                    <Send className="h-4 w-4 mr-2" />
                    Bekijk &amp; verstuur
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Bureau items only — no partner items to send */}
          {readyToSendCount === 0 && bureauInternCount > 0 && waitingForCustomerCount === 0 && (
            <Card className="border-slate-300 bg-slate-50">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <Building2 className="h-5 w-5 text-slate-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-slate-900">
                      {bureauInternCount} bureau-item(s) worden intern afgehandeld
                    </p>
                    <p className="text-sm text-slate-700">
                      Alle resterende onderdelen zijn interne bureau-items. Er hoeven geen externe partners genotificeerd te worden.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}




          {/* Concept banner — program not yet published to customer */}
          {!request.program_published_at && items.length > 0 && (
            <Card className="border-blue-300 bg-blue-50">
              <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
                    <div>
                      <p className="font-medium text-blue-900">
                        Dit programma is nog niet gepubliceerd naar de klant
                      </p>
                      <p className="text-sm text-blue-700">
                        De klant ziet het programma als 'In behandeling'. Na publicatie worden items zichtbaar.
                      </p>
                    </div>
                  </div>
                  <Button
                    onClick={handlePublishProgram}
                    disabled={isPublishing}
                    className="shrink-0"
                  >
                    <Send className="h-4 w-4 mr-2" />
                    {isPublishing ? "Publiceren..." : "Publiceer naar klant"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

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
                    <Button variant="outline" onClick={() => setAiProgramOpen(true)}>
                      <Sparkles className="h-4 w-4 mr-2" />
                      AI Programma
                    </Button>
                    <Button variant="outline" onClick={() => setApplyTemplateOpen(true)}>
                      <Layers className="h-4 w-4 mr-2" />
                      Template toepassen
                    </Button>
                    <Button variant="outline" onClick={() => setCopyFromProgramOpen(true)}>
                      <Copy className="h-4 w-4 mr-2" />
                      Kopieer programma
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
                    <Button variant="outline" onClick={() => {
                      setStatusEmailOpen(true);
                    }}>
                      <Mail className="h-4 w-4 mr-2" />
                      Status update e-mail
                    </Button>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => {
                              const activeItems = items.filter(i => i.day_index >= 0);
                              downloadAllEvents(
                                activeItems.map(i => ({
                                  id: i.id,
                                  block_name: i.block_name,
                                  provider_name: i.provider_name,
                                  day_index: i.day_index,
                                  confirmed_time: i.confirmed_time,
                                  proposed_time: i.proposed_time,
                                  preferred_time: i.preferred_time,
                                  duration: i.duration,
                                })),
                                request.selected_dates as string[],
                                request.number_of_people,
                                request.customer_name || "programma"
                              );
                            }}
                          >
                            <CalendarPlus className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Exporteer naar agenda</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    {items.filter(i => i.day_index >= 0).length > 0 && (
                      <Button
                        variant="outline"
                        className="text-destructive hover:text-destructive"
                        onClick={async () => {
                          const activeItems = items.filter(i => i.day_index >= 0);
                          const { error } = await supabase
                            .from("program_request_items")
                            .delete()
                            .in("id", activeItems.map(i => i.id));
                          if (!error) {
                            toast.success(`${activeItems.length} activiteiten verwijderd`);
                            fetchRequestData();
                          } else {
                            toast.error("Fout bij leegmaken");
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Alles verwijderen
                      </Button>
                    )}
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
                              <TableHead>Deelnemers</TableHead>
                              <TableHead>Prijs (aanpasbaar)</TableHead>
                              <TableHead className="w-[80px]"></TableHead>
                            </>
                          ) : (
                            <>
                              <TableHead>Status</TableHead>
                              <TableHead>Prijs</TableHead>
                              <TableHead>Factuur</TableHead>
                              <TableHead className="w-[80px]">Acties</TableHead>
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
                                {(() => {
                                  const activeTime = item.confirmed_time || item.proposed_time || item.preferred_time;
                                  if (!activeTime) return "-";
                                  const isConfirmed = !!item.confirmed_time;
                                  const isProposal = !item.confirmed_time && !!item.proposed_time;
                                  const showOriginal = (isConfirmed || isProposal) && item.preferred_time && activeTime !== item.preferred_time;
                                  const isEditingTime = editingTimeItemId === item.id;

                                  const handleConfirmTime = async (time: string) => {
                                    const { error } = await supabase
                                      .from("program_request_items")
                                      .update({
                                        confirmed_time: time,
                                        status: "confirmed",
                                        status_note: `Tijd ${time} bevestigd door admin`,
                                        status_updated_at: new Date().toISOString(),
                                      })
                                      .eq("id", item.id);
                                    if (error) {
                                      toast.error("Fout bij bevestigen tijd");
                                    } else {
                                      toast.success(`Tijd ${time} bevestigd`);
                                      setEditingTimeItemId(null);
                                      setEditingTimeValue("");
                                      fetchRequestData();
                                    }
                                  };

                                  return (
                                    <div className="space-y-0.5">
                                      <div className="flex items-center gap-1">
                                        <span className={cn(
                                          "font-medium",
                                          isConfirmed && "text-green-700",
                                          isProposal && "text-orange-600",
                                        )}>
                                          {activeTime}
                                          {isProposal && <span className="text-xs ml-1">(voorstel)</span>}
                                        </span>
                                        {isProposal && (
                                          <TooltipProvider>
                                            <Tooltip>
                                              <TooltipTrigger asChild>
                                                <Button
                                                  variant="ghost"
                                                  size="icon"
                                                  className="h-6 w-6 text-green-600 hover:text-green-700 hover:bg-green-50"
                                                  onClick={() => handleConfirmTime(item.proposed_time!)}
                                                >
                                                  <Check className="h-3.5 w-3.5" />
                                                </Button>
                                              </TooltipTrigger>
                                              <TooltipContent>Accepteer {item.proposed_time}</TooltipContent>
                                            </Tooltip>
                                          </TooltipProvider>
                                        )}
                                        {!isConfirmed && (
                                          <Popover open={isEditingTime} onOpenChange={(open) => {
                                            if (open) {
                                              setEditingTimeItemId(item.id);
                                              setEditingTimeValue(item.proposed_time || item.preferred_time || "");
                                            } else {
                                              setEditingTimeItemId(null);
                                              setEditingTimeValue("");
                                            }
                                          }}>
                                            <TooltipProvider>
                                              <Tooltip>
                                                <TooltipTrigger asChild>
                                                  <PopoverTrigger asChild>
                                                    <Button
                                                      variant="ghost"
                                                      size="icon"
                                                      className="h-6 w-6 text-muted-foreground hover:text-foreground"
                                                    >
                                                      <Clock className="h-3.5 w-3.5" />
                                                    </Button>
                                                  </PopoverTrigger>
                                                </TooltipTrigger>
                                                <TooltipContent>Andere tijd instellen</TooltipContent>
                                              </Tooltip>
                                            </TooltipProvider>
                                            <PopoverContent className="w-48 p-3" align="start">
                                              <div className="space-y-2">
                                                <label className="text-xs font-medium">Bevestigde tijd</label>
                                                <Input
                                                  type="time"
                                                  value={editingTimeValue}
                                                  onChange={(e) => setEditingTimeValue(e.target.value)}
                                                  className="h-8"
                                                />
                                                <Button
                                                  size="sm"
                                                  className="w-full"
                                                  disabled={!editingTimeValue}
                                                  onClick={() => handleConfirmTime(editingTimeValue)}
                                                >
                                                  Bevestigen
                                                </Button>
                                              </div>
                                            </PopoverContent>
                                          </Popover>
                                        )}
                                      </div>
                                      {showOriginal && (
                                        <div className="text-xs text-muted-foreground line-through">{item.preferred_time}</div>
                                      )}
                                    </div>
                                  );
                                })()}
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
                                    <input
                                      type="number"
                                      min={1}
                                      className={cn(
                                        "w-16 h-8 text-sm text-center rounded border bg-background px-1",
                                        item.override_people != null && item.override_people !== request.number_of_people
                                          ? "border-orange-400 text-orange-700 font-medium"
                                          : "border-input"
                                      )}
                                      placeholder={String(request.number_of_people)}
                                      defaultValue={item.override_people ?? ""}
                                      onBlur={async (e) => {
                                        const val = e.target.value ? parseInt(e.target.value, 10) : null;
                                        if (val === item.override_people) return;
                                        const { error } = await supabase
                                          .from("program_request_items")
                                          .update({ override_people: val })
                                          .eq("id", item.id);
                                        if (error) {
                                          toast.error("Fout bij opslaan deelnemers");
                                        } else {
                                          toast.success("Deelnemers bijgewerkt");
                                          fetchRequestData();
                                        }
                                      }}
                                    />
                                  </TableCell>
                                  <TableCell>
                                    <AdminQuotePriceEditor
                                      originalPrice={item.quoted_price}
                                      overridePrice={item.admin_price_override}
                                      priceNotes={item.admin_price_notes}
                                      numberOfPeople={item.override_people ?? request.number_of_people}
                                      priceType={item.price_type === "total" ? "total" : item.price_type === "per_person_per_day" ? "per_person_per_day" : "per_person"}
                                      onSave={(price, notes, pt) => handleItemPriceUpdate(item.id, price, notes, pt)}
                                    />
                                  </TableCell>
                                   <TableCell>
                                    <div className="flex items-center gap-1">
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => setEditingItem(item)}
                                        className="h-8 w-8"
                                      >
                                        <Pencil className="h-4 w-4" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 text-destructive hover:text-destructive"
                                        onClick={async () => {
                                          const { error } = await supabase
                                            .from("program_request_items")
                                            .delete()
                                            .eq("id", item.id);
                                          if (!error) {
                                            toast.success("Activiteit verwijderd");
                                            fetchRequestData();
                                          } else {
                                            toast.error("Fout bij verwijderen");
                                          }
                                        }}
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  </TableCell>
                                </>
                              ) : (
                                <>
                                  <TableCell>
                                    <div className="flex items-center gap-2">
                                      {statusIcons[item.status]}
                                      <Badge className={`${statusInfo.bgColor} ${statusInfo.color}`}>
                                      {(() => {
                                          if (item.skip_partner_notification) {
                                            const phase = getItemSendPhase(item, request);
                                            if (phase === "wacht_op_klant") return "Wacht op klant";
                                            if (phase === "klaar_voor_partner") return "Klaar om te versturen";
                                            if (phase === "bureau_intern") return "Bureau intern";
                                          }
                                          return statusInfo.label;
                                        })()}
                                      </Badge>
                                    </div>
                                    {item.status_note && (
                                      <p className="text-xs text-slate-500 mt-1">{item.status_note}</p>
                                    )}
                                  </TableCell>
                                  <TableCell>
                                    {item.quoted_price != null ? (
                                      <span className="font-medium">
                                        €{item.quoted_price.toLocaleString("nl-NL", { minimumFractionDigits: 2 })}
                                      </span>
                                    ) : item.admin_price_override != null ? (
                                      <div>
                                        <span className="font-medium">
                                          €{item.admin_price_override.toLocaleString("nl-NL", { minimumFractionDigits: 2 })}
                                        </span>
                                        <span className="text-xs text-muted-foreground ml-1">(standaard)</span>
                                      </div>
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
                                  <TableCell>
                                    <div className="flex items-center gap-1">
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => setEditingItem(item)}
                                        className="h-8 w-8"
                                      >
                                        <Pencil className="h-4 w-4" />
                                      </Button>
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
                                            toast.success("Activiteit verwijderd");
                                            fetchRequestData();
                                          }
                                        }}
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </div>
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
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      <h4 className="font-medium text-sm">Facturatiemodel</h4>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Bureau Vlieland factureert de klant. Partners factureren Bureau Vlieland (inkoop).
                    </p>
                  </CardContent>
                </Card>
                <div className="md:col-span-2">
                  <PurchaseInvoicesCard requestId={request.id} />
                </div>
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
                  requestId={request.id}
                  numberOfPeople={request.number_of_people}
                  items={items}
                  invoices={bureauInvoices}
                  onRegisterInvoice={() => setInvoiceDialogOpen(true)}
                  isQuoteMode={isQuoteMode}
                />
              </div>
              {/* Margin overview */}
              <ProjectProfitSummary
                purchaseInvoices={purchaseInvoices || []}
                bureauInvoicedAmount={bureauInvoicedAmount}
                coordinationFee={coordinationFeeForProfit}
                expectedPartnerCosts={expectedPartnerCosts}
              />
            </TabsContent>

            {/* Tab: Communicatie */}
            <TabsContent value="communicatie">
              <ProjectCommunicationsCard
                requestId={request.id}
                accommodationId={request.linked_accommodation_id || undefined}
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
          invoicingMode={request.invoicing_mode}
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
          invoicingMode={request.invoicing_mode}
        />
      )}

      {/* Copy from program dialog */}
      {request && (
        <CopyFromProgramDialog
          open={copyFromProgramOpen}
          onOpenChange={setCopyFromProgramOpen}
          requestId={request.id}
          durationDays={(() => {
            const dates = request.selected_dates as string[];
            if (dates.length <= 1) return dates.length;
            const sorted = [...dates].sort();
            return Math.ceil((new Date(sorted[sorted.length - 1]).getTime() - new Date(sorted[0]).getTime()) / (1000 * 60 * 60 * 24)) + 1;
          })()}
          numberOfPeople={request.number_of_people}
          programType={request.program_type}
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
      {/* Create accommodation sheet */}
      {request && (
        <AdminCreateAccommodationSheet
          open={createAccommodationOpen}
          onOpenChange={setCreateAccommodationOpen}
          project={{
            id: request.id,
            customer_name: request.customer_name,
            customer_email: request.customer_email,
            customer_phone: request.customer_phone,
            customer_company: request.customer_company,
            number_of_people: request.number_of_people,
            selected_dates: request.selected_dates as string[],
          }}
          onCreated={fetchRequestData}
        />
      )}
      {/* Status update email sheet */}
      {request && (
        <SendProjectEmailSheet
          open={statusEmailOpen}
          onOpenChange={setStatusEmailOpen}
          requestId={request.id}
          recipients={[{
            label: `Klant: ${request.customer_name}`,
            email: request.customer_email,
            name: request.customer_name,
            type: "customer" as const,
          }]}
          defaultSubject={generateProgramStatusEmailBody().subject}
          defaultBody={generateProgramStatusEmailBody().body}
          onEmailSent={fetchRequestData}
        />
      )}
      {/* AI Program dialog */}
      {request && (
        <AdminAiProgramDialog
          open={aiProgramOpen}
          onOpenChange={setAiProgramOpen}
          requestId={request.id}
          numberOfPeople={request.number_of_people}
          selectedDates={request.selected_dates as string[]}
          customerDescription={request.general_notes}
          onSuccess={fetchRequestData}
          invoicingMode={request.invoicing_mode}
        />
      )}
      {/* Send to partners review dialog */}
      <Dialog open={sendDialogOpen} onOpenChange={setSendDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Verstuur naar partners</DialogTitle>
            <DialogDescription>
              Controleer welke partners een notificatie ontvangen.
            </DialogDescription>
          </DialogHeader>
          {sendPreview && (
            <div className="space-y-4 max-h-[60vh] overflow-y-auto">
              {sendPreview.partners.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                    <Send className="h-4 w-4" />
                    Partners die bericht krijgen ({sendPreview.partners.length})
                  </h4>
                  <div className="space-y-2">
                    {sendPreview.partners.map((partner) => (
                      <div key={partner.partnerId} className="border rounded-lg p-3">
                        <p className="font-medium text-sm">{partner.partnerName}</p>
                        <ul className="mt-1 space-y-0.5">
                          {partner.items.map((item) => (
                            <li key={item.id} className="text-xs text-muted-foreground">• {item.block_name}</li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {sendPreview.bureauItemsList.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    Bureau-items (intern, geen notificatie)
                  </h4>
                  <ul className="space-y-0.5">
                    {sendPreview.bureauItemsList.map((item) => (
                      <li key={item.id} className="text-xs text-muted-foreground">• {item.block_name}</li>
                    ))}
                  </ul>
                </div>
              )}
              {sendPreview.partners.length === 0 && (
                <div className="text-center py-4 text-muted-foreground text-sm">
                  Geen partner-items om te versturen. Alle resterende items zijn bureau-items.
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSendDialogOpen(false)}>Annuleren</Button>
            <Button
              onClick={handleConfirmSendToPartners}
              disabled={isSendingToPartners || !sendPreview?.partners.length}
            >
              <Send className="h-4 w-4 mr-2" />
              {isSendingToPartners ? "Versturen..." : `Verstuur naar ${sendPreview?.partners.length || 0} partner(s)`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default AdminRequestDetail;
