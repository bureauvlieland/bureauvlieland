import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import erwinPortrait from "@/assets/erwin-profile.jpg";

export const ErwinManifesto = () => {
  return (
    <section className="relative py-24 lg:py-32 bg-ocean-deep overflow-hidden">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-[1400px]">
        <div className="grid grid-cols-12 gap-6 lg:gap-12 items-center">
          {/* Portrait — large editorial */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.9 }}
            className="col-span-12 lg:col-span-5"
          >
            <div className="relative">
              <div className="aspect-[4/5] overflow-hidden rounded-sm shadow-dramatic">
                <img
                  src={erwinPortrait}
                  alt="Erwin Soolsma — Bureau Vlieland"
                  loading="lazy"
                  className="w-full h-full object-cover grayscale-[30%] hover:grayscale-0 transition-all duration-700"
                />
              </div>
              {/* Caption tag */}
              <div className="absolute -bottom-6 -right-2 lg:-right-6 bg-sunset text-sunset-foreground px-5 py-3 max-w-[200px]">
                <div className="text-[10px] uppercase tracking-[0.25em] opacity-70 mb-1">
                  Oprichter
                </div>
                <div className="font-display text-lg leading-tight">Erwin Soolsma</div>
              </div>
              {/* Vertical decorative text */}
              <div className="hidden lg:block absolute top-6 -left-12 -rotate-90 origin-top-left text-[10px] uppercase tracking-[0.4em] text-sand/40">
                · figuur 01 — sinds 2017 · Vlieland
              </div>
            </div>
          </motion.div>

          {/* Manifesto text */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.9, delay: 0.2 }}
            className="col-span-12 lg:col-span-7"
          >
            <div className="text-xs uppercase tracking-[0.3em] text-sunset font-medium mb-6">
              · 04 — Het verhaal achter
            </div>

            <blockquote className="font-display font-light text-primary-foreground leading-[1.05] text-[clamp(1.75rem,3.5vw,3rem)] mb-10">
              <span className="text-sunset font-normal italic">"</span>
              Wij geloven dat een eilanddag pas slaagt als de
              <span className="italic"> details</span> kloppen. De smaak van de catering, het tijdstip
              van de boot, de gids die zijn verhaal kent — dát is regie.
              <span className="text-sunset font-normal italic">"</span>
            </blockquote>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 mb-12 pt-10 border-t border-sand/15">
              {[
                {
                  k: "Lokaal",
                  v: "Wij wonen, werken en leven op Vlieland. Geen bemiddeling — directe lijnen.",
                },
                {
                  k: "Eén regie",
                  v: "Van eerste contact tot eindafrekening: één aanspreekpunt voor alles.",
                },
                {
                  k: "Op maat",
                  v: "Geen pakketten, maar programma's die kloppen voor uw groep en doel.",
                },
              ].map((item, i) => (
                <div key={i} className="border-t-2 border-sunset/40 pt-5">
                  <div className="font-display italic text-sunset/70 text-sm mb-3">
                    {String(i + 1).padStart(2, "0")}
                  </div>
                  <h3 className="font-display text-2xl lg:text-3xl text-primary-foreground font-light mb-3 leading-tight">
                    {item.k}
                  </h3>
                  <p className="text-sand text-base leading-relaxed font-light">
                    {item.v}
                  </p>
                </div>
              ))}
            </div>

            <Link to="/contact">
              <Button
                size="lg"
                className="bg-sand text-ocean-deep hover:bg-primary-foreground rounded-sm h-14 px-8 group"
              >
                Plan een kennismaking
                <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Button>
            </Link>
          </motion.div>
        </div>
      </div>
    </section>
  );
};
