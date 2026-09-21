import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { bearerToken, isAnonBearer, jwtRole } from "./jwt-role.ts";

const b64url = (obj: unknown) =>
  btoa(JSON.stringify(obj)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const token = (claims: Record<string, unknown>) =>
  `${b64url({ alg: "HS256", typ: "JWT" })}.${b64url(claims)}.handtekening`;

Deno.test("jwtRole leest de rol uit het payload-deel", () => {
  assertEquals(jwtRole(token({ role: "anon", iss: "supabase" })), "anon");
  assertEquals(jwtRole(token({ role: "authenticated", sub: "u1" })), "authenticated");
  assertEquals(jwtRole(token({ sub: "u1" })), null);
});

Deno.test("jwtRole is nul bij rommel", () => {
  assertEquals(jwtRole(null), null);
  assertEquals(jwtRole(""), null);
  assertEquals(jwtRole("geen.jwt"), null);
  assertEquals(jwtRole("a.b.c"), null);
});

Deno.test("bearerToken en isAnonBearer", () => {
  const anon = token({ role: "anon" });
  assertEquals(bearerToken(`Bearer ${anon}`), anon);
  assertEquals(bearerToken("Basic abc"), null);
  assertEquals(isAnonBearer(`Bearer ${anon}`), true);
  assertEquals(isAnonBearer(`Bearer ${token({ role: "authenticated" })}`), false);
  assertEquals(isAnonBearer(null), false);
});
