import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Two-letter initials from an email address for an avatar badge
 * ("jhasan@lumofy.com" -> "JH", "h.alhashimi@lumofy.com" -> "HA").
 * Prefers the first letter of each dot/underscore/hyphen-separated segment of
 * the local part; falls back to the first two characters when there's only one.
 */
export function emailInitials(email?: string | null): string {
  const local = (email || "").split("@")[0] || "";
  if (!local) return "??";
  const parts = local.split(/[._-]+/).filter(Boolean);
  const initials = parts.length >= 2 ? parts[0][0] + parts[1][0] : local.slice(0, 2);
  return initials.toUpperCase();
}

/**
 * Display a person's name in Title Case ("MARIAM KHALEAD YASEEN" -> "Mariam Khalead
 * Yaseen"). Only the first letter of each segment is capitalized and the rest is
 * lowercased — names are often stored ALL-CAPS, which reads as shouting in the UI.
 * Handles spaces, hyphens, and apostrophes ("AL-MOSAWI" -> "Al-Mosawi").
 */
export function toTitleCase(name?: string | null): string {
  if (!name) return "";
  return name
    .toLowerCase()
    .replace(/(^|[\s\-'’])([a-z])/g, (_, sep: string, ch: string) => sep + ch.toUpperCase());
}

/**
 * Job-title words that are never part of a person's name in a CV file name.
 * Kept identical to ROLE_WORD_RE in supabase/functions/cv-library-parse.
 */
const ROLE_WORD_RE = /^(hr|manager|senior|junior|lead|head|chief|engineer|developer|accountant|analyst|specialist|coordinator|consultant|executive|officer|assistant|intern|designer|architect|supervisor|director|recruiter|marketing|sales|finance|operations|admin|administrator)$/i;

/**
 * Derive a human display name from a CV's file name when the parser couldn't read
 * one off the page — e.g. "Ahmed_Al_Sagheer_CV.pdf" -> "Ahmed Al Sagheer". Returns
 * "" when the file name has no plausible human name (LinkedIn's "Profile.pdf",
 * "resume.pdf", "document.pdf"). Mirrors the server fallback in
 * supabase/functions/cv-library-parse so display and storage agree.
 */
export function deriveNameFromFilename(fileName?: string | null): string {
  if (!fileName) return "";
  let base = fileName.replace(/\.[^.]+$/, "");           // strip extension
  base = base.replace(/[._\-]+/g, " ");                   // separators -> spaces
  // Drop common CV words, versions, anonymization markers, and standalone numbers.
  // NOTE: no \b here — filenames are frequently concatenated ("MyResume.pdf",
  // "cvUpdated.pdf", "LinkedInProfile.pdf"), and a word-boundary match would leave
  // the noise glued to nothing and hand back "Myresume" as a person's name.
  base = base.replace(/(cv|resumee|resume|curriculum\s*vitae|vitae|profile|linkedin|final|updated?|latest|copy|draft|anonymous|anon|redacted|\d{2,4})/gi, " ");
  base = base.replace(/\s+/g, " ").trim();
  const junk = new Set([
    "document", "untitled", "download", "file", "the", "my", "mr", "mrs", "ms", "dr", "eng",
    // Document nouns: never a person, and common for phone scans / bulk uploads.
    "doc", "docs", "scan", "scanned", "screenshot", "image", "img", "photo", "picture",
    "attachment", "application", "applicant", "candidate", "passport", "id", "certificate",
    "template", "sample", "portfolio", "lebenslauf", "confidential", "interview", "new", "untitled1",
  ]);
  // Allow single-letter initials ("Leena A") — don't require every part to be 2+ chars.
  const words = base.split(" ").filter((w) => /^[A-Za-z][A-Za-z.'’-]*$/.test(w) && !junk.has(w.toLowerCase()));
  if (words.length === 0 || words.length > 6) return "";
  // Job titles are never a person's name: "HR_Manager_CV.pdf" must not become
  // "HR Manager", nor "Accountant.pdf" become "Accountant". Mirrors ROLE_WORD_RE
  // in supabase/functions/cv-library-parse so display and storage agree.
  if (words.some((w) => ROLE_WORD_RE.test(w))) return "";
  // A SINGLE surviving token is accepted only when it's a substantial word (>=3
  // letters) — "Resume_Kavya.pdf" loses "Resume" as noise and must still yield
  // "Kavya" (a first name beats showing nothing), while "Profile.pdf" / "a.pdf"
  // still resolve to "" because their only token is junk-listed or too short.
  if (words.length === 1) {
    const solo = words[0].replace(/[.'’-]/g, "");
    return solo.length >= 3 ? toTitleCase(words[0]) : "";
  }
  // Multi-word: require at least one real (multi-letter) part, so "a b c" isn't a name.
  if (!words.some((w) => w.replace(/[.'’-]/g, "").length >= 2)) return "";
  return toTitleCase(words.join(" "));
}

/**
 * The name to show for a CV-library candidate: their parsed name if present, else a
 * name derived from the uploaded file name, else "". Guarantees a candidate isn't
 * shown as "Unnamed" when the file name carries a name.
 */
export function candidateDisplayName(name?: string | null, fileName?: string | null): string {
  return toTitleCase(name) || deriveNameFromFilename(fileName);
}

/**
 * Placeholder strings that are NOT names. Older rows persisted these literally
 * (see addToPipeline), and the AI is instructed never to emit them. Mirrors
 * JUNK_NAMES in supabase/functions/_shared/taxonomy.ts.
 */
const JUNK_NAMES = new Set([
  "unknown", "unknown candidate", "n/a", "na", "none", "not found", "not provided",
  "unnamed", "unnamed candidate", "candidate", "the candidate", "anonymous", "redacted",
  "test", "null", "not available", "not mentioned", "-", "--",
]);

/** True when a stored name is a placeholder rather than a real person's name. */
export function isJunkName(name?: string | null): boolean {
  const n = (name || "").trim().toLowerCase();
  return n.length === 0 || JUNK_NAMES.has(n);
}

/**
 * The name to show for an APPLICANT: their stored name unless it's a junk
 * placeholder, else one derived from the CV file name, else "". Applied once at
 * the DB→app mapping boundary so every render site is fixed at the source.
 */
export function applicantDisplayName(fullName?: string | null, cvFileName?: string | null): string {
  if (!isJunkName(fullName)) return toTitleCase(fullName);
  return deriveNameFromFilename(cvFileName);
}
