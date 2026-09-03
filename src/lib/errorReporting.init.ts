// Opstart van de foutrapportage. Apart gehouden zodat `errorReporting.ts`
// leverancier-vrij blijft en in tests zonder omgevingsvariabelen bruikbaar is.

import { installGlobalErrorHandlers, setErrorTransport } from "./errorReporting";
import { createSentryTransport } from "./errorReporting.sentry";

/**
 * Zet de foutrapportage aan.
 *
 * Zonder `VITE_SENTRY_DSN` gebeurt er niets bijzonders: fouten gaan naar de
 * console, precies zoals nu, en er vertrekt geen enkel netwerkverzoek. Zodra
 * de DSN gezet is, stromen dezelfde meldingen ook naar Sentry.
 */
export function initErrorReporting(): void {
  // Vite vervangt import.meta.env tijdens de build; onbekende sleutels zijn
  // simpelweg undefined, vandaar de brede indexeerbare vorm.
  const env = (import.meta.env ?? {}) as Record<string, string | undefined>;
  const dsn = typeof env.VITE_SENTRY_DSN === "string" ? env.VITE_SENTRY_DSN.trim() : "";

  if (dsn) {
    const transport = createSentryTransport(dsn, {
      environment: typeof env.MODE === "string" ? env.MODE : "production",
      release: typeof env.VITE_RELEASE === "string" ? env.VITE_RELEASE : undefined,
    });
    // `null` betekent een onbruikbare DSN — dan blijft alleen de console over.
    setErrorTransport(transport);
  }

  installGlobalErrorHandlers();
}
