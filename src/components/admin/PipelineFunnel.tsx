import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "react-router-dom";
import { FileText, Send, FileCheck, CheckCircle2, Receipt } from "lucide-react";

interface FunnelStage {
  key: string;
  label: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  count: number;
}

export const PipelineFunnel = () => {
  const { data: projects, isLoading } = useQuery({
    queryKey: ["pipeline-projects"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("program_requests")
        .select("id, status, quote_status, terms_accepted_at, completion_status, program_type")
        .eq("status", "active");
      if (error) throw error;
      return data || [];
    },
  });

  const stages: FunnelStage[] = useMemo(() => {
    if (!projects) return [];

    let concept = 0, offerte = 0, av = 0, afgerond = 0, gefactureerd = 0;

    projects.forEach((p) => {
      if (p.completion_status === "fully_invoiced") {
        afgerond++;
      } else if (p.completion_status === "ready_for_invoice" || p.completion_status === "partially_invoiced") {
        gefactureerd++;
      } else if (p.terms_accepted_at) {
        av++;
      } else if (p.quote_status === "offerte_verstuurd") {
        offerte++;
      } else {
        concept++;
      }
    });

    return [
      { key: "concept", label: "Concept", icon: <FileText className="h-4 w-4" />, color: "text-slate-700", bgColor: "bg-slate-100", count: concept },
      { key: "offerte", label: "Offerte verstuurd", icon: <Send className="h-4 w-4" />, color: "text-blue-700", bgColor: "bg-blue-100", count: offerte },
      { key: "av", label: "AV getekend", icon: <FileCheck className="h-4 w-4" />, color: "text-green-700", bgColor: "bg-green-100", count: av },
      { key: "afgerond", label: "Afgerond", icon: <CheckCircle2 className="h-4 w-4" />, color: "text-emerald-700", bgColor: "bg-emerald-100", count: afgerond },
      { key: "facturatie", label: "Facturatie", icon: <Receipt className="h-4 w-4" />, color: "text-purple-700", bgColor: "bg-purple-100", count: gefactureerd },
    ];
  }, [projects]);

  const totalProjects = stages.reduce((s, st) => s + st.count, 0);
  const maxCount = Math.max(...stages.map((s) => s.count), 1);

  if (isLoading) return <Skeleton className="h-40" />;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Pipeline</CardTitle>
        <CardDescription className="text-xs">{totalProjects} actieve projecten per fase</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {stages.map((stage) => {
          const widthPct = Math.max((stage.count / maxCount) * 100, 8);
          return (
            <Link
              key={stage.key}
              to={`/admin/projecten`}
              className="flex items-center gap-3 group"
            >
              <div className="flex items-center gap-1.5 w-32 flex-shrink-0">
                <span className={stage.color}>{stage.icon}</span>
                <span className="text-xs text-muted-foreground group-hover:text-foreground transition-colors">
                  {stage.label}
                </span>
              </div>
              <div className="flex-1 h-7 bg-muted rounded-md overflow-hidden">
                <div
                  className={`h-full ${stage.bgColor} rounded-md flex items-center px-2 transition-all`}
                  style={{ width: `${widthPct}%` }}
                >
                  <span className={`text-xs font-bold ${stage.color}`}>{stage.count}</span>
                </div>
              </div>
            </Link>
          );
        })}
      </CardContent>
    </Card>
  );
};
