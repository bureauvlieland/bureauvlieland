import { ReactNode, forwardRef } from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { cn } from "@/lib/utils";

interface ProgramSectionProps {
  id: string;
  title: string;
  icon: ReactNode;
  badge?: ReactNode;
  defaultOpen?: boolean;
  children: ReactNode;
  className?: string;
  value?: string;
}

export const ProgramSection = forwardRef<HTMLDivElement, ProgramSectionProps>(
  ({ id, title, icon, badge, defaultOpen, children, className, value }, ref) => {
    return (
      <div ref={ref} id={id} className={cn("scroll-mt-20", className)}>
        <Accordion
          type="single"
          collapsible
          defaultValue={defaultOpen ? value || id : undefined}
        >
          <AccordionItem value={value || id} className="border rounded-lg bg-card shadow-sm">
            <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-muted/50 rounded-t-lg [&[data-state=open]]:rounded-b-none">
              <div className="flex items-center gap-3 flex-1">
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  {icon}
                </div>
                <span className="font-semibold text-base">{title}</span>
                {badge}
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-4 pb-4 pt-2">
              {children}
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>
    );
  }
);

ProgramSection.displayName = "ProgramSection";
