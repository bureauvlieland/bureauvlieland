import { ACTIVITY_LANDINGS, LANDINGS } from "@/content/landings";
import { LandingPage } from "./LandingPage";
import { ActivityPage } from "./ActivityPage";

/**
 * Lazy geladen route-element: zoekt de inhoud bij het pad op en tekent het
 * passende sjabloon. De paden komen uit `src/content/landings/paths.ts`.
 */
const LandingRoute = ({ path }: { path: string }) => {
  const landing = LANDINGS.find((c) => c.path === path);
  if (landing) return <LandingPage content={landing} />;
  const activity = ACTIVITY_LANDINGS.find((c) => c.path === path);
  if (activity) return <ActivityPage content={activity} />;
  return null;
};

export default LandingRoute;
