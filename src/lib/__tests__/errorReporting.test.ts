// @vitest-environment jsdom
//
// Het meldpunt is het enige punt waar productiefouten binnenkomen. Als dít
// stuk stilletjes stukgaat, zijn we weer blind — vandaar dat de vangnetten
// (scrubben, dedupliceren, niet-omvallen) hier expliciet vastgelegd zijn.

import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import {
  __resetErrorReportingForTests,
  addBreadcrumb,
  installGlobalErrorHandlers,
  reportError,
  scrubUrl,
  setErrorTransport,
  type ReportedEvent,
} from "../errorReporting";

let consoleSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  __resetErrorReportingForTests();
  consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  consoleSpy.mockRestore();
});

function collect(): ReportedEvent[] {
  const events: ReportedEvent[] = [];
  setErrorTransport((event) => events.push(event));
  return events;
}

describe("scrubUrl", () => {
  it("redigeert het toegangstoken uit een klantportaal-URL", () => {
    const scrubbed = scrubUrl("https://bureauvlieland.nl/mijn-programma/abcdef0123456789abcdef");
    expect(scrubbed).not.toContain("abcdef0123456789abcdef");
    expect(scrubbed).toContain("/mijn-programma/");
  });

  it.each([
    "/programma-deelnemers/0123456789abcdef0123",
    "/mijn-logies/0123456789abcdef0123",
    "/concept/0123456789abcdef0123",
    "/partner/0123456789abcdef0123",
  ])("redigeert token in %s", (path) => {
    expect(scrubUrl(`https://bureauvlieland.nl${path}`)).not.toContain("0123456789abcdef0123");
  });

  it("laat gewone partnerpagina's ongemoeid", () => {
    expect(scrubUrl("https://bureauvlieland.nl/partner/login")).toContain("/partner/login");
    expect(scrubUrl("https://bureauvlieland.nl/partner/dashboard")).toContain("/partner/dashboard");
  });

  it("redigeert gevoelige queryparameters", () => {
    const scrubbed = scrubUrl("https://bureauvlieland.nl/x?token=geheim123&pagina=2");
    expect(scrubbed).not.toContain("geheim123");
    expect(scrubbed).toContain("pagina=2");
  });

  it("laat het fragment weg", () => {
    expect(scrubUrl("https://bureauvlieland.nl/x#access_token=geheim")).not.toContain("geheim");
  });

  it("geeft een placeholder bij onleesbare invoer in plaats van te werpen", () => {
    expect(() => scrubUrl("http://[")).not.toThrow();
  });
});

describe("reportError", () => {
  it("logt altijd naar de console, ook zonder transport", () => {
    setErrorTransport(null);
    reportError(new Error("stuk"));
    expect(consoleSpy).toHaveBeenCalled();
  });

  it("normaliseert een Error", () => {
    const events = collect();
    reportError(new TypeError("kapot"), { where: "test" });
    expect(events[0]).toMatchObject({ name: "TypeError", message: "kapot" });
    expect(events[0].context.where).toBe("test");
  });

  it("normaliseert een Supabase-achtig foutobject", () => {
    const events = collect();
    reportError({ message: "row not found", code: "PGRST116" });
    expect(events[0].message).toBe("row not found (PGRST116)");
  });

  it("normaliseert een losse string", () => {
    const events = collect();
    reportError("zomaar stuk");
    expect(events[0].message).toBe("zomaar stuk");
  });

  it("vat identieke fouten samen binnen het venster", () => {
    const events = collect();
    expect(reportError(new Error("zelfde"), { where: "a" })).not.toBeNull();
    expect(reportError(new Error("zelfde"), { where: "a" })).toBeNull();
    expect(events).toHaveLength(1);
  });

  it("ziet fouten die alleen in getallen verschillen als dezelfde groep", () => {
    const events = collect();
    reportError(new Error("item 12 ontbreekt"), { where: "a" });
    reportError(new Error("item 99 ontbreekt"), { where: "a" });
    expect(events).toHaveLength(1);
  });

  it("begrenst het aantal meldingen per venster", () => {
    const events = collect();
    for (let i = 0; i < 200; i++) {
      reportError(new Error(`unieke fout ${String.fromCharCode(65 + (i % 26))}${i}`), {
        where: `plek-${i}`,
      });
    }
    expect(events.length).toBeLessThanOrEqual(25);
  });

  it("valt niet om als het transport zelf werpt", () => {
    setErrorTransport(() => {
      throw new Error("meldpunt stuk");
    });
    expect(() => reportError(new Error("origineel"))).not.toThrow();
  });

  it("stuurt breadcrumbs mee en begrenst het aantal", () => {
    const events = collect();
    for (let i = 0; i < 50; i++) addBreadcrumb(`stap ${i}`);
    reportError(new Error("met aanloop"));
    expect(events[0].breadcrumbs).toHaveLength(20);
    expect(events[0].breadcrumbs.at(-1)?.message).toBe("stap 49");
  });

  it("scrubt de huidige URL in het event", () => {
    window.history.pushState({}, "", "/mijn-programma/abcdef0123456789abcdef");
    const events = collect();
    reportError(new Error("op tokenpagina"));
    expect(events[0].url).not.toContain("abcdef0123456789abcdef");
  });
});

describe("installGlobalErrorHandlers", () => {
  it("meldt een niet-afgehandelde promise-rejection en ruimt daarna op", () => {
    const events = collect();
    const uninstall = installGlobalErrorHandlers();

    window.dispatchEvent(
      Object.assign(new Event("unhandledrejection"), { reason: new Error("los eind") }),
    );
    expect(events).toHaveLength(1);
    expect(events[0].severity).toBe("fatal");

    uninstall();
    window.dispatchEvent(
      Object.assign(new Event("unhandledrejection"), { reason: new Error("na opruimen") }),
    );
    expect(events).toHaveLength(1);
  });
});
