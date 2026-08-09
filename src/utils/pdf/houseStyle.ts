// Lumofy PDF house style.
//
// Geometry and colour are measured from the approved JD template
// ("Account Manager JD.pdf"): A4, 1in margins, the horizontal logo lockup top
// left over a hairline rule, medium-grey dividers between sections, and the
// company address centred in the footer. Letterhead and footer repeat on every
// page. No colour blocks anywhere — the logo is the only colour on the sheet.
//
// Every PDF the product emits should be built from these primitives so the JD
// and the candidate report stay visually identical.
import jsPDF from "jspdf";
import lockupUrl from "@/assets/brand/lumofy-en-dark.png";

type RGB = readonly [number, number, number];

export const PAGE = {
  w: 210,
  h: 297,
  marginX: 25.4,
  contentW: 210 - 25.4 * 2,
  headRuleY: 26.8,
  bodyTop: 34,
  /** Last y a line may start at before it would collide with the footer. */
  bodyBottom: 266,
  footRuleY: 277.6,
  footTextY: 283.5,
} as const;

export const INK = {
  text: [12, 12, 12],
  muted: [110, 110, 110],
  hairline: [225, 226, 227],
  divider: [160, 160, 160],
} as const satisfies Record<string, RGB>;

export const TYPE = { title: 11.5, heading: 11, body: 10.5, footer: 9.5 } as const;

/** Body line height, and the hanging-indent geometry for bullets (0.25in / 0.5in). */
const LEAD = 4.9;
const BULLET_X = PAGE.marginX + 6.35;
const BULLET_TEXT_X = PAGE.marginX + 12.7;

const LOGO = { x: 25.4, y: 12.7, w: 34.6, h: 7.9 } as const;

export const FOOTER_LINE =
  "Lumofy Inc, Sixty Offices Building - Office 510, Al Burhama, Manama, +973-1742-0989";

const setText = (doc: jsPDF, c: RGB) => doc.setTextColor(c[0], c[1], c[2]);
const setDraw = (doc: jsPDF, c: RGB) => doc.setDrawColor(c[0], c[1], c[2]);

export interface Sheet {
  doc: jsPDF;
  /** Baseline for the next line of content. */
  y: number;
  logo: Lockup;
}

/** A PNG data URL. Deliberately NOT an HTMLImageElement: jsPDF rasterises an
 *  element through a canvas and embeds the result uncompressed, which cost ~590KB
 *  per document. Handed a data URL it keeps the PNG's own compression. */
export type Lockup = string | null;

/** Lets jsPDF store one copy of the lockup no matter how many pages draw it. */
export const LOCKUP_ALIAS = "lumofy-lockup";

// Bundled asset rather than an inlined base64 blob, so it is fetched once and
// only when someone actually exports a PDF.
let lockupPromise: Promise<Lockup> | null = null;

export function loadLockup(): Promise<Lockup> {
  if (!lockupPromise) {
    lockupPromise = fetch(lockupUrl)
      .then((r) => (r.ok ? r.blob() : Promise.reject(new Error(`logo ${r.status}`))))
      .then(
        (blob) =>
          new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(String(reader.result));
            reader.onerror = () => reject(reader.error);
            reader.readAsDataURL(blob);
          })
      )
      // A missing asset must not sink the export — letterhead() falls back to type.
      .catch(() => null);
  }
  return lockupPromise;
}

export function rule(doc: jsPDF, y: number, colour: RGB, thickness: number) {
  setDraw(doc, colour);
  doc.setLineWidth(thickness);
  doc.line(PAGE.marginX, y, PAGE.w - PAGE.marginX, y);
}

function letterhead(sheet: Sheet) {
  const { doc, logo } = sheet;
  if (logo) {
    doc.addImage(logo, "PNG", LOGO.x, LOGO.y, LOGO.w, LOGO.h, LOCKUP_ALIAS, "FAST");
  } else {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(17);
    setText(doc, INK.text);
    doc.text("Lumofy", LOGO.x, LOGO.y + 6.4);
  }
  rule(doc, PAGE.headRuleY, INK.hairline, 0.25);
}

export function createSheet(logo: Lockup, title: string): Sheet {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  doc.setProperties({ title });
  const sheet: Sheet = { doc, y: PAGE.bodyTop, logo };
  letterhead(sheet);
  return sheet;
}

export function newPage(sheet: Sheet) {
  sheet.doc.addPage();
  letterhead(sheet);
  sheet.y = PAGE.bodyTop;
}

/** Break to a new page when `needed` mm would overrun the footer. */
export function space(sheet: Sheet, needed: number) {
  if (sheet.y + needed > PAGE.bodyBottom) newPage(sheet);
}

export function heading(sheet: Sheet, text: string) {
  // Keep a heading with at least its first line of content.
  space(sheet, LEAD * 3);
  sheet.doc.setFont("helvetica", "bold");
  sheet.doc.setFontSize(TYPE.heading);
  setText(sheet.doc, INK.text);
  sheet.doc.text(text, PAGE.marginX, sheet.y);
  sheet.y += LEAD * 1.35;
}

export function title(sheet: Sheet, text: string) {
  sheet.doc.setFont("helvetica", "bold");
  sheet.doc.setFontSize(TYPE.title);
  setText(sheet.doc, INK.text);
  const lines = sheet.doc.splitTextToSize(text, PAGE.contentW) as string[];
  for (const line of lines) {
    space(sheet, LEAD);
    sheet.doc.text(line, PAGE.marginX, sheet.y);
    sheet.y += LEAD;
  }
}

export function paragraph(sheet: Sheet, text: string, colour: RGB = INK.text) {
  const { doc } = sheet;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(TYPE.body);
  setText(doc, colour);
  for (const line of doc.splitTextToSize(text, PAGE.contentW) as string[]) {
    space(sheet, LEAD);
    doc.text(line, PAGE.marginX, sheet.y);
    sheet.y += LEAD;
  }
}

export function bullets(sheet: Sheet, items: string[]) {
  const { doc } = sheet;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(TYPE.body);
  setText(doc, INK.text);
  const width = PAGE.w - PAGE.marginX - BULLET_TEXT_X;

  for (const item of items) {
    const lines = doc.splitTextToSize(item, width) as string[];
    // Start an item only where at least two of its lines fit, so a bullet never
    // leaves a single orphaned line at the foot of a page.
    space(sheet, Math.min(lines.length, 2) * LEAD);
    doc.text("•", BULLET_X, sheet.y);
    lines.forEach((line, i) => {
      if (i > 0) space(sheet, LEAD);
      doc.text(line, BULLET_TEXT_X, sheet.y);
      sheet.y += LEAD;
    });
    sheet.y += 2.5; // inter-item gap, measured off the template
  }
}

/** The medium-grey rule the template puts between major sections. */
export function divider(sheet: Sheet) {
  space(sheet, 14);
  sheet.y += 4.5;
  rule(sheet.doc, sheet.y, INK.divider, 0.35);
  sheet.y += 8;
}

/** Draw the footer on every page. Call once, last, after all content. */
export function finish(sheet: Sheet) {
  const { doc } = sheet;
  const pages = doc.getNumberOfPages();
  for (let p = 1; p <= pages; p++) {
    doc.setPage(p);
    rule(doc, PAGE.footRuleY, INK.hairline, 0.2);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(TYPE.footer);
    setText(doc, INK.muted);
    doc.text(FOOTER_LINE, PAGE.w / 2, PAGE.footTextY, { align: "center" });
  }
}
