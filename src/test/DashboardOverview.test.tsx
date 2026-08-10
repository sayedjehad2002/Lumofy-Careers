import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import DashboardOverview from "@/components/careers/DashboardOverview";
import type { Applicant, Job } from "@/types/careers";

// DashboardOverview calls useCareers() (for silentRefresh, fed into useLiveRefresh).
// useCareers() throws outside a real CareersProvider, and the real provider fetches
// over the network on mount — so the context module is mocked instead of wrapping
// the component in the real provider.
vi.mock("@/contexts/CareersContext", () => ({
  useCareers: () => ({ silentRefresh: vi.fn() }),
}));

// Same minimal-factory pattern as src/test/dashboardMetrics.test.ts.
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
    appliedDate: "2026-01-01T00:00:00.000Z",
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
    postedDate: "2026-01-01T00:00:00.000Z",
    screeningQuestions: [],
    ...overrides,
  };
}

const noop = () => {};

describe("DashboardOverview", () => {
  it("leads with the unreviewed count and the oldest wait", () => {
    const applicants = [
      app({ id: "1", status: "new", appliedDate: "2026-06-23T00:00:00.000Z" }),
      app({ id: "2", status: "new", appliedDate: "2026-06-23T00:00:00.000Z" }),
    ];
    render(
      <MemoryRouter>
        <DashboardOverview
          jobs={[job()]}
          applicants={applicants}
          onNavigate={noop}
          applicantHref={(id) => `/dashboard/applicants/${id}`}
        />
      </MemoryRouter>
    );

    expect(screen.getByText(/2 applications have never been opened/i)).toBeInTheDocument();
    expect(screen.getByText(/waiting since 23 June/i)).toBeInTheDocument();
  });

  it("shows rejected candidates in the pipeline strip", () => {
    // Regression guard: the pipeline legend used to be built from a local status
    // list that silently omitted "rejected" (see statusBreakdown in dashboardMetrics.ts).
    const applicants = [app({ id: "1", status: "rejected" })];
    render(
      <MemoryRouter>
        <DashboardOverview
          jobs={[job()]}
          applicants={applicants}
          onNavigate={noop}
          applicantHref={(id) => `/dashboard/applicants/${id}`}
        />
      </MemoryRouter>
    );

    expect(screen.getByText("Rejected")).toBeInTheDocument();
  });

  it("says so when nothing needs attention", () => {
    // A single already-scored, hired applicant trips none of actionQueue's five
    // conditions (not new, not a stalled interview, not missing AI analysis) —
    // see the "omits rows with a zero count" case in dashboardMetrics.test.ts.
    const applicants = [
      app({ id: "1", status: "hired", aiAnalysis: { fitScore: 90 } as Applicant["aiAnalysis"] }),
    ];
    render(
      <MemoryRouter>
        <DashboardOverview
          jobs={[job()]}
          applicants={applicants}
          onNavigate={noop}
          applicantHref={(id) => `/dashboard/applicants/${id}`}
        />
      </MemoryRouter>
    );

    expect(screen.getByText(/Nothing needs attention/i)).toBeInTheDocument();
  });
});
