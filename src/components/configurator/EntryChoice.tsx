import { Card, CardContent } from "@/components/ui/card";
import { Bot, BookOpen, Puzzle } from "lucide-react";
import erwinProfile from "@/assets/erwin-profile.jpg";

type EntryTrack = "ai_erwin" | "template" | "manual";

interface EntryChoiceProps {
  onSelect: (track: EntryTrack) => void;
}

export const EntryChoice = ({ onSelect }: EntryChoiceProps) => {
  const options: { id: EntryTrack; icon: React.ReactNode; title: string; description: string; accent?: boolean }[] = [
    {
      id: "ai_erwin",
      icon: (
        <div className="relative">
          <img
            src={erwinProfile}
            alt="Erwin"
            className="w-14 h-14 rounded-full object-cover border-2 border-primary"
          />
          <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-primary flex items-center justify-center">
            <Bot className="h-3.5 w-3.5 text-primary-foreground" />
          </div>
        </div>
      ),
      title: "Laat Erwin helpen",
      description: "Beantwoord een paar vragen en ontvang een programmavoorstel op maat.",
      accent: true,
    },
    {
      id: "template",
      icon: (
        <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center">
          <BookOpen className="h-7 w-7 text-foreground" />
        </div>
      ),
      title: "Start met een voorbeeld",
      description: "Bekijk voorbeeldprogramma's en pas ze naar wens aan.",
    },
    {
      id: "manual",
      icon: (
        <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center">
          <Puzzle className="h-7 w-7 text-foreground" />
        </div>
      ),
      title: "Kies zelf onderdelen",
      description: "Blader door alle activiteiten en stel uw eigen programma samen.",
    },
  ];

  return (
    <div className="max-w-3xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="text-center mb-10">
        <h2 className="text-2xl md:text-3xl font-display font-bold text-foreground mb-3">
          Hoe wilt u uw programma samenstellen?
        </h2>
        <p className="text-muted-foreground max-w-lg mx-auto">
          Kies de manier die bij u past. Alles is vrijblijvend — Bureau Vlieland zorgt voor de details.
        </p>
      </div>

      <div className="grid gap-4">
        {options.map((option) => (
          <Card
            key={option.id}
            className={`group cursor-pointer transition-all duration-300 hover:shadow-lg border-2 ${
              option.accent
                ? "border-primary/30 hover:border-primary bg-primary/[0.02]"
                : "border-transparent hover:border-primary/30"
            }`}
            onClick={() => onSelect(option.id)}
          >
            <CardContent className="flex items-center gap-5 p-5">
              <div className="shrink-0">{option.icon}</div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-lg text-foreground group-hover:text-primary transition-colors">
                  {option.title}
                </h3>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {option.description}
                </p>
              </div>
              <div className="shrink-0 text-muted-foreground group-hover:text-primary transition-colors">
                →
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
