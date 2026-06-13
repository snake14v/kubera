<div align="center">

# ☕ Kubera

### The open-source point of sale for cafés, restaurants & retail.

Order-ahead storefront · cashier POS · kitchen & customer displays · floor &
table management · inventory, vendors & dues · loyalty · collectible stickers ·
owner analytics — **all in one install, all open source.**

[![License: AGPL v3](https://img.shields.io/badge/License-AGPL_v3-B59556.svg)](LICENSE)
![Next.js](https://img.shields.io/badge/Next.js-14-000.svg)
![Firebase](https://img.shields.io/badge/Firebase-Firestore-FFA000.svg)
![PRs welcome](https://img.shields.io/badge/PRs-welcome-3E7C5A.svg)

**Open-sourced by [Oorulogix](https://oorulogix.com).**

</div>

---

## Why Kubera

Modern restaurant software is either **free but closed and limited** (Loyverse)
or **paid SaaS that rents you your own data** (Petpooja, Devour, and friends).
Kubera is the third option: a **complete, self-hostable, genuinely open-source**
restaurant operating system. Run the whole stack yourself, own every byte of
your sales data, and pay **₹0 in software fees and ₹0 in payment MDR**.

|                              | Loyverse | Petpooja / Devour | **Kubera** |
| ---------------------------- | :------: | :---------------: | :--------: |
| Free to run                  |    ✅    |        ❌         |     ✅     |
| Open source (AGPL-3.0)       |    ❌    |        ❌         |     ✅     |
| Self-host / own your data    |    ❌    |        ❌         |     ✅     |
| Online ordering storefront   |  add-on  |        ✅         |     ✅     |
| Kitchen + customer displays  |  add-on  |       add-on      |     ✅     |
| Zero-MDR UPI collection      |    ❌    |        ❌         |     ✅     |
| Loyalty + collectibles       | partial  |      partial      |     ✅     |
| No per-terminal license      |    ❌    |        ❌         |     ✅     |

> **How the project sustains itself:** the software is free forever. Oorulogix
> funds development through **[ShopSense](#-shopsense-hardware)** — plug-and-play
> counter hardware (sensors, printers, displays) that lights up automatically
> when you run Kubera — plus optional managed hosting & support. Sell shovels,
> not rent.

---

## ✨ What's inside

A single Next.js app that serves every surface a venue needs:

- **Customer storefront** — menu, cart, dine-in (table QR + PIN), pickup &
  delivery (map + radius), coupons, animated drink/plate composition, allergen
  & taste notes, sugar-free / brew-strength options.
- **Cashier POS** (`/cashier`) — category grid, per-line size/temp/add-ons,
  table buttons, running bill, PIN-signed charge, BT thermal receipts.
- **Customer Display** (`/cds`) — live animated bill mirror + full-screen UPI QR.
- **Kitchen Display** (`/kds`) — ticket aging bars, overdue alarm, call-customer,
  KOT printing.
- **Floor & tables** (`/staff`) — 10-table live view, per-sitting PINs, move /
  transfer / merge bills, waiter approval gate for mobile orders.
- **Inventory & supply chain** — categories, search, cost/unit & stock value,
  stocktake, CSV import/export, vendor accounts with **dues tracking**, wastage.
- **Loyalty** — 5 quarterly tiers (White → Gold), member QR, beans-per-spend.
- **Sticker Studio** — gang-print colour cup & collectible stickers; digital
  collectibles land in the customer's account.
- **Owner analytics** (`/admin/insights`) — live KPIs, hourly/7-day trends, and
  an **Exceptions & losses** timeline (refunds · cancels · comps · wastage).
- **Multi-tablet** presence/sync, installable PWA, ESC/POS Bluetooth printing.

Everything is PIN-signed and audit-logged. Security is enforced by Firestore
rules; the public Firebase web config is public by design.

---

## 🚀 Quickstart

```bash
git clone https://github.com/oorulogix/kubera.git && cd kubera
npm install
cp .env.local.example .env.local   # fill in (or leave blank to demo without a backend)
npm run dev                         # http://localhost:3000
```

The app **builds and runs with zero config** — without Firebase it renders the
full storefront in "no backend" mode. To enable accounts, orders, and the
counter suite, wire up Firebase (10 minutes — see **[FIREBASE-SETUP.md](FIREBASE-SETUP.md)**).

### Make it yours (no code edits)

All branding is config-driven. Set these in `.env.local`:

```bash
NEXT_PUBLIC_BUSINESS_NAME="Your Café"
NEXT_PUBLIC_BUSINESS_TAGLINE="Your tagline"
NEXT_PUBLIC_BUSINESS_ADDR1="123 Main St"
NEXT_PUBLIC_BUSINESS_ADDR2="Your City 000000"
NEXT_PUBLIC_CURRENCY="₹"
# …see .env.local.example for the full list
```

Want to fork the *project* name/colours too? It all flows from
[`lib/brand.ts`](lib/brand.ts) and [`tailwind.config.ts`](tailwind.config.ts).

---

## 🧰 Tech stack

Next.js 14 (App Router, TypeScript) · Tailwind CSS · Firebase Auth + Firestore ·
Web Bluetooth (ESC/POS) · NPCI UPI intent links · deployable to Vercel or any
Node host. Optional integrations: Resend (email), Loyverse (loyalty).

---

## 📡 ShopSense hardware

ShopSense is Oorulogix's commercial hardware line that pairs with Kubera:
footfall sensors, label/receipt printers, and counter displays that stream into
the owner analytics out of the box. **The software never requires it** — but if
you want turnkey hardware (and to support the project), that's where it comes
from. See [SHOPSENSE-SETUP.md](SHOPSENSE-SETUP.md).

---

## 🤝 Contributing

PRs, issues, and translations welcome — see **[CONTRIBUTING.md](CONTRIBUTING.md)**
and our **[Code of Conduct](CODE_OF_CONDUCT.md)**. Found a security issue? Please
read **[SECURITY.md](SECURITY.md)** first.

## 📄 License

[GNU AGPL-3.0](LICENSE). You may use, modify and self-host Kubera freely. If you
run a **modified** version as a network service, you must offer your users the
source of your modifications. This keeps the commons open — including against
closed-source competitors.

<div align="center"><sub>Built for shopkeepers. Open-sourced by <a href="https://oorulogix.com">Oorulogix</a>.</sub></div>
