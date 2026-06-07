import { describe, it, expect } from "vitest";
import {
  inferSeniority,
  analysisCalibration,
  generationCalibration,
} from "../../supabase/functions/_shared/seniority";

// The AI calibration ("intern = easy on them, senior/lead = strict, aligned to the
// title + description") rides on inferSeniority(). These tests pin that behavior so a
// future regex tweak can't silently mis-grade a role's strictness.

describe("inferSeniority — title signal (strongest)", () => {
  it("detects Intern titles", () => {
    expect(inferSeniority("Software Engineering Intern")).toBe("Intern");
    expect(inferSeniority("Marketing Trainee")).toBe("Intern");
    expect(inferSeniority("Graduate Analyst")).toBe("Intern");
    expect(inferSeniority("Apprentice Electrician")).toBe("Intern");
  });

  it("detects Junior titles", () => {
    expect(inferSeniority("Junior Designer")).toBe("Junior");
    expect(inferSeniority("Jr. Developer")).toBe("Junior");
    expect(inferSeniority("Associate Designer")).toBe("Junior");
    expect(inferSeniority("Entry-level Recruiter")).toBe("Junior");
  });

  it("detects Senior titles", () => {
    expect(inferSeniority("Senior Backend Engineer")).toBe("Senior");
    expect(inferSeniority("Sr. Product Designer")).toBe("Senior");
    expect(inferSeniority("Data Engineer III")).toBe("Senior");
  });

  it("detects Lead / management titles", () => {
    expect(inferSeniority("Engineering Manager")).toBe("Lead");
    expect(inferSeniority("Head of Product")).toBe("Lead");
    expect(inferSeniority("Principal Engineer")).toBe("Lead");
    expect(inferSeniority("Staff Software Engineer")).toBe("Lead");
    expect(inferSeniority("Lead Developer")).toBe("Lead");
    expect(inferSeniority("VP of Engineering")).toBe("Lead");
    expect(inferSeniority("CTO")).toBe("Lead");
    expect(inferSeniority("Director of Operations")).toBe("Lead");
  });

  it("falls back to Mid for a neutral title with no other signal", () => {
    expect(inferSeniority("Software Engineer")).toBe("Mid");
    expect(inferSeniority("Product Designer")).toBe("Mid");
  });

  it("title outranks a conflicting years-of-experience signal", () => {
    // 'senior' in the title wins even though "1 year" alone would imply Junior.
    expect(inferSeniority("Senior Engineer", ["1 year experience"])).toBe("Senior");
    // 'manager' (Lead) is checked before the Senior/Junior keywords.
    expect(inferSeniority("Engineering Manager", ["2 years"])).toBe("Lead");
  });
});

describe("inferSeniority — fallback signals (neutral title)", () => {
  it("uses employmentType = Internship", () => {
    expect(inferSeniority("Designer", null, "Internship")).toBe("Intern");
  });

  it("uses explicit entry-level phrasing in the description", () => {
    expect(
      inferSeniority("Designer", null, "Full-time", "No experience required — fresh graduate welcome."),
    ).toBe("Intern");
  });

  it("uses years-of-experience from requirements + description", () => {
    expect(inferSeniority("Engineer", ["1 year"])).toBe("Junior");
    expect(inferSeniority("Engineer", ["3 years of experience"])).toBe("Mid");
    expect(inferSeniority("Engineer", ["6+ years"])).toBe("Senior");
    expect(inferSeniority("Engineer", ["10 years"])).toBe("Lead");
    // requirements may also arrive as a plain string
    expect(inferSeniority("Engineer", "Minimum 7 years in the field")).toBe("Senior");
  });

  it("honors the 7→Senior / 8→Lead boundary", () => {
    expect(inferSeniority("Engineer", ["7 years"])).toBe("Senior");
    expect(inferSeniority("Engineer", ["8 years"])).toBe("Lead");
  });
});

describe("inferSeniority — empty / nullish input", () => {
  it("defaults to Mid", () => {
    expect(inferSeniority()).toBe("Mid");
    expect(inferSeniority("")).toBe("Mid");
    expect(inferSeniority(null)).toBe("Mid");
    expect(inferSeniority(undefined, undefined, undefined, undefined)).toBe("Mid");
  });
});

describe("calibration blocks", () => {
  it("analysisCalibration names the level and includes the strictness scale", () => {
    const out = analysisCalibration("Intern");
    expect(out).toContain("Intern");
    expect(out).toContain("SENIORITY CALIBRATION");
    expect(out.toLowerCase()).toContain("lenient");
  });

  it("generationCalibration names the level and references alignment", () => {
    const out = generationCalibration("Lead");
    expect(out).toContain("Lead");
    expect(out.toLowerCase()).toContain("leadership");
    expect(out.toLowerCase()).toContain("align");
  });

  it("the same calibration is produced for each level (smoke)", () => {
    for (const lvl of ["Intern", "Junior", "Mid", "Senior", "Lead"] as const) {
      expect(analysisCalibration(lvl)).toContain(lvl);
      expect(generationCalibration(lvl)).toContain(lvl);
    }
  });
});
