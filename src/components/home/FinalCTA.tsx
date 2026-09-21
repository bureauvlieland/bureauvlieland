import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowUpRight } from "lucide-react";
import { Container, Section, SectionHeader } from "@/components/system";

export const FinalCTA = ({ number }: { number: string }) => {
  return (
    <Section spacing="spacious" className="overflow-hidden">
      {/* Massive editorial typography backdrop */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none overflow-hidden">
        <div className="font-display italic text-[clamp(8rem,28vw,28rem)] leading-none text-primary/[0.04] whitespace-nowrap">
          Vlieland
        </div>
      </div>

      <Container size="full" className="relative z-10">
        <div className="mx-auto max-w-4xl text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            <SectionHeader
              eyebrow="Begin hier"
              number={number}
              size="xl"
              align="center"
              title={
                <>
                  Uw volgende eilanddag <span className="italic text-primary">begint nu.</span>
                </>
              }
              intro="Vijf minuten om uw programma samen te stellen. Vijf werkdagen tot een gedetailleerde offerte. Volledig vrijblijvend."
            />

            <div className="mt-12 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Button asChild size="xl">
                <Link to="/programma-samenstellen">
                  Start uw aanvraag
                  <ArrowUpRight aria-hidden="true" />
                </Link>
              </Button>
              <Button
                asChild
                size="xl"
                variant="ghost"
                className="text-foreground"
              >
                <a href="tel:0562700208">Liever bellen? 0562 700 208</a>
              </Button>
            </div>

            <div className="mt-16 flex flex-wrap justify-center gap-x-10 gap-y-4 border-t border-border pt-10 text-eyebrow font-medium uppercase text-muted-foreground">
              <span>· Maatwerk</span>
              <span>· Lokale specialist</span>
              <span>· Eén factuur</span>
              <span>· Vrijblijvende offerte</span>
            </div>
          </motion.div>
        </div>
      </Container>
    </Section>
  );
};
