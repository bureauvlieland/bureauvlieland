import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Sparkles, ChevronLeft, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTemplatesByDuration } from "@/hooks/useProgramTemplates";
import { TemplatePreviewSheet } from "./TemplatePreviewSheet";
import type { ProgramTemplate } from "@/types/programTemplate";

interface TemplateSelectorProps {
  durationDays: number;
  numberOfPeople: number;
  onSelectTemplate: (template: ProgramTemplate) => void;
  onStartEmpty: () => void;
  onBack: () => void;
}

export const TemplateSelector = ({
  durationDays,
  numberOfPeople,
  onSelectTemplate,
  onStartEmpty,
  onBack,
}: TemplateSelectorProps) => {
  const { data: templates = [], isLoading } = useTemplatesByDuration(durationDays);
  const [previewTemplate, setPreviewTemplate] = useState<string | null>(null);

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
      <div className="text-center mb-8">
        <h2 className="text-2xl md:text-3xl font-display font-bold text-foreground mb-2">
          Wilt u een idee hoe een dag op Vlieland eruit kan zien?
        </h2>
        <p className="text-muted-foreground">
          Bekijk een van onze voorbeeldprogramma's, of stel zelf iets samen
        </p>
      </div>

      <div className="grid sm:grid-cols-2 gap-4 mb-6">
        {templates.map((template) => (
          <Card
            key={template.id}
            className="overflow-hidden hover:border-primary/50 transition-all duration-200 group cursor-pointer"
            onClick={() => setPreviewTemplate(template.id)}
          >
            {template.image_url && (
              <div className="aspect-[16/9] overflow-hidden bg-muted">
                <img
                  src={template.image_url}
                  alt={template.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              </div>
            )}
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
                  Gebruik
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
            <h3 className="font-display font-bold text-xl mb-2 group-hover:text-primary transition-colors duration-200">Start leeg</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Stel zelf uw programma samen uit alle beschikbare activiteiten
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
        numberOfPeople={numberOfPeople}
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
