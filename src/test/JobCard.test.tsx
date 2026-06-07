import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import JobCard from "@/components/careers/JobCard";
import type { Job } from "@/types/careers";

const makeJob = (overrides: Partial<Job> = {}): Job => ({
  id: "job-1",
  title: "Senior Frontend Engineer",
  department: "Engineering",
  location: "Remote",
  type: "Full-time",
  status: "open",
  summary: "Build delightful interfaces.",
  description: "",
  responsibilities: [],
  requirements: [],
  benefits: [],
  postedDate: "2026-01-01",
  screeningQuestions: [],
  ...overrides,
});

const renderCard = (job: Job) =>
  render(
    <MemoryRouter>
      <JobCard job={job} index={0} />
    </MemoryRouter>,
  );

describe("JobCard", () => {
  beforeEach(() => localStorage.clear());

  it("renders the role title, department and location", () => {
    renderCard(makeJob());
    expect(screen.getByText("Senior Frontend Engineer")).toBeInTheDocument();
    expect(screen.getByText("Engineering")).toBeInTheDocument();
    expect(screen.getByText("Remote")).toBeInTheDocument();
  });

  it("links to the job detail page", () => {
    renderCard(makeJob({ id: "abc-123" }));
    expect(screen.getByRole("link")).toHaveAttribute("href", "/jobs/abc-123");
  });

  it("saves and unsaves the job (and persists to localStorage)", () => {
    renderCard(makeJob({ id: "job-1" }));

    const saveBtn = screen.getByRole("button", { name: /save senior frontend engineer/i });
    expect(saveBtn).toHaveAttribute("aria-pressed", "false");

    fireEvent.click(saveBtn);
    const savedBtn = screen.getByRole("button", { name: /remove senior frontend engineer from saved jobs/i });
    expect(savedBtn).toHaveAttribute("aria-pressed", "true");
    expect(JSON.parse(localStorage.getItem("lumofy:saved-jobs") || "[]")).toEqual(["job-1"]);

    fireEvent.click(savedBtn);
    expect(screen.getByRole("button", { name: /save senior frontend engineer/i })).toHaveAttribute("aria-pressed", "false");
    expect(JSON.parse(localStorage.getItem("lumofy:saved-jobs") || "[]")).toEqual([]);
  });

  it("reflects already-saved state on mount", () => {
    localStorage.setItem("lumofy:saved-jobs", JSON.stringify(["job-1"]));
    renderCard(makeJob({ id: "job-1" }));
    expect(
      screen.getByRole("button", { name: /remove .* from saved jobs/i }),
    ).toHaveAttribute("aria-pressed", "true");
  });
});
