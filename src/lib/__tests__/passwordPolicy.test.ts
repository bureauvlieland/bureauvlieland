/**
 * Contract: `strongPasswordSchema` handhaaft de centrale wachtwoordeisen
 * voor partner- en adminaccounts. Regressies hier verzwakken de auth-
 * beveiliging van álle set/reset-flows in één klap.
 *
 * Eisen (zie passwordPolicy.ts):
 *  - >= 12 tekens, <= 128 tekens
 *  - minimaal 1 hoofd-, 1 kleine letter, 1 cijfer, 1 leesteken
 *
 * `loginPasswordSchema` is expliciet soepel (oude accounts moeten kunnen
 * inloggen) en mag géén complexity-checks doen.
 */
import { describe, it, expect } from "vitest";
import {
  PASSWORD_MIN_LENGTH,
  loginPasswordSchema,
  strongPasswordSchema,
} from "@/lib/passwordPolicy";

describe("strongPasswordSchema", () => {
  it("accepteert een wachtwoord dat aan alle eisen voldoet", () => {
    expect(strongPasswordSchema.safeParse("StrongPass1!extra").success).toBe(true);
  });

  it("weigert wachtwoord korter dan de minimumlengte", () => {
    const short = "A1!aaaaaa"; // 9 tekens
    expect(short.length).toBeLessThan(PASSWORD_MIN_LENGTH);
    expect(strongPasswordSchema.safeParse(short).success).toBe(false);
  });

  it("weigert wachtwoord zonder hoofdletter", () => {
    expect(strongPasswordSchema.safeParse("nouppercase1!aa").success).toBe(false);
  });

  it("weigert wachtwoord zonder kleine letter", () => {
    expect(strongPasswordSchema.safeParse("NOLOWERCASE1!AA").success).toBe(false);
  });

  it("weigert wachtwoord zonder cijfer", () => {
    expect(strongPasswordSchema.safeParse("NoDigitsHere!!!").success).toBe(false);
  });

  it("weigert wachtwoord zonder leesteken", () => {
    expect(strongPasswordSchema.safeParse("NoSymbols12345").success).toBe(false);
  });

  it("weigert wachtwoord langer dan 128 tekens", () => {
    const tooLong = "A1!" + "a".repeat(130);
    expect(strongPasswordSchema.safeParse(tooLong).success).toBe(false);
  });

  it("PASSWORD_MIN_LENGTH is minstens 12 (regressie tegen verzwakking)", () => {
    expect(PASSWORD_MIN_LENGTH).toBeGreaterThanOrEqual(12);
  });
});

describe("loginPasswordSchema", () => {
  it("accepteert ook een kort/simpel wachtwoord (legacy accounts)", () => {
    expect(loginPasswordSchema.safeParse("oldpw").success).toBe(true);
  });

  it("weigert lege string", () => {
    expect(loginPasswordSchema.safeParse("").success).toBe(false);
  });

  it("weigert wachtwoord langer dan 128 tekens", () => {
    expect(loginPasswordSchema.safeParse("a".repeat(129)).success).toBe(false);
  });
});
