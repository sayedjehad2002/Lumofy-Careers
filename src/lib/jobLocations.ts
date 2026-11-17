/**
 * One spelling per place.
 *
 * Location used to be free text, so the public filter listed "Bahrain",
 * "Bahrain office", "Al Burhama, Manama", "Bahrain & Remote", "EGYPT" and "KSA"
 * as six different places. The job form now offers this list, and everything
 * that reads a location goes through `normalizeLocation` so older rows group
 * correctly without a data migration.
 */
export const JOB_LOCATIONS = ["Bahrain", "Saudi Arabia", "Egypt", "Remote", "Bahrain or Remote"] as const;

const PLACES: [RegExp, string][] = [
  [/bahrain|manama|burhama/i, "Bahrain"],
  [/\bksa\b|saudi|riyadh|jeddah/i, "Saudi Arabia"],
  [/egypt|cairo/i, "Egypt"],
  [/remote/i, "Remote"],
];

/** Every place a location string names. "Bahrain & Remote" is both, not a third place. */
export function locationFacets(raw: string | null | undefined): string[] {
  const text = String(raw ?? "").trim();
  if (!text) return [];
  const hits = PLACES.filter(([re]) => re.test(text)).map(([, name]) => name);
  return hits.length ? hits : [text];
}

/** The canonical label for a stored location. Unknown places pass through untouched. */
export function normalizeLocation(raw: string | null | undefined): string {
  const facets = locationFacets(raw);
  if (facets.length === 2 && facets.includes("Bahrain") && facets.includes("Remote")) return "Bahrain or Remote";
  return facets.length === 1 ? facets[0] : String(raw ?? "").trim();
}

const titleKey = (t: string) => t.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

/**
 * An open role whose title matches once case, spacing and punctuation are
 * ignored ("Full Stack Intern" vs "Full stack Intern"). Applicants split across
 * two listings of one role is the cost this warns about.
 */
export function findDuplicateTitle<T extends { id: string; title: string; status: string }>(
  title: string, jobs: readonly T[], selfId?: string,
): T | undefined {
  const key = titleKey(title);
  if (key.length < 3) return undefined;
  return jobs.find((j) => j.id !== selfId && j.status === "open" && titleKey(j.title) === key);
}
