import { describe, it, expect } from "vitest";
import { deptColor, BRAND_HUES } from "./deptColor";

describe("deptColor", () => {
  it("returns a stable hue for the same name", () => {
    expect(deptColor("Engineering")).toBe(deptColor("Engineering"));
  });
  it("is case- and whitespace-insensitive", () => {
    expect(deptColor("  engineering ")).toBe(deptColor("Engineering"));
  });
  it("maps names to entries from BRAND_HUES", () => {
    expect(BRAND_HUES).toContain(deptColor("Product"));
  });
  it("distributes a handful of departments across more than one hue", () => {
    const hues = new Set(
      ["Engineering", "Product", "Revenue", "Finance", "People & Culture"].map(deptColor)
    );
    expect(hues.size).toBeGreaterThan(1);
  });
});
