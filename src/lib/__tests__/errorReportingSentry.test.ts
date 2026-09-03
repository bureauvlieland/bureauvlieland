// Het transport praat rechtstreeks met de envelope-API van Sentry. Deze tests
// leggen dat HTTP-contract vast, zodat een latere wijziging niet stilletjes
// meldingen laat verdwijnen.

import { describe, expect, it, vi } from "vitest";
import { createSentryTransport, parseDsn } from "../errorReporting.sentry";
import type { ReportedEvent } from "../errorReporting";

const DSN = "https://publickey123@o12345.ingest.sentry.io/6789";

const event: ReportedEvent = {
  name: "TypeError",
  message: "kapot",
  stack: "TypeError: kapot\n  at x",
  severity: "error",
  context: { where: "test" },
  breadcrumbs: [{ message: "stap", at: "2026-09-03T10:00:00.000Z" }],
  url: "https://bureauvlieland.nl/admin",
  at: "2026-09-03T10:00:01.000Z",
  fingerprint: "TypeError|kapot|test",
};

describe("parseDsn", () => {
  it("leidt endpoint en sleutel af", () => {
    expect(parseDsn(DSN)).toEqual({
      endpoint: "https://o12345.ingest.sentry.io/api/6789/envelope/",
      publicKey: "publickey123",
    });
  });

  it.each(["", "geen-url", "https://o12345.ingest.sentry.io/6789", "https://key@host/"])(
    "geeft null bij onbruikbare DSN %s",
    (dsn) => {
      expect(parseDsn(dsn)).toBeNull();
    },
  );
});

describe("createSentryTransport", () => {
  it("geeft null bij een onbruikbare DSN, zodat een typefout geen storing wordt", () => {
    expect(createSentryTransport("onzin")).toBeNull();
  });

  it("stuurt een envelope van drie regels naar het juiste adres", () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response(null, { status: 200 }));
    const transport = createSentryTransport(DSN, { environment: "production", fetchImpl });
    transport!(event);

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toContain("sentry_key=publickey123");
    expect(url).toContain("/api/6789/envelope/");
    expect(init.headers["Content-Type"]).toBe("application/x-sentry-envelope");

    const lines = (init.body as string).trim().split("\n");
    expect(lines).toHaveLength(3);
    expect(JSON.parse(lines[1])).toEqual({ type: "event" });

    const payload = JSON.parse(lines[2]);
    expect(payload.exception.values[0]).toMatchObject({ type: "TypeError", value: "kapot" });
    expect(payload.request.url).toBe("https://bureauvlieland.nl/admin");
    expect(payload.environment).toBe("production");
    expect(payload.fingerprint).toEqual(["TypeError|kapot|test"]);
    expect(payload.tags.where).toBe("test");
  });

  it("valt niet om als het versturen mislukt", () => {
    const fetchImpl = vi.fn().mockRejectedValue(new Error("netwerk plat"));
    const transport = createSentryTransport(DSN, { fetchImpl });
    expect(() => transport!(event)).not.toThrow();
  });

  it("valt niet om als fetch synchroon werpt", () => {
    const fetchImpl = vi.fn().mockImplementation(() => {
      throw new Error("geblokkeerd");
    });
    const transport = createSentryTransport(DSN, { fetchImpl });
    expect(() => transport!(event)).not.toThrow();
  });
});
