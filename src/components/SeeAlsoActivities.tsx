import { Container, LinkCard, Section, SectionHeader, type SectionTone } from "@/components/system";
import { getSeeAlsoActivities, type ActivityLink } from "@/content/activityLinks";

interface SeeAlsoActivitiesProps {
  /** Slug van de huidige activiteit; wordt uitgesloten uit de lijst. */
  currentSlug?: string | null;
  /** Override de links volledig (bijvoorbeeld op de hub-pagina). */
  links?: ActivityLink[];
  title?: string;
  intro?: string;
  limit?: number;
  tone?: SectionTone;
  /** Met een nummer wordt het een genummerde sectie; zonder een rustig linkblok. */
  number?: string;
  eyebrow?: string;
}

/**
 * "Bekijk ook"-blok met redactionele links naar andere activiteitenpagina's.
 * Zorgt voor onderlinge verbinding tussen /activiteit/<slug>-pagina's.
 */
export const SeeAlsoActivities = ({
  currentSlug,
  links,
  title = "Bekijk ook",
  intro,
  limit = 3,
  tone = "default",
  number,
  eyebrow = "Activiteiten",
}: SeeAlsoActivitiesProps) => {
  const items = links ?? getSeeAlsoActivities(currentSlug, limit);
  if (items.length === 0) return null;

  return (
    <Section tone={tone} spacing={number ? "default" : "compact"}>
      <Container size="wide">
        {number ? (
          <SectionHeader eyebrow={eyebrow} number={number} title={title} intro={intro} />
        ) : (
          <SectionHeader as="h2" size="md" weight="medium" title={title} intro={intro} />
        )}
        <nav aria-label="Andere activiteiten op Vlieland" className={number ? "mt-10" : "mt-6"}>
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((item) => (
              <li key={item.slug}>
                <LinkCard title={item.label} text={item.teaser} to={`/activiteit/${item.slug}`} />
              </li>
            ))}
          </ul>
        </nav>
      </Container>
    </Section>
  );
};

export default SeeAlsoActivities;
