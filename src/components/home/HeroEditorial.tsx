import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, MapPin, Sparkles } from "lucide-react";
import heroImage from "@/assets/hero-vlieland.jpg";
import lighthouseImage from "@/assets/lighthouse-vlieland.jpg";
import beachImage from "@/assets/vlieland-beach.jpg";

export const HeroEditorial = () => {
  return (
    <section className="relative min-h-screen bg-ocean-deep overflow-hidden">
      {/* Background atmospheric layer */}
      <div className="absolute inset-0">
        <img
          src={heroImage}
          alt="Vlieland kustlandschap"
          className="w-full h-full object-cover opacity-25"
          fetchPriority="high"
          loading="eager"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-ocean-deep/85 via-ocean-deep/70 to-ocean-deep" />
        <div className="absolute inset-0 bg-gradient-to-r from-ocean-deep via-ocean-deep/40 to-ocean-deep/60" />
      </div>

      {/* Decorative grain overlay */}
      <div
        className="absolute inset-0 opacity-[0.08] mix-blend-overlay pointer-events-none"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
        }}
      />

      <div className="relative z-10 container mx-auto px-4 sm:px-6 lg:px-8 max-w-[1400px] pt-32 pb-20 lg:pt-40">
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
            53°17′N · 5°04′E — Vlieland
          </span>
        </motion.div>

        <div className="grid grid-cols-12 gap-6 items-end">
          {/* Main editorial headline — asymmetric */}
          <div className="col-span-12 lg:col-span-8">
            <motion.h1
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
              className="font-display font-light text-primary-foreground leading-[0.92] tracking-tight"
            >
              <span className="block text-[clamp(3rem,9vw,9rem)]">Het eiland</span>
              <span className="block text-[clamp(3rem,9vw,9rem)] italic text-sunset font-normal">
                als bestemming.
              </span>
              <span className="block text-[clamp(3rem,9vw,9rem)]">Wij als regie.</span>
            </motion.h1>
          </div>

          {/* Vertical accent image */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1, delay: 0.3 }}
            className="hidden lg:block col-span-4 self-end"
          >
            <div className="relative">
              <div className="aspect-[3/4] overflow-hidden rounded-sm shadow-dramatic">
                <img
                  src={lighthouseImage}
                  alt="Vuurtoren Vlieland"
                  className="w-full h-full object-cover"
                  style={{ animation: "kenBurns 30s ease-in-out infinite alternate" }}
                />
              </div>
              <div className="absolute -bottom-4 -left-4 bg-sunset text-sunset-foreground px-4 py-2 text-xs uppercase tracking-widest font-medium">
                est. sinds 2017
              </div>
            </div>
          </motion.div>
        </div>

        {/* Lower content row */}
        <div className="grid grid-cols-12 gap-6 mt-16 lg:mt-24">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.5 }}
            className="col-span-12 lg:col-span-5 lg:col-start-1"
          >
            <p className="text-lg lg:text-xl text-sand/90 leading-relaxed font-light">
              Bureau Vlieland orkestreert teamdagen, retraites en evenementen voor
              groepen die vragen om <em className="text-primary-foreground not-italic font-normal">verzorgde regie</em>,
              lokale kennis en culinaire kwaliteit op het mooiste Waddeneiland.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.7 }}
            className="col-span-12 lg:col-span-5 lg:col-start-7 flex flex-col sm:flex-row gap-3"
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
            <Link to="/diensten">
              <Button
                size="lg"
                variant="outline"
                className="bg-transparent border-sand/40 text-sand hover:bg-sand/10 hover:text-primary-foreground text-base px-8 h-14 rounded-sm"
              >
                Onze werkwijze
              </Button>
            </Link>
          </motion.div>
        </div>

        {/* Stats strip */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 1 }}
          className="mt-20 lg:mt-32 pt-10 border-t border-sand/15 grid grid-cols-2 md:grid-cols-4 gap-8"
        >
          {[
            { num: "8+", label: "jaar lokale regie" },
            { num: "200+", label: "evenementen verzorgd" },
            { num: "20+", label: "lokale partners" },
            { num: "100%", label: "maatwerk" },
          ].map((s, i) => (
            <div key={i} className="text-sand">
              <div className="font-display text-4xl lg:text-5xl text-primary-foreground font-light">
                {s.num}
              </div>
              <div className="text-xs uppercase tracking-widest mt-2 text-sand/70">
                {s.label}
              </div>
            </div>
          ))}
        </motion.div>
      </div>

      {/* Bottom horizon image strip */}
      <div className="absolute bottom-0 left-0 right-0 h-32 opacity-30 pointer-events-none">
        <img
          src={beachImage}
          alt=""
          className="w-full h-full object-cover"
          style={{ maskImage: "linear-gradient(to top, black, transparent)" }}
        />
      </div>
    </section>
  );
};
