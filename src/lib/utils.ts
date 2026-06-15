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
