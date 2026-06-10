// @ts-nocheck — jspdf-autotable Color types are overly strict with tuple inference
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { Applicant, Job, AIAnalysis } from "@/types/careers";

// Lumofy brand colors
const LUMOFY_BLUE: [number, number, number] = [37, 99, 235];
const LUMOFY_DARK: [number, number, number] = [15, 23, 42];
const LUMOFY_GRAY: [number, number, number] = [100, 116, 139];
const WHITE: [number, number, number] = [255, 255, 255];
const LIGHT_BG: [number, number, number] = [241, 245, 249];
const TABLE_LINE: [number, number, number] = [226, 232, 240];
const ALT_ROW: [number, number, number] = [248, 250, 252];

type RGB = [number, number, number];

// Helper to create standard table styles to avoid repetitive typing
function tableStyles(opts?: { bodyFontSize?: number }) {
  return {
    styles: { fontSize: opts?.bodyFontSize ?? 8, cellPadding: 2.5, textColor: LUMOFY_DARK },
    headStyles: { fillColor: LUMOFY_BLUE, textColor: WHITE, fontStyle: "bold" as const, fontSize: 8 },
    theme: "grid" as const,
    tableLineColor: TABLE_LINE,
    tableLineWidth: 0.2,
    margin: { left: 14, right: 14 },
  };
}

function drawHeader(doc: jsPDF, title: string) {
  const pageW = doc.internal.pageSize.getWidth();

  // Top gradient bar
  doc.setFillColor(...LUMOFY_BLUE);
  doc.rect(0, 0, pageW, 28, "F");

  // Subtle accent line
  doc.setFillColor(29, 78, 216); // darker blue
  doc.rect(0, 28, pageW, 1.5, "F");

  // Logo text
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(...WHITE);
  doc.text("LUMOFY", 14, 14);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text("Talent Hub", 14, 20);

  // Report title (right aligned)
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(title, pageW - 14, 14, { align: "right" });

  // Date
  doc.setFontSize(8);
  doc.text(
    `Generated: ${new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" })}`,
    pageW - 14, 20, { align: "right" }
  );
}

function drawFooter(doc: jsPDF, pageNum: number, totalPages: number) {
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();

  doc.setDrawColor(...(LIGHT_BG as unknown as RGB));
  doc.setLineWidth(0.5);
  doc.line(14, pageH - 16, pageW - 14, pageH - 16);

  doc.setFontSize(7);
  doc.setTextColor(...LUMOFY_GRAY);
  doc.setFont("helvetica", "normal");
  doc.text("CONFIDENTIAL — Lumofy Talent Hub", 14, pageH - 10);
  doc.text(`Page ${pageNum} of ${totalPages}`, pageW - 14, pageH - 10, { align: "right" });
}

function sectionTitle(doc: jsPDF, y: number, text: string, icon?: string): number {
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...LUMOFY_DARK);

  // Small accent bar
  doc.setFillColor(...LUMOFY_BLUE);
  doc.roundedRect(14, y - 1, 3, 6, 1, 1, "F");

  doc.text(text, 20, y + 4);
  return y + 10;
}

function labelValue(doc: jsPDF, y: number, label: string, value: string, x = 14, maxW = 80): number {
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...LUMOFY_GRAY);
  doc.text(label, x, y);

  doc.setFont("helvetica", "normal");
  doc.setTextColor(...LUMOFY_DARK);
  doc.text(value || "—", x, y + 4.5, { maxWidth: maxW });
  return y + 11;
}

function checkNewPage(doc: jsPDF, y: number, needed: number): number {
  const pageH = doc.internal.pageSize.getHeight();
  if (y + needed > pageH - 25) {
    doc.addPage();
    drawHeader(doc, "Candidate Report");
    return 38;
  }
  return y;
}

export function generateCandidateReport(applicant: Applicant, job: Job | undefined) {
  const doc = new jsPDF("p", "mm", "a4");
  const pageW = doc.internal.pageSize.getWidth();
  const contentW = pageW - 28;

  drawHeader(doc, "Candidate Report");

  let y = 38;

  // ─── Candidate Overview ─────────────────────────
  y = sectionTitle(doc, y, "Candidate Overview");

  // Name banner
  doc.setFillColor(...LIGHT_BG);
  doc.roundedRect(14, y, contentW, 14, 2, 2, "F");

  // Initial circle
  doc.setFillColor(...LUMOFY_BLUE);
  doc.circle(22, y + 7, 4, "F");
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...WHITE);
  doc.text(applicant.fullName.charAt(0).toUpperCase(), 22, y + 8.5, { align: "center" });

  doc.setFontSize(13);
  doc.setTextColor(...LUMOFY_DARK);
  doc.text(applicant.fullName, 30, y + 5.5);

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...LUMOFY_GRAY);
  doc.text(job?.title || "Position Not Specified", 30, y + 10.5);

  // Status badge (right side)
  const statusLabel = applicant.status.charAt(0).toUpperCase() + applicant.status.slice(1);
  const statusColor: Record<string, RGB> = {
    new: [59, 130, 246],
    reviewing: [234, 179, 8],
    shortlisted: [16, 185, 129],
    interview: [139, 92, 246],
    rejected: [239, 68, 68],
    hired: [34, 197, 94],
  };
  const sColor = statusColor[applicant.status] || LUMOFY_BLUE;
  const statusW = doc.getTextWidth(statusLabel) + 8;
  doc.setFillColor(...sColor);
  doc.roundedRect(pageW - 14 - statusW, y + 3, statusW, 7, 2, 2, "F");
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...WHITE);
  doc.text(statusLabel, pageW - 14 - statusW / 2, y + 7.8, { align: "center" });

  y += 20;

  // Contact info grid (2 columns)
  const col1 = 14;
  const col2 = pageW / 2 + 5;

  y = labelValue(doc, y, "EMAIL", applicant.email, col1, 75);
  labelValue(doc, y - 11, "PHONE", applicant.phone, col2, 75);

  y = labelValue(doc, y, "LOCATION", applicant.location, col1, 75);
  if (applicant.nationality) {
    labelValue(doc, y - 11, "NATIONALITY", applicant.nationality, col2, 75);
  }

  y = labelValue(doc, y, "APPLIED DATE",
    new Date(applicant.appliedDate).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }),
    col1, 75
  );

  if (applicant.linkedin) {
    labelValue(doc, y - 11, "LINKEDIN", applicant.linkedin, col2, 75);
  }
  if (applicant.portfolio) {
    y = labelValue(doc, y, "PORTFOLIO", applicant.portfolio, col1, 75);
  }

  y += 4;

  // ─── AI Analysis ─────────────────────────────────
  const ai = applicant.aiAnalysis;
  if (ai) {
    y = checkNewPage(doc, y, 80);
    y = sectionTitle(doc, y, "AI Analysis");

    // Score card
    doc.setFillColor(...LIGHT_BG);
    doc.roundedRect(14, y, contentW, 20, 2, 2, "F");

    // Fit score circle
    const scoreColor: RGB = ai.fitScore >= 70 ? [16, 185, 129] : ai.fitScore >= 40 ? [234, 179, 8] : [239, 68, 68];
    doc.setFillColor(...scoreColor);
    doc.circle(30, y + 10, 7, "F");
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...WHITE);
    doc.text(String(ai.fitScore), 30, y + 11.5, { align: "center" });

    doc.setFontSize(11);
    doc.setTextColor(...LUMOFY_DARK);
    doc.setFont("helvetica", "bold");
    doc.text(ai.fitLevel, 42, y + 7);

    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...LUMOFY_GRAY);
    doc.text(`Confidence: ${ai.confidence} | Analyzed: ${new Date(ai.analyzedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`, 42, y + 12);

    // Recommendation badge
    if (ai.recommendation) {
      const recColor: Record<string, RGB> = {
        "Fast-Track to Interview": [16, 185, 129],
        "Proceed to Next Stage": [59, 130, 246],
        "Hold for Review": [234, 179, 8],
        "Not Recommended": [239, 68, 68],
      };
      const rc = recColor[ai.recommendation] || LUMOFY_GRAY;
      const recW = doc.getTextWidth(ai.recommendation) + 8;
      doc.setFillColor(...rc);
      doc.roundedRect(pageW - 14 - recW, y + 5, recW, 7, 2, 2, "F");
      doc.setFontSize(7);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...WHITE);
      doc.text(ai.recommendation, pageW - 14 - recW / 2, y + 9.8, { align: "center" });
    }

    y += 26;

    // Score breakdown table
    if (ai.scoreBreakdown) {
      y = checkNewPage(doc, y, 40);
      const breakdownData = [
        ["Skills Match", `${ai.scoreBreakdown.skillsMatch}/100`],
        ["Tools Match", `${ai.scoreBreakdown.toolsMatch}/100`],
        ["Relevant Experience", `${ai.scoreBreakdown.relevantExperience}/100`],
        ["Industry Alignment", `${ai.scoreBreakdown.industryAlignment}/100`],
        ["Education Relevance", `${ai.scoreBreakdown.educationRelevance}/100`],
        ["Career Stability", `${ai.scoreBreakdown.careerStability}/100`],
      ];

      autoTable(doc, {
        startY: y,
        head: [["Scoring Category", "Score"]],
        body: breakdownData,
        margin: { left: 14, right: 14 },
        styles: { fontSize: 8, cellPadding: 2.5, textColor: LUMOFY_DARK as unknown as number[] },
        headStyles: { fillColor: LUMOFY_BLUE as unknown as number[], textColor: WHITE as unknown as number[], fontStyle: "bold", fontSize: 8 },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        theme: "grid",
        tableLineColor: [226, 232, 240],
        tableLineWidth: 0.2,
      });
      y = (doc as any).lastAutoTable.finalY + 6;
    }

    // Summary
    if (ai.summary) {
      y = checkNewPage(doc, y, 20);
      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...LUMOFY_GRAY);
      doc.text("AI SUMMARY", 14, y);
      y += 4;
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...LUMOFY_DARK);
      doc.setFontSize(8);
      const summaryLines = doc.splitTextToSize(ai.summary, contentW);
      doc.text(summaryLines, 14, y);
      y += summaryLines.length * 3.5 + 4;
    }

    // Strengths & Gaps table
    if (ai.strengths.length > 0 || ai.gaps.length > 0) {
      y = checkNewPage(doc, y, 30);
      const maxRows = Math.max(ai.strengths.length, ai.gaps.length);
      const sgData: string[][] = [];
      for (let i = 0; i < maxRows; i++) {
        sgData.push([
          ai.strengths[i] ? `✓  ${ai.strengths[i]}` : "",
          ai.gaps[i] ? `!  ${ai.gaps[i]}` : "",
        ]);
      }

      autoTable(doc, {
        startY: y,
        head: [["Strengths", "Gaps / Areas of Concern"]],
        body: sgData,
        margin: { left: 14, right: 14 },
        styles: { fontSize: 7.5, cellPadding: 2.5, textColor: LUMOFY_DARK as unknown as number[] },
        headStyles: { fillColor: LUMOFY_BLUE as unknown as number[], textColor: WHITE as unknown as number[], fontStyle: "bold", fontSize: 8 },
        columnStyles: {
          0: { cellWidth: contentW / 2 },
          1: { cellWidth: contentW / 2 },
        },
        theme: "grid",
        tableLineColor: [226, 232, 240],
        tableLineWidth: 0.2,
      });
      y = (doc as any).lastAutoTable.finalY + 6;
    }

    // Skills alignment
    if (ai.skillsAlignment && ai.skillsAlignment.length > 0) {
      y = checkNewPage(doc, y, 30);
      const skillsData = ai.skillsAlignment.map(s => [
        s.requiredSkill,
        s.evidence,
        s.detail,
      ]);

      autoTable(doc, {
        startY: y,
        head: [["Required Skill", "Match", "Evidence"]],
        body: skillsData,
        margin: { left: 14, right: 14 },
        styles: { fontSize: 7.5, cellPadding: 2, textColor: LUMOFY_DARK as unknown as number[] },
        headStyles: { fillColor: LUMOFY_BLUE as unknown as number[], textColor: WHITE as unknown as number[], fontStyle: "bold", fontSize: 8 },
        columnStyles: {
          0: { cellWidth: 40 },
          1: { cellWidth: 18, halign: "center" },
          2: { cellWidth: contentW - 58 },
        },
        theme: "grid",
        tableLineColor: [226, 232, 240],
        tableLineWidth: 0.2,
        didParseCell: (data: any) => {
          if (data.section === "body" && data.column.index === 1) {
            const val = data.cell.raw;
            if (val === "Yes") data.cell.styles.textColor = [16, 185, 129];
            else if (val === "Partial") data.cell.styles.textColor = [234, 179, 8];
            else data.cell.styles.textColor = [239, 68, 68];
          }
        },
      });
      y = (doc as any).lastAutoTable.finalY + 6;
    }

    // Experience verification
    if (ai.experienceVerification) {
      y = checkNewPage(doc, y, 25);
      autoTable(doc, {
        startY: y,
        head: [["Experience Metric", "Assessment"]],
        body: [
          ["Total Years", ai.experienceVerification.totalYears],
          ["Seniority Alignment", ai.experienceVerification.seniorityAlignment],
          ["Industry Relevance", ai.experienceVerification.industryRelevance],
        ],
        margin: { left: 14, right: 14 },
        styles: { fontSize: 8, cellPadding: 2.5, textColor: LUMOFY_DARK as unknown as number[] },
        headStyles: { fillColor: LUMOFY_BLUE as unknown as number[], textColor: WHITE as unknown as number[], fontStyle: "bold", fontSize: 8 },
        theme: "grid",
        tableLineColor: [226, 232, 240],
        tableLineWidth: 0.2,
      });
      y = (doc as any).lastAutoTable.finalY + 6;
    }

    // Interview questions
    if (ai.interviewQuestions && ai.interviewQuestions.length > 0) {
      y = checkNewPage(doc, y, 25);
      const iqData = ai.interviewQuestions.map((q, i) => [`${i + 1}`, q]);

      autoTable(doc, {
        startY: y,
        head: [["#", "Suggested Interview Question"]],
        body: iqData,
        margin: { left: 14, right: 14 },
        styles: { fontSize: 8, cellPadding: 2.5, textColor: LUMOFY_DARK as unknown as number[] },
        headStyles: { fillColor: LUMOFY_BLUE as unknown as number[], textColor: WHITE as unknown as number[], fontStyle: "bold", fontSize: 8 },
        columnStyles: { 0: { cellWidth: 10, halign: "center" } },
        theme: "grid",
        tableLineColor: [226, 232, 240],
        tableLineWidth: 0.2,
      });
      y = (doc as any).lastAutoTable.finalY + 6;
    }

    // Risk indicators & red flags
    const risks = [...(ai.riskIndicators || []), ...(ai.redFlags || [])];
    if (risks.length > 0) {
      y = checkNewPage(doc, y, 20);
      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...LUMOFY_GRAY);
      doc.text("RISK INDICATORS", 14, y);
      y += 4;
      doc.setFont("helvetica", "normal");
      doc.setTextColor(180, 50, 50);
      doc.setFontSize(7.5);
      risks.forEach(r => {
        y = checkNewPage(doc, y, 6);
        doc.text(`⚠  ${r}`, 16, y);
        y += 4;
      });
      y += 2;
    }

    // NOTE: the former "Predictive scores" table (interview success / offer
    // acceptance / turnover risk / growth potential) was deliberately removed —
    // those were unvalidated AI guesses with no model behind them, and the AI
    // trust policy bans unexplained probabilities from recruiter-facing output.

    // Verification checklist (v2 explainability — render when present)
    if (ai.verificationChecklist?.length) {
      y = checkNewPage(doc, y, 12);
      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...LUMOFY_GRAY);
      doc.text("VERIFY BEFORE DECIDING", 14, y);
      y += 4;
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...LUMOFY_DARK);
      doc.setFontSize(7.5);
      ai.verificationChecklist.forEach((item, i) => {
        y = checkNewPage(doc, y, 6);
        const lines = doc.splitTextToSize(`${i + 1}. ${item}`, 180);
        doc.text(lines, 16, y);
        y += lines.length * 4;
      });
      y += 2;
    }

    // Recommendation justification
    if (ai.recommendationJustification) {
      y = checkNewPage(doc, y, 20);
      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...LUMOFY_GRAY);
      doc.text("RECOMMENDATION JUSTIFICATION", 14, y);
      y += 4;
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...LUMOFY_DARK);
      const justLines = doc.splitTextToSize(ai.recommendationJustification, contentW);
      doc.text(justLines, 14, y);
      y += justLines.length * 3.5 + 4;
    }
  }

  // ─── Screening Answers ───────────────────────────
  if (job && job.screeningQuestions.length > 0) {
    y = checkNewPage(doc, y, 25);
    y = sectionTitle(doc, y, "Screening Answers");

    const qaData = job.screeningQuestions.map(q => [
      q.question,
      applicant.screeningAnswers[q.id] || "—",
    ]);

    autoTable(doc, {
      startY: y,
      head: [["Question", "Answer"]],
      body: qaData,
      margin: { left: 14, right: 14 },
      styles: { fontSize: 8, cellPadding: 3, textColor: LUMOFY_DARK as unknown as number[], overflow: "linebreak" },
      headStyles: { fillColor: LUMOFY_BLUE as unknown as number[], textColor: WHITE as unknown as number[], fontStyle: "bold", fontSize: 8 },
      columnStyles: {
        0: { cellWidth: contentW * 0.45, fontStyle: "bold" },
        1: { cellWidth: contentW * 0.55 },
      },
      theme: "grid",
      tableLineColor: [226, 232, 240],
      tableLineWidth: 0.2,
    });
    y = (doc as any).lastAutoTable.finalY + 6;
  }

  // ─── Candidate Rating ────────────────────────────
  if (applicant.rating) {
    y = checkNewPage(doc, y, 30);
    y = sectionTitle(doc, y, "Candidate Rating");

    const ratingData = Object.entries(applicant.rating).map(([key, val]) => [
      key.replace(/([A-Z])/g, " $1").trim(),
      `${"★".repeat(val as number)}${"☆".repeat(5 - (val as number))}`,
      `${val}/5`,
    ]);

    const avg = (
      (applicant.rating.communication +
        applicant.rating.roleFit +
        applicant.rating.technicalSkills +
        applicant.rating.cultureFit +
        applicant.rating.overallRecommendation) / 5
    ).toFixed(1);

    ratingData.push(["Average", "", `${avg}/5`]);

    autoTable(doc, {
      startY: y,
      head: [["Category", "Rating", "Score"]],
      body: ratingData,
      margin: { left: 14, right: 14 },
      styles: { fontSize: 8, cellPadding: 2.5, textColor: LUMOFY_DARK as unknown as number[] },
      headStyles: { fillColor: LUMOFY_BLUE as unknown as number[], textColor: WHITE as unknown as number[], fontStyle: "bold", fontSize: 8 },
      columnStyles: {
        1: { halign: "center", textColor: [234, 179, 8] as unknown as number[] },
        2: { halign: "center", fontStyle: "bold" },
      },
      theme: "grid",
      tableLineColor: [226, 232, 240],
      tableLineWidth: 0.2,
    });
    y = (doc as any).lastAutoTable.finalY + 6;
  }

  // ─── Internal Notes ──────────────────────────────
  if (applicant.notes.length > 0) {
    y = checkNewPage(doc, y, 20);
    y = sectionTitle(doc, y, "Internal Notes");

    const notesData = applicant.notes.map((note, i) => [`${i + 1}`, note]);

    autoTable(doc, {
      startY: y,
      head: [["#", "Note"]],
      body: notesData,
      margin: { left: 14, right: 14 },
      styles: { fontSize: 8, cellPadding: 2.5, textColor: LUMOFY_DARK as unknown as number[], overflow: "linebreak" },
      headStyles: { fillColor: LUMOFY_BLUE as unknown as number[], textColor: WHITE as unknown as number[], fontStyle: "bold", fontSize: 8 },
      columnStyles: { 0: { cellWidth: 10, halign: "center" } },
      theme: "grid",
      tableLineColor: [226, 232, 240],
      tableLineWidth: 0.2,
    });
  }

  // ─── Cover Letter ────────────────────────────────
  if (applicant.coverLetter) {
    y = (doc as any).lastAutoTable?.finalY + 8 || y + 4;
    y = checkNewPage(doc, y, 25);
    y = sectionTitle(doc, y, "Cover Letter");

    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...LUMOFY_DARK);
    const clLines = doc.splitTextToSize(applicant.coverLetter, contentW);
    clLines.forEach((line: string) => {
      y = checkNewPage(doc, y, 5);
      doc.text(line, 14, y);
      y += 3.5;
    });
  }

  // ─── Apply footers to all pages ──────────────────
  const totalPages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    drawFooter(doc, i, totalPages);
  }

  // ─── Save ────────────────────────────────────────
  const safeName = applicant.fullName.replace(/[^a-zA-Z0-9]/g, "_");
  doc.save(`Lumofy_Candidate_Report_${safeName}.pdf`);
}
