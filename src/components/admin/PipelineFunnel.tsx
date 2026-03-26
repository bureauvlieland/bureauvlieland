import { useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Send, FileCheck, CheckCircle2, Receipt } from "lucide-react";
import { cn } from "@/lib/utils";

interface FunnelStage {
  key: string;
  label: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  activeRing: string;
  count: number;
}

interface PipelineFunnelProps {
  /** Counts per stage key */
  stageCounts: Record<string, number>;
  /** Currently active filter (null = none) */
  activeStage?: string | null;
  /** Called when a stage bar is clicked */
  onStageClick?: (stageKey: string) => void;
}

const STAGE_DEFS = [
  { key: "concept", label: "Concept", icon: <FileText className="h-4 w-4" />, color: "text-slate-700", bgColor: "bg-slate-100", activeRing: "ring-slate-400" },
  { key: "offerte_verstuurd", label: "Offerte verstuurd", icon: <Send className="h-4 w-4" />, color: "text-blue-700", bgColor: "bg-blue-100", activeRing: "ring-blue-400" },
  { key: "akkoord_ontvangen", label: "Akkoord", icon: <CheckCircle2 className="h-4 w-4" />, color: "text-amber-700", bgColor: "bg-amber-100", activeRing: "ring-amber-400" },
  { key: "av_getekend", label: "AV getekend", icon: <FileCheck className="h-4 w-4" />, color: "text-green-700", bgColor: "bg-green-100", activeRing: "ring-green-400" },
  { key: "facturatie", label: "Facturatie", icon: <Receipt className="h-4 w-4" />, color: "text-purple-700", bgColor: "bg-purple-100", activeRing: "ring-purple-400" },
  { key: "afgerond", label: "Afgerond", icon: <CheckCircle2 className="h-4 w-4" />, color: "text-emerald-700", bgColor: "bg-emerald-100", activeRing: "ring-emerald-400" },
];

export const PipelineFunnel = ({ stageCounts, activeStage, onStageClick }: PipelineFunnelProps) => {
  const stages: FunnelStage[] = useMemo(() => {
    return STAGE_DEFS.map((def) => ({
      ...def,
      count: stageCounts[def.key] ?? 0,
    }));
  }, [stageCounts]);

  const totalProjects = stages.reduce((s, st) => s + st.count, 0);
  const maxCount = Math.max(...stages.map((s) => s.count), 1);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Pipeline</CardTitle>
        <CardDescription className="text-xs">{totalProjects} actieve projecten per fase</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {stages.map((stage) => {
          const widthPct = Math.max((stage.count / maxCount) * 100, 8);
          const isActive = activeStage === stage.key;
          const isClickable = !!onStageClick;
          return (
            <button
              key={stage.key}
              type="button"
              onClick={() => onStageClick?.(stage.key)}
              className={cn(
                "flex items-center gap-3 w-full text-left rounded-md transition-all",
                isClickable && "cursor-pointer hover:bg-muted/40",
                isActive && "ring-2 ring-offset-1 " + stage.activeRing,
              )}
              disabled={!isClickable}
            >
              <div className="flex items-center gap-1.5 w-32 flex-shrink-0">
                <span className={stage.color}>{stage.icon}</span>
                <span className={cn(
                  "text-xs text-muted-foreground transition-colors",
                  isActive && "text-foreground font-medium",
                )}>
                  {stage.label}
                </span>
              </div>
              <div className="flex-1 h-7 bg-muted rounded-md overflow-hidden">
                <div
                  className={cn("h-full rounded-md flex items-center px-2 transition-all", stage.bgColor)}
                  style={{ width: `${widthPct}%` }}
                >
                  <span className={`text-xs font-bold ${stage.color}`}>{stage.count}</span>
                </div>
              </div>
            </button>
          );
        })}
      </CardContent>
    </Card>
  );
};
