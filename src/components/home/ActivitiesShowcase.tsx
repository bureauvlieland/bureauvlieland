import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

interface Activity {
  id: string;
  name: string;
  short_description: string | null;
  category: string;
  image_url: string | null;
}

const FALLBACK: Activity[] = [
  { id: "zeehondentocht", name: "Zeehondentocht", short_description: "Spot zeehonden in hun natuurlijke habitat", category: "excursies", image_url: null },
  { id: "vliehors-expres", name: "Vliehors Expres", short_description: "Ontdek de Sahara van het Noorden", category: "excursies", image_url: null },
  { id: "voc-blokarten", name: "Blokarten", short_description: "Racen over het strand met windkracht", category: "outdoor", image_url: null },
  { id: "surfen", name: "Surfles", short_description: "Surfles voor beginners en gevorderden", category: "outdoor", image_url: null },
  { id: "vliegeren", name: "Powerkiten", short_description: "Spectaculair vliegeren op het strand", category: "outdoor", image_url: null },
  { id: "vuurtoren", name: "Vuurtorenbezoek", short_description: "Adembenemend uitzicht", category: "excursies", image_url: null },
];

export const ActivitiesShowcase = () => {
  const [activities, setActivities] = useState<Activity[]>(FALLBACK);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("building_blocks")
        .select("id, name, short_description, category, image_url")
        .eq("status", "published")
        .in("category", ["outdoor", "excursies", "entertainment"])
        .order("sort_order")
        .limit(8);
      if (data && data.length > 0) setActivities(data as Activity[]);
    })();
  }, []);

  return (
    <section className="relative py-24 lg:py-32 bg-background overflow-hidden">
      {/* Editorial header */}
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-[1400px]">
        <div className="grid grid-cols-12 gap-6 mb-16">
          <div className="col-span-12 lg:col-span-3">
            <div className="text-xs uppercase tracking-[0.3em] text-sunset font-medium mb-4">
              · 02 — Bouwstenen
            </div>
          </div>
          <div className="col-span-12 lg:col-span-9">
            <h2 className="font-display font-light text-foreground leading-[0.95] text-[clamp(2.5rem,6vw,5.5rem)]">
              Honderden mogelijkheden,{" "}
              <span className="italic text-primary">één eiland.</span>
            </h2>
            <p className="text-lg text-muted-foreground mt-6 max-w-2xl font-light">
              Van wadlopen bij zonsopgang tot powerkiten op het strand. Iedere
              activiteit is zorgvuldig geselecteerd in samenwerking met onze lokale partners.
            </p>
          </div>
        </div>

        {/* Asymmetric mosaic grid */}
        <div className="grid grid-cols-12 gap-3 lg:gap-4">
          {activities.slice(0, 6).map((activity, i) => {
            // Asymmetric layout: alternate sizes
            const layouts = [
              "col-span-12 md:col-span-7 row-span-2 aspect-[16/10] md:aspect-auto",
              "col-span-12 md:col-span-5 aspect-[4/3]",
              "col-span-6 md:col-span-3 aspect-square",
              "col-span-6 md:col-span-2 aspect-[3/4] md:aspect-auto",
              "col-span-12 md:col-span-5 aspect-[4/3]",
              "col-span-12 md:col-span-7 aspect-[16/9]",
            ];
            return (
              <motion.div
                key={activity.id}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.6, delay: i * 0.08 }}
                className={`group relative overflow-hidden rounded-sm bg-muted ${layouts[i]}`}
              >
                {activity.image_url ? (
                  <img
                    src={activity.image_url}
                    alt={activity.name}
                    loading="lazy"
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-[1200ms] group-hover:scale-110"
                  />
                ) : (
                  <div className="absolute inset-0 bg-gradient-ocean" />
                )}

                <div className="absolute inset-0 bg-gradient-to-t from-ocean-deep via-ocean-deep/30 to-transparent opacity-90 group-hover:opacity-95 transition-opacity" />

                <div className="absolute inset-0 p-6 lg:p-8 flex flex-col justify-end">
                  <div className="text-[10px] uppercase tracking-[0.25em] text-sunset mb-2 font-medium">
                    {activity.category === "outdoor" ? "Outdoor" : activity.category === "excursies" ? "Excursie" : "Beleving"}
                  </div>
                  <h3 className="font-display text-2xl lg:text-3xl text-primary-foreground font-light mb-2">
                    {activity.name}
                  </h3>
                  {activity.short_description && (
                    <p className="text-sm text-sand/80 max-w-md line-clamp-2 font-light">
                      {activity.short_description}
                    </p>
                  )}
                </div>

                <div className="absolute top-4 right-4 lg:top-6 lg:right-6 h-10 w-10 rounded-full bg-primary-foreground/10 backdrop-blur-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all group-hover:translate-x-0 -translate-x-2">
                  <ArrowUpRight className="h-4 w-4 text-primary-foreground" />
                </div>
              </motion.div>
            );
          })}
        </div>

        <div className="mt-12 text-center">
          <Link to="/programma-samenstellen">
            <Button
              size="lg"
              variant="outline"
              className="rounded-sm border-foreground/20 text-foreground hover:bg-foreground hover:text-background h-14 px-8"
            >
              Bekijk alle bouwstenen
              <ArrowUpRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
};
