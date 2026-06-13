import { describe, it, expect } from "vitest";
import {
  priceFor,
  lineKey,
  cartTotal,
  haversineKm,
  orderCode,
  type OrderableItem,
  type CartLine,
} from "./orders";

const drink: OrderableItem = {
  id: "matcha-0",
  name: "Velvet Vanilla",
  category: "Matcha Collection",
  prices: { s: 279, m: 329, l: 379 },
  tempChoice: true,
  customizable: true,
};

const food: OrderableItem = {
  id: "food-0",
  name: "Croissant",
  category: "Food & Bakes",
  prices: null,
  price: 120,
  tempChoice: false,
  customizable: false,
};

describe("priceFor", () => {
  it("uses the size price when sized", () => {
    expect(priceFor(drink, "s")).toBe(279);
    expect(priceFor(drink, "l")).toBe(379);
  });
  it("falls back to the flat price when not sized", () => {
    expect(priceFor(food, null)).toBe(120);
  });
  it("returns 0 when neither price is available", () => {
    expect(priceFor({ ...food, price: undefined }, null)).toBe(0);
  });
});

describe("lineKey", () => {
  it("is stable and distinguishes size/temp", () => {
    expect(lineKey("a", "s", "hot", [])).toBe("a:s:hot:");
    expect(lineKey("a", "m", "hot", [])).not.toBe(lineKey("a", "s", "hot", []));
  });
  it("is independent of addon ordering", () => {
    const a = lineKey("x", "m", "iced", [
      { name: "Oat", price: 30 },
      { name: "Shot", price: 40 },
    ]);
    const b = lineKey("x", "m", "iced", [
      { name: "Shot", price: 40 },
      { name: "Oat", price: 30 },
    ]);
    expect(a).toBe(b);
  });
});

describe("cartTotal", () => {
  it("sums unitPrice * qty across lines", () => {
    const lines: CartLine[] = [
      { key: "1", id: "a", name: "A", size: "m", temp: "hot", addons: [], unitPrice: 329, qty: 2 },
      { key: "2", id: "b", name: "B", size: null, temp: null, addons: [], unitPrice: 120, qty: 1 },
    ];
    expect(cartTotal(lines)).toBe(329 * 2 + 120);
  });
  it("is 0 for an empty cart", () => {
    expect(cartTotal([])).toBe(0);
  });
});

describe("haversineKm", () => {
  it("is 0 for identical points", () => {
    expect(haversineKm(12.9, 77.6, 12.9, 77.6)).toBeCloseTo(0, 5);
  });
  it("approximates a known short distance", () => {
    // ~1.57 km between two nearby Bengaluru points
    const d = haversineKm(12.9145, 77.6101, 12.9145, 77.6246);
    expect(d).toBeGreaterThan(1.4);
    expect(d).toBeLessThan(1.8);
  });
});

describe("orderCode", () => {
  it("builds a short upper-cased code with the configured prefix", () => {
    expect(orderCode("abcd1234ef")).toBe("ORD-ABCD");
  });
});
