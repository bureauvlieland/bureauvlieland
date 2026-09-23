import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, MapPin, Sparkles } from "lucide-react";
import { RatingStars } from "@/components/RatingStars";
import { useGoogleReviewsCache } from "@/hooks/useGoogleReviewsCache";

const heroImage =
  `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/building-block-images/1785853376111-Diner-online-106.jpg`;

export const HeroEditorial = () => {
  const { data: google } = useGoogleReviewsCache();
  const rating = google?.rating && google.review_count > 0 ? google.rating : 4.9;
  return (
    <section className="relative min-h-screen bg-ocean-deep overflow-hidden">
      {/* Full-bleed background image */}
      <div className="absolute inset-0">
        <img
          src={heroImage}
          alt="Sfeervol diner voor een groep op Vlieland"
          className="w-full h-full object-cover"
          width={1920}
          height={1280}
          fetchPriority="high"
          loading="eager"
          decoding="async"
        />
        {/* Top vignette for nav legibility */}
        <div className="absolute inset-x-0 top-0 h-64 bg-gradient-to-b from-ocean-deep/60 to-transparent pointer-events-none" />
        {/* Bottom warm gradient for text legibility */}
        <div className="absolute inset-x-0 bottom-0 h-[80%] bg-gradient-to-t from-ocean-deep/90 via-ocean-deep/55 to-transparent pointer-events-none" />
        {/* Subtle left wash for headline contrast */}
        <div className="absolute inset-0 bg-gradient-to-r from-ocean-deep/40 via-transparent to-transparent pointer-events-none" />
      </div>

      <div className="relative z-10 container mx-auto px-4 sm:px-6 lg:px-8 max-w-[1400px] pt-32 pb-20 lg:pt-40 min-h-screen flex flex-col">
        {/* Top meta line */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="flex items-center gap-3 text-sand mb-12"
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
          <span className="block text-[clamp(3rem,8vw,8rem)]">Het eiland</span>
          <span className="block text-[clamp(3rem,8vw,8rem)] italic text-sunset font-normal">
            voor uw groep.
          </span>
          <span className="mt-4 block text-[clamp(1.75rem,4vw,4rem)] leading-tight">Wij kennen het, van boot tot borrel.</span>
        </motion.h1>

        {/* Lower content row */}
        <div className="grid grid-cols-12 gap-6 mt-12 lg:mt-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.5 }}
            className="col-span-12 lg:col-span-6 lg:col-start-1"
          >
            <p className="text-lg lg:text-xl text-sand/95 leading-relaxed font-light">
              Bureau Vlieland is uw <em className="text-primary-foreground not-italic font-normal">lokale specialist</em> voor groepsbezoek aan Vlieland.
              Wij ontwikkelen het programma, boeken alle eilandpartners en sturen u <em className="text-primary-foreground not-italic font-normal">één factuur</em>.
              Op het eiland bent u te gast bij gidsen, koks en schippers die hier wonen en werken.
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
            { num: "8+", label: "jaar lokale specialist" },
            { num: "200+", label: "programma's georganiseerd" },
            { num: "20+", label: "lokale partners" },
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
