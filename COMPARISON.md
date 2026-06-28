# Kubera vs the incumbents

Honest, sourced comparison for restaurant & retail owners deciding what to run.
Kubera is open-source (AGPL-3.0) and self-hostable; the incumbents are closed SaaS.

> Pricing and complaint figures below are from public reviews/listings (June 2026)
> — see **Sources**. Petpooja doesn't publish prices, so ranges are user-reported.

## The headline

| | **Kubera** | Petpooja | Aggregators (Swiggy/Zomato) |
|---|---|---|---|
| Software cost | **₹0** (AGPL, self-host) · optional managed Cloud | ₹10k–40k/outlet/yr + ₹16k–28k add-ons | — |
| Effective cost | hosting + optional hardware/support | **₹15k–30k+/yr/outlet**, renewals ₹7,500/yr | **25–35%** of order value |
| Pricing transparency | **published, flat** | **none — sales quote only** | commission + ads |
| Contract / lock-in | **none — leave anytime, export all data** | annual contract, hard to cancel mid-term | platform owns the customer |
| Own your data | **yes — your Firebase, self-host** | vendor cloud | aggregator masks customer data |
| Onboarding | **install + first-run wizard, minutes** | **3–7 days**, technician visit, multi-day training |  — |
| Fit for small venues | **built for the 20-seat shop** | "overkill for a small restaurant" (user reviews) | — |
| Tech / UI | **modern Next.js + React, runtime themeable** | "dated UI… no AI… glitchy at peak" (reviews) | — |
| Payments | **UPI 0% MDR**, your PSP at cost | processor-agnostic | ~2% + commission |

## What Kubera includes, free

Storefront ordering (dine-in / pickup / delivery) · cashier POS · kitchen display
(KDS) · customer display (CDS) · floor & table management · inventory + vendors &
dues · loyalty + collectibles · owner analytics · ESC/POS Bluetooth printing ·
installable PWA + Android APK · **runtime self-configuration** (each shop connects
its own free Firebase in a first-run wizard — no rebuild, no technician).

## Where Petpooja is genuinely strong (be honest)

- **Aggregator integration** — Swiggy/Zomato order ingestion + menu sync is built
  in. Kubera does **not** have this yet (on the roadmap).
- **Turnkey + human support** — they show up, install hardware, and train staff.
  Kubera is self-serve (community support); managed onboarding is a paid option.
- **Maturity** — 100k+ outlets, years of edge cases handled.

If you need same-day aggregator sync and a person who installs everything for you,
that has real value. Kubera's bet is that **most small venues would rather pay ₹0
in software rent, own their data, and set it up themselves in an afternoon.**

## Why we built it

Modern restaurant software is either **free-but-closed-and-limited** or **SaaS that
rents you your own data** on an opaque, sales-only price with annual lock-in. The
open-source POS world, meanwhile, is dated and retail-generic — the most popular
project is web-retail PHP from the CodeIgniter era, and every restaurant-specific
open project is small or abandoned. Kubera is the third option: a **complete,
modern, restaurant-first, genuinely open-source** operating system you run yourself.

## Sources

- [Petpooja pricing — G2](https://www.g2.com/products/petpooja/pricing)
- [Petpooja official pricing](https://www.petpooja.com/poss/pricing)
- [Petpooja review 2026 — DineOpen](https://www.dineopen.com/blog/petpooja-review-2026)
- [Petpooja reviews — SoftwareSuggest](https://www.softwaresuggest.com/petpooja/reviews)
- [Petpooja reviews — Capterra](https://www.capterra.com/p/172163/Petpooja-Restaurant-Management-Platform/reviews/)
- [Best restaurant POS 2025 — Chuk](https://chuk.in/best-pos-system-for-restaurants-in-2025-petpooja-dotpe-or-posist/)
- OSS landscape (GitHub, by stars): [opensourcepos](https://github.com/opensourcepos/opensourcepos) (4.3k, retail/PHP) · [POS-Awesome](https://github.com/ucraft-com/POS-Awesome) (ERPNext add-on) · [SambaPOS-3](https://github.com/samba-pos/samba-pos-3) (537, .NET, inactive)
