import { z } from "zod";

/**
 * Single source of truth for apply-form field validation.
 *
 * We deliberately use zod for the *rules* (typed, unit-tested, reusable) while the
 * page keeps its existing controlled inputs + accessibility logic (smooth-scroll &
 * focus the first invalid field). CV-file and dynamic screening-question checks live
 * in the page because they depend on runtime state (the File object, the job's
 * question list), not on these static fields.
 */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Lenient URL shape: needs a scheme + host + dot (e.g. https://example.com).
// We keep it simple rather than full RFC — enough to catch obvious typos while
// not rejecting valid-but-unusual profile links.
const URL_RE = /^https?:\/\/.+\..+/i;

// Optional link field: empty/whitespace is allowed; if filled it must look like a URL.
const optionalUrl = (message: string) =>
  z
    .string()
    .trim()
    .optional()
    .refine((v) => !v || URL_RE.test(v), { message });

export const applicationSchema = z.object({
  fullName: z.string().trim().min(1, "Full name is required"),
  email: z.string().trim().regex(EMAIL_RE, "Valid email is required"),
  phone: z.string().trim().min(1, "Phone number is required"),
  location: z.string().trim().min(1, "Location is required"),
  nationality: z.string().trim().min(1, "Please select your nationality"),
  linkedin: optionalUrl("Enter a valid URL (https://…)"),
  portfolio: optionalUrl("Enter a valid URL (https://…)"),
  coverLetter: z.string().trim().optional(),
});

export type ApplicationFormValues = z.infer<typeof applicationSchema>;

/**
 * Validate the personal fields and return a flat `{ field: message }` map
 * (empty when valid) — the shape the apply page already renders per-field.
 */
export function getApplicationFieldErrors(values: unknown): Record<string, string> {
  const result = applicationSchema.safeParse(values);
  if (result.success) return {};
  const errs: Record<string, string> = {};
  for (const issue of result.error.issues) {
    const key = String(issue.path[0] ?? "");
    if (key && !errs[key]) errs[key] = issue.message; // keep the first message per field
  }
  return errs;
}
