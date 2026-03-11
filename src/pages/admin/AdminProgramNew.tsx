import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet";
import { format, addDays } from "date-fns";
import { nl } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Calendar as CalendarIcon,
  Users,
  FileText,
  Sparkles,
  Loader2,
  User,
  Building2,
  Mail,
  Phone,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { generateCustomerToken, type ProgramType } from "@/types/programRequest";
import { ExistingCustomerSelect, type ExistingCustomer } from "@/components/admin/ExistingCustomerSelect";

type WizardStep = "type" | "customer" | "settings";

interface FormData {
  programType: ProgramType;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  customerCompany: string;
  numberOfPeople: number;
  selectedDates: Date[];
  generalNotes: string;
  quoteValidUntil: Date;
}

const AdminProgramNewContent = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState<WizardStep>("type");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState<FormData>({
    programType: "quote",
    customerName: "",
    customerEmail: "",
    customerPhone: "",
    customerCompany: "",
    numberOfPeople: 20,
    selectedDates: [],
    generalNotes: "",
    quoteValidUntil: addDays(new Date(), 14),
  });

  const steps: { id: WizardStep; title: string; icon: React.ReactNode }[] = [
    { id: "type", title: "Type", icon: <FileText className="h-4 w-4" /> },
    { id: "customer", title: "Klant", icon: <User className="h-4 w-4" /> },
    { id: "settings", title: "Instellingen", icon: <Sparkles className="h-4 w-4" /> },
  ];

  const stepOrder: WizardStep[] = ["type", "customer", "settings"];
  const currentStepIndex = stepOrder.indexOf(currentStep);

  const canProceed = () => {
    switch (currentStep) {
      case "type":
        return true;
      case "customer":
        return (
          formData.customerName.trim() !== "" &&
          formData.customerEmail.trim() !== "" &&
          formData.customerPhone.trim() !== "" &&
          formData.numberOfPeople > 0 &&
          formData.selectedDates.length > 0
        );
      case "settings":
        return formData.quoteValidUntil > new Date();
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (currentStepIndex < stepOrder.length - 1) {
      setCurrentStep(stepOrder[currentStepIndex + 1]);
    }
  };

  const handleBack = () => {
    if (currentStepIndex > 0) {
      setCurrentStep(stepOrder[currentStepIndex - 1]);
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const customerToken = generateCustomerToken();
      
      // Get current admin user
      const { data: { user } } = await supabase.auth.getUser();

      const { data, error } = await supabase
        .from("program_requests")
        .insert({
          customer_token: customerToken,
          customer_name: formData.customerName,
          customer_email: formData.customerEmail,
          customer_phone: formData.customerPhone,
          customer_company: formData.customerCompany || null,
          number_of_people: formData.numberOfPeople,
          selected_dates: formData.selectedDates.map((d) => format(d, "yyyy-MM-dd")),
          general_notes: formData.generalNotes || null,
          program_type: formData.programType,
          quote_status: formData.programType === "quote" ? "concept" : null,
          quote_valid_until: formData.programType === "quote" 
            ? format(formData.quoteValidUntil, "yyyy-MM-dd") 
            : null,
          admin_created_by: user?.id || null,
          status: "active",
        })
        .select()
        .single();

      if (error) throw error;

      toast.success("Programma aangemaakt!");
      navigate(`/admin/aanvragen/${data.id}`);
    } catch (error) {
      console.error("Error creating program:", error);
      toast.error("Er ging iets mis bij het aanmaken");
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateFormData = <K extends keyof FormData>(key: K, value: FormData[K]) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="mb-6">
        <Button
          variant="ghost"
          onClick={() => navigate("/admin/projecten")}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Terug naar projecten
        </Button>
        <h1 className="text-2xl font-bold text-slate-900">Nieuw programma aanmaken</h1>
        <p className="text-slate-600">Maak een nieuw maatwerk- of self-service programma aan</p>
      </div>

      {/* Stepper */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {steps.map((step, index) => {
            const isActive = step.id === currentStep;
            const isComplete = stepOrder.indexOf(step.id) < currentStepIndex;

            return (
              <div key={step.id} className="flex items-center flex-1">
                <div className="flex flex-col items-center flex-1">
                  <div
                    className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center border-2 transition-colors",
                      isComplete
                        ? "bg-primary border-primary text-primary-foreground"
                        : isActive
                        ? "border-primary text-primary bg-primary/10"
                        : "border-slate-200 text-slate-400"
                    )}
                  >
                    {isComplete ? <Check className="h-5 w-5" /> : step.icon}
                  </div>
                  <span
                    className={cn(
                      "text-sm mt-2 font-medium",
                      isActive ? "text-primary" : isComplete ? "text-slate-900" : "text-slate-400"
                    )}
                  >
                    {step.title}
                  </span>
                </div>
                {index < steps.length - 1 && (
                  <div
                    className={cn(
                      "h-0.5 flex-1 mx-4 -mt-6",
                      isComplete ? "bg-primary" : "bg-slate-200"
                    )}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Step content */}
      <Card>
        <CardContent className="pt-6">
          {/* Step 1: Type selection */}
          {currentStep === "type" && (
            <div className="space-y-6">
              <div>
                <CardTitle className="mb-2">Programmatype</CardTitle>
                <CardDescription>
                  Kies hoe dit programma wordt beheerd
                </CardDescription>
              </div>

              <RadioGroup
                value={formData.programType}
                onValueChange={(value) => updateFormData("programType", value as ProgramType)}
                className="grid gap-4"
              >
                <Label
                  htmlFor="quote"
                  className={cn(
                    "flex items-start gap-4 p-4 border rounded-lg cursor-pointer transition-colors",
                    formData.programType === "quote"
                      ? "border-primary bg-primary/5"
                      : "border-slate-200 hover:border-slate-300"
                  )}
                >
                  <RadioGroupItem value="quote" id="quote" className="mt-1" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium">Maatwerk / Offerte</span>
                      <Badge variant="secondary" className="text-xs">Aanbevolen</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Bureau Vlieland stelt het programma samen, verstuurt de offerte en factureert centraal. 
                      Partners ontvangen automatisch aanvraag- en statusmeldingen.
                    </p>
                  </div>
                </Label>

                <Label
                  htmlFor="self_service"
                  className={cn(
                    "flex items-start gap-4 p-4 border rounded-lg cursor-pointer transition-colors",
                    formData.programType === "self_service"
                      ? "border-primary bg-primary/5"
                      : "border-slate-200 hover:border-slate-300"
                  )}
                >
                  <RadioGroupItem value="self_service" id="self_service" className="mt-1" />
                  <div className="flex-1">
                    <span className="font-medium">Self-service</span>
                    <p className="text-sm text-muted-foreground">
                      Standaard flow: partners ontvangen automatische aanvragen, 
                      klant bouwt zelf programma via configurator.
                    </p>
                  </div>
                </Label>
              </RadioGroup>
            </div>
          )}

          {/* Step 2: Customer details */}
          {currentStep === "customer" && (
            <div className="space-y-6">
              <div>
                <CardTitle className="mb-2">Klantgegevens</CardTitle>
                <CardDescription>
                  Selecteer een bestaande klant of voer nieuwe gegevens in
                </CardDescription>
              </div>

              {/* Existing customer selector */}
              <div className="space-y-2">
                <Label>Bestaande klant selecteren</Label>
                <ExistingCustomerSelect
                  selectedEmail={formData.customerEmail || undefined}
                  onSelect={(customer: ExistingCustomer | null) => {
                    if (customer) {
                      setFormData((prev) => ({
                        ...prev,
                        customerName: customer.customer_name,
                        customerEmail: customer.customer_email,
                        customerPhone: customer.customer_phone,
                        customerCompany: customer.customer_company || "",
                      }));
                    }
                    // If null, user wants to enter new customer - keep form as is
                  }}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="customerName">
                    Naam <span className="text-destructive">*</span>
                  </Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="customerName"
                      placeholder="Jan Janssen"
                      value={formData.customerName}
                      onChange={(e) => updateFormData("customerName", e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="customerCompany">Bedrijf</Label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="customerCompany"
                      placeholder="Bedrijfsnaam B.V."
                      value={formData.customerCompany}
                      onChange={(e) => updateFormData("customerCompany", e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="customerEmail">
                    E-mail <span className="text-destructive">*</span>
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="customerEmail"
                      type="email"
                      placeholder="jan@bedrijf.nl"
                      value={formData.customerEmail}
                      onChange={(e) => updateFormData("customerEmail", e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="customerPhone">
                    Telefoon <span className="text-destructive">*</span>
                  </Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="customerPhone"
                      type="tel"
                      placeholder="06-12345678"
                      value={formData.customerPhone}
                      onChange={(e) => updateFormData("customerPhone", e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="numberOfPeople">
                    Aantal personen <span className="text-destructive">*</span>
                  </Label>
                  <div className="relative">
                    <Users className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="numberOfPeople"
                      type="number"
                      min={1}
                      value={formData.numberOfPeople}
                      onChange={(e) => updateFormData("numberOfPeople", parseInt(e.target.value) || 1)}
                      className="pl-10"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>
                    Datum(s) <span className="text-destructive">*</span>
                  </Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          formData.selectedDates.length === 0 && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {formData.selectedDates.length > 0
                          ? `${formData.selectedDates.length} dag(en) geselecteerd`
                          : "Selecteer datum(s)"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="multiple"
                        selected={formData.selectedDates}
                        onSelect={(dates) => updateFormData("selectedDates", dates || [])}
                        disabled={(date) => date < new Date()}
                        initialFocus
                        className="pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                  {formData.selectedDates.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {formData.selectedDates
                        .sort((a, b) => a.getTime() - b.getTime())
                        .map((date) => (
                          <Badge key={date.toISOString()} variant="secondary" className="text-xs">
                            {format(date, "EEE d MMM", { locale: nl })}
                          </Badge>
                        ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="generalNotes">Interne notities</Label>
                <Textarea
                  id="generalNotes"
                  placeholder="Eventuele opmerkingen of wensen..."
                  value={formData.generalNotes}
                  onChange={(e) => updateFormData("generalNotes", e.target.value)}
                  rows={3}
                />
              </div>
            </div>
          )}

          {/* Step 3: Settings (only for quote mode) */}
          {currentStep === "settings" && (
            <div className="space-y-6">
              <div>
                <CardTitle className="mb-2">Offerte-instellingen</CardTitle>
                <CardDescription>
                  {formData.programType === "quote"
                    ? "Stel de geldigheidsdatum van de offerte in"
                    : "Overzicht van het nieuwe programma"}
                </CardDescription>
              </div>

              {formData.programType === "quote" && (
                <div className="space-y-2">
                  <Label>Offerte geldig tot</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full md:w-auto justify-start text-left font-normal",
                          !formData.quoteValidUntil && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {formData.quoteValidUntil
                          ? format(formData.quoteValidUntil, "EEE d MMMM yyyy", { locale: nl })
                          : "Selecteer datum"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={formData.quoteValidUntil}
                        onSelect={(date) => date && updateFormData("quoteValidUntil", date)}
                        disabled={(date) => date < new Date()}
                        initialFocus
                        className="pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                  <p className="text-sm text-muted-foreground">
                    Na deze datum kan de klant niet meer akkoord geven op de offerte.
                  </p>
                </div>
              )}

              {/* Summary */}
              <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                <h4 className="font-medium">Samenvatting</h4>
                <div className="grid gap-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Type:</span>
                    <Badge variant={formData.programType === "quote" ? "default" : "secondary"}>
                      {formData.programType === "quote" ? "Maatwerk" : "Self-service"}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Klant:</span>
                    <span className="font-medium">{formData.customerName}</span>
                  </div>
                  {formData.customerCompany && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Bedrijf:</span>
                      <span>{formData.customerCompany}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">E-mail:</span>
                    <span>{formData.customerEmail}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Personen:</span>
                    <span>{formData.numberOfPeople}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Datum(s):</span>
                    <span>
                      {formData.selectedDates
                        .sort((a, b) => a.getTime() - b.getTime())
                        .map((d) => format(d, "EEE d MMM", { locale: nl }))
                        .join(", ")}
                    </span>
                  </div>
                  {formData.programType === "quote" && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Geldig tot:</span>
                      <span>{format(formData.quoteValidUntil, "d MMMM yyyy", { locale: nl })}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Navigation buttons */}
      <div className="flex justify-between mt-6">
        <Button
          variant="outline"
          onClick={handleBack}
          disabled={currentStepIndex === 0}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Vorige
        </Button>

        {currentStepIndex < stepOrder.length - 1 ? (
          <Button onClick={handleNext} disabled={!canProceed()}>
            Volgende
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        ) : (
          <Button onClick={handleSubmit} disabled={!canProceed() || isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Aanmaken...
              </>
            ) : (
              <>
                <Check className="h-4 w-4 mr-2" />
                Programma aanmaken
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
};

const AdminProgramNew = () => {
  return (
    <AdminLayout>
      <Helmet>
        <title>Nieuw programma | Admin | Bureau Vlieland</title>
      </Helmet>
      <AdminProgramNewContent />
    </AdminLayout>
  );
};

export default AdminProgramNew;
