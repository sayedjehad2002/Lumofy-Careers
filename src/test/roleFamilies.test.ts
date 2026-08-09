import { describe, it, expect } from "vitest";
import { roleFamily, inferSeniority } from "@/lib/roleFamilies";

// These cases are all real titles from the production CV library. Each one
// previously landed in the wrong bucket, so they exist to stop the regression
// rather than to restate the implementation.
describe("roleFamily", () => {
  it("collapses the five spellings of one frontend role", () => {
    const titles = [
      "Senior Frontend Developer",
      "Senior Frontend Engineer",
      "Senior Front-End Developer",
      "Senior Front-end Developer",
      "Senior Front-End Engineer / Front-End Lead",
    ];
    for (const t of titles) {
      expect(roleFamily("Engineering", t).family).toBe("Frontend Engineer");
    }
  });

  it("matches Full Stack however it is spelled", () => {
    // A space-delimited " fullstack " pattern missed every one of these, so the
    // canonical title failed its own rule and fell through to a catch-all.
    for (const t of ["Full Stack Developer", "Full-Stack Developer", "Junior Full Stack Developer", "Senior Full-stack Software Engineer"]) {
      expect(roleFamily("Engineering", t).family).toBe("Full Stack Developer");
    }
  });

  it("finds security inside 'Cybersecurity'", () => {
    // Word-delimited patterns dropped 7 of 9 real security CVs into the fallback.
    for (const t of ["Junior Cybersecurity Analyst", "Cybersecurity Intern", "Junior Cybersecurity Engineer", "Entry-Level Network Security Analyst"]) {
      expect(roleFamily("Engineering", t).family).toBe("Security Engineer");
    }
  });

  it("keeps an AI Product Manager in Product", () => {
    // The shared AI rule must never outrank a rule from the CV's own department.
    expect(roleFamily("Product", "AI Product Manager").family).toBe("Product Manager");
    expect(roleFamily("Product", "Senior AI/ML Product Manager").family).toBe("Product Manager");
  });

  it("does not let the Software Engineer catch-all swallow QA", () => {
    expect(roleFamily("Engineering", "Software QA Engineer").family).toBe("QA Engineer");
    expect(roleFamily("Engineering", "Software Test Engineer").family).toBe("QA Engineer");
  });

  it("gives untitled CVs a real folder instead of dropping them", () => {
    expect(roleFamily("Engineering", "").family).toBe("Role not identified");
    expect(roleFamily(null, null).family).toBe("Role not identified");
  });

  it("buckets an unrecognised role under its department, never another discipline", () => {
    // A Finance CV was being labelled "Operations Manager" by a shared rule.
    expect(roleFamily("Finance", "Sales Operations Intern").family).toBe("Finance — other");
  });
});

describe("inferSeniority", () => {
  it("treats Leader the same as Lead", () => {
    // /\blead\b/ missed "Leader", so two spellings of one job ranked differently.
    expect(inferSeniority("Customer Success Team Leader")).toBe("Lead+");
    expect(inferSeniority("Customer Success Team Lead")).toBe("Lead+");
  });

  it("ranks the strongest signal when a title carries two", () => {
    expect(inferSeniority("Head of Product")).toBe("Lead+");
    expect(inferSeniority("Senior Frontend Developer")).toBe("Senior");
    expect(inferSeniority("Junior Frontend Developer")).toBe("Junior");
    expect(inferSeniority("Frontend Developer (Mid-level)")).toBe("Mid");
  });

  it("does not read 'Internal' as an internship", () => {
    expect(inferSeniority("Internal Communications Manager")).not.toBe("Intern");
    expect(inferSeniority("Cybersecurity Intern")).toBe("Intern");
  });
});
