import { useState, useRef, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Helmet } from "react-helmet";
import { format, addDays } from "date-fns";
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
  Building2,
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
}

interface ProgramItem {
  id: string;
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

  // Form state
  const defaultValidUntil = addDays(new Date(), 14);
  const [validUntil, setValidUntil] = useState<Date>(defaultValidUntil);
  const [personalMessage, setPersonalMessage] = useState("");

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
        .single();

      if (requestError) throw requestError;
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
      setItems(itemsData as ProgramItem[]);
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

  const calculateTotals = () => {
    const itemsTotal = items.reduce((sum, item) => sum + getItemPrice(item), 0);
    const bureauFee = calculateBureauFee(request?.number_of_people || 0);
    
    // Prijzen zijn per persoon en inclusief BTW
    const subtotalInclVat = (itemsTotal * (request?.number_of_people || 1)) + bureauFee;
    
    // Terugrekenen van BTW (prijzen zijn al inclusief 21% BTW)
    const subtotalExclVat = subtotalInclVat / 1.21;
    const vatAmount = subtotalInclVat - subtotalExclVat;
    
    return { 
      itemsTotal, 
      bureauFee, 
      subtotalInclVat,   // Totaal incl. BTW
      subtotalExclVat,   // Totaal excl. BTW
      vatAmount,         // BTW-bedrag
    };
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
                                <th className="py-2 text-right">Prijs p.p.</th>
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
                                  <td className="py-3 text-right text-sm font-medium">
                                    {formatCurrency(getItemPrice(item))}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ))}

                      {/* Totals */}
                      <div className="border-t-2 border-[#1e3a5f] pt-4 mt-6">
                        <div className="flex justify-between text-sm mb-1">
                          <span>Subtotaal ({request.number_of_people} personen) incl. BTW</span>
                          <span>{formatCurrency(totals.subtotalInclVat - totals.bureauFee)}</span>
                        </div>
                        {totals.bureauFee > 0 && (
                          <div className="flex justify-between text-sm mb-1">
                            <span>Coördinatiekosten</span>
                            <span>{formatCurrency(totals.bureauFee)}</span>
                          </div>
                        )}
                        <Separator className="my-2" />
                        <div className="flex justify-between text-sm mb-1">
                          <span>Subtotaal excl. BTW</span>
                          <span>{formatCurrency(totals.subtotalExclVat)}</span>
                        </div>
                        <div className="flex justify-between text-sm mb-2 text-gray-500">
                          <span>BTW (21%)</span>
                          <span>{formatCurrency(totals.vatAmount)}</span>
                        </div>
                        <div className="flex justify-between font-bold text-lg text-[#1e3a5f]">
                          <span>Totaal incl. BTW</span>
                          <span>{formatCurrency(totals.subtotalInclVat)}</span>
                        </div>
                      </div>

                      {/* Validity */}
                      <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-lg text-sm">
                        <p className="font-semibold text-amber-800">
                          Dit voorstel is geldig tot{" "}
                          {format(validUntil, "d MMMM yyyy", { locale: nl })}
                        </p>
                        <p className="text-amber-700 mt-1">
                          Na deze datum kunnen wij de beschikbaarheid niet garanderen.
                        </p>
                      </div>

                      {/* Footer */}
                      <div className="mt-8 pt-4 border-t text-xs text-gray-500">
                        <div className="flex justify-between">
                          <div>
                            <p className="font-semibold text-gray-700">Bureau Vlieland</p>
                            <p>hallo@bureauvlieland.nl | 0562-452700</p>
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
