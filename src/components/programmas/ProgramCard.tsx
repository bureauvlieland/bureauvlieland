import { Link } from "react-router-dom";
import { Calendar, Users, Euro, ArrowRight } from "lucide-react";
import type { ProgramTemplate } from "@/types/programTemplate";
import { inferTheme, THEME_META } from "@/lib/programTemplateTheme";
import { getTemplateCopy } from "@/lib/programTemplateCopy";

export const ProgramCard = ({ template }: { template: ProgramTemplate }) => {
  const theme = THEME_META[inferTheme(template.name, template.description)];
  const copy = getTemplateCopy(template.id);
  const subtitle = copy?.hook || template.short_description;
  return (
    <Link
      to={`/voorbeeldprogrammas/${template.id}`}
      className="relative rounded-xl overflow-hidden block transition-all duration-300 group h-[260px] sm:h-[300px] hover:shadow-xl hover:-translate-y-1 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
    >
      <img
        src={template.image_url || "/placeholder.svg"}
        alt={template.name}
        className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        loading="lazy"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/30 to-transparent" />

      <div className="absolute top-3 left-3 right-3 flex items-start justify-between gap-2">
        <span className="bg-background/90 text-foreground text-xs font-semibold px-2.5 py-1 rounded-full flex items-center gap-1 backdrop-blur-sm">
          <Calendar className="h-3 w-3" />
          {template.duration_days} {template.duration_days === 1 ? "dag" : "dagen"}
        </span>
        <div className="flex items-center gap-1.5">
          {copy?.featured && (
            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-primary text-primary-foreground backdrop-blur-sm">
              Nieuw
            </span>
          )}
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full backdrop-blur-sm ${theme.className}`}>
            {theme.label}
          </span>
        </div>
      </div>

      <div className="absolute inset-x-0 bottom-0 p-5">
        <h3 className="font-display font-bold text-xl text-white mb-1">{template.name}</h3>
        {subtitle && (
          <p className="text-white/85 text-sm line-clamp-2 mb-3">{subtitle}</p>
        )}
        <div className="flex flex-wrap gap-2">
          {template.target_group && (
            <span className="inline-flex items-center gap-1 text-xs text-white/90 bg-white/15 backdrop-blur-sm px-2.5 py-1 rounded-full">
              <Users className="h-3 w-3" />
              {template.target_group}
            </span>
          )}
          {template.indicative_price_pp && (
            <span className="inline-flex items-center gap-1 text-xs text-white/90 bg-white/15 backdrop-blur-sm px-2.5 py-1 rounded-full">
              <Euro className="h-3 w-3" />
              Vanaf €{template.indicative_price_pp} p.p.
            </span>
          )}
        </div>
        <div className="mt-3 flex items-center gap-1 text-white text-sm font-medium group-hover:gap-2 transition-all">
          Bekijk programma
          <ArrowRight className="h-4 w-4" />
        </div>
      </div>
    </Link>
  );
};
