import type { ReactNode } from "react";
import { format, parseISO } from "date-fns";
import { nl } from "date-fns/locale";
import { AlertCircle, BedDouble, CheckCircle2, Pencil, Users, UtensilsCrossed } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Pill } from "@/components/system";

interface GuestDetailsCardProps {
  guestNames: string | null;
  dietaryNotes: string | null;
  roomAssignment: string | null;
  showDietary: boolean;
  showRoomAssignment: boolean;
  updatedAt: string | null;
  onEdit: () => void;
}

const Field = ({ icon, label, value, emptyHint }: { icon: ReactNode; label: string; value: string | null; emptyHint: string }) => {
  const filled = !!value && value.trim().length > 0;
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2 text-sm font-medium">
        {icon}
        <span>{label}</span>
        {filled ? (
          <CheckCircle2 className="h-3.5 w-3.5 text-success" aria-label="ingevuld" />
        ) : (
          <AlertCircle className="h-3.5 w-3.5 text-warning" aria-label="nog niet ingevuld" />
        )}
      </div>
      {filled ? (
        <p className="line-clamp-3 whitespace-pre-wrap text-sm text-muted-foreground">{value}</p>
      ) : (
        <p className="text-sm text-muted-foreground">{emptyHint}</p>
      )}
    </div>
  );
};

export const GuestDetailsCard = ({ guestNames, dietaryNotes, roomAssignment, showDietary, showRoomAssignment, updatedAt, onEdit }: GuestDetailsCardProps) => {
  const allFilled = !!guestNames && (!showDietary || !!dietaryNotes) && (!showRoomAssignment || !!roomAssignment);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-base">
            Groep en wensen
            {allFilled ? <Pill tone="success">Compleet</Pill> : <Pill tone="warning">Aanvullen</Pill>}
          </CardTitle>
          <Button size="sm" variant="outline" onClick={onEdit}>
            <Pencil className="h-4 w-4" aria-hidden="true" />
            Bewerken
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <Field icon={<Users className="h-4 w-4" aria-hidden="true" />} label="Gastenlijst" value={guestNames} emptyHint="Nog niet ingevuld. Voeg de namen van uw gasten toe." />
        {showDietary && (
          <Field
            icon={<UtensilsCrossed className="h-4 w-4" aria-hidden="true" />}
            label="Dieetwensen en allergieën"
            value={dietaryNotes}
            emptyHint="Vul in als er gasten zijn met een dieet of allergie. Niet ingevuld? Dan houden wij er geen rekening mee."
          />
        )}
        {showRoomAssignment && (
          <Field
            icon={<BedDouble className="h-4 w-4" aria-hidden="true" />}
            label="Kamerindeling"
            value={roomAssignment}
            emptyHint="Optioneel. Geef hier uw voorkeur voor de kamerverdeling door."
          />
        )}
        {updatedAt && (
          <p className="text-xs text-muted-foreground">Laatst bijgewerkt op {format(parseISO(updatedAt), "d MMMM yyyy 'om' HH:mm", { locale: nl })}</p>
        )}
      </CardContent>
    </Card>
  );
};
