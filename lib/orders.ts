// Ordering domain model — shared by the /order flow, admin console, and rules.

import { BRAND } from "./brand";
import {
  matchaCollection,
  matchaPrices,
  signatureLattes,
  signaturePrices,
  icedSignatures,
  classicLattes,
  macchiatos,
  coffeeClassics,
  juices,
  juicePrices,
  foodItems,
  addOns,
  type Sizes,
} from "./menu";

export type SizeKey = "s" | "m" | "l";
export const SIZE_LABEL: Record<SizeKey, string> = { s: "S 12oz", m: "M 16oz", l: "L 20oz" };

export type Category =
  | "Matcha Collection"
  | "Signature Lattes"
  | "Coffee Classics"
  | "Classic Lattes"
  | "Macchiatos"
  | "Cold-Pressed Juices"
  | "Food & Bakes";

export type OrderableItem = {
  id: string;
  name: string;
  note?: string;
  category: Category;
  prices: Sizes | null; // null → single price in `price`
  price?: number;
  /** drinks can be hot/iced; juices/food cannot */
  tempChoice: boolean;
  /** add-ons (extra shot, milks, …) apply to coffee/matcha drinks */
  customizable: boolean;
};

export const ORDERABLE: OrderableItem[] = [
  ...matchaCollection.map((d, i) => ({
    id: `matcha-${i}`, name: d.name, note: d.note,
    category: "Matcha Collection" as const, prices: matchaPrices,
    tempChoice: true, customizable: true,
  })),
  ...signatureLattes.map((d, i) => ({
    id: `sig-${i}`, name: `${d.name} Signature Latte`, note: d.note,
    category: "Signature Lattes" as const, prices: signaturePrices,
    tempChoice: true, customizable: true,
  })),
  ...icedSignatures.map((d, i) => ({
    id: `iced-${i}`, name: d.name, note: d.note,
    category: "Signature Lattes" as const, prices: signaturePrices,
    tempChoice: false, customizable: true, // already iced by design
  })),
  ...coffeeClassics.map((d, i) => ({
    id: `coffee-${i}`, name: d.name, note: d.note,
    category: "Coffee Classics" as const, prices: null, price: d.price,
    tempChoice: true, customizable: true,
  })),
  ...classicLattes.map((d, i) => ({
    id: `classic-${i}`, name: d.name, note: d.note,
    category: "Classic Lattes" as const, prices: d.prices ?? null,
    tempChoice: true, customizable: true,
  })),
  ...macchiatos.map((d, i) => ({
    id: `mac-${i}`, name: d.name, note: d.note,
    category: "Macchiatos" as const, prices: d.prices ?? null,
    tempChoice: true, customizable: true,
  })),
  ...juices.map((name, i) => ({
    id: `juice-${i}`, name,
    category: "Cold-Pressed Juices" as const, prices: null,
    price: juicePrices[name] ?? 150,
    tempChoice: false, customizable: false,
  })),
  ...foodItems.map((d, i) => ({
    id: `food-${i}`, name: d.name, note: d.note,
    category: "Food & Bakes" as const, prices: null, price: d.price,
    tempChoice: false, customizable: false,
  })),
];

export const CATEGORIES: Category[] = [
  "Matcha Collection",
  "Signature Lattes",
  "Coffee Classics",
  "Classic Lattes",
  "Macchiatos",
  "Cold-Pressed Juices",
  "Food & Bakes",
];

export type AddonPick = { name: string; price: number };
export const ADDONS: AddonPick[] = addOns;

export type Temp = "hot" | "iced" | null;

export type CartLine = {
  key: string; // id + size + temp + addon signature
  id: string;
  name: string;
  size: SizeKey | null;
  temp: Temp;
  addons: AddonPick[];
  unitPrice: number; // includes addons
  qty: number;
};

export function priceFor(item: OrderableItem, size: SizeKey | null): number {
  if (item.prices && size) return item.prices[size];
  return item.price ?? 0;
}

export function lineKey(id: string, size: SizeKey | null, temp: Temp, addons: AddonPick[]): string {
  const a = addons.map((x) => x.name).sort().join("+");
  return `${id}:${size ?? "one"}:${temp ?? "na"}:${a}`;
}

export function cartTotal(lines: CartLine[]): number {
  return lines.reduce((s, l) => s + l.unitPrice * l.qty, 0);
}

export type OrderType = "dinein" | "pickup" | "delivery";

// Store location + delivery radius — configured via BRAND.business (env-driven).
export const SHOP = { lat: BRAND.business.geo.lat, lng: BRAND.business.geo.lng };
export const DELIVERY_RADIUS_KM = BRAND.business.deliveryRadiusKm;

export function haversineKm(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const R = 6371;
  const dLat = ((bLat - aLat) * Math.PI) / 180;
  const dLng = ((bLng - aLng) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((aLat * Math.PI) / 180) * Math.cos((bLat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
}

/** Resolve a marketing-menu drink name to its orderable item id (fuzzy). */
export function orderableIdFor(name: string): string | null {
  const exact = ORDERABLE.find((i) => i.name === name);
  if (exact) return exact.id;
  const fuzzy = ORDERABLE.find((i) => i.name.includes(name) || name.includes(i.name));
  return fuzzy ? fuzzy.id : null;
}

/** Short human order code from a Firestore doc id, e.g. ORD-4F7K.
 *  Prefix is deployer-configurable via NEXT_PUBLIC_ORDER_PREFIX. */
export function orderCode(docId: string): string {
  return `${BRAND.business.orderPrefix}-` + docId.slice(0, 4).toUpperCase();
}
