import React, { useState, useRef, useEffect } from "react";
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
import { toast } from "sonner";
import { categoryLabels } from "@/types/buildingBlock";
import { useAppSettings } from "@/hooks/useAppSettings";
import { useItemBillingLinesBatch } from "@/hooks/useItemBillingLines";
import { SendBureauInvoiceToCustomerDialog } from "@/components/admin/SendBureauInvoiceToCustomerDialog";
import {
  ForwardBureauInvoiceDialog,
  type BureauInvoiceForForward,
} from "@/components/admin/ForwardBureauInvoiceDialog";
import { calculateUnifiedInvoiceTotals } from "@/lib/invoiceTotals";
import { renderInvoicePdf, type InvoiceCategory, type InvoiceLineRow } from "@/lib/invoicePdfRenderer";

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
  invoicing_mode: string | null;
  billing_company_name: string | null;
  billing_contact_name: string | null;
  billing_contact_email: string | null;
  billing_address_street: string | null;
  billing_address_postal: string | null;
  billing_address_city: string | null;
  billing_vat_number: string | null;
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
}

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
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const pdfRef = useRef<HTMLDivElement>(null);
  const { getSetting, settings, isLoading: isAppSettingsLoading } = useAppSettings();

  const [request, setRequest] = useState<ProgramRequest | null>(null);
  const [items, setItems] = useState<ProgramItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [vatRateMap, setVatRateMap] = useState<Record<string, number>>({});
  const [sendDialogOpen, setSendDialogOpen] = useState(false);
  const [forwardInvoice, setForwardInvoice] = useState<BureauInvoiceForForward | null>(null);

  // Load billing lines per item (definitive lines override quoted_price)
  const { linesByItem } = useItemBillingLinesBatch(items.map((i) => i.id));

  // Accommodation state
  const [accommodationQuote, setAccommodationQuote] = useState<AccommodationQuoteData | null>(null);
  const [accommodationExtras, setAccommodationExtras] = useState<AccommodationExtraData[]>([]);
  const [accommodationNights, setAccommodationNights] = useState(0);

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
    if (action !== "forward" || !invoiceId || !request) return;
    if (forwardInvoice?.id === invoiceId) return;

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
      setForwardInvoice({
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
        customer_label: request.billing_company_name || request.customer_company || request.customer_name,
        reference_number: request.reference_number,
      });
      // Make sure the rendered invoice number matches the one we're forwarding
      setInvoiceNumber(data.invoice_number);
      if (data.invoice_date) setInvoiceDate(new Date(data.invoice_date));
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
            .select("name, description, quantity, unit_price, pricing_type, vat_rate")
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

      // Generate invoice number suggestion
      const ref = requestData.reference_number || "XXXX";
      setInvoiceNumber(`FV-${ref}-001`);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Fout bij laden gegevens");
      navigate("/admin/projecten");
    } finally {
      setIsLoading(false);
    }
  };

  const getItemPrice = (item: ProgramItem) =>
    item.admin_price_override ?? item.quoted_price ?? 0;

  const getItemTotal = (item: ProgramItem) => {
    const people = item.override_people ?? request?.number_of_people ?? 1;
    const days = getNumberOfDays(request?.selected_dates);
    return getDisplayLineTotal(item as any, people, days) ?? 0;
  };

  const getExtraTotal = (extra: AccommodationExtraData) => {
    if (extra.pricing_type === "fixed") return extra.unit_price;
    return extra.unit_price * extra.quantity;
  };

  // Group items by category
  const groupedByCategory = items.reduce((acc, item) => {
    const cat = item.block_category || "overig";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(item);
    return acc;
  }, {} as Record<string, ProgramItem[]>);

  const categoryOrder = ["locaties", "catering", "outdoor", "excursies", "entertainment", "vervoer", "overig", "services"];

  const sortedCategories = Object.keys(groupedByCategory).sort(
    (a, b) => (categoryOrder.indexOf(a) === -1 ? 99 : categoryOrder.indexOf(a)) -
              (categoryOrder.indexOf(b) === -1 ? 99 : categoryOrder.indexOf(b))
  );

  const getItemVatRate = (item: ProgramItem): number => {
    if (item.block_id && vatRateMap[item.block_id] !== undefined) {
      return vatRateMap[item.block_id];
    }
    return Number(settings.default_vat_rate || 21);
  };

  const calculateTotals = () => {
    const numberOfPeople = request?.number_of_people || 0;
    const numberOfDays = Math.max(request?.selected_dates?.length || 0, 1);
    const unified = request
      ? calculateUnifiedInvoiceTotals({
          request,
          items,
          appSettings: settings,
          selectedAccommodationTotal: accommodationQuote?.price_total ?? 0,
          accommodationExtras: accommodationExtras as any,
          linesByItem,
        })
      : {
          coordinationFee: 0,
          touristTax: 0,
          natureContribution: 0,
          centralSurcharge: 0,
          grandTotalInclVat: 0,
          invoicedTotal: 0,
          outstanding: 0,
          programItemsTotal: 0,
          extraCostsTotal: 0,
          accommodationTotal: 0,
        };

    const standardVatRate = Number(settings.default_vat_rate || 21);
    const vatGroups: Record<number, number> = {};

    items.forEach((item) => {
      const lines = linesByItem[item.id];
      if (lines && lines.length > 0) {
        lines.forEach((line) => {
          const rate = Number(line.vat_rate);
          vatGroups[rate] = (vatGroups[rate] || 0) + Number(line.amount_incl_vat);
        });
      } else {
        const total = getItemTotal(item);
        const rate = getItemVatRate(item);
        vatGroups[rate] = (vatGroups[rate] || 0) + total;
      }
    });

    vatGroups[standardVatRate] = (vatGroups[standardVatRate] || 0) + unified.coordinationFee + unified.centralSurcharge;

    if (accommodationQuote) {
      const rate = Number(accommodationQuote.vat_rate || 9);
      vatGroups[rate] = (vatGroups[rate] || 0) + Number(accommodationQuote.price_total || 0);
    }

    accommodationExtras.forEach((extra) => {
      const total = getExtraTotal(extra);
      const rate = Number(extra.vat_rate || 9);
      vatGroups[rate] = (vatGroups[rate] || 0) + total;
    });

    if (unified.touristTax + unified.natureContribution > 0) {
      vatGroups[0] = (vatGroups[0] || 0) + unified.touristTax + unified.natureContribution;
    }

    let totalExclVat = 0;
    let totalVat = 0;
    const vatLines: { rate: number; exclVat: number; vatAmount: number }[] = [];

    Object.entries(vatGroups)
      .sort(([a], [b]) => Number(a) - Number(b))
      .forEach(([rateStr, amountInclVat]) => {
        const rate = Number(rateStr);
        const exclVat = amountInclVat / (1 + rate / 100);
        const vatAmount = amountInclVat - exclVat;
        vatLines.push({ rate, exclVat, vatAmount });
        totalExclVat += exclVat;
        totalVat += vatAmount;
      });

    return {
      ...unified,
      isBureauCentral: request?.invoicing_mode === "bureau_central",
      numberOfPeople,
      numberOfDays,
      totalExclVat,
      totalVat,
      totalInclVat: unified.grandTotalInclVat,
      vatLines,
    };
  };

  /**
   * Build the PDF blob using the native invoice renderer.
   * The HTML preview on screen is for read-only inspection — the
   * downloaded/sent PDF is drawn natively for crisp, paginated A4 output.
   */
  const buildPdfBlob = async (): Promise<Blob | null> => {
    if (!request) return null;

    const totalsLocal = calculateTotals();
    const fmt = (n: number) =>
      new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" }).format(n);

    // ── Build categorized line rows
    const categories: InvoiceCategory[] = [];
    const numberOfDays = Math.max(request.selected_dates?.length || 0, 1);

    for (const cat of sortedCategories) {
      const catItems = groupedByCategory[cat];
      const catLabel = (categoryLabels as Record<string, string>)[cat] || cat.charAt(0).toUpperCase() + cat.slice(1);
      const rows: InvoiceLineRow[] = [];

      for (const item of catItems) {
        const billingLines = linesByItem[item.id];
        if (billingLines && billingLines.length > 0) {
          const itemTotal = billingLines.reduce((s, b) => s + Number(b.amount_incl_vat), 0);
          rows.push({
            description: item.block_name,
            subDescription: item.provider_name,
            qty: "",
            unitPrice: "",
            amount: fmt(itemTotal),
            bold: true,
          });
          for (const bl of billingLines) {
            rows.push({
              description: bl.description || "Regel",
              qty: String(Number(bl.quantity)),
              unitPrice: fmt(Number(bl.unit_price_excl_vat)),
              unitPriceSuffix: `${bl.vat_rate}%`,
              amount: fmt(Number(bl.amount_incl_vat)),
              isSubRow: true,
            });
          }
          continue;
        }

        const isPerPerson =
          item.price_type === "per_person" || item.price_type === "per_person_per_day";
        const isPerDay = item.price_type === "per_person_per_day";
        const lineTotal = getItemTotal(item);
        const effectivePeople = item.override_people ?? request.number_of_people ?? 1;

        let unitPrice = getItemPrice(item);
        let qty: string;
        if (item.quoted_price != null) {
          if (isPerDay) {
            const divisor = effectivePeople * numberOfDays || 1;
            unitPrice = item.quoted_price / divisor;
            qty = `${effectivePeople}×${numberOfDays}d`;
          } else if (isPerPerson) {
            unitPrice = item.quoted_price / (effectivePeople || 1);
            qty = String(effectivePeople);
          } else {
            unitPrice = item.quoted_price;
            qty = "1";
          }
        } else {
          qty = isPerPerson
            ? isPerDay
              ? `${effectivePeople}×${numberOfDays}d`
              : String(effectivePeople)
            : "1";
        }

        rows.push({
          description: item.block_name,
          subDescription: item.admin_price_notes || item.provider_name,
          qty,
          unitPrice: fmt(unitPrice),
          unitPriceSuffix: isPerDay ? "p.p.p.d." : isPerPerson ? "p.p." : "",
          amount: fmt(lineTotal),
        });
      }

      if (rows.length > 0) categories.push({ label: catLabel, rows });
    }

    // Logies
    if (accommodationQuote) {
      const rows: InvoiceLineRow[] = [
        {
          description: accommodationQuote.accommodation_name,
          subDescription: `${accommodationQuote.partner_name}${
            accommodationNights > 0
              ? ` • ${accommodationNights} ${accommodationNights === 1 ? "nacht" : "nachten"}`
              : ""
          }`,
          qty: "1",
          unitPrice: fmt(accommodationQuote.price_total),
          amount: fmt(accommodationQuote.price_total),
        },
      ];
      categories.push({ label: "Logies", rows });
    }

    // Logies-extra's
    if (accommodationExtras.length > 0) {
      const rows: InvoiceLineRow[] = accommodationExtras.map((extra) => {
        const extraTotal = getExtraTotal(extra);
        const isFixed = extra.pricing_type === "fixed";
        return {
          description: extra.name,
          subDescription: extra.description ?? undefined,
          qty: isFixed ? "1" : String(extra.quantity),
          unitPrice: fmt(extra.unit_price),
          unitPriceSuffix: isFixed ? "" : "p.p.",
          amount: fmt(extraTotal),
        };
      });
      categories.push({ label: "Extra's bij logies", rows });
    }

    // Coördinatie & bijdragen
    const coordRows: InvoiceLineRow[] = [];
    if (totalsLocal.coordinationFee > 0) {
      coordRows.push({
        description: "Coördinatiekosten",
        subDescription: `${totalsLocal.numberOfPeople} personen`,
        qty: "1",
        unitPrice: fmt(totalsLocal.coordinationFee),
        amount: fmt(totalsLocal.coordinationFee),
      });
    }
    if (totalsLocal.centralSurcharge > 0) {
      const pp = totalsLocal.centralSurcharge / Math.max(totalsLocal.numberOfPeople, 1);
      coordRows.push({
        description: "Opslag centrale facturatie",
        subDescription: `${totalsLocal.numberOfPeople} personen`,
        qty: String(totalsLocal.numberOfPeople),
        unitPrice: fmt(pp),
        unitPriceSuffix: "p.p.",
        amount: fmt(totalsLocal.centralSurcharge),
      });
    }
    if (totalsLocal.touristTax > 0) {
      const totalQty = totalsLocal.numberOfPeople * totalsLocal.numberOfDays;
      const pp = totalsLocal.touristTax / Math.max(totalQty, 1);
      coordRows.push({
        description: "Toeristenbelasting",
        subDescription: `${totalsLocal.numberOfPeople} pers. × ${totalsLocal.numberOfDays} ${
          totalsLocal.numberOfDays === 1 ? "dag" : "dagen"
        }`,
        qty: String(totalQty),
        unitPrice: fmt(pp),
        unitPriceSuffix: "p.p.p.d.",
        amount: fmt(totalsLocal.touristTax),
      });
    }
    if (totalsLocal.natureContribution > 0) {
      const pp = totalsLocal.natureContribution / Math.max(totalsLocal.numberOfPeople, 1);
      coordRows.push({
        description: "Natuurbijdrage",
        subDescription: `${totalsLocal.numberOfPeople} personen`,
        qty: String(totalsLocal.numberOfPeople),
        unitPrice: fmt(pp),
        unitPriceSuffix: "p.p.",
        amount: fmt(totalsLocal.natureContribution),
      });
    }
    if (coordRows.length > 0) {
      categories.push({ label: "Coördinatie & bijdragen", rows: coordRows });
    }

    // ── Customer block
    const billingNameLocal =
      request.billing_company_name || request.customer_company || request.customer_name;
    const contactName = request.billing_contact_name || request.customer_name;
    const postalCity = [request.billing_address_postal, request.billing_address_city]
      .filter(Boolean)
      .join(" ");

    const eventDates = request.selected_dates
      .map((d) => format(new Date(d), "d MMM yyyy", { locale: nl }))
      .join(" – ");

    const blob = await renderInvoicePdf({
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
      },
      meta: {
        invoiceNumber,
        invoiceDate,
        dueDate,
        paymentTermDays,
        deliveryDate: eventDates || undefined,
      },
      categories,
      totals: {
        totalExclVat: totalsLocal.totalExclVat,
        totalVat: totalsLocal.totalVat,
        totalInclVat: totalsLocal.totalInclVat,
        vatLines: totalsLocal.vatLines,
      },
      notes: notes || undefined,
    });

    return blob;
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
      console.error("Error generating PDF:", error);
      toast.error("Fout bij genereren PDF");
    } finally {
      setIsGenerating(false);
    }
  };

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
  const billingName = request.billing_company_name || request.customer_company || request.customer_name;
  const billingAddress = [
    request.billing_address_street,
    [request.billing_address_postal, request.billing_address_city].filter(Boolean).join(" "),
  ].filter(Boolean);

  const totalItemCount = items.length + (accommodationQuote ? 1 : 0) + accommodationExtras.length;

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
              <Button variant="outline" onClick={generatePDF} disabled={isGenerating || isAppSettingsLoading}>
                {isGenerating ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Download className="h-4 w-4 mr-2" />
                )}
                Download PDF
              </Button>
              <Button onClick={() => setSendDialogOpen(true)} disabled={isGenerating || isAppSettingsLoading || !invoiceNumber}>
                <Mail className="h-4 w-4 mr-2" />
                Verstuur naar klant
              </Button>
            </div>
          </div>

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
                  <p>Totaal: {formatCurrency(totals.totalInclVat)}</p>
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
                              <span className="text-gray-500">Referentie:</span>
                              <span className="w-36 text-right">{request.reference_number}</span>
                            </div>
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
                          {sortedCategories.map((cat) => {
                            const catItems = groupedByCategory[cat];
                            const catLabel = (categoryLabels as Record<string, string>)[cat] || cat.charAt(0).toUpperCase() + cat.slice(1);

                            return (
                              <React.Fragment key={cat}>
                                {/* Category header row */}
                                <tr>
                                  <td
                                    colSpan={4}
                                    className="pt-3 pb-1 px-2 font-semibold text-[9px] uppercase tracking-[0.15em]"
                                    style={{ color: "#64748b", borderBottom: "1px solid #e2e8f0" }}
                                  >
                                    {catLabel}
                                  </td>
                                </tr>
                                {catItems.map((item) => {
                                  const billingLines = linesByItem[item.id];
                                  // Definitive billing lines: one main row + indented subrows
                                  if (billingLines && billingLines.length > 0) {
                                    const itemTotal = billingLines.reduce((s, b) => s + Number(b.amount_incl_vat), 0);
                                    return (
                                      <React.Fragment key={item.id}>
                                        <tr style={{ borderBottom: "1px solid #f1f5f9" }}>
                                          <td className="py-1.5 px-2">
                                            <p className="font-medium">{item.block_name}</p>
                                            <p className="text-[9px] text-gray-400">{item.provider_name}</p>
                                          </td>
                                          <td className="py-1.5 px-2 text-right text-gray-400 text-[9px]">—</td>
                                          <td className="py-1.5 px-2 text-right text-gray-400 text-[9px]">—</td>
                                          <td className="py-1.5 px-2 text-right font-semibold">
                                            {formatCurrency(itemTotal)}
                                          </td>
                                        </tr>
                                        {billingLines.map((bl) => (
                                          <tr key={bl.id}>
                                            <td className="py-0.5 pl-6 pr-2 text-[10px] text-gray-600">
                                              {bl.description || "Regel"}
                                            </td>
                                            <td className="py-0.5 px-2 text-right text-[10px] text-gray-500">
                                              {Number(bl.quantity)}
                                            </td>
                                            <td className="py-0.5 px-2 text-right text-[10px] text-gray-500">
                                              {formatCurrency(Number(bl.unit_price_excl_vat))}
                                              <span className="text-[8px] text-gray-400 ml-1">{bl.vat_rate}%</span>
                                            </td>
                                            <td className="py-0.5 px-2 text-right text-[10px] text-gray-600">
                                              {formatCurrency(Number(bl.amount_incl_vat))}
                                            </td>
                                          </tr>
                                        ))}
                                      </React.Fragment>
                                    );
                                  }

                                  const isPerPerson = item.price_type === "per_person" || item.price_type === "per_person_per_day";
                                  const isPerDay = item.price_type === "per_person_per_day";
                                  const lineTotal = getItemTotal(item);
                                  const numberOfDays = request.selected_dates?.length || 1;
                                  const effectivePeople = item.override_people ?? request.number_of_people ?? 1;
                                  // When quoted_price is set, derive a consistent unit price from the total
                                  // so that qty × unit always equals lineTotal in the display.
                                  let unitPrice = getItemPrice(item);
                                  let qty: string;
                                  if (item.quoted_price != null) {
                                    if (isPerDay) {
                                      const divisor = effectivePeople * numberOfDays || 1;
                                      unitPrice = item.quoted_price / divisor;
                                      qty = `${effectivePeople}×${numberOfDays}d`;
                                    } else if (isPerPerson) {
                                      unitPrice = item.quoted_price / (effectivePeople || 1);
                                      qty = String(effectivePeople);
                                    } else {
                                      unitPrice = item.quoted_price;
                                      qty = "1";
                                    }
                                  } else {
                                    qty = isPerPerson
                                      ? (isPerDay ? `${effectivePeople}×${numberOfDays}d` : String(effectivePeople))
                                      : "1";
                                  }

                                  return (
                                    <tr key={item.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                                      <td className="py-1.5 px-2">
                                        <p className="font-medium">{item.block_name}</p>
                                        {item.admin_price_notes && (
                                          <p className="text-[9px] text-gray-500">{item.admin_price_notes}</p>
                                        )}
                                        <p className="text-[9px] text-gray-400">{item.provider_name}</p>
                                      </td>
                                      <td className="py-1.5 px-2 text-right">
                                        {qty}
                                      </td>
                                      <td className="py-1.5 px-2 text-right">
                                        {formatCurrency(unitPrice)}
                                        {isPerDay && (
                                          <span className="text-[8px] text-gray-400 ml-1">p.p.p.d.</span>
                                        )}
                                        {isPerPerson && !isPerDay && (
                                          <span className="text-[8px] text-gray-400 ml-1">p.p.</span>
                                        )}
                                      </td>
                                      <td className="py-1.5 px-2 text-right font-medium">
                                        {formatCurrency(lineTotal)}
                                      </td>
                                    </tr>
                                  );
                                })}
                              </React.Fragment>
                            );
                          })}

                          {/* Accommodation / Logies section */}
                          {accommodationQuote && (
                            <>
                              <tr>
                                <td
                                  colSpan={4}
                                  className="pt-3 pb-1 px-2 font-semibold text-[9px] uppercase tracking-[0.15em]"
                                  style={{ color: "#64748b", borderBottom: "1px solid #e2e8f0" }}
                                >
                                  Logies
                                </td>
                              </tr>
                              <tr style={{ borderBottom: "1px solid #f1f5f9" }}>
                                <td className="py-1.5 px-2">
                                  <p className="font-medium">{accommodationQuote.accommodation_name}</p>
                                  <p className="text-[9px] text-gray-400">{accommodationQuote.partner_name}</p>
                                  {accommodationNights > 0 && (
                                    <p className="text-[9px] text-gray-400">{accommodationNights} {accommodationNights === 1 ? "nacht" : "nachten"}</p>
                                  )}
                                </td>
                                <td className="py-1.5 px-2 text-right">1</td>
                                <td className="py-1.5 px-2 text-right">
                                  {formatCurrency(accommodationQuote.price_total)}
                                </td>
                                <td className="py-1.5 px-2 text-right font-medium">
                                  {formatCurrency(accommodationQuote.price_total)}
                                </td>
                              </tr>
                            </>
                          )}

                          {/* Accommodation extras */}
                          {accommodationExtras.length > 0 && (
                            <>
                              <tr>
                                <td
                                  colSpan={4}
                                  className="pt-3 pb-1 px-2 font-semibold text-[9px] uppercase tracking-[0.15em]"
                                  style={{ color: "#64748b", borderBottom: "1px solid #e2e8f0" }}
                                >
                                  Extra's bij logies
                                </td>
                              </tr>
                              {accommodationExtras.map((extra, idx) => {
                                const extraTotal = getExtraTotal(extra);
                                const isFixed = extra.pricing_type === "fixed";

                                return (
                                  <tr key={`extra-${idx}`} style={{ borderBottom: "1px solid #f1f5f9" }}>
                                    <td className="py-1.5 px-2">
                                      <p className="font-medium">{extra.name}</p>
                                      {extra.description && (
                                        <p className="text-[9px] text-gray-500">{extra.description}</p>
                                      )}
                                    </td>
                                    <td className="py-1.5 px-2 text-right">
                                      {isFixed ? 1 : extra.quantity}
                                    </td>
                                    <td className="py-1.5 px-2 text-right">
                                      {formatCurrency(extra.unit_price)}
                                      {!isFixed && (
                                        <span className="text-[8px] text-gray-400 ml-1">p.p.</span>
                                      )}
                                    </td>
                                    <td className="py-1.5 px-2 text-right font-medium">
                                      {formatCurrency(extraTotal)}
                                    </td>
                                  </tr>
                                );
                              })}
                            </>
                          )}

                          {/* Coordination fee + levies + central surcharge */}
                          {(totals.coordinationFee > 0 || totals.touristTax > 0 || totals.natureContribution > 0 || totals.centralSurcharge > 0) && (
                            <>
                              <tr>
                                <td
                                  colSpan={4}
                                  className="pt-3 pb-1 px-2 font-semibold text-[9px] uppercase tracking-[0.15em]"
                                  style={{ color: "#64748b", borderBottom: "1px solid #e2e8f0" }}
                                >
                                  Coördinatie & bijdragen
                                </td>
                              </tr>
                              {totals.coordinationFee > 0 && (
                                <tr style={{ borderBottom: "1px solid #f1f5f9" }}>
                                  <td className="py-1.5 px-2">
                                    <p className="font-medium">Coördinatiekosten</p>
                                    <p className="text-[9px] text-gray-400">{totals.numberOfPeople} personen</p>
                                  </td>
                                  <td className="py-1.5 px-2 text-right">1</td>
                                  <td className="py-1.5 px-2 text-right">{formatCurrency(totals.coordinationFee)}</td>
                                  <td className="py-1.5 px-2 text-right font-medium">{formatCurrency(totals.coordinationFee)}</td>
                                </tr>
                              )}
                              {totals.centralSurcharge > 0 && (
                                <tr style={{ borderBottom: "1px solid #f1f5f9" }}>
                                  <td className="py-1.5 px-2">
                                    <p className="font-medium">Opslag centrale facturatie</p>
                                    <p className="text-[9px] text-gray-400">{totals.numberOfPeople} personen</p>
                                  </td>
                                  <td className="py-1.5 px-2 text-right">{totals.numberOfPeople}</td>
                                  <td className="py-1.5 px-2 text-right">
                                    {formatCurrency(totals.centralSurcharge / Math.max(totals.numberOfPeople, 1))}
                                    <span className="text-[8px] text-gray-400 ml-1">p.p.</span>
                                  </td>
                                  <td className="py-1.5 px-2 text-right font-medium">{formatCurrency(totals.centralSurcharge)}</td>
                                </tr>
                              )}
                              {totals.touristTax > 0 && (
                                <tr style={{ borderBottom: "1px solid #f1f5f9" }}>
                                  <td className="py-1.5 px-2">
                                    <p className="font-medium">Toeristenbelasting</p>
                                    <p className="text-[9px] text-gray-400">{totals.numberOfPeople} pers. × {totals.numberOfDays} {totals.numberOfDays === 1 ? "dag" : "dagen"}</p>
                                  </td>
                                  <td className="py-1.5 px-2 text-right">{totals.numberOfPeople * totals.numberOfDays}</td>
                                  <td className="py-1.5 px-2 text-right">
                                    {formatCurrency(totals.touristTax / Math.max(totals.numberOfPeople * totals.numberOfDays, 1))}
                                    <span className="text-[8px] text-gray-400 ml-1">p.p.p.d.</span>
                                  </td>
                                  <td className="py-1.5 px-2 text-right font-medium">{formatCurrency(totals.touristTax)}</td>
                                </tr>
                              )}
                              {totals.natureContribution > 0 && (
                                <tr style={{ borderBottom: "1px solid #f1f5f9" }}>
                                  <td className="py-1.5 px-2">
                                    <p className="font-medium">Natuurbijdrage</p>
                                    <p className="text-[9px] text-gray-400">{totals.numberOfPeople} personen</p>
                                  </td>
                                  <td className="py-1.5 px-2 text-right">{totals.numberOfPeople}</td>
                                  <td className="py-1.5 px-2 text-right">
                                    {formatCurrency(totals.natureContribution / Math.max(totals.numberOfPeople, 1))}
                                    <span className="text-[8px] text-gray-400 ml-1">p.p.</span>
                                  </td>
                                  <td className="py-1.5 px-2 text-right font-medium">{formatCurrency(totals.natureContribution)}</td>
                                </tr>
                              )}
                            </>
                          )}
                        </tbody>
                      </table>

                      {/* Totals */}
                      <div className="flex justify-end mb-8">
                        <div className="w-[260px] text-[10.5px]">
                          <div className="flex justify-between py-1">
                            <span className="text-gray-600">Subtotaal excl. BTW</span>
                            <span>{formatCurrency(totals.totalExclVat)}</span>
                          </div>
                          {totals.vatLines.map((line) => (
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
                            <span>{formatCurrency(totals.totalInclVat)}</span>
                          </div>
                        </div>
                      </div>

                      {/* Payment info */}
                      <div className="p-3 rounded mb-5 text-[10.5px]" style={{ backgroundColor: "#f8fafc", border: "1px solid #e2e8f0" }}>
                        <p className="font-semibold mb-1">Betalingsgegevens</p>
                        <p>
                          Gelieve het totaalbedrag van <span className="font-semibold">{formatCurrency(totals.totalInclVat)}</span> over
                          te maken vóór {format(dueDate, "d MMMM yyyy", { locale: nl })} naar:
                        </p>
                        <div className="mt-1.5">
                          <p>IBAN: <span className="font-mono font-semibold">{iban}</span></p>
                          <p>T.n.v.: {companyName}</p>
                          <p>O.v.v.: {invoiceNumber}</p>
                        </div>
                      </div>

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
        onClose={() => setSendDialogOpen(false)}
        requestId={request.id}
        defaultRecipient={request.billing_contact_email || request.customer_email}
        recipientName={request.billing_contact_name || request.customer_name}
        invoiceNumber={invoiceNumber}
        invoiceDate={invoiceDate}
        amountExclVat={Math.round(totals.totalExclVat * 100) / 100}
        vatAmount={Math.round(totals.totalVat * 100) / 100}
        invoiceType="partial"
        description={notes}
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
          next.delete("invoiceId");
          setSearchParams(next, { replace: true });
        }}
      />
    </>
  );
};

export default AdminInvoicePreview;
