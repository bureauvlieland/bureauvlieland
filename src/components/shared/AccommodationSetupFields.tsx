import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";
import {
  BOARD_PREFERENCE_OPTIONS,
  ROOM_OCCUPANCY_OPTIONS,
  ROOM_TYPES,
} from "@/types/accommodation";
import {
  validateAccommodationSetup,
  type AccommodationSetup,
} from "@/lib/accommodationSetup";

interface AccommodationSetupFieldsProps {
  value: AccommodationSetup;
  onChange: (next: AccommodationSetup) => void;
  numberOfGuests?: number | null;
  /** Klantvriendelijke toon voor het portaal (default: admin-toon). */
  audience?: "admin" | "customer";
}

const NONE = "__none__";

/**
 * Gedeeld formulier voor kamerbezetting en verzorging. Gebruikt door de admin
 * (bewerken + aanmaken) en het klantportaal, zodat beide exact dezelfde opties
 * en validatie hebben.
 */
export const AccommodationSetupFields = ({
  value,
  onChange,
  numberOfGuests,
  audience = "admin",
}: AccommodationSetupFieldsProps) => {
  const warning = validateAccommodationSetup(value, numberOfGuests);

  const toggleType = (type: string) => {
    const next = value.room_types.includes(type)
      ? value.room_types.filter((t) => t !== type)
      : [...value.room_types, type];
    onChange({ ...value, room_types: next });
  };

  return (
    <div className="space-y-5">
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="setup-room-count">Aantal kamers</Label>
          <Input
            id="setup-room-count"
            type="number"
            min={0}
            max={200}
            value={value.room_count ?? ""}
            placeholder="Niet ingevuld"
            onChange={(e) => {
              const raw = e.target.value;
              onChange({
                ...value,
                room_count: raw === "" ? null : Math.max(0, parseInt(raw, 10) || 0),
              });
            }}
          />
        </div>

        <div className="space-y-2">
          <Label>Bezetting per kamer</Label>
          <Select
            value={value.room_occupancy ?? NONE}
            onValueChange={(v) => onChange({ ...value, room_occupancy: v === NONE ? null : v })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Niet ingevuld" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE}>Niet ingevuld</SelectItem>
              {ROOM_OCCUPANCY_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Gewenste kamertypes</Label>
        <div className="grid sm:grid-cols-2 gap-2">
          {ROOM_TYPES.map((type) => (
            <label
              key={type.value}
              className="flex items-center gap-2 rounded-md border p-2 text-sm cursor-pointer hover:bg-muted/50"
            >
              <Checkbox
                checked={value.room_types.includes(type.value)}
                onCheckedChange={() => toggleType(type.value)}
              />
              <span>{type.label}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label>Verzorging</Label>
        <Select
          value={value.board_preference ?? NONE}
          onValueChange={(v) => onChange({ ...value, board_preference: v === NONE ? null : v })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Niet ingevuld" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NONE}>Niet ingevuld</SelectItem>
            {BOARD_PREFERENCE_OPTIONS.map((b) => (
              <SelectItem key={b.value} value={b.value}>
                {b.icon} {b.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          {audience === "customer"
            ? "Bijvoorbeeld alleen overnachten, met ontbijt of halfpension (ontbijt + diner)."
            : "Wordt meegestuurd in de offerte-aanvraag naar de logiespartner."}
        </p>
      </div>

      {warning && (
        <Alert className="border-amber-200 bg-amber-50">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-800">{warning}</AlertDescription>
        </Alert>
      )}
    </div>
  );
};
