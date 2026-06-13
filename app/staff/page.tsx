"use client";

// ORBÉAN STAFF PORTAL — the 4th counter tablet.
// Big-tile hub: PIN check-in/out, digital shift forms (FRM-01/03/07/08),
// captain-style live order board, ShopSense console. Designed for fingers.

import { useEffect, useMemo, useRef, useState } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import {
  addDoc,
  arrayUnion,
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
  Timestamp,
} from "firebase/firestore";
import { auth, db, isAdmin } from "@/lib/firebase";
import {
  pinHash,
  istDateKey,
  istClock,
  OPENING_ITEMS,
  type StaffMember,
  type AttendanceRec,
} from "@/lib/staff";
import { orderCode, SIZE_LABEL, type SizeKey } from "@/lib/orders";
import { usePresence, getTabletLabel, setTabletLabel, TABLET_LABELS } from "@/lib/presence";
import { getOperator, setOperator, clearOperator } from "@/lib/operator";
import { chimeEnabled, setChimeEnabled, playChime } from "@/lib/chime";
import StaffGate, { useStaffGate } from "@/components/StaffGate";
import OrderEditor, { type EditableOrder, type AuditEntry } from "@/components/OrderEditor";
import TablesBoard from "@/components/TablesBoard";
import InventoryPanel from "@/components/InventoryPanel";

type Panel = "home" | "checkin" | "frm01" | "frm03" | "frm08" | "frm07" | "orders" | "tables" | "floor" | "inventory";

const tileBase =
  "group relative flex flex-col items-start justify-between overflow-hidden rounded-lg border border-cream/10 bg-forest-850 p-6 text-left transition-all duration-300 hover:-translate-y-1 hover:border-gold-500/50 min-h-[150px]";

const btnGold =
  "rounded-full bg-gold-500 px-6 py-3 font-body text-[12px] font-bold uppercase tracking-brand text-forest-950 hover:bg-gold-700 disabled:opacity-50";
const btnGhost =
  "rounded-full border border-cream/20 px-5 py-2.5 font-body text-[11px] font-bold uppercase tracking-brand text-cream/70 hover:border-gold-500 hover:text-gold-400";
const field =
  "w-full rounded-2xl border border-cream/15 bg-forest-900 px-5 py-4 font-body text-base text-cream outline-none placeholder:text-cream/35 focus:border-gold-500";

const inr = (n: number) => "₹" + (n ?? 0).toLocaleString("en-IN");

/** Today's IST date key as state — rolls over at midnight so a tablet left
 *  on overnight re-subscribes its queries to the new day. */
function useIstDateKey() {
  const [key, setKey] = useState(istDateKey());
  useEffect(() => {
    const t = setInterval(() => {
      const now = istDateKey();
      setKey((cur) => (cur === now ? cur : now));
    }, 60_000);
    return () => clearInterval(t);
  }, []);
  return key;
}

export default function StaffPortal() {
  const [panel, setPanel] = useState<Panel>(() => {
    if (typeof window === "undefined") return "home";
    const p = new URLSearchParams(window.location.search).get("panel");
    return (["floor", "tables", "orders", "checkin", "inventory", "frm01", "frm03", "frm07", "frm08"].includes(p ?? "") ? (p as Panel) : "home");
  });
  const [clock, setClock] = useState(istClock());
  const [user, setUser] = useState<User | null>(null);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [today, setToday] = useState<AttendanceRec[]>([]);
  const [toast, setToast] = useState("");
  const [label, setLabel] = useState("");
  const [forms, setForms] = useState<{ form: string; staffName?: string; id: string; acks?: { by: string; atMs: number }[]; createdAt?: Timestamp; payload?: Record<string, unknown> }[]>([]);
  const [activeOrders, setActiveOrders] = useState(0);
  const [seatedTables, setSeatedTables] = useState(0);
  // tapping "Log breach" on a late order lands here pre-filled
  const [breachPrefill, setBreachPrefill] = useState<{ code: string; actual: string } | null>(null);
  // handover note shown to whoever just checked in, until they acknowledge
  const [ackPrompt, setAckPrompt] = useState<{ person: { name: string; staffId: string }; doc: FormDoc } | null>(null);
  const [ackTick, setAckTick] = useState(false);

  useEffect(() => setLabel(getTabletLabel() || TABLET_LABELS[0]), []);
  const devices = usePresence("staff-portal", label);

  useEffect(() => {
    const t = setInterval(() => setClock(istClock()), 15000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!auth) return;
    return onAuthStateChanged(auth, setUser);
  }, []);

  const dateKey = useIstDateKey();

  // staff roster + today's attendance (live; re-subscribes at midnight)
  useEffect(() => {
    if (!db) return;
    const u1 = onSnapshot(collection(db, "staff_members"), (s) =>
      setStaff(
        s.docs
          .map((d) => ({ id: d.id, ...(d.data() as Omit<StaffMember, "id">) }))
          .filter((m) => m.active !== false)
          .sort((a, b) => a.name.localeCompare(b.name))
      )
    );
    const u2 = onSnapshot(
      query(collection(db, "attendance"), where("date", "==", dateKey)),
      (s) => setToday(s.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<AttendanceRec, "id">) })))
    );
    return () => {
      u1();
      u2();
    };
  }, [dateKey]);

  // hub badges: today's filings, live order count (when signed in), seated tables
  useEffect(() => {
    if (!db) return;
    const u1 = onSnapshot(
      query(collection(db, "form_submissions"), where("date", "==", dateKey)),
      (s) => setForms(s.docs.map((d) => ({ id: d.id, ...(d.data() as { form: string; staffName?: string; acks?: { by: string; atMs: number }[]; createdAt?: Timestamp; payload?: Record<string, unknown> }) })))
    );
    const u2 = onSnapshot(
      query(collection(db, "table_sessions"), where("date", "==", dateKey)),
      (s) => setSeatedTables(s.docs.filter((d) => !(d.data() as { closedAtMs?: number | null }).closedAtMs).length),
      () => {}
    );
    return () => {
      u1();
      u2();
    };
  }, [dateKey]);

  useEffect(() => {
    if (!db || !isAdmin(user?.email)) return;
    return onSnapshot(
      query(collection(db, "orders"), orderBy("createdAt", "desc")),
      (s) =>
        setActiveOrders(
          s.docs.filter((d) => ["pending", "new", "preparing", "ready"].includes((d.data() as { status: string }).status)).length
        ),
      () => {}
    );
  }, [user]);

  const onFloor = useMemo(
    () => today.filter((a) => a.inAt && !a.outAt),
    [today]
  );

  function say(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(""), 3500);
  }

  return (
    <StaffGate staff={staff}>
    <main className="min-h-screen bg-forest-950 px-5 pb-16 pt-6 text-cream sm:px-8">
      {/* header */}
      <header className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4">
        <div>
          <p className="font-display text-2xl font-bold tracking-tight">
            ORB<span className="rgb-text">É</span>AN <span className="text-gold-400">STAFF</span>
          </p>
          <p className="font-body text-xs text-cream/45">
            {new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", timeZone: "Asia/Kolkata" })}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <span className="font-display text-3xl font-bold tabular-nums text-gold-400">{clock}</span>
          {panel !== "home" && (
            <button onClick={() => setPanel("home")} className={btnGhost}>
              ← Hub
            </button>
          )}
        </div>
      </header>

      {/* on-floor strip */}
      <div className="mx-auto mt-4 flex max-w-6xl flex-wrap items-center gap-2">
        <span className="font-body text-[11px] font-bold uppercase tracking-brand text-cream/40">On floor now:</span>
        {onFloor.length === 0 && <span className="font-body text-xs text-cream/35">nobody checked in yet</span>}
        {onFloor.map((a) => (
          <span key={a.id} className="rounded-full bg-[#3E7C5A]/25 px-3 py-1 font-body text-xs font-bold text-[#7fcb9b]">
            {a.name}
          </span>
        ))}
      </div>

      {/* tablet mesh — Firestore heartbeat every 4s */}
      <div className="mx-auto mt-2 flex max-w-6xl flex-wrap items-center gap-2">
        <span className="font-body text-[11px] font-bold uppercase tracking-brand text-cream/40">Tablets:</span>
        {devices.map((d) => (
          <span
            key={d.id}
            className={`flex items-center gap-1.5 rounded-full px-3 py-1 font-body text-xs ${
              d.online ? "bg-forest-850 text-cream/75" : "bg-forest-900 text-cream/30"
            }`}
            title={d.online ? "online" : "offline"}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${d.online ? "bg-[#7fcb9b]" : "bg-cream/25"}`} />
            {d.label}
          </span>
        ))}
        <select
          value={label}
          onChange={(e) => {
            setLabel(e.target.value);
            setTabletLabel(e.target.value);
          }}
          className="rounded-full border border-cream/15 bg-forest-900 px-3 py-1 font-body text-[11px] text-cream/60 outline-none focus:border-gold-500"
          aria-label="This tablet's role"
        >
          {TABLET_LABELS.map((l) => (
            <option key={l} value={l} className="bg-forest-900">
              this tablet: {l}
            </option>
          ))}
        </select>
      </div>

      {/* who's operating this tablet — PIN-verified, 10-min session */}
      <OperatorStrip today={today} />

      {toast && (
        <div className="fixed left-1/2 top-6 z-50 -translate-x-1/2 rounded-full border border-gold-500/40 bg-forest-900 px-6 py-3 font-body text-sm text-gold-400 shadow-xl">
          {toast}
        </div>
      )}

      {/* shift-change handover: shown right after check-in, must be acknowledged */}
      {ackPrompt && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-forest-950/85 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="handover-ack-title">
          <div className="w-full max-w-lg rounded-lg border border-gold-500/30 bg-forest-900 p-6 shadow-2xl">
            <p id="handover-ack-title" className="font-display text-xl font-bold text-cream">
              🔁 Hi {ackPrompt.person.name.split(" ")[0]} — read the handover first
            </p>
            <p className="mt-1 font-body text-xs text-cream/50">
              Filed by {ackPrompt.doc.staffName ?? "previous shift"} · the floor you&apos;re taking over:
            </p>
            <div className="mt-3 max-h-64 space-y-1.5 overflow-y-auto rounded-md bg-forest-850 p-4">
              {Object.entries((ackPrompt.doc.payload as Record<string, string>) ?? {}).map(([k, v]) => (
                <p key={k} className="font-body text-sm">
                  <span className="text-cream/45">{k}:</span> <span className="text-cream/90">{v || "—"}</span>
                </p>
              ))}
            </div>
            <label className="mt-4 flex cursor-pointer items-center gap-3 font-body text-sm text-cream/80">
              <input
                type="checkbox"
                checked={ackTick}
                onChange={(e) => setAckTick(e.target.checked)}
                className="h-5 w-5 accent-[#b59556]"
              />
              I&apos;ve read this and I&apos;m taking over the floor
            </label>
            <div className="mt-4 flex gap-2">
              <button
                disabled={!ackTick}
                onClick={async () => {
                  if (!db) return;
                  try {
                    await updateDoc(doc(db, "form_submissions", ackPrompt.doc.id), {
                      acks: arrayUnion({ by: ackPrompt.person.name, atMs: Date.now() }),
                    });
                    say(`Handover acknowledged — welcome, ${ackPrompt.person.name.split(" ")[0]} ☕`);
                  } catch {
                    say("Couldn't save the acknowledgement.");
                  }
                  setAckPrompt(null);
                  setAckTick(false);
                }}
                className={btnGold}
              >
                Acknowledge ✓
              </button>
              <button
                onClick={() => {
                  setAckPrompt(null);
                  setAckTick(false);
                }}
                className={btnGhost}
              >
                Later
              </button>
            </div>
          </div>
        </div>
      )}

      <section className="mx-auto mt-8 max-w-6xl">
        {panel === "home" && (
          <Hub setPanel={setPanel} user={user} forms={forms} activeOrders={activeOrders} seatedTables={seatedTables} />
        )}
        {panel === "checkin" && (
          <CheckIn
            staff={staff}
            today={today}
            say={say}
            onCheckedIn={(person) => {
              // shift change: surface the latest handover they haven't acknowledged
              const h = forms
                .filter((f) => f.form === "FRM-07")
                .sort((a, b) => (b.createdAt?.toMillis?.() ?? 0) - (a.createdAt?.toMillis?.() ?? 0))[0];
              if (h && !(h.acks ?? []).some((a) => a.by === person.name)) setAckPrompt({ person, doc: h });
            }}
          />
        )}
        {panel === "frm01" && <OpeningChecklist onFloor={onFloor} say={say} />}
        {panel === "frm03" && <WasteLog onFloor={onFloor} say={say} />}
        {panel === "frm08" && (
          <BreachLog onFloor={onFloor} say={say} prefill={breachPrefill} clearPrefill={() => setBreachPrefill(null)} />
        )}
        {panel === "frm07" && <Handover onFloor={onFloor} say={say} />}
        {panel === "orders" && (
          <OrdersBoard
            user={user}
            onBreach={(code, actual) => {
              setBreachPrefill({ code, actual });
              setPanel("frm08");
            }}
          />
        )}
        {panel === "tables" && <TablesBoard user={user} dateKey={dateKey} />}
        {panel === "inventory" && <InventoryPanel />}
        {panel === "floor" && (
          <div className="grid gap-6 2xl:grid-cols-2">
            <div className="min-w-0">
              <TablesBoard user={user} dateKey={dateKey} />
            </div>
            <div className="min-w-0">
              <OrdersBoard
                user={user}
                onBreach={(code, actual) => {
                  setBreachPrefill({ code, actual });
                  setPanel("frm08");
                }}
              />
            </div>
          </div>
        )}
      </section>
    </main>
    </StaffGate>
  );
}

/* ── operator strip — every staff action is signed by whoever's at the tablet ── */

function OperatorStrip({ today }: { today: AttendanceRec[] }) {
  const { operator, requireOperator, lock } = useStaffGate();
  const myRec = operator ? today.find((a) => a.staffId === operator.staffId && a.inAt && !a.outAt) : undefined;
  const onFloorMins = myRec?.inAt ? Math.floor((Date.now() - myRec.inAt.toMillis()) / 60000) : null;
  return (
    <div className="mx-auto mt-2 flex max-w-6xl flex-wrap items-center gap-2">
      <span className="font-body text-[11px] font-bold uppercase tracking-brand text-cream/40">Operator:</span>
      {operator ? (
        <>
          <span className="rounded-full bg-gold-500/15 px-3 py-1 font-body text-xs font-bold text-gold-400">
            🔓 {operator.name} · {operator.role}
          </span>
          {onFloorMins !== null && (
            <span className="rounded-full bg-forest-850 px-3 py-1 font-body text-xs text-cream/60">
              on floor {onFloorMins >= 60 ? `${Math.floor(onFloorMins / 60)}h ${onFloorMins % 60}m` : `${onFloorMins}m`}
            </span>
          )}
          <button
            onClick={lock}
            className="rounded-full border border-cream/15 px-3 py-1 font-body text-[11px] text-cream/55 hover:border-red-400 hover:text-red-300"
          >
            Lock
          </button>
          <button
            onClick={() => {
              lock();
              void requireOperator();
            }}
            className="rounded-full border border-cream/15 px-3 py-1 font-body text-[11px] text-cream/55 hover:border-gold-500 hover:text-gold-400"
          >
            Switch
          </button>
        </>
      ) : (
        <span className="font-body text-xs text-cream/35">
          locked — your PIN is asked at the first action, and every action is filed under your name
        </span>
      )}
    </div>
  );
}

/* ── hub tiles ── */

type FormDoc = { form: string; staffName?: string; id: string; acks?: { by: string; atMs: number }[]; createdAt?: Timestamp; payload?: Record<string, unknown> };

function Hub({
  setPanel,
  user,
  forms,
  activeOrders,
  seatedTables,
}: {
  setPanel: (p: Panel) => void;
  user: User | null;
  forms: FormDoc[];
  activeOrders: number;
  seatedTables: number;
}) {
  const admin = isAdmin(user?.email);
  const frm01By = forms.find((f) => f.form === "FRM-01")?.staffName;
  const breaches = forms.filter((f) => f.form === "FRM-08").length;
  const wasteRows = forms.filter((f) => f.form === "FRM-03").length;
  const handovers = forms.filter((f) => f.form === "FRM-07").length;

  // live state-of-the-day on every tile — staff see what needs them at a glance
  const tiles: { key: Panel | "shopsense"; title: string; sub: string; accent: string; emoji: string; badge?: string; urgent?: boolean }[] = [
    { key: "checkin", title: "Check In / Out", sub: "Tap your name, enter your PIN", accent: "#7FC8A9", emoji: "✅" },
    {
      key: "floor", title: "Live Floor", sub: "Tables + orders side by side — approve, bump, move, close", accent: "#E0A23C", emoji: "🔔",
      badge: admin ? (activeOrders > 0 ? `${activeOrders} active` : "all clear ☕") : undefined, urgent: activeOrders > 0,
    },
    {
      key: "inventory", title: "Inventory & Vendors", sub: "Stock counts, receive/use, low alerts, supplier book", accent: "#7FA8C9", emoji: "📦",
    },
    {
      key: "frm01", title: "Opening Checklist", sub: "FRM-01 · before doors at 07:30", accent: "#8FB573", emoji: "🌅",
      badge: frm01By ? `filed by ${frm01By} ✓` : "not filed yet", urgent: !frm01By,
    },
    {
      key: "frm03", title: "Waste & Comp Log", sub: "FRM-03 · log it the moment it happens", accent: "#C25B6E", emoji: "🗑️",
      badge: wasteRows ? `${wasteRows} today` : undefined,
    },
    {
      key: "frm08", title: "Breach Log", sub: "FRM-08 · 4-min / 9-min promise misses", accent: "#5B7DB1", emoji: "⏱️",
      badge: breaches ? `${breaches} today${breaches >= 3 ? " — review!" : ""}` : "0 today ✓", urgent: breaches >= 3,
    },
    {
      key: "frm07", title: "Shift Handover", sub: "FRM-07 · 14:30 & close", accent: "#D99A2B", emoji: "🔁",
      badge: handovers ? `${handovers} filed` : "none yet",
    },
    { key: "shopsense", title: "ShopSense Console", sub: "Footfall × sales — ShopSense", accent: "#B59556", emoji: "📡" },
  ];
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {tiles.map((t) =>
        t.key === "shopsense" ? (
          <a key={t.title} href="/admin/shopsense" className={tileBase} style={{ borderTop: `3px solid ${t.accent}` }}>
            <TileInner t={t} note={admin ? "opens console" : "needs the shop account sign-in"} />
          </a>
        ) : (
          <button key={t.title} onClick={() => setPanel(t.key as Panel)} className={tileBase} style={{ borderTop: `3px solid ${t.accent}` }}>
            <TileInner t={t} />
          </button>
        )
      )}
    </div>
  );
}

function TileInner({ t, note }: { t: { title: string; sub: string; accent: string; emoji: string; badge?: string; urgent?: boolean }; note?: string }) {
  return (
    <>
      <span className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full opacity-0 blur-2xl transition-opacity duration-500 group-hover:opacity-25" style={{ backgroundColor: t.accent }} />
      <span className="flex w-full items-start justify-between">
        <span className="text-3xl">{t.emoji}</span>
        {t.badge && (
          <span
            className={`rounded-full px-2.5 py-1 font-body text-[10px] font-bold uppercase tracking-brand ${t.urgent ? "animate-pulse" : ""}`}
            style={{ backgroundColor: t.accent + "26", color: t.accent }}
          >
            {t.badge}
          </span>
        )}
      </span>
      <span>
        <span className="block font-display text-xl font-bold text-cream">{t.title}</span>
        <span className="mt-1 block font-body text-xs text-cream/50">{t.sub}</span>
        {note && <span className="mt-1 block font-body text-[10px] uppercase tracking-brand" style={{ color: t.accent }}>{note}</span>}
      </span>
    </>
  );
}

/* ── check-in: name grid → PIN pad ── */

function CheckIn({
  staff,
  today,
  say,
  onCheckedIn,
}: {
  staff: StaffMember[];
  today: AttendanceRec[];
  say: (m: string) => void;
  onCheckedIn?: (person: { name: string; staffId: string }) => void;
}) {
  const [picked, setPicked] = useState<StaffMember | null>(null);
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);

  const openRec = picked ? today.find((a) => a.staffId === picked.id && a.inAt && !a.outAt) : undefined;

  async function submitPin() {
    if (!picked || !db) return;
    setBusy(true);
    try {
      const h = await pinHash(pin, picked.id);
      if (h !== picked.pinHash) {
        say("Wrong PIN — try again");
        setPin("");
        return;
      }
      if (openRec) {
        await updateDoc(doc(db, "attendance", openRec.id), { outAt: serverTimestamp() });
        // a check-out is a shift change — lock whoever was operating this
        // tablet so the next action re-asks for a PIN (no stale attribution)
        if (getOperator()) clearOperator();
        const mins = openRec.inAt ? Math.floor((Date.now() - openRec.inAt.toMillis()) / 60000) : 0;
        const dur = mins >= 60 ? `${Math.floor(mins / 60)}h ${mins % 60}m` : `${mins}m`;
        say(`Bye ${picked.name.split(" ")[0]} — ${dur} on floor today. 👋`);
      } else {
        await addDoc(collection(db, "attendance"), {
          staffId: picked.id,
          name: picked.name,
          role: picked.role,
          date: istDateKey(),
          inAt: serverTimestamp(),
          outAt: null,
        });
        // they just PIN-proved who they are — make them the active operator
        setOperator({ staffId: picked.id, name: picked.name, role: picked.role });
        say(`Welcome ${picked.name.split(" ")[0]} — checked IN ☕ (you're the operator)`);
        onCheckedIn?.({ name: picked.name, staffId: picked.id });
      }
      setPicked(null);
      setPin("");
    } finally {
      setBusy(false);
    }
  }

  if (!picked) {
    return (
      <div>
        <h2 className="font-display text-2xl font-bold">Who are you?</h2>
        {staff.length === 0 && (
          <p className="mt-4 font-body text-cream/50">
            No staff yet — the owner adds the team in <span className="text-gold-400">Admin → Manage → Staff</span>.
          </p>
        )}
        <div className="mt-5 grid gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {staff.map((m) => {
            const rec = today.find((a) => a.staffId === m.id && a.inAt && !a.outAt);
            const mins = rec?.inAt ? Math.floor((Date.now() - rec.inAt.toMillis()) / 60000) : null;
            return (
              <button
                key={m.id}
                onClick={() => setPicked(m)}
                className="rounded-lg border border-cream/10 bg-forest-850 p-5 text-left transition-all hover:-translate-y-0.5 hover:border-gold-500/50"
              >
                <p className="font-display text-lg font-bold text-cream">{m.name}</p>
                <p className="font-body text-xs text-cream/45">{m.role}</p>
                <p className={`mt-2 font-body text-[10px] font-bold uppercase tracking-brand ${rec ? "text-[#7fcb9b]" : "text-cream/35"}`}>
                  {rec
                    ? `● on floor ${mins !== null && mins >= 60 ? `${Math.floor(mins / 60)}h ${mins % 60}m` : `${mins}m`} — tap to check out`
                    : "○ tap to check in"}
                </p>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-sm text-center">
      <h2 className="font-display text-2xl font-bold">{picked.name}</h2>
      <p className="mt-1 font-body text-sm text-cream/50">
        {openRec ? "Enter PIN to check OUT" : "Enter PIN to check IN"}
      </p>
      <div className="mt-5 flex justify-center gap-3">
        {[0, 1, 2, 3].map((i) => (
          <span key={i} className={`h-4 w-4 rounded-full ${pin.length > i ? "bg-gold-400" : "border border-cream/30"}`} />
        ))}
      </div>
      <div className="mt-6 grid grid-cols-3 gap-3">
        {["1", "2", "3", "4", "5", "6", "7", "8", "9", "⌫", "0", "OK"].map((k) => (
          <button
            key={k}
            disabled={busy}
            onClick={() => {
              if (k === "⌫") setPin((p) => p.slice(0, -1));
              else if (k === "OK") {
                if (pin.length === 4) void submitPin();
              } else if (pin.length < 4) setPin((p) => p + k);
            }}
            className={`rounded-2xl py-5 font-display text-2xl font-bold transition-colors ${
              k === "OK"
                ? "bg-gold-500 text-forest-950 hover:bg-gold-700"
                : "border border-cream/15 bg-forest-850 text-cream hover:border-gold-500/50"
            }`}
          >
            {k}
          </button>
        ))}
      </div>
      <button onClick={() => { setPicked(null); setPin(""); }} className={`mt-5 ${btnGhost}`}>
        ← Not you?
      </button>
    </div>
  );
}

/* ── FRM-01 opening checklist ── */

function OpeningChecklist({ say }: { onFloor: AttendanceRec[]; say: (m: string) => void }) {
  const { operator, requireOperator } = useStaffGate();
  const dateKey = useIstDateKey();
  // Jolt-style honesty: each tick is timestamped the moment it happens
  const [ticks, setTicks] = useState<(number | null)[]>(Array(OPENING_ITEMS.length).fill(null));
  const [doneToday, setDoneToday] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!db) return;
    return onSnapshot(
      query(collection(db, "form_submissions"), where("date", "==", dateKey), where("form", "==", "FRM-01")),
      (s) => setDoneToday(s.empty ? null : ((s.docs[0].data() as { staffName?: string }).staffName ?? "someone"))
    );
  }, [dateKey]);

  const done = ticks.filter((t) => t !== null).length;
  const all = done === OPENING_ITEMS.length;

  async function submit() {
    if (!db) return;
    const op = await requireOperator();
    if (!op) return;
    setBusy(true);
    try {
      await addDoc(collection(db, "form_submissions"), {
        form: "FRM-01",
        date: istDateKey(),
        staffName: op.name,
        staffId: op.staffId,
        payload: { items: OPENING_ITEMS.map((t, i) => ({ t, ok: ticks[i] !== null, atMs: ticks[i] })) },
        createdAt: serverTimestamp(),
      });
      say(`Opening checklist filed ✓ — signed ${op.name}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-2xl font-bold">Opening Checklist <span className="text-cream/40">FRM-01</span></h2>
        {doneToday && <span className="rounded-full bg-[#3E7C5A]/25 px-4 py-1.5 font-body text-xs font-bold text-[#7fcb9b]">Filed today by {doneToday} ✓</span>}
      </div>
      {/* progress */}
      <div className="mt-4 flex items-center gap-3">
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-forest-850">
          <div
            className="h-full rounded-full bg-gradient-to-r from-[#3E7C5A] to-[#7fcb9b] transition-all duration-500"
            style={{ width: `${(done / OPENING_ITEMS.length) * 100}%` }}
          />
        </div>
        <span className="font-body text-xs font-bold tabular-nums text-cream/60">{done}/{OPENING_ITEMS.length}</span>
      </div>
      <div className="mt-4 space-y-2">
        {OPENING_ITEMS.map((item, i) => (
          <button
            key={i}
            onClick={() => setTicks((t) => t.map((v, j) => (j === i ? (v === null ? Date.now() : null) : v)))}
            className={`flex w-full items-center gap-4 rounded-lg border p-4 text-left transition-colors ${
              ticks[i] !== null ? "border-[#3E7C5A]/60 bg-[#3E7C5A]/15" : "border-cream/10 bg-forest-850"
            }`}
          >
            <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md border text-sm font-bold ${ticks[i] !== null ? "border-[#7fcb9b] bg-[#3E7C5A] text-cream" : "border-cream/25 text-transparent"}`}>✓</span>
            <span className="flex-1 font-body text-sm text-cream/85">{item}</span>
            {ticks[i] !== null && (
              <span className="shrink-0 font-body text-[10px] tabular-nums text-[#7fcb9b]">
                {new Date(ticks[i] as number).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
              </span>
            )}
          </button>
        ))}
      </div>
      <div className="mt-5 flex flex-wrap items-center gap-3">
        <span className="rounded-full border border-cream/15 px-4 py-2 font-body text-xs text-cream/55">
          {operator ? <>Signing as <span className="font-bold text-gold-400">{operator.name}</span></> : "🔒 PIN asked when you file"}
        </span>
        <button onClick={submit} disabled={!all || busy} className={btnGold}>
          {all ? "File checklist ✓" : `${done}/${OPENING_ITEMS.length} done`}
        </button>
      </div>
    </div>
  );
}

/* ── FRM-03 waste & comp ── */

function WasteLog({ say }: { onFloor: AttendanceRec[]; say: (m: string) => void }) {
  const { operator, requireOperator } = useStaffGate();
  const dateKey = useIstDateKey();
  const [item, setItem] = useState("");
  const [qty, setQty] = useState("1");
  const [kind, setKind] = useState<"waste" | "comp">("waste");
  const [reason, setReason] = useState("");
  const [value, setValue] = useState("");
  const [rows, setRows] = useState<{ id: string; payload: Record<string, unknown>; staffName?: string; createdAt?: Timestamp }[]>([]);

  useEffect(() => {
    if (!db) return;
    return onSnapshot(
      query(collection(db, "form_submissions"), where("date", "==", dateKey), where("form", "==", "FRM-03")),
      (s) => setRows(s.docs.map((d) => ({ id: d.id, ...(d.data() as { payload: Record<string, unknown>; staffName?: string; createdAt?: Timestamp }) })).sort((a, b) => (b.createdAt?.toMillis?.() ?? 0) - (a.createdAt?.toMillis?.() ?? 0)))
    );
  }, [dateKey]);

  const totals = rows.reduce(
    (acc, r) => {
      const v = Number(r.payload.value) || 0;
      if (r.payload.kind === "comp") { acc.comps += 1; acc.compVal += v; } else acc.wasteVal += v;
      return acc;
    },
    { comps: 0, compVal: 0, wasteVal: 0 }
  );

  async function add() {
    if (!db || !item.trim()) return;
    const op = await requireOperator();
    if (!op) return;
    await addDoc(collection(db, "form_submissions"), {
      form: "FRM-03",
      date: istDateKey(),
      staffName: op.name,
      staffId: op.staffId,
      payload: { item: item.trim(), qty: Number(qty) || 1, kind, reason: reason.trim(), value: Number(value) || 0 },
      createdAt: serverTimestamp(),
    });
    setItem(""); setQty("1"); setReason(""); setValue("");
    say(`${kind === "comp" ? "Comp" : "Waste"} logged — signed ${op.name}`);
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-2xl font-bold">Waste & Comp <span className="text-cream/40">FRM-03</span></h2>
        <div className="flex gap-2 font-body text-xs">
          <span className="rounded-full bg-cRose/20 px-3 py-1.5 font-bold text-[#e9a1ae]">Waste {inr(totals.wasteVal)}</span>
          <span className={`rounded-full px-3 py-1.5 font-bold ${totals.comps > 4 ? "bg-red-500/25 text-red-300" : "bg-gold-500/15 text-gold-400"}`}>
            Comps {totals.comps}/4 · {inr(totals.compVal)}
          </span>
        </div>
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <input className={field} placeholder="Item (e.g. Sakura Berry M)" value={item} onChange={(e) => setItem(e.target.value)} />
        <div className="flex gap-2">
          <div className="flex flex-1 items-center justify-between rounded-2xl border border-cream/15 bg-forest-900 px-2">
            <button
              onClick={() => setQty((q) => String(Math.max(1, (Number(q) || 1) - 1)))}
              className="h-11 w-11 rounded-full text-xl text-cream/60 hover:text-red-300"
              aria-label="Less"
            >
              −
            </button>
            <span className="font-body text-base font-bold tabular-nums text-cream">{qty}</span>
            <button
              onClick={() => setQty((q) => String((Number(q) || 1) + 1))}
              className="h-11 w-11 rounded-full text-xl text-cream/60 hover:text-gold-400"
              aria-label="More"
            >
              +
            </button>
          </div>
          <input className={field} type="number" placeholder="Value ₹" value={value} onChange={(e) => setValue(e.target.value)} />
        </div>
        <div className="flex gap-2">
          {(["waste", "comp"] as const).map((k) => (
            <button key={k} onClick={() => setKind(k)} className={`flex-1 rounded-2xl border py-4 font-body text-sm font-bold uppercase tracking-brand ${kind === k ? "border-gold-500 bg-gold-500/15 text-gold-400" : "border-cream/15 text-cream/50"}`}>
              {k === "waste" ? "🗑 Waste" : "🎁 Comp"}
            </button>
          ))}
        </div>
        <div>
          {/* reason presets — tap beats typing mid-rush */}
          <div className="flex flex-wrap gap-1.5">
            {(kind === "waste"
              ? ["Expired / stale", "Dropped / spill", "Wrong order — remade", "Over-prepped", "Machine fault"]
              : ["Guest recovery", "Staff meal", "Trial / QC", "Owner's guest"]
            ).map((r) => (
              <button
                key={r}
                onClick={() => setReason(r)}
                className={`rounded-full px-3 py-1.5 font-body text-[11px] ${reason === r ? "bg-gold-500/20 text-gold-400" : "border border-cream/15 text-cream/50 hover:border-gold-500/40"}`}
              >
                {r}
              </button>
            ))}
          </div>
          <input className={field + " mt-2"} placeholder={kind === "comp" ? "Comp for whom / approved by" : "Or type a reason…"} value={reason} onChange={(e) => setReason(e.target.value)} />
        </div>
        <span className="flex items-center justify-center rounded-2xl border border-cream/15 px-4 font-body text-xs text-cream/55">
          {operator ? <>Signing as&nbsp;<span className="font-bold text-gold-400">{operator.name}</span></> : "🔒 PIN asked when you log"}
        </span>
        <button onClick={add} className={btnGold}>Log it</button>
      </div>
      <div className="mt-6 space-y-2">
        {rows.map((r) => (
          <div key={r.id} className="flex items-center justify-between rounded-lg border border-cream/10 bg-forest-850 px-4 py-3 font-body text-sm">
            <span className="text-cream/85">
              {String(r.payload.qty)}× {String(r.payload.item)}
              <span className="ml-2 text-cream/40">{String(r.payload.kind)} · {String(r.payload.reason || "—")}</span>
              {r.staffName && <span className="ml-2 text-gold-400/70">— {r.staffName}</span>}
            </span>
            <span className="font-bold text-cream/70">{inr(Number(r.payload.value) || 0)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── FRM-08 breach log ── */

function BreachLog({
  say,
  prefill,
  clearPrefill,
}: {
  onFloor: AttendanceRec[];
  say: (m: string) => void;
  prefill?: { code: string; actual: string } | null;
  clearPrefill?: () => void;
}) {
  const { operator, requireOperator } = useStaffGate();
  const dateKey = useIstDateKey();
  const [code, setCode] = useState(prefill?.code ?? "");
  const [promise, setPromise] = useState<"4" | "9">("4");
  const [actual, setActual] = useState(prefill?.actual ?? "");
  const [cause, setCause] = useState("");
  const [rows, setRows] = useState<{ id: string; payload: Record<string, unknown> }[]>([]);

  // arriving from a late order on the board: code + minutes come pre-filled
  useEffect(() => {
    if (prefill) {
      setCode(prefill.code);
      setActual(prefill.actual);
      clearPrefill?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefill]);

  useEffect(() => {
    if (!db) return;
    return onSnapshot(
      query(collection(db, "form_submissions"), where("date", "==", dateKey), where("form", "==", "FRM-08")),
      (s) => setRows(s.docs.map((d) => ({ id: d.id, ...(d.data() as { payload: Record<string, unknown> }) })))
    );
  }, [dateKey]);

  async function add() {
    if (!db || !actual) return;
    const op = await requireOperator();
    if (!op) return;
    await addDoc(collection(db, "form_submissions"), {
      form: "FRM-08",
      date: istDateKey(),
      staffName: op.name,
      staffId: op.staffId,
      payload: { code: code.trim(), promise: Number(promise), actual: Number(actual), cause: cause.trim() },
      createdAt: serverTimestamp(),
    });
    setCode(""); setActual(""); setCause("");
    say(`Breach logged (signed ${op.name}) — 3 in a shift = manager review`);
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-2xl font-bold">Ticket Breaches <span className="text-cream/40">FRM-08</span></h2>
        <span className={`rounded-full px-4 py-1.5 font-body text-xs font-bold ${rows.length >= 3 ? "bg-red-500/25 text-red-300" : "bg-cBlue/20 text-[#9db4dd]"}`}>
          {rows.length} today {rows.length >= 3 ? "— review due!" : ""}
        </span>
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <input className={field} placeholder="Order code (ORB-…)" value={code} onChange={(e) => setCode(e.target.value)} />
        <div className="flex gap-2">
          {(["4", "9"] as const).map((p) => (
            <button key={p} onClick={() => setPromise(p)} className={`flex-1 rounded-2xl border py-4 font-body text-sm font-bold ${promise === p ? "border-gold-500 bg-gold-500/15 text-gold-400" : "border-cream/15 text-cream/50"}`}>
              {p}-min promise
            </button>
          ))}
        </div>
        <input className={field} type="number" placeholder="Actual minutes" value={actual} onChange={(e) => setActual(e.target.value)} />
        <div>
          <div className="flex flex-wrap gap-1.5">
            {["Rush / queue", "Machine", "Staffing", "Supplier delay", "Complex order"].map((c) => (
              <button
                key={c}
                onClick={() => setCause(c)}
                className={`rounded-full px-3 py-1.5 font-body text-[11px] ${cause === c ? "bg-gold-500/20 text-gold-400" : "border border-cream/15 text-cream/50 hover:border-gold-500/40"}`}
              >
                {c}
              </button>
            ))}
          </div>
          <input className={field + " mt-2"} placeholder="Or type the cause…" value={cause} onChange={(e) => setCause(e.target.value)} />
        </div>
        <span className="flex items-center justify-center rounded-2xl border border-cream/15 px-4 py-3 font-body text-xs text-cream/55">
          {operator ? <>Signing as&nbsp;<span className="font-bold text-gold-400">{operator.name}</span></> : "🔒 PIN asked when you log"}
        </span>
        <button onClick={add} className={btnGold}>Log breach</button>
      </div>
      <p className="mt-4 font-body text-xs text-cream/40">
        Recurring peak-hour breaches ring the 2-group upgrade bell — that's how the machine gets bigger.
      </p>
    </div>
  );
}

/* ── FRM-07 handover ── */

function Handover({ say }: { onFloor: AttendanceRec[]; say: (m: string) => void }) {
  const { operator, requireOperator } = useStaffGate();
  const dateKey = useIstDateKey();
  const FIELDS = ["86'd / low stock", "Equipment issues", "Pending orders / pickups", "Incidents / complaints", "Float handed over ₹", "Notes for next shift"] as const;
  const [vals, setVals] = useState<string[]>(Array(FIELDS.length).fill(""));
  const [latest, setLatest] = useState<{ id: string; createdAt?: Timestamp; payload?: Record<string, unknown>; staffName?: string; acks?: { by: string; atMs: number }[] } | null>(null);

  useEffect(() => {
    if (!db) return;
    return onSnapshot(
      query(collection(db, "form_submissions"), where("date", "==", dateKey), where("form", "==", "FRM-07")),
      (s) => {
        const docs = s.docs.map((d) => ({ id: d.id, ...(d.data() as { createdAt?: Timestamp; payload?: Record<string, unknown>; staffName?: string; acks?: { by: string; atMs: number }[] }) }));
        docs.sort((a, b) => (b.createdAt?.toMillis?.() ?? 0) - (a.createdAt?.toMillis?.() ?? 0));
        setLatest(docs[0] ?? null);
      }
    );
  }, [dateKey]);

  // incoming shift confirms they actually read it (7shifts/Jolt pattern)
  async function ackLatest() {
    if (!db || !latest) return;
    const op = await requireOperator();
    if (!op) return;
    try {
      await updateDoc(doc(db, "form_submissions", latest.id), {
        acks: arrayUnion({ by: op.name, atMs: Date.now() }),
      });
      say(`Handover marked read by ${op.name} ✓`);
    } catch {
      say("Couldn't mark as read.");
    }
  }

  async function submit() {
    if (!db) return;
    const op = await requireOperator();
    if (!op) return;
    await addDoc(collection(db, "form_submissions"), {
      form: "FRM-07",
      date: istDateKey(),
      staffName: op.name,
      staffId: op.staffId,
      payload: Object.fromEntries(FIELDS.map((f, i) => [f, vals[i]])),
      createdAt: serverTimestamp(),
    });
    setVals(Array(FIELDS.length).fill(""));
    say(`Handover filed by ${op.name} — incoming shift, read it!`);
  }

  return (
    <div className="mx-auto grid max-w-5xl gap-8 lg:grid-cols-2">
      <div>
        <h2 className="font-display text-2xl font-bold">Shift Handover <span className="text-cream/40">FRM-07</span></h2>
        <div className="mt-5 space-y-3">
          {FIELDS.map((f, i) => (
            <div key={f}>
              <label className="font-body text-[11px] font-bold uppercase tracking-brand text-cream/45">{f}</label>
              <input className={field + " mt-1"} value={vals[i]} onChange={(e) => setVals((v) => v.map((x, j) => (j === i ? e.target.value : x)))} />
            </div>
          ))}
          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-full border border-cream/15 px-4 py-2 font-body text-xs text-cream/55">
              {operator ? <>Signing as <span className="font-bold text-gold-400">{operator.name}</span></> : "🔒 PIN asked when you file"}
            </span>
            <button onClick={submit} className={btnGold}>File handover</button>
          </div>
        </div>
      </div>
      <div>
        <h3 className="font-display text-lg font-bold text-cream/70">Latest handover today</h3>
        {!latest ? (
          <p className="mt-3 font-body text-sm text-cream/40">None yet.</p>
        ) : (
          <div className="mt-3 space-y-2 rounded-lg border border-cream/10 bg-forest-850 p-5">
            {Object.entries((latest.payload as Record<string, string>) ?? {}).map(([k, v]) => (
              <p key={k} className="font-body text-sm">
                <span className="text-cream/45">{k}:</span> <span className="text-cream/90">{v || "—"}</span>
              </p>
            ))}
            <p className="pt-1 font-body text-xs text-gold-400">— {String(latest.staffName ?? "")}</p>
            <div className="border-t border-cream/10 pt-2">
              {(latest.acks ?? []).map((a, i) => (
                <p key={i} className="font-body text-[11px] text-[#7fcb9b]">
                  ✓ read by {a.by},{" "}
                  {new Date(a.atMs).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                </p>
              ))}
              {!(latest.acks ?? []).some((a) => a.by === operator?.name) && (
                <button onClick={ackLatest} className={btnGhost + " mt-2"}>
                  I&apos;ve read this ✓
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── captain orders board (needs shop-account sign-in) ── */

type Line = { name: string; size: SizeKey | null; temp?: string | null; unitPrice: number; qty: number };
type Ord = {
  id: string;
  type: "dinein" | "pickup" | "delivery";
  lines: Line[];
  subtotal?: number;
  discount?: number;
  total: number;
  name: string;
  table?: string | null;
  pickupIn?: string | null;
  status: "pending" | "new" | "preparing" | "ready" | "done" | "cancelled";
  payment?: { method: "counter" | "upi"; state: string };
  notes?: AuditEntry[];
  audit?: AuditEntry[];
  createdAt?: Timestamp;
};
const NEXT: Record<string, Ord["status"]> = { new: "preparing", preparing: "ready", ready: "done" };

/** Age → urgency, keyed to the shop's promises (4-min beverage / 9-min food). */
function ageBadge(mins: number): { label: string; color: string } | null {
  if (mins < 4) return { label: `${mins}m`, color: "#7fcb9b" };
  if (mins < 9) return { label: `${mins}m`, color: "#E0852F" };
  return { label: `${mins}m LATE`, color: "#D24B5A" };
}

function OrdersBoard({ user, onBreach }: { user: User | null; onBreach: (code: string, actual: string) => void }) {
  const { requireOperator } = useStaffGate();
  const [orders, setOrders] = useState<Ord[]>([]);
  const [err, setErr] = useState("");
  const [filter, setFilter] = useState<"all" | "pending" | "new" | "preparing" | "ready">("all");
  const [chime, setChime] = useState(true);
  const [now, setNow] = useState(Date.now());
  const seenIds = useRef<Set<string> | null>(null);
  const admin = isAdmin(user?.email);

  useEffect(() => setChime(chimeEnabled()), []);
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);

  // waiter approval: pending → kitchen ('new') or reject → cancelled
  async function decide(o: Ord, approve: boolean) {
    if (!db) return;
    const op = await requireOperator();
    if (!op) return;
    try {
      await updateDoc(doc(db, "orders", o.id), {
        status: approve ? "new" : "cancelled",
        audit: arrayUnion({
          text: approve ? "APPROVED → sent to kitchen" : "REJECTED by waiter",
          by: op.name,
          atMs: Date.now(),
        }),
      });
    } catch {
      setErr("Couldn't update — is this tablet on the shop account?");
    }
  }

  // status advance is signed: PIN gate first, audit stamp with the name
  async function advance(o: Ord) {
    if (!db || !NEXT[o.status]) return;
    const op = await requireOperator();
    if (!op) return;
    try {
      await updateDoc(doc(db, "orders", o.id), {
        status: NEXT[o.status],
        audit: arrayUnion({ text: `status → ${NEXT[o.status]}`, by: op.name, atMs: Date.now() }),
      });
    } catch {
      setErr("Status update failed — is this tablet on the shop account?");
    }
  }

  useEffect(() => {
    if (!db || !admin) return;
    const q = query(collection(db, "orders"), orderBy("createdAt", "desc"));
    return onSnapshot(
      q,
      (s) => {
        const docs = s.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Ord, "id">) }));
        // ding on genuinely new orders (not the initial backlog)
        const activeIds = docs.filter((o) => o.status === "new" || o.status === "pending").map((o) => o.id);
        if (seenIds.current && chimeEnabled() && activeIds.some((id) => !seenIds.current!.has(id))) playChime();
        seenIds.current = new Set(docs.map((o) => o.id));
        setOrders(docs);
      },
      () => setErr("Couldn't load orders.")
    );
  }, [admin]);

  if (!admin) {
    return (
      <div className="mx-auto max-w-md rounded-lg border border-gold-500/30 bg-forest-900 p-8 text-center">
        <p className="font-display text-xl font-bold">Shop account needed</p>
        <p className="mt-2 font-body text-sm text-cream/60">
          The live board reads real orders — sign this tablet in once with the shop's Google account.
        </p>
        <a href="/login" className={btnGold + " mt-5 inline-block"}>Sign in →</a>
      </div>
    );
  }

  // oldest first — the order you should be making is always top-left (KDS rule)
  const active = orders
    .filter((o) => ["pending", "new", "preparing", "ready"].includes(o.status))
    .filter((o) => filter === "all" || o.status === filter)
    .sort((a, b) => (a.createdAt?.toMillis?.() ?? 0) - (b.createdAt?.toMillis?.() ?? 0));
  const counts = {
    pending: orders.filter((o) => o.status === "pending").length,
    new: orders.filter((o) => o.status === "new").length,
    preparing: orders.filter((o) => o.status === "preparing").length,
    ready: orders.filter((o) => o.status === "ready").length,
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-2xl font-bold">
          Live Orders <span className="text-cream/40">{counts.pending + counts.new + counts.preparing + counts.ready} active</span>
        </h2>
        <div className="flex flex-wrap items-center gap-2">
          {(["all", "pending", "new", "preparing", "ready"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              aria-pressed={filter === f}
              className={`min-h-[40px] rounded-full px-4 py-2 font-body text-[11px] font-bold uppercase tracking-brand ${
                filter === f ? "bg-gold-500/20 text-gold-400" : "border border-cream/15 text-cream/50 hover:border-gold-500/40"
              }`}
            >
              {f === "all" ? "All" : `${f} ${counts[f] || 0}`}
            </button>
          ))}
          <button
            onClick={() => {
              const next = !chime;
              setChime(next);
              setChimeEnabled(next);
              if (next) playChime();
            }}
            aria-pressed={chime}
            title="New-order chime"
            className={`min-h-[40px] rounded-full px-4 py-2 font-body text-sm ${chime ? "bg-gold-500/20" : "border border-cream/15 opacity-60"}`}
          >
            {chime ? "🔔" : "🔕"}
          </button>
        </div>
      </div>
      {err && <p className="mt-3 font-body text-sm text-red-300">{err}</p>}
      <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {active.length === 0 && <p className="font-body text-cream/45">All clear ☕</p>}
        {active.map((o) => {
          const mins = o.createdAt?.toMillis ? Math.floor((now - o.createdAt.toMillis()) / 60000) : 0;
          const age = ageBadge(mins);
          const late = mins >= 9;
          return (
            <div
              key={o.id}
              className={`rounded-lg border bg-forest-850 p-5 ${late ? "border-red-400/40" : "border-cream/10"} ${o.status === "new" && mins < 1 ? "animate-pulse" : ""}`}
              style={{ borderTop: `3px solid ${o.status === "pending" ? "#C9A86A" : o.status === "new" ? "#D24B5A" : o.status === "preparing" ? "#E0852F" : "#3E7C5A"}` }}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-display text-lg font-bold text-gold-400">{orderCode(o.id)}</span>
                <span className="flex items-center gap-2">
                  {age && (
                    <span
                      className="rounded-full px-2 py-0.5 font-body text-[10px] font-bold tabular-nums"
                      style={{ backgroundColor: age.color + "26", color: age.color }}
                    >
                      ⏱ {age.label}
                    </span>
                  )}
                  <span className="font-body text-[10px] font-bold uppercase tracking-brand text-cream/50">
                    {o.type === "dinein" ? `Table ${o.table}` : o.type === "pickup" ? `Pickup ${o.pickupIn}` : "Delivery"}
                  </span>
                </span>
              </div>
              <ul className="mt-2 space-y-1 font-body text-sm text-cream/85">
                {o.lines?.map((l, i) => (
                  <li key={i}>{l.qty}× {l.name}{l.size ? ` · ${SIZE_LABEL[l.size]}` : ""}{l.temp ? ` · ${l.temp}` : ""}</li>
                ))}
              </ul>
              <div className="mt-3 flex items-center justify-between">
                <span className="font-body text-xs text-cream/45">
                  {o.name} · {inr(o.total)}
                  {o.payment?.method === "upi" && (
                    <span className={`ml-2 font-bold uppercase ${o.payment.state === "paid" ? "text-[#7fcb9b]" : "text-amber-300"}`}>
                      {o.payment.state === "paid" ? "UPI ✓" : "UPI?"}
                    </span>
                  )}
                </span>
                {o.status === "pending" && db ? (
                  <span className="flex gap-1.5">
                    <button
                      onClick={() => void decide(o, true)}
                      className="rounded-full bg-[#3E7C5A] px-4 py-2 font-body text-[11px] font-bold uppercase tracking-brand text-cream hover:bg-[#4e9c72]"
                    >
                      ✓ Approve → kitchen
                    </button>
                    <button
                      onClick={() => void decide(o, false)}
                      className="rounded-full border border-red-400/50 px-3 py-2 font-body text-[11px] font-bold uppercase tracking-brand text-red-300 hover:bg-red-500/10"
                    >
                      ✗
                    </button>
                  </span>
                ) : NEXT[o.status] && db ? (
                  <button
                    onClick={() => void advance(o)}
                    className="rounded-full bg-gold-500 px-4 py-2 font-body text-[11px] font-bold uppercase tracking-brand text-forest-950 hover:bg-gold-700"
                  >
                    → {NEXT[o.status]}
                  </button>
                ) : null}
              </div>
              {late && (
                <button
                  onClick={() => onBreach(orderCode(o.id), String(mins))}
                  className="mt-2 rounded-full border border-red-400/40 px-3 py-1.5 font-body text-[10px] font-bold uppercase tracking-brand text-red-300 hover:bg-red-500/10"
                >
                  ⏱ Log breach — pre-filled →
                </button>
              )}
              <OrderEditor
                order={o as EditableOrder}
                identify={async () => (await requireOperator())?.name ?? null}
                onError={setErr}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
