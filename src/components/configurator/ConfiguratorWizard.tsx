import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { 
  Users, 
  Calendar as CalendarIcon, 
  ChevronRight, 
  ChevronLeft,
  Home,
  ArrowRight,
  Check
} from "lucide-react";

import teamBeach from "@/assets/team-beach.jpg";
import dunesGroupImg from "@/assets/dunes-group.jpg";
import beachActivityImg from "@/assets/beach-activity.jpg";
import { format, addDays } from "date-fns";
import { nl } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { TemplateSelector } from "./TemplateSelector";
import { useTemplateWithItems } from "@/hooks/useProgramTemplates";
import type { ProgramTemplate } from "@/types/programTemplate";

export type ProgramType = 
  | "zakelijk" 
  | "prive" 
  | "los";

interface ProgramTypeOption {
  id: ProgramType;
  label: string;
  description: string;
  examples: string;
  image: string;
}

const programTypes: ProgramTypeOption[] = [
  {
    id: "zakelijk",
    label: "Zakelijk",
    description: "Wij organiseren een passend programma voor uw bedrijf of organisatie",
    examples: "Teamuitje, heisessie, incentive of bedrijfsevenement",
    image: teamBeach,
  },
  {
    id: "prive",
    label: "Privé",
    description: "Een onvergetelijk verblijf op Vlieland met familie of vrienden",
    examples: "Familieweekend, vriendengroep, jubileum of bruiloft",
    image: dunesGroupImg,
  },
  {
    id: "los",
    label: "Losse activiteiten",
    description: "Boek één of meerdere activiteiten zonder compleet programma",
    examples: "Ik wil alleen losse activiteiten boeken",
    image: beachActivityImg,
  },
];

interface WizardData {
  programType: ProgramType | null;
  numberOfPeople: number;
  selectedDates: Date[];
  wantsAccommodation: boolean | null;
  selectedTemplate: ProgramTemplate | null;
}

interface ConfiguratorWizardProps {
  onComplete: (data: WizardData) => void;
  onTemplateSelected: (template: ProgramTemplate, data: WizardData) => void;
  initialData?: Partial<WizardData>;
}

export const ConfiguratorWizard = ({ onComplete, onTemplateSelected, initialData }: ConfiguratorWizardProps) => {
  const [step, setStep] = useState(1);
  const [data, setData] = useState<WizardData>({
    programType: initialData?.programType ?? null,
    numberOfPeople: initialData?.numberOfPeople ?? 20,
    selectedDates: initialData?.selectedDates ?? [],
    wantsAccommodation: initialData?.wantsAccommodation ?? null,
    selectedTemplate: null,
  });
  const [pendingTemplate, setPendingTemplate] = useState<ProgramTemplate | null>(null);

  // Fetch full template with items when a template is selected
  const { data: fullTemplate } = useTemplateWithItems(pendingTemplate?.id || null);

  const minDate = addDays(new Date(), 7);
  const isMultiDay = data.selectedDates.length > 1;

  const canProceedStep1 = data.programType !== null;
  const canProceedStep2 = data.numberOfPeople >= 8 && data.selectedDates.length > 0;
  const canProceedStep3 = data.wantsAccommodation !== null;

  // When full template is loaded, trigger the callback
  const handleTemplateLoaded = (template: ProgramTemplate) => {
    if (fullTemplate && fullTemplate.id === template.id) {
      onTemplateSelected(fullTemplate, data);
    } else {
      setPendingTemplate(template);
    }
  };

  // Effect to handle when fullTemplate loads
  if (fullTemplate && pendingTemplate && fullTemplate.id === pendingTemplate.id) {
    setPendingTemplate(null);
    onTemplateSelected(fullTemplate, data);
  }

  const handleNext = () => {
    if (step === 2) {
      // After step 2, go to template selection (step 2.5)
      setStep(2.5);
    } else if (step === 2.5) {
      // From template selection, skip if they chose "start empty" - handled by onStartEmpty
      if (isMultiDay) {
        setStep(3);
      } else {
        onComplete({ ...data, wantsAccommodation: false });
      }
    } else if (step === 3) {
      onComplete(data);
    } else {
      setStep(step + 1);
    }
  };

  const handleBack = () => {
    if (step === 2.5) {
      setStep(2);
    } else if (step === 3) {
      setStep(2.5);
    } else {
      setStep(step - 1);
    }
  };

  const handleStartEmpty = () => {
    if (isMultiDay) {
      setStep(3);
    } else {
      onComplete({ ...data, wantsAccommodation: false });
    }
  };

  const handleDateSelect = (dates: Date[] | undefined) => {
    if (dates) {
      // Limit to 7 days max
      const limitedDates = dates.slice(0, 7).sort((a, b) => a.getTime() - b.getTime());
      setData({ ...data, selectedDates: limitedDates });
    }
  };

  // Calculate progress step for indicator
  const getProgressStep = () => {
    if (step <= 1) return 1;
    if (step <= 2.5) return 2;
    return 3;
  };

  const progressStep = getProgressStep();

  return (
    <div className="max-w-2xl mx-auto">
      {/* Progress indicator */}
      <div className="flex items-center justify-center gap-2 mb-8">
        {[1, 2, 3].map((s) => (
          <div
            key={s}
            className={cn(
              "h-2 rounded-full transition-all duration-300",
              s === progressStep ? "w-12 bg-primary" : "w-8",
              s < progressStep ? "bg-primary/60" : s > progressStep ? "bg-muted" : ""
            )}
          />
        ))}
      </div>

      {/* Step 1: Program Type */}
      {step === 1 && (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
          <div className="text-center mb-8">
           <h2 className="text-2xl md:text-3xl font-display font-bold text-foreground mb-2">
              Waar mogen we u mee helpen?
            </h2>
            <p className="text-muted-foreground">
              We stemmen het aanbod graag af op uw situatie
            </p>
          </div>

          <div className="grid sm:grid-cols-3 gap-4">
            {programTypes.map((type) => (
              <div
                key={type.id}
                className={cn(
                  "relative rounded-xl overflow-hidden cursor-pointer transition-all duration-300 group",
                  "h-[200px] sm:h-[220px]",
                  data.programType === type.id
                    ? "ring-3 ring-primary ring-offset-2 ring-offset-background shadow-lg"
                    : "hover:shadow-md"
                )}
                onClick={() => setData({ ...data, programType: type.id })}
              >
                <img
                  src={type.image}
                  alt={type.label}
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className={cn(
                  "absolute inset-0 transition-colors duration-300",
                  data.programType === type.id
                    ? "bg-primary/60"
                    : "bg-black/45 group-hover:bg-black/55"
                )} />
                {data.programType === type.id && (
                  <div className="absolute top-3 right-3 bg-primary text-primary-foreground rounded-full p-1">
                    <Check className="h-4 w-4" />
                  </div>
                )}
                <div className="absolute inset-0 p-4 flex flex-col justify-end">
                  <h3 className="font-semibold text-lg text-white">{type.label}</h3>
                  <p className="text-sm text-white/90 mb-1">{type.description}</p>
                  <p className="text-xs text-white/70">{type.examples}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-end pt-4">
            <Button
              onClick={handleNext}
              disabled={!canProceedStep1}
              className="gap-2"
              size="lg"
            >
              Volgende
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Step 2: People & Date */}
      {step === 2 && (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
          <div className="text-center mb-8">
            <h2 className="text-2xl md:text-3xl font-display font-bold text-foreground mb-2">
              Wanneer en met hoeveel personen?
            </h2>
            <p className="text-muted-foreground">
              Met deze gegevens kunnen wij de beschikbaarheid checken en een passend voorstel samenstellen
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Number of people */}
            <Card>
              <CardContent className="p-6">
                <Label className="text-base font-medium mb-4 block">
                  <Users className="h-4 w-4 inline mr-2" />
                  Aantal personen
                </Label>
                <div className="flex items-center gap-4">
                  <Input
                    type="number"
                    min={8}
                    max={200}
                    value={data.numberOfPeople}
                    onChange={(e) => setData({ 
                      ...data, 
                      numberOfPeople: Math.max(1, parseInt(e.target.value) || 1) 
                    })}
                    className="w-24 text-center text-lg"
                  />
                  <span className="text-muted-foreground">personen</span>
                </div>
                {data.numberOfPeople < 8 && (
                  <p className="text-sm text-destructive mt-2">
                    Minimaal 8 personen vereist
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Date selection */}
            <Card>
              <CardContent className="p-6">
                <Label className="text-base font-medium mb-4 block">
                  <CalendarIcon className="h-4 w-4 inline mr-2" />
                  Datum(s)
                </Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        data.selectedDates.length === 0 && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {data.selectedDates.length === 0 ? (
                        "Kies datum(s)"
                      ) : data.selectedDates.length === 1 ? (
                        format(data.selectedDates[0], "d MMMM yyyy", { locale: nl })
                      ) : (
                        `${data.selectedDates.length} dagen geselecteerd`
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="multiple"
                      selected={data.selectedDates}
                      onSelect={handleDateSelect}
                      disabled={(date) => date < minDate}
                      initialFocus
                      locale={nl}
                      numberOfMonths={1}
                    />
                    <div className="p-3 border-t text-xs text-muted-foreground">
                      Tip: Selecteer meerdere dagen voor een meerdaags programma
                    </div>
                  </PopoverContent>
                </Popover>

                {data.selectedDates.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {data.selectedDates.map((date, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center gap-1 text-xs bg-primary/10 text-primary px-2 py-1 rounded-full"
                      >
                        {format(date, "d MMM", { locale: nl })}
                      </span>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {isMultiDay && (
            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="p-4 flex items-center gap-3">
                <Home className="h-5 w-5 text-primary" />
                <p className="text-sm text-foreground">
                  U heeft een meerdaags programma. In de volgende stap vragen we of wij ook logies voor u mogen regelen.
                </p>
              </CardContent>
            </Card>
          )}

          <div className="flex justify-between pt-4">
            <Button variant="ghost" onClick={handleBack} className="gap-2">
              <ChevronLeft className="h-4 w-4" />
              Terug
            </Button>
            <Button
              onClick={handleNext}
              disabled={!canProceedStep2}
              className="gap-2"
              size="lg"
            >
              Volgende
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Step 2.5: Template Selection */}
      {step === 2.5 && (
        <TemplateSelector
          durationDays={data.selectedDates.length}
          numberOfPeople={data.numberOfPeople}
          onSelectTemplate={handleTemplateLoaded}
          onStartEmpty={handleStartEmpty}
          onBack={handleBack}
        />
      )}

      {/* Step 3: Accommodation (only for multi-day) */}
      {step === 3 && (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
          <div className="text-center mb-8">
            <h2 className="text-2xl md:text-3xl font-display font-bold text-foreground mb-2">
              Wilt u dat wij ook logies regelen?
            </h2>
            <p className="text-muted-foreground">
              Op Vlieland is het aanbod aan accommodaties beperkt. Wij kennen alle mogelijkheden en helpen u graag aan een geschikte plek.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <Card
              className={cn(
                "cursor-pointer transition-all duration-200 hover:border-primary/50",
                data.wantsAccommodation === true
                  ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                  : "hover:bg-muted/30"
              )}
              onClick={() => setData({ ...data, wantsAccommodation: true })}
            >
              <CardContent className="p-6 text-center">
                <div className={cn(
                  "w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center",
                  data.wantsAccommodation === true 
                    ? "bg-primary text-primary-foreground" 
                    : "bg-muted text-muted-foreground"
                )}>
                  <Home className="h-8 w-8" />
                </div>
                <h3 className="font-semibold text-lg mb-2">Ja, graag</h3>
                <p className="text-sm text-muted-foreground">
                  Wij zoeken passende accommodatie voor uw groep en vragen offertes op bij onze partners.
                </p>
              </CardContent>
            </Card>

            <Card
              className={cn(
                "cursor-pointer transition-all duration-200 hover:border-primary/50",
                data.wantsAccommodation === false
                  ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                  : "hover:bg-muted/30"
              )}
              onClick={() => setData({ ...data, wantsAccommodation: false })}
            >
              <CardContent className="p-6 text-center">
                <div className={cn(
                  "w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center",
                  data.wantsAccommodation === false 
                    ? "bg-primary text-primary-foreground" 
                    : "bg-muted text-muted-foreground"
                )}>
                  <ArrowRight className="h-8 w-8" />
                </div>
                <h3 className="font-semibold text-lg mb-2">Nee, ik regel dit zelf</h3>
                <p className="text-sm text-muted-foreground">
                  U regelt zelf de overnachting of heeft dit al geregeld.
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="flex justify-between pt-4">
            <Button variant="ghost" onClick={handleBack} className="gap-2">
              <ChevronLeft className="h-4 w-4" />
              Terug
            </Button>
            <Button
              onClick={handleNext}
              disabled={!canProceedStep3}
              className="gap-2"
              size="lg"
            >
              Naar het aanbod
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
