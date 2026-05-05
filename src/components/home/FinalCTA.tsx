import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowUpRight } from "lucide-react";

export const FinalCTA = () => {
  return (
    <section className="relative py-32 lg:py-48 bg-background overflow-hidden">
      {/* Massive editorial typography backdrop */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none overflow-hidden">
        <div className="font-display italic text-[clamp(8rem,28vw,28rem)] leading-none text-primary/[0.04] whitespace-nowrap">
          Vlieland
        </div>
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-[1400px] relative z-10">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            <div className="text-xs uppercase tracking-[0.3em] text-sunset font-medium mb-8">
              · 05 — Begin hier
            </div>
            <h2 className="font-display font-light text-foreground leading-[0.95] text-[clamp(2.5rem,7vw,6rem)] mb-10">
              Uw volgende eilanddag{" "}
              <span className="italic text-primary">begint nu.</span>
            </h2>
            <p className="text-lg lg:text-xl text-muted-foreground font-light max-w-2xl mx-auto mb-12 leading-relaxed">
              Vijf minuten om uw programma samen te stellen. Vijf werkdagen tot
              een gedetailleerde offerte. Volledig vrijblijvend.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Link to="/programma-samenstellen" className="group">
                <Button
                  size="lg"
                  className="bg-primary text-primary-foreground hover:bg-ocean-deep rounded-sm h-16 px-10 text-base shadow-medium"
                >
                  Stel uw programma samen
                  <ArrowUpRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1 group-hover:-translate-y-1" />
                </Button>
              </Link>
              <Link to="/contact">
                <Button
                  size="lg"
                  variant="ghost"
                  className="rounded-sm h-16 px-8 text-base text-foreground hover:bg-muted"
                >
                  Liever bellen? +31 6 ...
                </Button>
              </Link>
            </div>

            <div className="mt-16 pt-10 border-t border-border flex flex-wrap justify-center gap-x-10 gap-y-4 text-xs uppercase tracking-[0.25em] text-muted-foreground">
              <span>· Maatwerk</span>
              <span>· Lokale specialist</span>
              <span>· Eén factuur</span>
              <span>· Vrijblijvende offerte</span>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};
