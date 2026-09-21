/**
 * Rol uit een JWT lezen zonder de handtekening te controleren.
 *
 * Alleen bedoeld voor functies die achter de Supabase-gateway met
 * `verify_jwt` staan: die heeft de handtekening dan al gecontroleerd. De
 * cron-jobs sturen de anon key als Bearer-token mee (rol `anon`); een admin
 * in de browser stuurt zijn eigen token (rol `authenticated`).
 */
export function jwtRole(token: string | null | undefined): string | null {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  try {
    const payload = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = payload + "=".repeat((4 - (payload.length % 4)) % 4);
    const claims = JSON.parse(atob(padded)) as { role?: unknown };
    return typeof claims.role === "string" ? claims.role : null;
  } catch {
    return null;
  }
}

/** Het token uit een `Authorization: Bearer …`-header, of null. */
export function bearerToken(authHeader: string | null | undefined): string | null {
  if (!authHeader?.startsWith("Bearer ")) return null;
  return authHeader.slice("Bearer ".length).trim() || null;
}

/** Waar: een cron-job of ander systeemverkeer met de anon key als Bearer-token. */
export function isAnonBearer(authHeader: string | null | undefined): boolean {
  return jwtRole(bearerToken(authHeader)) === "anon";
}
