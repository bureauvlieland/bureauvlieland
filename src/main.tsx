import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { initErrorReporting } from "@/lib/errorReporting.init";
import { ErrorBoundary } from "@/components/ErrorBoundary";

// Vóór het renderen aanzetten, zodat ook fouten in de eerste render gemeld worden.
initErrorReporting();

createRoot(document.getElementById("root")!).render(
  <ErrorBoundary name="root">
    <App />
  </ErrorBoundary>,
);
