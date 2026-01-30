import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Calendar,
  FileText,
  BedDouble,
} from "lucide-react";

interface Section {
  id: string;
  label: string;
  icon: typeof Calendar;
}

interface ProgramNavigationProps {
  className?: string;
  isMultiDay?: boolean;
}

export const ProgramNavigation = ({ className, isMultiDay = false }: ProgramNavigationProps) => {
  const [activeSection, setActiveSection] = useState("program");

  // Build sections dynamically based on whether it's multi-day
  const sections: Section[] = [
    { id: "program", label: "Programma", icon: Calendar },
    ...(isMultiDay ? [{ id: "accommodation", label: "Logies", icon: BedDouble }] : []),
    { id: "billing", label: "Facturatie", icon: FileText },
  ];

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        });
      },
      {
        rootMargin: "-100px 0px -50% 0px",
        threshold: 0,
      }
    );

    sections.forEach(({ id }) => {
      const element = document.getElementById(id);
      if (element) {
        observer.observe(element);
      }
    });

    return () => observer.disconnect();
  }, [isMultiDay]);

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
  };

  return (
    <nav
      className={cn(
        "sticky top-0 z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 border-b",
        className
      )}
    >
      <div className="container mx-auto px-4">
        <div className="flex items-center gap-1 py-2 overflow-x-auto">
          {sections.map(({ id, label, icon: Icon }) => (
            <Button
              key={id}
              variant={activeSection === id ? "secondary" : "ghost"}
              size="sm"
              onClick={() => scrollToSection(id)}
              className={cn(
                "shrink-0",
                activeSection === id && "bg-primary/10 text-primary"
              )}
            >
              <Icon className="h-4 w-4 mr-2" />
              {label}
            </Button>
          ))}
        </div>
      </div>
    </nav>
  );
};
