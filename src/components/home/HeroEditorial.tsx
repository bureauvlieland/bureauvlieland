import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, MapPin, Sparkles } from "lucide-react";
import { RatingStars } from "@/components/RatingStars";
import { useGoogleReviewsCache } from "@/hooks/useGoogleReviewsCache";

import heroImage from "@/assets/sunset-dinner.jpg";

export const HeroEditorial = () => {
  const { data: google } = useGoogleReviewsCache();
  const rating = google?.rating && google.review_count > 0 ? google.rating : 4.9;
  return (
    <section className="relative min-h-screen bg-ocean-deep overflow-hidden">
      {/* Full-bleed background image */}
      <div className="absolute inset-0">
        <img
          src={heroImage}
          alt="Lange tafel voor een groep bij zonsondergang op Vlieland, met de vuurtoren op de achtergrond"
          className="w-full h-full object-cover object-[50%_80%]"
          width={1920}
          height={1277}
          fetchPriority="high"
          loading="eager"
          decoding="async"
        />
        {/* Top vignette for nav and headline legibility (the sky in this photo is light) */}
        <div className="absolute inset-x-0 top-0 h-[55%] bg-gradient-to-b from-ocean-deep/70 via-ocean-deep/30 to-transparent pointer-events-none" />
        {/* Bottom warm gradient for text legibility */}
        <div className="absolute inset-x-0 bottom-0 h-[80%] bg-gradient-to-t from-ocean-deep/90 via-ocean-deep/55 to-transparent pointer-events-none" />
        {/* Subtle left wash for headline contrast */}
        <div className="absolute inset-0 bg-gradient-to-r from-ocean-deep/50 via-ocean-deep/10 to-transparent pointer-events-none" />
      </div>

      <div className="relative z-10 container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl pt-28 pb-16 lg:pt-32 lg:pb-20 min-h-screen flex flex-col">
        {/* Top meta line */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="flex items-center gap-3 text-sand mb-8 lg:mb-10"
        >
          <div className="h-px w-12 bg-sunset" />
          <MapPin className="h-4 w-4 text-sunset" />
          <span className="text-eyebrow font-medium uppercase">
            est. 2017 · 53°17′N · Vlieland
          </span>
        </motion.div>

        {/* Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
          className="font-display font-light text-primary-foreground leading-[0.92] tracking-tight max-w-5xl"
        >
          <span className="block text-[clamp(3rem,6.5vw,6.5rem)]">Het eiland</span>
          <span className="block text-[clamp(3rem,6.5vw,6.5rem)] italic text-sunset font-normal">
            voor uw groep.
          </span>
          <span className="mt-5 block max-w-2xl text-[clamp(1.25rem,1.8vw,1.75rem)] leading-snug tracking-normal text-sand">
            Van 50 tot 150 personen, van boot tot borrel.
          </span>
        </motion.h1>

        {/* Lower content row */}
        <div className="grid grid-cols-12 gap-6 mt-10 lg:mt-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.5 }}
            className="col-span-12 lg:col-span-6 lg:col-start-1"
          >
            <p className="text-lg lg:text-xl text-sand/95 leading-relaxed font-light">
              Bureau Vlieland is <em className="text-primary-foreground not-italic font-normal">niet van een hotel</em>.
              Wij kiezen per groep de overnachting die past, regelen eten, programma en de boot, en sturen u <em className="text-primary-foreground not-italic font-normal">één factuur</em>.
              Eilanders die alle partners kennen, met één aanspreekpunt, ook tijdens uw verblijf.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.7 }}
            className="col-span-12 lg:col-span-5 lg:col-start-8 flex flex-col gap-4 lg:items-end"
          >
            <Button asChild size="xl">
              <a href="#routes">
                <Sparkles aria-hidden="true" />
                Start uw aanvraag
                <ArrowRight aria-hidden="true" />
              </a>
            </Button>
            <p className="text-sm text-sand/80 lg:text-right">Voor groepen vanaf 50 personen.</p>
            <div className="flex items-center gap-2 text-sm text-sand/90 lg:justify-end">
              <RatingStars value={rating} small />
              <span className="font-medium text-primary-foreground">{rating.toFixed(1).replace(".", ",")}</span>
              <span className="text-sand/70">·</span>
              <span>200+ groepen sinds 2017</span>
            </div>
            <p className="text-sm text-sand/80 lg:text-right">
              Liever volledig op maat?{" "}
              <Link
                to="/programma-op-maat"
                className="text-sand underline underline-offset-4 decoration-sand/40 hover:text-primary-foreground hover:decoration-sand transition-colors"
              >
                Vraag een programma op maat aan
              </Link>
            </p>
          </motion.div>
        </div>

        {/* Stats strip */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 1 }}
          className="mt-auto pt-12 lg:pt-16 border-t border-sand/20 grid grid-cols-2 md:grid-cols-4 gap-8"
        >
          {[
            { num: "50-150", label: "personen per groep" },
            { num: "200+", label: "programma's sinds 2017" },
            { num: "0", label: "eigen bedden te vullen" },
            { num: "1", label: "factuur, alles geregeld" },
          ].map((s, i) => (
            <div key={i} className="text-sand">
              <div className="font-display text-4xl lg:text-5xl text-primary-foreground font-light">
                {s.num}
              </div>
              <div className="mt-2 text-eyebrow font-medium uppercase text-sand/80">
                {s.label}
              </div>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};
