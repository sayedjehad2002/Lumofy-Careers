import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import TalentPoolInsights from "@/components/careers/cvlibrary/TalentPoolInsights";

type CV = Parameters<typeof TalentPoolInsights>[0]["candidates"][number];

const cv = (o: Partial<CV> = {}): CV => ({
  id: Math.random().toString(36).slice(2),
  name: "Someone",
  skills: [],
  industries: [],
  nationality: null,
  years_experience: null,
  status: "new",
  suggested_department: null,
  manual_department: null,
  ...o,
});

describe("TalentPoolInsights", () => {
  it("counts every distinct skill, not just the twelve it displays", () => {
    // The tile used to read `topSkills.length`, an array already capped at 12,
    // so it printed "12" for a library holding 2,241 distinct skills.
    const many = Array.from({ length: 30 }, (_, i) => `Skill${i}`);
    render(<TalentPoolInsights candidates={[cv({ skills: many })]} />);

    const tile = screen.getByText("Unique skills").closest("div")!;
    expect(tile.textContent).toContain("30");
    expect(tile.textContent).not.toMatch(/\b12\b/);
  });

  it("counts a skill once per CV regardless of casing", () => {
    render(<TalentPoolInsights candidates={[cv({ skills: ["React", "react", "REACT"] })]} />);
    const tile = screen.getByText("Unique skills").closest("div")!;
    expect(tile.textContent).toContain("1");
  });

  it("folds nationality spellings into one", () => {
    // "Saudi" and "Saudi Arabia" were charted as two different nationalities.
    render(<TalentPoolInsights candidates={[
      cv({ nationality: "Saudi" }),
      cv({ nationality: "Saudi Arabia" }),
      cv({ nationality: "Bahraini" }),
    ]} />);

    // "Nationalities" labels both the stat tile and the panel; the tile renders first.
    const tile = screen.getAllByText("Nationalities")[0].closest("div")!;
    expect(tile.textContent).toContain("2");           // Saudi + Bahraini
    expect(screen.queryByText("Saudi Arabia")).toBeNull();
    expect(screen.getByText("Saudi")).toBeTruthy();
  });

  it("states the population each number was measured over", () => {
    render(<TalentPoolInsights candidates={[
      cv({ skills: ["React"] }),
      cv(),   // no skills, no experience, no nationality
      cv(),
    ]} />);
    expect(screen.getByText(/across 1 of 3 CVs/i)).toBeTruthy();
    expect(screen.getByText(/known for 0 of 3/i)).toBeTruthy();
  });

  it("keeps CVs with no experience figure out of the percentage split", () => {
    render(<TalentPoolInsights candidates={[
      cv({ years_experience: "4" }),
      cv({ years_experience: null }),
      cv({ years_experience: null }),
    ]} />);
    // One known value = 100% of the stated population, and the two unknowns are
    // reported separately instead of becoming the largest slice of the chart.
    expect(screen.getByText("100%")).toBeTruthy();
    expect(screen.getByText(/2 more CVs have no experience figure/i)).toBeTruthy();
  });
});
