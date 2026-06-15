import { describe, it, expect } from "vitest";
import { parseFirebaseConfigBlock, isCompleteFirebase, readStoredFirebase } from "./runtimeConfig";

describe("parseFirebaseConfigBlock", () => {
  it("extracts the 6 fields from a pasted firebaseConfig block", () => {
    const block = `const firebaseConfig = {
      apiKey: "AIzaSyTEST",
      authDomain: "demo.firebaseapp.com",
      projectId: "demo-proj",
      storageBucket: "demo-proj.appspot.com",
      messagingSenderId: "12345",
      appId: "1:12345:web:abc"
    };`;
    const c = parseFirebaseConfigBlock(block);
    expect(c.apiKey).toBe("AIzaSyTEST");
    expect(c.projectId).toBe("demo-proj");
    expect(c.appId).toBe("1:12345:web:abc");
  });
  it("handles single quotes and missing fields", () => {
    const c = parseFirebaseConfigBlock(`{ apiKey: 'k', projectId: 'p' }`);
    expect(c.apiKey).toBe("k");
    expect(c.projectId).toBe("p");
    expect(c.appId).toBe("");
  });
});

describe("isCompleteFirebase", () => {
  it("requires apiKey and projectId", () => {
    expect(isCompleteFirebase({ apiKey: "k", projectId: "p" })).toBe(true);
    expect(isCompleteFirebase({ apiKey: "k" })).toBe(false);
    expect(isCompleteFirebase(null)).toBe(false);
  });
});

describe("server safety", () => {
  it("readStoredFirebase returns null without a window (SSR/node)", () => {
    expect(readStoredFirebase()).toBeNull();
  });
});
