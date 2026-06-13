"use client";

// StaffGate — operator identification for every staff operation.
// Wrap a staff surface in <StaffGate staff={roster}>; children call
// useStaffGate().requireOperator() before any sensitive action. If a fresh
// operator session exists it resolves instantly (and refreshes the TTL);
// otherwise the who-are-you → PIN-pad modal pops and resolves with the
// verified operator, or null if dismissed.

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { pinHash, type StaffMember } from "@/lib/staff";
import {
  getOperator,
  setOperator,
  touchOperator,
  clearOperator,
  subscribeOperator,
  type Operator,
} from "@/lib/operator";

type GateApi = {
  operator: Operator | null;
  /** Resolve the verified operator (popping the PIN modal if needed). */
  requireOperator: () => Promise<Operator | null>;
  /** End the current operator session (e.g. stepping away from the tablet). */
  lock: () => void;
};

const GateCtx = createContext<GateApi | null>(null);

export function useStaffGate(): GateApi {
  const ctx = useContext(GateCtx);
  if (!ctx) throw new Error("useStaffGate must be used inside <StaffGate>");
  return ctx;
}

export default function StaffGate({
  staff,
  children,
}: {
  staff: StaffMember[];
  children: ReactNode;
}) {
  const [operator, setOp] = useState<Operator | null>(null);
  const [modal, setModal] = useState(false);
  const pendingRef = useRef<((op: Operator | null) => void) | null>(null);

  // hydrate + follow the session store (and let the TTL lapse visibly)
  useEffect(() => {
    setOp(getOperator());
    const unsub = subscribeOperator(() => setOp(getOperator()));
    const t = setInterval(() => setOp(getOperator()), 30_000);
    return () => {
      unsub();
      clearInterval(t);
      // unmounting with a prompt open: release any waiter with "cancelled"
      pendingRef.current?.(null);
      pendingRef.current = null;
    };
  }, []);

  const requireOperator = useCallback((): Promise<Operator | null> => {
    const cur = getOperator();
    if (cur) {
      touchOperator();
      return Promise.resolve(cur);
    }
    return new Promise((resolve) => {
      // only one prompt at a time — a second caller joins the same prompt
      const prev = pendingRef.current;
      pendingRef.current = (op) => {
        prev?.(op);
        resolve(op);
      };
      setModal(true);
    });
  }, []);

  const finish = useCallback((op: Operator | null) => {
    setModal(false);
    const resolve = pendingRef.current;
    pendingRef.current = null;
    resolve?.(op);
  }, []);

  const lock = useCallback(() => clearOperator(), []);

  return (
    <GateCtx.Provider value={{ operator, requireOperator, lock }}>
      {children}
      {modal && <PinModal staff={staff} onDone={finish} />}
    </GateCtx.Provider>
  );
}

/* ── modal: who are you? → PIN pad ── */

function PinModal({
  staff,
  onDone,
}: {
  staff: StaffMember[];
  onDone: (op: Operator | null) => void;
}) {
  const [picked, setPicked] = useState<StaffMember | null>(null);
  const [pin, setPin] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  // Esc dismisses = action cancelled
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onDone(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function submit() {
    if (!picked || pin.length !== 4 || busy) return;
    setBusy(true);
    try {
      const h = await pinHash(pin, picked.id);
      if (h !== picked.pinHash) {
        setMsg("Wrong PIN — try again");
        setPin("");
        return;
      }
      setOperator({ staffId: picked.id, name: picked.name, role: picked.role });
      onDone({ staffId: picked.id, name: picked.name, role: picked.role, atMs: Date.now() });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-forest-950/80 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="staff-gate-title"
    >
      <div className="w-full max-w-md rounded-lg border border-gold-500/30 bg-forest-900 p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p id="staff-gate-title" className="font-display text-xl font-bold text-cream">
              {picked ? picked.name : "Who's doing this?"}
            </p>
            <p className="mt-1 font-body text-xs text-cream/50">
              {picked
                ? "Enter your PIN — this action is filed under your name."
                : "Staff operations are signed. Tap your name."}
            </p>
          </div>
          <button
            onClick={() => onDone(null)}
            className="rounded-full border border-cream/20 px-3 py-1.5 font-body text-[10px] font-bold uppercase tracking-brand text-cream/60 hover:border-red-400 hover:text-red-300"
          >
            Cancel
          </button>
        </div>

        {!picked ? (
          <div className="mt-4">
            {staff.length === 0 ? (
              <p className="rounded-lg border border-cream/10 bg-forest-850 p-4 font-body text-sm text-cream/55">
                No staff on the roster yet — the owner adds the team in{" "}
                <span className="text-gold-400">Admin → Manage → Staff</span>.
              </p>
            ) : (
              <div className="grid max-h-72 grid-cols-2 gap-2 overflow-y-auto">
                {staff.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => {
                      setPicked(m);
                      setMsg("");
                    }}
                    className="rounded-lg border border-cream/10 bg-forest-850 p-3 text-left transition-colors hover:border-gold-500/50"
                  >
                    <p className="font-display text-sm font-bold text-cream">{m.name}</p>
                    <p className="font-body text-[11px] text-cream/45">{m.role}</p>
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="mt-4 text-center">
            <div className="flex justify-center gap-3">
              {[0, 1, 2, 3].map((i) => (
                <span
                  key={i}
                  className={`h-3.5 w-3.5 rounded-full ${pin.length > i ? "bg-gold-400" : "border border-cream/30"}`}
                />
              ))}
            </div>
            {msg && <p className="mt-2 font-body text-xs text-red-300">{msg}</p>}
            <div className="mt-4 grid grid-cols-3 gap-2">
              {["1", "2", "3", "4", "5", "6", "7", "8", "9", "⌫", "0", "OK"].map((k) => (
                <button
                  key={k}
                  disabled={busy}
                  onClick={() => {
                    if (k === "⌫") setPin((p) => p.slice(0, -1));
                    else if (k === "OK") void submit();
                    else if (pin.length < 4) setPin((p) => p + k);
                  }}
                  className={`rounded-xl py-4 font-display text-xl font-bold transition-colors ${
                    k === "OK"
                      ? "bg-gold-500 text-forest-950 hover:bg-gold-700 disabled:opacity-50"
                      : "border border-cream/15 bg-forest-850 text-cream hover:border-gold-500/50"
                  }`}
                >
                  {k}
                </button>
              ))}
            </div>
            <button
              onClick={() => {
                setPicked(null);
                setPin("");
                setMsg("");
              }}
              className="mt-4 rounded-full border border-cream/20 px-4 py-2 font-body text-[10px] font-bold uppercase tracking-brand text-cream/60 hover:border-gold-500 hover:text-gold-400"
            >
              ← Not you?
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
