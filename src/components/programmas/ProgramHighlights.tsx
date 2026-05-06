import { Check } from "lucide-react";
import type { ProgramTemplateCopy } from "@/lib/programTemplateCopy";

export const ProgramHighlights = ({ copy }: { copy: ProgramTemplateCopy }) => {
  return (
    <section
      className="py-20"
      style={{ background: "var(--gradient-sand)" }}
    >
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-6xl">
        <div className="mb-12 max-w-2xl">
          <p className="text-xs uppercase tracking-[0.2em] text-primary/70 font-semibold mb-3">
            Het programma
          </p>
          <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground leading-tight">
            Wat dit programma bijzonder maakt
          </h2>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {copy.highlights.map((h, i) => (
            <div
              key={i}
              className="group relative bg-card rounded-xl p-5 flex items-start gap-3 border border-border/50 hover:border-primary/30 transition-all"
              style={{ boxShadow: "var(--shadow-soft)" }}
            >
              <div className="shrink-0 h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                <Check className="h-4 w-4" strokeWidth={3} />
              </div>
              <p className="text-foreground leading-snug pt-1">{h}</p>
            </div>
          ))}
        </div>

        {copy.story.length > 0 && (
          <div className="mt-16 max-w-2xl mx-auto text-center">
            <div className="h-px w-12 bg-[hsl(var(--sunset))] mx-auto mb-8" />
            {copy.story.map((p, i) => (
              <p
                key={i}
                className={`text-lg md:text-xl text-foreground/80 leading-relaxed ${
                  i === 0 ? "font-display italic" : "mt-4"
                }`}
              >
                {p}
              </p>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};
