import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  ClipboardList,
  Calendar,
  FileText,
  Settings,
  History,
} from "lucide-react";

interface Section {
  id: string;
  label: string;
  icon: typeof ClipboardList;
}

const sections: Section[] = [
  { id: "program", label: "Programma", icon: Calendar },
  { id: "invoicing", label: "Facturatie", icon: FileText },
  { id: "details", label: "Details", icon: Settings },
  { id: "history", label: "Geschiedenis", icon: History },
];

interface ProgramNavigationProps {
  className?: string;
}

export const ProgramNavigation = ({ className }: ProgramNavigationProps) => {
  const [activeSection, setActiveSection] = useState("program");

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
  }, []);

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
