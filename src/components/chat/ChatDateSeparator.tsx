import { isToday, isYesterday } from "date-fns";
import { formatNL } from "@/lib/dateFormat";

export function getChatDateLabel(date: Date): string {
  if (isToday(date)) return "Vandaag";
  if (isYesterday(date)) return "Gisteren";
  return formatNL(date, "EEEE d MMMM yyyy");
}

export function ChatDateSeparator({ date }: { date: Date }) {
  return (
    <div className="flex items-center gap-3 my-4">
      <div className="flex-1 h-px bg-border" />
      <span className="text-[11px] text-muted-foreground font-medium capitalize">
        {getChatDateLabel(date)}
      </span>
      <div className="flex-1 h-px bg-border" />
    </div>
  );
}
