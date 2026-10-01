import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Container } from "./Container";
import { Pill } from "./Pill";
import type { PillTone } from "./pillVariants";

/**
 * De tabbalk van een portaalscherm (klantportaal fase 1): plakkend bovenaan,
 * op de tokens, met hoogstens één `Pill` per tabblad als status. Op een
 * telefoon scrolt de rij horizontaal; een vervaging aan de rand laat zien
 * dat er meer is. Pijltjestoetsen, Home en End lopen door de tabbladen.
 */
export interface PortalTab {
  key: string;
  label: string;
  icon?: ReactNode;
  /** Eén korte status bij het tabblad. */
  badge?: { label: string; tone?: PillTone } | null;
}

interface PortalTabsProps {
  tabs: PortalTab[];
  current: string;
  onChange: (key: string) => void;
  /** Naam van de balk voor hulptechnologie. */
  label?: string;
  sticky?: boolean;
  className?: string;
}

export const PortalTabs = ({ tabs, current, onChange, label = "Navigatie", sticky = true, className }: PortalTabsProps) => {
  const listRef = useRef<HTMLDivElement>(null);
  const [overflow, setOverflow] = useState({ left: false, right: false });

  // Vervaging alleen waar nog tabbladen buiten beeld staan.
  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    const measure = () => {
      const left = el.scrollLeft > 4;
      const right = el.scrollWidth - el.clientWidth - el.scrollLeft > 4;
      setOverflow((prev) => (prev.left === left && prev.right === right ? prev : { left, right }));
    };
    measure();
    el.addEventListener("scroll", measure, { passive: true });
    const observer = typeof ResizeObserver !== "undefined" ? new ResizeObserver(measure) : null;
    observer?.observe(el);
    return () => {
      el.removeEventListener("scroll", measure);
      observer?.disconnect();
    };
  }, [tabs.length]);

  // Het actieve tabblad in beeld houden op een telefoon.
  useEffect(() => {
    const el = listRef.current?.querySelector<HTMLElement>('[role="tab"][aria-selected="true"]');
    el?.scrollIntoView?.({ block: "nearest", inline: "nearest" });
  }, [current]);

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (!["ArrowRight", "ArrowLeft", "Home", "End"].includes(e.key)) return;
    const items = Array.from(e.currentTarget.querySelectorAll<HTMLButtonElement>('[role="tab"]'));
    if (items.length === 0) return;
    const idx = items.findIndex((t) => t === document.activeElement);
    let next = idx;
    if (e.key === "ArrowRight") next = idx < 0 ? 0 : (idx + 1) % items.length;
    if (e.key === "ArrowLeft") next = idx < 0 ? items.length - 1 : (idx - 1 + items.length) % items.length;
    if (e.key === "Home") next = 0;
    if (e.key === "End") next = items.length - 1;
    e.preventDefault();
    items[next]?.focus();
    const key = items[next]?.dataset.key;
    if (key) onChange(key);
  };

  return (
    <nav
      aria-label={label}
      className={cn(
        "z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80",
        sticky && "sticky top-0",
        className,
      )}
    >
      <Container size="full" className="relative">
        <div
          ref={listRef}
          role="tablist"
          aria-label={label}
          onKeyDown={handleKeyDown}
          className="flex items-center gap-1 overflow-x-auto py-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {tabs.map((tab) => {
            const active = tab.key === current;
            return (
              <button
                key={tab.key}
                type="button"
                role="tab"
                data-key={tab.key}
                aria-selected={active}
                tabIndex={active ? 0 : -1}
                onClick={() => onChange(tab.key)}
                className={cn(
                  "inline-flex h-10 shrink-0 items-center gap-2 whitespace-nowrap rounded-sm px-3 text-sm font-medium transition-colors duration-fast coarse:min-h-11",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                  active ? "bg-accent-soft text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                {tab.icon && <span className="inline-flex [&_svg]:h-4 [&_svg]:w-4" aria-hidden="true">{tab.icon}</span>}
                {tab.label}
                {tab.badge && <Pill tone={tab.badge.tone ?? "neutral"}>{tab.badge.label}</Pill>}
              </button>
            );
          })}
        </div>
        <div
          aria-hidden="true"
          className={cn(
            "pointer-events-none absolute inset-y-0 left-4 w-8 bg-gradient-to-r from-background to-transparent transition-opacity duration-fast sm:left-6 lg:left-8",
            overflow.left ? "opacity-100" : "opacity-0",
          )}
        />
        <div
          aria-hidden="true"
          className={cn(
            "pointer-events-none absolute inset-y-0 right-4 w-8 bg-gradient-to-l from-background to-transparent transition-opacity duration-fast sm:right-6 lg:right-8",
            overflow.right ? "opacity-100" : "opacity-0",
          )}
        />
      </Container>
    </nav>
  );
};
