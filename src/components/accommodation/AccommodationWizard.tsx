import { RESPONSE_TIME } from "@/content/promises";
import { useState, useEffect, useRef, type ReactNode } from "react";
import { Card } from "@/components/ui/card";
import {
  Container,
  Notice,
  Section,
  SectionHeader,
  StepperBar,
  SubmitNote,
  SuccessScreen,
  WizardFooter,
} from "@/components/system";
import { useScrollOnStepChange } from "@/hooks/useScrollOnStepChange";
import { StepBasics } from "./steps/StepBasics";
import { StepType } from "./steps/StepType";
import { StepRooms } from "./steps/StepRooms";
import { StepWishes } from "./steps/StepWishes";
import { StepContact } from "./steps/StepContact";
import { WizardSummary } from "./WizardSummary";
import type { AccommodationWizardData } from "@/types/accommodation";
import { supabase } from "@/integrations/supabase/client";
import { buildAttribution } from "@/lib/entryPageTracker";
import { toast } from "sonner";
import { format } from "date-fns";
import { CART_HANDOFF_KEY, type CartHandoffData } from "@/components/configurator/LogiesSuggestionBanner";
import { usePublishedBuildingBlocks, getBlockById } from "@/hooks/useBuildingBlocks";

/** `label` staat in de stappenbalk, `next` op de knop die naar deze stap leidt. */
const STEPS = [
  { id: 1, key: "basics", label: "Datum en gasten", title: "Wanneer en met hoeveel personen?", description: "Aankomst, vertrek en de grootte van uw groep.", next: "" },
  { id: 2, key: "type", label: "Type verblijf", title: "Wat voor verblijf zoekt u?", description: "Hotel, vakantiewoning, groepsaccommodatie of camping.", next: "Volgende: type verblijf" },
  { id: 3, key: "rooms", label: "Kamers", title: "Hoeveel en welke kamers?", description: "Een schatting is genoeg; de accommodatie denkt mee.", next: "Volgende: kamers" },
  { id: 4, key: "wishes", label: "Wensen", title: "Locatie, verzorging en budget", description: "Alles hier is optioneel, maar helpt ons gericht zoeken.", next: "Volgende: wensen" },
  { id: 5, key: "contact", label: "Gegevens", title: "Hoe kunnen wij u bereiken?", description: "Op dit adres ontvangt u de offertes.", next: "Volgende: uw gegevens" },
];
const STEPPER_STEPS = STEPS.map((s) => ({ key: s.key, label: s.label }));

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
  board_preference: "",
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
  // Contact details for pre-fill from linked program
  customer_name?: string;
  customer_email?: string;
  customer_phone?: string;
  customer_company?: string;
}

interface AccommodationWizardProps {
  onSuccess?: (token: string) => void;
  initialData?: InitialData;
  fromConfigurator?: boolean;
  linkedProgramToken?: string;
  /** Melding boven de eerste stap, bijvoorbeeld "gegevens overgenomen uit uw programma". */
  notice?: ReactNode;
}

export const AccommodationWizard = ({ onSuccess, initialData, fromConfigurator, linkedProgramToken, notice }: AccommodationWizardProps) => {
  const { data: allBlocks = [] } = usePublishedBuildingBlocks();
  const stepperRef = useRef<HTMLDivElement>(null);
  
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<AccommodationWizardData>(() => {
    // Merge initial data with defaults
    if (initialData) {
      return {
        ...defaultFormData,
        arrival_date: initialData.arrival_date,
        departure_date: initialData.departure_date,
        number_of_guests: initialData.number_of_guests || defaultFormData.number_of_guests,
        customer_name: initialData.customer_name || "",
        customer_email: initialData.customer_email || "",
        customer_phone: initialData.customer_phone || "",
        customer_company: initialData.customer_company || "",
      };
    }
    return defaultFormData;
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [portalToken, setPortalToken] = useState<string | null>(null);
  const [cartHandoff, setCartHandoff] = useState<CartHandoffData | null>(null);
  const [linkedProgramId, setLinkedProgramId] = useState<string | null>(null);

  // Fetch program data if linkedProgramToken is provided
  useEffect(() => {
    if (linkedProgramToken) {
      const fetchProgramData = async () => {
        const { data, error } = await supabase
          .from("program_requests")
          .select("id, customer_name, customer_email, customer_phone, customer_company")
          .eq("customer_token", linkedProgramToken)
          .maybeSingle();

        if (error) {
          console.error("Failed to fetch program data:", error);
          return;
        }

        if (data) {
          setLinkedProgramId(data.id);
          // Pre-fill contact details from the linked program
          setFormData(prev => ({
            ...prev,
            customer_name: prev.customer_name || data.customer_name || "",
            customer_email: prev.customer_email || data.customer_email || "",
            customer_phone: prev.customer_phone || data.customer_phone || "",
            customer_company: prev.customer_company || data.customer_company || "",
          }));
        }
      };
      fetchProgramData();
    }
  }, [linkedProgramToken]);

  // Load cart handoff data from sessionStorage
  useEffect(() => {
    if (fromConfigurator) {
      try {
        const stored = sessionStorage.getItem(CART_HANDOFF_KEY);
        if (stored) {
          const data = JSON.parse(stored) as CartHandoffData;
          setCartHandoff(data);
        }
      } catch (e) {
        console.error("Failed to parse cart handoff data:", e);
      }
    }
  }, [fromConfigurator]);

  useScrollOnStepChange(stepperRef, String(currentStep));

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
      // If we have a linked program ID, we need to link to existing program instead of creating new one
      if (linkedProgramId && linkedProgramToken) {
        // Step 1: Insert accommodation request with linked_program_id
        // This bypasses the trigger that creates a new program
        const { data: insertedData, error: insertError } = await supabase
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
            board_preference: formData.board_preference || null,
            budget_range: formData.budget_range || null,
            special_requests: formData.special_requests.trim() || null,
            wants_activities: true, // Already has activities
            linked_program_id: linkedProgramId, // Link to existing program
            status: "submitted",
            attribution: buildAttribution(),
          })
          .select("id, customer_token")
          .single();

        if (insertError) throw insertError;

        // Step 2: Update the existing program to link back to accommodation
        const { error: updateError } = await supabase
          .from("program_requests")
          .update({ linked_accommodation_id: insertedData.id })
          .eq("id", linkedProgramId);

        if (updateError) {
          console.error("Failed to update program link:", updateError);
        }

        // Send confirmation emails
        try {
          await supabase.functions.invoke("send-accommodation-request", {
            body: { accommodationRequestId: insertedData.id },
          });
        } catch (emailError) {
          console.error("Failed to send confirmation emails:", emailError);
        }

        // De bestaande programmapagina is de plek om verder te gaan
        setPortalToken(linkedProgramToken);
        setIsComplete(true);
        window.scrollTo({ top: 0, behavior: "smooth" });

        return;
      }

      // Original flow: Insert the accommodation request (trigger creates linked program)
      const { data: insertedData, error: insertError } = await supabase
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
          board_preference: formData.board_preference || null,
          budget_range: formData.budget_range || null,
          special_requests: formData.special_requests.trim() || null,
          wants_activities: formData.wants_activities || (cartHandoff && cartHandoff.cartItems.length > 0),
          status: "submitted",
          attribution: buildAttribution(),
        })
        .select("id, customer_token")
        .single();

      if (insertError) throw insertError;

      // Step 2: Fetch the linked program (created by AFTER INSERT trigger)
      // Small delay to ensure trigger has completed
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const { data: accommodationWithProgram, error: fetchError } = await supabase
        .from("accommodation_requests")
        .select(`
          id, 
          customer_token,
          linked_program_id,
          linked_program:program_requests!accommodation_requests_linked_program_id_fkey(id, customer_token)
        `)
        .eq("id", insertedData.id)
        .single();

      if (fetchError) {
        console.error("Failed to fetch linked program:", fetchError);
      }

      // If we have cart items from the configurator, create program_request_items
      const linkedProgram = accommodationWithProgram?.linked_program as { id: string; customer_token: string } | null;
      const data = { id: insertedData.id, customer_token: insertedData.customer_token };
      
      if (cartHandoff && cartHandoff.cartItems.length > 0 && linkedProgram) {
        try {
          // Create program request items from cart
          const itemsToInsert = cartHandoff.cartItems.map((cartItem) => {
            const block = getBlockById(allBlocks, cartItem.blockId);
            if (!block) return null;

            return {
              request_id: linkedProgram.id,
              block_id: block.id,
              block_name: block.name,
              block_category: block.category,
              block_type: block.block_type,
              provider_id: block.provider_id || "bureau",
              provider_name: block.provider?.name || "Bureau Vlieland",
              provider_email: block.provider?.email || null,
              day_index: cartItem.dayIndex,
              preferred_time: cartItem.preferredTime,
              customer_notes: cartItem.notes || null,
              price_indication: block.price_adult 
                ? `€${block.price_adult}${block.price_type === "per_person" ? " p.p." : block.price_type === "per_person_per_day" ? " p.p.p.d." : ""}` 
                : "Op aanvraag",
              duration: block.duration || null,
              status: "pending",
            };
          }).filter(Boolean);

          if (itemsToInsert.length > 0) {
            const { error: itemsError } = await supabase
              .from("program_request_items")
              .insert(itemsToInsert);

            if (itemsError) {
              console.error("Failed to create program items:", itemsError);
              // Don't fail the whole submission
            }
          }

          // Clear the cart handoff data
          sessionStorage.removeItem(CART_HANDOFF_KEY);
        } catch (itemsError) {
          console.error("Failed to create program items:", itemsError);
        }
      }

      // Send confirmation emails
      try {
        await supabase.functions.invoke("send-accommodation-request", {
          body: { accommodationRequestId: data.id },
        });
      } catch (emailError) {
        console.error("Failed to send confirmation emails:", emailError);
        // Don't fail the whole submission if emails fail
      }

      // Use the linked program token for the customer portal
      const customerPortalToken = linkedProgram?.customer_token || data.customer_token;
      setPortalToken(customerPortalToken);
      setIsComplete(true);
      window.scrollTo({ top: 0, behavior: "smooth" });

      if (onSuccess && customerPortalToken) {
        onSuccess(customerPortalToken);
      }
    } catch (error) {
      console.error("Error submitting accommodation request:", error);
      toast.error("Er is iets misgegaan. Probeer het opnieuw.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isComplete) {
    const linkedCount = cartHandoff?.cartItems.length ?? 0;

    return (
      <Section spacing="compact">
        <Container size="prose">
          <SuccessScreen
            title="Uw logiesaanvraag is verstuurd"
            intro={`Bedankt, ${formData.customer_name}. Wij vragen offertes aan bij passende accommodaties op Vlieland. ${RESPONSE_TIME.sentence} U ontvangt bericht op ${formData.customer_email}.`}
            primary={portalToken ? { label: "Bekijk uw programmapagina", to: `/mijn-programma/${portalToken}` } : undefined}
            secondary={{ label: "Terug naar de homepage", to: "/" }}
          >
            <div className="space-y-4">
              {linkedCount > 0 && (
                <Notice tone="success" title="Uw programma is ook aangevraagd">
                  {linkedCount === 1
                    ? "De activiteit uit uw programma is gekoppeld aan deze logiesaanvraag."
                    : `De ${linkedCount} activiteiten uit uw programma zijn gekoppeld aan deze logiesaanvraag.`}
                </Notice>
              )}
              <div className="rounded-lg border border-border bg-muted/30 p-4">
                <p className="text-sm font-medium text-foreground">Wat gebeurt er nu?</p>
                <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
                  <li>Wij beoordelen uw aanvraag.</li>
                  <li>Wij vragen offertes aan bij geschikte accommodaties.</li>
                  <li>U ontvangt de verzamelde offertes per e-mail.</li>
                  <li>U kiest de optie die het beste past.</li>
                </ol>
              </div>
            </div>
          </SuccessScreen>
        </Container>
      </Section>
    );
  }

  const step = STEPS[currentStep - 1];
  const isLast = currentStep === STEPS.length;

  return (
    <>
      <StepperBar ref={stepperRef} steps={STEPPER_STEPS} current={step.key} />

      <Section spacing="compact" className="pb-floating">
        <Container size="wide">
          {notice && <div className="mb-6">{notice}</div>}
          <div className="grid gap-6 md:grid-cols-3">
            <div className="md:col-span-2">
              <Card className="p-5 sm:p-6">
                <SectionHeader as="h2" size="md" weight="medium" title={step.title} intro={step.description} className="mb-6" />

                {currentStep === 1 && <StepBasics formData={formData} updateFormData={updateFormData} />}
                {currentStep === 2 && <StepType formData={formData} updateFormData={updateFormData} />}
                {currentStep === 3 && <StepRooms formData={formData} updateFormData={updateFormData} />}
                {currentStep === 4 && <StepWishes formData={formData} updateFormData={updateFormData} />}
                {currentStep === 5 && (
                  <StepContact
                    formData={formData}
                    updateFormData={updateFormData}
                    hideActivitiesOption={!!linkedProgramToken}
                  />
                )}

                <WizardFooter
                  className="mt-8 border-t border-border"
                  onBack={currentStep > 1 ? handleBack : undefined}
                  onNext={isLast ? handleSubmit : handleNext}
                  nextLabel={isLast ? "Aanvraag versturen" : STEPS[currentStep].next}
                  nextDisabled={!canProceed()}
                  nextLoading={isSubmitting}
                  note={isLast ? <SubmitNote /> : undefined}
                />
              </Card>
            </div>

            <aside className="hidden md:block">
              <WizardSummary formData={formData} currentStep={currentStep} />
            </aside>
          </div>
        </Container>
      </Section>
    </>
  );
};
