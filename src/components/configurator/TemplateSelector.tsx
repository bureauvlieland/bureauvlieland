import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Sparkles, ChevronLeft, Clock, Users, CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTemplatesByDuration } from "@/hooks/useProgramTemplates";
import fallbackImage from "@/assets/vlieland-beach.jpg";
import { TemplatePreviewSheet } from "./TemplatePreviewSheet";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import type { ProgramTemplate } from "@/types/programTemplate";

interface TemplateSelectorProps {
  durationDays: number;
  numberOfPeople: number;
  onSelectTemplate: (template: ProgramTemplate) => void;
  onStartEmpty: () => void;
  onBack: () => void;
  inspirationMode?: boolean;
  onPeopleChange?: (n: number) => void;
  onDatesChange?: (dates: Date[]) => void;
}

export const TemplateSelector = ({
  durationDays,
  numberOfPeople,
  onSelectTemplate,
  onStartEmpty,
  onBack,
  inspirationMode = false,
  onPeopleChange,
  onDatesChange,
}: TemplateSelectorProps) => {
  const [localPeople, setLocalPeople] = useState(numberOfPeople || 20);
  const [localDates, setLocalDates] = useState<Date[]>([]);
  const [previewTemplate, setPreviewTemplate] = useState<string | null>(null);

  const effectiveDuration = localDates.length > 1 ? localDates.length : durationDays;
  const { data: templates = [], isLoading } = useTemplatesByDuration(effectiveDuration);

  const showInlineBasics = !inspirationMode && !!onPeopleChange;

  const handlePeopleChange = (val: string) => {
    const n = parseInt(val) || 0;
    setLocalPeople(n);
    onPeopleChange?.(n);
  };

  const handleDateSelect = (dates: Date[] | undefined) => {
    const selected = dates || [];
    setLocalDates(selected);
    onDatesChange?.(selected);
  };

  const getDurationLabel = (days: number) => {
    if (days === 1) return "1 dag";
    return `${days} dagen`;
  };

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto text-center py-12">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/2 mx-auto" />
          <div className="h-4 bg-muted rounded w-1/3 mx-auto" />
          <div className="grid sm:grid-cols-2 gap-4 mt-8">
            <div className="h-48 bg-muted rounded" />
            <div className="h-48 bg-muted rounded" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto animate-in fade-in slide-in-from-right-4 duration-300">
      <div className="text-center mb-6">
        <h2 className="text-2xl md:text-3xl font-display font-bold text-foreground mb-2">
          {inspirationMode
            ? "Ter inspiratie: bekijk een voorbeeldprogramma"
            : "Kies een voorbeeldprogramma"}
        </h2>
        <p className="text-muted-foreground">
          {inspirationMode
            ? "Kies een programma dat u aanspreekt, of ga direct verder"
            : "Pas het naar wens aan, of start leeg"}
        </p>
      </div>

      {/* Inline basics picker */}
      {showInlineBasics && (
        <Card className="mb-6 border-primary/20 bg-primary/[0.02]">
          <CardContent className="p-4">
            <div className="flex flex-wrap items-end gap-4">
              <div className="flex-1 min-w-[140px]">
                <label className="text-sm font-medium text-foreground mb-1.5 block">
                  <Users className="inline h-3.5 w-3.5 mr-1 text-muted-foreground" />
                  Aantal personen
                </label>
                <Input
                  type="number"
                  min={1}
                  value={localPeople}
                  onChange={(e) => handlePeopleChange(e.target.value)}
                  className="h-9"
                />
              </div>
              <div className="flex-1 min-w-[200px]">
                <label className="text-sm font-medium text-foreground mb-1.5 block">
                  <CalendarIcon className="inline h-3.5 w-3.5 mr-1 text-muted-foreground" />
                  Datum(s)
                </label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-full justify-start text-left font-normal h-9", !localDates.length && "text-muted-foreground")}>
                      {localDates.length > 0
                        ? localDates.map(d => format(d, "EEE d MMM", { locale: nl })).join(" – ")
                        : "Kies datum(s)"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="multiple"
                      selected={localDates}
                      onSelect={handleDateSelect}
                      disabled={(date) => date < new Date()}
                      className={cn("p-3 pointer-events-auto")}
                      locale={nl}
                    />
                  </PopoverContent>
                </Popover>
              </div>
              {localDates.length > 1 && (
                <p className="text-xs text-muted-foreground w-full">
                  {localDates.length} dagen geselecteerd — templates worden gefilterd
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid sm:grid-cols-2 gap-4 mb-6">
        {templates.map((template) => (
          <Card
            key={template.id}
            className="overflow-hidden hover:border-primary/50 transition-all duration-200 group cursor-pointer"
            onClick={() => setPreviewTemplate(template.id)}
          >
            <div className="aspect-[16/9] overflow-hidden bg-muted">
              <img
                src={template.image_url || fallbackImage}
                alt={template.name}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
            </div>
            <CardContent className="p-4">
              <div className="mb-2">
                <h3 className="font-semibold text-lg text-foreground">
                  {template.name}
                </h3>
              </div>
              
              <div className="flex items-center gap-3 text-sm text-muted-foreground mb-3">
                <span className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" />
                  {getDurationLabel(template.duration_days)}
                </span>
              </div>

              <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
                {template.short_description}
              </p>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={(e) => {
                    e.stopPropagation();
                    setPreviewTemplate(template.id);
                  }}
                >
                  Bekijk
                </Button>
                <Button
                  size="sm"
                  className="flex-1"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectTemplate(template);
                  }}
                >
                  {inspirationMode ? "Dit spreekt mij aan" : "Gebruik"}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}

        {/* Start empty option */}
        <Card
          className={cn(
            "group relative overflow-hidden border-2 border-dashed border-primary/30 hover:border-primary hover:shadow-lg transition-all duration-300 cursor-pointer flex items-center justify-center bg-gradient-to-br from-primary/5 via-transparent to-accent/10",
            templates.length === 0 && "sm:col-span-2"
          )}
          onClick={onStartEmpty}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-accent/15 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <CardContent className="relative z-10 p-8 text-center">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 group-hover:bg-primary/20 flex items-center justify-center mx-auto mb-5 transition-all duration-300 group-hover:scale-110 group-hover:rotate-3">
              <Sparkles className="h-7 w-7 text-primary transition-transform duration-300 group-hover:scale-110" />
            </div>
            <h3 className="font-display font-bold text-xl mb-2 group-hover:text-primary transition-colors duration-200">{inspirationMode ? "Overslaan" : "Start leeg"}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {inspirationMode
                ? "Ga direct verder zonder voorbeeldprogramma"
                : "Stel zelf uw programma samen uit alle beschikbare activiteiten"}
            </p>
            <div className="mt-4 inline-flex items-center gap-1.5 text-xs font-medium text-primary opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              Aan de slag →
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-between pt-4">
        <Button variant="ghost" onClick={onBack} className="gap-2">
          <ChevronLeft className="h-4 w-4" />
          Terug
        </Button>
      </div>

      {/* Template Preview Sheet */}
      <TemplatePreviewSheet
        templateId={previewTemplate}
        numberOfPeople={localPeople || numberOfPeople}
        open={!!previewTemplate}
        onOpenChange={(open) => !open && setPreviewTemplate(null)}
        onUseTemplate={(template) => {
          setPreviewTemplate(null);
          onSelectTemplate(template);
        }}
      />
    </div>
  );
};
