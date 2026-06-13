"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { AddonPick, CartLine, OrderableItem, SizeKey, Temp } from "@/lib/orders";
import { priceFor, cartTotal, lineKey } from "@/lib/orders";

type CartCtx = {
  lines: CartLine[];
  total: number;
  count: number;
  ready: boolean;
  add: (item: OrderableItem, size: SizeKey | null, temp: Temp, addons: AddonPick[]) => void;
  setQty: (key: string, qty: number) => void;
  clear: () => void;
};

const Ctx = createContext<CartCtx | null>(null);
const LS_KEY = "orbean-cart-v2";

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) setLines(JSON.parse(raw));
    } catch {}
    setReady(true);
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(lines));
    } catch {}
  }, [lines]);

  const api = useMemo<CartCtx>(() => {
    const add = (item: OrderableItem, size: SizeKey | null, temp: Temp, addons: AddonPick[]) => {
      const key = lineKey(item.id, size, temp, addons);
      const addonTotal = addons.reduce((s, a) => s + a.price, 0);
      setLines((prev) => {
        const found = prev.find((l) => l.key === key);
        if (found) return prev.map((l) => (l.key === key ? { ...l, qty: l.qty + 1 } : l));
        return [
          ...prev,
          {
            key,
            id: item.id,
            name: item.name,
            size,
            temp,
            addons,
            unitPrice: priceFor(item, size) + addonTotal,
            qty: 1,
          },
        ];
      });
    };
    const setQty = (key: string, qty: number) =>
      setLines((prev) =>
        qty <= 0 ? prev.filter((l) => l.key !== key) : prev.map((l) => (l.key === key ? { ...l, qty } : l))
      );
    const clear = () => setLines([]);
    return {
      lines,
      total: cartTotal(lines),
      count: lines.reduce((s, l) => s + l.qty, 0),
      ready,
      add,
      setQty,
      clear,
    };
  }, [lines, ready]);

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}

export function useCart(): CartCtx {
  const c = useContext(Ctx);
  if (!c) throw new Error("useCart outside CartProvider");
  return c;
}
