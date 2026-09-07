/**
 * De echte fout uit een mislukte edge-function-aanroep halen.
 *
 * `supabase.functions.invoke` geeft bij een niet-2xx-antwoord een fout met als
 * boodschap "Edge Function returned a non-2xx status code". Dat zegt niets. De
 * JSON die de functie zélf terugstuurde — met de reden — zit op `error.context`,
 * een Response die maar één keer gelezen kan worden.
 *
 * Deze helper stond als lokale functie in `useCustomerProgram`; hij hoort op
 * één plek zodat elk scherm dezelfde, leesbare fout toont.
 */

interface EdgeErrorLike {
  message?: unknown;
  context?: {
    json?: () => Promise<unknown>;
    text?: () => Promise<string>;
    clone?: () => EdgeErrorLike["context"];
    error?: unknown;
  };
}

const pick = (body: unknown): string | null => {
  if (!body || typeof body !== "object") return null;
  const b = body as { error?: unknown; message?: unknown };
  if (typeof b.error === "string" && b.error) return b.error;
  if (b.error && typeof b.error === "object") return JSON.stringify(b.error);
  if (typeof b.message === "string" && b.message) return b.message;
  return null;
};

export async function extractEdgeError(err: unknown, fallback: string): Promise<string> {
  const e = (err ?? {}) as EdgeErrorLike;
  try {
    const ctx = e.context;
    if (ctx) {
      const cloned = typeof ctx.clone === "function" ? ctx.clone() ?? ctx : ctx;
      if (typeof cloned.json === "function") {
        try {
          const found = pick(await cloned.json());
          if (found) return found;
        } catch {
          // geen JSON; hieronder als tekst proberen
        }
      }
      if (typeof ctx.text === "function") {
        try {
          const again = typeof ctx.clone === "function" ? ctx.clone() ?? ctx : ctx;
          const text = typeof again.text === "function" ? await again.text() : "";
          if (text) {
            try {
              const found = pick(JSON.parse(text));
              if (found) return found;
            } catch {
              if (text.length < 300) return text;
            }
          }
        } catch {
          // body al gelezen of niet leesbaar
        }
      }
      if (typeof ctx.error === "string" && ctx.error) return ctx.error;
    }
  } catch {
    // val hieronder terug op de boodschap
  }
  if (typeof e.message === "string" && e.message && !e.message.includes("non-2xx")) {
    return e.message;
  }
  return fallback;
}
