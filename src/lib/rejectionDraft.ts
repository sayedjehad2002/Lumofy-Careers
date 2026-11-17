/**
 * The note HR sends after rejecting several candidates at once.
 *
 * One message goes to everyone (addresses in BCC), so it cannot greet anyone by
 * name, and it only names the role when every recipient applied for the same one.
 * Same wording as the single-candidate rejection in EmailTemplates.
 */
export function bulkRejectionDraft(jobTitles: readonly string[]): { subject: string; body: string } {
  const distinct = [...new Set(jobTitles.map((t) => t.trim()).filter(Boolean))];
  const role = distinct.length === 1 ? `the ${distinct[0]} role` : "a role";
  const subject = distinct.length === 1
    ? `An update on your ${distinct[0]} application at Lumofy`
    : "An update on your application at Lumofy";
  const body = [
    "Hello,",
    "",
    `Thank you for the time and care you put into applying for ${role} at Lumofy.`,
    "",
    "After much thought, we've decided to move forward with other candidates this time. It was a hard decision and no reflection of your talent.",
    "",
    "This isn't a no for the future. We're growing across MENA and new roles open often, so we'd warmly welcome your application when the timing is right.",
    "",
    "Wishing you real success in your search.",
    "",
    "Warmly,",
    "People & Culture Team",
    "Lumofy",
  ].join("\n");
  return { subject, body };
}

/** Mail apps and browsers start dropping mailto links somewhere past 2,000 characters. */
const MAILTO_MAX = 1900;

/**
 * A mailto link with every address in BCC, so candidates never see each other.
 * Null when the link would be too long to open reliably: the caller then offers
 * copy buttons instead of a link that silently loses recipients.
 */
export function bccMailto(emails: readonly string[], subject: string, body: string): string | null {
  const unique = [...new Set(emails.map((e) => e.trim().toLowerCase()).filter(Boolean))];
  if (unique.length === 0) return null;
  const url = `mailto:?bcc=${unique.map(encodeURIComponent).join(",")}`
    + `&subject=${encodeURIComponent(subject)}`
    + `&body=${encodeURIComponent(body.replace(/\r?\n/g, "\r\n"))}`;
  return url.length > MAILTO_MAX ? null : url;
}
