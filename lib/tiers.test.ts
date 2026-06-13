import { describe, it, expect } from "vitest";
import { tierFor, quarterStats } from "./tiers";

describe("tierFor", () => {
  it("starts everyone at White", () => {
    expect(tierFor(0, 0).name).toBe("White");
  });
  it("promotes on visits OR spend (whichever is higher)", () => {
    expect(tierFor(9, 0).name).toBe("Silver");
    expect(tierFor(0, 3000).name).toBe("Silver");
    expect(tierFor(0, 27000).name).toBe("Gold");
    expect(tierFor(45, 0).name).toBe("Gold");
  });
});

describe("quarterStats", () => {
  it("excludes cancelled orders and counts beans as spend/10", () => {
    const now = Date.now();
    const r = quarterStats([
      { total: 500, status: "done", createdAtMs: now },
      { total: 300, status: "cancelled", createdAtMs: now },
      { total: 200, status: "new", createdAtMs: now },
    ]);
    expect(r.visits).toBe(2);
    expect(r.spend).toBe(700);
    expect(r.beans).toBe(70);
  });
});
