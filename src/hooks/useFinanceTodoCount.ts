import { useQuery } from "@tanstack/react-query";
import { loadFinanceTodos } from "@/components/admin/werkbank/FinanceTodoList";

export function useFinanceTodoCount() {
  return useQuery({
    queryKey: ["werkbank-finance-todos"],
    queryFn: loadFinanceTodos,
    select: (rows) => rows.length,
    refetchInterval: 60_000,
  });
}
