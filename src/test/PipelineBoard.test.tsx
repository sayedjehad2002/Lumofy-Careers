import { describe, it, expect, vi } from "vitest";
import { useState } from "react";
import { render, screen, within, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import PipelineBoard from "@/components/careers/pipeline/PipelineBoard";
import {
  INITIAL_PIPELINE_VIEW, type PipelineViewState,
} from "@/components/careers/pipeline/pipelineView";
import type { AIAnalysis, Applicant, ApplicantStatus, Job } from "@/types/careers";

const DAY = 86400000;

function app(overrides: Partial<Applicant> = {}): Applicant {
  return {
    id: "a1",
    jobId: "job1",
    fullName: "Jane Doe",
    email: "jane@example.com",
    phone: "+973 1234 5678",
    location: "Manama, Bahrain",
    cvFileName: "jane-doe-cv.pdf",
    screeningAnswers: {},
    status: "new",
    appliedDate: new Date(Date.now() - 2 * DAY).toISOString(),
    stageEnteredAt: new Date(Date.now() - 2 * DAY).toISOString(),
    notes: [],
    ...overrides,
  };
}

function job(overrides: Partial<Job> = {}): Job {
  return {
    id: "job1",
    title: "Software Engineer",
    department: "Engineering",
    location: "Manama, Bahrain",
    type: "Full-time",
    status: "open",
    summary: "",
    description: "",
    responsibilities: [],
    requirements: [],
    benefits: [],
    postedDate: "2026-01-01",
    screeningQuestions: [],
    ...overrides,
  };
}

function ai(overrides: Partial<AIAnalysis> = {}): AIAnalysis {
  return { fitScore: 70, recommendation: "Hold for Review", ...overrides } as AIAnalysis;
}

/**
 * Mirrors how Dashboard owns the view state: a real useState, so the board gets
 * a genuine setState updater rather than a stub that hides ordering bugs.
 */
function Harness({
  applicants, jobs, onBulk,
}: {
  applicants: Applicant[];
  jobs: Job[];
  onBulk?: (ids: string[], s: ApplicantStatus) => Promise<{ updated: string[] }>;
}) {
  const [view, setView] = useState<PipelineViewState>(INITIAL_PIPELINE_VIEW);
  return (
    <MemoryRouter>
    <PipelineBoard
      applicants={applicants}
      jobs={jobs}
      selectedJobId="all"
      onJobChange={() => {}}
      onStatusUpdate={async () => {}}
      onBulkStatusUpdate={onBulk ?? (async (ids) => ({ updated: ids }))}
      onOpenApplicant={() => {}}
      applicantHref={(id) => `/dashboard/applicants/${id}`}
      view={view}
      onViewChange={setView}
    />
    </MemoryRouter>
  );
}

/**
 * Radix dropdowns open on pointerdown, not click — a plain fireEvent.click on
 * the trigger leaves the menu closed and every item query fails.
 */
function openMenu(trigger: HTMLElement) {
  fireEvent.pointerDown(trigger, { button: 0, ctrlKey: false, pointerType: "mouse" });
}

const roster = [
  app({ id: "n1", fullName: "Nadia New", status: "new", aiAnalysis: ai({ fitScore: 91, recommendation: "Fast-Track to Interview" }) }),
  app({ id: "n2", fullName: "Noor Unscored", status: "new", aiAnalysis: undefined }),
  app({ id: "r1", fullName: "Rami Reviewing", status: "reviewing", aiAnalysis: ai({ fitScore: 60 }) }),
  app({
    id: "i1", fullName: "Iman Interview", status: "interview",
    stageEnteredAt: new Date(Date.now() - 30 * DAY).toISOString(), aiAnalysis: ai({ fitScore: 80 }),
  }),
  app({ id: "x1", fullName: "Rana Rejected", status: "rejected" }),
];

describe("PipelineBoard", () => {
  it("shows every stage, with the terminal ones collapsed to rails by default", () => {
    render(<Harness applicants={roster} jobs={[job()]} />);
    // Labels are title-case in the DOM; the board uppercases them with CSS.
    for (const label of ["New", "Reviewing", "Shortlisted", "Interview", "Rejected", "Hired"]) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
    // Rejected holds a candidate but is still a rail — it is a destination, not a
    // workspace, and the four working stages need the width.
    expect(screen.queryByText("Rana Rejected")).not.toBeInTheDocument();
    expect(screen.getByText("Nadia New")).toBeInTheDocument();
  });

  it("counts triage facts from the real roster", () => {
    render(<Harness applicants={roster} jobs={[job()]} />);
    const fastTrack = screen.getByTitle(/AI recommended fast-tracking/);
    expect(within(fastTrack).getByText("1")).toBeInTheDocument();

    const stalled = screen.getByTitle(/no movement for over a week/);
    expect(within(stalled).getByText("1")).toBeInTheDocument();
  });

  it("filters the board to exactly what a triage chip counted", () => {
    render(<Harness applicants={roster} jobs={[job()]} />);
    fireEvent.click(screen.getByTitle(/no movement for over a week/));

    // The one stalled interview, and nobody else.
    expect(screen.getByText("Iman Interview")).toBeInTheDocument();
    expect(screen.queryByText("Nadia New")).not.toBeInTheDocument();
    expect(screen.getByText("1 of 5 candidates")).toBeInTheDocument();
  });

  it("keeps a cleared chip cleared when a search lands in the same tick", () => {
    // Regression: patchView used to spread a `view` captured at render time, so
    // the second of two updates in one tick overwrote the first and a cleared
    // triage filter came back to life.
    render(<Harness applicants={roster} jobs={[job()]} />);
    const chip = screen.getByTitle(/no movement for over a week/);

    fireEvent.click(chip);
    expect(chip).toHaveAttribute("aria-pressed", "true");

    fireEvent.click(chip);
    fireEvent.change(screen.getByLabelText("Search the board"), { target: { value: "nadia" } });

    expect(chip).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByText("Nadia New")).toBeInTheDocument();
  });

  it("searches name, email and role together", () => {
    render(<Harness applicants={roster} jobs={[job()]} />);
    fireEvent.change(screen.getByLabelText("Search the board"), { target: { value: "rami software" } });
    expect(screen.getByText("Rami Reviewing")).toBeInTheDocument();
    expect(screen.queryByText("Nadia New")).not.toBeInTheDocument();
  });

  it("moves a whole selection in one bulk call", async () => {
    const onBulk = vi.fn(async (ids: string[], _status: ApplicantStatus) => ({ updated: ids }));
    render(<Harness applicants={roster} jobs={[job()]} onBulk={onBulk} />);

    fireEvent.click(screen.getByLabelText("Select Nadia New"));
    fireEvent.click(screen.getByLabelText("Select Noor Unscored"));
    expect(screen.getByText("selected")).toBeInTheDocument();

    openMenu(screen.getByRole("button", { name: "Move to stage" }));
    fireEvent.click(await screen.findByRole("menuitem", { name: /Shortlisted/ }));

    expect(onBulk).toHaveBeenCalledTimes(1);
    expect(onBulk.mock.calls[0][0].sort()).toEqual(["n1", "n2"]);
    expect(onBulk.mock.calls[0][1]).toBe("shortlisted");
  });

  it("confirms before a bulk move into a terminal stage", async () => {
    const onBulk = vi.fn(async (ids: string[], _status: ApplicantStatus) => ({ updated: ids }));
    render(<Harness applicants={roster} jobs={[job()]} onBulk={onBulk} />);

    fireEvent.click(screen.getByLabelText("Select Nadia New"));
    fireEvent.click(screen.getByLabelText("Select Noor Unscored"));
    openMenu(screen.getByRole("button", { name: "Move to stage" }));
    fireEvent.click(await screen.findByRole("menuitem", { name: /Rejected/ }));

    // Nothing has moved yet — the dialog is the gate.
    expect(onBulk).not.toHaveBeenCalled();
    expect(await screen.findByText(/2 candidates/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Confirm" }));
    expect(onBulk).toHaveBeenCalledTimes(1);
    expect(onBulk.mock.calls[0][1]).toBe("rejected");
  });

  it("renders each candidate name as a real link to their own page", () => {
    // The point of the anchor: right-click "open in new tab", ⌘-click and
    // middle-click are the browser's, not ours — but only if it is an <a href>.
    render(<Harness applicants={roster} jobs={[job()]} />);
    const link = screen.getByRole("link", { name: "Nadia New" });
    expect(link).toHaveAttribute("href", "/dashboard/applicants/n1");
    // The browser's native anchor drag would otherwise fight the card's drag handle.
    expect(link).toHaveAttribute("draggable", "false");
  });

  it("renders an empty board without crashing", () => {
    render(<Harness applicants={[]} jobs={[]} />);
    expect(screen.getByText("0 candidates")).toBeInTheDocument();
  });
});
