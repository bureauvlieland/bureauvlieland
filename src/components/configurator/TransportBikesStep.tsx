import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Ship, Bike, MapPin, Clock } from "lucide-react";
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
import { FormField, OptionCard, OptionGroup, SectionHeader, WizardFooter } from "@/components/system";

interface TransportBikesStepProps {
  situation: WizardSituation;
  initial?: Partial<TransportPreferences>;
  numberOfPeople: number;
  numberOfDays: number;
  onBack: () => void;
  onSubmit: (prefs: TransportPreferences, situation: WizardSituation) => void;
  nextLabel?: string;
}

/**
 * Stap "Vervoer en fietsen" (vanaf de wal) of "Startpunt en fietsen" (al op
 * Vlieland). Eén component, omdat de fietsvraag in beide gevallen gelijk is.
 */
export const TransportBikesStep = ({
  situation: initialSituation,
  initial,
  numberOfPeople,
  numberOfDays,
  onBack,
  onSubmit,
  nextLabel = "Volgende: uw programma",
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
      <SectionHeader
        as="h2"
        size="md"
        weight="medium"
        align="center"
        title={onIsland ? "Startpunt en fietsen" : "Vervoer en fietsen"}
        intro={
          onIsland
            ? `U bent al op Vlieland. Vertel ons waar uw groep van ${numberOfPeople} start en hoe laat, dan vullen wij ${numberOfDays > 1 ? "de dagen" : "de dag"} daarop in.`
            : `Wij regelen de overtocht en fietsen op maat voor uw groep van ${numberOfPeople}. Uw keuzes hier zetten we alvast klaar in het programma.`
        }
      />

      {onIsland ? (
        <Card className="p-5">
          <div className="flex items-start gap-3 mb-4">
            <div className="rounded-md bg-accent-soft text-primary p-2">
              <MapPin className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Startpunt en tijdvak</h3>
              <p className="text-sm text-muted-foreground">
                Het programma begint bij uw accommodatie in plaats van bij de haven.
              </p>
            </div>
          </div>
          <div className="space-y-4">
            <FormField label="Accommodatie of adres op Vlieland" htmlFor="start-location">
              <Input
                value={startLocation}
                onChange={(e) => setStartLocation(e.target.value)}
                placeholder="Bijv. Hotel Zeezicht, of Dorpsstraat 12"
                maxLength={120}
              />
            </FormField>
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Programma vanaf" htmlFor="start-time" required leading={<Clock />}>
                <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} required />
              </FormField>
              <FormField label="tot" htmlFor="end-time" required leading={<Clock />}>
                <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} required />
              </FormField>
            </div>
          </div>
        </Card>
      ) : (
        <Card className="p-5">
          <div className="flex items-start gap-3 mb-4">
            <div className="rounded-md bg-accent-soft text-primary p-2">
              <Ship className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Overtocht</h3>
              <p className="text-sm text-muted-foreground">
                Hoe komt uw groep naar Vlieland? Wij zetten de gekozen overtocht op de eerste en de laatste dag.
              </p>
            </div>
          </div>
          <OptionGroup label="Overtocht" columns={2}>
            {crossingOptions.map((opt) => (
              <OptionCard
                key={opt.value}
                selected={crossing === opt.value}
                onSelect={() => setCrossing(opt.value)}
                disabled={opt.disabled}
                title={opt.label}
                description={opt.description}
              />
            ))}
          </OptionGroup>

          {crossing === "eigen" && (
            <div className="mt-4 pt-4 border-t border-border grid grid-cols-2 gap-3">
              <FormField label="Aankomst op Vlieland" htmlFor="arrival-time" leading={<Clock />}>
                <Input type="time" value={arrivalTime} onChange={(e) => setArrivalTime(e.target.value)} />
              </FormField>
              <FormField label={numberOfDays > 1 ? "Vertrek op de laatste dag" : "Vertrek"} htmlFor="departure-time" leading={<Clock />}>
                <Input type="time" value={departureTime} onChange={(e) => setDepartureTime(e.target.value)} />
              </FormField>
              <p className="col-span-2 text-xs text-muted-foreground">Weet u het nog niet? Laat de velden dan leeg.</p>
            </div>
          )}
        </Card>
      )}

      {/* Bikes */}
      <Card className="p-5">
        <div className="flex items-start gap-3 mb-4">
          <div className="rounded-md bg-accent-soft text-primary p-2">
            <Bike className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">Fietsen op Vlieland</h3>
            <p className="text-sm text-muted-foreground">Vlieland is autoluw, vrijwel alles doet u op de fiets. Kies één type voor de hele groep.</p>
          </div>
        </div>
        <OptionGroup label="Fietsen" columns={2}>
          {bikeOptions.map((opt) => (
            <OptionCard
              key={opt.value}
              selected={bikeChoice === opt.value}
              onSelect={() => setBikeChoice(opt.value)}
              title={
                opt.value === "geen" ? (
                  <span className="inline-flex items-center gap-1.5">
                    {opt.label}
                    <InfoTooltip>
                      Vlieland is grotendeels autovrij. Zonder fietsen regelt u zelf vervoer voor uw groep.
                    </InfoTooltip>
                  </span>
                ) : (
                  opt.label
                )
              }
              description={opt.description}
            />
          ))}
        </OptionGroup>
      </Card>

      <WizardFooter onBack={onBack} nextType="submit" nextLabel={nextLabel} />
    </form>
  );
};
