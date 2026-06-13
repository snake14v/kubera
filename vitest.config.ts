import { defineConfig } from "vitest/config";
import { resolve } from "node:path";

// Unit tests for the pure domain logic (pricing, coupons, tiers, formatting).
// Run with `npm test`. No DOM env needed — these are plain functions.
export default defineConfig({
  test: {
    environment: "node",
    include: ["lib/**/*.test.ts", "test/**/*.test.ts"],
  },
  resolve: {
    alias: { "@": resolve(__dirname, ".") },
  },
});
