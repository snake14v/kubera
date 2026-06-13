import type { MetadataRoute } from "next";
import { BRAND } from "@/lib/brand";

const BASE = BRAND.business.url;

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const pages: { path: string; priority: number; freq: MetadataRoute.Sitemap[number]["changeFrequency"] }[] = [
    { path: "/", priority: 1.0, freq: "weekly" },
    { path: "/order", priority: 0.9, freq: "daily" },
    { path: "/menu", priority: 0.9, freq: "weekly" },
    { path: "/rewards", priority: 0.7, freq: "monthly" },
    { path: "/about", priority: 0.6, freq: "monthly" },
    { path: "/franchise", priority: 0.6, freq: "monthly" },
    { path: "/careers", priority: 0.5, freq: "monthly" },
    { path: "/contact", priority: 0.6, freq: "monthly" },
    { path: "/login", priority: 0.3, freq: "yearly" },
  ];
  return pages.map((p) => ({
    url: BASE + p.path,
    lastModified: now,
    changeFrequency: p.freq,
    priority: p.priority,
  }));
}
