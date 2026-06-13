import { describe, it, expect } from "vitest";
import { applyCoupon, type Coupon } from "./coupons";

const pct: Coupon = { code: "P15", type: "percent", value: 15, maxDiscount: 150, label: "" };
const flat: Coupon = { code: "F50", type: "flat", value: 50, minOrder: 300, label: "" };

describe("applyCoupon", () => {
  it("floors percent discounts (never over-credits)", () => {
    const r = applyCoupon({ ...pct, maxDiscount: undefined }, 401);
    // 15% of 401 = 60.15 → floor 60
    expect(r.ok && r.discount).toBe(60);
  });

  it("respects maxDiscount", () => {
    const r = applyCoupon(pct, 2000); // 15% = 300, capped at 150
    expect(r.ok && r.discount).toBe(150);
  });

  it("never exceeds the subtotal", () => {
    const r = applyCoupon({ code: "BIG", type: "flat", value: 999, label: "" }, 100);
    expect(r.ok && r.discount).toBe(100);
  });

  it("rejects below the minimum order", () => {
    const r = applyCoupon(flat, 200);
    expect(r.ok).toBe(false);
  });

  it("applies a flat discount when the minimum is met", () => {
    const r = applyCoupon(flat, 500);
    expect(r.ok && r.discount).toBe(50);
  });
});
