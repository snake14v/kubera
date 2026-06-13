// Coupon engine — built-in launch codes + optional Firestore `coupons/{CODE}` docs.
// Firestore doc shape: { type: 'percent'|'flat', value: number, minOrder?: number,
//                        maxDiscount?: number, active: boolean, expiresAt?: Timestamp }

export type Coupon = {
  code: string;
  type: "percent" | "flat";
  value: number;
  minOrder?: number;
  maxDiscount?: number;
  label: string;
};

// Built-ins (testing + launch). Edit freely — codes are case-insensitive.
export const BUILTIN_COUPONS: Coupon[] = [
  { code: "WELCOME10", type: "percent", value: 10, minOrder: 200, maxDiscount: 100, label: "10% off (min ₹200)" },
  { code: "ORBEAN50", type: "flat", value: 50, minOrder: 300, label: "₹50 off (min ₹300)" },
  { code: "MATCHA15", type: "percent", value: 15, minOrder: 400, maxDiscount: 150, label: "15% off (min ₹400)" },
  { code: "OPENINGDAY", type: "percent", value: 20, minOrder: 250, maxDiscount: 200, label: "20% off opening special (min ₹250)" },
];

export type CouponResult =
  | { ok: true; coupon: Coupon; discount: number }
  | { ok: false; reason: string };

export function applyCoupon(coupon: Coupon, subtotal: number): CouponResult {
  if (coupon.minOrder && subtotal < coupon.minOrder)
    return { ok: false, reason: `Add ₹${coupon.minOrder - subtotal} more to use ${coupon.code}.` };
  let discount =
    coupon.type === "percent" ? Math.round((subtotal * coupon.value) / 100) : coupon.value;
  if (coupon.maxDiscount) discount = Math.min(discount, coupon.maxDiscount);
  discount = Math.min(discount, subtotal);
  return { ok: true, coupon, discount };
}

/** Resolve a code: built-ins first, then Firestore `coupons/{CODE}` (uppercased id). */
export async function resolveCoupon(codeRaw: string, subtotal: number): Promise<CouponResult> {
  const code = codeRaw.trim().toUpperCase();
  if (!code) return { ok: false, reason: "Enter a code." };

  const builtin = BUILTIN_COUPONS.find((c) => c.code === code);
  if (builtin) return applyCoupon(builtin, subtotal);

  try {
    const { db } = await import("./firebase");
    if (db) {
      const { doc, getDoc, Timestamp } = await import("firebase/firestore");
      const snap = await getDoc(doc(db, "coupons", code));
      if (snap.exists()) {
        const d = snap.data() as {
          type: "percent" | "flat"; value: number; minOrder?: number;
          maxDiscount?: number; active?: boolean; expiresAt?: InstanceType<typeof Timestamp>;
        };
        if (d.active === false) return { ok: false, reason: "That code is no longer active." };
        if (d.expiresAt && d.expiresAt.toMillis() < Date.now())
          return { ok: false, reason: "That code has expired." };
        return applyCoupon(
          { code, type: d.type, value: d.value, minOrder: d.minOrder, maxDiscount: d.maxDiscount, label: code },
          subtotal
        );
      }
    }
  } catch {
    /* fall through */
  }
  return { ok: false, reason: "That code doesn't look right." };
}
