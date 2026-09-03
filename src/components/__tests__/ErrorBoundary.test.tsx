// @vitest-environment jsdom
//
// De grens bestaat om witte schermen te voorkomen. Deze tests borgen de drie
// eigenschappen waar dat op steunt: opvangen, melden, en herstellen bij een
// routewissel.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { ErrorBoundary } from "../ErrorBoundary";
import { __resetErrorReportingForTests, setErrorTransport, type ReportedEvent } from "@/lib/errorReporting";

const Boom = ({ explode }: { explode: boolean }) => {
  if (explode) throw new Error("component stuk");
  return <p>alles in orde</p>;
};

let consoleSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  __resetErrorReportingForTests();
  // React logt een gevangen fout zelf ook; die ruis onderdrukken we hier.
  consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  cleanup();
  consoleSpy.mockRestore();
});

describe("ErrorBoundary", () => {
  it("laat kinderen gewoon door als er niets misgaat", () => {
    render(
      <ErrorBoundary name="test">
        <Boom explode={false} />
      </ErrorBoundary>,
    );
    expect(screen.getByText("alles in orde")).toBeTruthy();
  });

  it("toont een foutscherm in plaats van een wit scherm", () => {
    render(
      <ErrorBoundary name="test">
        <Boom explode />
      </ErrorBoundary>,
    );
    expect(screen.getByRole("alert")).toBeTruthy();
    expect(screen.getByText("Er ging iets mis")).toBeTruthy();
  });

  it("meldt de fout met naam en componentStack", () => {
    const events: ReportedEvent[] = [];
    setErrorTransport((event) => events.push(event));

    render(
      <ErrorBoundary name="klantportaal">
        <Boom explode />
      </ErrorBoundary>,
    );

    expect(events).toHaveLength(1);
    expect(events[0].message).toBe("component stuk");
    expect(events[0].severity).toBe("fatal");
    expect(events[0].context.where).toBe("ErrorBoundary:klantportaal");
    expect(events[0].context.componentStack).toBeTruthy();
  });

  it("herstelt zodra een resetKey wijzigt, zoals bij wegnavigeren", () => {
    const { rerender } = render(
      <ErrorBoundary name="test" resetKeys={["/kapot"]}>
        <Boom explode />
      </ErrorBoundary>,
    );
    expect(screen.getByRole("alert")).toBeTruthy();

    rerender(
      <ErrorBoundary name="test" resetKeys={["/andere-pagina"]}>
        <Boom explode={false} />
      </ErrorBoundary>,
    );
    expect(screen.getByText("alles in orde")).toBeTruthy();
  });

  it("kan een eigen foutscherm gebruiken, bv. niets tonen voor een widget", () => {
    const { container } = render(
      <ErrorBoundary name="widget" fallback={() => null}>
        <Boom explode />
      </ErrorBoundary>,
    );
    expect(container.textContent).toBe("");
  });
});
