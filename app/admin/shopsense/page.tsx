"use client";

import AdminGuard from "@/components/AdminGuard";
import AdminNav from "@/components/AdminNav";
import ShopSenseDashboard from "@/components/ShopSenseDashboard";

export default function ShopSensePage() {
  return (
    <AdminGuard title="ShopSense">
      {(user) => (
        <div>
          <AdminNav active="shopsense" />
          <ShopSenseDashboard user={user} />
        </div>
      )}
    </AdminGuard>
  );
}
