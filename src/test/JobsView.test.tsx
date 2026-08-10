import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import JobsView from "@/components/careers/jobs/JobsView";
import type { Applicant, Job } from "@/types/careers";
import { BACKLOG_MIN_UNREVIEWED } from "@/lib/jobMetrics";

const DAY = 86400000;
const daysAgo = (n: number) => new Date(Date.now() - n * DAY).toISOString();

function job(overrides: Partial<Job> = {}): Job {
  return {
    id: "job1", title: "Software Engineer", department: "Engineering", location: "Bahrain",
    type: "Full-time", status: "open", summary: "", description: "", responsibilities: [],
    requirements: [], benefits: [], postedDate: daysAgo(30), screeningQuestions: [],
    ...overrides,
  };
}

function app(overrides: Partial<Applicant> = {}): Applicant {
  return {
    id: "a1", jobId: "job1", fullName: "Jane Doe", email: "jane@example.com", phone: "",
    location: "", cvFileName: "cv.pdf", screeningAnswers: {}, status: "new",
    appliedDate: daysAgo(1), notes: [],
  ...overrides };
}

const noop = () => {};

function renderView(jobs: Job[], applicants: Applicant[], overrides: Partial<Parameters<typeof JobsView>[0]> = {}) {
  return render(
    <JobsView
      jobs={jobs}
      applicants={applicants}
      archivedJobs={[]}
      onCreate={noop}
      onOpen={noop}
      onEdit={noop}
      onDuplicate={noop}
      onArchive={noop}
      onToggleStatus={noop}
      onRestore={noop}
      onCopyLink={noop}
      onShareLinkedIn={noop}
      onOpenPublicPage={noop}
      applicantCount={() => 0}
      {...overrides}
    />
  );
}

/** Mirrors production: 4 roles starving, 1 drowning, 1 healthy. */
const starving = job({ id: "gtm", title: "GTM Manager", postedDate: daysAgo(33) });
const drowning = job({ id: "pm", title: "Product Manager", postedDate: daysAgo(34) });
const healthy = job({ id: "be", title: "Backend Developer", postedDate: daysAgo(8) });

const roster = [
  app({ id: "s1", jobId: "gtm", status: "new" }),
  ...Array.from({ length: BACKLOG_MIN_UNREVIEWED }, (_, i) => app({ id: `p${i}`, jobId: "pm", status: "new" })),
  app({ id: "h1", jobId: "be", status: "hired" }),
  app({ id: "h2", jobId: "be", status: "hired" }),
  app({ id: "h3", jobId: "be", status: "hired" }),
];

describe("JobsView", () => {
  it("leads with the roles that need attention", () => {
    renderView([healthy, drowning, starving], roster);
    const headings = screen.getAllByRole("heading", { level: 3 }).map((h) => h.textContent);
    expect(headings).toEqual(["GTM Manager", "Product Manager", "Backend Developer"]);
  });

  it("says what is going on in the header", () => {
    renderView([healthy, drowning, starving], roster);
    expect(screen.getByText(/3 open roles/)).toBeInTheDocument();
    expect(screen.getByText(/1 needs sourcing/)).toBeInTheDocument();
    expect(screen.getByText(/never opened/)).toBeInTheDocument();
  });

  it("flags a starving role but not a young one", () => {
    renderView([healthy, starving], roster);
    // Scoped to the rows: "Needs sourcing" is also a filter chip, which is
    // correct but says nothing about either job.
    const gtmRow = screen.getByRole("heading", { name: "GTM Manager" }).closest("[role=button]")!;
    expect(within(gtmRow as HTMLElement).getByText("Needs sourcing")).toBeInTheDocument();

    const backendRow = screen.getByRole("heading", { name: "Backend Developer" }).closest("[role=button]")!;
    expect(within(backendRow as HTMLElement).queryByText("Needs sourcing")).not.toBeInTheDocument();
  });

  it("hides a filter chip with nothing behind it", () => {
    // The old header rendered a permanently dead "0 closed" chip.
    renderView([healthy], [app({ id: "h1", jobId: "be", status: "hired" })]);
    expect(screen.queryByText("Closed")).not.toBeInTheDocument();
    expect(screen.getByText("All roles")).toBeInTheDocument();
  });

  it("narrows to exactly what a filter chip counted", () => {
    renderView([healthy, drowning, starving], roster);
    fireEvent.click(screen.getByRole("button", { name: /Needs sourcing/ }));
    expect(screen.getByRole("heading", { name: "GTM Manager" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Product Manager" })).not.toBeInTheDocument();
  });

  it("names every action instead of leaving six unlabelled icons", () => {
    renderView([healthy], roster);
    fireEvent.pointerDown(
      screen.getByRole("button", { name: "Actions for Backend Developer" }),
      { button: 0, ctrlKey: false, pointerType: "mouse" }
    );
    for (const label of [
      "Edit job", "Duplicate as draft", "Copy apply link", "Share to LinkedIn",
      "Open public page", "Close to new applicants", "Archive job",
    ]) {
      expect(screen.getByRole("menuitem", { name: label })).toBeInTheDocument();
    }
  });

  it("opens the job's applicants when the row is activated", () => {
    const onOpen = vi.fn();
    renderView([healthy], roster, { onOpen });
    fireEvent.click(screen.getByRole("heading", { name: "Backend Developer" }).closest("[role=button]")!);
    expect(onOpen).toHaveBeenCalledWith("be");
  });

  it("marks a role that has already hired someone", () => {
    const filled = job({ id: "csm", title: "Customer Success Manager" });
    render(
      <JobsView
        jobs={[filled]}
        applicants={[app({ id: "h", jobId: "csm", status: "hired" })]}
        archivedJobs={[]} onCreate={noop} onOpen={noop} onEdit={noop} onDuplicate={noop}
        onArchive={noop} onToggleStatus={noop} onRestore={noop} onCopyLink={noop}
        onShareLinkedIn={noop} onOpenPublicPage={noop} applicantCount={() => 0}
      />
    );
    const row = screen.getByRole("heading", { name: "Customer Success Manager" }).closest("[role=button]")!;
    expect(within(row as HTMLElement).getByText("Hired")).toBeInTheDocument();
  });

  it("renders an empty state rather than a bare container", () => {
    renderView([], []);
    expect(screen.getByText("No jobs created yet")).toBeInTheDocument();
  });
});
