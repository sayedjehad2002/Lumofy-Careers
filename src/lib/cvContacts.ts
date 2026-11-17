/**
 * Read a candidate's own contact details off their CV WITHOUT any AI.
 *
 * Why this exists: 147 applicants promoted from the CV Library had no email on
 * file. Measured on 2026-11-16 against their actual PDFs, 49 of them print one
 * plainly in the text layer (47 in text, 2 only as a clickable mailto link), and
 * the AI parse had simply missed it. Almost all of the rest are LinkedIn PDF
 * exports, which leave the email out — no reader, AI or not, can recover it.
 *
 * A pattern match cannot invent an address, which is the property that matters
 * here: these writes fill empty fields once and are then trusted for outreach.
 *
 * Pure functions only. The PDF reading that feeds them lives in
 * `readCvContacts` at the bottom, so the rules stay testable without a PDF.
 */

export type CvContacts = {
  email: string | null;
  phone: string | null;
  linkedin: string | null;
};

/**
 * Anchored on real TLDs because PDF text often fuses an address to the next
 * word ("a@gmail.comGitHub"). Same list as analyze-cv's EMAIL_IN_CV_TEXT, which
 * was verified against the fused forms and the "site.company" trap.
 */
const EMAIL_IN_TEXT =
  /[A-Za-z0-9._%+-]+@(?:[A-Za-z0-9-]+\.)+(?:com|net|org|edu|gov|mil|int|io|co|ai|me|info|biz|dev|app|xyz|online|site|tech|cloud|uk|us|ae|bh|sa|qa|kw|om|eg|jo|lb|iq|in|pk|bd|lk|de|fr|es|it|nl|be|se|no|fi|dk|pl|pt|ch|at|ie|ca|au|nz|jp|cn|kr|sg|my|ph|id|th|vn|tr|ru|ua|br|mx|ar|za|ng|ke)(?:\.[a-z]{2})?/gi;

const PERSONAL_PROVIDER =
  /@(?:gmail|googlemail|outlook|hotmail|live|yahoo|icloud|me|aol|proton|protonmail|msn|ymail|zoho)\.com$/i;

/** Addresses that are never the candidate's own. */
const NOT_A_PERSON = /^(no-?reply|donotreply|example|test|info|admin|support|hr|careers|jobs)@|@example\./i;

function tidyEmail(raw: string): string | null {
  const e = raw.trim().toLowerCase().replace(/^mailto:/, "").split("?")[0].replace(/[.,;:]+$/, "");
  if (e.length > 254 || !/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/.test(e)) return null;
  return NOT_A_PERSON.test(e) ? null : e;
}

/**
 * First plausible address in the text. CVs put the candidate's own contact
 * block at the top; referees and universities come later, so first wins.
 */
export function emailFromText(text: string): string | null {
  for (const m of text.matchAll(EMAIL_IN_TEXT)) {
    // A lowercase letter straight after the TLD means we cut a longer real
    // TLD or word: reject rather than store a wrong address. An uppercase
    // letter is a CamelCase boundary, so the cut is safe. (Checked in code:
    // with the /i flag an in-pattern [a-z] test would match uppercase too.)
    // Two safe exceptions, both seen in real CVs: a URL glued straight on
    // ("…@gmail.comhttps://github…"), and a well-known mail provider, which has
    // no longer domain the cut could belong to.
    const end = (m.index ?? 0) + m[0].length;
    const next = text[end];
    if (
      next && /[a-z0-9]/.test(next) &&
      !/^(?:https?|www)/i.test(text.slice(end, end + 5)) &&
      !PERSONAL_PROVIDER.test(m[0])
    ) continue;
    const e = tidyEmail(m[0]);
    if (e) return e;
  }
  return null;
}

const digitCount = (s: string) => s.replace(/\D/g, "").length;

function tidyPhone(raw: string): string | null {
  let t = raw.replace(/^tel:/i, "").replace(/\s+/g, " ").trim().replace(/[.,;:-]+$/, "");
  // Half a bracket pair is text-layer debris ("+973) 3333…" from "(+973) 3333…").
  if (t.includes(")") !== t.includes("(")) t = t.replace(/[()]/g, " ").replace(/\s+/g, " ").trim();
  // Right-to-left layouts can put the plus after the code ("973+ 3333…").
  if (t.indexOf("+") > 0) t = "+" + t.replace(/\+/g, "").trim();
  const n = digitCount(t);
  // Without a "+" an over-long run is more likely two numbers or an ID glued together.
  const max = t.startsWith("+") || t.startsWith("00") ? 15 : 12;
  return n >= 8 && n <= max && t.length <= 32 ? t : null;
}

/**
 * Only numbers we can be confident are a phone: an international form
 * (+973…, 00973…) or one sitting right after a phone label. A bare 8-digit run
 * could just as easily be an ID, a date range or a salary.
 */
export function phoneFromText(text: string): string | null {
  const intl = text.match(/(?:\+|\b00)\d[\d\s().-]{6,20}\d/);
  if (intl) {
    const p = tidyPhone(intl[0]);
    if (p) return p;
  }
  const labelled = text.match(
    /\b(?:phone|mobile|mob|tel|telephone|cell|whats?app|contact)(?:\s*(?:no|number|#))?\.?\s*[:\-–]?\s*(\+?\d[\d\s().-]{6,18}\d)/i,
  );
  return labelled ? tidyPhone(labelled[1]) : null;
}

function tidyLinkedin(slug: string): string | null {
  const s = slug.replace(/\s+/g, "").replace(/\/+$/, "");
  return /^[A-Za-z0-9_%-]{3,100}$/.test(s) ? `https://www.linkedin.com/in/${s}` : null;
}

/**
 * LinkedIn PDF exports print the profile URL wrapped across lines
 * ("linkedin.com/in/jane- doe-12345 (LinkedIn)"), so a plain slug match would
 * keep only "jane-". When the "(LinkedIn)" tail is there, join the pieces.
 */
export function linkedinFromText(text: string): string | null {
  const wrapped = text.match(/linkedin\.com\/in\/([A-Za-z0-9_%-]+(?:\s+[A-Za-z0-9_%-]+){0,3})\s*\(LinkedIn\)/i);
  if (wrapped) return tidyLinkedin(wrapped[1]);
  const plain = text.match(/linkedin\.com\/in\/([A-Za-z0-9_%-]+)/i);
  return plain ? tidyLinkedin(plain[1]) : null;
}

/**
 * Combine the text layer with the PDF's clickable links. A link is the most
 * exact source (the URL is stored whole, never wrapped or fused), so it wins
 * when both exist.
 */
export function findContacts(text: string, links: readonly string[] = []): CvContacts {
  const flat = text.replace(/\s+/g, " ");

  let email: string | null = null;
  for (const l of links) {
    if (/^mailto:/i.test(l) && (email = tidyEmail(l))) break;
  }
  email ??= emailFromText(flat);

  let phone: string | null = null;
  for (const l of links) {
    if (/^tel:/i.test(l) && (phone = tidyPhone(decodeURIComponentSafe(l)))) break;
  }
  phone ??= phoneFromText(flat);

  let linkedin: string | null = null;
  for (const l of links) {
    const m = l.match(/linkedin\.com\/in\/([^/?#\s]+)/i);
    if (m && (linkedin = tidyLinkedin(decodeURIComponentSafe(m[1])))) break;
  }
  linkedin ??= linkedinFromText(flat);

  return { email, phone, linkedin };
}

function decodeURIComponentSafe(s: string): string {
  try { return decodeURIComponent(s); } catch { return s; }
}

/** Which empty fields a reading can fill. Never overwrites what is on file. */
export function contactPatch(
  current: { email?: string | null; phone?: string | null; linkedin?: string | null },
  found: CvContacts,
): Partial<Record<keyof CvContacts, string>> {
  const patch: Partial<Record<keyof CvContacts, string>> = {};
  for (const k of ["email", "phone", "linkedin"] as const) {
    if (!String(current[k] ?? "").trim() && found[k]) patch[k] = found[k] as string;
  }
  return patch;
}

// ── Names ────────────────────────────────────────────────────────────────────

/**
 * Drop the debris a LinkedIn slug or a file name leaves on the end of a name:
 * the profile's hex id ("Hossam Farag 65b3818a") or our own company name from
 * "Name_Lumofy_CV.pdf". Never touches a name made only of that word.
 */
export function stripNameTail(name: string): string {
  const cleaned = name
    .trim()
    .replace(/\s+(?=[0-9a-f]*\d)[0-9a-f]{6,}$/i, "")
    .replace(/\s+lumofy$/i, "")
    .trim();
  return cleaned || name.trim();
}

/**
 * Put the spaces back into a name stored as one run ("Sarahshaikh"), using the
 * CV itself as the authority: accept only when consecutive words printed on the
 * CV spell exactly the stored name. Nothing is guessed — if the CV does not
 * print it that way, the name is left alone.
 */
export function repairGluedName(stored: string, cvText: string): string | null {
  const target = stored.trim().toLowerCase();
  if (target.length < 8 || !/^\p{L}+$/u.test(target)) return null;
  const words = cvText.slice(0, 20000).match(/\p{L}[\p{L}'’-]*/gu) ?? [];
  for (let i = 0; i < words.length; i++) {
    if (!target.startsWith(words[i].toLowerCase())) continue;
    let joined = "";
    for (let j = i; j < Math.min(i + 5, words.length); j++) {
      joined += words[j].toLowerCase();
      if (!target.startsWith(joined)) break;
      if (joined === target && j > i) {
        return words.slice(i, j + 1)
          .map((w) => w[0].toUpperCase() + w.slice(1).toLowerCase())
          .join(" ");
      }
    }
  }
  // Same words, other order: a file named "Trochinskaiadaria" for a CV that
  // prints "Daria Trochinskaia". Two adjacent words only, kept in the CV's order.
  for (let i = 0; i + 1 < words.length; i++) {
    const [a, b] = [words[i], words[i + 1]];
    if (a.length >= 3 && b.length >= 3 && (b + a).toLowerCase() === target) {
      return [a, b].map((w) => w[0].toUpperCase() + w.slice(1).toLowerCase()).join(" ");
    }
  }
  return null;
}

// ── PDF reading (browser) ────────────────────────────────────────────────────

export type CvReading =
  | { readable: true; contacts: CvContacts; /** Flattened text layer, for name repair. */ text: string }
  /** No text layer: a scanned image or a photo. Only OCR or a vision model can read it. */
  | { readable: false; reason: "no_text" | "not_pdf" | "download_failed" };

/**
 * Download a CV from a signed URL and read its contacts in the browser.
 * pdf.js runs reliably here (the edge runtime's PDF tooling does not), and it
 * is loaded on demand from the same pinned build the CV Library already uses,
 * so nothing heavy enters the dashboard bundle.
 */
export async function readCvContacts(signedUrl: string, fileName = ""): Promise<CvReading> {
  if (/\.docx?$/i.test(fileName)) return { readable: false, reason: "not_pdf" };
  let buf: Uint8Array;
  try {
    const res = await fetch(signedUrl);
    if (!res.ok) return { readable: false, reason: "download_failed" };
    buf = new Uint8Array(await res.arrayBuffer());
  } catch {
    return { readable: false, reason: "download_failed" };
  }
  return readCvBytes(buf);
}

/** Read a file the person has just picked, before it is uploaded anywhere. */
export async function readCvFile(file: File): Promise<CvReading> {
  if (/\.docx?$/i.test(file.name)) return { readable: false, reason: "not_pdf" };
  return readCvBytes(new Uint8Array(await file.arrayBuffer()));
}

async function readCvBytes(buf: Uint8Array): Promise<CvReading> {
  // "%PDF" — anything else (a renamed Word file, an image) has no text layer to read.
  if (buf.length < 4 || String.fromCharCode(...buf.slice(0, 4)) !== "%PDF") {
    return { readable: false, reason: "not_pdf" };
  }

  const unpdfUrl = "https://esm.sh/unpdf@0.12.1";
  const { extractText, getDocumentProxy } = await import(/* @vite-ignore */ unpdfUrl);
  const doc = await getDocumentProxy(buf);
  const { text } = await extractText(doc, { mergePages: true });

  const links: string[] = [];
  for (let i = 1; i <= Math.min(doc.numPages ?? 0, 10); i++) {
    try {
      const page = await doc.getPage(i);
      for (const a of await page.getAnnotations()) {
        if (typeof a?.url === "string") links.push(a.url);
        else if (typeof a?.unsafeUrl === "string") links.push(a.unsafeUrl);
      }
    } catch { /* a broken annotation must not cost us the text */ }
  }

  const flat = String(text || "").replace(/\s+/g, " ").trim();
  if (flat.length < 100 && links.length === 0) return { readable: false, reason: "no_text" };
  return { readable: true, contacts: findContacts(flat, links), text: flat.slice(0, 20000) };
}
