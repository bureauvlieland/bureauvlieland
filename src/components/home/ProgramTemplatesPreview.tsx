import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowRight, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { transformImageUrl } from "@/lib/supabaseImage";
import { Container, Section, SectionHeader } from "@/components/system";

interface Template {
  id: string;
  name: string;
  short_description: string | null;
  duration_days: number;
  image_url: string | null;
  indicative_price_pp: number | null;
}

export const ProgramTemplatesPreview = ({ number }: { number: string }) => {
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
        }).slice(0, 4);
        setTemplates(unique);
      }
    })();
  }, []);

  if (templates.length === 0) return null;

  return (
    <Section spacing="spacious" className="overflow-hidden">
      <Container size="full">
        <SectionHeader
          eyebrow="Voorbeeldprogramma's"
          number={number}
          size="xl"
          title={
            <>
              Klaar om <span className="italic text-primary">te boeken.</span>
            </>
          }
          intro="Liever niet vanaf nul beginnen? Kies één van onze beproefde programma's en pas hem aan naar wens. Inclusief activiteiten, catering en logistiek."
        />

        {/* Redactionele kaartstapel */}
        <div className="mt-16 grid grid-cols-1 gap-6 md:grid-cols-2 lg:gap-8">
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
                to={`/voorbeeldprogrammas/${tpl.id}`}
                className="group block"
              >
                <div className="relative aspect-[4/5] overflow-hidden rounded-sm bg-muted shadow-medium hover:shadow-dramatic transition-shadow duration-500">
                  {tpl.image_url && (
                    <img
                      src={transformImageUrl(tpl.image_url, { width: 900, quality: 78 })}
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
                      <span className="text-eyebrow font-medium uppercase text-primary-foreground">
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
                    <div className="flex items-center gap-2 text-sm font-medium text-sand transition-all group-hover:gap-4">
                      <span>Bekijk programma</span>
                      <ArrowRight className="h-4 w-4" />
                    </div>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </Container>
    </Section>
  );
};
