"use client";

// Owner inventory console — same panel as the staff tile, admin-framed.

import { useEffect, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import AdminGuard from "@/components/AdminGuard";
import AdminNav from "@/components/AdminNav";
import StaffGate from "@/components/StaffGate";
import InventoryPanel from "@/components/InventoryPanel";
import { type StaffMember } from "@/lib/staff";

export default function InventoryAdmin() {
  return <AdminGuard title="Inventory">{() => <Gated />}</AdminGuard>;
}

function Gated() {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  useEffect(() => {
    if (!db) return;
    return onSnapshot(collection(db, "staff_members"), (s) =>
      setStaff(s.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<StaffMember, "id">) })).filter((m) => m.active !== false))
    );
  }, []);
  return (
    <StaffGate staff={staff}>
      <div>
        <AdminNav active="inventory" />
        <InventoryPanel />
      </div>
    </StaffGate>
  );
}
