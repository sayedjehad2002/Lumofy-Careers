import { describe, expect, it } from "vitest";
import { findDuplicateTitle, locationFacets, normalizeLocation } from "@/lib/jobLocations";

describe("normalizeLocation", () => {
  it("collapses the spellings found in live data", () => {
    for (const raw of ["Bahrain", "Bahrain office", "Al Burhama, Manama"]) expect(normalizeLocation(raw)).toBe("Bahrain");
    expect(normalizeLocation("KSA")).toBe("Saudi Arabia");
    expect(normalizeLocation("EGYPT")).toBe("Egypt");
    expect(normalizeLocation("Remote")).toBe("Remote");
    expect(normalizeLocation("Bahrain & Remote")).toBe("Bahrain or Remote");
  });

  it("leaves a place it does not know alone", () => {
    expect(normalizeLocation("Dubai, UAE")).toBe("Dubai, UAE");
  });
});

describe("locationFacets", () => {
  it("counts a two-place role under both places", () => {
    expect(locationFacets("Bahrain & Remote")).toEqual(["Bahrain", "Remote"]);
    expect(locationFacets("")).toEqual([]);
  });
});

describe("findDuplicateTitle", () => {
  const jobs = [
    { id: "1", title: "Full Stack Intern", status: "open" },
    { id: "2", title: "Account Executive", status: "closed" },
  ];
  it("matches ignoring case and spacing, among open roles only", () => {
    expect(findDuplicateTitle("full stack  intern", jobs)?.id).toBe("1");
    expect(findDuplicateTitle("Full-Stack Intern", jobs)?.id).toBe("1");
    expect(findDuplicateTitle("Account Executive", jobs)).toBeUndefined();
  });
  it("does not match the job being edited", () => {
    expect(findDuplicateTitle("Full Stack Intern", jobs, "1")).toBeUndefined();
  });
});
