import { Users, Info } from "lucide-react";
import type { ProgramTemplateCopy } from "@/lib/programTemplateCopy";

type Props = {
  copy: ProgramTemplateCopy;
  durationDays: number;
};

export const ProgramPractical = ({ copy, durationDays }: Props) => {
  const isTwoDays = durationDays === 2;
  return (
    <section className="py-12 bg-muted/20">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-5xl grid md:grid-cols-2 gap-10">
        <div>
          <h2 className="text-2xl font-display font-bold text-foreground mb-4 flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Voor wie
          </h2>
          <p className="text-muted-foreground leading-relaxed">{copy.forWhom}</p>
        </div>

        <div>
          <h2 className="text-2xl font-display font-bold text-foreground mb-4 flex items-center gap-2">
            <Info className="h-5 w-5 text-primary" />
            Praktische info
          </h2>
          <ul className="space-y-2">
            {copy.practical.map((p, i) => (
              <li key={i} className="flex items-start gap-2 text-muted-foreground">
                <span className="mt-2 h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                <span>{p}</span>
              </li>
            ))}
          </ul>

          {isTwoDays && (
            <div className="mt-6 rounded-lg border border-primary/30 bg-primary/5 p-4">
              <h3 className="font-semibold text-foreground mb-1">
                Doordeweekse aankomst aanbevolen
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Voor tweedaagse programma's adviseren wij een doordeweekse aankomst
                (maandag t/m donderdag). In het weekend hanteren onze logiespartners
                doorgaans een minimum verblijf van twee nachten, waardoor een
                tweedaags arrangement op vrijdag of zaterdag vaak niet mogelijk is.
                Onze reisspecialist denkt graag met u mee over alternatieve data.
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};
