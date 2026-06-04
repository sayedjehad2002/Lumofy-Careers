import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface EmployeeRecord {
  employeeName: string;
  email?: string;
  department: string;
  departmentGroup?: string;
  jobTitle: string;
  lineManager: string;
  selfRating: number | null;
  managerRating: number | null;
  potentialScore: string | null;
  [key: string]: any;
}

interface AIAnalysisResult {
  executiveSummary?: {
    overallHealth: string;
    mainRisk: string;
    keyStrength: string;
    topPriority: string;
    outlook?: string;
  };
  organizationalObservations?: Array<{
    category: string;
    title: string;
    insight: string;
    severity: string;
  }>;
  departmentAnalysis?: Array<{
    department: string;
    healthScore: number;
    summary: string;
    strengths: string[];
    risks: string[];
  }>;
  redFlags?: Array<{
    employeeName: string;
    department: string;
    riskCategory: string;
    urgency: string;
    summary: string;
    recommendedAction?: string;
  }>;
  highPotentials?: Array<{
    employeeName: string;
    department: string;
    readinessTag: string;
    summary: string;
    developmentAction?: string;
  }>;
  topPerformers?: Array<{
    employeeName: string;
    department: string;
    selfReview?: number;
    managerReview?: number;
    consistencyTag: string;
    summary: string;
    retentionAction?: string;
  }>;
  strategicRecommendations?: {
    immediate?: Array<{ action: string; rationale: string }>;
    mediumTerm?: Array<{ action: string; rationale: string }>;
    longTerm?: Array<{ action: string; rationale: string }>;
  };
}

// ─── Helpers ───────────────────────────────────────────────
type Band = "Low" | "Medium" | "High";
function getBand(r: number | null): Band | null {
  if (r === null) return null;
  if (r < 3.0) return "Low";
  if (r < 3.5) return "Medium";
  return "High";
}

const BOX_LABELS: Record<string, string> = {
  "High-High": "Star", "Medium-High": "Growth Engine", "Low-High": "Enigma",
  "High-Medium": "Strong Performer", "Medium-Medium": "Core Player", "Low-Medium": "Underperformer",
  "High-Low": "Workhorse", "Medium-Low": "Effective", "Low-Low": "Risk",
};

function ensurePage(doc: jsPDF, yPos: number, needed: number, margin: number): number {
  if (yPos + needed > doc.internal.pageSize.getHeight() - 15) {
    doc.addPage();
    return margin;
  }
  return yPos;
}

// ─── Main export ───────────────────────────────────────────
export async function generatePerformanceReportPdf(
  employees: EmployeeRecord[],
  aiAnalysis: AIAnalysisResult | null
): Promise<void> {
  const doc = new jsPDF("p", "mm", "a4");
  const pw = doc.internal.pageSize.getWidth();
  const m = 15;
  let y = m;

  // ── Header ───────────────────────────────────────────────
  doc.setFillColor(79, 70, 229);
  doc.rect(0, 0, pw, 45, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(24);
  doc.setFont("helvetica", "bold");
  doc.text("Performance Management Report", m, 22);
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text(`Generated: ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}`, m, 32);
  doc.text(`Total Employees: ${employees.length}`, m, 39);
  doc.setFontSize(8);
  doc.text("CONFIDENTIAL", pw - m - 25, 39);
  y = 55;

  // ── KPI computation ──────────────────────────────────────
  const rated = employees.filter(e => e.managerRating !== null);
  const missingMgr = employees.length - rated.length;
  const missingSelf = employees.filter(e => e.selfRating === null).length;
  const completionPct = employees.length > 0 ? Math.round((rated.length / employees.length) * 100) : 0;
  const highPerf = employees.filter(e => e.managerRating !== null && e.managerRating >= 3.5).length;
  const redFlagCount = employees.filter(e => {
    if (e.managerRating !== null && e.managerRating < 3.0) return true;
    if (e.selfRating !== null && e.managerRating !== null && Math.abs(e.selfRating - e.managerRating) >= 1.5) return true;
    return false;
  }).length;

  // ── Executive Summary ────────────────────────────────────
  doc.setTextColor(30, 30, 30);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("Executive Summary", m, y);
  y += 8;

  if (aiAnalysis?.executiveSummary) {
    const exec = aiAnalysis.executiveSummary;
    const hc = exec.overallHealth === "Strong" ? [34, 197, 94] :
      exec.overallHealth === "Moderate" ? [234, 179, 8] :
      exec.overallHealth === "Needs Attention" ? [249, 115, 22] : [239, 68, 68];
    doc.setFillColor(hc[0], hc[1], hc[2]);
    doc.roundedRect(m, y, 35, 8, 2, 2, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text(exec.overallHealth || "N/A", m + 3, y + 5.5);
    y += 14;
    doc.setTextColor(60, 60, 60);
    doc.setFontSize(10);
    [
      { l: "Key Strength:", v: exec.keyStrength },
      { l: "Main Risk:", v: exec.mainRisk },
      { l: "Top Priority:", v: exec.topPriority },
    ].forEach(item => {
      if (item.v) {
        y = ensurePage(doc, y, 12, m);
        doc.setFont("helvetica", "bold");
        doc.text(item.l, m, y);
        doc.setFont("helvetica", "normal");
        const lines = doc.splitTextToSize(item.v, pw - m * 2 - 30);
        doc.text(lines, m + 30, y);
        y += lines.length * 5 + 3;
      }
    });
    if (exec.outlook) {
      y += 3;
      doc.setFont("helvetica", "italic");
      doc.setTextColor(100, 100, 100);
      const ol = doc.splitTextToSize(`"${exec.outlook}"`, pw - m * 2);
      doc.text(ol, m, y);
      y += ol.length * 5;
    }
  } else {
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text("AI analysis not yet generated.", m, y);
    y += 8;
  }
  y += 10;

  // ── KPIs table ───────────────────────────────────────────
  y = ensurePage(doc, y, 60, m);
  doc.setTextColor(30, 30, 30);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("Key Performance Indicators", m, y);
  y += 8;
  autoTable(doc, {
    startY: y,
    head: [],
    body: [
      ["Total Employees", String(employees.length)],
      ["Rated Employees", `${rated.length} (${completionPct}%)`],
      ["High Performers (≥3.5)", String(highPerf)],
      ["Red Flags", String(redFlagCount)],
      ["Missing Manager Ratings", String(missingMgr)],
      ["Missing Self Ratings", String(missingSelf)],
    ],
    theme: "plain",
    styles: { fontSize: 10, cellPadding: 4 },
    columnStyles: { 0: { fontStyle: "bold", cellWidth: 55 }, 1: { cellWidth: 40 } },
    margin: { left: m },
  });
  y = (doc as any).lastAutoTable.finalY + 12;

  // ── 9-Box Grid with Names ────────────────────────────────
  y = ensurePage(doc, y, 100, m);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(30, 30, 30);
  doc.text("9-Box Grid — Employee Placement", m, y);
  y += 8;

  // Build box data
  const boxEmps = new Map<string, string[]>();
  Object.keys(BOX_LABELS).forEach(k => boxEmps.set(k, []));
  employees.forEach(emp => {
    const sb = getBand(emp.selfRating);
    const mb = getBand(emp.managerRating);
    if (sb && mb) boxEmps.get(`${sb}-${mb}`)?.push(emp.employeeName);
  });

  // Render as table: Box | Count | Employees
  const boxTableRows = [
    "Low-High", "Medium-High", "High-High",
    "Low-Medium", "Medium-Medium", "High-Medium",
    "Low-Low", "Medium-Low", "High-Low",
  ].map(key => {
    const names = boxEmps.get(key) || [];
    return [BOX_LABELS[key], String(names.length), names.join(", ") || "—"];
  });

  autoTable(doc, {
    startY: y,
    head: [["Box", "#", "Employees"]],
    body: boxTableRows,
    theme: "striped",
    styles: { fontSize: 8, cellPadding: 3 },
    headStyles: { fillColor: [79, 70, 229], textColor: 255 },
    columnStyles: { 0: { cellWidth: 30, fontStyle: "bold" }, 1: { cellWidth: 10, halign: "center" }, 2: { cellWidth: "auto" } },
    margin: { left: m, right: m },
  });
  y = (doc as any).lastAutoTable.finalY + 12;

  // ── Department Analysis ──────────────────────────────────
  if (aiAnalysis?.departmentAnalysis?.length) {
    y = ensurePage(doc, y, 60, m);
    doc.setTextColor(30, 30, 30);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Department Analysis", m, y);
    y += 8;
    autoTable(doc, {
      startY: y,
      head: [["Department", "Health", "Summary"]],
      body: aiAnalysis.departmentAnalysis.map(d => [d.department, `${d.healthScore}/10`, d.summary]),
      theme: "striped",
      styles: { fontSize: 9, cellPadding: 3 },
      headStyles: { fillColor: [79, 70, 229], textColor: 255 },
      columnStyles: { 0: { cellWidth: 35, fontStyle: "bold" }, 1: { cellWidth: 18, halign: "center" } },
      margin: { left: m, right: m },
    });
    y = (doc as any).lastAutoTable.finalY + 12;
  }

  // ── Red Flags (ALL) ──────────────────────────────────────
  if (aiAnalysis?.redFlags?.length) {
    y = ensurePage(doc, y, 60, m);
    doc.setTextColor(239, 68, 68);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Red Flag Employees", m, y);
    y += 8;
    autoTable(doc, {
      startY: y,
      head: [["Employee", "Dept", "Risk", "Urgency", "Summary", "Action"]],
      body: aiAnalysis.redFlags.map(rf => [
        rf.employeeName, rf.department, rf.riskCategory, rf.urgency, rf.summary, rf.recommendedAction || "",
      ]),
      theme: "striped",
      styles: { fontSize: 7, cellPadding: 2 },
      headStyles: { fillColor: [239, 68, 68], textColor: 255 },
      columnStyles: { 0: { cellWidth: 24 }, 1: { cellWidth: 20 }, 2: { cellWidth: 22 }, 3: { cellWidth: 14 } },
      margin: { left: m, right: m },
    });
    y = (doc as any).lastAutoTable.finalY + 12;
  }

  // ── Top Performers ───────────────────────────────────────
  if (aiAnalysis?.topPerformers?.length) {
    y = ensurePage(doc, y, 60, m);
    doc.setTextColor(34, 197, 94);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Top Performers", m, y);
    y += 8;
    autoTable(doc, {
      startY: y,
      head: [["Employee", "Dept", "Self", "Mgr", "Tag", "Summary"]],
      body: aiAnalysis.topPerformers.map(tp => [
        tp.employeeName, tp.department,
        tp.selfReview?.toFixed(1) ?? "", tp.managerReview?.toFixed(1) ?? "",
        tp.consistencyTag, tp.summary,
      ]),
      theme: "striped",
      styles: { fontSize: 7, cellPadding: 2 },
      headStyles: { fillColor: [34, 197, 94], textColor: 255 },
      columnStyles: { 0: { cellWidth: 24 }, 1: { cellWidth: 20 }, 2: { cellWidth: 10 }, 3: { cellWidth: 10 }, 4: { cellWidth: 24 } },
      margin: { left: m, right: m },
    });
    y = (doc as any).lastAutoTable.finalY + 12;
  }

  // ── High Potentials (ALL) ────────────────────────────────
  if (aiAnalysis?.highPotentials?.length) {
    y = ensurePage(doc, y, 60, m);
    doc.setTextColor(79, 70, 229);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("High Potential Talent", m, y);
    y += 8;
    autoTable(doc, {
      startY: y,
      head: [["Employee", "Dept", "Readiness", "Summary", "Development Action"]],
      body: aiAnalysis.highPotentials.map(hp => [
        hp.employeeName, hp.department, hp.readinessTag, hp.summary, hp.developmentAction || "",
      ]),
      theme: "striped",
      styles: { fontSize: 7, cellPadding: 2 },
      headStyles: { fillColor: [79, 70, 229], textColor: 255 },
      columnStyles: { 0: { cellWidth: 24 }, 1: { cellWidth: 20 }, 2: { cellWidth: 24 } },
      margin: { left: m, right: m },
    });
    y = (doc as any).lastAutoTable.finalY + 12;
  }

  // ── Strategic Recommendations ────────────────────────────
  if (aiAnalysis?.strategicRecommendations) {
    const recs = aiAnalysis.strategicRecommendations;
    y = ensurePage(doc, y, 80, m);
    doc.setTextColor(30, 30, 30);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Strategic Recommendations", m, y);
    y += 10;
    const sections = [
      { title: "Immediate (0-30 days)", items: recs.immediate, color: [239, 68, 68] as [number, number, number] },
      { title: "Medium-Term (30-90 days)", items: recs.mediumTerm, color: [234, 179, 8] as [number, number, number] },
      { title: "Long-Term Strategic", items: recs.longTerm, color: [34, 197, 94] as [number, number, number] },
    ];
    for (const sec of sections) {
      if (sec.items?.length) {
        y = ensurePage(doc, y, 40, m);
        doc.setFillColor(...sec.color);
        doc.roundedRect(m, y, 4, 8, 1, 1, "F");
        doc.setTextColor(60, 60, 60);
        doc.setFontSize(11);
        doc.setFont("helvetica", "bold");
        doc.text(sec.title, m + 8, y + 6);
        y += 12;
        doc.setFontSize(9);
        sec.items.forEach((item, idx) => {
          y = ensurePage(doc, y, 15, m);
          doc.setFont("helvetica", "bold");
          doc.text(`${idx + 1}. ${item.action}`, m + 8, y);
          y += 5;
          if (item.rationale) {
            doc.setFont("helvetica", "normal");
            doc.setTextColor(100, 100, 100);
            const lines = doc.splitTextToSize(item.rationale, pw - m * 2 - 15);
            doc.text(lines, m + 12, y);
            y += lines.length * 4 + 3;
            doc.setTextColor(60, 60, 60);
          }
        });
        y += 5;
      }
    }
  }

  // ── Footer ───────────────────────────────────────────────
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(
      `Page ${i} of ${totalPages} | Lumofy Performance Report | Confidential`,
      pw / 2, doc.internal.pageSize.getHeight() - 8, { align: "center" }
    );
  }

  const timestamp = new Date().toISOString().split("T")[0];
  doc.save(`Performance_Report_${timestamp}.pdf`);
}
