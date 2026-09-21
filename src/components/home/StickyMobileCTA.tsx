import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

/**
 * Floating "Start uw aanvraag" CTA that appears on mobile after the hero
 * scrolls out of view. Desktop already has a persistent CTA in the nav.
 */
interface StickyMobileCTAProps {
  label?: string;
  /** Pad of anker op dezelfde pagina (`#boeken`). */
  to?: string;
}

export const StickyMobileCTA = ({ label = "Start uw aanvraag", to = "/programma-samenstellen" }: StickyMobileCTAProps) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      // Show once the user has scrolled past ~80vh (roughly past the hero).
      setVisible(window.scrollY > window.innerHeight * 0.8);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div
      className={`lg:hidden fixed left-4 right-[4.75rem] z-30 transition-all duration-300 ${
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"
      }`}
      style={{ bottom: "calc(1rem + var(--floating-offset, 0px))" }}
      aria-hidden={!visible}
    >
      <Button asChild size="xl" className="w-full shadow-dramatic">
        {to.startsWith("#") ? (
          <a href={to}>
            {label}
            <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
          </a>
        ) : (
          <Link to={to}>
            {label}
            <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
          </Link>
        )}
      </Button>
    </div>
  );
};
