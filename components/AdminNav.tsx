// One nav to rule every admin page — identical links, identical order,
// current page highlighted. Staff Portal opens the tablet hub.

export type AdminSection = "waitlist" | "orders" | "insights" | "inventory" | "manage" | "qr" | "shopsense";

const LINKS: { id: AdminSection | "staff"; label: string; href: string }[] = [
  { id: "waitlist", label: "Waitlist", href: "/admin" },
  { id: "orders", label: "Orders", href: "/admin/orders" },
  { id: "insights", label: "Insights", href: "/admin/insights" },
  { id: "inventory", label: "Inventory", href: "/admin/inventory" },
  { id: "manage", label: "Manage", href: "/admin/manage" },
  { id: "qr", label: "Table QRs", href: "/admin/qr" },
  { id: "shopsense", label: "ShopSense", href: "/admin/shopsense" },
  { id: "staff", label: "Staff Portal ↗", href: "/staff" },
];

export default function AdminNav({ active }: { active: AdminSection }) {
  return (
    <nav className="mb-6 flex flex-wrap gap-2 print:hidden">
      {LINKS.map((l) =>
        l.id === active ? (
          <span
            key={l.id}
            className="rounded-full bg-gold-500/15 px-4 py-1.5 font-body text-[11px] font-bold uppercase tracking-brand text-gold-400"
          >
            {l.label}
          </span>
        ) : (
          <a
            key={l.id}
            href={l.href}
            className="rounded-full border border-cream/15 px-4 py-1.5 font-body text-[11px] font-bold uppercase tracking-brand text-cream/60 transition-colors hover:border-gold-500 hover:text-gold-400"
          >
            {l.label}
          </a>
        )
      )}
    </nav>
  );
}
