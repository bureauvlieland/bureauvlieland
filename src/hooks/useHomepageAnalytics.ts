import { useEffect } from "react";
import { trackScrollDepth, trackSectionView } from "@/lib/analytics";

/**
 * Instruments the homepage with scroll-depth and section-view tracking.
 * - Scroll depth: fires 25/50/75/100 once each per page load.
 * - Section view: fires when an element with `data-analytics-section` reaches >=50% visible.
 */
export const useHomepageAnalytics = () => {
  useEffect(() => {
    const fired = new Set<number>();
    const thresholds: Array<25 | 50 | 75 | 100> = [25, 50, 75, 100];

    const onScroll = () => {
      const doc = document.documentElement;
      const scrolled = window.scrollY + window.innerHeight;
      const total = doc.scrollHeight;
      if (total <= window.innerHeight) return;
      const pct = Math.min(100, Math.round((scrolled / total) * 100));
      for (const t of thresholds) {
        if (pct >= t && !fired.has(t)) {
          fired.add(t);
          trackScrollDepth(t, "/");
        }
      }
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    const seen = new Set<string>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const name = (entry.target as HTMLElement).dataset.analyticsSection;
          if (!name || seen.has(name)) continue;
          seen.add(name);
          trackSectionView(name, "/");
        }
      },
      { threshold: 0.5 },
    );

    const els = document.querySelectorAll<HTMLElement>("[data-analytics-section]");
    els.forEach((el) => observer.observe(el));

    return () => {
      window.removeEventListener("scroll", onScroll);
      observer.disconnect();
    };
  }, []);
};
