import type { MetadataRoute } from "next";
import { BRAND } from "@/lib/brand";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin", "/admin/", "/staff", "/account", "/api/", "/kds", "/cds", "/cashier", "/waiter", "/tabs", "/stickers"],
      },
    ],
    sitemap: `${BRAND.business.url}/sitemap.xml`,
  };
}
