import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Ship, Bike, ArrowRight, ArrowLeft } from "lucide-react";
import type { BikeChoice, TransportPreferences } from "@/lib/programWizardCart";

interface TransportBikesStepProps {
  initial?: Partial<TransportPreferences>;
  numberOfPeople: number;
  onBack: () => void;
  onSubmit: (prefs: TransportPreferences) => void;
}

export const TransportBikesStep = ({ initial, numberOfPeople, onBack, onSubmit }: TransportBikesStepProps) => {
  const [ferryIncluded, setFerryIncluded] = useState<boolean>(initial?.ferryIncluded ?? true);
  const [bikeChoice, setBikeChoice] = useState<BikeChoice>(initial?.bikeChoice ?? "standaard");

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit({ ferryIncluded, bikeChoice });
      }}
      className="max-w-2xl mx-auto space-y-6"
    >
      <div className="text-center">
        <h2 className="font-display text-2xl md:text-3xl font-semibold text-foreground mb-2">
          Vervoer &amp; fietsen
        </h2>
        <p className="text-muted-foreground">
          Wij regelen de overtocht en (elektrische) fietsen op maat voor uw groep van {numberOfPeople}. Uw keuzes hier zetten we alvast klaar in het programma.
        </p>
      </div>

      {/* Ferry */}
      <Card className="p-5">
        <div className="flex items-start gap-3 mb-4">
          <div className="rounded-md bg-primary/10 text-primary p-2">
            <Ship className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">Overtocht Rederij Doeksen</h3>
            <p className="text-sm text-muted-foreground">Heen- én terugreis Harlingen ⇄ Vlieland. Exacte afvaarttijden kiest u in de volgende stap.</p>
          </div>
        </div>
        <RadioGroup
          value={ferryIncluded ? "ja" : "nee"}
          onValueChange={(v) => setFerryIncluded(v === "ja")}
          className="grid grid-cols-2 gap-2"
        >
          <Label className={`flex items-center gap-2 border rounded-md px-3 py-2 cursor-pointer ${ferryIncluded ? "border-primary bg-primary/5" : "border-border"}`}>
            <RadioGroupItem value="ja" /> Ja, boot heen &amp; terug
          </Label>
          <Label className={`flex items-center gap-2 border rounded-md px-3 py-2 cursor-pointer ${!ferryIncluded ? "border-primary bg-primary/5" : "border-border"}`}>
            <RadioGroupItem value="nee" /> Nee, wij regelen zelf
          </Label>
        </RadioGroup>
      </Card>

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
        <RadioGroup
          value={bikeChoice}
          onValueChange={(v) => setBikeChoice(v as BikeChoice)}
          className="grid grid-cols-1 sm:grid-cols-3 gap-2"
        >
          <Label className={`flex items-center gap-2 border rounded-md px-3 py-2 cursor-pointer ${bikeChoice === "standaard" ? "border-primary bg-primary/5" : "border-border"}`}>
            <RadioGroupItem value="standaard" /> Versnellingsfietsen
          </Label>
          <Label className={`flex items-center gap-2 border rounded-md px-3 py-2 cursor-pointer ${bikeChoice === "ebike" ? "border-primary bg-primary/5" : "border-border"}`}>
            <RadioGroupItem value="ebike" /> E-bikes
          </Label>
          <Label className={`flex items-center gap-2 border rounded-md px-3 py-2 cursor-pointer ${bikeChoice === "geen" ? "border-primary bg-primary/5" : "border-border"}`}>
            <RadioGroupItem value="geen" /> Geen fietsen
          </Label>
        </RadioGroup>
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
