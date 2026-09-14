import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { initErrorReporting } from "@/lib/errorReporting.init";
import { ErrorBoundary } from "@/components/ErrorBoundary";

// Vóór het renderen aanzetten, zodat ook fouten in de eerste render gemeld worden.
initErrorReporting();

// Na een nieuwe deploy verwijst een al open pagina naar JS-bestanden die niet
// meer bestaan (nieuwe build = nieuwe bestandsnamen). Vite's eigen event voor
// precies dit geval: gewoon herladen haalt de actuele pagina op.
window.addEventListener("vite:preloadError", (event) => {
  event.preventDefault();
  window.location.reload();
});

createRoot(document.getElementById("root")!).render(
  <ErrorBoundary name="root">
    <App />
  </ErrorBoundary>,
);
