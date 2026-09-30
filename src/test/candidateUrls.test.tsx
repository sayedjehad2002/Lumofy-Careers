import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import type { Applicant, Job } from "@/types/careers";
import { routeKey } from "@/lib/routeKey";

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

// Mutable so a test can hold the signed-in fetch "in flight".
const dataState = vi.hoisted(() => {
  const s = {
    ready: true,
    partial: false,
    loadFull: (() => Promise.resolve(true)) as (id: string) => Promise<boolean>,
    // Stable identity, like the real useCallback, so effects keyed on it do not re-fire.
    loadFullStable: (id: string) => s.loadFull(id),
  };
  return s;
});

vi.mock("@/contexts/CareersContext", () => ({
  useCareers: () => ({
    jobs,
    applicants: dataState.partial
      ? applicants.map((a) => ({ ...a, analysisPartial: true, aiAnalysis: { fitScore: 80 } as Applicant["aiAnalysis"] }))
      : applicants,
    loadFullApplicant: dataState.loadFullStable,
    loading: false, adminDataReady: dataState.ready, sessionToken: "t", authReady: true, isHrUser: true,
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
  default: ({ selectedJobIds }: { selectedJobIds: readonly string[] }) => (
    <div>
      APPLICANTS LIST
      <span data-testid="job-scope">{selectedJobIds.join(",") || "all"}</span>
    </div>
  ),
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
  dataState.ready = true;
  dataState.partial = false;
  dataState.loadFull = () => Promise.resolve(true);
  vi.resetModules();
  Dashboard = (await import("@/pages/Dashboard")).default;
  // Re-imports the whole Dashboard graph after resetModules. That takes 7-14s
  // when the full suite runs in parallel, over the default 10s hook limit.
}, 30_000);

function LocationProbe() {
  const loc = useLocation();
  return <span data-testid="path">{loc.pathname}</span>;
}

/** Keys the routes the way App's page transition does, so a remount shows up here. */
function KeyedShell({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation();
  return <div key={routeKey(pathname)}>{children}</div>;
}

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <LocationProbe />
      <KeyedShell>
        <Routes>
          <Route path="/dashboard/:tab/:sub" element={<Dashboard />} />
          <Route path="/dashboard/:tab" element={<Dashboard />} />
          <Route path="/dashboard" element={<Dashboard />} />
        </Routes>
      </KeyedShell>
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

  it("waits for the applicants instead of calling a real candidate missing", async () => {
    // Public jobs had loaded (loading: false) but the signed-in fetch had not, so
    // the list was still empty and a valid link read "Candidate not found".
    dataState.ready = false;
    renderAt("/dashboard/applicants/cand-1");
    expect(await screen.findByText(/Loading dashboard/i)).toBeInTheDocument();
    expect(screen.queryByText(/Candidate not found/i)).not.toBeInTheDocument();
  });

  it("fetches the full record before showing a profile the list only has in part", async () => {
    // The list carries a cut-down analysis; the profile's tabs read past it.
    dataState.partial = true;
    const calls: string[] = [];
    dataState.loadFull = (id) => { calls.push(id); return new Promise(() => {}); };
    renderAt("/dashboard/applicants/cand-1");
    expect(await screen.findByLabelText("Loading candidate")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Batool Jalal" })).not.toBeInTheDocument();
    expect(calls).toEqual(["cand-1"]);
  });

  it("offers a retry when the full record cannot be loaded", async () => {
    dataState.partial = true;
    let attempts = 0;
    dataState.loadFull = () => { attempts++; return Promise.resolve(false); };
    renderAt("/dashboard/applicants/cand-1");
    fireEvent.click(await screen.findByRole("button", { name: "Try again" }));
    await screen.findByRole("button", { name: "Try again" });
    expect(attempts).toBe(2);
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

  it("opens Applicants scoped to the role clicked on Jobs", async () => {
    // The manager-reported bug: the page transition was keyed on the full path, so
    // the move to /dashboard/applicants remounted the dashboard and dropped the
    // filter the click had just set. Applicants opened on "All jobs".
    renderAt("/dashboard/jobs");
    fireEvent.click(await screen.findByRole("button", { name: /Content Marketing Intern.*View applicants/ }));
    expect(screen.getByTestId("path")).toHaveTextContent("/dashboard/applicants");
    expect(await screen.findByTestId("job-scope")).toHaveTextContent("job1");
  });
});

describe("routeKey", () => {
  it("gives every dashboard URL one key and public pages their own", () => {
    expect(routeKey("/dashboard")).toBe("/dashboard");
    expect(routeKey("/dashboard/jobs")).toBe("/dashboard");
    expect(routeKey("/dashboard/applicants/cand-1")).toBe("/dashboard");
    expect(routeKey("/jobs/abc")).toBe("/jobs/abc");
    expect(routeKey("/dashboardx")).toBe("/dashboardx");
  });
});
