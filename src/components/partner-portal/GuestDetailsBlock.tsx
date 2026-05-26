import { useState } from "react";
import { Users, Utensils, BedDouble, ChevronDown, ChevronUp } from "lucide-react";

interface Props {
  guestNames?: string | null;
  dietaryNotes?: string | null;
  roomAssignment?: string | null;
}

const PREVIEW = 140;

const Field = ({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) => {
  const [expanded, setExpanded] = useState(false);
  const isLong = value.length > PREVIEW;
  const shown = !isLong || expanded ? value : value.slice(0, PREVIEW).trimEnd() + "…";
  return (
    <div className="flex items-start gap-2 text-sm">
      {icon}
      <div className="min-w-0 flex-1">
        <p className="font-medium text-xs uppercase text-muted-foreground tracking-wide mb-0.5">
          {label}
        </p>
        <p className="whitespace-pre-wrap break-words">{shown}</p>
        {isLong && (
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="inline-flex items-center gap-0.5 text-xs text-primary hover:underline mt-1"
          >
            {expanded ? (
              <>
                Minder weergeven <ChevronUp className="h-3 w-3" />
              </>
            ) : (
              <>
                Lees meer <ChevronDown className="h-3 w-3" />
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
};

export const GuestDetailsBlock = ({ guestNames, dietaryNotes, roomAssignment }: Props) => {
  const hasAny =
    (guestNames && guestNames.trim()) ||
    (dietaryNotes && dietaryNotes.trim()) ||
    (roomAssignment && roomAssignment.trim());
  if (!hasAny) return null;
  return (
    <div className="border-t pt-4 space-y-3">
      {guestNames && guestNames.trim() && (
        <Field
          icon={<Users className="h-4 w-4 text-muted-foreground mt-0.5" />}
          label="Gastenlijst"
          value={guestNames}
        />
      )}
      {dietaryNotes && dietaryNotes.trim() && (
        <Field
          icon={<Utensils className="h-4 w-4 text-muted-foreground mt-0.5" />}
          label="Dieetwensen & allergieën"
          value={dietaryNotes}
        />
      )}
      {roomAssignment && roomAssignment.trim() && (
        <Field
          icon={<BedDouble className="h-4 w-4 text-muted-foreground mt-0.5" />}
          label="Kamerindeling"
          value={roomAssignment}
        />
      )}
    </div>
  );
};
