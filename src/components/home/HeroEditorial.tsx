import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, MapPin, Sparkles } from "lucide-react";
import { RatingStars } from "@/components/RatingStars";
import { useGoogleReviewsCache } from "@/hooks/useGoogleReviewsCache";
import { RESPONSE_TIME } from "@/content/promises";

import heroImage from "@/assets/hero-vlieland.jpg";

/**
 * De hero van de homepage: foto en tekst naast elkaar in plaats van tekst
 * over een donker gemaakte foto. Op een telefoon staat de foto bovenaan,
 * zonder verloop, en de tekst daaronder op een licht zandvlak; vanaf `lg`
 * staat de tekst links en vult de foto de rechterhelft. De intro zegt wat
 * het bureau is (eilandbureau voor groepen), niet wat het niet is.
 */
const STATS = [
  { num: "8-150", label: "personen per groep" },
  { num: "200+", label: "groepen sinds 2017" },
  { num: "1", label: "aanspreekpunt" },
  { num: "1", label: "factuur" },
];

export const HeroEditorial = () => {
  const { data: google } = useGoogleReviewsCache();
  const rating = google?.rating && google.review_count > 0 ? google.rating : 4.9;
  return (
    <section className="relative bg-sand/40 overflow-hidden">
      <div className="lg:grid lg:grid-cols-12 lg:min-h-[calc(100vh-4rem)]">
        {/* Foto: bovenaan op een telefoon, rechts vanaf lg. Geen donkere lagen. */}
        <div className="relative h-[42vh] min-h-[280px] max-h-[460px] lg:h-auto lg:max-h-none lg:col-span-6 lg:col-start-7 lg:row-start-1">
          <img
            src={heroImage}
            alt="Groep schept op aan een buffet in de avondzon op Vlieland, met de vuurtoren op de achtergrond"
            className="absolute inset-0 h-full w-full object-cover object-[55%_45%]"
            width={1920}
            height={1281}
            fetchPriority="high"
            loading="eager"
            decoding="async"
          />
        </div>

        {/* Tekst: op een licht vlak, donkere letters. */}
        <div className="lg:col-span-6 lg:col-start-1 lg:row-start-1 flex flex-col px-4 sm:px-6 lg:px-12 xl:px-20 pt-10 pb-12 lg:py-16">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="flex items-center gap-3 text-primary mb-6 lg:mb-8"
          >
            <div className="h-px w-10 bg-sunset" />
            <MapPin className="h-4 w-4 text-sunset" aria-hidden="true" />
            <span className="text-eyebrow font-medium uppercase">Groepen op Vlieland</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 32 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
            className="font-display font-light text-primary leading-[0.95] tracking-tight"
          >
            <span className="block text-[clamp(2.75rem,5.5vw,5.5rem)]">Het eiland</span>
            <span className="block text-[clamp(2.75rem,5.5vw,5.5rem)] italic text-sunset font-normal">
              voor uw groep.
            </span>
            <span className="mt-5 block max-w-xl text-[clamp(1.2rem,1.6vw,1.6rem)] leading-snug tracking-normal text-foreground/80">
              Van 8 tot 150 personen, van boot tot borrel.
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="mt-8 max-w-xl text-lg lg:text-xl text-foreground/80 leading-relaxed font-light"
          >
            Bureau Vlieland is <strong className="font-normal text-primary">het eilandbureau voor groepen</strong>.
            Wij wonen hier, kennen de koks, gidsen en hoteliers, en regelen per groep de overnachting, het eten,
            het programma en de boot. U krijgt{" "}
            <strong className="font-normal text-primary">één aanspreekpunt en één factuur</strong>, ook tijdens uw verblijf.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6 }}
            className="mt-8 flex flex-col gap-4"
          >
            <Button asChild size="xl" className="w-full sm:w-auto sm:self-start">
              <Link to="/programma-op-maat">
                <Sparkles aria-hidden="true" />
                Start uw aanvraag
                <ArrowRight aria-hidden="true" />
              </Link>
            </Button>
            <p className="text-sm text-muted-foreground">Vrijblijvend, {RESPONSE_TIME.within} een voorstel.</p>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <RatingStars value={rating} small />
              <span className="font-medium text-foreground">{rating.toFixed(1).replace(".", ",")}</span>
              <span>·</span>
              <span>200+ groepen sinds 2017</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Liever eerst inspiratie?{" "}
              <Link
                to="/voorbeeldprogrammas"
                className="text-primary underline underline-offset-4 decoration-primary/40 hover:decoration-primary transition-colors"
              >
                Bekijk voorbeeldprogramma's
              </Link>
            </p>
          </motion.div>

          {/* Feiten */}
          <motion.dl
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 0.9 }}
            className="mt-12 lg:mt-auto lg:pt-14 pt-10 border-t border-primary/15 grid grid-cols-2 md:grid-cols-4 gap-6 lg:gap-8"
          >
            {STATS.map((s) => (
              <div key={s.label}>
                <dd className="font-display text-3xl lg:text-4xl text-primary font-light">{s.num}</dd>
                <dt className="mt-1.5 text-eyebrow font-medium uppercase text-muted-foreground">{s.label}</dt>
              </div>
            ))}
          </motion.dl>
        </div>
      </div>
    </section>
  );
};
