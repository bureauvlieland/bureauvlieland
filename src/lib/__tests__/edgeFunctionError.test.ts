import { describe, it, expect } from "vitest";
import { extractEdgeError } from "@/lib/edgeFunctionError";

/** Bootst de fout na die supabase.functions.invoke geeft bij een niet-2xx-antwoord. */
const invokeError = (body: unknown, status = 500) => ({
  message: "Edge Function returned a non-2xx status code",
  context: new Response(typeof body === "string" ? body : JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  }),
});

describe("extractEdgeError", () => {
  it("haalt de reden uit het JSON-antwoord van de functie", async () => {
    const err = invokeError({
      error: "Niet verstuurd: klant@example.com staat op de suppressielijst (bounce).",
      code: "recipient_suppressed",
    }, 422);
    expect(await extractEdgeError(err, "fallback")).toBe(
      "Niet verstuurd: klant@example.com staat op de suppressielijst (bounce).",
    );
  });

  it("valt terug op `message` als er geen `error` in het antwoord zit", async () => {
    expect(await extractEdgeError(invokeError({ message: "Offerte niet gevonden" }, 404), "fallback"))
      .toBe("Offerte niet gevonden");
  });

  it("geeft een korte tekstbody letterlijk terug", async () => {
    expect(await extractEdgeError(invokeError("Forbidden", 403), "fallback")).toBe("Forbidden");
  });

  it("negeert de nietszeggende non-2xx-boodschap en gebruikt de fallback", async () => {
    const err = { message: "Edge Function returned a non-2xx status code" };
    expect(await extractEdgeError(err, "De offerte kon niet worden verstuurd"))
      .toBe("De offerte kon niet worden verstuurd");
  });

  it("gebruikt een gewone foutboodschap als die er is", async () => {
    expect(await extractEdgeError(new Error("Netwerk weg"), "fallback")).toBe("Netwerk weg");
  });

  it("stort niet in op null of een leeg object", async () => {
    expect(await extractEdgeError(null, "fallback")).toBe("fallback");
    expect(await extractEdgeError({}, "fallback")).toBe("fallback");
  });

  it("leest het antwoord maar één keer nodig te hebben: een al-gelezen body breekt niets", async () => {
    const err = invokeError({ error: "reden" });
    await err.context.text(); // body verbruikt vóór de helper eraan komt
    expect(await extractEdgeError(err, "fallback")).toBe("fallback");
  });
});
