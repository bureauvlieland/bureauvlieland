import { Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface InfoTooltipProps {
  children: React.ReactNode;
  className?: string;
}

/** Klein (i)-icoontje met uitleg erachter, voor niet-vanzelfsprekende keuzes in de wizard. */
export const InfoTooltip = ({ children, className }: InfoTooltipProps) => (
  <Tooltip>
    <TooltipTrigger asChild>
      <Info className={className ?? "h-3.5 w-3.5 text-muted-foreground cursor-help shrink-0"} />
    </TooltipTrigger>
    <TooltipContent className="max-w-xs">{children}</TooltipContent>
  </Tooltip>
);
