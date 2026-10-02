import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertCircle, CheckCircle, Clock, Hotel, Mail, Search } from "lucide-react";
import { EmptyState } from "@/components/system";
import { RegisterBureauInvoiceDialog } from "@/components/admin/RegisterBureauInvoiceDialog";
import { InvoicingRequestCard } from "@/components/admin/invoicing/InvoicingRequestCard";
import { InvoicingInvoiceRow } from "@/components/admin/invoicing/InvoicingInvoiceRow";
import { InvoicingLodgingCard } from "@/components/admin/invoicing/InvoicingLodgingCard";
import { formatCurrency } from "@/components/admin/invoicing/formatCurrency";
import type {
  AccommodationExtraForInvoicing,
  InvoiceTotals,
  InvoicingRow,
  ProgramRequestWithItems,
} from "@/components/admin/invoicing/types";
import { useAppSettings } from "@/hooks/useAppSettings";
import { useItemBillingLinesBatch } from "@/hooks/useItemBillingLines";
import { useItemVatRates } from "@/hooks/useItemVatRates";
import { calculateAdminInvoicingTotals } from "@/lib/adminInvoicingTotals";
import {
  countUnforwardedInvoices,
  matchesSearch,
  sortRequests,
  type InvoicingSort,
} from "@/lib/adminInvoicingView";
import { usePricingStructures } from "@/hooks/usePricing";
import { resolveFeeStructure } from "@/lib/feeEngine";
import { calculateExclVat, calculateVatAmount } from "@/lib/appSettings";
import { getItemLineTotal as centralLineTotal } from "@/lib/portalPricing";

interface InvoiceVatSuggestion {
  totalExclVat: number;
  totalVat: number;
  grandTotalInclVat: number;
  vatGroups: { rate: number; exclVat: number; vatAmount: number }[];
}

type InvoicingTab = "ready" | "partial" | "forward" | "lodging" | "completed";

const COMPLETED_PAGE_SIZE = 20;

const AdminInvoicing = () => {
  const queryClient = useQueryClient();
  const { getCoordinationFee, getVatRate, settings } = useAppSettings();
  const { activeStructure } = usePricingStructures();
  const [activeTab, setActiveTab] = useState<InvoicingTab>("ready");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<InvoicingSort>("event_oldest");
  const [completedLimit, setCompletedLimit] = useState(COMPLETED_PAGE_SIZE);
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);

  const getAccommodationExtraTotal = (extra: AccommodationExtraForInvoicing) => {
    if (extra.pricing_type === "fixed") return Number(extra.unit_price ?? 0);
    return Number(extra.unit_price ?? 0) * Number(extra.quantity ?? 0);
  };

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ["admin-invoicing-requests"],
    queryFn: async () => {
      // Get requests with completion_status.
      // Include projects where the AV is accepted OR where the admin has
      // manually advanced the completion status (e.g. "klaar voor facturatie"
      // without portal acceptance).
      const { data: requestsData, error: requestsError } = await supabase
        .from("program_requests")
        .select("*")
        .eq("status", "active")
        .or(
          "terms_accepted_at.not.is.null,completion_status.in.(ready_for_invoice,partially_invoiced,fully_invoiced)",
        )
        .order("terms_accepted_at", { ascending: false, nullsFirst: true });

      if (requestsError) throw requestsError;

      // Also include active requests that already have a bureau invoice,
      // even when terms_accepted_at is still null (e.g. legacy/manual flow).
      const { data: invoicedRequestIds, error: invoicedErr } = await supabase
        .from("bureau_invoices")
        .select("request_id");
      if (invoicedErr) throw invoicedErr;

      const knownIds = new Set(requestsData.map((r) => r.id));
      const extraIds = Array.from(
        new Set(
          (invoicedRequestIds ?? [])
            .map((r) => r.request_id)
            .filter((id): id is string => !!id && !knownIds.has(id)),
        ),
      );

      if (extraIds.length > 0) {
        const { data: extraRequests, error: extraErr } = await supabase
          .from("program_requests")
          .select("*")
          .eq("status", "active")
          .in("id", extraIds);
        if (extraErr) throw extraErr;
        if (extraRequests) requestsData.push(...extraRequests);
      }


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
        .select("id, request_id, block_id, day_index, block_name, block_type, provider_name, status, quoted_price, admin_price_override, price_type, override_people, use_actual_costs")
        .in("request_id", requestIds);

      if (itemsError) throw itemsError;

      // Get invoices for these requests
      const { data: invoicesData, error: invoicesError } = await supabase
        .from("bureau_invoices")
        .select("id, request_id, invoice_number, invoice_date, amount_excl_vat, vat_amount, vat_breakdown, amount_incl_vat, invoice_type, description, status, forwarded_to_accounting_at, pdf_path")
        .in("request_id", requestIds);

      if (invoicesError) throw invoicesError;

      const accommodationByRequestId = new Map<string, {
        id: string;
        price_total: number | null;
        vat_rate: number | null;
      }>();
      const accommodationExtrasByQuoteId = new Map<string, AccommodationExtraForInvoicing[]>();

      if (linkedAccommodationIds.length > 0) {
        const { data: accommodationQuotes, error: accommodationError } = await supabase
          .from("accommodation_quotes")
          .select("id, request_id, price_total, vat_rate")
          .eq("status", "selected")
          .in("request_id", linkedAccommodationIds);

        if (accommodationError) throw accommodationError;

        accommodationQuotes?.forEach((quote) => {
          accommodationByRequestId.set(quote.request_id, quote);
        });

        const quoteIds = (accommodationQuotes ?? []).map((quote) => quote.id);
        if (quoteIds.length > 0) {
          const { data: accommodationExtras, error: extrasError } = await supabase
            .from("accommodation_quote_extras")
            .select("id, quote_id, quantity, unit_price, pricing_type, vat_rate")
            .in("quote_id", quoteIds);
          if (extrasError) throw extrasError;
          accommodationExtras?.forEach((extra) => {
            const existing = accommodationExtrasByQuoteId.get(extra.quote_id) ?? [];
            existing.push(extra as AccommodationExtraForInvoicing);
            accommodationExtrasByQuoteId.set(extra.quote_id, existing);
          });
        }
      }

      // Combine data
      return requestsData.map((request) => ({
        ...request,
        selected_dates: request.selected_dates as string[],
        selected_accommodation_base_total: request.linked_accommodation_id
          ? accommodationByRequestId.get(request.linked_accommodation_id)?.price_total ?? null
          : null,
        selected_accommodation_vat_rate: request.linked_accommodation_id
          ? accommodationByRequestId.get(request.linked_accommodation_id)?.vat_rate ?? null
          : null,
        selected_accommodation_extras: request.linked_accommodation_id
          ? accommodationExtrasByQuoteId.get(accommodationByRequestId.get(request.linked_accommodation_id)?.id ?? "") ?? []
          : [],
        selected_accommodation_total: request.linked_accommodation_id
          ? Number(accommodationByRequestId.get(request.linked_accommodation_id)?.price_total ?? 0) +
            (accommodationExtrasByQuoteId.get(accommodationByRequestId.get(request.linked_accommodation_id)?.id ?? "") ?? [])
              .reduce((sum, extra) => sum + getAccommodationExtraTotal(extra), 0)
          : null,
        items: itemsData.filter((item) => item.request_id === request.id),
        invoices: invoicesData.filter((inv) => inv.request_id === request.id),
      })) as unknown as ProgramRequestWithItems[];
    },
  });

  const allItemIds = useMemo(
    () => requests.flatMap((request) => request.items.map((item) => item.id)),
    [requests],
  );
  const { linesByItem } = useItemBillingLinesBatch(allItemIds);
  const allItems = useMemo(() => requests.flatMap((request) => request.items), [requests]);
  const { getItemVatRate } = useItemVatRates(allItems);

  // Totalen één keer per project (niet per kaart en niet per render).
  const rows = useMemo<InvoicingRow[]>(
    () =>
      requests.map((request) => ({
        request,
        totals: {
          ...calculateAdminInvoicingTotals(
            request,
            {
              coordinationFee: getCoordinationFee(request.number_of_people),
              feeStructure: resolveFeeStructure((request as any).fee_snapshot, activeStructure),
              requestDate: (request as any).created_at ?? null,
              touristTaxPerPersonPerDay: settings.tourist_tax_pp_per_day,
              natureContributionPerPerson: settings.nature_contribution_pp,
              bureauCentralSurchargePerPerson: settings.bureau_central_surcharge_pp,
            },
            linesByItem,
          ),
        },
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [requests, linesByItem, activeStructure, settings],
  );

  const calculateInvoiceVatSuggestion = (request: ProgramRequestWithItems, totals: InvoiceTotals): InvoiceVatSuggestion => {
    const numberOfDays = Math.max(request.selected_dates?.length ?? 0, 1);
    const vatGroups: Record<number, { exclVat: number; vatAmount: number }> = {};
    const addToGroup = (rate: number, amountInclVat: number, exclVat?: number, vatAmount?: number) => {
      if (amountInclVat <= 0 && !exclVat && !vatAmount) return;
      const key = Number(rate) || 0;
      if (!vatGroups[key]) vatGroups[key] = { exclVat: 0, vatAmount: 0 };
      vatGroups[key].exclVat += exclVat ?? calculateExclVat(amountInclVat, key);
      vatGroups[key].vatAmount += vatAmount ?? calculateVatAmount(amountInclVat, key);
    };
    const addItem = (item: ProgramRequestWithItems["items"][number]) => {
      const itemLines = linesByItem[item.id] ?? [];
      if (item.use_actual_costs && itemLines.length > 0) {
        itemLines.forEach((line) => {
          addToGroup(Number(line.vat_rate), Number(line.amount_incl_vat || 0), Number(line.amount_excl_vat || 0), Number(line.vat_amount || 0));
        });
        return;
      }
      const amountInclVat = centralLineTotal(item as never, request.number_of_people, numberOfDays) ?? 0;
      addToGroup(getItemVatRate(item), amountInclVat);
    };

    request.items
      .filter((item) => item.status !== "cancelled" && item.day_index !== -1)
      .forEach(addItem);
    request.items
      .filter((item) => item.status !== "cancelled" && item.day_index === -1)
      .forEach(addItem);

    const isExcluded = (key: string) =>
      Array.isArray(request.excluded_fees) && request.excluded_fees.includes(key);
    const standardVatRate = getVatRate("standard");
    if (!isExcluded("coordination_fee")) addToGroup(standardVatRate, getCoordinationFee(request.number_of_people));
    if (!isExcluded("central_surcharge")) addToGroup(standardVatRate, request.invoicing_mode === "bureau_central" ? settings.bureau_central_surcharge_pp * request.number_of_people : 0);
    const touristTaxTotal = isExcluded("tourist_tax") ? 0 : settings.tourist_tax_pp_per_day * request.number_of_people * numberOfDays;
    const natureTotal = isExcluded("nature_contribution") ? 0 : settings.nature_contribution_pp * request.number_of_people;
    addToGroup(0, touristTaxTotal + natureTotal);
    addToGroup(getVatRate("accommodation"), Number(request.selected_accommodation_base_total ?? 0));
    (request.selected_accommodation_extras ?? []).forEach((extra) => {
      addToGroup(Number(extra.vat_rate ?? getVatRate("accommodation")), getAccommodationExtraTotal(extra));
    });

    const vatGroupsList = Object.entries(vatGroups)
      .map(([rate, value]) => ({ rate: Number(rate), exclVat: value.exclVat, vatAmount: value.vatAmount }))
      .sort((a, b) => a.rate - b.rate);
    return {
      totalExclVat: vatGroupsList.reduce((sum, group) => sum + group.exclVat, 0),
      totalVat: vatGroupsList.reduce((sum, group) => sum + group.vatAmount, 0),
      grandTotalInclVat: totals.grandTotalInclVat,
      vatGroups: vatGroupsList,
    };
  };

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

  const isLodgingReady = (l: (typeof standaloneLodging)[number]) =>
    !l.completion_status || l.completion_status === "ready_for_invoice" || l.completion_status === "in_progress";
  const lodgingOpen = standaloneLodging.filter(
    (l) => isLodgingReady(l) || l.completion_status === "partially_invoiced",
  );
  const lodgingCompleted = standaloneLodging.filter((l) => l.completion_status === "fully_invoiced");

  const readyRows = rows.filter(
    ({ request: r }) =>
      r.completion_status === "ready_for_invoice" || (!r.completion_status && r.invoices.length === 0),
  );
  const partialRows = rows.filter(({ request: r }) => r.completion_status === "partially_invoiced");
  const completedRows = rows.filter(({ request: r }) => r.completion_status === "fully_invoiced");
  const forwardRows = rows.filter(({ request }) => countUnforwardedInvoices(request) > 0);
  const unforwardedTotal = forwardRows.reduce((sum, { request }) => sum + countUnforwardedInvoices(request), 0);

  const sumOutstanding = (list: InvoicingRow[]) => list.reduce((sum, { totals }) => sum + totals.outstanding, 0);

  const visibleRows = useMemo(() => {
    const source =
      activeTab === "ready" ? readyRows
      : activeTab === "partial" ? partialRows
      : activeTab === "forward" ? forwardRows
      : activeTab === "completed" ? completedRows
      : [];
    const filtered = source.filter(({ request }) => matchesSearch(request, search));
    const sortable = filtered.map((row) => ({
      ...row.request,
      outstanding: row.totals.outstanding,
      row,
    }));
    let sorted = sortRequests(sortable, sort).map((entry) => entry.row);
    // Afgerond: standaard het meest recente evenement bovenaan.
    if (activeTab === "completed" && sort === "event_oldest") sorted = sorted.reverse();
    return sorted;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, rows, search, sort]);

  const visibleLodging = (activeTab === "lodging" ? standaloneLodging : []).filter((l) =>
    matchesSearch(
      {
        reference_number: l.reference_number,
        customer_name: l.customer_name,
        customer_company: l.customer_company,
        customer_email: l.customer_email,
        selected_dates: [],
        invoices: [],
      },
      search,
    ),
  );

  const selectedRow = rows.find((row) => row.request.id === selectedRowId) ?? null;
  const selectedVat = useMemo(
    () => (selectedRow ? calculateInvoiceVatSuggestion(selectedRow.request, selectedRow.totals) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selectedRow, linesByItem, settings],
  );

  const handleInvoiceSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ["admin-invoicing-requests"] });
    queryClient.invalidateQueries({ queryKey: ["invoicing-ready-count"] });
    setSelectedRowId(null);
  };

  const tiles: {
    key: InvoicingTab;
    label: string;
    icon: typeof Clock;
    count: number;
    detail?: string;
  }[] = [
    { key: "ready", label: "Klaar voor facturatie", icon: Clock, count: readyRows.length, detail: formatCurrency(sumOutstanding(readyRows)) },
    { key: "partial", label: "Gedeeltelijk gefactureerd", icon: AlertCircle, count: partialRows.length, detail: `${formatCurrency(sumOutstanding(partialRows))} openstaand` },
    { key: "forward", label: "Door te sturen", icon: Mail, count: unforwardedTotal, detail: unforwardedTotal === 1 ? "factuur naar boekhouding" : "facturen naar boekhouding" },
    { key: "lodging", label: "Losse logies", icon: Hotel, count: lodgingOpen.length, detail: "nog af te handelen" },
    { key: "completed", label: "Afgerond", icon: CheckCircle, count: completedRows.length + lodgingCompleted.length },
  ];

  const emptyByTab: Record<InvoicingTab, { title: string; description?: string }> = {
    ready: { title: "Niets klaar voor facturatie", description: "Projecten verschijnen hier zodra ze klaar zijn voor facturatie." },
    partial: { title: "Geen gedeeltelijk gefactureerde projecten" },
    forward: { title: "Alles is doorgestuurd", description: "Alle geregistreerde facturen staan bij de boekhouding." },
    lodging: { title: "Geen losse logies-aanvragen" },
    completed: { title: "Nog niets afgerond" },
  };

  const isFiltering = search.trim().length > 0;
  const listCount = activeTab === "lodging" ? visibleLodging.length : visibleRows.length;
  const shownCompleted = activeTab === "completed" ? visibleRows.slice(0, completedLimit) : visibleRows;

  return (
    <AdminLayout>
      <div className="space-y-6 p-4 sm:p-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Facturatie</h1>
          <p className="text-muted-foreground">
            Registreer facturen, stuur ze door naar de boekhouding en rond projecten af.
          </p>
        </div>

        <div role="tablist" aria-label="Facturatiestatus" className="grid grid-cols-2 gap-3 lg:grid-cols-5">
          {tiles.map((tile) => {
            const active = tile.key === activeTab;
            const Icon = tile.icon;
            return (
              <button
                key={tile.key}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setActiveTab(tile.key)}
                className={`rounded-lg border p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:p-4 ${
                  active ? "border-primary bg-accent-soft" : "bg-card hover:bg-muted"
                }`}
              >
                <span className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Icon className="h-4 w-4" />
                  {tile.label}
                </span>
                <span className="mt-1 block text-2xl font-semibold tabular-nums text-foreground">{tile.count}</span>
                {tile.detail && <span className="block text-xs text-muted-foreground">{tile.detail}</span>}
              </button>
            );
          })}
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setCompletedLimit(COMPLETED_PAGE_SIZE);
              }}
              placeholder="Zoek op klant, bedrijf, referentie of factuurnummer"
              aria-label="Zoeken"
              className="pl-9"
            />
          </div>
          {activeTab !== "lodging" && activeTab !== "forward" && (
            <Select value={sort} onValueChange={(value) => setSort(value as InvoicingSort)}>
              <SelectTrigger className="sm:w-56" aria-label="Sorteren">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="event_oldest">
                  {activeTab === "completed" ? "Evenement: nieuwste eerst" : "Evenement: oudste eerst"}
                </SelectItem>
                <SelectItem value="amount_desc">Openstaand bedrag: hoogste eerst</SelectItem>
                <SelectItem value="customer">Klant: A–Z</SelectItem>
              </SelectContent>
            </Select>
          )}
        </div>

        {isLoading || (activeTab === "lodging" && isLoadingLodging) ? (
          <div className="space-y-3">
            <Skeleton className="h-40 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
        ) : listCount === 0 && !(activeTab === "completed" && lodgingCompleted.length > 0) ? (
          <EmptyState
            icon={<Search />}
            title={isFiltering ? "Niets gevonden" : emptyByTab[activeTab].title}
            description={isFiltering ? "Pas de zoekterm aan of kies een ander tabblad." : emptyByTab[activeTab].description}
            action={isFiltering ? <Button variant="outline" onClick={() => setSearch("")}>Zoekopdracht wissen</Button> : undefined}
          />
        ) : activeTab === "lodging" ? (
          <div className="space-y-3">
            {visibleLodging.map((item) => <InvoicingLodgingCard key={item.id} item={item} />)}
          </div>
        ) : activeTab === "forward" ? (
          <div className="space-y-3">
            {visibleRows.map(({ request }) => (
              <Card key={request.id}>
                <CardContent className="space-y-2 p-4">
                  <p className="font-semibold text-foreground">
                    {request.customer_company || request.customer_name}
                    {request.reference_number && (
                      <span className="ml-2 text-xs font-normal text-muted-foreground">{request.reference_number}</span>
                    )}
                  </p>
                  {request.invoices
                    .filter((invoice) => countUnforwardedInvoices({ invoices: [invoice] }) > 0)
                    .map((invoice) => (
                      <InvoicingInvoiceRow key={invoice.id} requestId={request.id} invoice={invoice} />
                    ))}
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {shownCompleted.map((row) => (
              <InvoicingRequestCard key={row.request.id} row={row} onRegister={(r) => setSelectedRowId(r.request.id)} />
            ))}
            {activeTab === "completed" && visibleRows.length > completedLimit && (
              <div className="flex justify-center">
                <Button variant="outline" onClick={() => setCompletedLimit((n) => n + COMPLETED_PAGE_SIZE)}>
                  Toon meer ({visibleRows.length - completedLimit} resterend)
                </Button>
              </div>
            )}
            {activeTab === "completed" && lodgingCompleted.length > 0 && !isFiltering && (
              <p className="pt-2 text-sm text-muted-foreground">
                Afgeronde losse logies ({lodgingCompleted.length}) staan op het tabblad Losse logies.
              </p>
            )}
          </div>
        )}
      </div>

      {selectedRow && selectedVat && (
        <RegisterBureauInvoiceDialog
          isOpen
          onClose={() => setSelectedRowId(null)}
          requestId={selectedRow.request.id}
          suggestedAmount={selectedRow.totals.outstanding}
          outstandingAmount={selectedRow.totals.outstanding}
          projectTotal={selectedRow.totals.grandTotalInclVat}
          alreadyInvoiced={selectedRow.totals.grandTotalInclVat - selectedRow.totals.outstanding}
          suggestedExclVat={selectedVat.totalExclVat}
          suggestedVatAmount={selectedVat.totalVat}
          suggestedVatGroups={selectedVat.vatGroups}
          onSuccess={handleInvoiceSuccess}
        />
      )}
    </AdminLayout>
  );
};

export default AdminInvoicing;
