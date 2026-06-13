"use client";

// Multi-tablet presence — each device registers a session and heartbeats to
// Firestore every 4s. All tablets see each other; >12s silent = offline.
// State itself (orders, forms, attendance) already syncs push-style via
// onSnapshot; this layer makes the tablet mesh visible and keeps a shared
// "who/what/where" memory.

import { useEffect, useState } from "react";
import { collection, doc, onSnapshot, serverTimestamp, setDoc, Timestamp } from "firebase/firestore";
import { db } from "./firebase";

// The 5-tab system — all on one stack (see /tabs launcher).
export const TABLET_LABELS = [
  "Cashier",
  "Customer Display",
  "Kitchen Display",
  "Staff Portal",
  "Waiter",
  "Admin / Owner's phone",
] as const;

export type DeviceSession = {
  id: string;
  label: string;
  page: string;
  lastSeen?: Timestamp;
  online: boolean;
};

const HEARTBEAT_MS = 4000;
const STALE_MS = 12000;

function deviceId(): string {
  try {
    let id = localStorage.getItem("orbean-device-id");
    if (!id) {
      id = "dev-" + Math.random().toString(36).slice(2, 10);
      localStorage.setItem("orbean-device-id", id);
    }
    return id;
  } catch {
    return "dev-anon";
  }
}

export function getTabletLabel(): string {
  try {
    return localStorage.getItem("orbean-device-label") ?? "";
  } catch {
    return "";
  }
}

export function setTabletLabel(label: string) {
  try {
    localStorage.setItem("orbean-device-label", label);
  } catch {}
}

/** Register this device + heartbeat every 4s; returns the live device mesh. */
export function usePresence(page: string, label: string) {
  const [devices, setDevices] = useState<DeviceSession[]>([]);
  const [tick, setTick] = useState(0);

  // heartbeat
  useEffect(() => {
    if (!db || !label) return;
    const id = deviceId();
    const beat = () =>
      setDoc(
        doc(db!, "device_sessions", id),
        { label, page, lastSeen: serverTimestamp() },
        { merge: true }
      ).catch(() => {});
    beat();
    const t = setInterval(beat, HEARTBEAT_MS);
    return () => clearInterval(t);
  }, [page, label]);

  // mesh subscription + staleness re-render
  useEffect(() => {
    if (!db) return;
    const unsub = onSnapshot(collection(db, "device_sessions"), (snap) => {
      setDevices(
        snap.docs.map((d) => {
          const v = d.data() as { label?: string; page?: string; lastSeen?: Timestamp };
          return { id: d.id, label: v.label ?? "Unknown", page: v.page ?? "", lastSeen: v.lastSeen, online: false };
        })
      );
    });
    const t = setInterval(() => setTick((x) => x + 1), HEARTBEAT_MS);
    return () => {
      unsub();
      clearInterval(t);
    };
  }, []);

  void tick; // staleness refresh
  const now = Date.now();
  return devices
    .map((d) => ({ ...d, online: !!d.lastSeen && now - d.lastSeen.toMillis() < STALE_MS }))
    .sort((a, b) => Number(b.online) - Number(a.online) || a.label.localeCompare(b.label));
}
