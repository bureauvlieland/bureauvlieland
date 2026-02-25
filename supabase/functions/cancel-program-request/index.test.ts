import "https://deno.land/std@0.224.0/dotenv/load.ts";
import { assertEquals, assertExists } from "https://deno.land/std@0.224.0/assert/mod.ts";

const SUPABASE_URL = Deno.env.get("VITE_SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("VITE_SUPABASE_PUBLISHABLE_KEY")!;

const invoke = async (body: Record<string, unknown>) => {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/cancel-program-request`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      apikey: SUPABASE_ANON_KEY,
    },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  return { status: res.status, json };
};

Deno.test("returns 400 when token is missing", async () => {
  const { status, json } = await invoke({});
  assertEquals(status, 400);
  assertEquals(json.error, "Token is required");
});

Deno.test("returns 404 for invalid token", async () => {
  const { status, json } = await invoke({ token: "nonexistent-token-xyz" });
  assertEquals(status, 404);
  assertExists(json.error);
});

Deno.test("handles CORS preflight", async () => {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/cancel-program-request`, {
    method: "OPTIONS",
    headers: {
      Origin: "https://bureauvlieland.lovable.app",
    },
  });
  await res.text();
  assertEquals(res.status, 200);
  assertEquals(res.headers.get("Access-Control-Allow-Origin"), "*");
});
