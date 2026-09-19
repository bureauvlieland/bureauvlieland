import { LANDINGS } from "@/content/landings";
import { LandingPage } from "./LandingPage";

/**
 * Lazy geladen route-element: zoekt de inhoud bij het pad op en tekent het
 * sjabloon. De paden komen uit `src/content/landings/paths.ts`.
 */
const LandingRoute = ({ path }: { path: string }) => {
  const content = LANDINGS.find((c) => c.path === path);
  if (!content) return null;
  return <LandingPage content={content} />;
};

export default LandingRoute;
