import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import EmailTemplates from "@/components/careers/applicants/EmailTemplates";
import type { Applicant, Job } from "@/types/careers";

const makeApplicant = (overrides: Partial<Applicant> = {}): Applicant => ({
  id: "appl-1",
  jobId: "job-1",
  fullName: "Jordan Lee",
  email: "jordan@example.com",
  phone: "",
  location: "Remote",
  cvFileName: "cv.pdf",
  screeningAnswers: {},
  status: "new",
  appliedDate: "2026-01-01",
  notes: [],
  ...overrides,
});

const makeJob = (overrides: Partial<Job> = {}): Job => ({
  id: "job-1",
  title: "Product Designer",
  department: "Design",
  location: "Remote",
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
});

describe("EmailTemplates", () => {
  // Regression guard: the draft used to be filled by a setState call DURING render
  // (an React anti-pattern that warns and double-renders). It is now lazy-initialised,
  // so the very first render must already show a populated subject + body.
  it("renders a populated draft on first render", () => {
    render(<EmailTemplates applicant={makeApplicant()} job={makeJob()} />);
    const [subject, body] = screen.getAllByRole("textbox") as HTMLTextAreaElement[];
    expect(subject.value).toMatch(/Interview Invitation/i);
    expect(subject.value).toContain("Product Designer");
    expect(body.value).toContain("Dear Jordan");
  });

  it("swaps the draft when a different template is selected", () => {
    render(<EmailTemplates applicant={makeApplicant()} job={makeJob()} />);
    fireEvent.click(screen.getByRole("button", { name: /rejection/i }));
    const [subject] = screen.getAllByRole("textbox") as HTMLTextAreaElement[];
    expect(subject.value).toMatch(/Application Update/i);
  });

  it("falls back to a generic role name when the job is missing", () => {
    render(<EmailTemplates applicant={makeApplicant()} job={undefined} />);
    const [subject] = screen.getAllByRole("textbox") as HTMLTextAreaElement[];
    expect(subject.value).toContain("the position");
  });
});
