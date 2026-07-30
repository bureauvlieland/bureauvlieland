import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

/**
 * Floating "Start uw aanvraag" CTA that appears on mobile after the hero
 * scrolls out of view. Desktop already has a persistent CTA in the nav.
 */
export const StickyMobileCTA = () => {
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
      className={`lg:hidden fixed bottom-4 left-4 right-[4.75rem] z-30 transition-all duration-300 ${
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"
      }`}
      aria-hidden={!visible}
    >
      <Link to="/#routes" className="block">
        <Button
          size="lg"
          className="w-full bg-accent text-accent-foreground hover:bg-accent/90 shadow-2xl h-14 text-base"
        >
          Start uw aanvraag
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </Link>
    </div>
  );
};
