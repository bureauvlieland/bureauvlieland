// Vangnet tegen witte schermen.
//
// Zonder deze grens haalt één fout tijdens het renderen de hele React-boom
// neer: de klant ziet een lege pagina en wij horen het pas als iemand belt.
// Met deze grens blijft de fout beperkt tot het omsloten deel, wordt hij
// gemeld, en houdt de bezoeker een weg vooruit.

import { Component, type ErrorInfo, type ReactNode } from "react";
import { reportError } from "@/lib/errorReporting";

interface Props {
  children: ReactNode;
  /** Waar deze grens staat; komt mee in de melding. */
  name: string;
  /**
   * Verandert een van deze waarden, dan probeert de grens opnieuw te renderen.
   * Geef hier de route mee, zodat wegnavigeren een kapotte pagina herstelt.
   */
  resetKeys?: unknown[];
  /** Eigen foutscherm; standaard het scherm hieronder. */
  fallback?: (error: Error, retry: () => void) => ReactNode;
}

interface State {
  error: Error | null;
}

function keysChanged(a: unknown[] = [], b: unknown[] = []): boolean {
  if (a.length !== b.length) return true;
  return a.some((value, index) => !Object.is(value, b[index]));
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidUpdate(previous: Props): void {
    // Bij een routewissel de grens opnieuw proberen, anders blijft de bezoeker
    // op het foutscherm hangen tot een harde herlaadactie.
    if (this.state.error && keysChanged(previous.resetKeys, this.props.resetKeys)) {
      this.setState({ error: null });
    }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    reportError(
      error,
      { where: `ErrorBoundary:${this.props.name}`, componentStack: info.componentStack },
      "fatal",
    );
  }

  private retry = (): void => this.setState({ error: null });

  render(): ReactNode {
    const { error } = this.state;
    if (!error) return this.props.children;
    if (this.props.fallback) return this.props.fallback(error, this.retry);

    return (
      <div role="alert" className="mx-auto flex max-w-lg flex-col gap-4 px-6 py-16 text-center">
        <h1 className="text-2xl font-semibold">Er ging iets mis</h1>
        <p className="text-muted-foreground">
          Deze pagina kon niet geladen worden. De melding is automatisch bij ons
          binnengekomen. Probeer het opnieuw, of neem contact op als het blijft gebeuren.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <button
            type="button"
            onClick={this.retry}
            className="rounded-md bg-primary px-4 py-2 text-primary-foreground"
          >
            Opnieuw proberen
          </button>
          <a
            href="/"
            className="rounded-md border border-input px-4 py-2"
          >
            Naar de homepage
          </a>
        </div>
      </div>
    );
  }
}
