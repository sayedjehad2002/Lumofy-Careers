// Generates a job description PDF in the Lumofy house style, for roles where HR
// has not uploaded one. Laid out to match the approved template: title, company,
// "Job Summary:", then divider-separated bullet sections.
//
// Built from the job's own fields, so it works for anonymous candidates too —
// get_public_jobs exposes every field used here.
import type { Job } from "@/types/careers";
import {
  bullets,
  createSheet,
  divider,
  finish,
  heading,
  INK,
  loadLockup,
  paragraph,
  title,
  TYPE,
  PAGE,
} from "./pdf/houseStyle";

/** Windows and macOS both reject these in filenames. */
function safeFileName(name: string) {
  return name.replace(/[\\/:*?"<>|]+/g, " ").replace(/\s+/g, " ").trim();
}

function clean(list: unknown): string[] {
  if (!Array.isArray(list)) return [];
  return list.map((v) => String(v ?? "").trim()).filter(Boolean);
}

export async function generateJobDescriptionPdf(job: Job) {
  const logo = await loadLockup();
  const sheet = createSheet(logo, `${job.title} - Job Description`);
  const { doc } = sheet;

  title(sheet, job.title);
  sheet.y += 2.4;
  title(sheet, "Lumofy");

  // Not in the template, which was written for one fixed role — but a candidate
  // reading a downloaded JD needs to know where the job is and what type it is.
  // Muted so it reads as secondary to the title block.
  const meta = [job.department, job.location, job.type].map((v) => (v ?? "").trim()).filter(Boolean);
  if (meta.length) {
    sheet.y += 1.2;
    paragraph(sheet, meta.join("  |  "), INK.muted);
  }

  const summary = (job.description || job.summary || "").trim();
  if (summary) {
    sheet.y += 2.4;
    heading(sheet, "Job Summary:");
    paragraph(sheet, summary);
  }

  const sections: Array<[string, string[]]> = [
    ["Duties and Responsibilities", clean(job.responsibilities)],
    ["Requirements", clean(job.requirements)],
    ["What We Offer", clean(job.benefits)],
  ];

  for (const [label, items] of sections) {
    if (!items.length) continue;
    divider(sheet);
    heading(sheet, label);
    bullets(sheet, items);
  }

  if (job.deadline) {
    divider(sheet);
    heading(sheet, "How to Apply");
    const by = new Date(job.deadline).toLocaleDateString("en-GB", {
      day: "numeric", month: "long", year: "numeric",
    });
    paragraph(sheet, `Apply at careers.lumofy.ai. Applications close on ${by}.`);
  } else {
    divider(sheet);
    heading(sheet, "How to Apply");
    paragraph(sheet, "Apply at careers.lumofy.ai.");
  }

  finish(sheet);
  doc.save(`${safeFileName(job.title)} - Lumofy JD.pdf`);
}
