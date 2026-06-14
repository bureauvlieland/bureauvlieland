import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import lexenceTablesettingAsset from "@/assets/lexence/lexence-tablesetting.jpg.asset.json";
import lexenceAmusesRowAsset from "@/assets/lexence/lexence-amuses-row.jpg.asset.json";
import lexenceChefPlatingAsset from "@/assets/lexence/lexence-chef-plating.jpg.asset.json";

const lexenceTablesetting = lexenceTablesettingAsset.url;
const lexenceAmuses = lexenceAmusesRowAsset.url;
const lexenceChefPlating = lexenceChefPlatingAsset.url;

export const CateringHighlight = () => {
  return (
    <section className="relative py-20 md:py-28 bg-sand/40 overflow-hidden">
      {/* Subtle decorative blobs */}
      <div className="absolute -top-24 -left-24 h-72 w-72 rounded-full bg-sunset/10 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -right-20 h-80 w-80 rounded-full bg-primary/10 blur-3xl pointer-events-none" />

      <div className="container relative mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-20 items-center">
          {/* Left: image composition */}
          <div className="lg:col-span-7 grid grid-cols-6 gap-4 md:gap-6 relative pb-16 lg:pb-12">
            <div className="col-span-4 row-span-2 overflow-hidden shadow-2xl aspect-[4/5] group">
              <img
                src={lexenceChefPlating}
                alt="Chef plateert haute-cuisine gerecht op locatie op Vlieland"
                className="w-full h-full object-cover transition-transform duration-[1200ms] ease-out group-hover:scale-[1.03]"
                loading="lazy"
              />
            </div>

            <div className="col-span-2 space-y-4 md:space-y-6 pt-10 md:pt-16">
              <div className="aspect-square overflow-hidden shadow-lg group">
                <img
                  src={lexenceAmuses}
                  alt="Verfijnde amuses uitgeserveerd"
                  className="w-full h-full object-cover transition-transform duration-[1200ms] ease-out group-hover:scale-[1.03]"
                  loading="lazy"
                />
              </div>
              <div className="aspect-[3/4] overflow-hidden shadow-lg group">
                <img
                  src={lexenceTablesetting}
                  alt="Stijlvol gedekte tafel voor een privédiner op Vlieland"
                  className="w-full h-full object-cover transition-transform duration-[1200ms] ease-out group-hover:scale-[1.03]"
                  loading="lazy"
                />
              </div>
            </div>

            {/* Floating Signature card */}
            <div className="absolute -bottom-2 left-6 right-6 sm:left-10 sm:right-auto sm:max-w-xs lg:-bottom-6 lg:-right-4 lg:left-auto bg-primary text-primary-foreground p-7 md:p-9 shadow-2xl z-20">
              <span className="block text-[10px] tracking-[0.4em] uppercase mb-3 text-sunset font-semibold italic">
                Signature
              </span>
              <h4 className="font-display text-2xl md:text-3xl italic font-light leading-tight mb-3">
                Beach Grill experience
              </h4>
              <div className="w-8 h-px bg-sunset mb-3" />
              <p className="text-sm text-primary-foreground/75 font-light leading-relaxed">
                Een exclusieve culinaire ervaring op het strand van Vlieland, bereid op open vuur door onze eigen chefs.
              </p>
            </div>
          </div>

          {/* Right: content */}
          <div className="lg:col-span-5 lg:pl-8 flex flex-col justify-center">
            <h2 className="font-display font-light text-primary leading-[0.95] text-[clamp(2.25rem,5vw,4.25rem)] mb-8">
              High-end koken<br />op locatie.<br />
              <span className="italic font-light text-primary/80">Op Vlieland uniek.</span>
            </h2>

            <div className="space-y-6 text-primary/90 leading-relaxed max-w-md">
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
                Voor zakelijke groepen vanaf 8 personen. Eén keuken, één aanspreekpunt, één factuur. Vrijblijvend voorstel op maat binnen 2 werkdagen.
              </p>
            </div>

            <div className="mt-10 flex flex-col sm:flex-row gap-4">
              <Link
                to="/catering"
                className="group relative inline-flex items-center justify-center px-8 py-4 bg-primary text-primary-foreground text-xs font-semibold uppercase tracking-[0.2em] overflow-hidden"
              >
                <span className="relative z-10 inline-flex items-center">
                  Bekijk catering
                  <ArrowRight className="relative z-10 ml-3 h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                </span>
                <span className="absolute inset-0 bg-sunset translate-y-full group-hover:translate-y-0 transition-transform duration-500 ease-out" />
              </Link>
              <Link
                to="/catering-aanvragen"
                className="inline-flex items-center justify-center px-8 py-4 border border-primary/30 text-primary text-xs font-semibold uppercase tracking-[0.2em] hover:border-primary transition-colors duration-300"
              >
                Catering aanvragen
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
