import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, ArrowRight, Check, Loader2 } from "lucide-react";
import { StepBasics } from "./steps/StepBasics";
import { StepType } from "./steps/StepType";
import { StepRooms } from "./steps/StepRooms";
import { StepWishes } from "./steps/StepWishes";
import { StepContact } from "./steps/StepContact";
import { WizardSummary } from "./WizardSummary";
import type { AccommodationWizardData } from "@/types/accommodation";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";

const STEPS = [
  { id: 1, title: "Datum & Gasten", description: "Wanneer en met hoeveel personen?" },
  { id: 2, title: "Accommodatietype", description: "Wat voor verblijf zoekt u?" },
  { id: 3, title: "Kamerverdeling", description: "Hoeveel en welke kamers?" },
  { id: 4, title: "Wensen", description: "Locatie, faciliteiten en budget" },
  { id: 5, title: "Contactgegevens", description: "Hoe kunnen we u bereiken?" },
];

const defaultFormData: AccommodationWizardData = {
  arrival_date: undefined,
  departure_date: undefined,
  number_of_guests: 20,
  accommodation_type: "no_preference",
  room_count: 10,
  room_occupancy: "2",
  room_types: [],
  location_preference: [],
  facilities_required: [],
  budget_range: "",
  special_requests: "",
  customer_name: "",
  customer_email: "",
  customer_phone: "",
  customer_company: "",
  wants_activities: false,
};

interface InitialData {
  arrival_date?: Date;
  departure_date?: Date;
  number_of_guests?: number;
}

interface AccommodationWizardProps {
  onSuccess?: (token: string) => void;
  initialData?: InitialData;
}

export const AccommodationWizard = ({ onSuccess, initialData }: AccommodationWizardProps) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<AccommodationWizardData>(() => {
    // Merge initial data with defaults
    if (initialData) {
      return {
        ...defaultFormData,
        ...initialData,
      };
    }
    return defaultFormData;
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isComplete, setIsComplete] = useState(false);

  const progress = (currentStep / STEPS.length) * 100;

  const updateFormData = (updates: Partial<AccommodationWizardData>) => {
    setFormData((prev) => ({ ...prev, ...updates }));
  };

  const canProceed = (): boolean => {
    switch (currentStep) {
      case 1:
        return !!(formData.arrival_date && formData.departure_date && formData.number_of_guests > 0);
      case 2:
        return !!formData.accommodation_type;
      case 3:
        return formData.room_count > 0;
      case 4:
        return true; // All optional
      case 5:
        return !!(formData.customer_name && formData.customer_email && formData.customer_phone);
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (currentStep < STEPS.length) {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const handleSubmit = async () => {
    if (!canProceed()) return;

    setIsSubmitting(true);
    try {
      const { data, error } = await supabase
        .from("accommodation_requests")
        .insert({
          customer_name: formData.customer_name.trim(),
          customer_email: formData.customer_email.trim().toLowerCase(),
          customer_phone: formData.customer_phone.trim(),
          customer_company: formData.customer_company.trim() || null,
          arrival_date: format(formData.arrival_date!, "yyyy-MM-dd"),
          departure_date: format(formData.departure_date!, "yyyy-MM-dd"),
          number_of_guests: formData.number_of_guests,
          accommodation_type: formData.accommodation_type,
          room_count: formData.room_count,
          room_occupancy: formData.room_occupancy,
          room_types: formData.room_types,
          location_preference: formData.location_preference,
          facilities_required: formData.facilities_required,
          budget_range: formData.budget_range || null,
          special_requests: formData.special_requests.trim() || null,
          wants_activities: formData.wants_activities,
          status: "submitted",
        })
        .select("id, customer_token")
        .single();

      if (error) throw error;

      // Send confirmation emails
      try {
        await supabase.functions.invoke("send-accommodation-request", {
          body: { accommodationRequestId: data.id },
        });
      } catch (emailError) {
        console.error("Failed to send confirmation emails:", emailError);
        // Don't fail the whole submission if emails fail
      }

      setIsComplete(true);
      toast.success("Uw aanvraag is succesvol verzonden!");
      
      if (onSuccess && data?.customer_token) {
        onSuccess(data.customer_token);
      }
    } catch (error) {
      console.error("Error submitting accommodation request:", error);
      toast.error("Er is iets misgegaan. Probeer het opnieuw.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isComplete) {
    return (
      <Card className="max-w-2xl mx-auto">
        <CardContent className="pt-8 pb-8 text-center">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <Check className="w-8 h-8 text-primary" />
          </div>
          <h2 className="text-2xl font-bold mb-4">Aanvraag ontvangen!</h2>
          <p className="text-muted-foreground mb-6">
            Bedankt voor uw aanvraag, {formData.customer_name}. Wij gaan voor u op zoek 
            naar de beste verblijfsmogelijkheden op Vlieland.
          </p>
          <div className="bg-muted/50 rounded-lg p-4 mb-6 text-left">
            <h3 className="font-medium mb-2">Wat gebeurt er nu?</h3>
            <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
              <li>Wij beoordelen uw aanvraag</li>
              <li>Wij vragen offertes aan bij geschikte accommodaties</li>
              <li>U ontvangt de verzamelde offertes per e-mail</li>
              <li>U kiest de optie die het beste past</li>
            </ol>
          </div>
          <p className="text-sm text-muted-foreground">
            U ontvangt binnen 2 werkdagen bericht op <strong>{formData.customer_email}</strong>
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Progress Header */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm text-muted-foreground">
            Stap {currentStep} van {STEPS.length}
          </span>
          <span className="text-sm font-medium">{STEPS[currentStep - 1].title}</span>
        </div>
        <Progress value={progress} className="h-2" />
        
        {/* Step indicators */}
        <div className="hidden md:flex justify-between mt-4">
          {STEPS.map((step) => (
            <div
              key={step.id}
              className={`flex flex-col items-center ${
                step.id === currentStep
                  ? "text-primary"
                  : step.id < currentStep
                  ? "text-primary/60"
                  : "text-muted-foreground"
              }`}
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium mb-1 ${
                  step.id === currentStep
                    ? "bg-primary text-primary-foreground"
                    : step.id < currentStep
                    ? "bg-primary/20 text-primary"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {step.id < currentStep ? <Check className="w-4 h-4" /> : step.id}
              </div>
              <span className="text-xs hidden lg:block">{step.title}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Main Form */}
        <div className="md:col-span-2">
          <Card>
            <CardContent className="pt-6">
              <h2 className="text-xl font-semibold mb-1">{STEPS[currentStep - 1].title}</h2>
              <p className="text-muted-foreground text-sm mb-6">
                {STEPS[currentStep - 1].description}
              </p>

              {currentStep === 1 && (
                <StepBasics formData={formData} updateFormData={updateFormData} />
              )}
              {currentStep === 2 && (
                <StepType formData={formData} updateFormData={updateFormData} />
              )}
              {currentStep === 3 && (
                <StepRooms formData={formData} updateFormData={updateFormData} />
              )}
              {currentStep === 4 && (
                <StepWishes formData={formData} updateFormData={updateFormData} />
              )}
              {currentStep === 5 && (
                <StepContact formData={formData} updateFormData={updateFormData} />
              )}

              {/* Navigation */}
              <div className="flex justify-between mt-8 pt-6 border-t">
                <Button
                  variant="outline"
                  onClick={handleBack}
                  disabled={currentStep === 1}
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Vorige
                </Button>

                {currentStep < STEPS.length ? (
                  <Button onClick={handleNext} disabled={!canProceed()}>
                    Volgende
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                ) : (
                  <Button onClick={handleSubmit} disabled={!canProceed() || isSubmitting}>
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Verzenden...
                      </>
                    ) : (
                      <>
                        Aanvraag verzenden
                        <Check className="w-4 h-4 ml-2" />
                      </>
                    )}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Summary Sidebar */}
        <div className="hidden md:block">
          <WizardSummary formData={formData} currentStep={currentStep} />
        </div>
      </div>
    </div>
  );
};
