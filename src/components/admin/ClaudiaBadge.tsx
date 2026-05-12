import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

async function fetchOpenCount(): Promise<{ total: number; urgent: number }> {
  const nowIso = new Date().toISOString();
  const { data, error } = await supabase
    .from("admin_recommendations")
    .select("priority", { count: "exact" })
    .eq("status", "open")
    .gte("expires_at", nowIso);
  if (error) throw error;
  const rows = (data ?? []) as { priority: string }[];
  return {
    total: rows.length,
    urgent: rows.filter((r) => r.priority === "urgent").length,
  };
}

export const ClaudiaBadge = () => {
  const queryClient = useQueryClient();
  const { data } = useQuery({
    queryKey: ["claudia-recommendations-count"],
    queryFn: fetchOpenCount,
    refetchInterval: 60_000,
  });

  useEffect(() => {
    const ch = supabase
      .channel("claudia-badge")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "admin_recommendations" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["claudia-recommendations-count"] });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [queryClient]);

  const total = data?.total ?? 0;
  const urgent = data?.urgent ?? 0;

  return (
    <Link
      to="/admin/werkbank"
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
        urgent > 0
          ? "border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
          : total > 0
          ? "border-violet-200 bg-violet-50 text-violet-700 hover:bg-violet-100"
          : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50",
      )}
      title="Claudia — aanbevelingen"
    >
      <Sparkles className="h-3.5 w-3.5" />
      <span className="hidden sm:inline">Claudia</span>
      {total > 0 && (
        <Badge
          variant="secondary"
          className={cn(
            "h-4 min-w-4 px-1 text-[10px]",
            urgent > 0 && "bg-red-600 text-white hover:bg-red-700",
          )}
        >
          {total}
        </Badge>
      )}
    </Link>
  );
};
