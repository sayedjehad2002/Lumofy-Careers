import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// ─── Types ────────────────────────────────────────────────
interface BandData {
  label: string;
  range: string;
  count: number;
  pct: number;
  interpretation: string;
}

interface DeptData {
  dept: string;
  count: number;
  avg: number;
  riskFlag: string;
}

interface ManagerData {
  name: string;
  directReports: number;
  avgRating: number;
  spread: number;
  flag: string;
}

interface KPIs {
  totalReviewed: number;
  avgRating: number;
  highestDept: string;
  lowestDept: string;
  highPerfPct: number;
  lowPerfPct: number;
  meetsExpPct: number;
  compressedMgr: string;
}

export interface BellCurveReportData {
  kpis: KPIs;
  bands: BandData[];
  deptAnalysis: DeptData[];
  managerAnalysis: ManagerData[];
  healthScore: number;
  ratingSource: string;
  filterDept: string;
  filterManager: string;
  mean: number;
  stdDev: number;
  total: number;
  aiInsights?: string | null;
}

// ─── Colors ───────────────────────────────────────────────
const BRAND = { primary: [99, 102, 241] as const, dark: [15, 23, 42] as const, white: [255, 255, 255] as const };
const BAND_PDF_COLORS: [number, number, number][] = [
  [239, 68, 68], [249, 115, 22], [59, 130, 246], [16, 185, 129], [139, 92, 246],
];

// ─── Helpers ──────────────────────────────────────────────
function addPageFooter(pdf: jsPDF, pageNum: number, totalPages: number) {
  const h = pdf.internal.pageSize.getHeight();
  const w = pdf.internal.pageSize.getWidth();
  pdf.setDrawColor(200, 200, 210);
  pdf.line(20, h - 18, w - 20, h - 18);
  pdf.setFontSize(7);
  pdf.setTextColor(150);
  pdf.text(`Lumofy HR Intelligence · Bell Curve & Calibration Report · Confidential`, 20, h - 12);
  pdf.text(`Page ${pageNum} of ${totalPages}`, w - 20, h - 12, { align: "right" });
}

function ensureSpace(pdf: jsPDF, needed: number, currentY: number): number {
  if (currentY + needed > pdf.internal.pageSize.getHeight() - 25) {
    pdf.addPage();
    return 25;
  }
  return currentY;
}

// ─── Main Export ──────────────────────────────────────────
export function exportBellCurvePDF(data: BellCurveReportData) {
  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const W = pdf.internal.pageSize.getWidth();
  const M = 20;
  const CW = W - M * 2; // content width

  // ══════════ PAGE 1: COVER ══════════
  // Gradient header
  const [pr, pg, pb] = BRAND.primary;
  const [dr, dg, db] = BRAND.dark;
  for (let i = 0; i < 55; i++) {
    const t = i / 55;
    pdf.setFillColor(
      Math.round(dr + (pr - dr) * t * 0.5),
      Math.round(dg + (pg - dg) * t * 0.5),
      Math.round(db + (pb - db) * t * 0.5)
    );
    pdf.rect(0, i, W, 1, "F");
  }

  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(24);
  pdf.setFont("helvetica", "bold");
  pdf.text("Bell Curve & Calibration", M, 22);
  pdf.setFontSize(11);
  pdf.setFont("helvetica", "normal");
  pdf.text("Performance Distribution Analysis Report", M, 30);

  // Meta info bar
  pdf.setFontSize(8);
  pdf.setTextColor(200, 205, 230);
  const dateStr = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  const filters = [
    `Date: ${dateStr}`,
    `Source: ${data.ratingSource}`,
    data.filterDept !== "all" ? `Dept: ${data.filterDept}` : null,
    data.filterManager !== "all" ? `Manager: ${data.filterManager}` : null,
  ].filter(Boolean).join("  ·  ");
  pdf.text(filters, M, 42);

  // ── Calibration Health Score Box ──
  let y = 65;
  pdf.setFillColor(245, 245, 255);
  pdf.roundedRect(M, y, CW, 28, 3, 3, "F");
  pdf.setFontSize(9);
  pdf.setTextColor(100);
  pdf.text("CALIBRATION HEALTH SCORE", M + 6, y + 8);
  pdf.setFontSize(28);
  pdf.setFont("helvetica", "bold");
  const healthColor = data.healthScore >= 75 ? [16, 185, 129] : data.healthScore >= 50 ? [245, 158, 11] : [239, 68, 68];
  pdf.setTextColor(healthColor[0], healthColor[1], healthColor[2]);
  pdf.text(`${data.healthScore}`, M + 6, y + 23);
  pdf.setFontSize(10);
  pdf.setTextColor(100);
  const healthLabel = data.healthScore >= 75 ? "Healthy" : data.healthScore >= 50 ? "Needs Review" : "At Risk";
  pdf.text(`/ 100 — ${healthLabel}`, M + 26, y + 23);

  // Progress bar
  const barX = M + 80;
  const barW = CW - 86;
  pdf.setFillColor(230, 230, 240);
  pdf.roundedRect(barX, y + 17, barW, 4, 2, 2, "F");
  pdf.setFillColor(healthColor[0], healthColor[1], healthColor[2]);
  pdf.roundedRect(barX, y + 17, barW * (data.healthScore / 100), 4, 2, 2, "F");

  // ── KPI Cards ──
  y = 100;
  pdf.setFontSize(11);
  pdf.setFont("helvetica", "bold");
  pdf.setTextColor(33, 33, 33);
  pdf.text("Key Performance Indicators", M, y);
  y += 8;

  const kpiItems = [
    { label: "Total Reviewed", value: `${data.kpis.totalReviewed}` },
    { label: "Average Rating", value: data.kpis.avgRating.toFixed(2) },
    { label: "Mean (μ)", value: data.mean.toFixed(2) },
    { label: "Std Dev (σ)", value: data.stdDev.toFixed(2) },
    { label: "High Performers", value: `${data.kpis.highPerfPct}%` },
    { label: "Low Performers", value: `${data.kpis.lowPerfPct}%` },
    { label: "Meets Expectations", value: `${data.kpis.meetsExpPct}%` },
    { label: "Top Dept", value: data.kpis.highestDept },
    { label: "Bottom Dept", value: data.kpis.lowestDept },
    { label: "Rating Compression", value: data.kpis.compressedMgr },
  ];

  const colW = CW / 5;
  kpiItems.forEach((kpi, i) => {
    const col = i % 5;
    const row = Math.floor(i / 5);
    const cx = M + col * colW;
    const cy = y + row * 20;
    pdf.setFillColor(248, 248, 252);
    pdf.roundedRect(cx, cy, colW - 3, 17, 2, 2, "F");
    pdf.setFontSize(7);
    pdf.setFont("helvetica", "normal");
    pdf.setTextColor(120);
    pdf.text(kpi.label.toUpperCase(), cx + 3, cy + 6);
    pdf.setFontSize(11);
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(33, 33, 33);
    const val = kpi.value.length > 14 ? kpi.value.substring(0, 13) + "…" : kpi.value;
    pdf.text(val, cx + 3, cy + 13);
  });

  // ── Distribution Table ──
  y += 50;
  y = ensureSpace(pdf, 60, y);
  pdf.setFontSize(11);
  pdf.setFont("helvetica", "bold");
  pdf.setTextColor(33, 33, 33);
  pdf.text("Rating Distribution Breakdown", M, y);
  y += 3;

  const tableHead = [["Rating Band", "Range", "Count", "% of Total", "Interpretation"]];
  const tableBody = data.bands.map((b, i) => [b.label, b.range, `${b.count}`, `${b.pct}%`, b.interpretation]);

  autoTable(pdf, {
    startY: y,
    head: tableHead,
    body: tableBody,
    margin: { left: M, right: M },
    styles: { fontSize: 8, cellPadding: 3, lineColor: [230, 230, 240], lineWidth: 0.2 },
    headStyles: { fillColor: [pr, pg, pb], textColor: [255, 255, 255], fontStyle: "bold", fontSize: 7.5 },
    alternateRowStyles: { fillColor: [248, 248, 252] },
    columnStyles: {
      0: { fontStyle: "bold", cellWidth: 30 },
      1: { cellWidth: 22 },
      2: { cellWidth: 15, halign: "center" },
      3: { cellWidth: 18, halign: "center" },
      4: { cellWidth: "auto" },
    },
    didDrawCell: (d: any) => {
      if (d.section === "body" && d.column.index === 0) {
        const color = BAND_PDF_COLORS[d.row.index] || [100, 100, 100];
        pdf.setFillColor(color[0], color[1], color[2]);
        pdf.circle(d.cell.x + 2, d.cell.y + d.cell.height / 2, 1.5, "F");
      }
    },
  });

  y = (pdf as any).lastAutoTable.finalY + 8;

  // ══════════ PAGE 2+: DEPARTMENT & MANAGER ══════════
  if (data.deptAnalysis.length > 0) {
    y = ensureSpace(pdf, 50, y);
    pdf.setFontSize(11);
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(33, 33, 33);
    pdf.text("Department Distribution Analysis", M, y);
    y += 3;

    const deptHead = [["Department", "Employees", "Avg Rating", "Risk Signal"]];
    const deptBody = data.deptAnalysis.map(d => [
      d.dept, `${d.count}`, d.avg.toFixed(2), d.riskFlag || "No Risk",
    ]);

    autoTable(pdf, {
      startY: y,
      head: deptHead,
      body: deptBody,
      margin: { left: M, right: M },
      styles: { fontSize: 8, cellPadding: 3, lineColor: [230, 230, 240], lineWidth: 0.2 },
      headStyles: { fillColor: [pr, pg, pb], textColor: [255, 255, 255], fontStyle: "bold", fontSize: 7.5 },
      alternateRowStyles: { fillColor: [248, 248, 252] },
      columnStyles: {
        0: { fontStyle: "bold" },
        3: { fontStyle: "italic" },
      },
      didDrawCell: (d: any) => {
        if (d.section === "body" && d.column.index === 3) {
          const flag = d.cell.raw as string;
          if (flag.includes("Inflation")) pdf.setTextColor(239, 68, 68);
          else if (flag.includes("Compression")) pdf.setTextColor(245, 158, 11);
          else if (flag.includes("Low")) pdf.setTextColor(249, 115, 22);
          else pdf.setTextColor(16, 185, 129);
        }
      },
    });

    y = (pdf as any).lastAutoTable.finalY + 8;
  }

  // Manager Calibration
  if (data.managerAnalysis.length > 0) {
    y = ensureSpace(pdf, 50, y);
    pdf.setFontSize(11);
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(33, 33, 33);
    pdf.text("Manager Calibration Flags", M, y);
    y += 3;

    const mgrHead = [["Manager", "Reports", "Avg Rating", "Spread", "Calibration Flag"]];
    const mgrBody = data.managerAnalysis.map(m => [
      m.name, `${m.directReports}`, m.avgRating.toFixed(2), m.spread.toFixed(2), m.flag,
    ]);

    autoTable(pdf, {
      startY: y,
      head: mgrHead,
      body: mgrBody,
      margin: { left: M, right: M },
      styles: { fontSize: 8, cellPadding: 3, lineColor: [230, 230, 240], lineWidth: 0.2 },
      headStyles: { fillColor: [pr, pg, pb], textColor: [255, 255, 255], fontStyle: "bold", fontSize: 7.5 },
      alternateRowStyles: { fillColor: [248, 248, 252] },
      columnStyles: {
        0: { fontStyle: "bold" },
        4: { fontStyle: "bold" },
      },
      didDrawCell: (d: any) => {
        if (d.section === "body" && d.column.index === 4) {
          const flag = d.cell.raw as string;
          if (flag.includes("Inflation")) pdf.setTextColor(239, 68, 68);
          else if (flag.includes("Compression")) pdf.setTextColor(245, 158, 11);
          else if (flag.includes("Strictness")) pdf.setTextColor(249, 115, 22);
          else if (flag.includes("Balanced")) pdf.setTextColor(16, 185, 129);
          else pdf.setTextColor(150, 150, 150);
        }
      },
    });

    y = (pdf as any).lastAutoTable.finalY + 8;
  }

  // AI Insights
  if (data.aiInsights) {
    y = ensureSpace(pdf, 40, y);
    pdf.setFillColor(245, 243, 255);
    pdf.roundedRect(M, y, CW, 8, 2, 2, "F");
    pdf.setFontSize(9);
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(pr, pg, pb);
    pdf.text("✦  AI Calibration Insights", M + 4, y + 5.5);
    y += 12;

    pdf.setFontSize(8.5);
    pdf.setFont("helvetica", "normal");
    pdf.setTextColor(60, 60, 70);
    const insightLines = pdf.splitTextToSize(data.aiInsights, CW - 4);
    for (const line of insightLines) {
      y = ensureSpace(pdf, 6, y);
      pdf.text(line, M + 2, y);
      y += 4.5;
    }
  }

  // ── Footers ──
  const totalPages = pdf.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    pdf.setPage(i);
    addPageFooter(pdf, i, totalPages);
  }

  pdf.save(`Bell_Curve_Calibration_Report_${new Date().toISOString().slice(0, 10)}.pdf`);
}
