import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { 
  FileText, 
  AlertCircle, 
  CheckCircle, 
  Clock,
  ExternalLink,
  Euro,
  Users,
  Calendar,
  Building2,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { RegisterBureauInvoiceDialog } from "@/components/admin/RegisterBureauInvoiceDialog";
import { useAppSettings } from "@/hooks/useAppSettings";
import { useItemBillingLinesBatch } from "@/hooks/useItemBillingLines";
import { calculateAdminInvoicingTotals } from "@/lib/adminInvoicingTotals";
import { CheckCircle2, Mail, Hotel } from "lucide-react";
import { CompletionActions } from "@/components/admin/CompletionActions";

interface ProgramRequestWithItems {
  id: string;
  reference_number: string | null;
  linked_accommodation_id: string | null;
  invoicing_mode: string;
  customer_name: string;
  customer_company: string | null;
  customer_email: string;
  number_of_people: number;
  selected_dates: string[];
  selected_accommodation_total: number | null;
  completion_status: string | null;
  terms_accepted_at: string | null;
  created_at: string;
  items: {
    id: string;
    day_index: number;
    block_name: string;
    block_type: string;
    provider_name: string;
    status: string;
    quoted_price: number | null;
    admin_price_override?: number | null;
    price_type?: string | null;
    override_people?: number | null;
  }[];
  invoices: {
    id: string;
    invoice_number: string;
    invoice_date: string;
    amount_excl_vat: number;
    vat_amount: number;
    amount_incl_vat: number | null;
    invoice_type: string;
    description: string | null;
    status: string | null;
    forwarded_to_accounting_at: string | null;
  }[];
}

interface InvoiceTotals {
  programItemsTotal: number;
  extraCostsTotal: number;
  coordinationFee: number;
  touristTax: number;
  natureContribution: number;
  centralSurcharge: number;
  accommodationTotal: number;
  grandTotalInclVat: number;
  invoicedTotal: number;
  outstanding: number;
}

const formatCurrency = (amount: number) => 
  new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" }).format(amount);

const AdminInvoicing = () => {
  const queryClient = useQueryClient();
  const { getCoordinationFee, settings } = useAppSettings();
  const [activeTab, setActiveTab] = useState("ready");
  const [selectedRequest, setSelectedRequest] = useState<ProgramRequestWithItems | null>(null);
  const [isInvoiceDialogOpen, setIsInvoiceDialogOpen] = useState(false);
  const navigate = useNavigate();

  // Calculate invoice totals using the same full project logic as the admin financial overview
  const calculateInvoiceTotals = (request: ProgramRequestWithItems): InvoiceTotals => {
    return {
      ...calculateAdminInvoicingTotals(
        request,
        {
          coordinationFee: getCoordinationFee(request.number_of_people),
          touristTaxPerPersonPerDay: settings.tourist_tax_pp_per_day,
          natureContributionPerPerson: settings.nature_contribution_pp,
          bureauCentralSurchargePerPerson: settings.bureau_central_surcharge_pp,
        },
        linesByItem,
      ),
    };
  };

  // Fetch all requests with their items and invoices
  const { data: requests = [], isLoading } = useQuery({
    queryKey: ["admin-invoicing-requests"],
    queryFn: async () => {
      // Get requests with completion_status
      const { data: requestsData, error: requestsError } = await supabase
        .from("program_requests")
        .select("*")
        .eq("status", "active")
        .not("terms_accepted_at", "is", null)
        .order("terms_accepted_at", { ascending: false });

      if (requestsError) throw requestsError;

      const linkedAccommodationIds = Array.from(
        new Set(
          requestsData
            .map((request) => request.linked_accommodation_id)
            .filter((id): id is string => Boolean(id)),
        ),
      );

      // Get items for these requests
      const requestIds = requestsData.map((r) => r.id);
      
      const { data: itemsData, error: itemsError } = await supabase
        .from("program_request_items")
        .select("id, request_id, day_index, block_name, block_type, provider_name, status, quoted_price, admin_price_override, price_type, override_people")
        .in("request_id", requestIds);

      if (itemsError) throw itemsError;

      // Get invoices for these requests
      const { data: invoicesData, error: invoicesError } = await supabase
        .from("bureau_invoices")
        .select("id, request_id, invoice_number, invoice_date, amount_excl_vat, vat_amount, amount_incl_vat, invoice_type, description, status, forwarded_to_accounting_at")
        .in("request_id", requestIds);

      if (invoicesError) throw invoicesError;

      const accommodationTotals = new Map<string, number>();

      if (linkedAccommodationIds.length > 0) {
        const { data: accommodationQuotes, error: accommodationError } = await supabase
          .from("accommodation_quotes")
          .select("request_id, price_total")
          .eq("status", "selected")
          .in("request_id", linkedAccommodationIds);

        if (accommodationError) throw accommodationError;

        accommodationQuotes?.forEach((quote) => {
          accommodationTotals.set(quote.request_id, quote.price_total ?? 0);
        });
      }

      // Combine data
      return requestsData.map((request) => ({
        ...request,
        selected_dates: request.selected_dates as string[],
        selected_accommodation_total: request.linked_accommodation_id
          ? accommodationTotals.get(request.linked_accommodation_id) ?? null
          : null,
        items: itemsData.filter((item) => item.request_id === request.id),
        invoices: invoicesData.filter((inv) => inv.request_id === request.id),
      })) as ProgramRequestWithItems[];
    },
  });

  const allItemIds = useMemo(
    () => requests.flatMap((request) => request.items.map((item) => item.id)),
    [requests],
  );
  const { linesByItem } = useItemBillingLinesBatch(allItemIds);

  // Standalone logies (accommodation_requests without a linked program)
  const { data: standaloneLodging = [], isLoading: isLoadingLodging } = useQuery({
    queryKey: ["admin-invoicing-standalone-lodging"],
    queryFn: async () => {
      const { data: requests, error: reqErr } = await supabase
        .from("accommodation_requests")
        .select(
          "id, reference_number, customer_name, customer_company, customer_email, number_of_guests, arrival_date, departure_date, status, completion_status, completed_at",
        )
        .is("linked_program_id", null)
        .neq("status", "cancelled")
        .order("created_at", { ascending: false });
      if (reqErr) throw reqErr;
      if (!requests || requests.length === 0) return [];

      const ids = requests.map((r) => r.id);
      const { data: selectedQuotes, error: qErr } = await supabase
        .from("accommodation_quotes")
        .select(
          "id, request_id, accommodation_name, price_total, vat_rate, price_includes_vat, status, invoiced_amount",
        )
        .in("request_id", ids)
        .eq("status", "selected");
      if (qErr) throw qErr;

      return requests.map((r) => {
        const quote = selectedQuotes?.find((q) => q.request_id === r.id);
        const total = Number(quote?.price_total ?? 0);
        const invoiced = Number(quote?.invoiced_amount ?? 0);
        const outstanding = Math.max(total - invoiced, 0);
        return {
          ...r,
          selected_quote: quote ?? null,
          total,
          invoiced,
          outstanding,
        };
      });
    },
  });

  // Filter requests by completion status
  const readyRequests = requests.filter(
    (r) => r.completion_status === "ready_for_invoice" || 
           (!r.completion_status && r.invoices.length === 0)
  );
  
  const partialRequests = requests.filter(
    (r) => r.completion_status === "partially_invoiced"
  );
  
  const completedRequests = requests.filter(
    (r) => r.completion_status === "fully_invoiced"
  );

  const lodgingReady = standaloneLodging.filter(
    (l) => !l.completion_status || l.completion_status === "ready_for_invoice" || l.completion_status === "in_progress"
  );
  const lodgingPartial = standaloneLodging.filter(
    (l) => l.completion_status === "partially_invoiced"
  );
  const lodgingCompleted = standaloneLodging.filter(
    (l) => l.completion_status === "fully_invoiced"
  );

  const handleOpenInvoiceDialog = (request: ProgramRequestWithItems) => {
    setSelectedRequest(request);
    setIsInvoiceDialogOpen(true);
  };

  const handleInvoiceSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ["admin-invoicing-requests"] });
    setIsInvoiceDialogOpen(false);
    setSelectedRequest(null);
  };

  const RequestCard = ({ request }: { request: ProgramRequestWithItems }) => {
    const totals = calculateInvoiceTotals(request);
    const dates = request.selected_dates
      .map((d) => format(new Date(d), "EEE d MMM", { locale: nl }))
      .join(", ");

    return (
      <Card className="hover:shadow-md transition-shadow">
        <CardContent className="p-6">
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
            {/* Left: Customer info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-slate-100 rounded-lg">
                  <Building2 className="h-5 w-5 text-slate-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900 truncate">
                    {request.customer_company || request.customer_name}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {request.customer_name}
                  </p>
                </div>
              </div>
              
              <div className="flex flex-wrap gap-4 mt-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <Calendar className="h-4 w-4" />
                  {dates}
                </span>
                <span className="flex items-center gap-1.5">
                  <Users className="h-4 w-4" />
                  {request.number_of_people} personen
                </span>
              </div>
            </div>

            {/* Right: Financial summary */}
            <div className="lg:text-right space-y-2">
              <div className="text-2xl font-bold text-slate-900">
                {formatCurrency(totals.grandTotalInclVat)}
              </div>
              <p className="text-sm text-muted-foreground">
                incl. BTW
              </p>
              
              {totals.invoicedTotal > 0 && (
                <div className="space-y-1">
                  <p className="text-sm">
                    <span className="text-muted-foreground">Gefactureerd: </span>
                    <span className="font-medium text-green-600">
                      {formatCurrency(totals.invoicedTotal)}
                    </span>
                  </p>
                  {totals.outstanding > 0 && (
                    <p className="text-sm">
                      <span className="text-muted-foreground">Openstaand: </span>
                      <span className="font-medium text-amber-600">
                        {formatCurrency(totals.outstanding)}
                      </span>
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Breakdown */}
          <div className="mt-4 pt-4 border-t space-y-1 text-sm">
            <div className="flex justify-between text-muted-foreground">
              <span>Programma-onderdelen</span>
              <span>{formatCurrency(totals.programItemsTotal)}</span>
            </div>
            {totals.extraCostsTotal > 0 && (
              <div className="flex justify-between text-muted-foreground">
                <span>Extra kostenposten</span>
                <span>{formatCurrency(totals.extraCostsTotal)}</span>
              </div>
            )}
            {totals.accommodationTotal > 0 && (
              <div className="flex justify-between text-muted-foreground">
                <span>Logies</span>
                <span>{formatCurrency(totals.accommodationTotal)}</span>
              </div>
            )}
            {totals.touristTax > 0 && (
              <div className="flex justify-between text-muted-foreground">
                <span>Toeristenbelasting</span>
                <span>{formatCurrency(totals.touristTax)}</span>
              </div>
            )}
            {totals.natureContribution > 0 && (
              <div className="flex justify-between text-muted-foreground">
                <span>Natuurbijdrage</span>
                <span>{formatCurrency(totals.natureContribution)}</span>
              </div>
            )}
            {totals.centralSurcharge > 0 && (
              <div className="flex justify-between text-muted-foreground">
                <span>Centrale opslag</span>
                <span>{formatCurrency(totals.centralSurcharge)}</span>
              </div>
            )}
            <div className="flex justify-between text-muted-foreground">
              <span>Coördinatiekosten</span>
              <span>{formatCurrency(totals.coordinationFee)}</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>Totaal te factureren</span>
              <span className="font-medium text-foreground">{formatCurrency(totals.outstanding)}</span>
            </div>
          </div>

          {/* Geregistreerde facturen + doorstuur-knop */}
          {request.invoices.length > 0 && (
            <div className="mt-4 pt-4 border-t space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Geregistreerde facturen
              </p>
              {request.invoices.map((inv) => {
                const isForwarded = inv.status === "forwarded" || !!inv.forwarded_to_accounting_at;
                const totalIncl = inv.amount_incl_vat ?? inv.amount_excl_vat + inv.vat_amount;
                return (
                  <div
                    key={inv.id}
                    className="flex flex-wrap items-center justify-between gap-2 text-sm bg-muted/30 rounded-md px-3 py-2"
                  >
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{inv.invoice_number}</span>
                      <span className="text-muted-foreground">
                        · {formatCurrency(totalIncl)}
                      </span>
                      {isForwarded && (
                        <Badge variant="secondary" className="gap-1">
                          <CheckCircle2 className="h-3 w-3" />
                          Doorgestuurd
                        </Badge>
                      )}
                    </div>
                    {!isForwarded && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-2"
                        onClick={() =>
                          navigate(
                            `/admin/projecten/${request.id}/factuur?action=forward&invoiceId=${inv.id}`
                          )
                        }
                      >
                        <Mail className="h-3.5 w-3.5" />
                        Doorsturen naar boekhouding
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Actions */}
          <div className="mt-4 pt-4 border-t flex flex-wrap items-center gap-2">
            {request.completion_status !== "fully_invoiced" && (
              <Button
                onClick={() => handleOpenInvoiceDialog(request)}
                className="gap-2"
              >
                <FileText className="h-4 w-4" />
                {totals.invoicedTotal > 0 ? "Restant factureren" : "Factuur registreren"}
              </Button>
            )}
            <Button variant="outline" asChild>
              <Link to={`/admin/aanvragen/${request.id}`} className="gap-2">
                <ExternalLink className="h-4 w-4" />
                Bekijk aanvraag
              </Link>
            </Button>
            <div className="ml-auto">
              <CompletionActions
                entityType="program"
                entityId={request.id}
                completionStatus={request.completion_status}
                outstanding={totals.outstanding}
                invalidateKeys={[["admin-invoicing-requests"]]}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  type LodgingItem = (typeof standaloneLodging)[number];

  const LodgingCard = ({ item }: { item: LodgingItem }) => {
    const customerLabel = item.customer_company || item.customer_name;
    return (
      <Card className="hover:shadow-md transition-shadow">
        <CardContent className="p-5">
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-slate-100 rounded-lg">
                  <Hotel className="h-5 w-5 text-slate-600" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-semibold text-slate-900 truncate">{customerLabel}</h3>
                  <p className="text-sm text-muted-foreground">
                    {item.selected_quote?.accommodation_name || "Geen geselecteerde offerte"}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-4 mt-3 text-sm text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <Calendar className="h-4 w-4" />
                  {format(new Date(item.arrival_date), "d MMM", { locale: nl })} – {format(new Date(item.departure_date), "d MMM yyyy", { locale: nl })}
                </span>
                <span className="flex items-center gap-1.5">
                  <Users className="h-4 w-4" />
                  {item.number_of_guests} gasten
                </span>
              </div>
            </div>
            <div className="lg:text-right space-y-1">
              <div className="text-xl font-bold text-slate-900">{formatCurrency(item.total)}</div>
              {item.invoiced > 0 && (
                <p className="text-sm">
                  <span className="text-muted-foreground">Gefactureerd: </span>
                  <span className="font-medium text-green-600">{formatCurrency(item.invoiced)}</span>
                </p>
              )}
              {item.outstanding > 0 && (
                <p className="text-sm">
                  <span className="text-muted-foreground">Openstaand: </span>
                  <span className="font-medium text-amber-600">{formatCurrency(item.outstanding)}</span>
                </p>
              )}
            </div>
          </div>
          <div className="mt-4 pt-4 border-t flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link to={`/admin/logies-aanvragen/${item.id}`} className="gap-2">
                <ExternalLink className="h-4 w-4" />
                Bekijk
              </Link>
            </Button>
            <div className="ml-auto">
              <CompletionActions
                entityType="accommodation"
                entityId={item.id}
                completionStatus={item.completion_status}
                completedAt={item.completed_at}
                outstanding={item.outstanding}
                invalidateKeys={[["admin-invoicing-standalone-lodging"]]}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  const LodgingSection = ({
    title,
    items,
    empty,
  }: {
    title: string;
    items: LodgingItem[];
    empty: string;
  }) => (
    <div>
      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">
        {title} {items.length > 0 && <span className="text-foreground">({items.length})</span>}
      </h3>
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4">{empty}</p>
      ) : (
        <div className="space-y-3">
          {items.map((item) => <LodgingCard key={item.id} item={item} />)}
        </div>
      )}
    </div>
  );

  // Summary stats
  const totalReadyAmount = readyRequests.reduce((sum, r) => {
    const totals = calculateInvoiceTotals(r);
    return sum + totals.outstanding;
  }, 0);

  const totalPartialAmount = partialRequests.reduce((sum, r) => {
    const totals = calculateInvoiceTotals(r);
    return sum + totals.outstanding;
  }, 0);

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Facturatie Overzicht</h1>
          <p className="text-slate-600">
            Beheer en registreer facturen voor Bureau Vlieland activiteiten
          </p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-amber-100 rounded-lg">
                  <Clock className="h-6 w-6 text-amber-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Klaar voor facturatie</p>
                  <p className="text-2xl font-bold">{readyRequests.length}</p>
                  <p className="text-sm text-amber-600 font-medium">
                    {formatCurrency(totalReadyAmount)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-100 rounded-lg">
                  <AlertCircle className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Gedeeltelijk gefactureerd</p>
                  <p className="text-2xl font-bold">{partialRequests.length}</p>
                  <p className="text-sm text-blue-600 font-medium">
                    {formatCurrency(totalPartialAmount)} openstaand
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-green-100 rounded-lg">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Volledig gefactureerd</p>
                  <p className="text-2xl font-bold">{completedRequests.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs with requests */}
        <Card>
          <CardHeader className="pb-0">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList>
                <TabsTrigger value="ready" className="gap-2">
                  <Clock className="h-4 w-4" />
                  Klaar voor facturatie
                  {readyRequests.length > 0 && (
                    <Badge variant="secondary" className="ml-1">
                      {readyRequests.length}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="partial" className="gap-2">
                  <AlertCircle className="h-4 w-4" />
                  Gedeeltelijk
                  {partialRequests.length > 0 && (
                    <Badge variant="secondary" className="ml-1">
                      {partialRequests.length}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="lodging" className="gap-2">
                  <Hotel className="h-4 w-4" />
                  Losse logies
                  {standaloneLodging.length > 0 && (
                    <Badge variant="secondary" className="ml-1">
                      {standaloneLodging.length}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="completed" className="gap-2">
                  <CheckCircle className="h-4 w-4" />
                  Afgerond
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </CardHeader>

          <CardContent className="pt-6">
            {isLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-48 w-full" />
                <Skeleton className="h-48 w-full" />
              </div>
            ) : (
              <>
                {activeTab === "ready" && (
                  <div className="space-y-4">
                    {readyRequests.length === 0 ? (
                      <div className="text-center py-12 text-muted-foreground">
                        <Euro className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>Geen aanvragen klaar voor facturatie</p>
                      </div>
                    ) : (
                      readyRequests.map((request) => (
                        <RequestCard key={request.id} request={request} />
                      ))
                    )}
                  </div>
                )}

                {activeTab === "partial" && (
                  <div className="space-y-4">
                    {partialRequests.length === 0 ? (
                      <div className="text-center py-12 text-muted-foreground">
                        <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>Geen gedeeltelijk gefactureerde aanvragen</p>
                      </div>
                    ) : (
                      partialRequests.map((request) => (
                        <RequestCard key={request.id} request={request} />
                      ))
                    )}
                  </div>
                )}

                {activeTab === "lodging" && (
                  <div className="space-y-6">
                    {isLoadingLodging ? (
                      <Skeleton className="h-48 w-full" />
                    ) : standaloneLodging.length === 0 ? (
                      <div className="text-center py-12 text-muted-foreground">
                        <Hotel className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>Geen losse logies-aanvragen</p>
                      </div>
                    ) : (
                      <>
                        <LodgingSection
                          title="Klaar voor facturatie"
                          items={lodgingReady}
                          empty="Geen logies-aanvragen klaar voor facturatie"
                        />
                        <LodgingSection
                          title="Gedeeltelijk gefactureerd"
                          items={lodgingPartial}
                          empty="Geen gedeeltelijk gefactureerde logies"
                        />
                        <LodgingSection
                          title="Afgerond"
                          items={lodgingCompleted}
                          empty="Nog geen afgeronde logies-aanvragen"
                        />
                      </>
                    )}
                  </div>
                )}

                {activeTab === "completed" && (
                  <div className="space-y-4">
                    {completedRequests.length === 0 ? (
                      <div className="text-center py-12 text-muted-foreground">
                        <CheckCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>Nog geen volledig gefactureerde aanvragen</p>
                      </div>
                    ) : (
                      completedRequests.map((request) => (
                        <RequestCard key={request.id} request={request} />
                      ))
                    )}
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Invoice Dialog */}
      {selectedRequest && (
        <RegisterBureauInvoiceDialog
          isOpen={isInvoiceDialogOpen}
          onClose={() => setIsInvoiceDialogOpen(false)}
          requestId={selectedRequest.id}
          suggestedAmount={calculateInvoiceTotals(selectedRequest).outstanding}
          onSuccess={handleInvoiceSuccess}
        />
      )}

export default AdminInvoicing;
