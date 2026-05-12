import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { useParams, useNavigate, Link, useSearchParams } from "react-router-dom";
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
  ShieldCheck,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { logAdminActivity, AdminActions, EntityTypes } from "@/lib/adminLogger";
import { ensureSendItemsTodo } from "@/lib/sendItemsTodo";
import { 
  itemStatusConfig, 
  type ItemStatus, 
  type ProgramType,
  type QuoteStatus,
  type ItemQuoteStatus,
} from "@/types/programRequest";
import { getItemSendPhase, getItemSendCounts } from "@/lib/projectWorkflow";
import { NextStepBanner } from "@/components/admin/NextStepBanner";
import { FinancialOverviewCard } from "@/components/admin/FinancialOverviewCard";
import { RegisterBureauInvoiceDialog } from "@/components/admin/RegisterBureauInvoiceDialog";

import { RequestCompletionStatus } from "@/components/admin/RequestCompletionStatus";
import { CompletionActions } from "@/components/admin/CompletionActions";
import { AdminPartnerConflictBanner } from "@/components/admin/AdminPartnerConflictBanner";
import { AdminQuoteStatusBadge } from "@/components/admin/AdminQuoteStatusBadge";
import { AdminItemQuoteStatusSelect } from "@/components/admin/AdminItemQuoteStatusSelect";
import { AdminQuotePriceEditor } from "@/components/admin/AdminQuotePriceEditor";
import { AdminItemBillingLinesEditor } from "@/components/admin/AdminItemBillingLinesEditor";
import { useItemBillingLinesBatch } from "@/hooks/useItemBillingLines";
import { useItemVatRates } from "@/hooks/useItemVatRates";
import { AdminSendQuoteDialog } from "@/components/admin/AdminSendQuoteDialog";
import { AdminAddActivitySheet } from "@/components/admin/AdminAddActivitySheet";
import { AdminEditActivitySheet } from "@/components/admin/AdminEditActivitySheet";
import { calculateProjectGrandTotal, calculateProjectOutstandingAmount } from "@/lib/projectFinancials";
import type { BureauInvoice } from "@/types/bureauInvoice";
import type { CompletionStatus } from "@/types/bureauInvoice";
import { ProjectCommunicationsCard } from "@/components/admin/ProjectCommunicationsCard";
import { SendProjectEmailSheet } from "@/components/admin/SendProjectEmailSheet";

import { PurchaseInvoicesCard } from "@/components/admin/PurchaseInvoicesCard";
import { ProjectProfitSummary } from "@/components/admin/ProjectProfitSummary";
import { usePurchaseInvoicesByRequest } from "@/hooks/usePurchaseInvoices";
import { getItemLineTotal as centralGetItemLineTotal, getDisplayLineTotal, hasOpenAdminPriceChange, isPerPersonItem, isPerDayItem, getEffectivePeople, getNumberOfDays } from "@/lib/portalPricing";
import { deriveItemDisplayStatus } from "@/lib/itemStatus";
import { ItemDisplayStatusBadge } from "@/components/shared/ItemDisplayStatusBadge";
import { useAppSettings } from "@/hooks/useAppSettings";
// Bureau-items herkennen we direct via provider_id (audit-beslissing Fase 4a):
const isBureauItem = (i: { provider_id?: string | null }) => i.provider_id === "bureau";
import { ApplyTemplateDialog } from "@/components/admin/ApplyTemplateDialog";
import { SaveAsTemplateDialog } from "@/components/admin/SaveAsTemplateDialog";
import { AdminAiProgramDialog } from "@/components/admin/AdminAiProgramDialog";
import { CopyFromProgramDialog } from "@/components/admin/CopyFromProgramDialog";
import { SyncBuildingBlocksDialog } from "@/components/admin/SyncBuildingBlocksDialog";
import { AdminAddCostSheet } from "@/components/admin/AdminAddCostSheet";
import { AdminCreateAccommodationSheet } from "@/components/admin/AdminCreateAccommodationSheet";
import { EditProjectDetailsDialog } from "@/components/admin/EditProjectDetailsDialog";
import { downloadAllEvents } from "@/lib/calendarExport";
import { useQuoteExtras } from "@/hooks/useQuoteExtras";
import { calculateExtrasTotal } from "@/types/accommodationExtras";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Copy, RefreshCw, CalendarIcon, AlertTriangle, Info } from "lucide-react";

const LegendPill = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <span className={cn("inline-flex items-center whitespace-nowrap rounded-md border px-2 py-0.5 text-[11px] font-medium leading-tight", className)}>
    {children}
  </span>
);
import { Calendar as CalendarPicker } from "@/components/ui/calendar";


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
  origin?: string | null;
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
  // Billing fields
  billing_company_name: string | null;
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
  customer_accepted_at: string | null;
  // Per-item participant override
  override_people: number | null;
  // Calendar export fields
  confirmed_time: string | null;
  proposed_time: string | null;
  duration: string | null;
  // Location (optional, used by edit sheet)
  location_lat?: number | null;
  location_lng?: number | null;
  location_address?: string | null;
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
  const [searchParams, setSearchParams] = useSearchParams();
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
  const [editingCost, setEditingCost] = useState<any | null>(null);
  const [syncBlocksOpen, setSyncBlocksOpen] = useState(false);
  const [createAccommodationOpen, setCreateAccommodationOpen] = useState(false);
  const [statusEmailOpen, setStatusEmailOpen] = useState(false);
  const [highlightStatusEmail, setHighlightStatusEmail] = useState(false);

  // Auto-open status-mail sheet when navigated from a todo with ?action=status-email
  useEffect(() => {
    if (searchParams.get("action") === "status-email") {
      setStatusEmailOpen(true);
      setHighlightStatusEmail(true);
      // Clear the param so refresh doesn't reopen the sheet
      const next = new URLSearchParams(searchParams);
      next.delete("action");
      setSearchParams(next, { replace: true });
      // Stop highlighting after a few seconds
      const t = setTimeout(() => setHighlightStatusEmail(false), 4000);
      return () => clearTimeout(t);
    }
  }, [searchParams, setSearchParams]);
  const [aiProgramOpen, setAiProgramOpen] = useState(false);
  const [editDetailsOpen, setEditDetailsOpen] = useState(false);
  const [cancellationReason, setCancellationReason] = useState("");
  const [isCancelling, setIsCancelling] = useState(false);
  const [isSendingToPartners, setIsSendingToPartners] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [sendPreview, setSendPreview] = useState<{
    partners: { partnerId: string; partnerName: string; items: { id: string; block_name: string }[] }[];
    bureauItemsList: { id: string; block_name: string }[];
  } | null>(null);
  const [sendDialogOpen, setSendDialogOpen] = useState(false);

  // Purchase invoices for profit summary
  const { invoices: purchaseInvoices } = usePurchaseInvoicesByRequest(id || "");

  // VAT rates per item (from building_blocks)
  const { getItemVatRate } = useItemVatRates(items);

  // Definitive billing lines per item (override quoted_price in financial overview)
  const { linesByItem: billingLinesByItem } = useItemBillingLinesBatch(items.map((i) => i.id));

  // App settings for coordination fee + surcharges
  const { getCoordinationFee: calcCoordFee, settings: appSettings } = useAppSettings();

  // Selected accommodation quote for this request
  const [selectedAccommodationQuote, setSelectedAccommodationQuote] = useState<{
    id: string;
    price_total: number;
    vat_rate: number;
    accommodation_name: string;
    customer_terms_accepted_at: string | null;
    customer_signature_name: string | null;
  } | null>(null);

  useEffect(() => {
    if (!request?.linked_accommodation_id) {
      setSelectedAccommodationQuote(null);
      return;
    }
    supabase
      .from("accommodation_quotes")
      .select("id, price_total, vat_rate, accommodation_name, customer_terms_accepted_at, customer_signature_name")
      .eq("request_id", request.linked_accommodation_id)
      .eq("status", "selected")
      .maybeSingle()
      .then(({ data }) => {
        setSelectedAccommodationQuote(data ? {
          id: data.id,
          price_total: data.price_total,
          vat_rate: data.vat_rate ?? 9,
          accommodation_name: data.accommodation_name,
          customer_terms_accepted_at: (data as any).customer_terms_accepted_at ?? null,
          customer_signature_name: (data as any).customer_signature_name ?? null,
        } : null);
      });
  }, [request?.linked_accommodation_id]);

  const { data: accommodationExtras = [] } = useQuoteExtras(selectedAccommodationQuote?.id);

  // Calculate bureau invoiced amount for profit summary (incl. coordination fee)
  const numberOfPeople = request?.number_of_people ?? 20;
  const coordinationFeeForProfit = calcCoordFee(numberOfPeople);

  // Number of days from selected_dates
  const numberOfDays = (() => {
    const dates = (request?.selected_dates as string[]) || [];
    return Math.max(dates.length, 1);
  })();

  // Extra cost lines matching customer portal
  const touristTax = appSettings.tourist_tax_pp_per_day * numberOfPeople * numberOfDays;
  const natureContribution = appSettings.nature_contribution_pp * numberOfPeople;
  const centralSurcharge = request?.invoicing_mode === "bureau_central"
    ? appSettings.bureau_central_surcharge_pp * numberOfPeople
    : 0;
  const accommodationBaseTotal = selectedAccommodationQuote?.price_total ?? 0;
  const accommodationExtrasTotal = calculateExtrasTotal(accommodationExtras);
  const accommodationTotal = accommodationBaseTotal + accommodationExtrasTotal;

  const bureauInvoicedAmount = request ? calculateProjectGrandTotal({
    items,
    numberOfPeople: request.number_of_people,
    numberOfDays,
    coordinationFee: coordinationFeeForProfit,
    touristTax,
    natureContribution,
    centralSurcharge,
    accommodationTotal,
    linesByItem: billingLinesByItem,
  }) : 0;

  // Calculate expected partner costs from items (for when no purchase invoices exist yet)
  const expectedPartnerCosts = (() => {
    if (!request) return 0;
    return items
      .filter((i) => i.status !== "cancelled" && !isBureauItem(i))
      .reduce((sum, item) => sum + (centralGetItemLineTotal(item as any, request.number_of_people) ?? 0), 0);
  })();

  const generateProgramStatusEmailBody = (): { subject: string; body: string } => {
    if (!request || !items) return { subject: "", body: "" };

    const ref = request.reference_number ? ` (${request.reference_number})` : "";
    const refShort = request.reference_number ? ` ${request.reference_number}` : "";
    const dates = (request.selected_dates as string[]) || [];
    const dateStr = dates.length > 0
      ? dates.map(d => format(new Date(d), "d MMMM yyyy", { locale: nl })).join(" t/m ")
      : "nog niet bepaald";
    const portalUrl = `https://bureauvlieland.nl/mijn-programma/${request.customer_token}`;

    // Determine phase
    const quoteStatus = request.quote_status || "concept";
    const anyCustomerApproved = items.some(i => i.customer_approved_at);
    const anySentToPartner = items.some(i =>
      i.block_type !== "self_arranged" &&
      (i.skip_partner_notification === false || i.skip_partner_notification === null)
    );

    let phase: "A_concept" | "B_waiting_customer" | "C_partners_contacted" | "D_definitive";
    if (quoteStatus === "definitief_bevestigd") {
      phase = "D_definitive";
    } else if (anyCustomerApproved && anySentToPartner) {
      phase = "C_partners_contacted";
    } else if (quoteStatus === "offerte_verstuurd") {
      phase = "B_waiting_customer";
    } else if (anyCustomerApproved || quoteStatus === "akkoord_ontvangen") {
      phase = "C_partners_contacted";
    } else {
      phase = "A_concept";
    }

    // Action items the customer still needs to complete
    const buildActionItems = (): string[] => {
      const out: string[] = [];
      if (phase === "B_waiting_customer" || quoteStatus === "offerte_verstuurd") {
        out.push(`Bekijk de offerte en geef uw akkoord via het klantportaal`);
      }
      if (!request.terms_accepted_at && ["offerte_verstuurd", "akkoord_ontvangen"].includes(quoteStatus)) {
        out.push("Accepteer de algemene voorwaarden");
      }
      if (!request.billing_company_name) {
        out.push("Vul uw facturatiegegevens aan");
      }
      if (linkedAccommodation && linkedAccommodation.status !== "accepted") {
        out.push("Beoordeel de logiesoffertes en maak een keuze");
      }
      return out;
    };

    let body = `Beste ${request.customer_name},\n\n`;
    let subject = `Status update programma${refShort} — Bureau Vlieland`;

    // ─── Phase A: Concept ─────────────────────────────────────────────
    if (phase === "A_concept") {
      subject = `Update programma${refShort} — Bureau Vlieland`;
      body += `Wij werken op dit moment aan de uitwerking van uw programma${ref}. Zodra de offerte gereed is ontvangt u deze van ons.\n\n`;
      body += `📋 Programma: ${dateStr} | ${request.number_of_people} personen\n\n`;
      const actions = buildActionItems();
      if (actions.length > 0) {
        body += `── Wat we alvast van u kunnen gebruiken ──\n`;
        for (const a of actions) body += `📌 ${a}\n`;
        body += `\n`;
      }
      body += `Heeft u tussentijds vragen? Neem gerust contact met ons op.\n`;
    }

    // ─── Phase B: Quote sent, waiting on customer ─────────────────────
    else if (phase === "B_waiting_customer") {
      subject = `Uw offerte staat klaar — graag uw akkoord${refShort}`;
      body += `Uw offerte staat klaar in het klantportaal. We wachten nu op uw akkoord voordat we de onderdelen definitief bij onze partners kunnen vastleggen.\n\n`;
      body += `📋 Programma: ${dateStr} | ${request.number_of_people} personen\n\n`;

      const actions = buildActionItems();
      if (actions.length > 0) {
        body += `── Wat we van u nodig hebben ──\n`;
        for (const a of actions) body += `📌 ${a}\n`;
        body += `\n`;
      }

      body += `👉 Bekijk uw offerte en geef akkoord:\n${portalUrl}\n\n`;
      body += `Zodra wij uw akkoord hebben ontvangen, benaderen wij direct de partners om de onderdelen vast te leggen. U ontvangt dan automatisch updates per onderdeel.\n\n`;
      body += `Heeft u vragen over de offerte? Neem gerust contact met ons op.\n`;
    }

    // ─── Phase C: Partners contacted ──────────────────────────────────
    else if (phase === "C_partners_contacted") {
      subject = `Status update programma${refShort} — Bureau Vlieland`;

      const sentItems = items.filter(i =>
        i.block_type !== "self_arranged" &&
        (i.skip_partner_notification === false || i.skip_partner_notification === null)
      );
      const confirmed = sentItems.filter(i => i.status === "confirmed");
      const unavailable = sentItems.filter(i => i.status === "unavailable");
      const alternative = sentItems.filter(i => i.status === "alternative");
      const pending = sentItems.filter(i => i.status === "pending");

      body += `Hierbij een update over de stand van zaken van uw programma${ref}.\n\n`;
      body += `📋 Programma: ${dateStr} | ${request.number_of_people} personen\n\n`;
      body += `Samenvatting:\n`;
      body += `✅ ${confirmed.length} bevestigd\n`;
      if (alternative.length > 0) body += `🔄 ${alternative.length} alternatief voorgesteld\n`;
      if (unavailable.length > 0) body += `❌ ${unavailable.length} niet beschikbaar\n`;
      if (pending.length > 0) body += `⏳ ${pending.length} in afwachting bij partner\n`;
      body += `\n`;

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

      const actions = buildActionItems();
      if (actions.length > 0) {
        body += `── Wat we nog van u nodig hebben ──\n`;
        for (const a of actions) body += `📌 ${a}\n`;
        body += `\n`;
      }

      body += `Bekijk uw volledige programma via:\n${portalUrl}\n\n`;
      body += `Heeft u vragen? Neem gerust contact met ons op.\n`;
    }

    // ─── Phase D: Definitive ──────────────────────────────────────────
    else {
      subject = `Programma definitief bevestigd${refShort} — Bureau Vlieland`;
      body += `Uw programma${ref} is volledig bevestigd. Alle onderdelen zijn vastgelegd bij onze partners en u kunt zich verheugen op uw verblijf op Vlieland.\n\n`;
      body += `📋 Programma: ${dateStr} | ${request.number_of_people} personen\n\n`;
      body += `Bekijk uw definitieve programma via:\n${portalUrl}\n\n`;
      body += `Mocht u nog vragen hebben, neem gerust contact met ons op.\n`;
    }

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
        () => fetchRequestData({ silent: true })
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'program_requests',
          filter: `id=eq.${id}`,
        },
        () => fetchRequestData({ silent: true })
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id]);

  const fetchRequestData = async (options?: { silent?: boolean }) => {
    if (!options?.silent) setIsLoading(true);
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

      // Sync the "send items to partners" auto-todo with current state
      if (id) ensureSendItemsTodo(id);
    } catch (error) {
      console.error("Error fetching request:", error);
      toast.error("Fout bij ophalen aanvraag");
    } finally {
      if (!options?.silent) setIsLoading(false);
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

  const handleDuplicateItem = async (item: ProgramRequestItem) => {
    try {
      // Fetch the full row so we copy all columns (incl. fields not in our local interface)
      const { data: fullItem, error: fetchError } = await supabase
        .from("program_request_items")
        .select("*")
        .eq("id", item.id)
        .single();

      if (fetchError) throw fetchError;
      if (!fullItem) throw new Error("Item niet gevonden");

      // Strip fields that should not be copied (identity, status, billing/quote state, timestamps)
      const {
        id: _id,
        created_at: _created,
        updated_at: _updated,
        status_updated_at: _statusUpdated,
        status_updated_by: _statusUpdatedBy,
        version: _version,
        // Workflow & quote state - reset to a fresh "pending" item
        status: _status,
        status_note: _statusNote,
        item_quote_status: _itemQuoteStatus,
        quoted_price: _quotedPrice,
        quoted_at: _quotedAt,
        quoted_notes: _quotedNotes,
        confirmed_time: _confirmedTime,
        proposed_date: _proposedDate,
        proposed_time: _proposedTime,
        customer_accepted_at: _custAccepted,
        customer_approved_at: _custApproved,
        customer_counter_at: _custCounterAt,
        customer_counter_time: _custCounterTime,
        customer_counter_note: _custCounterNote,
        executed_at: _executedAt,
        // Invoicing / commission state
        invoiced_amount: _invAmount,
        invoiced_date: _invDate,
        invoiced_number: _invNumber,
        invoiced_file_path: _invFile,
        actual_invoiced_excl_vat: _invExcl,
        commission_amount: _commAmount,
        commission_invoiced_at: _commInvAt,
        commission_status: _commStatus,
        proforma_amount_excl_vat: _proAmount,
        proforma_commission: _proComm,
        proforma_deadline: _proDeadline,
        proforma_sent_at: _proSent,
        deviation_reason: _devReason,
        final_billing_locked_at: _finalLocked,
        ...rest
      } = fullItem as Record<string, unknown>;

      const insertPayload = {
        ...rest,
        status: "pending",
        skip_partner_notification: true, // copy is a draft until admin sends it
      };

      const { error: insertError } = await supabase
        .from("program_request_items")
        .insert(insertPayload as never);

      if (insertError) throw insertError;

      toast.success("Onderdeel gedupliceerd");
      await fetchRequestData({ silent: true });
    } catch (error) {
      console.error("Error duplicating item:", error);
      toast.error("Fout bij dupliceren");
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
    // Gebruik dezelfde berekening als FinancialOverviewCard "Openstaand"
    // zodat Voltooiingsstatus en Financieel Overzicht altijd hetzelfde
    // bedrag tonen.
    return calculateProjectOutstandingAmount({
      items,
      invoices: bureauInvoices,
      numberOfPeople: request?.number_of_people ?? 0,
      numberOfDays,
      coordinationFee: calcCoordFee(request?.number_of_people ?? 0),
      touristTax,
      natureContribution,
      centralSurcharge,
      accommodationTotal,
      linesByItem: billingLinesByItem,
    });
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

  const handleSendSingleItemToPartner = async (item: any) => {
    if (!request) return;
    const phase = getItemSendPhase(item, request);
    // Force-mode wanneer klant nog niet formeel akkoord is, óf wanneer het
    // item al eerder is verzonden (dan is dit een herinnering / herversturen).
    const needsForce = phase !== "klaar_voor_partner";
    if (phase === "wacht_op_klant") {
      const ok = window.confirm(
        `De klant heeft het programma nog niet formeel akkoord. Toch "${item.block_name}" naar de partner sturen?`,
      );
      if (!ok) return;
    }
    try {
      const { data, error } = await supabase.functions.invoke("send-items-to-partners", {
        body: {
          request_id: request.id,
          origin: window.location.origin,
          item_ids: [item.id],
          ...(needsForce ? { mode: "force" as const } : {}),
        },
      });
      if (error) throw error;
      toast.success(data?.message || `"${item.block_name}" verstuurd naar partner`);
      fetchRequestData();
    } catch (err) {
      console.error("Error sending single item:", err);
      toast.error("Fout bij versturen naar partner");
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
      const currentItem = items.find((i) => i.id === itemId);
      const previousOverride = currentItem?.admin_price_override ?? null;
      const previousNotes = currentItem?.admin_price_notes ?? null;
      const previousPriceType = currentItem?.price_type ?? null;
      const hadPartnerQuote = currentItem?.quoted_price != null;
      const hadCustomerApproval = !!currentItem?.customer_approved_at;
      const isExternalPartner = currentItem ? currentItem.provider_id !== "bureau" : false;

      const priceChanged = previousOverride !== price;
      const priceTypeChanged = !!newPriceType && previousPriceType !== newPriceType;
      const meaningfulChange = priceChanged || priceTypeChanged;

      const updateData: Record<string, unknown> = {
        admin_price_override: price,
        admin_price_notes: notes || null,
      };
      if (newPriceType) {
        updateData.price_type = newPriceType;
      }
      if (meaningfulChange) {
        updateData.admin_price_override_updated_at = new Date().toISOString();
        // Open opnieuw voor partner-bevestiging — partner moet de nieuwe prijs accorderen
        updateData.partner_price_change_acknowledged_at = null;
        // Klant moet opnieuw akkoord geven als er al akkoord was én er een actieve partnerprijs lag
        if (hadCustomerApproval && hadPartnerQuote) {
          updateData.customer_approved_at = null;
          updateData.item_quote_status = "offerte_verstuurd";
        }
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

      if (meaningfulChange) {
        // Log audit
        await supabase.from("program_request_history").insert({
          request_id: request!.id,
          item_id: itemId,
          action: "admin_changed_price",
          actor: "admin",
          actor_name: "Admin",
          old_value: { admin_price_override: previousOverride, admin_price_notes: previousNotes, price_type: previousPriceType },
          new_value: { admin_price_override: price, admin_price_notes: notes || null, price_type: newPriceType ?? previousPriceType },
          notes: hadPartnerQuote
            ? "Prijs aangepast na eerdere partnerbevestiging — partner en klant moeten opnieuw bevestigen."
            : null,
        });

        // Notificeer externe partner alleen wanneer er al eerder contact was over deze prijs
        if (isExternalPartner && hadPartnerQuote && price !== null) {
          try {
            await supabase.functions.invoke("notify-partner-price-change", {
              body: { item_id: itemId, origin: window.location.origin },
            });
          } catch (notifyErr) {
            console.error("Could not notify partner of price change:", notifyErr);
          }
        }

        // Notificeer ook de klant wanneer deze al eerder akkoord had gegeven —
        // de DB-trigger reset customer_approved_at, dus de klant moet opnieuw bevestigen.
        if (hadCustomerApproval && price !== null) {
          try {
            await supabase.functions.invoke("notify-customer-price-change", {
              body: { item_id: itemId, origin: window.location.origin },
            });
          } catch (notifyErr) {
            console.error("Could not notify customer of price change:", notifyErr);
          }
        }
      }

      toast.success(
        meaningfulChange && hadCustomerApproval && hadPartnerQuote
          ? "Prijs bijgewerkt — klant en partner moeten opnieuw bevestigen"
          : "Prijs bijgewerkt"
      );
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
                <div className="mt-2">
                  <CompletionActions
                    entityType="program"
                    entityId={request.id}
                    completionStatus={request.completion_status}
                    completedAt={(request as any).completed_at ?? null}
                    outstanding={calculateOutstandingAmount()}
                    variant="full"
                  />
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
                    {(() => {
                      const validUntil = request.quote_valid_until ? new Date(request.quote_valid_until + "T00:00:00") : null;
                      const isExpired = validUntil ? validUntil < new Date() : false;
                      return (
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground">Geldig tot: </span>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button variant="ghost" size="sm" className={cn("h-auto px-1.5 py-0.5 font-medium", isExpired && "text-destructive")}>
                                <CalendarIcon className="mr-1 h-3.5 w-3.5" />
                                {validUntil ? format(validUntil, "d MMM yyyy", { locale: nl }) : "Stel in"}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <CalendarPicker
                                mode="single"
                                selected={validUntil || undefined}
                                onSelect={async (date) => {
                                  if (!date) return;
                                  const dateStr = format(date, "yyyy-MM-dd");
                                  const updates: Record<string, string> = { quote_valid_until: dateStr };
                                  // If extending past today and status is verlopen, revert to offerte_verstuurd
                                  if (date >= new Date() && request.quote_status === "verlopen") {
                                    updates.quote_status = "offerte_verstuurd";
                                  }
                                  const { error } = await supabase.from("program_requests").update(updates).eq("id", request.id);
                                  if (error) {
                                    toast.error("Kon verloopdatum niet opslaan");
                                  } else {
                                    toast.success("Verloopdatum bijgewerkt");
                                    fetchRequestData();
                                  }
                                }}
                                className="p-3 pointer-events-auto"
                              />
                            </PopoverContent>
                          </Popover>
                          {isExpired && request.quote_status !== "verlopen" && request.quote_status !== "geannuleerd" && (
                            <Badge variant="destructive" className="text-xs">Verlopen</Badge>
                          )}
                        </div>
                      );
                    })()}
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
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-sm uppercase tracking-wider text-slate-500 flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Evenement details
                    </h3>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => setEditDetailsOpen(true)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                  </div>
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
                  {selectedAccommodationQuote?.customer_terms_accepted_at && (
                    <div className="mt-2 rounded-md border border-emerald-200 bg-emerald-50 p-2 text-xs text-emerald-900">
                      <div className="flex items-center gap-1.5 font-medium">
                        <ShieldCheck className="h-3.5 w-3.5" />
                        Deel-akkoord vastgelegd
                      </div>
                      <div className="mt-0.5 text-emerald-800">
                        {format(new Date(selectedAccommodationQuote.customer_terms_accepted_at), "d MMM yyyy 'om' HH:mm", { locale: nl })}
                        {selectedAccommodationQuote.customer_signature_name && (
                          <> · ondertekend door <span className="font-medium">{selectedAccommodationQuote.customer_signature_name}</span></>
                        )}
                      </div>
                    </div>
                  )}
                  {selectedAccommodationQuote && !selectedAccommodationQuote.customer_terms_accepted_at && (
                    <div className="mt-2 rounded-md border border-amber-200 bg-amber-50 p-2 text-xs text-amber-900">
                      <div className="flex items-center gap-1.5 font-medium">
                        <AlertTriangle className="h-3.5 w-3.5" />
                        Geen deel-akkoord vastgelegd (legacy)
                      </div>
                      <div className="mt-0.5 text-amber-800">
                        Deze logies is geselecteerd vóór het deel-akkoord werd geïntroduceerd. Bevestig de voorwaarden bij het eindakkoord of vraag de klant het opnieuw te bevestigen.
                      </div>
                    </div>
                  )}
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

          {/* Single consolidated "Volgende stap" banner — derived from lifecycle */}
          <NextStepBanner
            project={{
              status: request.status,
              quote_status: request.quote_status,
              terms_accepted_at: request.terms_accepted_at,
              billing_company_name: request.billing_company_name,
              completion_status: request.completion_status,
              cancelled_at: request.cancelled_at,
              linked_accommodation_id: request.linked_accommodation_id,
              hasSelectedAccommodation: !!selectedAccommodationQuote,
            }}
            items={items}
            primaryAction={(() => {
              if (!request.program_published_at && items.length > 0) {
                return {
                  label: isPublishing ? "Publiceren..." : "Publiceer naar klant",
                  onClick: handlePublishProgram,
                  loading: isPublishing,
                  icon: <Send className="h-4 w-4 mr-2" />,
                };
              }
              if (readyToSendCount > 0) {
                return {
                  label: "Bekijk & verstuur",
                  onClick: handlePreviewSendToPartners,
                  loading: isSendingToPartners,
                  icon: <Send className="h-4 w-4 mr-2" />,
                };
              }
              if (
                waitingForCustomerCount > 0 ||
                request.quote_status === "offerte_verstuurd"
              ) {
                return {
                  label: "Stuur status-mail",
                  onClick: () => setStatusEmailOpen(true),
                  icon: <Mail className="h-4 w-4 mr-2" />,
                };
              }
              return null;
            })()}
            detail={
              !request.program_published_at && items.length > 0
                ? "De klant kan het programma al bekijken, maar kan nog geen akkoord geven. Publiceer als offerte."
                : readyToSendCount > 0
                ? `${readyToSendCount} ${readyToSendCount === 1 ? "onderdeel is" : "onderdelen zijn"} klaar om naar partners te sturen.`
                : waitingForCustomerCount > 0
                ? `${waitingForCustomerCount} ${waitingForCustomerCount === 1 ? "onderdeel wacht" : "onderdelen wachten"} op klantakkoord.`
                : undefined
            }
          />


          {/* Communicatie-hub: altijd zichtbaar boven de tabs voor pre-sales en lopende correspondentie */}
          <ProjectCommunicationsCard
            requestId={request.id}
            accommodationId={request.linked_accommodation_id || undefined}
            customerName={request.customer_name}
            customerEmail={request.customer_email}
            onOpenStatusEmail={() => setStatusEmailOpen(true)}
            highlightStatusEmail={highlightStatusEmail}
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

          <Tabs defaultValue="activiteiten" className="space-y-4">
            <TabsList>
              <TabsTrigger value="activiteiten">Activiteiten</TabsTrigger>
              <TabsTrigger value="financien">Financiën</TabsTrigger>
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
                      <>
                        <Button variant="outline" onClick={() => setSyncBlocksOpen(true)}>
                          <RefreshCw className="h-4 w-4 mr-2" />
                          Synchroniseer bouwstenen
                        </Button>
                        <Button variant="outline" onClick={() => setSaveAsTemplateOpen(true)}>
                          <Save className="h-4 w-4 mr-2" />
                          Opslaan als template
                        </Button>
                      </>
                    )}
                    <Button variant="outline" onClick={() => setAddCostOpen(true)}>
                      <Euro className="h-4 w-4 mr-2" />
                      Kosten toevoegen
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
                 <details className="group border-b bg-muted/20 px-4 py-2 text-xs text-muted-foreground [&_summary::-webkit-details-marker]:hidden">
                   <summary className="flex cursor-pointer items-center gap-2 select-none">
                     <Info className="h-3.5 w-3.5" />
                     <span className="font-medium">Wat betekenen de statussen?</span>
                     <span className="ml-auto text-[11px] opacity-70 group-open:hidden">tonen</span>
                     <span className="ml-auto text-[11px] opacity-70 hidden group-open:inline">verbergen</span>
                   </summary>
                   <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-[11px] leading-tight">
                     <LegendPill className="bg-blue-50 text-blue-700 border-blue-200/70">Wacht op aanbieder</LegendPill>
                     <span>aanbieder moet nog reageren</span>
                     <LegendPill className="bg-amber-50 text-amber-700 border-amber-200/70">Wacht op klant-akkoord</LegendPill>
                     <span>klant moet nog akkoord geven</span>
                     <LegendPill className="bg-amber-50 text-amber-700 border-amber-200/70">Wacht op klant (nieuwe prijs)</LegendPill>
                     <span>prijs aangepast — wacht op klant</span>
                     <LegendPill className="bg-emerald-50 text-emerald-700 border-emerald-200/70">Klant akkoord</LegendPill>
                     <span>bevestigd door klant</span>
                     <LegendPill className="bg-slate-50 text-slate-500 border-slate-200">Geannuleerd</LegendPill>
                     <span className="w-full border-t pt-2 mt-1 text-muted-foreground">
                       <span className="inline-flex items-center gap-1 mr-2 rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-slate-600">
                         <Send className="h-2.5 w-2.5" /> Nog naar partner
                       </span>
                       chip = onderdeel is nog niet naar de aanbieder gestuurd.
                     </span>
                   </div>
                 </details>
                 <div className="overflow-x-auto">
                     <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Activiteit</TableHead>
                          <TableHead>Partner</TableHead>
                          <TableHead>Tijd</TableHead>
                          {isQuoteMode ? (
                            <>
                              <TableHead>Status</TableHead>
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
                        {(() => {
                          const programItems = items.filter(item => item.day_index >= 0);
                          const dayGroups = programItems.reduce<Record<number, typeof programItems>>((acc, item) => {
                            if (!acc[item.day_index]) acc[item.day_index] = [];
                            acc[item.day_index].push(item);
                            return acc;
                          }, {});
                          const sortedDays = Object.keys(dayGroups).map(Number).sort((a, b) => a - b);
                          const dates = (request.selected_dates as string[]) || [];
                          const totalColumns = isQuoteMode ? 7 : 7;

                          return sortedDays.flatMap((dayIdx) => {
                            const dayDate = dates[dayIdx] ? format(new Date(dates[dayIdx]), "EEE d MMM", { locale: nl }) : null;
                            const dayLabel = `Dag ${dayIdx + 1}${dayDate ? ` — ${dayDate}` : ""}`;
                            const dayItems = dayGroups[dayIdx];

                            return [
                              <TableRow key={`day-header-${dayIdx}`} className="bg-muted/40 hover:bg-muted/40">
                                <TableCell colSpan={totalColumns} className="py-2 px-4">
                                  <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                    {dayLabel}
                                  </span>
                                </TableCell>
                              </TableRow>,
                              ...dayItems.map((item) => {
                                const statusInfo = itemStatusConfig[item.status];
                                const hasCustomerApproval = !!(item.customer_accepted_at || item.customer_approved_at);
                                const showWaitingForCustomer = (item.status === "confirmed" || item.status === "alternative") && !item.skip_partner_notification && !hasCustomerApproval;
                                const numDaysForItem = getNumberOfDays(request?.selected_dates);
                                const priceChangeWaitingCustomer =
                                  !item.customer_accepted_at &&
                                  (item.status === "confirmed" || item.status === "alternative") &&
                                  hasOpenAdminPriceChange(item as any, item.override_people ?? request.number_of_people, numDaysForItem);
                                return (
                                  <TableRow key={item.id} className="group">
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
                                      {(() => {
                                        const activeTime = item.confirmed_time || item.proposed_time || item.preferred_time;
                                        const isConfirmed = !!item.confirmed_time;
                                        const isProposal = !item.confirmed_time && !!item.proposed_time;
                                        // Toon "was: X" alleen bij een echt klant-tegenvoorstel.
                                        // Niet meer bij admin-sync-verschillen (Fase 4b).
                                        const showOriginal = isProposal && item.preferred_time && item.preferred_time !== item.proposed_time;

                                        const handleSaveTime = async (time: string | null) => {
                                          // Belangrijk: een tijdwijziging mag de partner-workflow status NIET muteren.
                                          // De DB-trigger guard_item_status_consistency blokkeert anders pending->confirmed
                                          // wanneer skip_partner_notification=true en er nog geen klant-akkoord is.
                                          const updatePayload: Record<string, unknown> = time
                                            ? {
                                                confirmed_time: time,
                                                preferred_time: time,
                                                status_note: `Tijd ${time} ingesteld door admin`,
                                                status_updated_at: new Date().toISOString(),
                                              }
                                            : {
                                                confirmed_time: null,
                                                proposed_time: null,
                                                preferred_time: null,
                                                status_note: `Tijd verwijderd door admin`,
                                                status_updated_at: new Date().toISOString(),
                                              };
                                          const { error } = await supabase
                                            .from("program_request_items")
                                            .update(updatePayload)
                                            .eq("id", item.id);
                                          if (error) {
                                            console.error("Fout bij opslaan tijd:", error);
                                            toast.error(`Fout bij opslaan tijd: ${error.message}`);
                                          } else {
                                            toast.success(time ? `Tijd ${time} opgeslagen` : "Tijd verwijderd");
                                            fetchRequestData({ silent: true });
                                          }
                                        };

                                        return (
                                          <div className="space-y-0.5">
                                            <div className="flex items-center gap-1">
                                              <Input
                                                type="time"
                                                defaultValue={activeTime || ""}
                                                key={`${item.id}-${activeTime || "empty"}`}
                                                className={cn(
                                                  "h-8 w-[110px] tabular-nums text-sm",
                                                  isConfirmed && "border-green-500/50 text-green-700 font-medium",
                                                  isProposal && "border-orange-400/60 text-orange-700",
                                                  !activeTime && "border-dashed border-muted-foreground/30 text-muted-foreground",
                                                )}
                                                onBlur={(e) => {
                                                  const val = e.target.value;
                                                  if (val === (activeTime || "")) return;
                                                  handleSaveTime(val || null);
                                                }}
                                                onKeyDown={(e) => {
                                                  if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                                                  if (e.key === "Escape") {
                                                    (e.target as HTMLInputElement).value = activeTime || "";
                                                    (e.target as HTMLInputElement).blur();
                                                  }
                                                }}
                                              />
                                              {isProposal && (
                                                <TooltipProvider>
                                                  <Tooltip>
                                                    <TooltipTrigger asChild>
                                                      <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-7 w-7 text-green-600 hover:text-green-700 hover:bg-green-50"
                                                        onClick={() => handleSaveTime(item.proposed_time!)}
                                                      >
                                                        <Check className="h-3.5 w-3.5" />
                                                      </Button>
                                                    </TooltipTrigger>
                                                    <TooltipContent>Accepteer voorstel {item.proposed_time}</TooltipContent>
                                                  </Tooltip>
                                                </TooltipProvider>
                                              )}
                                            </div>
                                            {isProposal && (
                                              <div className="text-[10px] text-orange-600 leading-tight">voorstel klant</div>
                                            )}
                                            {showOriginal && (
                                              <div className="text-[10px] text-muted-foreground line-through leading-tight">
                                                was: {item.preferred_time}
                                              </div>
                                            )}
                                          </div>
                                        );
                                      })()}
                                    </TableCell>
                                    
                                    {isQuoteMode ? (
                                      <>
                                        <TableCell>
                                          <div className="flex flex-col gap-1 items-start">
                                            <ItemDisplayStatusBadge
                                              audience="admin"
                                              status={deriveItemDisplayStatus(item as any, {
                                                programPeople: request.number_of_people,
                                                numberOfDays: numDaysForItem,
                                              })}
                                            />
                                            {(() => {
                                              if (item.provider_id === "bureau") return null;
                                              if (item.status === "cancelled") return null;
                                              const sendPhase = getItemSendPhase(item, request);
                                              if (sendPhase === "klaar_voor_partner" || sendPhase === "wacht_op_klant") {
                                                return (
                                                  <span className="inline-flex items-center self-start gap-1 whitespace-nowrap rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-medium leading-tight text-slate-600 dark:border-slate-800 dark:bg-slate-900/40 dark:text-slate-400">
                                                    <Send className="h-2.5 w-2.5" />
                                                    Nog naar partner
                                                  </span>
                                                );
                                              }
                                              if (sendPhase === "verstuurd") {
                                                return (
                                                  <span className="inline-flex items-center self-start gap-1 whitespace-nowrap rounded-md border border-transparent px-2 py-0.5 text-[11px] font-medium leading-tight text-muted-foreground">
                                                    <Send className="h-2.5 w-2.5" />
                                                    Verstuurd
                                                  </span>
                                                );
                                              }
                                              return null;
                                            })()}
                                          </div>
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
                                                fetchRequestData({ silent: true });
                                              }
                                            }}
                                          />
                                        </TableCell>
                                        <TableCell>
                                          <div className="flex flex-col gap-1 items-start">
                                            <AdminQuotePriceEditor
                                              originalPrice={item.quoted_price}
                                              overridePrice={item.admin_price_override}
                                              priceNotes={item.admin_price_notes}
                                              numberOfPeople={item.override_people ?? request.number_of_people}
                                              numberOfDays={getNumberOfDays(request?.selected_dates)}
                                              priceType={item.price_type === "total" ? "total" : item.price_type === "per_person_per_day" ? "per_person_per_day" : "per_person"}
                                              hasOpenAdminPriceChange={hasOpenAdminPriceChange(item as any, item.override_people ?? request.number_of_people, getNumberOfDays(request?.selected_dates))}
                                              onSave={(price, notes, pt) => handleItemPriceUpdate(item.id, price, notes, pt)}
                                            />
                                            <AdminItemBillingLinesEditor
                                              itemId={item.id}
                                              itemName={item.block_name}
                                              suggestedAmount={item.quoted_price ?? item.admin_price_override}
                                              defaultVatRate={getItemVatRate(item)}
                                            />
                                          </div>
                                        </TableCell>
                                        <TableCell>
                                          <div className="flex items-center gap-1">
                                            {(() => {
                                              if (item.status === "cancelled") return null;
                                              if (item.provider_id === "bureau") return null;
                                              const phase = getItemSendPhase(item, request);
                                              const displayStatus = deriveItemDisplayStatus(item as any, {
                                                programPeople: request.number_of_people,
                                                numberOfDays: numDaysForItem,
                                              });

                                              type ActionDef = {
                                                label: string;
                                                title: string;
                                                onClick: () => void;
                                                className: string;
                                              };
                                              let action: ActionDef | null = null;

                                              if (displayStatus === "niet_beschikbaar") {
                                                action = {
                                                  label: "Vraag opnieuw",
                                                  title: "Stuur deze aanvraag opnieuw naar de partner",
                                                  onClick: () => handleSendSingleItemToPartner(item),
                                                  className: "border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100",
                                                };
                                              } else if (phase === "klaar_voor_partner") {
                                                action = {
                                                  label: "Verstuur",
                                                  title: "Stuur dit onderdeel naar de partner",
                                                  onClick: () => handleSendSingleItemToPartner(item),
                                                  className: "border-primary/40 bg-primary/5 text-primary hover:bg-primary/10",
                                                };
                                              } else if (phase === "wacht_op_klant") {
                                                action = {
                                                  label: "Verstuur (forceer)",
                                                  title: "Stuur naar partner (klant nog niet formeel akkoord)",
                                                  onClick: () => handleSendSingleItemToPartner(item),
                                                  className: "border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100",
                                                };
                                              } else if (
                                                phase === "verstuurd" &&
                                                (displayStatus === "wacht_op_klant" || displayStatus === "wacht_op_partner")
                                              ) {
                                                action = {
                                                  label: "Herinner",
                                                  title: "Stuur dit onderdeel opnieuw naar de partner",
                                                  onClick: () => handleSendSingleItemToPartner(item),
                                                  className: "border-blue-300 bg-blue-50 text-blue-700 hover:bg-blue-100",
                                                };
                                              } else if (
                                                displayStatus === "geaccepteerd" ||
                                                displayStatus === "uitgevoerd" ||
                                                displayStatus === "prijs_gewijzigd"
                                              ) {
                                                action = {
                                                  label: "Bekijk",
                                                  title: "Open onderdeel-details",
                                                  onClick: () => setEditingItem(item),
                                                  className: "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100",
                                                };
                                              }

                                              if (!action) return null;
                                              return (
                                                <TooltipProvider>
                                                  <Tooltip>
                                                    <TooltipTrigger asChild>
                                                      <button
                                                        type="button"
                                                        onClick={action.onClick}
                                                        className={cn(
                                                          "inline-flex h-7 items-center whitespace-nowrap rounded-md border px-2 text-[11px] font-medium leading-none transition-colors",
                                                          action.className,
                                                        )}
                                                      >
                                                        {action.label}
                                                      </button>
                                                    </TooltipTrigger>
                                                    <TooltipContent>{action.title}</TooltipContent>
                                                  </Tooltip>
                                                </TooltipProvider>
                                              );
                                            })()}
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
                                              onClick={() => handleDuplicateItem(item)}
                                              className="h-8 w-8"
                                              title="Dupliceer onderdeel"
                                            >
                                              <Copy className="h-4 w-4" />
                                            </Button>
                                            <Button
                                              variant="ghost"
                                              size="icon"
                                              className="h-8 w-8 text-destructive hover:text-destructive"
                                              onClick={async () => {
                                                const { data, error } = await supabase.functions.invoke(
                                                  "notify-partner-item-deletion",
                                                  { body: { request_id: request!.id, item_ids: [item.id], origin: window.location.origin } }
                                                );
                                                if (error || (data as any)?.error) {
                                                  toast.error("Fout bij verwijderen");
                                                } else {
                                                  const sent = (data as any)?.emails_sent ?? 0;
                                                  toast.success(sent > 0 ? `Activiteit verwijderd · ${sent} partner(s) gemaild` : "Activiteit verwijderd");
                                                  fetchRequestData();
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
                                          <div className="flex flex-col gap-1 items-start">
                                            <ItemDisplayStatusBadge
                                              audience="admin"
                                              status={deriveItemDisplayStatus(item as any, {
                                                programPeople: request.number_of_people,
                                                numberOfDays: numDaysForItem,
                                              })}
                                            />
                                          </div>
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
                                            {(() => {
                                              const phase = getItemSendPhase(item, request);
                                              if (phase !== "klaar_voor_partner" && phase !== "wacht_op_klant") return null;
                                              if (item.provider_id === "bureau") return null;
                                              const isWaiting = phase === "wacht_op_klant";
                                              return (
                                                <TooltipProvider>
                                                  <Tooltip>
                                                    <TooltipTrigger asChild>
                                                      <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => handleSendSingleItemToPartner(item)}
                                                        className={`h-8 w-8 ${isWaiting ? "text-amber-600 hover:text-amber-700" : "text-primary hover:text-primary"}`}
                                                      >
                                                        <Send className="h-4 w-4" />
                                                      </Button>
                                                    </TooltipTrigger>
                                                    <TooltipContent>
                                                      {isWaiting
                                                        ? "Stuur naar partner (klant nog niet formeel akkoord)"
                                                        : "Stuur dit onderdeel naar de partner"}
                                                    </TooltipContent>
                                                  </Tooltip>
                                                </TooltipProvider>
                                              );
                                            })()}
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
                                              onClick={() => handleDuplicateItem(item)}
                                              className="h-8 w-8"
                                              title="Dupliceer onderdeel"
                                            >
                                              <Copy className="h-4 w-4" />
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
                              }),
                            ];
                          });
                        })()}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Tab: Financiën */}
            <TabsContent value="financien" className="space-y-6">
              {/* Prijscontrole — items met openstaande admin-prijswijziging of inconsistentie */}
              {(() => {
                const programPeople = request?.number_of_people || 0;
                const numberOfDays = getNumberOfDays(request?.selected_dates);
                const flagged = items
                  .filter((it: any) => it.status !== "cancelled" && it.day_index !== -1)
                  .map((it: any) => {
                    const computed = getDisplayLineTotal(it as any, programPeople, numberOfDays);
                    const quoted = it.quoted_price != null ? Number(it.quoted_price) : null;
                    const delta = computed != null && quoted != null ? Math.abs(quoted - computed) : 0;
                    const openChange = hasOpenAdminPriceChange(it as any, it.override_people ?? programPeople, numberOfDays);
                    const inconsistent = quoted != null && computed != null && delta > 0.01 && it.admin_price_override != null;
                    // Verberg items waar de klant al akkoord heeft gegeven NA de laatste admin-prijswijziging
                    // — die zijn feitelijk afgehandeld; quoted_price wordt automatisch bijgewerkt door
                    // approve-quote-item / accept-quote-proposal.
                    const customerSettled = !!it.customer_accepted_at
                      && it.admin_price_override_updated_at
                      && new Date(it.customer_accepted_at).getTime() >=
                         new Date(it.admin_price_override_updated_at).getTime();
                    return { it, computed, quoted, delta, openChange, inconsistent, customerSettled };
                  })
                  .filter((row) => (row.openChange || row.inconsistent) && !row.customerSettled);

                if (flagged.length === 0) return null;

                const handleSync = async (itemId: string, computed: number | null) => {
                  if (computed == null) return;
                  try {
                    const { error } = await supabase
                      .from("program_request_items")
                      .update({
                        quoted_price: computed,
                        admin_price_override_updated_at: new Date().toISOString(),
                      })
                      .eq("id", itemId);
                    if (error) throw error;
                    toast.success("quoted_price gesynchroniseerd met admin-prijs");
                    fetchRequestData();
                  } catch (err) {
                    console.error("sync price failed", err);
                    toast.error("Kon prijs niet synchroniseren");
                  }
                };

                return (
                  <Card className="border-amber-300 dark:border-amber-800">
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2 text-amber-800 dark:text-amber-300">
                        <AlertTriangle className="h-5 w-5" />
                        Prijscontrole
                      </CardTitle>
                      <CardDescription>
                        Onderdelen met een openstaande prijswijziging of een verschil tussen
                        de berekende en de gequoteerde prijs. Gebruik 'Synchroniseer' om
                        <code className="mx-1">quoted_price</code> gelijk te zetten aan de
                        berekende waarde.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {flagged.map(({ it, computed, quoted, delta, openChange, inconsistent }) => (
                        <div key={it.id} className="flex items-center justify-between gap-3 p-3 rounded-md border bg-amber-50/50 dark:bg-amber-950/20">
                          <div className="min-w-0">
                            <p className="font-medium truncate">{it.block_name}</p>
                            <p className="text-xs text-muted-foreground">
                              {openChange && <span className="mr-2">Wacht op nieuwe bevestiging</span>}
                              {inconsistent && (
                                <span>
                                  Berekend: €{(computed ?? 0).toFixed(2)} · Gequoteerd: €{(quoted ?? 0).toFixed(2)} · Δ €{delta.toFixed(2)}
                                </span>
                              )}
                            </p>
                          </div>
                          {inconsistent && (
                            <Button size="sm" variant="outline" onClick={() => handleSync(it.id, computed)}>
                              <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                              Synchroniseer
                            </Button>
                          )}
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                );
              })()}

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
                          <TableRow
                            key={item.id}
                            className="cursor-pointer hover:bg-muted/50"
                            onClick={() => setEditingCost(item)}
                          >
                            <TableCell className="font-medium">{item.block_name}</TableCell>
                            <TableCell className="text-muted-foreground text-sm">
                              {item.admin_price_notes || "-"}
                            </TableCell>
                            <TableCell className="font-medium">
                              €{(item.admin_price_override ?? 0).toLocaleString("nl-NL", { minimumFractionDigits: 2 })}
                            </TableCell>
                            <TableCell onClick={(e) => e.stopPropagation()}>
                              <div className="flex items-center gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => setEditingCost(item)}
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive hover:text-destructive"
                                onClick={async () => {
                                  const { data, error } = await supabase.functions.invoke(
                                    "notify-partner-item-deletion",
                                    { body: { request_id: request!.id, item_ids: [item.id], origin: window.location.origin } }
                                  );
                                  if (error || (data as any)?.error) {
                                    toast.error("Fout bij verwijderen");
                                  } else {
                                    toast.success("Kosten verwijderd");
                                    fetchRequestData();
                                  }
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                              </div>
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
                  quoteStatus={request.quote_status}
                />
                <FinancialOverviewCard
                  requestId={request.id}
                  numberOfPeople={request.number_of_people}
                  numberOfDays={numberOfDays}
                  items={items}
                  invoices={bureauInvoices}
                  onRegisterInvoice={() => setInvoiceDialogOpen(true)}
                  onForwardInvoice={(inv) =>
                    navigate(
                      `/admin/projecten/${request.id}/factuur?action=forward&invoiceId=${inv.id}`
                    )
                  }
                  isQuoteMode={isQuoteMode}
                  touristTax={touristTax}
                  natureContribution={natureContribution}
                  centralSurcharge={centralSurcharge}
                  accommodationTotal={accommodationTotal}
                  accommodationBaseTotal={accommodationBaseTotal}
                  accommodationExtras={accommodationExtras}
                  accommodationName={selectedAccommodationQuote?.accommodation_name}
                  linesByItem={billingLinesByItem}
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
            {/* Tab "Communicatie" verwijderd — kaart staat nu permanent boven de tabs */}

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

      {/* Forward to accounting happens on the InvoicePreview page where the
          PDF can be generated and attached. We navigate there with
          ?action=forward&invoiceId=... — see AdminInvoicePreview. */}
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
          numberOfPeople={request.number_of_people}
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
          numberOfPeople={request.number_of_people}
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

      {/* Sync building blocks dialog */}
      {request && (
        <SyncBuildingBlocksDialog
          open={syncBlocksOpen}
          onOpenChange={setSyncBlocksOpen}
          requestId={request.id}
          onSuccess={fetchRequestData}
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
          programType={request.origin ?? "self_service"}
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
          open={addCostOpen || !!editingCost}
          onOpenChange={(open) => {
            if (!open) {
              setAddCostOpen(false);
              setEditingCost(null);
            } else if (!editingCost) {
              setAddCostOpen(true);
            }
          }}
          requestId={request.id}
          onSuccess={fetchRequestData}
          editingItem={editingCost}
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
              {sendPreview.bureauItemsList?.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    Bureau Vlieland items (geen e-mail, wel vrijgegeven)
                  </h4>
                  <ul className="space-y-0.5">
                    {sendPreview.bureauItemsList.map((item) => (
                      <li key={item.id} className="text-xs text-muted-foreground">• {item.block_name}</li>
                    ))}
                  </ul>
                </div>
              )}
              {sendPreview.partners.length === 0 && sendPreview.bureauItemsList?.length === 0 && (
                <div className="text-center py-4 text-muted-foreground text-sm">
                  Geen items om te versturen.
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSendDialogOpen(false)}>Annuleren</Button>
            <Button
              onClick={handleConfirmSendToPartners}
              disabled={
                isSendingToPartners ||
                ((sendPreview?.partners.length || 0) === 0 &&
                  (sendPreview?.bureauItemsList?.length || 0) === 0)
              }
            >
              <Send className="h-4 w-4 mr-2" />
              {isSendingToPartners
                ? "Versturen..."
                : (sendPreview?.partners.length || 0) > 0
                  ? `Verstuur naar ${sendPreview!.partners.length} partner(s)`
                  : `Geef ${sendPreview?.bureauItemsList?.length || 0} bureau-onderdeel(en) vrij`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {request && (
        <EditProjectDetailsDialog
          open={editDetailsOpen}
          onOpenChange={setEditDetailsOpen}
          requestId={request.id}
          selectedDates={request.selected_dates as string[]}
          numberOfPeople={request.number_of_people}
          generalNotes={request.general_notes}
          linkedAccommodationId={request.linked_accommodation_id}
          onSuccess={() => fetchRequestData()}
        />
      )}
    </>
  );
};

export default AdminRequestDetail;
