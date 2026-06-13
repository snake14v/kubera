"use client";

import { BRAND } from "./brand";
import { moneyAscii } from "@/lib/format";

// Bluetooth thermal printing (ESC/POS over Web Bluetooth GATT) — works on
// Android Chrome tablets with common 58/80mm BT printers (FFE0/18F0/Goojprt
// services). Pair once per tablet ("🖨 Connect printer"), then one-tap
// receipts at the cashier and KOTs in the kitchen. No native app needed.

const SERVICES = [
  0xffe0,
  0x18f0,
  "e7810a71-73ae-499d-8c15-faa9aef0c3f2", // generic BLE printer
  "49535343-fe7d-4ae5-8fa9-9fafd205e455", // ISSC transparent UART
];

// minimal Web Bluetooth typings (no @types/web-bluetooth dependency)
type BTChar = {
  properties: { write?: boolean; writeWithoutResponse?: boolean };
  writeValue(v: Uint8Array): Promise<void>;
  writeValueWithoutResponse?(v: Uint8Array): Promise<void>;
};
type BTDevice = {
  name?: string;
  gatt?: {
    connected: boolean;
    connect(): Promise<{ getPrimaryServices(): Promise<{ getCharacteristics(): Promise<BTChar[]> }[]> }>;
  };
};

let device: BTDevice | null = null;
let chr: BTChar | null = null;

export function printerName(): string | null {
  return device?.name ?? null;
}

export async function connectPrinter(): Promise<string> {
  const nav = navigator as Navigator & { bluetooth?: { requestDevice(o: object): Promise<BTDevice> } };
  if (!nav.bluetooth) throw new Error("This browser has no Bluetooth — use Chrome on the Android tablet.");
  device = await nav.bluetooth.requestDevice({ acceptAllDevices: true, optionalServices: SERVICES });
  const gatt = await device.gatt!.connect();
  for (const s of await gatt.getPrimaryServices()) {
    for (const c of await s.getCharacteristics()) {
      if (c.properties.write || c.properties.writeWithoutResponse) {
        chr = c;
        return device.name ?? "printer";
      }
    }
  }
  throw new Error("No writable print service found on this device.");
}

async function send(bytes: Uint8Array) {
  if (!chr) throw new Error("No printer connected — tap 🖨 Connect printer first.");
  if (!device?.gatt?.connected) await device!.gatt!.connect();
  for (let i = 0; i < bytes.length; i += 100) {
    await chr.writeValueWithoutResponse?.(bytes.slice(i, i + 100)).catch(() => chr!.writeValue(bytes.slice(i, i + 100)));
  }
}

const enc = new TextEncoder();
const ESC = {
  init: [0x1b, 0x40],
  center: [0x1b, 0x61, 1],
  left: [0x1b, 0x61, 0],
  big: [0x1d, 0x21, 0x11],
  normal: [0x1d, 0x21, 0x00],
  bold: [0x1b, 0x45, 1],
  unbold: [0x1b, 0x45, 0],
  feedCut: [0x0a, 0x0a, 0x0a, 0x1d, 0x56, 0x42, 0x00],
};
function build(parts: (number[] | string)[]): Uint8Array {
  const out: number[] = [];
  for (const p of parts) out.push(...(typeof p === "string" ? enc.encode(p) : p));
  return new Uint8Array(out);
}
const line = "------------------------------\n";

export type PrintLine = { name: string; size?: string | null; temp?: string | null; qty: number; unitPrice?: number };

/** Customer receipt — cashier printer. */
export async function printReceipt(o: { code: string; lines: PrintLine[]; total: number; payment?: string; table?: string | null; name?: string }) {
  await send(
    build([
      ESC.init, ESC.center, ESC.big, BRAND.business.name.toUpperCase() + "\n", ESC.normal,
      `${BRAND.business.addressLine1}\n${BRAND.business.addressLine2}\n`, line,
      ESC.bold, `${o.code}${o.table ? `  TABLE ${o.table}` : ""}\n`, ESC.unbold,
      new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata", hour12: true }) + "\n", line, ESC.left,
      ...o.lines.map((l) => `${l.qty} x ${l.name}${l.size ? ` ${l.size.toUpperCase()}` : ""}${l.temp ? ` ${l.temp}` : ""}\n${l.unitPrice ? `      ${moneyAscii(l.unitPrice * l.qty)}\n` : ""}`),
      line, ESC.bold, ESC.center, `TOTAL  ${moneyAscii(o.total)}\n`, ESC.unbold,
      (o.payment ?? "pay at counter") + "\n", line,
      `${BRAND.business.tagline}\npowered by ${BRAND.name} - open source POS\n`,
      ESC.feedCut,
    ])
  );
}

/** Kitchen order ticket (KOT) — kitchen printer. */
export async function printKOT(o: { code: string; lines: PrintLine[]; table?: string | null; type?: string; notes?: { text: string }[] }) {
  await send(
    build([
      ESC.init, ESC.center, ESC.big, `${o.code}\n`,
      `${o.table ? `TABLE ${o.table}` : (o.type ?? "PICKUP").toUpperCase()}\n`, ESC.normal, line, ESC.left, ESC.bold,
      ...o.lines.map((l) => `${l.qty} x ${l.name}${l.size ? ` ${l.size.toUpperCase()}` : ""}${l.temp ? ` ${l.temp}` : ""}\n`),
      ESC.unbold,
      ...(o.notes ?? []).map((n) => `* ${n.text}\n`),
      line, ESC.center, new Date().toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata", hour12: true }) + "\n",
      ESC.feedCut,
    ])
  );
}
