/**
 * Tijdelijke diagnose: bij welk Mailjet-account hoort het sleutelpaar dat de
 * app gebruikt? Geeft niets terug in de response; het resultaat gaat naar de
 * functielogs zodat er geen accountgegevens over een open endpoint lekken.
 */
const DIAG_KEY = "d97269c75c2d35ddcd0b95e272c46182";

Deno.serve(async (req) => {
  if (new URL(req.url).searchParams.get("k") !== DIAG_KEY) {
    return new Response("nope", { status: 401 });
  }
  const apiKey = Deno.env.get("MAILJET_API_KEY");
  const secretKey = Deno.env.get("MAILJET_SECRET_KEY");
  if (!apiKey || !secretKey) {
    console.error("DIAG: Mailjet-credentials ontbreken");
    return new Response("no-creds", { status: 500 });
  }
  const auth = "Basic " + btoa(`${apiKey}:${secretKey}`);
  const mj = async (path: string) => {
    const res = await fetch(`https://api.mailjet.com${path}`, { headers: { Authorization: auth } });
    const text = await res.text();
    try {
      return { status: res.status, body: JSON.parse(text) };
    } catch {
      return { status: res.status, body: text.slice(0, 300) };
    }
  };

  const [senders, callbacks, user] = await Promise.all([
    mj("/v3/REST/sender?Limit=50"),
    mj("/v3/REST/eventcallbackurl"),
    mj("/v3/REST/user"),
  ]);

  const senderList = Array.isArray((senders.body as { Data?: unknown[] })?.Data)
    ? (senders.body as { Data: Array<Record<string, unknown>> }).Data.map((s) => `${s.Email}:${s.Status}`)
    : senders.body;
  const cbList = Array.isArray((callbacks.body as { Data?: unknown[] })?.Data)
    ? (callbacks.body as { Data: Array<Record<string, unknown>> }).Data.map((c) =>
      `${c.EventType}:${String(c.Url).replace(/token=[^&]+/, "token=***")}`
    )
    : callbacks.body;
  const userList = Array.isArray((user.body as { Data?: unknown[] })?.Data)
    ? (user.body as { Data: Array<Record<string, unknown>> }).Data.map((u) => `${u.Email}/${u.Username}`)
    : user.body;

  console.log("DIAG_SENDERS", JSON.stringify(senderList));
  console.log("DIAG_CALLBACKS", JSON.stringify(cbList));
  console.log("DIAG_USER", JSON.stringify(userList));
  return new Response(
    JSON.stringify({ senders: senderList, callbacks: cbList, user: userList }, null, 2),
    { headers: { "Content-Type": "application/json" } },
  );
});
