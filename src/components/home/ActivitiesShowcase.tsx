import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Container, Section, SectionHeader } from "@/components/system";
import { transformImageUrl } from "@/lib/supabaseImage";

interface Activity {
  id: string;
  slug: string | null;
  name: string;
  short_description: string | null;
  category: string;
  image_url: string | null;
}

const FALLBACK: Activity[] = [
  { id: "zeehondentocht", slug: "zeehondentocht", name: "Zeehondentocht", short_description: "Spot zeehonden in hun natuurlijke habitat", category: "excursies", image_url: null },
  { id: "vliehors-expres", slug: "vliehors-expres", name: "Vliehors Expres", short_description: "Ontdek de Sahara van het Noorden", category: "excursies", image_url: null },
  { id: "voc-blokarten", slug: "voc-blokarten", name: "Blokarten", short_description: "Racen over het strand met windkracht", category: "outdoor", image_url: null },
  { id: "surfen", slug: "surfen", name: "Surfles", short_description: "Surfles voor beginners en gevorderden", category: "outdoor", image_url: null },
  { id: "vliegeren", slug: "vliegeren", name: "Powerkiten", short_description: "Spectaculair vliegeren op het strand", category: "outdoor", image_url: null },
  { id: "vuurtoren", slug: "vuurtoren", name: "Vuurtorenbezoek", short_description: "Adembenemend uitzicht", category: "excursies", image_url: null },
];

export const ActivitiesShowcase = ({ number }: { number: string }) => {
  const [activities, setActivities] = useState<Activity[]>(FALLBACK);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("building_blocks")
        .select("id, slug, name, short_description, category, image_url")
        .eq("status", "published")
        .in("category", ["outdoor", "excursies", "entertainment"])
        .order("sort_order")
        .limit(8);
      if (data && data.length > 0) setActivities(data as Activity[]);
    })();
  }, []);

  return (
    <Section spacing="spacious" className="overflow-hidden">
      <Container size="full">
        <SectionHeader
          eyebrow="Bouwstenen"
          number={number}
          size="xl"
          title={
            <>
              Honderden mogelijkheden, <span className="italic text-primary">één eiland.</span>
            </>
          }
          intro="Van een wadexcursie bij zonsopgang tot powerkiten op het strand. Iedere activiteit is zorgvuldig geselecteerd in samenwerking met onze lokale partners."
        />

        {/* Asymmetrisch mozaïek */}
        <div className="mt-16 grid grid-cols-12 gap-3 lg:gap-4">
          {activities.slice(0, 6).map((activity, i) => {
            // Asymmetrisch mozaïek; op een telefoon elke tegel op volle breedte, anders knippen lange titels af
            const layouts = [
              "col-span-12 md:col-span-7 aspect-[16/10]",
              "col-span-12 md:col-span-5 aspect-[4/3]",
              "col-span-12 aspect-[4/3] md:col-span-4 md:aspect-square",
              "col-span-12 aspect-[4/3] md:col-span-4 md:aspect-square",
              "col-span-12 md:col-span-4 aspect-square",
              "col-span-12 aspect-[21/9]",
            ];
            return (
              <motion.div
                key={activity.id}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.6, delay: i * 0.08 }}
                className={layouts[i]}
              >
                <Link
                  to={`/activiteit/${activity.slug ?? activity.id}`}
                  className={`group relative block h-full w-full overflow-hidden rounded-sm bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-primary`}
                  aria-label={`Bekijk ${activity.name}`}
                >
                  {activity.image_url ? (
                    <img
                      src={transformImageUrl(activity.image_url, { width: 900, quality: 78 })}
                      alt={activity.name}
                      loading="lazy"
                      className="absolute inset-0 w-full h-full object-cover transition-transform duration-[1200ms] group-hover:scale-110"
                    />
                  ) : (
                    <div className="absolute inset-0 bg-gradient-ocean" />
                  )}

                  <div className="absolute inset-0 bg-ocean-deep/15" />
                  <div className="absolute inset-0 bg-gradient-to-t from-ocean-deep via-ocean-deep/70 to-ocean-deep/10" />

                  <div className="absolute inset-0 p-6 lg:p-8 flex flex-col justify-end pr-12 lg:pr-14">
                    <div className="mb-2 text-eyebrow font-medium uppercase text-sand">
                      {activity.category === "outdoor" ? "Outdoor" : activity.category === "excursies" ? "Excursie" : "Beleving"}
                    </div>
                    <h3 className="font-display text-2xl lg:text-3xl text-primary-foreground font-light mb-2 break-words">
                      {activity.name}
                    </h3>
                    {activity.short_description && (
                      <p className="text-sm text-sand/85 max-w-md line-clamp-2 font-light">
                        {activity.short_description}
                      </p>
                    )}
                    <div className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-sand transition-all group-hover:gap-3">
                      <span>Bekijk bouwsteen</span>
                      <ArrowUpRight className="h-3.5 w-3.5" />
                    </div>
                  </div>

                  <div className="absolute top-4 right-4 lg:top-6 lg:right-6 h-10 w-10 rounded-full bg-primary-foreground/10 backdrop-blur-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all group-hover:translate-x-0 -translate-x-2">
                    <ArrowUpRight className="h-4 w-4 text-primary-foreground" />
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>

        <div className="mt-12 text-center">
          <Button asChild size="lg" variant="outline">
            <Link to="/bouwstenen">
              Bekijk alle bouwstenen
              <ArrowUpRight aria-hidden="true" />
            </Link>
          </Button>
        </div>
      </Container>
    </Section>
  );
};
