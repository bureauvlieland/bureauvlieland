import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import erwinPortrait from "@/assets/erwin-profile.jpg";
import { Container, Section } from "@/components/system";

export const ErwinManifesto = ({ number }: { number: string }) => {
  return (
    <Section tone="dark" spacing="spacious" className="overflow-hidden">
      <Container size="full">
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
                <div className="mb-1 text-eyebrow font-medium uppercase opacity-70">
                  Oprichter
                </div>
                <div className="font-display text-lg leading-tight">Erwin Soolsma</div>
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
            <p className="mb-6 text-eyebrow font-medium uppercase text-sand">· {number} — Het verhaal achter</p>

            <blockquote className="font-display font-light text-primary-foreground leading-[1.05] text-[clamp(1.75rem,3.5vw,3rem)] mb-10">
              <span className="text-sunset font-normal italic">"</span>
              Vlieland is <span className="italic">klein</span>, en dat is precies de kracht. Wij weten wie u moet hebben voor een goede maaltijd, een mooie tocht, een bijzondere plek. U vertelt wat u zoekt, wij zetten het in gang met de mensen die we al jaren kennen. Eén factuur achteraf; verder hoeft u nergens aan te denken.
              <span className="text-sunset font-normal italic">"</span>
            </blockquote>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 mb-12 pt-10 border-t border-sand/15">
              {[
                {
                  k: "Lokaal",
                  v: "Wij wonen op Vlieland en werken al jaren met dezelfde gidsen, koks en hoteliers.",
                },
                {
                  k: "Eén factuur",
                  v: "Van eerste contact tot eindafrekening: één aanspreekpunt voor alles wat u op Vlieland boekt.",
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

            <Button asChild size="xl">
              <Link to="/contact">
                Plan een kennismaking
                <ArrowRight aria-hidden="true" />
              </Link>
            </Button>
          </motion.div>
        </div>
      </Container>
    </Section>
  );
};
