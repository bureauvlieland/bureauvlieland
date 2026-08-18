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
  emptyLabel,
}: {
  icon: React.ReactNode;
  label: string;
  value?: string | null;
  emptyLabel: string;
}) => {
  const [expanded, setExpanded] = useState(false);
  const filled = !!value && value.trim().length > 0;
  const text = filled ? value!.trim() : "";
  const isLong = text.length > PREVIEW;
  const shown = !isLong || expanded ? text : text.slice(0, PREVIEW).trimEnd() + "…";
  return (
    <div className="flex items-start gap-2 text-sm">
      {icon}
      <div className="min-w-0 flex-1">
        <p className="font-medium text-xs uppercase text-muted-foreground tracking-wide mb-0.5">
          {label}
        </p>
        {filled ? (
          <>
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
          </>
        ) : (
          <p className="italic text-muted-foreground">{emptyLabel}</p>
        )}
      </div>
    </div>
  );
};

export const GuestDetailsBlock = (props: Props) => {
  const { guestNames, dietaryNotes, roomAssignment } = props;
  const showGuests = "guestNames" in props;
  const showDietary = "dietaryNotes" in props;
  const showRooms = "roomAssignment" in props;
  if (!showGuests && !showDietary && !showRooms) return null;
  return (
    <div className="border-t pt-4 space-y-3">
      {showGuests && (
        <Field
          icon={<Users className="h-4 w-4 text-muted-foreground mt-0.5" />}
          label="Gastenlijst"
          value={guestNames}
          emptyLabel="Nog niet doorgegeven door de klant."
        />
      )}
      {showDietary && (
        <Field
          icon={<Utensils className="h-4 w-4 text-muted-foreground mt-0.5" />}
          label="Dieetwensen & allergieën"
          value={dietaryNotes}
          emptyLabel="Geen dieetwensen of allergieën bekend."
        />
      )}
      {showRooms && (
        <Field
          icon={<BedDouble className="h-4 w-4 text-muted-foreground mt-0.5" />}
          label="Kamerindeling"
          value={roomAssignment}
          emptyLabel="Nog geen kamerindeling doorgegeven."
        />
      )}
    </div>
  );
};

