import { Link } from "react-router-dom";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { MailX } from "lucide-react";
import { suppressionReasonLabel, type EmailSuppression } from "@/hooks/useEmailSuppressions";

interface SuppressedEmailNoticeProps {
  suppressions: EmailSuppression[];
  /** Compact: één regel, voor in een ontvangerslijst. */
  compact?: boolean;
}

/**
 * Waarschuwing dat mail naar dit adres niet verstuurd wordt, met de weg naar
 * herstel. Wordt getoond in het dossier en in het verzendvenster.
 */
export const SuppressedEmailNotice = ({ suppressions, compact }: SuppressedEmailNoticeProps) => {
  if (suppressions.length === 0) return null;
  if (compact) {
    const s = suppressions[0];
    return (
      <span className="inline-flex items-center gap-1 text-xs text-destructive">
        <MailX className="h-3.5 w-3.5" />Geblokkeerd: {suppressionReasonLabel(s.reason)}
      </span>
    );
  }
  return (
    <div className="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive space-y-1">
      <div className="flex items-start gap-2">
        <MailX className="h-4 w-4 mt-0.5 shrink-0" />
        <div className="space-y-1">
          {suppressions.map((s) => (
            <p key={s.email}>
              <strong>{s.email}</strong> ontvangt geen e-mail van ons: {suppressionReasonLabel(s.reason)} sinds{" "}
              {format(new Date(s.created_at), "d MMMM yyyy", { locale: nl })}
              {s.notes ? ` (${s.notes})` : ""}. Offertes, bevestigingen en herinneringen naar dit adres worden niet verstuurd.
            </p>
          ))}
          <p className="text-destructive/80">
            Controleer het adres met de klant, laat Mailjet de blokkade opheffen en verwijder het adres daarna bij{" "}
            <Link to="/admin/email-health" className="underline">Email health → Suppressies</Link>.
          </p>
        </div>
      </div>
    </div>
  );
};
