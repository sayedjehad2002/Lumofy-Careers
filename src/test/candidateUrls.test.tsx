import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import type { Applicant, Job } from "@/types/careers";

/**
 * A candidate's page is a URL, so these assert on routing rather than on state:
 * that `/dashboard/applicants/<id>` resolves the right person, that an unknown id
 * says so instead of silently showing the list, and that Close returns you to
 * whichever screen you came from.
 *
 * The dashboard pulls in the whole careers stack, so the context and the heavy
 * child screens are mocked down to the parts these behaviours touch.
 */

const applicants: Applicant[] = [
  {
    id: "cand-1", jobId: "job1", fullName: "Batool Jalal", email: "batool@example.com",
    phone: "", location: "", cvFileName: "cv.pdf", screeningAnswers: {}, status: "new",
    appliedDate: "2026-06-01T00:00:00.000Z", notes: [],
  },
];

const jobs: Job[] = [{
  id: "job1", title: "Content Marketing Intern", department: "Marketing", location: "Manama",
  type: "Full-time", status: "open", summary: "", description: "", responsibilities: [],
  requirements: [], benefits: [], postedDate: "2026-01-01", screeningQuestions: [],
}];

vi.mock("@/contexts/CareersContext", () => ({
  useCareers: () => ({
    jobs, applicants, loading: false, sessionToken: "t", authReady: true, isHrUser: true,
    hrEmail: "hr@lumofy.com", hrRole: "owner", hrChecked: true,
    addJob: vi.fn(), updateJob: vi.fn(), archiveJob: vi.fn(), restoreJob: vi.fn(),
    deleteApplicant: vi.fn(), updateApplicantStatus: vi.fn(), updateApplicantStatusBulk: vi.fn(),
    addApplicantNote: vi.fn(), updateApplicantAI: vi.fn(), updateApplicantFields: vi.fn(),
    refreshData: vi.fn(), silentRefresh: vi.fn(),
  }),
}));

// Stand-ins for the heavy screens: each announces itself and, for the profile,
// exposes the Back control these tests drive.
vi.mock("@/components/careers/CandidateProfile", () => ({
  default: ({ applicant, onBack }: { applicant: Applicant; onBack: () => void }) => (
    <div>
      <h1>{applicant.fullName}</h1>
      <button onClick={onBack}>Back</button>
    </div>
  ),
}));
vi.mock("@/components/careers/applicants/ApplicantsRoster", () => ({
  default: () => <div>APPLICANTS LIST</div>,
}));
vi.mock("@/components/careers/pipeline/PipelineBoard", () => ({
  default: () => <div>PIPELINE BOARD</div>,
}));
vi.mock("@/components/careers/CVLibrary", () => ({ default: () => <div /> }));
vi.mock("@/components/careers/HrTeam", () => ({ default: () => <div /> }));
vi.mock("@/components/careers/DashboardOverview", () => ({ default: () => <div>OVERVIEW</div> }));
vi.mock("@/components/careers/CommandPalette", () => ({ default: () => null }));

let Dashboard: React.ComponentType;

beforeEach(async () => {
  vi.resetModules();
  Dashboard = (await import("@/pages/Dashboard")).default;
});

function LocationProbe() {
  const loc = useLocation();
  return <span data-testid="path">{loc.pathname}</span>;
}

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <LocationProbe />
      <Routes>
        <Route path="/dashboard/:tab/:sub" element={<Dashboard />} />
        <Route path="/dashboard/:tab" element={<Dashboard />} />
        <Route path="/dashboard" element={<Dashboard />} />
      </Routes>
    </MemoryRouter>
  );
}

describe("candidate URLs", () => {
  it("opens the candidate named in the URL", async () => {
    renderAt("/dashboard/applicants/cand-1");
    expect(await screen.findByRole("heading", { name: "Batool Jalal" })).toBeInTheDocument();
    expect(screen.queryByText("APPLICANTS LIST")).not.toBeInTheDocument();
  });

  it("shows the list when the URL names no candidate", async () => {
    renderAt("/dashboard/applicants");
    expect(await screen.findByText("APPLICANTS LIST")).toBeInTheDocument();
  });

  it("says a candidate is missing rather than silently showing the list", async () => {
    // A deleted candidate or a mistyped link. Falling back to the list under a URL
    // that names a person reads as "this person has no data".
    renderAt("/dashboard/applicants/does-not-exist");
    expect(await screen.findByText(/Candidate not found/i)).toBeInTheDocument();
    expect(screen.queryByText("APPLICANTS LIST")).not.toBeInTheDocument();
  });

  it("returns to the Pipeline when that is where the click came from", async () => {
    renderAt("/dashboard/applicants/cand-1?from=pipeline");
    fireEvent.click(await screen.findByRole("button", { name: "Back" }));
    expect(screen.getByTestId("path")).toHaveTextContent("/dashboard/pipeline");
  });

  it("falls back to the Applicants list for a shared link with no origin", async () => {
    renderAt("/dashboard/applicants/cand-1");
    fireEvent.click(await screen.findByRole("button", { name: "Back" }));
    expect(screen.getByTestId("path")).toHaveTextContent("/dashboard/applicants");
  });

  it("ignores a junk origin rather than routing somewhere that does not exist", async () => {
    renderAt("/dashboard/applicants/cand-1?from=../../evil");
    fireEvent.click(await screen.findByRole("button", { name: "Back" }));
    expect(screen.getByTestId("path")).toHaveTextContent("/dashboard/applicants");
  });
});
