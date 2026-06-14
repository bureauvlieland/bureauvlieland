import { Link } from "react-router-dom";
import { ArrowRight, ChefHat } from "lucide-react";
import lexenceTablesettingAsset from "@/assets/lexence/lexence-tablesetting.jpg.asset.json";
import lexenceAmusesRowAsset from "@/assets/lexence/lexence-amuses-row.jpg.asset.json";
import lexenceChefPlatingAsset from "@/assets/lexence/lexence-chef-plating.jpg.asset.json";

const lexence1 = lexenceTablesettingAsset.url;
const lexence3 = lexenceAmusesRowAsset.url;
const lexenceChefPlating = lexenceChefPlatingAsset.url;

export const CateringHighlight = () => {
  return (
    <section className="relative py-20 md:py-28 bg-sand/40 overflow-hidden">
      {/* Subtle decorative blobs */}
      <div className="absolute -top-24 -left-24 h-72 w-72 rounded-full bg-sunset/10 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -right-20 h-80 w-80 rounded-full bg-primary/10 blur-3xl pointer-events-none" />

      <div className="container relative mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          {/* Left: text */}
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-card border border-border text-xs uppercase tracking-[0.2em] text-muted-foreground mb-6">
              <ChefHat className="h-3.5 w-3.5 text-sunset" />
              Catering · Koken op locatie
            </div>
            <h2 className="font-display font-light text-foreground leading-[1.05] text-[clamp(2rem,4.5vw,3.5rem)] mb-6">
              High-end koken op locatie.{" "}
              <span className="italic text-primary">Op Vlieland uniek.</span>
            </h2>
            <p className="text-lg text-foreground/80 mb-4 max-w-xl font-light">
              Onze eigen chefs <strong className="font-medium text-foreground">Robert Buurma</strong> en{" "}
              <strong className="font-medium text-foreground">Roland Bakker</strong> koken op uw locatie — van
              lunch en Beach Grill tot geplate gangen.
            </p>
            <p className="text-base text-muted-foreground mb-8 max-w-xl">
              Eén keuken, één aanspreekpunt, één factuur. Voor zakelijke groepen vanaf 8 personen.
              Vrijblijvend voorstel op maat binnen 2 werkdagen.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Link
                to="/catering"
                className="inline-flex items-center justify-center gap-2 bg-foreground text-background px-6 py-3 rounded-md font-medium hover:bg-foreground/90 transition-colors"
              >
                Bekijk catering <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/catering-aanvragen"
                className="inline-flex items-center justify-center gap-2 bg-card border border-border text-foreground px-6 py-3 rounded-md font-medium hover:bg-card/70 transition-colors"
              >
                Catering aanvragen
              </Link>
            </div>
          </div>

          {/* Right: collage */}
          <div className="grid grid-cols-2 gap-3 md:gap-4">
            <div className="space-y-3 md:space-y-4">
              <div className="aspect-[3/4] rounded-lg overflow-hidden shadow-xl ring-1 ring-foreground/5">
                <img src={lexence1} alt="High-end diner op Vlieland" className="w-full h-full object-cover" loading="lazy" />
              </div>
              <div className="aspect-square rounded-lg overflow-hidden shadow-xl ring-1 ring-foreground/5">
                <img src={lexence3} alt="Gerechten op locatie" className="w-full h-full object-cover" loading="lazy" />
              </div>
            </div>
            <div className="space-y-3 md:space-y-4 pt-10 md:pt-16">
              <div className="aspect-square rounded-lg overflow-hidden shadow-xl ring-1 ring-foreground/5">
                <img src={lexenceChefPlating} alt="Chef aan het werk" className="w-full h-full object-cover" loading="lazy" />
              </div>
              <div className="aspect-[3/4] rounded-lg overflow-hidden shadow-xl bg-gradient-to-br from-primary to-ocean-deep text-primary-foreground flex items-end p-5">
                <div>
                  <div className="text-xs uppercase tracking-[0.2em] opacity-70 mb-2">Signature</div>
                  <div className="font-display text-2xl leading-tight font-light">Beach Grill experience</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
