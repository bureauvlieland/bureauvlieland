import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Pill } from "./Pill";
import type { PillTone } from "./pillVariants";

/**
 * De kop van elk portaalscherm (klantportaal fase 1, regel 1 van het plan):
 * titel, één regel feiten (datum, personen, kenmerk) en hoogstens één
 * status-`Pill`. Geen tweede kop, geen hero-kaart met vier feiten, geen
 * percentage. Dezelfde Fraunces-kop als de funnel, één maat.
 */
export interface PortalHeadFact {
  key?: string;
  icon?: ReactNode;
  label: ReactNode;
}

interface PortalHeadProps {
  title: ReactNode;
  /** Kleine kop erboven, bijvoorbeeld "Programma voor". */
  eyebrow?: string;
  /** Eén zin onder de titel. */
  description?: ReactNode;
  /** Eén regel feiten onder de titel. */
  facts?: PortalHeadFact[];
  /** Hoogstens één status. */
  status?: { label: string; tone?: PillTone } | null;
  icon?: ReactNode;
  /** Knoppen rechts (`outline`, `ghost`), op een telefoon onder de feiten. */
  actions?: ReactNode;
  as?: "h1" | "h2";
  className?: string;
}

export const PortalHead = ({
  title,
  eyebrow,
  description,
  facts,
  status,
  icon,
  actions,
  as: Tag = "h1",
  className,
}: PortalHeadProps) => (
  <header className={cn("flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between", className)}>
    <div className="flex min-w-0 items-start gap-3">
      {icon && (
        <span
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-primary [&_svg]:h-5 [&_svg]:w-5"
          aria-hidden="true"
        >
          {icon}
        </span>
      )}
      <div className="min-w-0">
        {eyebrow && <p className="mb-1 text-eyebrow font-medium uppercase text-primary">{eyebrow}</p>}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <Tag className="min-w-0 break-words font-display text-display-md font-medium text-foreground">{title}</Tag>
          {status && (
            <Pill tone={status.tone ?? "neutral"} size="md">
              {status.label}
            </Pill>
          )}
        </div>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
        {facts && facts.length > 0 && (
          <ul className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
            {facts.map((fact, i) => (
              <li key={fact.key ?? i} className="inline-flex items-center gap-1.5 [&_svg]:h-4 [&_svg]:w-4 [&_svg]:shrink-0">
                {fact.icon}
                {fact.label}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
    {actions && <div className="flex shrink-0 flex-wrap items-center gap-2 sm:justify-end">{actions}</div>}
  </header>
);
