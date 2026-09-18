import { cn } from "@/lib/utils";
import {
  type ItemDisplayStatus,
  itemDisplayStatusConfig,
} from "@/lib/itemStatus";
import { pillVariants, type PillTone } from "@/components/system/pillVariants";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface ItemDisplayStatusBadgeProps {
  status: ItemDisplayStatus;
  audience?: "admin" | "customer" | "partner";
  className?: string;
}

const TONE_BY_STATUS: Record<ItemDisplayStatus, PillTone> = {
  wacht_op_partner: "info",
  wacht_op_klant: "warning",
  prijs_gewijzigd: "warning",
  // Nog niet definitief: aanbieder moet nog bevestigen → aandacht, niet groen.
  klant_akkoord_wacht_partner: "warning",
  tegenvoorstel_klant: "purple",
  klant_akkoord_bureau: "success",
  geaccepteerd: "success",
  uitgevoerd: "success",
  geannuleerd: "neutral",
  niet_beschikbaar: "danger",
  self_arranged: "neutral",
  afgesloten_automatisch: "neutral",
};

const ACTOR_LABEL: Record<string, string> = {
  partner: "Aanbieder",
  klant: "Klant",
  bureau: "Bureau Vlieland",
  geen: "—",
};

export const ItemDisplayStatusBadge = ({
  status,
  audience = "admin",
  className,
}: ItemDisplayStatusBadgeProps) => {
  const cfg = itemDisplayStatusConfig[status];
  const label =
    audience === "customer" ? cfg.customerLabel :
    audience === "partner" ? cfg.partnerLabel :
    cfg.adminLabel;
  const tooltip =
    audience === "customer" ? cfg.customerTooltip :
    audience === "partner" ? cfg.partnerTooltip :
    cfg.adminTooltip;
  const tone = TONE_BY_STATUS[status] ?? "neutral";

  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            className={cn(pillVariants({ tone }), "cursor-help", className)}
          >
            {label}
          </span>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-[260px] text-xs leading-snug">
          <p className="font-medium">{label}</p>
          <p className="mt-0.5 text-muted-foreground">{tooltip}</p>
          {cfg.actor !== "geen" && (
            <p className="mt-1 text-[11px]">
              <span className="text-muted-foreground">Aan zet: </span>
              <span className="font-medium">{ACTOR_LABEL[cfg.actor]}</span>
            </p>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
