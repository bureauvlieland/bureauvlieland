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
} from "lucide-react";
import { FACILITIES, LOCATION_PREFERENCES, ROOM_TYPES, BUDGET_RANGES } from "@/types/accommodation";
import { SendAccommodationQuoteRequestDialog } from "@/components/admin/SendAccommodationQuoteRequestDialog";

interface LinkedProgram {
  id: string;
  customer_token: string;
  customer_name: string;
  status: string;
  number_of_people: number;
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

export default function AdminAccommodationDetail() {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedPartners, setSelectedPartners] = useState<string[]>([]);
  const [adminNotes, setAdminNotes] = useState("");
  const [showEmailDialog, setShowEmailDialog] = useState(false);

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
  const { data: quotes, isLoading: quotesLoading } = useQuery({
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
        .select("id, customer_token, customer_name, status, number_of_people")
        .eq("linked_accommodation_id", id)
        .maybeSingle();

      if (error) throw error;
      if (!program) return null;

      // Get item count
      const { count } = await supabase
        .from("program_request_items")
        .select("id", { count: "exact", head: true })
        .eq("request_id", program.id);

      return {
        ...program,
        item_count: count || 0,
      } as LinkedProgram;
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

  // Create quote requests for selected partners (via edge function with email)
  const createQuotesMutation = useMutation({
    mutationFn: async ({ emailSubject, emailBody }: { emailSubject: string; emailBody: string }) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const response = await supabase.functions.invoke("send-accommodation-quote-request", {
        body: {
          request_id: id,
          partner_ids: selectedPartners,
          email_subject: emailSubject,
          email_body: emailBody,
        },
      });

      if (response.error) {
        throw new Error(response.error.message || "Fout bij versturen");
      }

      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["admin-accommodation-quotes", id] });
      queryClient.invalidateQueries({ queryKey: ["admin-accommodation-request", id] });
      setSelectedPartners([]);
      setShowEmailDialog(false);
      toast({ 
        title: "Offerteaanvragen verstuurd", 
        description: `Email verstuurd naar ${data.sent_count} partner(s)` 
      });
    },
    onError: (error) => {
      toast({ title: "Fout bij versturen", description: error.message, variant: "destructive" });
    },
  });

  // Select a quote
  const selectQuoteMutation = useMutation({
    mutationFn: async (quoteId: string) => {
      // First, reject all other quotes
      await supabase
        .from("accommodation_quotes")
        .update({ status: "rejected" })
        .eq("request_id", id)
        .neq("id", quoteId);

      // Select this quote
      const { error } = await supabase
        .from("accommodation_quotes")
        .update({ status: "selected", selected_at: new Date().toISOString() })
        .eq("id", quoteId);

      if (error) throw error;

      // Update request status
      await supabase
        .from("accommodation_requests")
        .update({ status: "accepted" })
        .eq("id", id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-accommodation-quotes", id] });
      queryClient.invalidateQueries({ queryKey: ["admin-accommodation-request", id] });
      toast({ title: "Offerte geaccepteerd" });
    },
    onError: () => {
      toast({ title: "Fout bij accepteren", variant: "destructive" });
    },
  });

  const togglePartner = (partnerId: string) => {
    setSelectedPartners((prev) =>
      prev.includes(partnerId)
        ? prev.filter((id) => id !== partnerId)
        : [...prev, partnerId]
    );
  };

  // Get already requested partner IDs
  const requestedPartnerIds = quotes?.map((q) => q.partner_id) || [];

  // Helper to get label from value
  const getLabel = (options: readonly { value: string; label: string }[], value: string) => {
    return options.find((o) => o.value === value)?.label || value;
  };

  if (requestLoading) {
    return (
      <AdminLayout>
        <div className="p-6 space-y-6">
          <Skeleton className="h-8 w-64" />
          <div className="grid md:grid-cols-2 gap-6">
            <Skeleton className="h-64" />
            <Skeleton className="h-64" />
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
    (new Date(request.departure_date).getTime() - new Date(request.arrival_date).getTime()) /
      (1000 * 60 * 60 * 24)
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
                <h1 className="text-2xl font-bold text-slate-900">{request.customer_name}</h1>
                {request.reference_number && (
                  <code className="text-sm font-mono bg-slate-100 px-2 py-1 rounded">
                    {request.reference_number}
                  </code>
                )}
              </div>
              <p className="text-slate-600">{request.customer_company || request.customer_email}</p>
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
            <Badge variant={statusConfig.variant} className="text-sm px-3 py-1">
              {statusConfig.label}
            </Badge>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Request Details */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {TYPE_ICONS[request.accommodation_type]}
                  {TYPE_LABELS[request.accommodation_type]}
                </CardTitle>
                <CardDescription>Aanvraagdetails</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Dates and guests */}
                <div className="grid sm:grid-cols-3 gap-4">
                  <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                    <Calendar className="h-5 w-5 text-slate-500" />
                    <div>
                      <p className="text-sm text-slate-500">Periode</p>
                      <p className="font-medium">
                        {format(new Date(request.arrival_date), "d MMM", { locale: nl })} -{" "}
                        {format(new Date(request.departure_date), "d MMM yyyy", { locale: nl })}
                      </p>
                      <p className="text-sm text-slate-500">{nights} nachten</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                    <Users className="h-5 w-5 text-slate-500" />
                    <div>
                      <p className="text-sm text-slate-500">Gasten</p>
                      <p className="font-medium">{request.number_of_guests} personen</p>
                    </div>
                  </div>
                  {request.room_count && (
                    <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                      <Building2 className="h-5 w-5 text-slate-500" />
                      <div>
                        <p className="text-sm text-slate-500">Kamers</p>
                        <p className="font-medium">
                          {request.room_count} ({request.room_occupancy || "?"} p.p.k.)
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                <Separator />

                {/* Preferences */}
                <div className="grid sm:grid-cols-2 gap-6">
                  {roomTypes.length > 0 && (
                    <div>
                      <p className="text-sm font-medium text-slate-700 mb-2">Kamervoorkeur</p>
                      <div className="flex flex-wrap gap-2">
                        {roomTypes.map((type) => (
                          <Badge key={type} variant="outline">
                            {getLabel(ROOM_TYPES, type)}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {locationPrefs.length > 0 && (
                    <div>
                      <p className="text-sm font-medium text-slate-700 mb-2">Locatievoorkeur</p>
                      <div className="flex flex-wrap gap-2">
                        {locationPrefs.map((pref) => (
                          <Badge key={pref} variant="outline">
                            <MapPin className="h-3 w-3 mr-1" />
                            {getLabel(LOCATION_PREFERENCES, pref)}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {facilities.length > 0 && (
                    <div>
                      <p className="text-sm font-medium text-slate-700 mb-2">Gevraagde faciliteiten</p>
                      <div className="flex flex-wrap gap-2">
                        {facilities.map((fac) => (
                          <Badge key={fac} variant="outline">
                            {getLabel(FACILITIES, fac)}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {request.budget_range && (
                    <div>
                      <p className="text-sm font-medium text-slate-700 mb-2">Budgetindicatie</p>
                      <Badge variant="outline">
                        <Euro className="h-3 w-3 mr-1" />
                        {getLabel(BUDGET_RANGES, request.budget_range)}
                      </Badge>
                    </div>
                  )}
                </div>

                {request.special_requests && (
                  <>
                    <Separator />
                    <div>
                      <p className="text-sm font-medium text-slate-700 mb-2">Speciale wensen</p>
                      <p className="text-slate-600 whitespace-pre-wrap">{request.special_requests}</p>
                    </div>
                  </>
                )}

                {request.wants_activities && (
                  <>
                    <Separator />
                    <div className="flex items-center gap-2 text-green-600">
                      <Check className="h-5 w-5" />
                      <span className="font-medium">Klant wil ook activiteiten boeken</span>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Partner Selection */}
            <Card>
              <CardHeader>
                <CardTitle>Partners selecteren</CardTitle>
                <CardDescription>
                  Selecteer de logiesverstrekkers voor een offerteaanvraag
                </CardDescription>
              </CardHeader>
              <CardContent>
                {partnersLoading ? (
                  <div className="space-y-2">
                    {[...Array(3)].map((_, i) => (
                      <Skeleton key={i} className="h-12 w-full" />
                    ))}
                  </div>
                ) : partners?.length === 0 ? (
                  <p className="text-slate-500 text-center py-4">
                    Geen logiesverstrekkers gevonden. Voeg eerst partners toe met type "accommodation".
                  </p>
                ) : (
                  <div className="space-y-2">
                    {partners?.map((partner) => {
                      const alreadyRequested = requestedPartnerIds.includes(partner.id);
                      const isSelected = selectedPartners.includes(partner.id);

                      return (
                        <div
                          key={partner.id}
                          className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                            alreadyRequested
                              ? "bg-slate-50 border-slate-200 opacity-60"
                              : isSelected
                              ? "bg-primary/5 border-primary"
                              : "bg-white border-slate-200 hover:border-slate-300"
                          }`}
                        >
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => togglePartner(partner.id)}
                            disabled={alreadyRequested}
                          />
                          <div className="flex-1">
                            <p className="font-medium">{partner.name}</p>
                            <p className="text-sm text-slate-500">{partner.email}</p>
                          </div>
                          {alreadyRequested && (
                            <Badge variant="secondary">Reeds aangevraagd</Badge>
                          )}
                          <span className="text-sm text-slate-500">
                            {partner.accommodation_commission_percentage || 10}% commissie
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}

                {selectedPartners.length > 0 && (
                  <div className="mt-4 flex items-center justify-between">
                    <p className="text-sm text-slate-600">
                      {selectedPartners.length} partner(s) geselecteerd
                    </p>
                    <Button onClick={() => setShowEmailDialog(true)} disabled={createQuotesMutation.isPending}>
                      <Send className="h-4 w-4 mr-2" />
                      Offerteaanvraag versturen
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quotes Comparison */}
            {quotes && quotes.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Ontvangen offertes</CardTitle>
                  <CardDescription>
                    Vergelijk en selecteer de beste offerte
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Partner</TableHead>
                        <TableHead>Accommodatie</TableHead>
                        <TableHead>Prijs totaal</TableHead>
                        <TableHead>P.p.p.n.</TableHead>
                        <TableHead>Offerte</TableHead>
                        <TableHead>Geldig tot</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actie</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {quotes.map((quote) => {
                        const quoteStatus = QUOTE_STATUS_CONFIG[quote.status] || QUOTE_STATUS_CONFIG.pending;
                        const partner = quote.partner as { id: string; name: string; email: string } | null;
                        const hasAttachment = quote.quote_attachment_path || quote.quote_external_url;

                        return (
                          <TableRow key={quote.id}>
                            <TableCell>
                              <p className="font-medium">{partner?.name || "Onbekend"}</p>
                            </TableCell>
                            <TableCell>
                              {quote.accommodation_name || (
                                <span className="text-slate-400">Wacht op reactie</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {quote.price_total > 0 ? (
                                <span className="font-medium">€{quote.price_total.toLocaleString()}</span>
                              ) : (
                                <span className="text-slate-400">-</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {quote.price_per_person_per_night ? (
                                <span>€{quote.price_per_person_per_night}</span>
                              ) : (
                                <span className="text-slate-400">-</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {hasAttachment ? (
                                <div className="flex items-center gap-1">
                                  {quote.quote_external_url && (
                                    <a
                                      href={quote.quote_external_url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                                    >
                                      <LinkIcon className="h-3 w-3" />
                                      Link
                                    </a>
                                  )}
                                  {quote.quote_attachment_path && (
                                    <a
                                      href={quote.quote_attachment_path}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                                    >
                                      <Paperclip className="h-3 w-3" />
                                      {quote.quote_attachment_filename || "Bijlage"}
                                    </a>
                                  )}
                                </div>
                              ) : (
                                <span className="text-slate-400">-</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <span className="text-sm">
                                {format(new Date(quote.valid_until), "d MMM yyyy", { locale: nl })}
                              </span>
                            </TableCell>
                            <TableCell>
                              <Badge variant={quoteStatus.variant}>{quoteStatus.label}</Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              {quote.status === "submitted" && (
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button variant="outline" size="sm">
                                      <Check className="h-4 w-4 mr-1" />
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
                                      <AlertDialogAction onClick={() => selectQuoteMutation.mutate(quote.id)}>
                                        Bevestigen
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              )}
                              {quote.status === "selected" && (
                                <Badge variant="default" className="bg-green-600">
                                  <Check className="h-3 w-3 mr-1" />
                                  Geselecteerd
                                </Badge>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}

            {/* Linked Program Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Gekoppeld programma
                </CardTitle>
              </CardHeader>
              <CardContent>
                {linkedProgram ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                      <div>
                        <p className="font-medium">{linkedProgram.customer_name}</p>
                        <p className="text-sm text-slate-500">
                          {linkedProgram.number_of_people} personen • {linkedProgram.item_count} activiteiten
                        </p>
                      </div>
                      <Badge variant={linkedProgram.status === "active" ? "default" : "secondary"}>
                        {linkedProgram.status === "active" ? "Actief" : linkedProgram.status}
                      </Badge>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" asChild>
                        <Link to={`/admin/aanvragen/${linkedProgram.id}`}>
                          <ChevronRight className="h-4 w-4 mr-1" />
                          Aanvraag bekijken
                        </Link>
                      </Button>
                      <Button variant="outline" size="sm" asChild>
                        <Link to={`/mijn-programma/${linkedProgram.customer_token}`} target="_blank">
                          <ExternalLink className="h-4 w-4 mr-1" />
                          Bekijk als klant
                        </Link>
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <p className="text-slate-500 mb-3">Geen programma gekoppeld aan deze logiesaanvraag</p>
                    <p className="text-sm text-slate-400">
                      De klant kan activiteiten toevoegen via de klantpagina zodra logies is geregeld.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Contact Info */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Contactgegevens</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-3">
                  <Mail className="h-4 w-4 text-slate-400" />
                  <a href={`mailto:${request.customer_email}`} className="text-sm text-primary hover:underline">
                    {request.customer_email}
                  </a>
                </div>
                <div className="flex items-center gap-3">
                  <Phone className="h-4 w-4 text-slate-400" />
                  <a href={`tel:${request.customer_phone}`} className="text-sm hover:underline">
                    {request.customer_phone}
                  </a>
                </div>
                {request.customer_company && (
                  <div className="flex items-center gap-3">
                    <Building2 className="h-4 w-4 text-slate-400" />
                    <span className="text-sm">{request.customer_company}</span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Status Management */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Status beheren</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Select
                  value={request.status}
                  onValueChange={(value) => updateStatusMutation.mutate(value)}
                >
                  <SelectTrigger>
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
                  <p className="text-sm font-medium mb-2">Admin notities</p>
                  <Textarea
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    placeholder="Interne notities..."
                    rows={4}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-2"
                    onClick={() => updateStatusMutation.mutate(request.status)}
                    disabled={updateStatusMutation.isPending}
                  >
                    Notities opslaan
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Timeline */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Tijdlijn</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center gap-3 text-sm">
                    <div className="w-2 h-2 rounded-full bg-green-500" />
                    <div>
                      <p className="font-medium">Aanvraag ontvangen</p>
                      <p className="text-slate-500">
                        {format(new Date(request.created_at), "d MMM yyyy HH:mm", { locale: nl })}
                      </p>
                    </div>
                  </div>
                  {quotes && quotes.length > 0 && (
                    <div className="flex items-center gap-3 text-sm">
                      <div className="w-2 h-2 rounded-full bg-blue-500" />
                      <div>
                        <p className="font-medium">
                          {quotes.length} partner(s) benaderd
                        </p>
                      </div>
                    </div>
                  )}
                  {quotes?.filter((q) => q.status === "submitted").length > 0 && (
                    <div className="flex items-center gap-3 text-sm">
                      <div className="w-2 h-2 rounded-full bg-amber-500" />
                      <div>
                        <p className="font-medium">
                          {quotes.filter((q) => q.status === "submitted").length} offerte(s) ontvangen
                        </p>
                      </div>
                    </div>
                  )}
                  {request.status === "accepted" && (
                    <div className="flex items-center gap-3 text-sm">
                      <div className="w-2 h-2 rounded-full bg-green-600" />
                      <div>
                        <p className="font-medium">Offerte geaccepteerd</p>
                      </div>
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
          selectedPartners={partners.filter(p => selectedPartners.includes(p.id)).map(p => ({
            id: p.id,
            name: p.name,
            email: p.email,
          }))}
          onSend={(emailSubject, emailBody) => {
            createQuotesMutation.mutate({ emailSubject, emailBody });
          }}
          isSending={createQuotesMutation.isPending}
        />
      )}
    </AdminLayout>
  );
}
