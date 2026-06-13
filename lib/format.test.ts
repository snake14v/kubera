import { describe, it, expect } from "vitest";
import { money, moneyAscii } from "./format";

describe("money", () => {
  it("prefixes the currency symbol and groups by locale", () => {
    expect(money(1299)).toBe("₹1,299");
    // en-IN grouping (lakh/crore style)
    expect(money(1234567)).toBe("₹12,34,567");
  });
  it("treats null/undefined/NaN as 0", () => {
    expect(money(null)).toBe("₹0");
    expect(money(undefined)).toBe("₹0");
    expect(money(Number.NaN)).toBe("₹0");
  });
});

describe("moneyAscii", () => {
  it("uses an ASCII prefix for thermal receipts", () => {
    expect(moneyAscii(250)).toBe("Rs.250");
  });
});
