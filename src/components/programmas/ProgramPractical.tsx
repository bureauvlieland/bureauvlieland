import { Info, CalendarDays } from "lucide-react";
import type { ProgramTemplateCopy } from "@/lib/programTemplateCopy";

type Props = {
  copy: ProgramTemplateCopy;
  durationDays: number;
};

export const ProgramPractical = ({ copy, durationDays }: Props) => {
  const isTwoDays = durationDays === 2;
  return (
    <section className="py-16 bg-muted/30">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-5xl">
        <div className="mb-10">
          <p className="text-xs uppercase tracking-[0.2em] text-primary/70 font-semibold mb-3">
            Goed om te weten
          </p>
          <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground">
            Praktische informatie
          </h2>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div
            className="bg-card rounded-xl p-7 border border-border/60"
            style={{ boxShadow: "var(--shadow-soft)" }}
          >
            <div className="flex items-center gap-2 mb-4">
              <Info className="h-5 w-5 text-primary" />
              <h3 className="font-display font-semibold text-lg text-foreground">
                Wat u kunt verwachten
              </h3>
            </div>
            <ul className="space-y-3">
              {copy.practical.map((p, i) => (
                <li key={i} className="flex items-start gap-3 text-foreground/80 leading-relaxed">
                  <span className="mt-2 h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                  <span>{p}</span>
                </li>
              ))}
            </ul>
          </div>

          {isTwoDays ? (
            <div
              className="rounded-xl p-7 border-l-4 relative overflow-hidden"
              style={{
                background: "var(--gradient-sand)",
                borderLeftColor: "hsl(var(--sunset))",
              }}
            >
              <div className="flex items-center gap-2 mb-3">
                <CalendarDays className="h-5 w-5" style={{ color: "hsl(var(--sunset))" }} />
                <h3 className="font-display font-semibold text-lg text-foreground">
                  Doordeweekse aankomst aanbevolen
                </h3>
              </div>
              <p className="text-foreground/80 leading-relaxed">
                Voor tweedaagse programma's adviseren wij een aankomst van maandag
                t/m donderdag. In het weekend hanteren onze logiespartners doorgaans
                een minimum verblijf van twee nachten — een tweedaags arrangement
                op vrijdag of zaterdag is daardoor vaak niet mogelijk.
              </p>
              <p className="text-sm text-foreground/70 mt-3 italic">
                Onze reisspecialist denkt graag met u mee over alternatieve data.
              </p>
            </div>
          ) : (
            <div
              className="rounded-xl p-7"
              style={{ background: "var(--gradient-sand)" }}
            >
              <div className="flex items-center gap-2 mb-3">
                <CalendarDays className="h-5 w-5 text-primary" />
                <h3 className="font-display font-semibold text-lg text-foreground">
                  Volledig op maat
                </h3>
              </div>
              <p className="text-foreground/80 leading-relaxed">
                Dit voorbeeldprogramma is een vertrekpunt. Wij stemmen tijden,
                activiteiten en aantallen graag met u af zodat het arrangement
                naadloos aansluit bij uw groep en gelegenheid.
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};
