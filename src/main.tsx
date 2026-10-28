import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { initErrorReporting } from "@/lib/errorReporting.init";
import { installImageFallback } from "@/lib/supabaseImage";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { captureSnapshot } from "@/lib/prerenderSnapshot";

// Vóór het renderen aanzetten, zodat ook fouten in de eerste render gemeld worden.
initErrorReporting();

// Na een nieuwe deploy verwijst een al open pagina naar JS-bestanden die niet
// meer bestaan (nieuwe build = nieuwe bestandsnamen). Vite's eigen event voor
// precies dit geval: gewoon herladen haalt de actuele pagina op.
window.addEventListener("vite:preloadError", (event) => {
  event.preventDefault();
  window.location.reload();
});

// Verkleinde foto die Supabase weigert (te grote bron): toon het origineel.
installImageFallback();

// Geprerenderde pagina (scripts/prerender.ts): de inhoud blijft zichtbaar
// als Suspense-fallback tot het chunk van de route binnen is.
const rootElement = document.getElementById("root")!;
captureSnapshot(rootElement);

createRoot(rootElement).render(
  <ErrorBoundary name="root">
    <App />
  </ErrorBoundary>,
);
