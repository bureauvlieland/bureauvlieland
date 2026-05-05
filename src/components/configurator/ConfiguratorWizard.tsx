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
  Check,
  Sparkles,
  Wrench,
} from "lucide-react";

import teamBeach from "@/assets/team-beach.jpg";
import dunesGroupImg from "@/assets/dunes-group.jpg";
import { format, addDays } from "date-fns";
import { nl } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { TemplateSelector } from "./TemplateSelector";
import { MaatwerkIntakeForm } from "./MaatwerkIntakeForm";
import { useTemplateWithItems } from "@/hooks/useProgramTemplates";
import type { ProgramTemplate } from "@/types/programTemplate";

export type ProgramType = "zakelijk" | "prive" | "los";

type Track = "laten_regelen" | "voorbeeld" | "zelf_regelen";

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
  const [track, setTrack] = useState<Track | null>(null);
  const [step, setStep] = useState(1);
  const [data, setData] = useState<WizardData>({
    programType: initialData?.programType ?? null,
    numberOfPeople: initialData?.numberOfPeople ?? 20,
    selectedDates: initialData?.selectedDates ?? [],
    wantsAccommodation: initialData?.wantsAccommodation ?? null,
    selectedTemplate: null,
  });
  const [templateInspiration, setTemplateInspiration] = useState<string | null>(null);
  const [pendingTemplate, setPendingTemplate] = useState<ProgramTemplate | null>(null);

  const { data: fullTemplate } = useTemplateWithItems(pendingTemplate?.id || null);

  const minDate = addDays(new Date(), 7);
  const isMultiDay = data.selectedDates.length > 1;

  // For "zelf regelen" track
  const canProceedStep2 = data.numberOfPeople >= 8 && data.selectedDates.length > 0;

  // For "laten regelen" track - combined step with type + people + dates
  const canProceedLatenStep2 =
    data.programType !== null && data.numberOfPeople >= 8 && data.selectedDates.length > 0;

  // Handle template loaded for "zelf regelen"
  if (fullTemplate && pendingTemplate && fullTemplate.id === pendingTemplate.id) {
    setPendingTemplate(null);
    onTemplateSelected(fullTemplate, data);
  }

  const handleTemplateLoaded = (template: ProgramTemplate) => {
    if (fullTemplate && fullTemplate.id === template.id) {
      onTemplateSelected(fullTemplate, data);
    } else {
      setPendingTemplate(template);
    }
  };

  const handleDateSelect = (dates: Date[] | undefined) => {
    if (dates) {
      const limitedDates = dates.slice(0, 7).sort((a, b) => a.getTime() - b.getTime());
      setData({ ...data, selectedDates: limitedDates });
    }
  };

  // --- Track choice (step 1) ---
  const handleTrackSelect = (selectedTrack: Track) => {
    setTrack(selectedTrack);
    setStep(2);
  };

  // --- Navigation ---
  const handleNext = () => {
    if (track === "zelf_regelen") {
      if (step === 2) {
        // start empty for zelf regelen
        onComplete({ ...data, wantsAccommodation: false });
      }
    } else if (track === "voorbeeld") {
      if (step === 2) setStep(2.5); // template selection -> loads into builder
    } else if (track === "laten_regelen") {
      // No template step — go straight to accommodation question (multi-day) or intake
      if (step === 2) {
        if (isMultiDay) setStep(3);
        else setStep(4);
      } else if (step === 3) setStep(4);
    }
  };

  const handleBack = () => {
    if (step === 2) {
      setTrack(null);
      setStep(1);
    } else if (step === 2.5) setStep(2);
    else if (step === 3) setStep(2);
    else if (step === 4) {
      if (isMultiDay) setStep(3);
      else setStep(2);
    }
  };

  const handleStartEmpty = () => {
    // Only relevant for "voorbeeld" track — skip choosing a template, go to empty builder
    onComplete({ ...data, wantsAccommodation: false });
  };

  // Progress
  const getProgressSteps = () => {
    if (track === "laten_regelen") {
      const steps = isMultiDay ? 4 : 3;
      let current = 1;
      if (step >= 2) current = 2;
      if (step >= 2.5) current = isMultiDay ? 2 : 2;
      if (step >= 3) current = 3;
      if (step >= 4) current = steps;
      return { total: steps, current };
    }
    // zelf regelen or choosing
    let current = 1;
    if (step >= 2) current = 2;
    return { total: 2, current };
  };

  const progress = getProgressSteps();

  return (
    <div className="max-w-2xl mx-auto">
      {/* Progress indicator */}
      {track && (
        <div className="flex items-center justify-center gap-2 mb-8">
          {Array.from({ length: progress.total }, (_, i) => i + 1).map((s) => (
            <div
              key={s}
              className={cn(
                "h-2 rounded-full transition-all duration-300",
                s === progress.current ? "w-12 bg-primary" : "w-8",
                s < progress.current ? "bg-primary/60" : s > progress.current ? "bg-muted" : ""
              )}
            />
          ))}
        </div>
      )}

      {/* Step 1: Track Choice */}
      {step === 1 && (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
          <div className="text-center mb-8">
            <h2 className="text-2xl md:text-3xl font-display font-bold text-foreground mb-2">
              Waar mogen we u mee helpen?
            </h2>
            <p className="text-muted-foreground">
              Kies hoe u uw programma op Vlieland wilt samenstellen
            </p>
          </div>

          <div className="grid sm:grid-cols-2 gap-5">
            {/* Laten regelen */}
            <Card
              className="group relative overflow-hidden cursor-pointer transition-all duration-300 hover:shadow-lg hover:border-primary/50 border-2 border-transparent"
              onClick={() => handleTrackSelect("laten_regelen")}
            >
              <div className="aspect-[4/3] overflow-hidden">
                <img
                  src={teamBeach}
                  alt="Bureau Vlieland regelt uw programma"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
              </div>
              <div className="absolute bottom-0 left-0 right-0 p-5 text-white">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                    <Sparkles className="h-4 w-4 text-primary-foreground" />
                  </div>
                  <h3 className="font-display font-bold text-xl">Laten regelen</h3>
                </div>
                <p className="text-sm text-white/90 leading-relaxed">
                  Bureau Vlieland stelt een programma op maat voor u samen. U vertelt ons wat u zoekt, wij doen de rest.
                </p>
              </div>
            </Card>

            {/* Zelf regelen */}
            <Card
              className="group relative overflow-hidden cursor-pointer transition-all duration-300 hover:shadow-lg hover:border-primary/50 border-2 border-transparent"
              onClick={() => handleTrackSelect("zelf_regelen")}
            >
              <div className="aspect-[4/3] overflow-hidden">
                <img
                  src={dunesGroupImg}
                  alt="Stel zelf uw programma samen"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
              </div>
              <div className="absolute bottom-0 left-0 right-0 p-5 text-white">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center">
                    <Wrench className="h-4 w-4 text-accent-foreground" />
                  </div>
                  <h3 className="font-display font-bold text-xl">Zelf regelen</h3>
                </div>
                <p className="text-sm text-white/90 leading-relaxed">
                  Stel zelf uw programma samen uit ons aanbod van activiteiten, catering en vervoer.
                </p>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* Step 2 for "Laten regelen": Type + People + Dates combined */}
      {step === 2 && track === "laten_regelen" && (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
          <div className="text-center mb-6">
            <h2 className="text-2xl md:text-3xl font-display font-bold text-foreground mb-2">
              Vertel ons meer over uw groep
            </h2>
            <p className="text-muted-foreground">
              Met deze gegevens kunnen wij een passend voorstel samenstellen
            </p>
          </div>

          {/* Type selection (compact) */}
          <div>
            <Label className="text-base font-medium mb-3 block">Wat voor gelegenheid?</Label>
            <div className="grid grid-cols-2 gap-3">
              {[
                { id: "zakelijk" as const, label: "Zakelijk", desc: "Teamuitje, heisessie, incentive" },
                { id: "prive" as const, label: "Privé", desc: "Familie, vrienden, jubileum, bruiloft" },
              ].map((type) => (
                <Card
                  key={type.id}
                  className={cn(
                    "cursor-pointer transition-all duration-200",
                    data.programType === type.id
                      ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                      : "hover:border-primary/30"
                  )}
                  onClick={() => setData({ ...data, programType: type.id })}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      {data.programType === type.id && (
                        <Check className="h-4 w-4 text-primary" />
                      )}
                      <h3 className="font-semibold">{type.label}</h3>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{type.desc}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            {/* People */}
            <div className="space-y-2">
              <Label className="text-base font-medium">
                <Users className="h-4 w-4 inline mr-2" />
                Aantal personen
              </Label>
              <div className="flex items-center gap-3">
                <Input
                  type="number"
                  min={8}
                  max={200}
                  value={data.numberOfPeople}
                  onChange={(e) =>
                    setData({ ...data, numberOfPeople: Math.max(1, parseInt(e.target.value) || 1) })
                  }
                  className="w-24 text-center text-lg"
                />
                <span className="text-muted-foreground text-sm">personen</span>
              </div>
              {data.numberOfPeople < 8 && (
                <p className="text-xs text-destructive">Minimaal 8 personen</p>
              )}
            </div>

            {/* Dates */}
            <div className="space-y-2">
              <Label className="text-base font-medium">
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
                    {data.selectedDates.length === 0
                      ? "Kies datum(s)"
                      : data.selectedDates.length === 1
                        ? format(data.selectedDates[0], "d MMMM yyyy", { locale: nl })
                        : `${data.selectedDates.length} dagen geselecteerd`}
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
                <div className="flex flex-wrap gap-1">
                  {data.selectedDates.map((date, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full"
                    >
                      {format(date, "d MMM", { locale: nl })}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-between pt-4">
            <Button variant="ghost" onClick={handleBack} className="gap-2">
              <ChevronLeft className="h-4 w-4" />
              Terug
            </Button>
            <Button onClick={handleNext} disabled={!canProceedLatenStep2} className="gap-2" size="lg">
              Volgende
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Step 2 for "Zelf regelen": People + Dates only */}
      {step === 2 && track === "zelf_regelen" && (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
          <div className="text-center mb-6">
            <h2 className="text-2xl md:text-3xl font-display font-bold text-foreground mb-2">
              Wanneer en met hoeveel personen?
            </h2>
            <p className="text-muted-foreground">
              Zodat wij het aanbod kunnen afstemmen
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
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
                    onChange={(e) =>
                      setData({ ...data, numberOfPeople: Math.max(1, parseInt(e.target.value) || 1) })
                    }
                    className="w-24 text-center text-lg"
                  />
                  <span className="text-muted-foreground">personen</span>
                </div>
                {data.numberOfPeople < 8 && (
                  <p className="text-sm text-destructive mt-2">Minimaal 8 personen vereist</p>
                )}
              </CardContent>
            </Card>

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
                      {data.selectedDates.length === 0
                        ? "Kies datum(s)"
                        : data.selectedDates.length === 1
                          ? format(data.selectedDates[0], "d MMMM yyyy", { locale: nl })
                          : `${data.selectedDates.length} dagen geselecteerd`}
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

          <div className="flex justify-between pt-4">
            <Button variant="ghost" onClick={handleBack} className="gap-2">
              <ChevronLeft className="h-4 w-4" />
              Terug
            </Button>
            <Button onClick={handleNext} disabled={!canProceedStep2} className="gap-2" size="lg">
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
          onSelectTemplate={
            track === "laten_regelen"
              ? (template) => {
                  setTemplateInspiration(template.name);
                  if (isMultiDay) setStep(3);
                  else setStep(4);
                }
              : handleTemplateLoaded
          }
          onStartEmpty={handleStartEmpty}
          onBack={handleBack}
          inspirationMode={track === "laten_regelen"}
        />
      )}

      {/* Step 3: Accommodation (laten regelen, multi-day only) */}
      {step === 3 && track === "laten_regelen" && (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
          <div className="text-center mb-8">
            <h2 className="text-2xl md:text-3xl font-display font-bold text-foreground mb-2">
              Wilt u dat wij ook logies regelen?
            </h2>
            <p className="text-muted-foreground">
              Op Vlieland is het aanbod beperkt. Wij kennen alle mogelijkheden en helpen u graag.
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
                <div
                  className={cn(
                    "w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center",
                    data.wantsAccommodation === true
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  <Home className="h-8 w-8" />
                </div>
                <h3 className="font-semibold text-lg mb-2">Ja, graag</h3>
                <p className="text-sm text-muted-foreground">
                  Wij zoeken passende accommodatie voor uw groep.
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
                <div
                  className={cn(
                    "w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center",
                    data.wantsAccommodation === false
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  <ArrowRight className="h-8 w-8" />
                </div>
                <h3 className="font-semibold text-lg mb-2">Nee, ik regel dit zelf</h3>
                <p className="text-sm text-muted-foreground">
                  U regelt zelf de overnachting.
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
              disabled={data.wantsAccommodation === null}
              className="gap-2"
              size="lg"
            >
              Volgende
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Step 4: Maatwerk Intake Form (laten regelen only) */}
      {step === 4 && track === "laten_regelen" && (
        <MaatwerkIntakeForm
          programType={data.programType as "zakelijk" | "prive"}
          numberOfPeople={data.numberOfPeople}
          selectedDates={data.selectedDates}
          wantsAccommodation={data.wantsAccommodation ?? false}
          templateInspiration={templateInspiration}
          onBack={handleBack}
        />
      )}
    </div>
  );
};
