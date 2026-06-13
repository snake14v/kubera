"use client";

// Active-operator session for shared staff tablets.
// Any staff operation (status advance, order edit, note, FRM filing) must be
// performed AS someone: staff pick their name + enter their PIN once, then
// stay the active operator for OPERATOR_TTL_MS (refreshed by each gated
// action). Same attendance-grade trust model as check-in PINs.

export type Operator = {
  staffId: string;
  name: string;
  role: string;
  /** last verified/used — session expires OPERATOR_TTL_MS after this */
  atMs: number;
};

const KEY = "orbean-operator-v1";
export const OPERATOR_TTL_MS = 10 * 60_000;

const listeners = new Set<() => void>();
function emit() {
  listeners.forEach((fn) => fn());
}

export function subscribeOperator(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function getOperator(): Operator | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const op = JSON.parse(raw) as Operator;
    if (!op?.staffId || !op?.name || typeof op.atMs !== "number") return null;
    if (Date.now() - op.atMs > OPERATOR_TTL_MS) {
      localStorage.removeItem(KEY);
      return null;
    }
    return op;
  } catch {
    return null;
  }
}

export function setOperator(op: Omit<Operator, "atMs">) {
  localStorage.setItem(KEY, JSON.stringify({ ...op, atMs: Date.now() }));
  emit();
}

/** Refresh the session clock — call on every gated action. */
export function touchOperator() {
  const op = getOperator();
  if (op) {
    localStorage.setItem(KEY, JSON.stringify({ ...op, atMs: Date.now() }));
    emit();
  }
}

export function clearOperator() {
  localStorage.removeItem(KEY);
  emit();
}
