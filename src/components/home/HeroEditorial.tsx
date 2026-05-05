import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, MapPin, Sparkles } from "lucide-react";
import heroImage from "@/assets/hero-vlieland-editorial.jpg";

export const HeroEditorial = () => {
  return (
    <section className="relative min-h-screen bg-ocean-deep overflow-hidden">
      {/* Full-bleed background image */}
      <div className="absolute inset-0">
        <img
          src={heroImage}
          alt="Vlieland strand bij zonsondergang met vuurtoren in de verte"
          className="w-full h-full object-cover"
          fetchPriority="high"
          loading="eager"
          style={{ animation: "kenBurns 40s ease-in-out infinite alternate" }}
        />
        {/* Top vignette for nav legibility */}
        <div className="absolute inset-x-0 top-0 h-64 bg-gradient-to-b from-ocean-deep/60 to-transparent pointer-events-none" />
        {/* Bottom warm gradient for text legibility */}
        <div className="absolute inset-x-0 bottom-0 h-[80%] bg-gradient-to-t from-ocean-deep/90 via-ocean-deep/55 to-transparent pointer-events-none" />
        {/* Subtle left wash for headline contrast */}
        <div className="absolute inset-0 bg-gradient-to-r from-ocean-deep/40 via-transparent to-transparent pointer-events-none" />
      </div>

      {/* Decorative grain overlay */}
      <div
        className="absolute inset-0 opacity-[0.06] mix-blend-overlay pointer-events-none"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
        }}
      />

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
          <span className="text-xs uppercase tracking-[0.3em] font-medium">
            est. 2017 — 53°17′N — Vlieland
          </span>
        </motion.div>

        {/* Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
          className="font-display font-light text-primary-foreground leading-[0.92] tracking-tight max-w-5xl"
          style={{ textShadow: "0 2px 30px hsl(var(--ocean-deep) / 0.6)" }}
        >
          <span className="block text-[clamp(3rem,8vw,8rem)]">Het eiland</span>
          <span className="block text-[clamp(3rem,8vw,8rem)] italic text-sunset font-normal">
            als bestemming.
          </span>
          <span className="block text-[clamp(3rem,8vw,8rem)]">Wij als gids ernaartoe.</span>
        </motion.h1>

        {/* Lower content row */}
        <div className="grid grid-cols-12 gap-6 mt-12 lg:mt-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.5 }}
            className="col-span-12 lg:col-span-6 lg:col-start-1"
          >
            <p
              className="text-lg lg:text-xl text-sand/95 leading-relaxed font-light"
              style={{ textShadow: "0 1px 20px hsl(var(--ocean-deep) / 0.6)" }}
            >
              Bureau Vlieland is uw <em className="text-primary-foreground not-italic font-normal">lokale specialist</em> voor groepsbezoek aan Vlieland.
              Wij ontwikkelen het programma, boeken alle eilandpartners en sturen u <em className="text-primary-foreground not-italic font-normal">één factuur</em>.
              Op het eiland bent u te gast bij gidsen, koks en schippers die hier wonen en werken.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.7 }}
            className="col-span-12 lg:col-span-5 lg:col-start-8 flex flex-col sm:flex-row gap-3 lg:items-end"
          >
            <Link to="/programma-samenstellen" className="group">
              <Button
                size="lg"
                className="bg-sunset hover:bg-sunset/90 text-sunset-foreground shadow-glow text-base px-8 h-14 rounded-sm group-hover:translate-x-1 transition-transform"
              >
                <Sparkles className="mr-2 h-4 w-4" />
                Stel uw programma samen
                <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Button>
            </Link>
            <Link to="/voorbeeldprogrammas">
              <Button
                size="lg"
                variant="outline"
                className="bg-transparent border-sand/40 text-sand hover:bg-sand/10 hover:text-primary-foreground text-base px-8 h-14 rounded-sm backdrop-blur-sm"
              >
                Bekijk voorbeeldprogramma's
              </Button>
            </Link>
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
              <div className="text-xs uppercase tracking-widest mt-2 text-sand/80">
                {s.label}
              </div>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};
