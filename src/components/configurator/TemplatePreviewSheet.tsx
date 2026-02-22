import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Clock, Users } from "lucide-react";
import { useTemplateWithItems } from "@/hooks/useProgramTemplates";
import type { ProgramTemplate } from "@/types/programTemplate";

interface TemplatePreviewSheetProps {
  templateId: string | null;
  numberOfPeople: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUseTemplate: (template: ProgramTemplate) => void;
}

export const TemplatePreviewSheet = ({
  templateId,
  numberOfPeople,
  open,
  onOpenChange,
  onUseTemplate,
}: TemplatePreviewSheetProps) => {
  const { data: template, isLoading } = useTemplateWithItems(templateId);

  const getDayLabel = (dayIndex: number) => {
    return `Dag ${dayIndex + 1}`;
  };


  // Group items by day
  const itemsByDay = template?.items?.reduce((acc, item) => {
    const day = item.day_index;
    if (!acc[day]) acc[day] = [];
    acc[day].push(item);
    return acc;
  }, {} as Record<number, typeof template.items>);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-lg overflow-y-auto">
        {isLoading ? (
          <div className="animate-pulse space-y-4 py-6">
            <div className="h-6 bg-muted rounded w-2/3" />
            <div className="h-4 bg-muted rounded w-1/2" />
            <div className="h-32 bg-muted rounded" />
          </div>
        ) : template ? (
          <>
            <SheetHeader className="pb-4">
              <SheetTitle className="text-xl">{template.name}</SheetTitle>
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  {template.duration_days === 1
                    ? "1 dag"
                    : `${template.duration_days} dagen`}
                </span>
                <span className="flex items-center gap-1">
                  <Users className="h-4 w-4" />
                  {numberOfPeople} personen
                </span>
              </div>
            </SheetHeader>

            {template.description && (
              <p className="text-muted-foreground text-sm mb-6">
                {template.description}
              </p>
            )}

            <Separator className="my-4" />

            {/* Timeline per day */}
            <div className="space-y-6">
              {Object.entries(itemsByDay || {}).map(([dayIndex, items]) => (
                <div key={dayIndex}>
                  <h3 className="font-semibold text-sm text-foreground mb-3">
                    {getDayLabel(parseInt(dayIndex))}
                  </h3>
                  <div className="space-y-3">
                    {items?.sort((a, b) => a.sort_order - b.sort_order).map((item) => (
                      <div
                        key={item.id}
                        className="flex items-start gap-3 p-3 rounded-lg bg-muted/50"
                      >
                        <div className="text-sm font-medium text-primary min-w-[50px]">
                          {item.preferred_time || "—"}
                        </div>
                        <div className="flex-1">
                          <div className="font-medium text-sm">
                            {item.block?.name || item.block_id}
                          </div>
                          {item.block?.short_description && (
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {item.block.short_description}
                            </p>
                          )}
                          {item.block?.duration && (
                            <Badge variant="outline" className="mt-1.5 text-xs">
                              <Clock className="h-3 w-3 mr-1" />
                              {item.block.duration}
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <Separator className="my-6" />

            <p className="text-sm text-muted-foreground mb-4">
              Na uw aanvraag ontvangt u een voorstel met definitieve tijden en prijzen.
            </p>

            <Button
              className="w-full"
              size="lg"
              onClick={() => onUseTemplate(template)}
            >
              Gebruik dit programma
            </Button>
          </>
        ) : (
          <div className="py-12 text-center text-muted-foreground">
            Template niet gevonden
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
};
