import { Sparkles } from "lucide-react";
import type { ProgramTemplateCopy } from "@/lib/programTemplateCopy";

export const ProgramHighlights = ({ copy }: { copy: ProgramTemplateCopy }) => {
  return (
    <section className="py-12 bg-background">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-5xl">
        <h2 className="text-2xl md:text-3xl font-display font-bold text-foreground mb-8 flex items-center gap-2">
          <Sparkles className="h-6 w-6 text-primary" />
          Wat maakt dit programma bijzonder
        </h2>
        <div className="grid sm:grid-cols-2 gap-x-8 gap-y-3">
          {copy.highlights.map((h, i) => (
            <div key={i} className="flex items-start gap-3">
              <div className="mt-1 h-2 w-2 rounded-full bg-primary shrink-0" />
              <p className="text-foreground">{h}</p>
            </div>
          ))}
        </div>
        {copy.story.length > 0 && (
          <div className="mt-10 space-y-4 max-w-3xl">
            {copy.story.map((p, i) => (
              <p key={i} className="text-lg text-muted-foreground leading-relaxed">
                {p}
              </p>
            ))}
          </div>
        )}
        {copy.vibe.length > 0 && (
          <div className="mt-8 flex flex-wrap gap-2">
            {copy.vibe.map((v) => (
              <span
                key={v}
                className="text-sm font-medium px-3 py-1 rounded-full bg-secondary text-secondary-foreground"
              >
                {v}
              </span>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};
