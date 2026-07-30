import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { getSeeAlsoActivities, type ActivityLink } from "@/content/activityLinks";

interface SeeAlsoActivitiesProps {
  /** Slug van de huidige activiteit; wordt uitgesloten uit de lijst. */
  currentSlug?: string | null;
  /** Override de links volledig (bijv. op de hub-pagina). */
  links?: ActivityLink[];
  title?: string;
  limit?: number;
  className?: string;
}

/**
 * "Bekijk ook"-blok met redactionele links naar andere activiteitenpagina's.
 * Zorgt voor onderlinge verbinding tussen /activiteit/<slug> pagina's.
 */
export const SeeAlsoActivities = ({
  currentSlug,
  links,
  title = "Bekijk ook",
  limit = 3,
  className = "",
}: SeeAlsoActivitiesProps) => {
  const items = links ?? getSeeAlsoActivities(currentSlug, limit);
  if (items.length === 0) return null;

  return (
    <section
      className={`container mx-auto px-4 sm:px-6 lg:px-8 max-w-5xl py-10 ${className}`}
    >
      <h2 className="font-display text-2xl font-semibold text-foreground mb-5">
        {title}
      </h2>
      <nav aria-label="Andere activiteiten op Vlieland">
        <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {items.map((item) => (
            <li key={item.slug}>
              <Link
                to={`/activiteit/${item.slug}`}
                className="group flex items-start gap-3 rounded-lg border border-border bg-card p-4 h-full transition-colors hover:border-primary/50 hover:bg-primary/5"
              >
                <span className="flex-1 min-w-0">
                  <span className="block text-sm font-semibold text-foreground">
                    {item.label}
                  </span>
                  <span className="block text-xs text-muted-foreground mt-1 leading-relaxed">
                    {item.teaser}
                  </span>
                </span>
                <ArrowRight className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-primary" />
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </section>
  );
};

export default SeeAlsoActivities;
