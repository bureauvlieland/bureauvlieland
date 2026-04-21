import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowRight, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Template {
  id: string;
  name: string;
  short_description: string | null;
  duration_days: number;
  image_url: string | null;
  indicative_price_pp: number | null;
}

export const ProgramTemplatesPreview = () => {
  const [templates, setTemplates] = useState<Template[]>([]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("program_templates")
        .select("id, name, short_description, duration_days, image_url, indicative_price_pp")
        .eq("is_published", true)
        .order("sort_order")
        .order("name")
        .limit(8);
      if (data) {
        // Dedupe by name (case-insensitive) and cap at 3
        const seen = new Set<string>();
        const unique = (data as Template[]).filter((t) => {
          const key = t.name.trim().toLowerCase();
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        }).slice(0, 3);
        setTemplates(unique);
      }
    })();
  }, []);

  if (templates.length === 0) return null;

  return (
    <section className="relative py-24 lg:py-32 bg-gradient-sand overflow-hidden">
      {/* Decorative type accent */}
      <div className="absolute -top-20 -right-20 lg:right-10 pointer-events-none select-none opacity-[0.04]">
        <div className="font-display italic text-[20rem] leading-none text-foreground">
          ‘27
        </div>
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-[1400px] relative z-10">
        <div className="grid grid-cols-12 gap-6 mb-16">
          <div className="col-span-12 lg:col-span-4">
            <div className="text-xs uppercase tracking-[0.3em] text-sunset font-medium mb-4">
              · 03 — Voorbeeldprogramma's
            </div>
            <h2 className="font-display font-light text-foreground leading-[0.95] text-[clamp(2.5rem,5.5vw,4.5rem)]">
              Klaar om{" "}
              <span className="italic text-primary">te boeken.</span>
            </h2>
          </div>
          <div className="col-span-12 lg:col-span-5 lg:col-start-7 lg:self-end">
            <p className="text-lg text-muted-foreground font-light">
              Liever niet vanaf nul beginnen? Kies één van onze beproefde
              programma's en pas hem aan naar wens. Inclusief activiteiten,
              catering en logistiek.
            </p>
          </div>
        </div>

        {/* Editorial card stack */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
          {templates.map((tpl, i) => (
            <motion.div
              key={tpl.id}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.7, delay: i * 0.1 }}
              className={i % 2 === 1 ? "md:translate-y-12" : ""}
            >
              <Link
                to={`/programma-samenstellen?template=${tpl.id}`}
                className="group block"
              >
                <div className="relative aspect-[4/5] overflow-hidden rounded-sm bg-muted shadow-medium hover:shadow-dramatic transition-shadow duration-500">
                  {tpl.image_url && (
                    <img
                      src={tpl.image_url}
                      alt={tpl.name}
                      loading="lazy"
                      className="absolute inset-0 w-full h-full object-cover transition-transform duration-[1200ms] group-hover:scale-105"
                    />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-ocean-deep/90 via-ocean-deep/30 to-transparent" />

                  {/* Top meta */}
                  <div className="absolute top-6 left-6 right-6 flex items-center justify-between">
                    <div className="flex items-center gap-2 bg-primary-foreground/15 backdrop-blur-md px-3 py-1.5 rounded-sm">
                      <Clock className="h-3 w-3 text-primary-foreground" />
                      <span className="text-xs uppercase tracking-widest text-primary-foreground font-medium">
                        {tpl.duration_days === 1
                          ? "1 dag"
                          : `${tpl.duration_days} dagen`}
                      </span>
                    </div>
                    <div className="font-display italic text-primary-foreground/60 text-sm">
                      n° {String(i + 1).padStart(2, "0")}
                    </div>
                  </div>

                  {/* Bottom content */}
                  <div className="absolute bottom-0 left-0 right-0 p-6 lg:p-8">
                    <h3 className="font-display font-light text-primary-foreground text-3xl lg:text-4xl mb-3 leading-tight">
                      {tpl.name}
                    </h3>
                    {tpl.short_description && (
                      <p className="text-sand/85 text-sm lg:text-base font-light line-clamp-2 mb-5">
                        {tpl.short_description}
                      </p>
                    )}
                    <div className="flex items-center gap-2 text-sunset text-sm font-medium uppercase tracking-widest group-hover:gap-4 transition-all">
                      <span>Bekijk programma</span>
                      <ArrowRight className="h-4 w-4" />
                    </div>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};
