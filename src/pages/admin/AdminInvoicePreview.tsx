import React, { useState, useRef, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Helmet } from "react-helmet";
import { format, addDays, differenceInCalendarDays } from "date-fns";
import { nl } from "date-fns/locale";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { calculateBureauFee } from "@/types/buildingBlock";
import { categoryLabels } from "@/types/buildingBlock";
import { useAppSettings } from "@/hooks/useAppSettings";

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
  billing_company_name: string | null;
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
  const pdfRef = useRef<HTMLDivElement>(null);
  const { getSetting } = useAppSettings();

  const [request, setRequest] = useState<ProgramRequest | null>(null);
  const [items, setItems] = useState<ProgramItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [vatRateMap, setVatRateMap] = useState<Record<string, number>>({});

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
  const kvkNumber = getSetting<string>("bureau_kvk_number", "");
  const vatNumber = getSetting<string>("bureau_vat_number", "");
  const address = getSetting<string>("bureau_address", "");
  const iban = getSetting<string>("bureau_iban", "");
  const adminEmail = getSetting<string>("bureau_admin_email", "administratie@bureauvlieland.nl");

  useEffect(() => {
    if (id) fetchData();
  }, [id]);

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
    // quoted_price = already a group total, never multiply
    if (item.quoted_price != null) return item.quoted_price;
    // admin_price_override = unit price, multiply for per_person
    const unitPrice = item.admin_price_override ?? 0;
    const effectivePeople = item.override_people ?? request?.number_of_people ?? 1;
    const isPerPerson = !item.price_type || item.price_type === "per_person" || item.price_type === "on_request" || item.price_type === "per_person_per_day";
    const personMult = isPerPerson ? effectivePeople : 1;
    const dayMult = item.price_type === "per_person_per_day" ? (request?.selected_dates?.length || 1) : 1;
    return unitPrice * personMult * dayMult;
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
    return 21; // default
  };

  const calculateTotals = () => {
    const bureauFee = calculateBureauFee(request?.number_of_people || 0);

    // Group amounts by VAT rate
    const vatGroups: Record<number, number> = {};
    items.forEach(item => {
      const total = getItemTotal(item);
      const rate = getItemVatRate(item);
      vatGroups[rate] = (vatGroups[rate] || 0) + total;
    });
    // Bureau fee is always 21%
    vatGroups[21] = (vatGroups[21] || 0) + bureauFee;

    // Add accommodation quote
    if (accommodationQuote) {
      const rate = accommodationQuote.vat_rate;
      vatGroups[rate] = (vatGroups[rate] || 0) + accommodationQuote.price_total;
    }

    // Add accommodation extras
    accommodationExtras.forEach(extra => {
      const total = getExtraTotal(extra);
      const rate = extra.vat_rate;
      vatGroups[rate] = (vatGroups[rate] || 0) + total;
    });

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

    const totalInclVat = totalExclVat + totalVat;

    return { bureauFee, totalExclVat, totalVat, totalInclVat, vatLines };
  };

  const generatePDF = async () => {
    if (!pdfRef.current) return;
    setIsGenerating(true);
    try {
      const canvas = await html2canvas(pdfRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
      });

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const imgWidth = 210;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;
      const pageHeight = 297;

      pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      const url = URL.createObjectURL(pdf.output("blob"));
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

  if (isLoading) {
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
            <Button onClick={generatePDF} disabled={isGenerating}>
              {isGenerating ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Download className="h-4 w-4 mr-2" />
              )}
              Download PDF
            </Button>
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
                      className="bg-white p-10 shadow-lg max-w-[210mm] mx-auto text-[13px] leading-relaxed"
                      style={{ fontFamily: "Arial, Helvetica, sans-serif", color: "#1a1a1a" }}
                    >
                      {/* Header: Company + Invoice title */}
                      <div className="flex justify-between items-start mb-10">
                        <div>
                          <h1 className="text-2xl font-bold" style={{ color: "#1e3a5f" }}>
                            {companyName}
                          </h1>
                          {address && <p className="text-sm text-gray-500 mt-1">{address}</p>}
                          {adminEmail && <p className="text-sm text-gray-500">{adminEmail}</p>}
                          <p className="text-sm text-gray-500">Tel: 0562 700 208</p>
                        </div>
                        <div className="text-right">
                          <h2 className="text-xl font-bold uppercase tracking-wider" style={{ color: "#1e3a5f" }}>
                            Factuur
                          </h2>
                        </div>
                      </div>

                      {/* Invoice meta + Customer address */}
                      <div className="grid grid-cols-2 gap-8 mb-8">
                        <div>
                          <p className="text-xs uppercase text-gray-400 font-semibold mb-1">Factuuradres</p>
                          <p className="font-semibold">{billingName}</p>
                          {billingAddress.map((line, i) => (
                            <p key={i}>{line}</p>
                          ))}
                          {request.billing_vat_number && (
                            <p className="text-sm text-gray-500 mt-1">BTW-nr: {request.billing_vat_number}</p>
                          )}
                        </div>
                        <div className="text-right">
                          <div className="space-y-1 text-sm">
                            <div className="flex justify-end gap-4">
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
                      <table className="w-full border-collapse mb-6">
                        <thead>
                          <tr style={{ backgroundColor: "#1e3a5f", color: "#ffffff" }}>
                            <th className="text-left py-2 px-3 text-xs uppercase font-semibold">Omschrijving</th>
                            <th className="text-right py-2 px-3 text-xs uppercase font-semibold w-24">Aantal</th>
                            <th className="text-right py-2 px-3 text-xs uppercase font-semibold w-28">Prijs</th>
                            <th className="text-right py-2 px-3 text-xs uppercase font-semibold w-28">Bedrag</th>
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
                                    className="py-2 px-3 font-semibold text-xs uppercase tracking-wider border-b"
                                    style={{ backgroundColor: "#f1f5f9", color: "#475569" }}
                                  >
                                    {catLabel}
                                  </td>
                                </tr>
                                {catItems.map((item) => {
                                  const isPerPerson = item.price_type === "per_person";
                                  const unitPrice = getItemPrice(item);
                                  const lineTotal = getItemTotal(item);

                                  return (
                                    <tr key={item.id} className="border-b border-gray-100">
                                      <td className="py-2 px-3">
                                        <p className="font-medium">{item.block_name}</p>
                                        {item.admin_price_notes && (
                                          <p className="text-xs text-gray-500">{item.admin_price_notes}</p>
                                        )}
                                        <p className="text-xs text-gray-400">{item.provider_name}</p>
                                      </td>
                                      <td className="py-2 px-3 text-right">
                                        {isPerPerson ? request.number_of_people : 1}
                                      </td>
                                      <td className="py-2 px-3 text-right">
                                        {formatCurrency(unitPrice)}
                                        {isPerPerson && (
                                          <span className="text-xs text-gray-400 ml-1">p.p.</span>
                                        )}
                                      </td>
                                      <td className="py-2 px-3 text-right font-medium">
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
                                  className="py-2 px-3 font-semibold text-xs uppercase tracking-wider border-b"
                                  style={{ backgroundColor: "#f1f5f9", color: "#475569" }}
                                >
                                  Logies
                                </td>
                              </tr>
                              <tr className="border-b border-gray-100">
                                <td className="py-2 px-3">
                                  <p className="font-medium">{accommodationQuote.accommodation_name}</p>
                                  <p className="text-xs text-gray-400">{accommodationQuote.partner_name}</p>
                                  {accommodationNights > 0 && (
                                    <p className="text-xs text-gray-400">{accommodationNights} {accommodationNights === 1 ? "nacht" : "nachten"}</p>
                                  )}
                                </td>
                                <td className="py-2 px-3 text-right">1</td>
                                <td className="py-2 px-3 text-right">
                                  {formatCurrency(accommodationQuote.price_total)}
                                  <span className="text-xs text-gray-400 ml-1">totaal</span>
                                </td>
                                <td className="py-2 px-3 text-right font-medium">
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
                                  className="py-2 px-3 font-semibold text-xs uppercase tracking-wider border-b"
                                  style={{ backgroundColor: "#f1f5f9", color: "#475569" }}
                                >
                                  Extra's bij logies
                                </td>
                              </tr>
                              {accommodationExtras.map((extra, idx) => {
                                const extraTotal = getExtraTotal(extra);
                                const isFixed = extra.pricing_type === "fixed";

                                return (
                                  <tr key={`extra-${idx}`} className="border-b border-gray-100">
                                    <td className="py-2 px-3">
                                      <p className="font-medium">{extra.name}</p>
                                      {extra.description && (
                                        <p className="text-xs text-gray-500">{extra.description}</p>
                                      )}
                                    </td>
                                    <td className="py-2 px-3 text-right">
                                      {isFixed ? 1 : extra.quantity}
                                    </td>
                                    <td className="py-2 px-3 text-right">
                                      {formatCurrency(extra.unit_price)}
                                      {!isFixed && (
                                        <span className="text-xs text-gray-400 ml-1">p.p.</span>
                                      )}
                                    </td>
                                    <td className="py-2 px-3 text-right font-medium">
                                      {formatCurrency(extraTotal)}
                                    </td>
                                  </tr>
                                );
                              })}
                            </>
                          )}

                          {/* Coordination fee */}
                          {totals.bureauFee > 0 && (
                            <>
                              <tr>
                                <td
                                  colSpan={4}
                                  className="py-2 px-3 font-semibold text-xs uppercase tracking-wider border-b"
                                  style={{ backgroundColor: "#f1f5f9", color: "#475569" }}
                                >
                                  Coördinatie
                                </td>
                              </tr>
                              <tr className="border-b border-gray-100">
                                <td className="py-2 px-3">
                                  <p className="font-medium">Coördinatiekosten</p>
                                  <p className="text-xs text-gray-400">{request.number_of_people} personen</p>
                                </td>
                                <td className="py-2 px-3 text-right">1</td>
                                <td className="py-2 px-3 text-right">{formatCurrency(totals.bureauFee)}</td>
                                <td className="py-2 px-3 text-right font-medium">{formatCurrency(totals.bureauFee)}</td>
                              </tr>
                            </>
                          )}
                        </tbody>
                      </table>

                      {/* Totals */}
                      <div className="flex justify-end mb-8">
                        <div className="w-72">
                          <div className="flex justify-between py-1 text-sm">
                            <span className="text-gray-600">Subtotaal excl. BTW</span>
                            <span>{formatCurrency(totals.totalExclVat)}</span>
                          </div>
                          {totals.vatLines.map((line) => (
                            <div key={line.rate} className="flex justify-between py-1 text-sm text-gray-500">
                              <span>BTW ({line.rate}%)</span>
                              <span>{formatCurrency(line.vatAmount)}</span>
                            </div>
                          ))}
                          <div
                            className="flex justify-between py-2 text-lg font-bold mt-1 border-t-2"
                            style={{ borderColor: "#1e3a5f", color: "#1e3a5f" }}
                          >
                            <span>Totaal incl. BTW</span>
                            <span>{formatCurrency(totals.totalInclVat)}</span>
                          </div>
                        </div>
                      </div>

                      {/* Payment info */}
                      <div className="p-4 rounded-lg mb-6" style={{ backgroundColor: "#f8fafc", border: "1px solid #e2e8f0" }}>
                        <p className="font-semibold text-sm mb-1">Betalingsgegevens</p>
                        <p className="text-sm">
                          Gelieve het totaalbedrag van {formatCurrency(totals.totalInclVat)} over te maken
                          vóór {format(dueDate, "d MMMM yyyy", { locale: nl })} naar:
                        </p>
                        <div className="mt-2 text-sm">
                          <p>IBAN: <span className="font-mono font-semibold">{iban}</span></p>
                          <p>T.n.v.: {companyName}</p>
                          <p>O.v.v.: {invoiceNumber}</p>
                        </div>
                      </div>

                      {/* Notes */}
                      {notes && (
                        <div className="mb-6 text-sm text-gray-600">
                          <p className="font-semibold text-gray-700 mb-1">Opmerkingen</p>
                          <p className="whitespace-pre-line">{notes}</p>
                        </div>
                      )}

                      {/* Footer */}
                      <div className="border-t pt-4 text-xs text-gray-400">
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
    </>
  );
};

export default AdminInvoicePreview;
