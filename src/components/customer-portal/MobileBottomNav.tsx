import { cn } from "@/lib/utils";
import { Calendar, MapPin, Sparkles, ClipboardList } from "lucide-react";

export type BottomNavView = "today" | "program" | "map" | "practical";

interface MobileBottomNavProps {
  active: BottomNavView;
  onChange: (view: BottomNavView) => void;
  /** Toon een rood puntje op een tab (bv. nieuwe acties) */
  badges?: Partial<Record<BottomNavView, boolean>>;
}

const items: { id: BottomNavView; label: string; icon: typeof Calendar }[] = [
  { id: "today", label: "Vandaag", icon: Sparkles },
  { id: "program", label: "Programma", icon: Calendar },
  { id: "map", label: "Kaart", icon: MapPin },
  { id: "practical", label: "Praktisch", icon: ClipboardList },
];

export const MobileBottomNav = ({ active, onChange, badges }: MobileBottomNavProps) => {
  return (
    <nav
      className="fixed bottom-0 inset-x-0 z-50 bg-background/95 backdrop-blur border-t md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      role="tablist"
      aria-label="Snelnavigatie"
    >
      <div className="grid grid-cols-4">
        {items.map((it) => {
          const Icon = it.icon;
          const isActive = active === it.id;
          return (
            <button
              key={it.id}
              onClick={() => onChange(it.id)}
              role="tab"
              aria-selected={isActive}
              className={cn(
                "relative flex flex-col items-center justify-center gap-0.5 py-2.5 text-[11px] transition-colors",
                isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className={cn("h-5 w-5", isActive && "stroke-[2.5]")} />
              <span className={cn(isActive && "font-medium")}>{it.label}</span>
              {badges?.[it.id] && (
                <span className="absolute top-1.5 right-1/2 translate-x-4 h-2 w-2 rounded-full bg-destructive" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
