import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import RejectionNotice from "@/components/careers/applicants/RejectionNotice";

describe("RejectionNotice", () => {
  it("renders nothing until there is someone to tell", () => {
    const { container } = render(<RejectionNotice audience={null} onClose={vi.fn()} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("drafts one BCC message and says who will not get it", () => {
    render(
      <RejectionNotice
        audience={{ emails: ["a@x.com", "b@x.com"], withoutEmail: 1, jobTitles: ["Designer", "Designer", "Designer"] }}
        onClose={vi.fn()}
      />,
    );
    expect(screen.getByText(/2 candidates can be emailed/i)).toBeInTheDocument();
    expect(screen.getByText(/1 candidate has no email on file/i)).toBeInTheDocument();
    expect(screen.getByDisplayValue(/your Designer application/i)).toBeInTheDocument();
    const link = screen.getByRole("link", { name: /Open in email/i });
    expect(link.getAttribute("href")).toMatch(/^mailto:\?bcc=a%40x\.com,b%40x\.com&subject=/);
  });

  it("offers no message when nobody has an address", () => {
    render(<RejectionNotice audience={{ emails: [], withoutEmail: 3, jobTitles: ["Designer"] }} onClose={vi.fn()} />);
    expect(screen.getByText(/None of the rejected candidates has an email/i)).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Open in email/i })).not.toBeInTheDocument();
  });
});
