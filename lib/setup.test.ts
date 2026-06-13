import { describe, it, expect } from "vitest";
import {
  buildEnvBlock,
  orderPrefixFrom,
  isAdminExpr,
  adminRulesSnippet,
  buildChecklist,
  type CheckState,
} from "./setup";

describe("buildEnvBlock", () => {
  it("emits grouped KEY=value lines and skips empty values", () => {
    const out = buildEnvBlock({
      NEXT_PUBLIC_BUSINESS_NAME: "Acme Brew",
      NEXT_PUBLIC_CURRENCY: "$",
      NEXT_PUBLIC_BUSINESS_PHONE: "", // empty → skipped
    });
    expect(out).toContain("# Business");
    expect(out).toContain("NEXT_PUBLIC_BUSINESS_NAME=Acme Brew");
    expect(out).toContain("# Money & locale");
    expect(out).toContain("NEXT_PUBLIC_CURRENCY=$");
    expect(out).not.toContain("NEXT_PUBLIC_BUSINESS_PHONE");
  });
  it("trims values and returns empty-ish when nothing is set", () => {
    expect(buildEnvBlock({ NEXT_PUBLIC_BUSINESS_NAME: "  Trimmed  " })).toContain("NEXT_PUBLIC_BUSINESS_NAME=Trimmed");
    expect(buildEnvBlock({}).trim()).toBe("");
  });
});

describe("orderPrefixFrom", () => {
  it("uppercases the first alphanumerics, max 4", () => {
    expect(orderPrefixFrom("Acme Café")).toBe("ACME");
    expect(orderPrefixFrom("12 Beans")).toBe("12BE");
  });
  it("falls back to ORD", () => {
    expect(orderPrefixFrom("")).toBe("ORD");
    expect(orderPrefixFrom("☕")).toBe("ORD");
  });
});

describe("isAdminExpr / adminRulesSnippet", () => {
  it("uses == for a single email", () => {
    expect(isAdminExpr("owner@acme.com")).toBe("request.auth.token.email == 'owner@acme.com'");
  });
  it("uses in [...] for multiple emails", () => {
    expect(isAdminExpr("a@acme.com, b@acme.com")).toBe("request.auth.token.email in ['a@acme.com', 'b@acme.com']");
  });
  it("keeps the placeholder when empty (fails closed)", () => {
    expect(isAdminExpr("")).toContain("you@example.com");
  });
  it("wraps the expr in a full isAdmin() block", () => {
    const snip = adminRulesSnippet("owner@acme.com");
    expect(snip).toContain("function isAdmin()");
    expect(snip).toContain("request.auth != null");
    expect(snip).toContain("== 'owner@acme.com'");
  });
});

describe("buildChecklist", () => {
  const base: CheckState = {
    firebaseEnabled: false,
    adminConfigured: false,
    signedIn: false,
    isCurrentAdmin: false,
    brandCustomized: false,
  };
  it("returns four checks, all todo for a fresh demo", () => {
    const list = buildChecklist(base);
    expect(list).toHaveLength(4);
    expect(list.every((i) => i.status === "todo")).toBe(true);
  });
  it("warns when signed in but not an admin", () => {
    const list = buildChecklist({ ...base, firebaseEnabled: true, signedIn: true, isCurrentAdmin: false });
    expect(list.find((i) => i.label.includes("Signed in"))?.status).toBe("warn");
  });
  it("marks ready when everything is set", () => {
    const list = buildChecklist({ firebaseEnabled: true, adminConfigured: true, signedIn: true, isCurrentAdmin: true, brandCustomized: true });
    expect(list.every((i) => i.status === "ok")).toBe(true);
  });
});
