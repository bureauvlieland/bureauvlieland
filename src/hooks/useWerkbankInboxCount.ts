import { useQuery } from "@tanstack/react-query";
import { loadInbox } from "@/lib/getInbox";

export function useWerkbankInboxCount() {
  return useQuery({
    queryKey: ["werkbank-inbox", "no-snoozed"],
    queryFn: () => loadInbox({ includeSnoozed: false }),
    select: (items) => items.length,
    refetchInterval: 60_000,
  });
}
