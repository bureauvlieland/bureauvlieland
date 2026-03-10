import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import {
  ArrowLeft,
  Eye,
  Building2,
  Calendar,
  Users,
  Mail,
  Phone,
  MapPin,
  Euro,
  Send,
  Check,
  Hotel,
  Home,
  Tent,
  HelpCircle,
  FileText,
  ChevronRight,
  ExternalLink,
  Paperclip,
  Link as LinkIcon,
  Pencil,
  ChevronDown,
  Clock,
  XCircle,
  CheckCircle2,
  MessageSquare,
} from "lucide-react";
import { FACILITIES, LOCATION_PREFERENCES, ROOM_TYPES, BUDGET_RANGES } from "@/types/accommodation";
import { SendAccommodationQuoteRequestDialog } from "@/components/admin/SendAccommodationQuoteRequestDialog";
import { ForwardQuoteToCustomerDialog } from "@/components/admin/ForwardQuoteToCustomerDialog";
import { ProjectCommunicationsCard } from "@/components/admin/ProjectCommunicationsCard";
import { AdminAccommodationQuoteSheet } from "@/components/admin/AdminAccommodationQuoteSheet";
import { EditAccommodationGuestsDialog } from "@/components/admin/EditAccommodationGuestsDialog";
import { SendProjectEmailSheet } from "@/components/admin/SendProjectEmailSheet";

interface LinkedProgram {
  id: string;
  customer_token: string;
  customer_name: string;
  status: string;
  number_of_people: number;
  invoicing_mode: string;
  item_count: number;
}

const STATUS_CONFIG: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  submitted: { label: "Nieuw", variant: "default" },
  processing: { label: "In behandeling", variant: "secondary" },
  quoted: { label: "Offertes verstuurd", variant: "outline" },
  accepted: { label: "Geaccepteerd", variant: "default" },
  cancelled: { label: "Geannuleerd", variant: "destructive" },
  expired: { label: "Verlopen", variant: "destructive" },
};

const QUOTE_STATUS_CONFIG: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending: { label: "Wacht op reactie", variant: "secondary" },
  submitted: { label: "Offerte ontvangen", variant: "default" },
  selected: { label: "Geselecteerd", variant: "default" },
  rejected: { label: "Afgewezen", variant: "destructive" },
  declined: { label: "Afgewezen door partner", variant: "destructive" },
  expired: { label: "Verlopen", variant: "destructive" },
};

const TYPE_ICONS: Record<string, React.ReactNode> = {
  hotel: <Hotel className="h-5 w-5" />,
  vacation_home: <Home className="h-5 w-5" />,
  group_accommodation: <Building2 className="h-5 w-5" />,
  camping: <Tent className="h-5 w-5" />,
  no_preference: <HelpCircle className="h-5 w-5" />,
};

const TYPE_LABELS: Record<string, string> = {
  hotel: "Hotel",
  vacation_home: "Vakantiewoning",
  group_accommodation: "Groepsaccommodatie",
  camping: "Camping",
  no_preference: "Geen voorkeur",
};

function generateStatusEmailBody(
  request: any,
  quotes: any[],
  referenceNumber: string | null
) {
  const total = quotes.length;
  const received = quotes.filter((q) => q.status === "submitted").length;
  const declined = quotes.filter((q) => q.status === "declined" || q.status === "rejected").length;
  const pending = quotes.filter((q) => q.status === "pending").length;
  const selected = quotes.filter((q) => q.status === "selected").length;

  const ref = referenceNumber ? ` (${referenceNumber})` : "";
  let body = `Beste ${request.customer_name},\n\nHierbij een update over uw logiesaanvraag${ref} voor ${request.number_of_guests} personen van ${format(new Date(request.arrival_date), "d MMMM", { locale: nl })} t/m ${format(new Date(request.departure_date), "d MMMM yyyy", { locale: nl })}.\n\n`;

  if (total === 0) {
    body += "Wij zijn bezig uw aanvraag uit te zetten bij logiespartners op Vlieland. Zodra wij meer informatie hebben, ontvangt u bericht van ons.\n";
  } else {
    body += `Wij hebben ${total} logiespartner${total !== 1 ? "s" : ""} benaderd.\n`;
    if (received > 0) body += `• Van ${received} partner${received !== 1 ? "s" : ""} hebben wij een offerte ontvangen.\n`;
    if (declined > 0) body += `• ${declined} partner${declined !== 1 ? "s" : ""} ${declined !== 1 ? "hebben" : "heeft"} de aanvraag helaas afgewezen.\n`;
    if (pending > 0) body += `• Wij wachten nog op een reactie van ${pending} partner${pending !== 1 ? "s" : ""}.\n`;
    if (selected > 0) body += `• Er is een offerte geselecteerd.\n`;
    body += "\n";

    if (pending > 0) {
      body += "Zodra wij alle reacties binnen hebben, informeren wij u over de mogelijkheden.\n";
    } else if (received > 0) {
      body += "Wij nemen binnenkort contact met u op om de offertes met u door te nemen.\n";
    }
  }

  body += "\nMocht u vragen hebben, neem dan gerust contact met ons op.\n\nMet vriendelijke groet,\nBureau Vlieland";
  return body;
}

export default function AdminAccommodationDetail() {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedPartners, setSelectedPartners] = useState<string[]>([]);
  const [adminNotes, setAdminNotes] = useState("");
  const [showEmailDialog, setShowEmailDialog] = useState(false);
  const [forwardQuoteId, setForwardQuoteId] = useState<string | null>(null);
  const [selectedQuoteForView, setSelectedQuoteForView] = useState<any>(null);
  const [showEditGuestsDialog, setShowEditGuestsDialog] = useState(false);
  const [showStatusEmailSheet, setShowStatusEmailSheet] = useState(false);
  const [statusEmailDefaults, setStatusEmailDefaults] = useState({ subject: "", body: "" });
  const [commLogOpen, setCommLogOpen] = useState(false);

  // Fetch accommodation request
  const { data: request, isLoading: requestLoading } = useQuery({
    queryKey: ["admin-accommodation-request", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("accommodation_requests")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;
      setAdminNotes(data.admin_notes || "");
      return data;
    },
    enabled: !!id,
  });

  // Fetch accommodation partners
  const { data: partners, isLoading: partnersLoading } = useQuery({
    queryKey: ["accommodation-partners"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("partners")
        .select("*")
        .eq("is_active", true)
        .or("partner_type.eq.accommodation,partner_type.eq.both");

      if (error) throw error;
      return data;
    },
  });

  // Fetch existing quotes for this request
  const { data: quotes } = useQuery({
    queryKey: ["admin-accommodation-quotes", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("accommodation_quotes")
        .select("*, partner:partners(id, name, email)")
        .eq("request_id", id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  // Fetch linked program request (reverse lookup)
  const { data: linkedProgram } = useQuery({
    queryKey: ["admin-linked-program", id],
    queryFn: async () => {
      const { data: program, error } = await supabase
        .from("program_requests")
        .select("id, customer_token, customer_name, status, number_of_people, invoicing_mode")
        .eq("linked_accommodation_id", id)
        .maybeSingle();

      if (error) throw error;
      if (!program) return null;

      const { count } = await supabase
        .from("program_request_items")
        .select("id", { count: "exact", head: true })
        .eq("request_id", program.id);

      return { ...program, item_count: count || 0 } as LinkedProgram;
    },
    enabled: !!id,
  });

  // Update request status
  const updateStatusMutation = useMutation({
    mutationFn: async (newStatus: string) => {
      const { error } = await supabase
        .from("accommodation_requests")
        .update({ status: newStatus, admin_notes: adminNotes })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-accommodation-request", id] });
      toast({ title: "Status bijgewerkt" });
    },
    onError: () => {
      toast({ title: "Fout bij bijwerken", variant: "destructive" });
    },
  });

  // Create quote requests for selected partners
  const createQuotesMutation = useMutation({
    mutationFn: async ({ emailSubject, emailBody }: { emailSubject: string; emailBody: string }) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const response = await supabase.functions.invoke("send-accommodation-quote-request", {
        body: { request_id: id, partner_ids: selectedPartners, email_subject: emailSubject, email_body: emailBody },
      });
      if (response.error) throw new Error(response.error.message || "Fout bij versturen");
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["admin-accommodation-quotes", id] });
      queryClient.invalidateQueries({ queryKey: ["admin-accommodation-request", id] });
      setSelectedPartners([]);
      setShowEmailDialog(false);
      toast({ title: "Offerteaanvragen verstuurd", description: `Email verstuurd naar ${data.sent_count} partner(s)` });
    },
    onError: (error) => {
      toast({ title: "Fout bij versturen", description: error.message, variant: "destructive" });
    },
  });

  // Select a quote — use edge function for full notification flow
  const selectQuoteMutation = useMutation({
    mutationFn: async (quoteId: string) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Niet ingelogd");

      const response = await supabase.functions.invoke("select-accommodation-quote", {
        body: { quoteId, adminOverride: true },
      });
      if (response.error) throw new Error(response.error.message || "Fout bij selecteren");
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-accommodation-quotes", id] });
      queryClient.invalidateQueries({ queryKey: ["admin-accommodation-request", id] });
      toast({ title: "Offerte geaccepteerd", description: "Partner en afgewezen partners zijn genotificeerd." });
    },
    onError: (error) => {
      toast({ title: "Fout bij accepteren", description: error.message, variant: "destructive" });
    },
  });

  // Forward quote to customer
  const forwardQuoteMutation = useMutation({
    mutationFn: async ({ quoteId, emailSubject, emailBody }: { quoteId: string; emailSubject: string; emailBody: string }) => {
      const { error: emailError } = await supabase.functions.invoke("notify-accommodation-quote", { body: { quoteId } });
      if (emailError) throw emailError;
      const { error: updateError } = await supabase.from("accommodation_quotes").update({ forwarded_at: new Date().toISOString() }).eq("id", quoteId);
      if (updateError) throw updateError;
      await supabase.from("admin_todos").update({ status: "done", completed_at: new Date().toISOString() }).eq("auto_type", "quote_review").eq("auto_entity_id", quoteId).neq("status", "done");
      await supabase.from("project_communications").insert({
        accommodation_id: id,
        communication_type: "email",
        direction: "outbound",
        subject: emailSubject,
        content: emailBody,
        contact_name: request?.customer_name,
        contact_email: request?.customer_email,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-accommodation-quotes", id] });
      setForwardQuoteId(null);
      toast({ title: "Offerte doorgestuurd naar klant" });
    },
    onError: (error) => {
      toast({ title: "Fout bij doorsturen", description: error.message, variant: "destructive" });
    },
  });

  // Update guests mutation
  const updateGuestsMutation = useMutation({
    mutationFn: async (newGuests: number) => {
      await supabase.from("accommodation_requests").update({ number_of_guests: newGuests, status: "processing", updated_at: new Date().toISOString() }).eq("id", id);
      if (linkedProgram) {
        await supabase.from("program_requests").update({ number_of_people: newGuests, updated_at: new Date().toISOString() }).eq("id", linkedProgram.id);
      }
      if (quotes && quotes.length > 0) {
        const activeQuoteIds = quotes.filter(q => ["pending", "submitted", "selected"].includes(q.status)).map(q => q.id);
        if (activeQuoteIds.length > 0) {
          await supabase.from("accommodation_quotes").update({ status: "pending", submitted_at: null, selected_at: null, updated_at: new Date().toISOString() }).in("id", activeQuoteIds);
        }
      }
      if (linkedProgram) {
        await supabase.from("program_request_history").insert({
          request_id: linkedProgram.id, action: "people_changed", actor: "admin", actor_name: "Bureau Vlieland",
          old_value: { people: request?.number_of_guests }, new_value: { people: newGuests },
          notes: `Aantal gasten gewijzigd: ${request?.number_of_guests} → ${newGuests} (admin). Logiesoffertes gereset.`,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-accommodation-request", id] });
      queryClient.invalidateQueries({ queryKey: ["admin-accommodation-quotes", id] });
      queryClient.invalidateQueries({ queryKey: ["admin-linked-program", id] });
      toast({ title: "Aantal gasten bijgewerkt", description: "Offertes zijn gereset." });
    },
    onError: () => {
      toast({ title: "Fout bij bijwerken", variant: "destructive" });
    },
  });

  const togglePartner = (partnerId: string) => {
    setSelectedPartners((prev) =>
      prev.includes(partnerId) ? prev.filter((pid) => pid !== partnerId) : [...prev, partnerId]
    );
  };

  const partnerQuoteStatusMap: Record<string, string> = {};
  quotes?.forEach((q) => {
    if (!partnerQuoteStatusMap[q.partner_id] || ['submitted', 'selected'].includes(q.status)) {
      partnerQuoteStatusMap[q.partner_id] = q.status;
    }
  });

  const hasPendingSelected = selectedPartners.some((pid) => partnerQuoteStatusMap[pid] === "pending");

  const getLabel = (options: readonly { value: string; label: string }[], value: string) => {
    return options.find((o) => o.value === value)?.label || value;
  };

  // Stats
  const quoteStats = {
    total: quotes?.length || 0,
    received: quotes?.filter((q) => q.status === "submitted").length || 0,
    declined: quotes?.filter((q) => q.status === "declined" || q.status === "rejected").length || 0,
    pending: quotes?.filter((q) => q.status === "pending").length || 0,
    selected: quotes?.filter((q) => q.status === "selected").length || 0,
  };

  const handleOpenStatusEmail = () => {
    if (!request) return;
    const subject = `Update logiesaanvraag${request.reference_number ? ` ${request.reference_number}` : ""}`;
    const body = generateStatusEmailBody(request, quotes || [], request.reference_number);
    setStatusEmailDefaults({ subject, body });
    setShowStatusEmailSheet(true);
  };

  if (requestLoading) {
    return (
      <AdminLayout>
        <div className="p-6 space-y-6">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-16 w-full" />
          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <Skeleton className="h-64" />
              <Skeleton className="h-48" />
            </div>
            <Skeleton className="h-96" />
          </div>
        </div>
      </AdminLayout>
    );
  }

  if (!request) {
    return (
      <AdminLayout>
        <div className="p-6">
          <p>Aanvraag niet gevonden</p>
          <Button asChild className="mt-4">
            <Link to="/admin/logies">Terug naar overzicht</Link>
          </Button>
        </div>
      </AdminLayout>
    );
  }

  const nights = Math.ceil(
    (new Date(request.departure_date).getTime() - new Date(request.arrival_date).getTime()) / (1000 * 60 * 60 * 24)
  );
  const statusConfig = STATUS_CONFIG[request.status] || STATUS_CONFIG.submitted;
  const roomTypes = (request.room_types as string[]) || [];
  const locationPrefs = (request.location_preference as string[]) || [];
  const facilities = (request.facilities_required as string[]) || [];

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" asChild>
              <Link to="/admin/logies">
                <ArrowLeft className="h-4 w-4 mr-1" />
                Terug
              </Link>
            </Button>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-foreground">{request.customer_name}</h1>
                {request.reference_number && (
                  <code className="text-sm font-mono bg-muted px-2 py-1 rounded">{request.reference_number}</code>
                )}
                <Badge variant={statusConfig.variant} className="text-sm px-3 py-1">{statusConfig.label}</Badge>
              </div>
              <p className="text-muted-foreground">{request.customer_company || request.customer_email}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {linkedProgram && (
              <Button variant="outline" size="sm" asChild>
                <Link to={`/mijn-programma/${linkedProgram.customer_token}`} target="_blank">
                  <ExternalLink className="h-4 w-4 mr-1" />
                  Bekijk als klant
                </Link>
              </Button>
            )}
          </div>
        </div>

        {/* Stats Strip */}
        {quoteStats.total > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border">
              <Send className="h-4 w-4 text-primary" />
              <div>
                <p className="text-2xl font-bold text-foreground">{quoteStats.total}</p>
                <p className="text-xs text-muted-foreground">Benaderd</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <div>
                <p className="text-2xl font-bold text-foreground">{quoteStats.received}</p>
                <p className="text-xs text-muted-foreground">Offertes</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border">
              <XCircle className="h-4 w-4 text-destructive" />
              <div>
                <p className="text-2xl font-bold text-foreground">{quoteStats.declined}</p>
                <p className="text-xs text-muted-foreground">Afgewezen</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border">
              <Clock className="h-4 w-4 text-amber-500" />
              <div>
                <p className="text-2xl font-bold text-foreground">{quoteStats.pending}</p>
                <p className="text-xs text-muted-foreground">Wachtend</p>
              </div>
            </div>
          </div>
        )}

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Compact Request Details */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  {TYPE_ICONS[request.accommodation_type]}
                  {TYPE_LABELS[request.accommodation_type]} — Aanvraagdetails
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid sm:grid-cols-3 gap-3">
                  <div className="flex items-center gap-3 p-2.5 bg-muted/50 rounded-lg">
                    <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground">Periode</p>
                      <p className="font-medium text-sm">
                        {format(new Date(request.arrival_date), "d MMM", { locale: nl })} – {format(new Date(request.departure_date), "d MMM yyyy", { locale: nl })}
                      </p>
                      <p className="text-xs text-muted-foreground">{nights} nachten</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-2.5 bg-muted/50 rounded-lg">
                    <Users className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-muted-foreground">Gasten</p>
                      <p className="font-medium text-sm">{request.number_of_guests} personen</p>
                    </div>
                    <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => setShowEditGuestsDialog(true)}>
                      <Pencil className="h-3 w-3" />
                    </Button>
                  </div>
                  {request.room_count && (
                    <div className="flex items-center gap-3 p-2.5 bg-muted/50 rounded-lg">
                      <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs text-muted-foreground">Kamers</p>
                        <p className="font-medium text-sm">{request.room_count} ({request.room_occupancy || "?"} p.p.k.)</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Inline preferences */}
                <div className="flex flex-wrap gap-1.5">
                  {roomTypes.map((type) => (
                    <Badge key={type} variant="outline" className="text-xs">{getLabel(ROOM_TYPES, type)}</Badge>
                  ))}
                  {locationPrefs.map((pref) => (
                    <Badge key={pref} variant="outline" className="text-xs">
                      <MapPin className="h-2.5 w-2.5 mr-0.5" />
                      {getLabel(LOCATION_PREFERENCES, pref)}
                    </Badge>
                  ))}
                  {facilities.map((fac) => (
                    <Badge key={fac} variant="outline" className="text-xs">{getLabel(FACILITIES, fac)}</Badge>
                  ))}
                  {request.budget_range && (
                    <Badge variant="outline" className="text-xs">
                      <Euro className="h-2.5 w-2.5 mr-0.5" />
                      {getLabel(BUDGET_RANGES, request.budget_range)}
                    </Badge>
                  )}
                  {request.wants_activities && (
                    <Badge variant="outline" className="text-xs text-green-700 border-green-200 bg-green-50">
                      <Check className="h-2.5 w-2.5 mr-0.5" />
                      Wil activiteiten
                    </Badge>
                  )}
                </div>

                {request.special_requests && (
                  <p className="text-sm text-muted-foreground bg-muted/30 p-2.5 rounded-lg italic">
                    "{request.special_requests}"
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Quote Cards */}
            {quotes && quotes.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-base font-semibold text-foreground">Ontvangen offertes</h3>
                <div className="grid sm:grid-cols-2 gap-3">
                  {quotes.map((quote) => {
                    const quoteStatus = QUOTE_STATUS_CONFIG[quote.status] || QUOTE_STATUS_CONFIG.pending;
                    const partner = quote.partner as { id: string; name: string; email: string } | null;
                    const hasAttachment = quote.quote_attachment_path || quote.quote_external_url;

                    return (
                      <Card key={quote.id} className={`relative ${quote.status === "selected" ? "ring-2 ring-green-500" : ""}`}>
                        <CardContent className="p-4 space-y-3">
                          {/* Header row */}
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="font-semibold text-sm truncate">{partner?.name || "Onbekend"}</p>
                              <p className="text-xs text-muted-foreground truncate">
                                {quote.accommodation_name || "Wacht op reactie"}
                              </p>
                            </div>
                            <Badge variant={quoteStatus.variant} className="text-xs shrink-0">{quoteStatus.label}</Badge>
                          </div>

                          {/* Price */}
                          {quote.price_total > 0 && (
                            <div className="flex items-baseline gap-2">
                              <span className="text-lg font-bold text-foreground">€{quote.price_total.toLocaleString()}</span>
                              {quote.price_per_person_per_night && (
                                <span className="text-xs text-muted-foreground">€{quote.price_per_person_per_night} p.p.p.n.</span>
                              )}
                            </div>
                          )}

                          {/* Alternative dates for declined */}
                          {quote.status === "declined" && (quote as any).proposed_arrival_date && (
                            <p className="text-xs text-primary font-medium">
                              Alt: {format(new Date((quote as any).proposed_arrival_date), "d MMM", { locale: nl })} – {format(new Date((quote as any).proposed_departure_date), "d MMM", { locale: nl })}
                            </p>
                          )}

                          {/* Meta row */}
                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            <span>Geldig tot {format(new Date(quote.valid_until), "d MMM yyyy", { locale: nl })}</span>
                            {hasAttachment && (
                              <span className="flex items-center gap-0.5">
                                {quote.quote_external_url ? <LinkIcon className="h-3 w-3" /> : <Paperclip className="h-3 w-3" />}
                                Bijlage
                              </span>
                            )}
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-1.5 pt-1 border-t">
                            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setSelectedQuoteForView(quote)}>
                              <Eye className="h-3 w-3 mr-1" />
                              Bekijken
                            </Button>
                            {quote.status === "submitted" && !(quote as any).forwarded_at && (
                              <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setForwardQuoteId(quote.id)}>
                                <Send className="h-3 w-3 mr-1" />
                                Doorsturen
                              </Button>
                            )}
                            {quote.status === "submitted" && (quote as any).forwarded_at && (
                              <Badge variant="outline" className="text-xs h-7 px-2">
                                <Check className="h-3 w-3 mr-1" />
                                Doorgestuurd
                              </Badge>
                            )}
                            {quote.status === "submitted" && (
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="outline" size="sm" className="h-7 text-xs ml-auto">
                                    <Check className="h-3 w-3 mr-1" />
                                    Selecteren
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Offerte selecteren</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Weet je zeker dat je deze offerte wilt selecteren? Andere offertes worden automatisch afgewezen.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Annuleren</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => selectQuoteMutation.mutate(quote.id)}>Bevestigen</AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            )}
                            {quote.status === "selected" && (
                              <Badge variant="default" className="bg-green-600 ml-auto text-xs h-7 px-2">
                                <Check className="h-3 w-3 mr-1" />
                                Geselecteerd
                              </Badge>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Partner Selection */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Partners selecteren</CardTitle>
                <CardDescription>Selecteer logiesverstrekkers voor een offerteaanvraag</CardDescription>
              </CardHeader>
              <CardContent>
                {partnersLoading ? (
                  <div className="space-y-2">
                    {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
                  </div>
                ) : partners?.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">
                    Geen logiesverstrekkers gevonden. Voeg eerst partners toe met type "accommodation".
                  </p>
                ) : (
                  <div className="space-y-2">
                    {partners?.map((partner) => {
                      const quoteStatus = partnerQuoteStatusMap[partner.id];
                      const isBlocked = quoteStatus === "submitted" || quoteStatus === "selected";
                      const isSelected = selectedPartners.includes(partner.id);

                      const statusBadge = quoteStatus ? (() => {
                        switch (quoteStatus) {
                          case "pending": return <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-xs">Wacht op reactie</Badge>;
                          case "submitted": return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-xs">Offerte ontvangen</Badge>;
                          case "selected": return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-xs">Geselecteerd</Badge>;
                          case "declined": case "rejected": return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 text-xs">Afgewezen</Badge>;
                          case "expired": return <Badge variant="outline" className="bg-muted text-muted-foreground text-xs">Verlopen</Badge>;
                          default: return <Badge variant="secondary" className="text-xs">Reeds aangevraagd</Badge>;
                        }
                      })() : null;

                      return (
                        <div
                          key={partner.id}
                          className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                            isBlocked ? "bg-muted/50 opacity-60" : isSelected ? "bg-primary/5 border-primary" : "bg-background hover:border-muted-foreground/30"
                          }`}
                        >
                          <Checkbox checked={isSelected} onCheckedChange={() => togglePartner(partner.id)} disabled={isBlocked} />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm">{partner.name}</p>
                            <p className="text-xs text-muted-foreground truncate">{partner.email}</p>
                          </div>
                          {statusBadge}
                          <span className="text-xs text-muted-foreground shrink-0">
                            {partner.accommodation_commission_percentage || 10}%
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}

                {selectedPartners.length > 0 && (
                  <div className="mt-4 flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">{selectedPartners.length} partner(s) geselecteerd</p>
                    <Button onClick={() => setShowEmailDialog(true)} disabled={createQuotesMutation.isPending}>
                      <Send className="h-4 w-4 mr-2" />
                      {hasPendingSelected ? "Herinnering versturen" : "Offerteaanvraag versturen"}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Linked Program */}
            {linkedProgram && (
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="font-medium text-sm">Gekoppeld programma</p>
                        <p className="text-xs text-muted-foreground">
                          {linkedProgram.number_of_people} personen · {linkedProgram.item_count} activiteiten
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={linkedProgram.status === "active" ? "default" : "secondary"} className="text-xs">
                        {linkedProgram.status === "active" ? "Actief" : linkedProgram.status}
                      </Badge>
                      <Button variant="outline" size="sm" className="h-7 text-xs" asChild>
                        <Link to={`/admin/aanvragen/${linkedProgram.id}`}>
                          <ChevronRight className="h-3 w-3 mr-1" />
                          Bekijken
                        </Link>
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Collapsible Communication Log */}
            <Collapsible open={commLogOpen} onOpenChange={setCommLogOpen}>
              <CollapsibleTrigger asChild>
                <Button variant="outline" className="w-full justify-between">
                  <span className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4" />
                    Communicatielog
                  </span>
                  <ChevronDown className={`h-4 w-4 transition-transform ${commLogOpen ? "rotate-180" : ""}`} />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-3">
                <ProjectCommunicationsCard
                  accommodationId={id}
                  customerName={request.customer_name}
                  customerEmail={request.customer_email}
                />
              </CollapsibleContent>
            </Collapsible>
          </div>

          {/* Sticky Sidebar */}
          <div className="space-y-4 lg:sticky lg:top-6 lg:self-start">
            {/* Contact Info */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Contact</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center gap-2">
                  <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                  <a href={`mailto:${request.customer_email}`} className="text-sm text-primary hover:underline truncate">
                    {request.customer_email}
                  </a>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                  <a href={`tel:${request.customer_phone}`} className="text-sm hover:underline">{request.customer_phone}</a>
                </div>
                {request.customer_company && (
                  <div className="flex items-center gap-2">
                    <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-sm">{request.customer_company}</span>
                  </div>
                )}

                <Separator className="my-2" />

                {/* Status Email Button */}
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={handleOpenStatusEmail}
                >
                  <Mail className="h-3.5 w-3.5 mr-2" />
                  Mail klant over status
                </Button>
              </CardContent>
            </Card>

            {/* Invoicing Mode (read-only from linked program) */}
            {linkedProgram && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Facturatiemodel</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    {linkedProgram.invoicing_mode === "bureau_central" ? (
                      <>
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium">Bureau Vlieland factureert</p>
                          <p className="text-xs text-muted-foreground">Partner stuurt factuur naar Bureau Vlieland</p>
                        </div>
                      </>
                    ) : (
                      <>
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium">Partner factureert direct</p>
                          <p className="text-xs text-muted-foreground">Partner stuurt factuur naar klant</p>
                        </div>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Status Management */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Select value={request.status} onValueChange={(value) => updateStatusMutation.mutate(value)}>
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="submitted">Nieuw</SelectItem>
                    <SelectItem value="processing">In behandeling</SelectItem>
                    <SelectItem value="quoted">Offertes verstuurd</SelectItem>
                    <SelectItem value="accepted">Geaccepteerd</SelectItem>
                    <SelectItem value="cancelled">Geannuleerd</SelectItem>
                  </SelectContent>
                </Select>

                <div>
                  <p className="text-xs font-medium mb-1 text-muted-foreground">Admin notities</p>
                  <Textarea
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    placeholder="Interne notities..."
                    rows={3}
                    className="text-sm"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-2 h-7 text-xs"
                    onClick={() => updateStatusMutation.mutate(request.status)}
                    disabled={updateStatusMutation.isPending}
                  >
                    Opslaan
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Timeline */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Tijdlijn</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2.5">
                  <div className="flex items-center gap-2.5 text-xs">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-500 shrink-0" />
                    <div>
                      <p className="font-medium">Aanvraag ontvangen</p>
                      <p className="text-muted-foreground">
                        {format(new Date(request.created_at), "d MMM yyyy HH:mm", { locale: nl })}
                      </p>
                    </div>
                  </div>
                  {quoteStats.total > 0 && (
                    <div className="flex items-center gap-2.5 text-xs">
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
                      <p className="font-medium">{quoteStats.total} partner(s) benaderd</p>
                    </div>
                  )}
                  {quoteStats.received > 0 && (
                    <div className="flex items-center gap-2.5 text-xs">
                      <div className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                      <p className="font-medium">{quoteStats.received} offerte(s) ontvangen</p>
                    </div>
                  )}
                  {request.status === "accepted" && (
                    <div className="flex items-center gap-2.5 text-xs">
                      <div className="w-1.5 h-1.5 rounded-full bg-green-600 shrink-0" />
                      <p className="font-medium">Offerte geaccepteerd</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Email Preview Dialog */}
      {request && partners && (
        <SendAccommodationQuoteRequestDialog
          open={showEmailDialog}
          onOpenChange={setShowEmailDialog}
          request={{
            id: request.id,
            reference_number: request.reference_number || undefined,
            customer_name: request.customer_name,
            customer_company: request.customer_company || undefined,
            customer_email: request.customer_email,
            arrival_date: request.arrival_date,
            departure_date: request.departure_date,
            number_of_guests: request.number_of_guests,
            accommodation_type: request.accommodation_type,
            special_requests: request.special_requests || undefined,
          }}
          selectedPartners={partners.filter(p => selectedPartners.includes(p.id)).map(p => ({ id: p.id, name: p.name, email: p.email }))}
          onSend={(emailSubject, emailBody) => createQuotesMutation.mutate({ emailSubject, emailBody })}
          isSending={createQuotesMutation.isPending}
        />
      )}

      {/* Forward Quote to Customer Dialog */}
      {request && forwardQuoteId && quotes && (() => {
        const quoteToForward = quotes.find(q => q.id === forwardQuoteId);
        if (!quoteToForward) return null;
        return (
          <ForwardQuoteToCustomerDialog
            open={!!forwardQuoteId}
            onOpenChange={(open) => { if (!open) setForwardQuoteId(null); }}
            quote={{
              id: quoteToForward.id,
              accommodation_name: quoteToForward.accommodation_name,
              price_total: quoteToForward.price_total,
              partner: quoteToForward.partner as { name: string } | null,
            }}
            customerName={request.customer_name}
            customerEmail={request.customer_email}
            onSend={(emailSubject, emailBody) => forwardQuoteMutation.mutate({ quoteId: forwardQuoteId, emailSubject, emailBody })}
            isSending={forwardQuoteMutation.isPending}
          />
        );
      })()}

      {/* Quote Detail Sheet */}
      <AdminAccommodationQuoteSheet
        open={!!selectedQuoteForView}
        onOpenChange={(open) => { if (!open) setSelectedQuoteForView(null); }}
        quote={selectedQuoteForView}
        numberOfGuests={request?.number_of_guests || 0}
        numberOfNights={nights}
      />

      {/* Edit Guests Dialog */}
      <EditAccommodationGuestsDialog
        isOpen={showEditGuestsDialog}
        onClose={() => setShowEditGuestsDialog(false)}
        currentGuests={request?.number_of_guests || 0}
        onSave={(newGuests) => updateGuestsMutation.mutateAsync(newGuests)}
      />

      {/* Status Email Sheet */}
      <SendProjectEmailSheet
        open={showStatusEmailSheet}
        onOpenChange={setShowStatusEmailSheet}
        accommodationId={id}
        recipients={[{
          label: `Klant: ${request.customer_name}`,
          email: request.customer_email,
          name: request.customer_name,
          type: "customer" as const,
        }]}
        defaultSubject={statusEmailDefaults.subject}
        defaultBody={statusEmailDefaults.body}
        onEmailSent={() => {
          queryClient.invalidateQueries({ queryKey: ["project-communications", undefined, id] });
          setCommLogOpen(true);
        }}
      />
    </AdminLayout>
  );
}
