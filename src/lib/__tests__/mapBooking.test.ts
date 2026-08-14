import { describe, expect, it } from "vitest";
import {
  bookingReturnUrl,
  estimateBookingPrice,
  formatEuro,
  hasBookingErrors,
  validateBookingForm,
} from "../mapBooking";

const base = {
  name: "Erwin Soolsma",
  email: "erwin@bureauvlieland.nl",
  phone: "06 12345678",
  adults: 2,
  children: 0,
};

describe("estimateBookingPrice", () => {
  it("rekent volwassenen en kinderen apart", () => {
    expect(estimateBookingPrice(30, 24.5, 2, 2)).toBe(109);
  });

  it("gebruikt het volwassenentarief als er geen kinderprijs is", () => {
    expect(estimateBookingPrice(30, null, 1, 1)).toBe(60);
  });

  it("negeert negatieve aantallen", () => {
    expect(estimateBookingPrice(30, 10, -3, 0)).toBe(0);
  });
});

describe("formatEuro", () => {
  it("gebruikt een komma", () => {
    expect(formatEuro(24.5)).toBe("€ 24,50");
  });
});

describe("validateBookingForm", () => {
  it("accepteert een correcte invoer", () => {
    expect(hasBookingErrors(validateBookingForm(base))).toBe(false);
  });

  it("weigert een te korte naam", () => {
    expect(validateBookingForm({ ...base, name: "E" }).name).toBeTruthy();
  });

  it("weigert een ongeldig e-mailadres", () => {
    expect(validateBookingForm({ ...base, email: "geen-mail" }).email).toBeTruthy();
  });

  it("weigert een ongeldig telefoonnummer", () => {
    expect(validateBookingForm({ ...base, phone: "abc" }).phone).toBeTruthy();
  });

  it("vraagt minimaal één deelnemer", () => {
    expect(validateBookingForm({ ...base, adults: 0, children: 0 }).persons).toBeTruthy();
  });

  it("weigert meer dan 50 personen", () => {
    expect(validateBookingForm({ ...base, adults: 51 }).persons).toBeTruthy();
  });

  it("weigert meer deelnemers dan resterende plekken", () => {
    expect(
      validateBookingForm({ ...base, adults: 4 }, { slotsLeft: 3 }).persons,
    ).toBe("Er zijn nog 3 plekken beschikbaar.");
  });

  it("weigert een te lange kortingscode", () => {
    expect(
      validateBookingForm({ ...base, couponCode: "x".repeat(61) }).couponCode,
    ).toBeTruthy();
  });
});

describe("bookingReturnUrl", () => {
  it("wijst naar de retourpagina zonder dubbele slash", () => {
    expect(bookingReturnUrl("https://bureauvlieland.nl/")).toBe(
      "https://bureauvlieland.nl/boeking-status",
    );
  });
});
