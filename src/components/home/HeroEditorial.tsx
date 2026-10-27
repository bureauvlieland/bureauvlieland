import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, MapPin, Sparkles } from "lucide-react";
import { RatingStars } from "@/components/RatingStars";
import { useGoogleReviewsCache } from "@/hooks/useGoogleReviewsCache";
import { RESPONSE_TIME } from "@/content/promises";

import heroImage from "@/assets/hero-speedboot.jpg";
import heroImage1600 from "@/assets/hero-speedboot-1600.jpg";
import heroImage960 from "@/assets/hero-speedboot-960.jpg";

/**
 * De hero van de homepage: één foto over de volle breedte, zonder donkere
 * verlopen, met de tekst in een compacte zandkaart. Vanaf `lg` ligt de
 * kaart links over de foto (op een ultrawide scherm blijft hij even breed en
 * wordt de foto groter); op een telefoon staat de foto bovenaan en schuift
 * de kaart over de onderrand. De feiten staan in een smalle band eronder.
 * De intro zegt wat het bureau is (eilandbureau voor groepen), niet wat het
 * niet is.
 *
 * De foto is een groep in de speedboot in de haven van Vlieland, uit het
 * origineel van 5933 px in de bouwstenen-opslag: 2880, 1600 en 960 px.
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
    <section className="relative bg-sand/40">
      <div className="relative">
        {/* Foto over de volle breedte. Geen verloop: de kaart zorgt voor leesbaarheid. */}
        <div className="relative h-[58vh] min-h-[380px] max-h-[640px] lg:h-[calc(100vh-4rem)] lg:min-h-[640px] lg:max-h-none">
          <img
            src={heroImage}
            srcSet={`${heroImage960} 960w, ${heroImage1600} 1600w, ${heroImage} 2880w`}
            sizes="100vw"
            alt="Groep in gele jassen zwaait en lacht vanuit een speedboot in de haven van Vlieland"
            className="absolute inset-0 h-full w-full object-cover object-[58%_45%]"
            width={2880}
            height={1923}
            fetchPriority="high"
            loading="eager"
            decoding="async"
          />
        </div>

        {/* Tekstkaart: op een telefoon over de onderrand van de foto, vanaf lg links over de foto. */}
        <div className="relative -mt-20 px-4 sm:px-6 lg:absolute lg:inset-0 lg:mt-0 lg:flex lg:items-center lg:px-8 xl:px-16">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            className="mx-auto w-full max-w-xl rounded-lg bg-sand p-6 shadow-dramatic sm:p-8 lg:mx-0 lg:p-10"
          >
            <div className="mb-5 flex items-center gap-3 text-primary">
              <div className="h-px w-8 bg-sunset" />
              <MapPin className="h-4 w-4 text-sunset" aria-hidden="true" />
              <span className="text-eyebrow font-medium uppercase">Groepen op Vlieland</span>
            </div>

            <h1 className="font-display font-light text-primary leading-[0.95] tracking-tight">
              <span className="block text-[clamp(2.5rem,4.5vw,4.25rem)]">Het eiland</span>
              <span className="block text-[clamp(2.5rem,4.5vw,4.25rem)] italic text-sunset font-normal">
                voor uw groep.
              </span>
              <span className="mt-4 block text-[clamp(1.125rem,1.4vw,1.375rem)] leading-snug tracking-normal text-foreground/80">
                Van 8 tot 150 personen, van boot tot borrel.
              </span>
            </h1>

            <p className="mt-5 text-base leading-relaxed text-foreground/80 lg:text-lg">
              Bureau Vlieland is <strong className="font-normal text-primary">het eilandbureau voor groepen</strong>.
              Wij wonen hier, kennen de koks, gidsen en hoteliers, en regelen per groep de overnachting, het eten,
              het programma en de boot. U krijgt{" "}
              <strong className="font-normal text-primary">één aanspreekpunt en één factuur</strong>, ook tijdens uw
              verblijf.
            </p>

            <div className="mt-6 flex flex-col gap-3">
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
            </div>
          </motion.div>
        </div>
      </div>

      {/* Feiten: smalle band onder de foto. */}
      <motion.dl
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1, delay: 0.6 }}
        className="container mx-auto grid max-w-7xl grid-cols-2 gap-6 px-4 py-8 sm:px-6 md:grid-cols-4 lg:gap-8 lg:px-8 lg:py-10"
      >
        {STATS.map((s) => (
          <div key={s.label}>
            <dd className="font-display text-3xl font-light text-primary lg:text-4xl">{s.num}</dd>
            <dt className="mt-1.5 text-eyebrow font-medium uppercase text-muted-foreground">{s.label}</dt>
          </div>
        ))}
      </motion.dl>
    </section>
  );
};
