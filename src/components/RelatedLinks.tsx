import { Link, useLocation } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { getRelatedLinks, type InternalLink } from "@/lib/internalLinks";
import { Container, Section, SectionHeader } from "@/components/system";

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
                <Link
                  to={item.href}
                  className="group flex items-start gap-3 rounded-lg border border-border bg-card p-4 transition-colors hover:border-primary/50 hover:bg-primary/5 h-full"
                >
                  <span className="flex-1 min-w-0">
                    <span className="block text-sm font-semibold text-foreground">
                      {item.label}
                    </span>
                    <span className="block text-xs text-muted-foreground mt-1 leading-relaxed">
                      {item.description}
                    </span>
                  </span>
                  <ArrowRight className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-primary" />
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </Container>
    </Section>
  );
};

export default RelatedLinks;
