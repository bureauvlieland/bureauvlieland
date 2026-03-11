import { Bot } from "lucide-react";
import erwinProfile from "@/assets/erwin-profile.jpg";
import teamBeach from "@/assets/team-beach.jpg";
import dunesGroup from "@/assets/dunes-group.jpg";

type EntryTrack = "ai_erwin" | "template" | "manual";

interface EntryChoiceProps {
  onSelect: (track: EntryTrack) => void;
}

const tracks: { id: EntryTrack; image: string; title: string; subtitle: string }[] = [
  {
    id: "ai_erwin",
    image: "",
    title: "Laat Erwin helpen",
    subtitle: "Beantwoord een paar vragen en ontvang een voorstel op maat",
  },
  {
    id: "template",
    image: teamBeach,
    title: "Start met een voorbeeld",
    subtitle: "Bekijk voorbeeldprogramma's en pas ze naar wens aan",
  },
  {
    id: "manual",
    image: dunesGroup,
    title: "Kies zelf onderdelen",
    subtitle: "Blader door alle activiteiten en stel uw eigen programma samen",
  },
];

export const EntryChoice = ({ onSelect }: EntryChoiceProps) => {
  return (
    <div className="max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="text-center mb-8">
        <h2 className="text-2xl md:text-3xl font-display font-bold text-foreground mb-2">
          Hoe wilt u uw programma samenstellen?
        </h2>
        <p className="text-muted-foreground max-w-lg mx-auto">
          Kies de manier die bij u past. Alles is vrijblijvend.
        </p>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        {tracks.map((track, index) => (
          <div
            key={track.id}
            className={`group relative overflow-hidden rounded-xl cursor-pointer transition-all duration-300 hover:shadow-xl hover:-translate-y-1 ${
              index === 0 ? "sm:col-span-2" : ""
            }`}
            onClick={() => onSelect(track.id)}
          >
            {/* Background image or Erwin special */}
            <div className={`relative ${index === 0 ? "h-48 sm:h-56" : "h-52 sm:h-64"}`}>
              {track.id === "ai_erwin" ? (
                <>
                  <img
                    src={teamBeach}
                    alt=""
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-r from-primary/85 via-primary/70 to-primary/50" />
                  <div className="relative z-10 h-full flex items-center gap-6 px-6 sm:px-10">
                    <div className="relative shrink-0">
                      <img
                        src={erwinProfile}
                        alt="Erwin"
                        className="w-20 h-20 sm:w-24 sm:h-24 rounded-full object-cover border-3 border-primary-foreground/40 shadow-lg"
                      />
                      <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-primary-foreground flex items-center justify-center shadow">
                        <Bot className="h-4 w-4 text-primary" />
                      </div>
                    </div>
                    <div>
                      <h3 className="text-xl sm:text-2xl font-display font-bold text-primary-foreground mb-1">
                        {track.title}
                      </h3>
                      <p className="text-sm sm:text-base text-primary-foreground/80">
                        {track.subtitle}
                      </p>
                      <span className="inline-block mt-3 text-xs font-semibold text-primary-foreground/90 bg-primary-foreground/15 px-3 py-1 rounded-full">
                        Aanbevolen
                      </span>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <img
                    src={track.image}
                    alt=""
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/30 to-transparent" />
                  <div className="relative z-10 h-full flex flex-col justify-end p-5 sm:p-6">
                    <h3 className="text-lg sm:text-xl font-display font-bold text-white mb-1">
                      {track.title}
                    </h3>
                    <p className="text-sm text-white/80">{track.subtitle}</p>
                  </div>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
