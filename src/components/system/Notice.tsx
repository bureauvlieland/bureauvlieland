import type { ReactNode } from "react";
import { AlertCircle, AlertTriangle, CheckCircle2, Info } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Inline melding in de pagina (geen toast): een korte tekst met een toon.
 * Vervangt de losse gekleurde `div`s en `p`'s (ontwerpsysteem fase 1).
 * `danger` is een fout die de gebruiker tegenhoudt; `warning` vraagt
 * aandacht maar blokkeert niet; `info` legt uit; `success` bevestigt.
 */
export type NoticeTone = "info" | "success" | "warning" | "danger";

const TONE_CLASSES: Record<NoticeTone, string> = {
  info: "bg-info-soft border-info/30 text-info-ink",
  success: "bg-success-soft border-success/30 text-success-ink",
  warning: "bg-warning-soft border-warning/40 text-warning-ink",
  danger: "bg-destructive-soft border-destructive/30 text-destructive-ink",
};

const TONE_ICON: Record<NoticeTone, ReactNode> = {
  info: <Info className="h-4 w-4 mt-0.5 shrink-0" aria-hidden="true" />,
  success: <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" aria-hidden="true" />,
  warning: <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" aria-hidden="true" />,
  danger: <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" aria-hidden="true" />,
};

interface NoticeProps {
  tone?: NoticeTone;
  title?: ReactNode;
  /** Eigen icoon, of `null` voor geen icoon. */
  icon?: ReactNode | null;
  className?: string;
  children?: ReactNode;
}

export const Notice = ({ tone = "info", title, icon, className, children }: NoticeProps) => (
  <div
    role={tone === "danger" ? "alert" : "status"}
    className={cn("flex gap-3 rounded-md border p-3 text-sm leading-relaxed", TONE_CLASSES[tone], className)}
  >
    {icon === undefined ? TONE_ICON[tone] : icon}
    <div className="min-w-0 flex-1">
      {title && <p className="font-medium">{title}</p>}
      {children && <div className="[&_p]:leading-relaxed">{children}</div>}
    </div>
  </div>
);
