import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
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
  // Drop common CV words, versions, and standalone numbers/dates.
  base = base.replace(/\b(cv|resume|resumee|curriculum\s*vitae|vitae|profile|final|updated?|latest|copy|new|draft|\d{2,4})\b/gi, " ");
  base = base.replace(/\s+/g, " ").trim();
  const junk = new Set(["document", "untitled", "download", "file", "the", "my", "mr", "mrs", "ms", "dr", "eng"]);
  const words = base.split(" ").filter((w) => /^[A-Za-z][A-Za-z.'’-]+$/.test(w) && !junk.has(w.toLowerCase()));
  if (words.length < 2 || words.length > 5) return "";    // need a plausible human name
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
