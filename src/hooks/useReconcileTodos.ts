import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ReconcileResult {
  closed: number;
  created: number;
  scanned: number;
  reasons?: Record<string, number>;
}

export function useReconcileTodos() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (): Promise<ReconcileResult> => {
      const { data, error } = await supabase.functions.invoke(
        "reconcile-admin-todos",
        { body: {} },
      );
      if (error) throw error;
      return (data ?? { closed: 0, created: 0, scanned: 0 }) as ReconcileResult;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["werkbank-projects"] });
      qc.invalidateQueries({ queryKey: ["werkbank-detail-todos"] });
      qc.invalidateQueries({ queryKey: ["werkbank-detail"] });
      qc.invalidateQueries({ queryKey: ["werkbank-inbox"] });
      qc.invalidateQueries({ queryKey: ["admin-todos"] });
      qc.invalidateQueries({ queryKey: ["admin-todo-count"] });
      qc.invalidateQueries({ queryKey: ["claudia-recommendations-count"] });
      qc.invalidateQueries({ queryKey: ["inbox"] });
    },
  });
}
