import { MediaCard, Pill } from "@/components/system";
import { getTemplateCopy } from "@/lib/programTemplateCopy";
import { inferTheme, THEME_META } from "@/lib/programTemplateTheme";
import { transformImageUrl } from "@/lib/supabaseImage";
import type { ProgramTemplate } from "@/types/programTemplate";

const days = (n: number) => `${n} ${n === 1 ? "dag" : "dagen"}`;

/** Kaart van een voorbeeldprogramma; ook op de detailpagina ("Andere programma's"). */
export const TemplateCard = ({ template }: { template: ProgramTemplate }) => {
  const theme = THEME_META[inferTheme(template.name, template.description)];
  const copy = getTemplateCopy(template.id);
  const footer = [
    template.indicative_price_pp ? `Vanaf € ${template.indicative_price_pp} p.p.` : null,
    template.target_group,
  ].filter(Boolean);
  return (
    <MediaCard
      image={template.image_url ? transformImageUrl(template.image_url, { width: 900, quality: 78 }) : null}
      alt={template.name}
      badge={copy?.featured ? <Pill tone="brand">Nieuw</Pill> : undefined}
      meta={`${days(template.duration_days)} · ${theme.label}`}
      title={template.name}
      text={copy?.hook || template.short_description || undefined}
      footer={footer.length > 0 ? footer.join(" · ") : undefined}
      to={`/voorbeeldprogrammas/${template.id}`}
      linkLabel="Bekijk programma"
    />
  );
};
