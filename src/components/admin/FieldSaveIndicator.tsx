import { Check, Loader2, AlertCircle } from "lucide-react";
import type { FieldSaveStatus } from "@/hooks/useAutoSaveField";
import { cn } from "@/lib/utils";

interface Props {
  status: FieldSaveStatus;
  savedAt?: Date | null;
  error?: string | null;
  className?: string;
}

const fmtTime = (d: Date) =>
  d.toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" });

export const FieldSaveIndicator = ({ status, savedAt, error, className }: Props) => {
  if (status === "idle") return null;

  let body: React.ReactNode = null;
  let tone = "text-muted-foreground";

  if (status === "dirty") {
    body = <>Wijziging niet opgeslagen…</>;
    tone = "text-muted-foreground";
  } else if (status === "saving") {
    body = (
      <>
        <Loader2 className="h-3 w-3 animate-spin" />
        Opslaan…
      </>
    );
  } else if (status === "saved") {
    body = (
      <>
        <Check className="h-3 w-3 text-emerald-600" />
        Opgeslagen{savedAt ? ` om ${fmtTime(savedAt)}` : ""}
      </>
    );
    tone = "text-emerald-700 dark:text-emerald-400";
  } else if (status === "error") {
    body = (
      <>
        <AlertCircle className="h-3 w-3 text-destructive" />
        {error ?? "Fout bij opslaan"}
      </>
    );
    tone = "text-destructive";
  }

  return (
    <p className={cn("inline-flex items-center gap-1 text-[11px]", tone, className)}>
      {body}
    </p>
  );
};
