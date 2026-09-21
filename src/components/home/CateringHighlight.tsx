import { Button } from "@/components/ui/button";
import { RESPONSE_TIME } from "@/content/promises";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { Container, Section, SectionHeader } from "@/components/system";
import lexenceTablesetting from "@/assets/lexence/lexence-tablesetting.jpg";
import lexenceAmuses from "@/assets/lexence/lexence-amuses-row.jpg";
import lexenceChefPlating from "@/assets/lexence/lexence-chef-plating.jpg";


export const CateringHighlight = ({ number }: { number: string }) => {
  return (
    <Section tone="sand" spacing="spacious" className="overflow-hidden">
      <Container size="wide">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-20 items-center">
          {/* Left: image composition */}
          <div className="lg:col-span-7 grid grid-cols-6 gap-4 md:gap-6 relative pb-16 lg:pb-12">
            <div className="col-span-4 row-span-2 overflow-hidden rounded-sm shadow-medium aspect-[4/5] group">
              <img
                src={lexenceChefPlating}
                alt="Chef plateert haute-cuisine gerecht op locatie op Vlieland"
                className="w-full h-full object-cover transition-transform duration-[1200ms] ease-out group-hover:scale-[1.03]"
                loading="lazy"
              />
            </div>

            <div className="col-span-2 space-y-4 md:space-y-6 pt-10 md:pt-16">
              <div className="aspect-square overflow-hidden rounded-sm shadow-soft group">
                <img
                  src={lexenceAmuses}
                  alt="Verfijnde amuses uitgeserveerd"
                  className="w-full h-full object-cover transition-transform duration-[1200ms] ease-out group-hover:scale-[1.03]"
                  loading="lazy"
                />
              </div>
              <div className="aspect-[3/4] overflow-hidden rounded-sm shadow-soft group">
                <img
                  src={lexenceTablesetting}
                  alt="Stijlvol gedekte tafel voor een privédiner op Vlieland"
                  className="w-full h-full object-cover transition-transform duration-[1200ms] ease-out group-hover:scale-[1.03]"
                  loading="lazy"
                />
              </div>
            </div>

            {/* Floating Signature card */}
            <div className="absolute -bottom-2 left-6 right-6 sm:left-10 sm:right-auto sm:max-w-xs lg:-bottom-6 lg:-right-4 lg:left-auto bg-primary text-primary-foreground p-7 md:p-9 shadow-dramatic z-20">
              <span className="mb-3 block text-eyebrow font-medium uppercase text-sand">
                Populair
              </span>
              <h4 className="font-display text-2xl md:text-3xl italic font-light leading-tight mb-3">
                BBQ op locatie
              </h4>
              <div className="w-8 h-px bg-sunset mb-3" />
              <p className="text-sm text-primary-foreground/75 font-light leading-relaxed">
                Compleet verzorgde barbecue op uw verblijf of een buitenlocatie op Vlieland: vlees, salades, sauzen en brood, alles geregeld.
              </p>
            </div>
          </div>

          {/* Right: content */}
          <div className="lg:col-span-5 lg:pl-8 flex flex-col justify-center">
            <SectionHeader
              eyebrow="Catering"
              number={number}
              size="xl"
              title={
                <span className="text-primary">
                  High-end koken op locatie. <span className="italic text-primary/80">Op Vlieland uniek.</span>
                </span>
              }
            />

            <div className="mt-8 space-y-6 text-primary/90 leading-relaxed max-w-md">
              <p className="text-lg md:text-xl font-light">
                Onze eigen chefs{" "}
                <strong className="font-medium underline decoration-sunset decoration-[1.5px] underline-offset-4">
                  Robert Buurma
                </strong>{" "}
                en{" "}
                <strong className="font-medium underline decoration-sunset decoration-[1.5px] underline-offset-4">
                  Roland Bakker
                </strong>{" "}
                brengen de haute cuisine naar uw verblijf.
              </p>
              <p className="text-sm md:text-base text-primary/70 tracking-wide">
                Voor zakelijke groepen vanaf 8 personen. Eén keuken, één aanspreekpunt, één factuur. Vrijblijvend voorstel op maat {RESPONSE_TIME.within}.
              </p>
            </div>

            <div className="mt-10 flex flex-col sm:flex-row gap-4">
              <Button asChild size="lg" className="group">
                <Link to="/catering">
                  Bekijk catering
                  <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link to="/catering-aanvragen">Catering aanvragen</Link>
              </Button>
            </div>
          </div>
        </div>
      </Container>
    </Section>
  );
};
