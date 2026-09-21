import { useLocation } from "react-router-dom";
import { getRelatedLinks, type InternalLink } from "@/lib/internalLinks";
import { Container, LinkCard, Section, SectionHeader } from "@/components/system";

interface RelatedLinksProps {
  /** Override het pad waarvoor de cluster wordt bepaald. */
  pathname?: string;
  /** Override de links volledig. */
  links?: InternalLink[];
  title?: string;
  limit?: number;
  className?: string;
}

/**
 * Intentie-gebaseerd blok met interne links onderaan publieke pagina's.
 * Zorgt dat elke pagina bereikbaar is vanuit meerdere contexten.
 */
export const RelatedLinks = ({
  pathname,
  links,
  title,
  limit = 6,
  className = "",
}: RelatedLinksProps) => {
  const location = useLocation();
  const path = pathname ?? location.pathname;
  const cluster = getRelatedLinks(path, limit);
  const items = links ?? cluster.links;

  if (items.length === 0) return null;

  return (
    <Section tone="muted" spacing="compact" className={`border-t border-border ${className}`}>
      <Container size="wide">
        <SectionHeader as="h2" size="md" weight="medium" title={title ?? cluster.title ?? "Verder op deze site"} />
        <nav aria-label="Gerelateerde pagina's" className="mt-6">
          <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {items.map((item) => (
              <li key={item.href}>
                <LinkCard title={item.label} text={item.description} to={item.href} />
              </li>
            ))}
          </ul>
        </nav>
      </Container>
    </Section>
  );
};

export default RelatedLinks;
