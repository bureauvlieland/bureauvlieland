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
    <section className="py-16 md:py-24 bg-foreground text-background overflow-hidden">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
        <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">
          {/* Left: text */}
          <div>
            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] opacity-70 mb-5">
              <ChefHat className="h-4 w-4" /> Catering · Koken op locatie
            </div>
            <h2 className="text-4xl md:text-5xl font-display font-bold mb-6 leading-tight">
              High-end koken op locatie.<br />Op Vlieland uniek.
            </h2>
            <p className="text-lg opacity-85 mb-4 max-w-xl">
              Onze eigen chefs <strong className="text-background">Robert Buurma</strong> en{" "}
              <strong className="text-background">Roland Bakker</strong> koken op uw locatie — van
              lunch en Beach Grill tot geplate gangen.
            </p>
            <p className="text-base opacity-70 mb-8 max-w-xl">
              Eén keuken, één aanspreekpunt, één factuur. Voor zakelijke groepen vanaf 8 personen.
              Vrijblijvend voorstel op maat binnen 2 werkdagen.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Link
                to="/catering"
                className="inline-flex items-center justify-center gap-2 bg-background text-foreground px-6 py-3 rounded-md font-medium hover:bg-background/90 transition-colors"
              >
                Bekijk catering <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/catering-aanvragen"
                className="inline-flex items-center justify-center gap-2 border border-background/30 px-6 py-3 rounded-md font-medium hover:bg-background/10 transition-colors"
              >
                Catering aanvragen
              </Link>
            </div>
          </div>

          {/* Right: collage */}
          <div className="grid grid-cols-2 gap-3 md:gap-4">
            <div className="space-y-3 md:space-y-4">
              <div className="aspect-[3/4] rounded-lg overflow-hidden shadow-2xl">
                <img src={lexence1} alt="High-end diner op Vlieland" className="w-full h-full object-cover" loading="lazy" />
              </div>
              <div className="aspect-square rounded-lg overflow-hidden shadow-2xl">
                <img src={lexence3} alt="Gerechten op locatie" className="w-full h-full object-cover" loading="lazy" />
              </div>
            </div>
            <div className="space-y-3 md:space-y-4 pt-10 md:pt-16">
              <div className="aspect-square rounded-lg overflow-hidden shadow-2xl">
                <img src={lexenceChefPlating} alt="Chef aan het werk" className="w-full h-full object-cover" loading="lazy" />
              </div>
              <div className="aspect-[3/4] rounded-lg overflow-hidden shadow-2xl bg-background/5 flex items-end p-5">
                <div>
                  <div className="text-xs uppercase tracking-[0.2em] opacity-60 mb-2">Signature</div>
                  <div className="font-display text-2xl leading-tight">Beach Grill experience</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
