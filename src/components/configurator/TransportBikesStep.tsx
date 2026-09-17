import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Ship, Bike, ArrowRight, ArrowLeft, MapPin, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  type BikeChoice,
  type CrossingChoice,
  type GroupSituation,
  type TransportPreferences,
  type WizardSituation,
  WATERTAXI_HEEN_ID,
  REGINA_HEEN_ID,
  WATERTAXI_DEFAULT_CAPACITY,
  REGINA_DEFAULT_MIN_PEOPLE,
  watertaxiBoatsNeeded,
  normalizeWizardTime,
} from "@/lib/programWizardCart";
import { usePublishedBuildingBlocks, getBlockById } from "@/hooks/useBuildingBlocks";
import { InfoTooltip } from "./InfoTooltip";

interface TransportBikesStepProps {
  situation: WizardSituation;
  initial?: Partial<TransportPreferences>;
  numberOfPeople: number;
  numberOfDays: number;
  onBack: () => void;
  onSubmit: (prefs: TransportPreferences, situation: WizardSituation) => void;
}

const optionClass = (active: boolean, disabled = false) =>
  cn(
    "w-full text-left p-3 rounded-md border-2 transition-all",
    active ? "border-primary bg-primary/5" : "border-border hover:border-primary/50",
    disabled && "opacity-60 cursor-not-allowed hover:border-border",
  );

/**
 * Stap "Vervoer & fietsen" (vanaf de wal) of "Startpunt & fietsen" (al op
 * Vlieland). Eén component, omdat de fietsvraag in beide gevallen gelijk is.
 */
export const TransportBikesStep = ({
  situation: initialSituation,
  initial,
  numberOfPeople,
  numberOfDays,
  onBack,
  onSubmit,
}: TransportBikesStepProps) => {
  const { data: allBlocks = [] } = usePublishedBuildingBlocks();
  const onIsland: boolean = initialSituation.situation === "op_vlieland";

  const [crossing, setCrossing] = useState<CrossingChoice>(initial?.crossing ?? "doeksen");
  const [arrivalTime, setArrivalTime] = useState(initial?.arrivalTime ?? "");
  const [departureTime, setDepartureTime] = useState(initial?.departureTime ?? "");
  const [bikeChoice, setBikeChoice] = useState<BikeChoice>(initial?.bikeChoice ?? "standaard");
  const [startLocation, setStartLocation] = useState(initialSituation.startLocation ?? "");
  const [startTime, setStartTime] = useState(initialSituation.startTime ?? "10:00");
  const [endTime, setEndTime] = useState(initialSituation.endTime ?? "17:00");

  // Capaciteit uit de bouwstenen zelf, met een vaste terugval als die niet is ingevuld.
  const watertaxiCapacity = getBlockById(allBlocks, WATERTAXI_HEEN_ID)?.max_people || WATERTAXI_DEFAULT_CAPACITY;
  const reginaMin = getBlockById(allBlocks, REGINA_HEEN_ID)?.min_people || REGINA_DEFAULT_MIN_PEOPLE;
  const boats = watertaxiBoatsNeeded(numberOfPeople, watertaxiCapacity);
  const reginaAllowed = numberOfPeople >= reginaMin;

  const crossingOptions = useMemo(
    () =>
      [
        {
          value: "doeksen" as const,
          label: "Veerboot Rederij Doeksen",
          description: `Heen- en terugreis Harlingen ⇄ Vlieland. De afvaarttijden kiest u in de programmastap.`,
          disabled: false,
        },
        {
          value: "watertaxi" as const,
          label: "Watertaxi",
          description:
            boats > 1
              ? `Snel en op uw eigen tijd. Voor ${numberOfPeople} personen zijn ${boats} watertaxi's nodig (${watertaxiCapacity} per boot); wij regelen ze samen.`
              : `Snel en op uw eigen tijd, tot ${watertaxiCapacity} personen per boot.`,
          disabled: false,
        },
        {
          value: "regina" as const,
          label: "Privévaart Regina Andrea",
          description: reginaAllowed
            ? "Het hele schip voor uw groep, heen en terug, met catering aan boord mogelijk."
            : `Vanaf ${reginaMin} personen. Uw groep van ${numberOfPeople} is daarvoor te klein.`,
          disabled: !reginaAllowed,
        },
        {
          value: "eigen" as const,
          label: "Wij regelen de overtocht zelf",
          description: "Geef aan wanneer u op Vlieland aankomt en weer vertrekt, dan sluit het programma daarop aan.",
          disabled: false,
        },
      ] satisfies { value: CrossingChoice; label: string; description: string; disabled: boolean }[],
    [boats, numberOfPeople, watertaxiCapacity, reginaAllowed, reginaMin],
  );

  const bikeOptions: { value: BikeChoice; label: string; description: string }[] = [
    { value: "standaard", label: "Versnellingsfietsen", description: "Wij regelen ze voor de hele groep." },
    { value: "ebike", label: "E-bikes", description: "Wij regelen ze voor de hele groep." },
    { value: "eigen", label: "Wij hebben al fietsen", description: onIsland ? "Bijvoorbeeld al gehuurd voor uw verblijf." : "U neemt ze mee of huurt ze zelf." },
    { value: "geen", label: "Geen fietsen", description: "U regelt zelf vervoer op het eiland." },
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const prefs: TransportPreferences = {
      crossing: onIsland ? "eigen" : crossing,
      arrivalTime: !onIsland && crossing === "eigen" ? normalizeWizardTime(arrivalTime) : null,
      departureTime: !onIsland && crossing === "eigen" ? normalizeWizardTime(departureTime) : null,
      bikeChoice,
    };
    const situation: WizardSituation = {
      situation: initialSituation.situation as GroupSituation,
      startLocation: onIsland ? startLocation.trim() || null : null,
      startTime: onIsland ? normalizeWizardTime(startTime) : null,
      endTime: onIsland ? normalizeWizardTime(endTime) : null,
    };
    onSubmit(prefs, situation);
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl mx-auto space-y-6">
      <div className="text-center">
        <h2 className="font-display text-2xl md:text-3xl font-semibold text-foreground mb-2">
          {onIsland ? "Startpunt & fietsen" : "Vervoer & fietsen"}
        </h2>
        <p className="text-muted-foreground">
          {onIsland
            ? `U bent al op Vlieland. Vertel ons waar uw groep van ${numberOfPeople} start en hoe laat, dan vullen wij ${numberOfDays > 1 ? "de dagen" : "de dag"} daarop in.`
            : `Wij regelen de overtocht en fietsen op maat voor uw groep van ${numberOfPeople}. Uw keuzes hier zetten we alvast klaar in het programma.`}
        </p>
      </div>

      {onIsland ? (
        <Card className="p-5">
          <div className="flex items-start gap-3 mb-4">
            <div className="rounded-md bg-primary/10 text-primary p-2">
              <MapPin className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Startpunt en tijdvak</h3>
              <p className="text-sm text-muted-foreground">
                Het programma begint bij uw accommodatie in plaats van bij de haven.
              </p>
            </div>
          </div>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="start-location">Accommodatie of adres op Vlieland</Label>
              <Input
                id="start-location"
                value={startLocation}
                onChange={(e) => setStartLocation(e.target.value)}
                placeholder="Bijv. Hotel Zeezicht, of Dorpsstraat 12"
                maxLength={120}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="start-time" className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5" /> Programma vanaf
                </Label>
                <Input id="start-time" type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="end-time" className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5" /> tot
                </Label>
                <Input id="end-time" type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} required />
              </div>
            </div>
          </div>
        </Card>
      ) : (
        <Card className="p-5">
          <div className="flex items-start gap-3 mb-4">
            <div className="rounded-md bg-primary/10 text-primary p-2">
              <Ship className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Overtocht</h3>
              <p className="text-sm text-muted-foreground">
                Hoe komt uw groep naar Vlieland? Wij zetten de gekozen overtocht op de eerste en de laatste dag.
              </p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2" role="radiogroup" aria-label="Overtocht">
            {crossingOptions.map((opt) => (
              <button
                key={opt.value}
                type="button"
                role="radio"
                aria-checked={crossing === opt.value}
                aria-disabled={opt.disabled}
                disabled={opt.disabled}
                onClick={() => !opt.disabled && setCrossing(opt.value)}
                className={optionClass(crossing === opt.value, opt.disabled)}
              >
                <p className="font-medium text-sm">{opt.label}</p>
                <p className="text-xs text-muted-foreground">{opt.description}</p>
              </button>
            ))}
          </div>

          {crossing === "eigen" && (
            <div className="mt-4 pt-4 border-t border-border grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="arrival-time" className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5" /> Aankomst op Vlieland
                </Label>
                <Input id="arrival-time" type="time" value={arrivalTime} onChange={(e) => setArrivalTime(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="departure-time" className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5" /> Vertrek {numberOfDays > 1 ? "op de laatste dag" : ""}
                </Label>
                <Input id="departure-time" type="time" value={departureTime} onChange={(e) => setDepartureTime(e.target.value)} />
              </div>
              <p className="col-span-2 text-xs text-muted-foreground">Weet u het nog niet? Laat de velden dan leeg.</p>
            </div>
          )}
        </Card>
      )}

      {/* Bikes */}
      <Card className="p-5">
        <div className="flex items-start gap-3 mb-4">
          <div className="rounded-md bg-primary/10 text-primary p-2">
            <Bike className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">Fietsen op Vlieland</h3>
            <p className="text-sm text-muted-foreground">Vlieland is autoluw — vrijwel alles doet u op de fiets. Kies één type voor de hele groep.</p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2" role="radiogroup" aria-label="Fietsen">
          {bikeOptions.map((opt) => (
            <button
              key={opt.value}
              type="button"
              role="radio"
              aria-checked={bikeChoice === opt.value}
              onClick={() => setBikeChoice(opt.value)}
              className={optionClass(bikeChoice === opt.value)}
            >
              <p className="font-medium text-sm flex items-center gap-1.5">
                {opt.label}
                {opt.value === "geen" && (
                  <InfoTooltip>
                    Vlieland is grotendeels autovrij — zonder fietsen regelt u zelf vervoer voor uw groep.
                  </InfoTooltip>
                )}
              </p>
              <p className="text-xs text-muted-foreground">{opt.description}</p>
            </button>
          ))}
        </div>
      </Card>

      <div className="flex items-center justify-between pt-2">
        <Button type="button" variant="ghost" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-1.5" /> Terug
        </Button>
        <Button type="submit" size="lg">
          Verder naar programma <ArrowRight className="h-4 w-4 ml-1.5" />
        </Button>
      </div>
    </form>
  );
};
