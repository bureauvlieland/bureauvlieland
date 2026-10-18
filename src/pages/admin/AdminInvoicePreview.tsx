import React, { useState, useRef, useEffect, useMemo } from "react";
import { billingCountryLabel } from "@/lib/billingDetails";
import { useParams, useNavigate, Link, useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet";
import { format, addDays, differenceInCalendarDays } from "date-fns";
import { nl } from "date-fns/locale";

import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft,
  Calendar as CalendarIcon,
  Download,
  Loader2,
  FileText,
  Mail,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import ambassadeurLogo from "@/assets/ambassadeur-waddenzee-werelderfgoed.png";
import { toast } from "sonner";
import { useAppSettings } from "@/hooks/useAppSettings";
import { useItemBillingLinesBatch } from "@/hooks/useItemBillingLines";
import { SendBureauInvoiceToCustomerDialog } from "@/components/admin/SendBureauInvoiceToCustomerDialog";
import {
  ForwardBureauInvoiceDialog,
  type BureauInvoiceForForward,
} from "@/components/admin/ForwardBureauInvoiceDialog";
import { buildProjectInvoiceSpec, scaleVatGroups, type ProjectInvoiceSpec } from "@/lib/projectInvoiceSpec";
import { chooseStoredLines, totalsFromStoredLines, type StoredInvoiceLine } from "@/lib/bureauInvoiceLines";
import { specToCategories, storedLinesToCategories, summaryCategory } from "@/lib/invoiceDisplayLines";
import { isFeeExcluded } from "@/lib/excludedFees";
import { usePricingStructures, useRevisionCharges } from "@/hooks/usePricing";
import { resolveFeeStructure } from "@/lib/feeEngine";
import { renderInvoicePdf, type InvoiceCategory } from "@/lib/invoicePdfRenderer";
import { invoiceTypeLabels, type InvoiceType } from "@/types/bureauInvoice";
import { resolveBureauInvoiceType, shouldShowFullSpecification } from "@/lib/bureauInvoiceType";
import { reportError } from "@/lib/errorReporting";

interface ProgramRequest {
  id: string;
  reference_number: string | null;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  customer_company: string | null;
  number_of_people: number;
  selected_dates: string[];
  linked_accommodation_id: string | null;
  excluded_fees?: string[] | null;
  invoicing_mode: string | null;
  billing_company_name: string | null;
  billing_contact_name: string | null;
  billing_contact_email: string | null;
  billing_address_street: string | null;
  billing_address_postal: string | null;
  billing_address_city: string | null;
  billing_country: string | null;
  billing_vat_number: string | null;
  billing_reference: string | null;
}

interface ProgramItem {
  id: string;
  block_id: string | null;
  block_name: string;
  block_category: string;
  block_type: string;
  provider_name: string;
  day_index: number;
  preferred_time: string | null;
  admin_price_override: number | null;
  admin_price_notes: string | null;
  quoted_price: number | null;
  price_type: string | null;
  override_people: number | null;
  status: string;
  booking_reference?: string | null;
  /** Eigen tarief van een post zonder bouwsteen (overige kosten). */
  vat_rate?: number | null;
}

interface LoadedBureauInvoice {
  id: string;
  invoice_number: string;
  invoice_date: string;
  amount_excl_vat: number;
  vat_amount: number;
  amount_incl_vat: number;
  invoice_type: InvoiceType | string;
  description: string | null;
}

const round2 = (value: number) => Math.round(value * 100) / 100;

const buildScaledVatTotals = (
  vatLines: { rate: number; exclVat: number; vatAmount: number }[],
  targetExclVat: number,
  targetVat: number,
) => {
  const sign = targetExclVat + targetVat < 0 ? -1 : 1;
  const absTargetExcl = Math.abs(targetExclVat);
  const absTargetVat = Math.abs(targetVat);
  const baseExcl = vatLines.reduce((sum, line) => sum + Math.abs(line.exclVat), 0);
  const baseVat = vatLines.reduce((sum, line) => sum + Math.abs(line.vatAmount), 0);

  if (vatLines.length === 0 || baseExcl + baseVat <= 0.005) {
    const fallbackRate = absTargetExcl > 0 ? round2((absTargetVat / absTargetExcl) * 100) : 0;
    return {
      totalExclVat: round2(targetExclVat),
      totalVat: round2(targetVat),
      totalInclVat: round2(targetExclVat + targetVat),
      vatLines: [{ rate: fallbackRate, exclVat: round2(targetExclVat), vatAmount: round2(targetVat) }],
    };
  }

  const exclFactor = absTargetExcl / baseExcl;
  const vatFactor = baseVat > 0 ? absTargetVat / baseVat : 0;
  const scaled = vatLines.map((line) => ({
    rate: line.rate,
    exclVat: round2(Math.abs(line.exclVat) * exclFactor),
    vatAmount: round2(Math.abs(line.vatAmount) * vatFactor),
  }));

  const diffExcl = round2(absTargetExcl - scaled.reduce((sum, line) => sum + line.exclVat, 0));
  const diffVat = round2(absTargetVat - scaled.reduce((sum, line) => sum + line.vatAmount, 0));
  const correctionIndex = Math.max(0, scaled.findIndex((line) => line.rate > 0));
  if (scaled[correctionIndex]) {
    scaled[correctionIndex].exclVat = round2(scaled[correctionIndex].exclVat + diffExcl);
    scaled[correctionIndex].vatAmount = round2(scaled[correctionIndex].vatAmount + diffVat);
  }

  return {
    totalExclVat: round2(targetExclVat),
    totalVat: round2(targetVat),
    totalInclVat: round2(targetExclVat + targetVat),
    vatLines: scaled.map((line) => ({
      rate: line.rate,
      exclVat: round2(line.exclVat * sign),
      vatAmount: round2(line.vatAmount * sign),
    })),
  };
};

interface AccommodationQuoteData {
  id: string;
  accommodation_name: string;
  partner_id: string;
  price_total: number;
  price_per_person_per_night: number | null;
  vat_rate: number;
  price_includes_vat: boolean;
  partner_name: string;
}

interface AccommodationExtraData {
  id?: string;
  name: string;
  description: string | null;
  quantity: number;
  unit_price: number;
  pricing_type: string;
  vat_rate: number;
}

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" }).format(amount);

const AdminInvoicePreview = () => {
  const { id = "" } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const pdfRef = useRef<HTMLDivElement>(null);
  const { getSetting, settings, isLoading: isAppSettingsLoading } = useAppSettings();
  const { activeStructure } = usePricingStructures();


  const [request, setRequest] = useState<ProgramRequest | null>(null);
  const { billableTotal: revisionBillableTotal } = useRevisionCharges(request?.id);

  const [items, setItems] = useState<ProgramItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [vatRateMap, setVatRateMap] = useState<Record<string, number>>({});
  const [sendDialogOpen, setSendDialogOpen] = useState(false);
  const [forwardInvoice, setForwardInvoice] = useState<BureauInvoiceForForward | null>(null);
  const [loadedInvoice, setLoadedInvoice] = useState<LoadedBureauInvoice | null>(null);
  // Bevroren regels van de geopende factuur (bureau_invoice_lines); leeg bij oudere facturen.
  const [loadedInvoiceLines, setLoadedInvoiceLines] = useState<StoredInvoiceLine[]>([]);
  const [priorInvoices, setPriorInvoices] = useState<Array<{ id: string; invoice_number: string; invoice_date: string; amount_incl_vat: number; invoice_type: string }>>([]);

  // Load billing lines per item (definitive lines override quoted_price)
  const { linesByItem } = useItemBillingLinesBatch(items.map((i) => i.id));

  // Accommodation state
  const [loadedAccommodationQuote, setAccommodationQuote] = useState<AccommodationQuoteData | null>(null);
  const [loadedAccommodationExtras, setAccommodationExtras] = useState<AccommodationExtraData[]>([]);
  const [accommodationNights, setAccommodationNights] = useState(0);
  // Factureert de accommodatie rechtstreeks aan de klant ("Uitgesloten van
  // factuur" in het Financieel Overzicht), dan staan kamer en extra's niet op
  // deze factuur.
  const accommodationExcluded = isFeeExcluded(request?.excluded_fees, "accommodation");
  const accommodationQuote = accommodationExcluded ? null : loadedAccommodationQuote;
  const accommodationExtras = useMemo(
    () => (accommodationExcluded ? [] : loadedAccommodationExtras),
    [accommodationExcluded, loadedAccommodationExtras],
  );

  // Form state
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [invoiceDate, setInvoiceDate] = useState<Date>(new Date());
  const [dueDate, setDueDate] = useState<Date>(addDays(new Date(), 30));
  const [notes, setNotes] = useState("");

  // Bureau details from app_settings
  const companyName = getSetting<string>("bureau_company_name", "Bureau Vlieland");
  const legalName = getSetting<string>("bureau_legal_name", "Bureau Vlieland B.V.");
  const kvkNumber = getSetting<string>("bureau_kvk_number", "");
  const vatNumber = getSetting<string>("bureau_vat_number", "");
  const street = getSetting<string>("bureau_street", "");
  const postalCode = getSetting<string>("bureau_postal_code", "");
  const city = getSetting<string>("bureau_city", "");
  const phone = getSetting<string>("bureau_phone", "");
  const websiteSetting = getSetting<string>("bureau_website", "bureauvlieland.nl");
  // Legacy single-line address (still rendered as fallback in HTML preview)
  const address = getSetting<string>("bureau_address", "") ||
    [street, [postalCode, city].filter(Boolean).join(" ")].filter(Boolean).join(", ");
  const iban = getSetting<string>("bureau_iban", "");
  const adminEmail = getSetting<string>("bureau_admin_email", "administratie@bureauvlieland.nl");
  const paymentTermDays = Number(getSetting<number | string>("bureau_payment_term_days", 14)) || 14;

  useEffect(() => {
    if (id) fetchData();
  }, [id]);

  // Auto-open the forward-to-accounting dialog when navigated here with
  // ?action=forward&invoiceId=... (from AdminInvoicing or AdminRequestDetail).
  // We need the invoice's data to populate the dialog; fetch it on demand.
  useEffect(() => {
    const action = searchParams.get("action");
    const invoiceId = searchParams.get("invoiceId");
    if (!invoiceId) {
      setLoadedInvoice(null);
      setLoadedInvoiceLines([]);
      return;
    }
    if (!request) return;
    // Only skip refetch when this same invoice is already loaded for forward flow;
    // for the "open existing invoice" flow we still want to hydrate invoiceNumber/date.
    if (action === "forward" && forwardInvoice?.id === invoiceId) return;

    (async () => {
      const { data, error } = await supabase
        .from("bureau_invoices")
        .select("id, invoice_number, invoice_date, amount_excl_vat, vat_amount, amount_incl_vat, invoice_type, description")
        .eq("id", invoiceId)
        .maybeSingle();
      if (error || !data) {
        toast.error("Factuur niet gevonden");
        return;
      }
      const normalizedInvoice: LoadedBureauInvoice = {
        id: data.id,
        invoice_number: data.invoice_number,
        invoice_date: data.invoice_date,
        amount_excl_vat: Number(data.amount_excl_vat),
        vat_amount: Number(data.vat_amount),
        amount_incl_vat:
          data.amount_incl_vat != null
            ? Number(data.amount_incl_vat)
            : Number(data.amount_excl_vat) + Number(data.vat_amount),
        invoice_type: data.invoice_type,
        description: data.description,
      };
      setLoadedInvoice(normalizedInvoice);
      const { data: lineRows } = await supabase
        .from("bureau_invoice_lines")
        .select("*")
        .eq("invoice_id", invoiceId)
        .order("sort_order", { ascending: true });
      setLoadedInvoiceLines((lineRows ?? []) as unknown as StoredInvoiceLine[]);
      if (action === "forward") {
        setForwardInvoice({
          ...normalizedInvoice,
          customer_label: request.billing_company_name || request.customer_company || request.customer_name,
          reference_number: request.reference_number,
        });
      }
      if (action === "send") {
        setSendDialogOpen(true);
      }
      // Make sure the rendered invoice number matches the one we're viewing/forwarding.
      // This is critical: without it, invoiceNumber stays empty and the current
      // invoice is (incorrectly) counted as "reeds gefactureerd", inflating the total.
      setInvoiceNumber(normalizedInvoice.invoice_number);
      if (normalizedInvoice.invoice_date) setInvoiceDate(new Date(normalizedInvoice.invoice_date));
    })();
  }, [searchParams, request, forwardInvoice?.id]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const { data: requestData, error: requestError } = await supabase
        .from("program_requests")
        .select("*")
        .eq("id", id)
        .maybeSingle();

      if (requestError) throw requestError;
      if (!requestData) {
        toast.error("Project niet gevonden");
        navigate("/admin/projecten");
        return;
      }
      setRequest(requestData as unknown as ProgramRequest);

      const { data: itemsData, error: itemsError } = await supabase
        .from("program_request_items")
        .select("*")
        .eq("request_id", id)
        .neq("status", "cancelled")
        .order("day_index", { ascending: true });

      if (itemsError) throw itemsError;
      const fetchedItems = itemsData as unknown as ProgramItem[];
      setItems(fetchedItems);

      // Fetch VAT rates from building_blocks for all block_ids
      const blockIds = fetchedItems.map(i => i.block_id).filter(Boolean) as string[];
      if (blockIds.length > 0) {
        const { data: blocks } = await supabase
          .from("building_blocks")
          .select("id, vat_rate")
          .in("id", blockIds);
        if (blocks) {
          const map: Record<string, number> = {};
          blocks.forEach(b => { map[b.id] = b.vat_rate ?? 21; });
          setVatRateMap(map);
        }
      }

      // Fetch accommodation data if linked
      const linkedAccId = requestData.linked_accommodation_id;
      if (linkedAccId) {
        // Get accommodation request for dates
        const { data: accRequest } = await supabase
          .from("accommodation_requests")
          .select("arrival_date, departure_date")
          .eq("id", linkedAccId)
          .maybeSingle();

        if (accRequest) {
          const nights = differenceInCalendarDays(
            new Date(accRequest.departure_date),
            new Date(accRequest.arrival_date)
          );
          setAccommodationNights(nights);
        }

        // Get active quote
        const { data: quoteData } = await supabase
          .from("accommodation_quotes")
          .select("id, accommodation_name, partner_id, price_total, price_per_person_per_night, vat_rate, price_includes_vat")
          .eq("request_id", linkedAccId)
          .in("status", ["selected", "submitted"])
          .maybeSingle();

        if (quoteData) {
          // Fetch partner name
          const { data: partnerData } = await supabase
            .from("partners")
            .select("name")
            .eq("id", quoteData.partner_id)
            .maybeSingle();

          setAccommodationQuote({
            ...quoteData,
            vat_rate: quoteData.vat_rate ?? 9,
            price_includes_vat: quoteData.price_includes_vat ?? true,
            partner_name: partnerData?.name || "Onbekend",
          } as AccommodationQuoteData);

          // Fetch extras
          const { data: extrasData } = await supabase
            .from("accommodation_quote_extras")
            .select("id, name, description, quantity, unit_price, pricing_type, vat_rate")
            .eq("quote_id", quoteData.id)
            .order("sort_order", { ascending: true });

          if (extrasData) {
            setAccommodationExtras(
              extrasData.map(e => ({
                ...e,
                vat_rate: e.vat_rate ?? 9,
              })) as AccommodationExtraData[]
            );
          }
        }
      }

      // Fetch already-registered bureau invoices (to deduct on follow-up invoices)
      const { data: priorData } = await supabase
        .from("bureau_invoices")
        .select("id, invoice_number, invoice_date, amount_incl_vat, invoice_type")
        .eq("request_id", id)
        .order("invoice_date", { ascending: true });
      setPriorInvoices((priorData || []) as any);

      // Determine which number to show.
      // CRITICAL: do NOT auto-suggest a "next" number when there are already
      // registered invoices — that caused PDFs to be sent with an unregistered
      // higher number while the existing record was subtracted as "reeds gefactureerd".
      // Default to the LATEST existing invoice; only suggest a new number when
      // explicitly requested via ?new=1 or when no invoices exist yet.
      const ref = requestData.reference_number || "XXXX";
      const explicitInvoiceId = searchParams.get("invoiceId");
      const wantNewTermijn = searchParams.get("new") === "1";
      const hasPrior = (priorData?.length ?? 0) > 0;

      if (!explicitInvoiceId && hasPrior && !wantNewTermijn) {
        const latest = priorData![priorData!.length - 1];
        setInvoiceNumber(latest.invoice_number);
        if (latest.invoice_date) setInvoiceDate(new Date(latest.invoice_date));
      } else if (!explicitInvoiceId) {
        const nextSeq = String(((priorData || []).length || 0) + 1).padStart(3, "0");
        setInvoiceNumber(`FV-${ref}-${nextSeq}`);
      }
      // If explicitInvoiceId is set, the dedicated effect above will set the number.
    } catch (error) {
      reportError(error, { where: "AdminInvoicePreview: Error fetching data" });
      toast.error("Fout bij laden gegevens");
      navigate("/admin/projecten");
    } finally {
      setIsLoading(false);
    }
  };

  // De ene berekening van het project (projectInvoiceSpec): regels, btw-groepen, totaal.
  const spec = useMemo<ProjectInvoiceSpec | null>(() => {
    if (!request) return null;
    return buildProjectInvoiceSpec({
      request: {
        number_of_people: request.number_of_people,
        selected_dates: request.selected_dates,
        invoicing_mode: request.invoicing_mode,
        excluded_fees: request.excluded_fees,
        created_at: (request as unknown as { created_at?: string | null }).created_at ?? null,
        reference_number: request.reference_number,
      },
      items,
      linesByItem,
      blockVatRates: vatRateMap,
      accommodation: accommodationQuote
        ? {
            id: accommodationQuote.id,
            accommodation_name: accommodationQuote.accommodation_name,
            partner_name: accommodationQuote.partner_name,
            price_total: Number(accommodationQuote.price_total) || 0,
            vat_rate: accommodationQuote.vat_rate,
            nights: accommodationNights,
            extras: accommodationExtras,
          }
        : null,
      settings,
      feeStructure: resolveFeeStructure((request as unknown as { fee_snapshot?: unknown }).fee_snapshot, activeStructure),
      revisionFeesTotal: revisionBillableTotal,
      bundleExtras: true,
    });
  }, [request, items, linesByItem, vatRateMap, accommodationQuote, accommodationNights, accommodationExtras, settings, activeStructure, revisionBillableTotal]);

  const calculateTotals = () => ({
    coordinationFee: spec?.totals.coordinationFee ?? 0,
    touristTax: spec?.totals.touristTax ?? 0,
    natureContribution: spec?.totals.natureContribution ?? 0,
    centralSurcharge: spec?.totals.centralSurcharge ?? 0,
    isBureauCentral: spec?.isBureauCentral ?? false,
    numberOfPeople: spec?.numberOfPeople ?? 0,
    numberOfDays: spec?.numberOfDays ?? 1,
    totalExclVat: spec?.totals.exclVat ?? 0,
    totalVat: spec?.totals.vat ?? 0,
    totalInclVat: spec?.totals.inclVat ?? 0,
    vatLines: (spec?.vatGroups ?? []).map((g) => ({ rate: g.rate, exclVat: g.exclVat, vatAmount: g.vatAmount })),
  });

  if (isLoading || isAppSettingsLoading) {
    return (
      <AdminLayout>
        <div className="p-6 space-y-6">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-[600px]" />
        </div>
      </AdminLayout>
    );
  }

  if (!request) return null;

  const totals = calculateTotals();
  const viewedInvoiceId = searchParams.get("invoiceId");
  const isExistingInvoiceView = Boolean(
    viewedInvoiceId && loadedInvoice && loadedInvoice.invoice_number === invoiceNumber,
  );
  const priorSumExcludingCurrent = priorInvoices
    .filter((p) => p.invoice_number !== invoiceNumber)
    .reduce(
      (s, p) =>
        s +
        (p.invoice_type === "credit"
          ? -Number(p.amount_incl_vat)
          : Number(p.amount_incl_vat)),
      0,
    );
  const displayLoadedInvoiceType = loadedInvoice
    ? resolveBureauInvoiceType({
        storedType: loadedInvoice.invoice_type,
        invoiceAmountInclVat: Number(loadedInvoice.amount_incl_vat),
        projectTotalInclVat: totals.totalInclVat,
        outstandingAmountInclVat: Math.max(0, totals.totalInclVat - priorSumExcludingCurrent),
        alreadyInvoicedInclVat: priorSumExcludingCurrent,
      })
    : null;
  const billingName = request.billing_company_name || request.customer_company || request.customer_name;
  const billingAddress = [
    request.billing_address_street,
    [request.billing_address_postal, request.billing_address_city].filter(Boolean).join(" "),
    request.billing_country && request.billing_country !== "NL" ? billingCountryLabel(request.billing_country) : null,
  ].filter(Boolean);

  const totalItemCount = spec ? spec.lines.filter((l) => l.kind !== "fee" && l.kind !== "revision").length : 0;

  // ── Slot mode (restantfactuur voor het openstaande bedrag) ───────────────
  // Toon één regel "Slotfactuur project ..." met pro-rata BTW-uitsplitsing,
  // i.p.v. het hele programma met "reeds gefactureerd" eronder.
  const modeParam = (searchParams.get("mode") || "full").toLowerCase();
  const hasPriorOtherThanCurrent = priorInvoices.some(
    (p) => p.invoice_number !== invoiceNumber,
  );
  const netDueIncl = Math.max(0, totals.totalInclVat - priorSumExcludingCurrent);
  // Slot-mode: bij een NIEUWE termijn na eerdere facturen registreren en
  // versturen we uitsluitend het restant (netDueIncl) — niet nogmaals het
  // volledige projecttotaal. De PDF-layout blijft ongewijzigd en toont de
  // volledige specificatie met "Reeds gefactureerd" eronder; alleen de
  // effectieve bedragen die naar bureau_invoices/SendDialog gaan schalen mee.
  const hasPriorInvoices = priorSumExcludingCurrent > 0.005 || hasPriorOtherThanCurrent;
  // Slot mode wordt automatisch afgeleid uit bestaande facturen: zodra er
  // eerdere (niet-gecrediteerde) facturen bestaan én er nog een restant
  // openstaat, factureren we standaard alleen het restant. De admin kan
  // expliciet naar "volledig" schakelen via ?mode=full.
  const canOfferSlotMode = hasPriorInvoices && netDueIncl > 0.005;
  const isSlotMode = canOfferSlotMode && modeParam !== "full";

  const setMode = (next: "slot" | "full") => {
    const params = new URLSearchParams(searchParams);
    if (next === "slot") {
      params.set("mode", "slot");
      params.set("new", "1");
    } else {
      params.delete("mode");
    }
    setSearchParams(params, { replace: true });
  };

  // Bij eerdere termijnen registreren en versturen we alleen het restant
  // (netDueIncl), met de btw pro rata over de groepen van de specificatie.
  const dueTotals = (() => {
    if (isExistingInvoiceView || !spec || !hasPriorInvoices) return null;
    if (netDueIncl >= totals.totalInclVat - 0.005) return null;
    const groups = scaleVatGroups(spec.vatGroups, netDueIncl);
    return {
      totalExclVat: round2(groups.reduce((s, g) => s + g.exclVat, 0)),
      totalVat: round2(groups.reduce((s, g) => s + g.vatAmount, 0)),
      totalInclVat: round2(netDueIncl),
      vatLines: groups.map((g) => ({ rate: g.rate, exclVat: g.exclVat, vatAmount: g.vatAmount })),
    };
  })();

  const isCreditView = isExistingInvoiceView && displayLoadedInvoiceType === "credit";
  const creditSign = isCreditView ? -1 : 1;

  // Een geregistreerde factuur: btw-groepen uit haar bevroren regels als die
  // er zijn en op de kop sluiten, anders pro rata uit de specificatie.
  const existingInvoiceTotals = (() => {
    if (!loadedInvoice) return null;
    if (loadedInvoiceLines.length > 0) {
      const fromLines = totalsFromStoredLines(loadedInvoiceLines);
      if (
        Math.abs(fromLines.exclVat - Number(loadedInvoice.amount_excl_vat)) <= 0.05 &&
        Math.abs(fromLines.vat - Number(loadedInvoice.vat_amount)) <= 0.05
      ) {
        return {
          totalExclVat: round2(Number(loadedInvoice.amount_excl_vat)),
          totalVat: round2(Number(loadedInvoice.vat_amount)),
          totalInclVat: round2(Number(loadedInvoice.amount_excl_vat) + Number(loadedInvoice.vat_amount)),
          vatLines: fromLines.vatGroups.map((g) => ({ rate: g.rate, exclVat: g.exclVat, vatAmount: g.vatAmount })),
        };
      }
    }
    return buildScaledVatTotals(totals.vatLines, Number(loadedInvoice.amount_excl_vat), Number(loadedInvoice.vat_amount));
  })();

  const signedExistingTotals = existingInvoiceTotals && isCreditView
    ? {
        totalExclVat: -existingInvoiceTotals.totalExclVat,
        totalVat: -existingInvoiceTotals.totalVat,
        totalInclVat: -existingInvoiceTotals.totalInclVat,
        vatLines: existingInvoiceTotals.vatLines.map((l) => ({
          ...l,
          exclVat: -l.exclVat,
          vatAmount: -l.vatAmount,
        })),
      }
    : existingInvoiceTotals;

  // Wat deze factuur registreert en verstuurt (restant bij eerdere termijnen).
  const registerTotals = isExistingInvoiceView && signedExistingTotals ? signedExistingTotals : dueTotals ?? totals;
  const effectiveTotalExclVat = registerTotals.totalExclVat;
  const effectiveTotalVat = registerTotals.totalVat;
  const effectiveTotalInclVat = registerTotals.totalInclVat;
  const effectiveVatLines = registerTotals.vatLines;
  // Wat het totalenblok toont: bij "termijn met regels" het hele project met
  // de eerdere termijnen eronder, bij een slotfactuur alleen het restant.
  const displayTotals = isExistingInvoiceView && signedExistingTotals ? signedExistingTotals : isSlotMode && dueTotals ? dueTotals : totals;

  const outgoingInvoiceType = isExistingInvoiceView && displayLoadedInvoiceType
    ? displayLoadedInvoiceType
    : resolveBureauInvoiceType({
        invoiceAmountInclVat: effectiveTotalInclVat,
        projectTotalInclVat: totals.totalInclVat,
        outstandingAmountInclVat: netDueIncl,
        alreadyInvoicedInclVat: priorSumExcludingCurrent,
      });

  // Volledige specificatie tonen bij een reeds geregistreerde eindfactuur die
  // het hele project dekt; anders blijft de compacte samenvattingsregel staan.
  const showFullSpecification =
    isExistingInvoiceView && loadedInvoice
      ? shouldShowFullSpecification({
          resolvedType: outgoingInvoiceType,
          alreadyInvoicedInclVat: priorSumExcludingCurrent,
          invoiceAmountInclVat: Number(loadedInvoice.amount_incl_vat),
          projectTotalInclVat: totals.totalInclVat,
        })
      : false;


  const priorRefList = priorInvoices
    .filter((p) => p.invoice_number !== invoiceNumber)
    .map((p) => p.invoice_number)
    .join(", ");
  const slotDescription = `Slotfactuur project ${request.reference_number ?? ""}`.trim();
  const slotSubDescription = priorRefList
    ? `Restant na reeds gefactureerde termijn${priorInvoices.length > 2 ? "en" : ""}: ${priorRefList}`
    : "Restant openstaand bedrag";

  // Regels op scherm en PDF: bevroren regels van een geregistreerde factuur,
  // anders de samenvattende regel (slot, of oude factuur zonder regels),
  // anders de specificatie.
  const loadedTypeLabel = displayLoadedInvoiceType
    ? invoiceTypeLabels[displayLoadedInvoiceType] || String(displayLoadedInvoiceType)
    : "";
  const invoiceCategories: InvoiceCategory[] = (() => {
    if (isExistingInvoiceView && loadedInvoice) {
      if (loadedInvoiceLines.length > 0) return storedLinesToCategories(loadedInvoiceLines, formatCurrency, creditSign);
      if (showFullSpecification && spec) return specToCategories(spec, formatCurrency);
      return [
        summaryCategory(
          {
            label: loadedTypeLabel || loadedInvoice.invoice_type,
            description: `${loadedTypeLabel || loadedInvoice.invoice_type} ${loadedInvoice.invoice_number}`,
            subDescription: loadedInvoice.description || `Project ${request.reference_number ?? request.customer_name}`,
            amountInclVat: creditSign * Number(loadedInvoice.amount_incl_vat),
          },
          formatCurrency,
        ),
      ];
    }
    if (isSlotMode) {
      return [
        summaryCategory(
          { label: "Termijnfactuur", description: slotDescription, subDescription: slotSubDescription, amountInclVat: netDueIncl },
          formatCurrency,
        ),
      ];
    }
    return spec ? specToCategories(spec, formatCurrency) : [];
  })();

  // Regels die bij registreren worden bevroren bij de factuur.
  const linesToStore = isExistingInvoiceView
    ? []
    : chooseStoredLines({
        spec,
        invoiceType: outgoingInvoiceType,
        invoiceNumber,
        amountInclVat: effectiveTotalInclVat,
        alreadyInvoicedInclVat: priorSumExcludingCurrent,
        vatGroups: effectiveVatLines.map((l) => ({ rate: l.rate, exclVat: l.exclVat, vatAmount: l.vatAmount, inclVat: round2(l.exclVat + l.vatAmount) })),
        subDescription: isSlotMode ? slotSubDescription : notes || null,
      });

  /**
   * Build the PDF blob using the native invoice renderer. The HTML preview on
   * screen is for read-only inspection; the PDF is drawn natively for crisp,
   * paginated A4 output. Both come from `invoiceCategories`.
   */
  const buildPdfBlob = async (): Promise<Blob | null> => {
    const billingNameLocal =
      request.billing_company_name || request.customer_company || request.customer_name;
    const contactName = request.billing_contact_name || request.customer_name;
    const postalCity = [
      [request.billing_address_postal, request.billing_address_city].filter(Boolean).join(" "),
      request.billing_country && request.billing_country !== "NL" ? billingCountryLabel(request.billing_country) : null,
    ]
      .filter(Boolean)
      .join(", ");

    const eventDates = request.selected_dates
      .map((d) => format(new Date(d), "d MMM yyyy", { locale: nl }))
      .join(" – ");

    const priorOther = priorInvoices.filter((p) => p.invoice_number !== invoiceNumber);

    return renderInvoicePdf({
      bureau: {
        legalName: legalName || companyName,
        street,
        postalCode,
        city,
        phone,
        email: adminEmail,
        website: websiteSetting,
        iban,
        kvkNumber,
        vatNumber,
      },
      customer: {
        name: billingNameLocal,
        contactName: contactName !== billingNameLocal ? contactName : undefined,
        street: request.billing_address_street ?? undefined,
        postalCity: postalCity || undefined,
        vatNumber: request.billing_vat_number ?? undefined,
        customerNumber: request.reference_number ?? undefined,
        billingReference: request.billing_reference ?? undefined,
      },
      meta: {
        invoiceNumber,
        invoiceDate,
        dueDate,
        paymentTermDays,
        deliveryDate: eventDates || undefined,
      },
      categories: invoiceCategories,
      totals: {
        totalExclVat: displayTotals.totalExclVat,
        totalVat: displayTotals.totalVat,
        totalInclVat: displayTotals.totalInclVat,
        vatLines: displayTotals.vatLines,
      },
      notes: notes || loadedInvoice?.description || undefined,
      priorInvoices:
        isExistingInvoiceView || isSlotMode
          ? []
          : priorOther.map((p) => ({
              invoiceNumber: p.invoice_number,
              invoiceDate: new Date(p.invoice_date),
              amountInclVat: p.invoice_type === "credit" ? -Number(p.amount_incl_vat) : Number(p.amount_incl_vat),
            })),
    });
  };

  const generatePDF = async () => {
    setIsGenerating(true);
    try {
      const blob = await buildPdfBlob();
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `Factuur-${invoiceNumber}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success("Factuur PDF gedownload");
    } catch (error) {
      reportError(error, { where: "AdminInvoicePreview: Error generating PDF" });
      toast.error("Fout bij genereren PDF");
    } finally {
      setIsGenerating(false);
    }
  };

  const closeSendDialog = () => {
    setSendDialogOpen(false);
    if (searchParams.get("action") !== "send") return;
    const next = new URLSearchParams(searchParams);
    next.delete("action");
    setSearchParams(next, { replace: true });
  };


  return (
    <>
      <Helmet>
        <title>Factuur Maken | Admin | Bureau Vlieland</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>
      <AdminLayout>
        <div className="p-6 space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" asChild>
                <Link to={`/admin/projecten/${request.id}`}>
                  <ArrowLeft className="h-5 w-5" />
                </Link>
              </Button>
              <div>
                <h1 className="text-2xl font-bold">Factuur Maken</h1>
                <p className="text-muted-foreground">
                  {request.customer_name} - {request.reference_number}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {(() => {
                const matchedExisting = priorInvoices.find((p) => p.invoice_number === invoiceNumber);
                const wantNewTermijn = searchParams.get("new") === "1";
                if (matchedExisting && !wantNewTermijn && !isExistingInvoiceView) {
                  return (
                    <Button
                      variant="outline"
                      onClick={() => {
                        const next = new URLSearchParams(searchParams);
                        next.set("new", "1");
                        next.delete("invoiceId");
                        setSearchParams(next);
                        // Force re-fetch to recompute next number
                        fetchData();
                      }}
                    >
                      Nieuwe termijn aanmaken
                    </Button>
                  );
                }
                return null;
              })()}
              <Button variant="outline" onClick={generatePDF} disabled={isGenerating || isAppSettingsLoading}>
                {isGenerating ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Download className="h-4 w-4 mr-2" />
                )}
                Download PDF
              </Button>
              {isExistingInvoiceView && loadedInvoice && (
                <Button
                  variant="outline"
                  onClick={() =>
                    setForwardInvoice({
                      ...loadedInvoice,
                      customer_label: request.billing_company_name || request.customer_company || request.customer_name,
                      reference_number: request.reference_number,
                    })
                  }
                  disabled={isGenerating || isAppSettingsLoading || !invoiceNumber}
                >
                  <Mail className="h-4 w-4 mr-2" />
                  Doorsturen naar Snelstart
                </Button>
              )}
              <Button onClick={() => setSendDialogOpen(true)} disabled={isGenerating || isAppSettingsLoading || !invoiceNumber}>
                <Mail className="h-4 w-4 mr-2" />
                {isExistingInvoiceView ? "Opnieuw naar klant" : "Verstuur naar klant"}
              </Button>
            </div>
          </div>

          {canOfferSlotMode && !isExistingInvoiceView && (
            <div className="flex flex-wrap items-center gap-2 rounded-md border bg-muted/30 px-3 py-2 text-sm">
              <span className="font-medium mr-1">Factuurmodus:</span>
              <Button
                size="sm"
                variant={isSlotMode ? "default" : "outline"}
                onClick={() => setMode("slot")}
              >
                Slotfactuur openstaand · {formatCurrency(netDueIncl)}
              </Button>
              <Button
                size="sm"
                variant={!isSlotMode ? "default" : "outline"}
                onClick={() => setMode("full")}
              >
                Termijn met regels
              </Button>
            </div>
          )}

          {(() => {
            const matchedExisting = priorInvoices.find((p) => p.invoice_number === invoiceNumber);
            const wantNewTermijn = searchParams.get("new") === "1";
            const hasPrior = priorInvoices.length > 0;
            if (matchedExisting && isExistingInvoiceView) {
              return (
                <div className="rounded-md border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">
                  Je bekijkt de reeds geregistreerde factuur <strong>{matchedExisting.invoice_number}</strong>
                  {" "}van {format(new Date(matchedExisting.invoice_date), "d MMMM yyyy", { locale: nl })}
                  {" "}(€{Number(matchedExisting.amount_incl_vat).toFixed(2)}).
                  De PDF en bestandsnaam gebruiken dit bestaande nummer. Met <strong>Opnieuw naar klant</strong> verstuur je dezelfde factuur nogmaals zonder dubbele registratie.
                  Klik op <strong>Nieuwe termijn aanmaken</strong> alleen wanneer dit project een aanvullende termijn nodig heeft.
                </div>
              );
            }
            if (isSlotMode && !isExistingInvoiceView) {
              return (
                <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
                  Je maakt een <strong>slotfactuur</strong> ({invoiceNumber}) voor het openstaande bedrag van <strong>{formatCurrency(netDueIncl)}</strong>.
                  De factuur bevat één regel die verwijst naar de eerder verstuurde termijn(en).
                </div>
              );
            }
            if (hasPrior && wantNewTermijn) {
              return (
                <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                  Je maakt een <strong>nieuwe termijnfactuur</strong> ({invoiceNumber}) aan voor dit project.
                  De reeds geregistreerde facturen worden onderaan als "reeds gefactureerd" afgetrokken.
                </div>
              );
            }
            return null;
          })()}



          <div className="grid lg:grid-cols-3 gap-6">
            {/* Settings sidebar */}
            <Card className="lg:order-2">
              <CardContent className="p-6 space-y-4">
                <h3 className="font-semibold">Factuurgegevens</h3>

                <div className="space-y-2">
                  <Label>Factuurnummer</Label>
                  <Input
                    value={invoiceNumber}
                    onChange={(e) => setInvoiceNumber(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Factuurdatum</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className={cn("w-full justify-start text-left font-normal")}>
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {format(invoiceDate, "d MMMM yyyy", { locale: nl })}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={invoiceDate}
                        onSelect={(date) => date && setInvoiceDate(date)}
                        initialFocus
                        className="pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <Label>Vervaldatum</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className={cn("w-full justify-start text-left font-normal")}>
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {format(dueDate, "d MMMM yyyy", { locale: nl })}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={dueDate}
                        onSelect={(date) => date && setDueDate(date)}
                        initialFocus
                        className="pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <Label>Opmerkingen (optioneel)</Label>
                  <Textarea
                    placeholder="Eventuele opmerkingen op de factuur..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                  />
                </div>

                <Separator />

                <div className="space-y-1 text-sm text-muted-foreground">
                  <p>Ontvanger: {billingName}</p>
                  <p>Posten: {totalItemCount} items{accommodationQuote ? " (incl. logies)" : ""}</p>
                  <p>Te factureren: {formatCurrency(effectiveTotalInclVat)}</p>
                </div>
              </CardContent>
            </Card>

            {/* PDF Preview */}
            <div className="lg:col-span-2 lg:order-1">
              <Card>
                <CardContent className="p-0">
                  <div className="bg-slate-100 p-4 rounded-t-lg border-b flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Factuur Preview</span>
                  </div>

                  <div className="p-4 overflow-auto max-h-[900px]">
                    <div
                      ref={pdfRef}
                      className="bg-white px-12 pt-10 pb-12 shadow-lg max-w-[210mm] mx-auto text-[11px] leading-snug"
                      style={{ fontFamily: "Arial, Helvetica, sans-serif", color: "#1a1a1a", fontVariantNumeric: "tabular-nums" }}
                    >
                      {/* Header: Company + Invoice title */}
                      <div className="flex justify-between items-start mb-10 pb-4 border-b-2" style={{ borderColor: "#1e3a5f" }}>
                        <div>
                          <h1 className="text-[22px] font-bold leading-tight" style={{ color: "#1e3a5f" }}>
                            {companyName}
                          </h1>
                          {address && <p className="text-[10px] text-gray-500 mt-1">{address}</p>}
                          {adminEmail && <p className="text-[10px] text-gray-500">{adminEmail}</p>}
                          <p className="text-[10px] text-gray-500">Tel: 0562 700 208</p>
                        </div>
                        <div className="text-right">
                          <h2 className="text-[24px] font-bold uppercase tracking-[0.2em]" style={{ color: "#1e3a5f" }}>
                            Factuur
                          </h2>
                        </div>
                      </div>

                      {/* Invoice meta + Customer address */}
                      <div className="grid grid-cols-2 gap-8 mb-8">
                        <div>
                          <p className="text-[9px] uppercase text-gray-400 font-semibold tracking-wider mb-1">Factuuradres</p>
                          <p className="font-semibold">{billingName}</p>
                          {billingAddress.map((line, i) => (
                            <p key={i}>{line}</p>
                          ))}
                          {request.billing_vat_number && (
                            <p className="text-sm text-gray-500 mt-1">BTW-nr: {request.billing_vat_number}</p>
                          )}
                        </div>
                        <div className="text-right">
                          <div className="space-y-0.5 text-[10.5px]">
                            <div className="flex justify-end gap-3">
                              <span className="text-gray-500">Factuurnummer:</span>
                              <span className="font-semibold w-36 text-right">{invoiceNumber}</span>
                            </div>
                            <div className="flex justify-end gap-4">
                              <span className="text-gray-500">Factuurdatum:</span>
                              <span className="w-36 text-right">{format(invoiceDate, "d MMMM yyyy", { locale: nl })}</span>
                            </div>
                            <div className="flex justify-end gap-4">
                              <span className="text-gray-500">Vervaldatum:</span>
                              <span className="w-36 text-right">{format(dueDate, "d MMMM yyyy", { locale: nl })}</span>
                            </div>
                            <div className="flex justify-end gap-4">
                              <span className="text-gray-500">Projectnummer:</span>
                              <span className="w-36 text-right">{request.reference_number}</span>
                            </div>
                            {request.billing_reference ? (
                              <div className="flex justify-end gap-4">
                                <span className="text-gray-500">Referentie:</span>
                                <span className="w-36 text-right">{request.billing_reference}</span>
                              </div>
                            ) : null}
                            <div className="flex justify-end gap-4">
                              <span className="text-gray-500">Aantal personen:</span>
                              <span className="w-36 text-right">{request.number_of_people}</span>
                            </div>
                            <div className="flex justify-end gap-4">
                              <span className="text-gray-500">Datum evenement:</span>
                              <span className="w-36 text-right">
                                {request.selected_dates
                                  .map((d) => format(new Date(d), "EEE d MMM yyyy", { locale: nl }))
                                  .join(" – ")}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Line items grouped by category */}
                      <table className="w-full border-collapse mb-6 text-[10.5px]" style={{ tableLayout: "fixed" }}>
                        <colgroup>
                          <col />
                          <col style={{ width: "60px" }} />
                          <col style={{ width: "90px" }} />
                          <col style={{ width: "90px" }} />
                        </colgroup>
                        <thead>
                          <tr style={{ borderTop: "2px solid #1e3a5f", borderBottom: "1px solid #1e3a5f" }}>
                            <th className="text-left py-2 px-2 text-[9px] uppercase font-semibold tracking-wider" style={{ color: "#475569" }}>Omschrijving</th>
                            <th className="text-right py-2 px-2 text-[9px] uppercase font-semibold tracking-wider" style={{ color: "#475569" }}>Aantal</th>
                            <th className="text-right py-2 px-2 text-[9px] uppercase font-semibold tracking-wider" style={{ color: "#475569" }}>Prijs</th>
                            <th className="text-right py-2 px-2 text-[9px] uppercase font-semibold tracking-wider" style={{ color: "#475569" }}>Bedrag</th>
                          </tr>
                        </thead>
                        <tbody>
                          {invoiceCategories.map((cat) => (
                            <React.Fragment key={cat.label}>
                              <tr>
                                <td
                                  colSpan={4}
                                  className="pt-3 pb-1 px-2 font-semibold text-[9px] uppercase tracking-[0.15em]"
                                  style={{ color: "#64748b", borderBottom: "1px solid #e2e8f0" }}
                                >
                                  {cat.label}
                                </td>
                              </tr>
                              {cat.rows.map((row, idx) =>
                                row.isSubRow ? (
                                  <tr key={idx}>
                                    <td className="py-0.5 pl-6 pr-2 text-[10px] text-gray-600">{row.description}</td>
                                    <td className="py-0.5 px-2 text-right text-[10px] text-gray-500">{row.qty || "—"}</td>
                                    <td className="py-0.5 px-2 text-right text-[10px] text-gray-500">
                                      {row.unitPrice || "—"}
                                      {row.unitPriceSuffix && <span className="text-[8px] text-gray-400 ml-1">{row.unitPriceSuffix}</span>}
                                    </td>
                                    <td className="py-0.5 px-2 text-right text-[10px] text-gray-600">{row.amount}</td>
                                  </tr>
                                ) : (
                                  <tr key={idx} style={{ borderBottom: "1px solid #f1f5f9" }}>
                                    <td className="py-1.5 px-2">
                                      <p className={row.bold ? "font-semibold" : "font-medium"}>{row.description}</p>
                                      {row.subDescription && <p className="text-[9px] text-gray-400">{row.subDescription}</p>}
                                    </td>
                                    <td className="py-1.5 px-2 text-right">{row.qty || <span className="text-gray-400 text-[9px]">—</span>}</td>
                                    <td className="py-1.5 px-2 text-right">
                                      {row.unitPrice || <span className="text-gray-400 text-[9px]">—</span>}
                                      {row.unitPriceSuffix && <span className="text-[8px] text-gray-400 ml-1">{row.unitPriceSuffix}</span>}
                                    </td>
                                    <td className={`py-1.5 px-2 text-right ${row.bold ? "font-semibold" : "font-medium"}`}>{row.amount}</td>
                                  </tr>
                                ),
                              )}
                            </React.Fragment>
                          ))}
                        </tbody>
                      </table>

                      {/* Totals */}
                      <div className="flex justify-end mb-8">
                        <div className="w-[260px] text-[10.5px]">
                          <div className="flex justify-between py-1">
                            <span className="text-gray-600">Subtotaal excl. BTW</span>
                            <span>{formatCurrency(displayTotals.totalExclVat)}</span>
                          </div>
                          {displayTotals.vatLines.map((line) => (
                            <div key={line.rate} className="flex justify-between py-0.5 text-[10px] text-gray-500">
                              <span>BTW {line.rate}% over {formatCurrency(line.exclVat)}</span>
                              <span>{formatCurrency(line.vatAmount)}</span>
                            </div>
                          ))}
                          <div
                            className="flex justify-between py-2 text-[13px] font-bold mt-1 border-t-2"
                            style={{ borderColor: "#1e3a5f", color: "#1e3a5f" }}
                          >
                            <span>Totaal incl. BTW</span>
                            <span>{formatCurrency(displayTotals.totalInclVat)}</span>
                          </div>
                          {!isSlotMode && !isExistingInvoiceView && (() => {
                            const relevantPrior = priorInvoices.filter((p) => p.invoice_number !== invoiceNumber);
                            if (relevantPrior.length === 0) return null;
                            const priorSum = relevantPrior.reduce(
                              (s, p) => s + (p.invoice_type === "credit" ? -Number(p.amount_incl_vat) : Number(p.amount_incl_vat)),
                              0,
                            );
                            const netDue = totals.totalInclVat - priorSum;
                            return (
                              <>
                                <div className="pt-1 text-[9.5px] text-gray-500 uppercase tracking-wide">
                                  Reeds gefactureerd
                                </div>
                                {relevantPrior.map((p) => {
                                  const signedAmount = p.invoice_type === "credit" ? -Number(p.amount_incl_vat) : Number(p.amount_incl_vat);
                                  return (
                                    <div key={p.id} className="flex justify-between py-0.5 text-[10px] text-gray-600">
                                      <span>
                                        {p.invoice_number}{" "}
                                        <span className="text-gray-400">
                                          ({format(new Date(p.invoice_date), "d MMM yyyy", { locale: nl })})
                                        </span>
                                      </span>
                                      <span>-{formatCurrency(Math.abs(signedAmount))}</span>
                                    </div>
                                  );
                                })}
                                <div
                                  className="flex justify-between py-2 text-[13px] font-bold mt-1 border-t-2"
                                  style={{ borderColor: "#1e3a5f", color: "#1e3a5f" }}
                                >
                                  <span>Nog te voldoen</span>
                                  <span>{formatCurrency(netDue)}</span>
                                </div>
                              </>
                            );
                          })()}

                        </div>
                      </div>

                      {/* Payment info */}
                      {(() => {
                        const relevantPrior = priorInvoices.filter((p) => p.invoice_number !== invoiceNumber);
                        const priorSum = relevantPrior.reduce(
                          (s, p) => s + (p.invoice_type === "credit" ? -Number(p.amount_incl_vat) : Number(p.amount_incl_vat)),
                          0,
                        );
                        const netDue = isExistingInvoiceView
                          ? effectiveTotalInclVat
                          : isSlotMode
                            ? netDueIncl
                            : totals.totalInclVat - priorSum;
                        return (
                          <div className="p-3 rounded mb-5 text-[10.5px]" style={{ backgroundColor: "#f8fafc", border: "1px solid #e2e8f0" }}>
                            <p className="font-semibold mb-1">Betalingsgegevens</p>
                            <p>
                              Gelieve het totaalbedrag van <span className="font-semibold">{formatCurrency(netDue)}</span> over
                              te maken vóór {format(dueDate, "d MMMM yyyy", { locale: nl })} naar:
                            </p>
                            <div className="mt-1.5">
                              <p>IBAN: <span className="font-mono font-semibold">{iban}</span></p>
                              <p>T.n.v.: {companyName}</p>
                              <p>O.v.v.: {invoiceNumber}</p>
                            </div>
                          </div>
                        );
                      })()}


                      {/* Notes */}
                      {notes && (
                        <div className="mb-5 text-[10.5px] text-gray-600">
                          <p className="font-semibold text-gray-700 mb-1">Opmerkingen</p>
                          <p className="whitespace-pre-line">{notes}</p>
                        </div>
                      )}

                      {/* Footer */}
                      <div className="border-t pt-3 text-[8.5px] text-gray-400">
                        <p className="text-center mb-2 italic">Op alle leveringen zijn onze algemene voorwaarden van toepassing.</p>
                        <div className="grid grid-cols-3 gap-4">
                          <div>
                            <p className="font-semibold text-gray-600">{companyName}</p>
                            {address && <p>{address}</p>}
                          </div>
                          <div>
                            {kvkNumber && <p>KvK: {kvkNumber}</p>}
                            {vatNumber && <p>BTW: {vatNumber}</p>}
                          </div>
                          <div className="text-right">
                            {iban && <p>IBAN: {iban}</p>}
                            <p>{adminEmail}</p>
                            <p>Tel: 0562 700 208</p>
                          </div>
                        </div>
                        <div className="flex items-center justify-center gap-2 mt-3 pt-2 border-t border-gray-100">
                          <img src={ambassadeurLogo} alt="" className="h-8 w-auto object-contain" />
                          <span className="text-[8px] text-gray-500">Trotse ambassadeur Waddenzee Werelderfgoed</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </AdminLayout>

      <SendBureauInvoiceToCustomerDialog
        isOpen={sendDialogOpen}
        onClose={closeSendDialog}
        requestId={request.id}
        defaultRecipient={request.billing_contact_email || request.customer_email}
        recipientName={request.billing_contact_name || request.customer_name}
        invoiceNumber={invoiceNumber}
        invoiceDate={invoiceDate}
        amountExclVat={Math.round(effectiveTotalExclVat * 100) / 100}
        vatAmount={Math.round(effectiveTotalVat * 100) / 100}
        invoiceType={outgoingInvoiceType}
        description={notes || loadedInvoice?.description || undefined}
        existingInvoiceId={isExistingInvoiceView ? loadedInvoice?.id ?? null : null}
        linesToStore={linesToStore}
        onGeneratePdf={buildPdfBlob}
        onSent={() => navigate(`/admin/projecten/${request.id}`)}
      />

      <ForwardBureauInvoiceDialog
        invoice={forwardInvoice}
        onGeneratePdf={buildPdfBlob}
        onClose={() => {
          setForwardInvoice(null);
          // Strip the action params from the URL so it doesn't reopen on refresh
          const next = new URLSearchParams(searchParams);
          next.delete("action");
          setSearchParams(next, { replace: true });
        }}
      />
    </>
  );
};

export default AdminInvoicePreview;
