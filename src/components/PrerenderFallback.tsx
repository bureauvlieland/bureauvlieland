import { useEffect } from "react";
import { clearSnapshot, getSnapshot } from "@/lib/prerenderSnapshot";

/**
 * Suspense-fallback van de routes: bij de eerste lading de geprerenderde
 * HTML (zie src/lib/prerenderSnapshot.ts), daarna niets. Links erin zijn
 * gewone ankers; wie klikt vóór de app klaar is, laadt die pagina gewoon.
 */
export const PrerenderFallback = () => {
  const html = getSnapshot();
  if (!html) return null;
  return <div data-prerender-fallback dangerouslySetInnerHTML={{ __html: html }} />;
};

/**
 * Staat in dezelfde Suspense-grens als de routes en mount dus pas samen met
 * de eerste echte pagina; vanaf dan toont de fallback niets meer.
 */
export const PrerenderSnapshotConsumer = () => {
  useEffect(() => {
    clearSnapshot();
  }, []);
  return null;
};
