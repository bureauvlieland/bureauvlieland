import { useState, useRef, useEffect } from "react";
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
  Send,
  Loader2,
  FileText,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { calculateBureauFee } from "@/types/buildingBlock";

interface ProgramRequest {
  id: string;
  reference_number: string | null;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  customer_company: string | null;
  number_of_people: number;
  selected_dates: string[];
  quote_valid_until: string | null;
  quote_personal_message: string | null;
  linked_accommodation_id: string | null;
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
  item_quote_status: string | null;
  admin_price_override: number | null;
  admin_price_notes: string | null;
  quoted_price: number | null;
  price_type: string | null;
}

interface AccommodationQuoteData {
  id: string;
  accommodation_name: string;
  partner_name: string;
  price_total: number;
  price_per_person_per_night: number | null;
  price_includes_vat: boolean;
  vat_rate: number;
  arrival_date: string;
  departure_date: string;
  nights: number;
}

interface AccommodationExtraData {
  id: string;
  name: string;
  description: string | null;
  quantity: number;
  unit_price: number;
  pricing_type: string;
  price_includes_vat: boolean;
  vat_rate: number;
}

const AdminQuotePreview = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const pdfRef = useRef<HTMLDivElement>(null);

  const [request, setRequest] = useState<ProgramRequest | null>(null);
  const [items, setItems] = useState<ProgramItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [vatRateMap, setVatRateMap] = useState<Record<string, number>>({});
  const [accommodationQuote, setAccommodationQuote] = useState<AccommodationQuoteData | null>(null);
  const [accommodationExtras, setAccommodationExtras] = useState<AccommodationExtraData[]>([]);

  // Form state
  const defaultValidUntil = addDays(new Date(), 14);
  const [validUntil, setValidUntil] = useState<Date>(defaultValidUntil);
  const [personalMessage, setPersonalMessage] = useState("");

  useEffect(() => {
    if (!id) return;
    let fetched = false;
    const doFetch = () => {
      if (!fetched) { fetched = true; fetchData(); }
    };
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) doFetch();
      else if (event === 'SIGNED_OUT') navigate("/admin/projecten");
    });
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) doFetch();
    });
    return () => subscription.unsubscribe();
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
        toast.error("Aanvraag niet gevonden");
        navigate("/admin/projecten");
        return;
      }
      setRequest(requestData as ProgramRequest);

      // Set existing values if present
      if (requestData.quote_valid_until) {
        setValidUntil(new Date(requestData.quote_valid_until));
      }
      if (requestData.quote_personal_message) {
        setPersonalMessage(requestData.quote_personal_message);
      }

      const { data: itemsData, error: itemsError } = await supabase
        .from("program_request_items")
        .select("*")
        .eq("request_id", id)
        .neq("status", "cancelled")
        .order("day_index", { ascending: true });

      if (itemsError) throw itemsError;
      const fetchedItems = itemsData as ProgramItem[];
      setItems(fetchedItems);

      // Fetch VAT rates from building_blocks
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

      // Fetch linked accommodation quote + extras
      if (requestData.linked_accommodation_id) {
        const { data: accReq } = await supabase
          .from("accommodation_requests")
          .select("id, arrival_date, departure_date")
          .eq("id", requestData.linked_accommodation_id)
          .maybeSingle();

        if (accReq) {
          const { data: quoteData } = await supabase
            .from("accommodation_quotes")
            .select("*, partner:partners(name)")
            .eq("request_id", accReq.id)
            .in("status", ["selected", "submitted"])
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();

          if (quoteData) {
            const nights = differenceInCalendarDays(
              new Date(accReq.departure_date),
              new Date(accReq.arrival_date)
            );
            setAccommodationQuote({
              id: quoteData.id,
              accommodation_name: quoteData.accommodation_name,
              partner_name: (quoteData.partner as any)?.name || "Onbekend",
              price_total: quoteData.price_total,
              price_per_person_per_night: quoteData.price_per_person_per_night,
              price_includes_vat: quoteData.price_includes_vat ?? true,
              vat_rate: quoteData.vat_rate ?? 9,
              arrival_date: accReq.arrival_date,
              departure_date: accReq.departure_date,
              nights,
            });

            // Fetch extras
            const { data: extrasData } = await supabase
              .from("accommodation_quote_extras")
              .select("*")
              .eq("quote_id", quoteData.id)
              .order("sort_order", { ascending: true });

            if (extrasData) {
              setAccommodationExtras(
                extrasData.map((e) => ({
                  id: e.id,
                  name: e.name,
                  description: e.description,
                  quantity: e.quantity,
                  unit_price: e.unit_price,
                  pricing_type: e.pricing_type,
                  price_includes_vat: e.price_includes_vat ?? true,
                  vat_rate: e.vat_rate ?? 9,
                }))
              );
            }
          }
        }
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Fout bij laden offerte");
      navigate("/admin/projecten");
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("nl-NL", {
      style: "currency",
      currency: "EUR",
    }).format(amount);
  };

  const getItemPrice = (item: ProgramItem) => {
    return item.admin_price_override ?? item.quoted_price ?? 0;
  };

  const getItemTotal = (item: ProgramItem) => {
    const unitPrice = getItemPrice(item);
    if (item.price_type === 'per_person') {
      return unitPrice * (request?.number_of_people || 1);
    }
    return unitPrice;
  };

  const getItemVatRate = (item: ProgramItem): number => {
    if (item.block_id && vatRateMap[item.block_id] !== undefined) {
      return vatRateMap[item.block_id];
    }
    return 21;
  };

  const getExtraTotal = (extra: AccommodationExtraData) => {
    if (extra.pricing_type === 'fixed') return extra.unit_price;
    return extra.unit_price * extra.quantity;
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

    // Add accommodation quote to VAT groups
    let accommodationTotal = 0;
    if (accommodationQuote) {
      const rate = accommodationQuote.vat_rate;
      vatGroups[rate] = (vatGroups[rate] || 0) + accommodationQuote.price_total;
      accommodationTotal += accommodationQuote.price_total;
    }

    // Add accommodation extras to VAT groups
    let extrasTotal = 0;
    accommodationExtras.forEach(extra => {
      const total = getExtraTotal(extra);
      const rate = extra.vat_rate;
      vatGroups[rate] = (vatGroups[rate] || 0) + total;
      extrasTotal += total;
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

    const itemsTotal = items.reduce((sum, item) => sum + getItemTotal(item), 0);
    const totalInclVat = totalExclVat + totalVat;

    return { itemsTotal, bureauFee, totalExclVat, totalVat, totalInclVat, vatLines, accommodationTotal, extrasTotal };
  };

  // Helper function to convert blob to base64
  const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = (reader.result as string).split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  const generatePDF = async (): Promise<Blob | null> => {
    if (!pdfRef.current) return null;

    setIsGenerating(true);
    try {
      const canvas = await html2canvas(pdfRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
      });

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      const imgWidth = 210; // A4 width in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      // Add pages if content is taller than A4
      let heightLeft = imgHeight;
      let position = 0;
      const pageHeight = 297; // A4 height in mm

      pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      return pdf.output("blob");
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast.error("Fout bij genereren PDF");
      return null;
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = async () => {
    const pdfBlob = await generatePDF();
    if (pdfBlob && request) {
      const url = URL.createObjectURL(pdfBlob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `Offerte-${request.reference_number || request.customer_name}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success("PDF gedownload");
    }
  };

  const handleSend = async () => {
    if (!request) return;

    setIsSending(true);
    try {
      // Generate PDF as base64
      const pdfBlob = await generatePDF();
      if (!pdfBlob) {
        toast.error("Kon PDF niet genereren");
        setIsSending(false);
        return;
      }
      
      const pdfBase64 = await blobToBase64(pdfBlob);
      const pdfFilename = `Voorstel-${request.reference_number || request.customer_name}.pdf`;

      const { error } = await supabase.functions.invoke("send-quote-offer", {
        body: {
          requestId: request.id,
          validUntil: format(validUntil, "yyyy-MM-dd"),
          personalMessage: personalMessage || undefined,
          origin: window.location.origin,
          pdfBase64,
          pdfFilename,
        },
      });

      if (error) throw error;

      toast.success("Offerte met PDF verstuurd naar klant");
      navigate(`/admin/projecten/${request.id}`);
    } catch (error) {
      console.error("Error sending quote:", error);
      toast.error("Fout bij versturen offerte");
    } finally {
      setIsSending(false);
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
  const groupedByDay = items.reduce((acc, item) => {
    const day = item.day_index;
    if (!acc[day]) acc[day] = [];
    acc[day].push(item);
    return acc;
  }, {} as Record<number, ProgramItem[]>);

  return (
    <>
      <Helmet>
        <title>Offerte Preview | Admin | Bureau Vlieland</title>
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
                <h1 className="text-2xl font-bold">Offerte Preview</h1>
                <p className="text-muted-foreground">
                  {request.customer_name} - {request.reference_number}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={handleDownload}
                disabled={isGenerating}
              >
                {isGenerating ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Download className="h-4 w-4 mr-2" />
                )}
                Download PDF
              </Button>
              <Button onClick={handleSend} disabled={isSending}>
                {isSending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Send className="h-4 w-4 mr-2" />
                )}
                Verstuur naar klant
              </Button>
            </div>
          </div>

          <div className="grid lg:grid-cols-3 gap-6">
            {/* Settings sidebar */}
            <Card className="lg:order-2">
              <CardContent className="p-6 space-y-6">
                <div>
                  <h3 className="font-semibold mb-4">Verstuur-instellingen</h3>
                  
                  {/* Validity date */}
                  <div className="space-y-2 mb-4">
                    <Label>Offerte geldig tot</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !validUntil && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {validUntil
                            ? format(validUntil, "d MMMM yyyy", { locale: nl })
                            : "Selecteer datum"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={validUntil}
                          onSelect={(date) => date && setValidUntil(date)}
                          disabled={(date) => date < new Date()}
                          initialFocus
                          className="pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  {/* Personal message */}
                  <div className="space-y-2">
                    <Label>Persoonlijke tekst (optioneel)</Label>
                    <Textarea
                      placeholder={`Beste ${request.customer_name},\n\nHierbij ons maatwerkvoorstel...`}
                      value={personalMessage}
                      onChange={(e) => setPersonalMessage(e.target.value)}
                      rows={5}
                    />
                    <p className="text-xs text-muted-foreground">
                      Deze tekst wordt toegevoegd aan de e-mail.
                    </p>
                  </div>
                </div>

                <Separator />

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Ontvanger:</span>
                    <span>{request.customer_email}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Activiteiten:</span>
                    <span>{items.length} items</span>
                  </div>
                  {accommodationQuote && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Logies:</span>
                      <span>{accommodationQuote.accommodation_name}</span>
                    </div>
                  )}
                  {accommodationExtras.length > 0 && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Logies extra's:</span>
                      <span>{accommodationExtras.length} items</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* PDF Preview */}
            <div className="lg:col-span-2 lg:order-1">
              <Card>
                <CardContent className="p-0">
                  <div className="bg-slate-100 p-4 rounded-t-lg border-b flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">PDF Preview</span>
                  </div>
                  
                  <div className="p-4 overflow-auto max-h-[800px]">
                    {/* PDF Content - This gets rendered to PDF */}
                    <div
                      ref={pdfRef}
                      className="bg-white p-8 shadow-lg max-w-[210mm] mx-auto"
                      style={{ fontFamily: "Arial, sans-serif" }}
                    >
                      {/* Header */}
                      <div className="flex justify-between items-start mb-8">
                        <div>
                          <h1 className="text-2xl font-bold text-[#1e3a5f]">
                            Bureau Vlieland
                          </h1>
                          <p className="text-sm text-gray-500 mt-1">
                            Maatwerkvoorstel
                          </p>
                        </div>
                        <div className="text-right text-sm">
                          <p className="font-semibold">{request.reference_number}</p>
                          <p className="text-gray-500">
                            {format(new Date(), "d MMMM yyyy", { locale: nl })}
                          </p>
                        </div>
                      </div>

                      {/* Customer info */}
                      <div className="bg-gray-50 p-4 rounded-lg mb-6">
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <p className="text-gray-500">Klant</p>
                            <p className="font-semibold">{request.customer_name}</p>
                            {request.customer_company && (
                              <p>{request.customer_company}</p>
                            )}
                          </div>
                          <div>
                            <p className="text-gray-500">Evenement details</p>
                            <p className="font-semibold">
                              {request.number_of_people} personen
                            </p>
                            <p>
                              {request.selected_dates
                                .map((d) => format(new Date(d), "d MMM", { locale: nl }))
                                .join(" - ")}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Program by day */}
                      <h2 className="text-lg font-semibold mb-4 text-[#1e3a5f]">
                        Programma-overzicht
                      </h2>

                      {Object.entries(groupedByDay).map(([dayIndex, dayItems]) => (
                        <div key={dayIndex} className="mb-6">
                          <h3 className="font-semibold text-sm bg-[#1e3a5f] text-white px-3 py-2 rounded">
                            Dag {Number(dayIndex) + 1} -{" "}
                            {format(
                              new Date(request.selected_dates[Number(dayIndex)]),
                              "d MMMM yyyy",
                              { locale: nl }
                            )}
                          </h3>
                          <table className="w-full mt-2">
                            <thead>
                              <tr className="text-left text-xs text-gray-500 border-b">
                                <th className="py-2">Tijd</th>
                                <th className="py-2">Activiteit</th>
                                <th className="py-2 text-right">Prijs</th>
                              </tr>
                            </thead>
                            <tbody>
                              {dayItems.map((item) => (
                                <tr key={item.id} className="border-b border-gray-100">
                                  <td className="py-3 text-sm w-20">
                                    {item.preferred_time || "-"}
                                  </td>
                                  <td className="py-3">
                                    <p className="font-medium text-sm">{item.block_name}</p>
                                    {item.admin_price_notes && (
                                      <p className="text-xs text-gray-500">
                                        {item.admin_price_notes}
                                      </p>
                                    )}
                                    <p className="text-xs text-gray-400">
                                      {item.provider_name}
                                    </p>
                                  </td>
                                  <td className="py-3 text-right text-sm font-medium whitespace-nowrap">
                                    {formatCurrency(getItemPrice(item))}
                                    <span className="text-xs text-gray-400 ml-1">
                                      {item.price_type === 'per_person' ? 'p.p.' : 'totaal'}
                                    </span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ))}

                      {/* Logies section */}
                      {accommodationQuote && (
                        <div className="mb-6">
                          <h2 className="text-lg font-semibold mb-4 text-[#1e3a5f]">
                            Logies
                          </h2>
                          <div className="bg-gray-50 p-4 rounded-lg mb-4">
                            <div className="flex justify-between items-start">
                              <div>
                                <p className="font-semibold">{accommodationQuote.accommodation_name}</p>
                                <p className="text-sm text-gray-500">{accommodationQuote.partner_name}</p>
                                <p className="text-sm text-gray-500 mt-1">
                                  {format(new Date(accommodationQuote.arrival_date), "d MMM", { locale: nl })} -{" "}
                                  {format(new Date(accommodationQuote.departure_date), "d MMM yyyy", { locale: nl })}
                                  {" · "}{accommodationQuote.nights} {accommodationQuote.nights === 1 ? "nacht" : "nachten"}
                                </p>
                                {accommodationQuote.price_per_person_per_night && (
                                  <p className="text-xs text-gray-400 mt-1">
                                    {formatCurrency(accommodationQuote.price_per_person_per_night)} p.p.p.n.
                                  </p>
                                )}
                              </div>
                              <div className="text-right">
                                <p className="font-semibold">{formatCurrency(accommodationQuote.price_total)}</p>
                                <p className="text-xs text-gray-400">incl. {accommodationQuote.vat_rate}% BTW</p>
                              </div>
                            </div>
                          </div>

                          {/* Accommodation extras */}
                          {accommodationExtras.length > 0 && (
                            <>
                              <h3 className="font-semibold text-sm bg-[#1e3a5f] text-white px-3 py-2 rounded">
                                Extra's bij logies
                              </h3>
                              <table className="w-full mt-2">
                                <thead>
                                  <tr className="text-left text-xs text-gray-500 border-b">
                                    <th className="py-2">Omschrijving</th>
                                    <th className="py-2 text-right">Aantal</th>
                                    <th className="py-2 text-right">Stukprijs</th>
                                    <th className="py-2 text-right">Subtotaal</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {accommodationExtras.map((extra) => (
                                    <tr key={extra.id} className="border-b border-gray-100">
                                      <td className="py-3">
                                        <p className="font-medium text-sm">{extra.name}</p>
                                        {extra.description && (
                                          <p className="text-xs text-gray-500">{extra.description}</p>
                                        )}
                                      </td>
                                      <td className="py-3 text-right text-sm">
                                        {extra.pricing_type === 'fixed' ? '-' : extra.quantity}
                                      </td>
                                      <td className="py-3 text-right text-sm">
                                        {formatCurrency(extra.unit_price)}
                                        <span className="text-xs text-gray-400 ml-1">
                                          {extra.pricing_type === 'per_person' ? 'p.p.' : 'totaal'}
                                        </span>
                                      </td>
                                      <td className="py-3 text-right text-sm font-medium">
                                        {formatCurrency(getExtraTotal(extra))}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </>
                          )}
                        </div>
                      )}

                      {/* Totals */}
                      <div className="border-t-2 border-[#1e3a5f] pt-4 mt-6">
                        <div className="flex justify-between text-sm mb-1">
                          <span>Subtotaal activiteiten incl. BTW</span>
                          <span>{formatCurrency(totals.itemsTotal)}</span>
                        </div>
                        {accommodationQuote && (
                          <div className="flex justify-between text-sm mb-1">
                            <span>Subtotaal logies incl. BTW</span>
                            <span>{formatCurrency(totals.accommodationTotal)}</span>
                          </div>
                        )}
                        {totals.extrasTotal > 0 && (
                          <div className="flex justify-between text-sm mb-1">
                            <span>Subtotaal logies extra's incl. BTW</span>
                            <span>{formatCurrency(totals.extrasTotal)}</span>
                          </div>
                        )}
                        {totals.bureauFee > 0 && (
                          <div className="flex justify-between text-sm mb-1">
                            <span>Coördinatiekosten</span>
                            <span>{formatCurrency(totals.bureauFee)}</span>
                          </div>
                        )}
                        <Separator className="my-2" />
                        <div className="flex justify-between text-sm mb-1">
                          <span>Subtotaal excl. BTW</span>
                          <span>{formatCurrency(totals.totalExclVat)}</span>
                        </div>
                        {totals.vatLines.map((line) => (
                          <div key={line.rate} className="flex justify-between text-sm mb-1 text-gray-500">
                            <span>BTW ({line.rate}%)</span>
                            <span>{formatCurrency(line.vatAmount)}</span>
                          </div>
                        ))}
                        <div className="flex justify-between font-bold text-lg text-[#1e3a5f]">
                          <span>Totaal incl. BTW</span>
                          <span>{formatCurrency(totals.totalInclVat)}</span>
                        </div>
                      </div>

                      {/* Validity */}
                      <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-lg text-sm">
                        <p className="font-semibold text-amber-800">
                          Dit voorstel is geldig tot{" "}
                          {format(validUntil, "d MMMM yyyy", { locale: nl })}
                        </p>
                        <p className="text-amber-700 mt-1">
                          Als u akkoord bent met dit programmavoorstel, kunt u dit bevestigen 
                          in uw klantomgeving. Hierna worden de leveranciers op de hoogte gebracht.
                        </p>
                      </div>

                      {/* Footer */}
                      <div className="mt-8 pt-4 border-t text-xs text-gray-500">
                        <div className="flex justify-between">
                          <div>
                            <p className="font-semibold text-gray-700">Bureau Vlieland</p>
                            <p>hallo@bureauvlieland.nl | 0562 700 208</p>
                          </div>
                          <div className="text-right">
                            <p>Prijzen zijn onder voorbehoud.</p>
                            <p>Facturatie kan geschieden door partners.</p>
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

export default AdminQuotePreview;
