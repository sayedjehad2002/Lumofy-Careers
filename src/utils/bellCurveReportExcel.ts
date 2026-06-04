import * as XLSX from "xlsx";

export interface BellCurveExcelData {
  kpis: {
    totalReviewed: number;
    avgRating: number;
    highestDept: string;
    lowestDept: string;
    highPerfPct: number;
    lowPerfPct: number;
    meetsExpPct: number;
    compressedMgr: string;
  };
  bands: { label: string; range: string; count: number; pct: number; interpretation: string }[];
  deptAnalysis: { dept: string; count: number; avg: number; riskFlag: string }[];
  managerAnalysis: { name: string; directReports: number; avgRating: number; spread: number; flag: string }[];
  healthScore: number;
  ratingSource: string;
  filterDept: string;
  filterManager: string;
  mean: number;
  stdDev: number;
  total: number;
  aiInsights?: string | null;
  employees?: { employeeName: string; department: string; lineManager: string; rating: number | null }[];
}

function applyHeaderStyle(ws: XLSX.WorkSheet, range: string) {
  // xlsx community edition doesn't support styling, but we set column widths for usability
  return ws;
}

function addAutoFilter(ws: XLSX.WorkSheet, rangeStr: string) {
  ws["!autofilter"] = { ref: rangeStr };
}

export function exportBellCurveExcel(data: BellCurveExcelData) {
  const wb = XLSX.utils.book_new();
  const dateStr = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

  // ═══ Sheet 1: Executive Summary ═══
  const summaryRows = [
    ["BELL CURVE & CALIBRATION REPORT"],
    [],
    ["Report Details"],
    ["Generated Date", dateStr],
    ["Rating Source", data.ratingSource],
    ["Department Filter", data.filterDept === "all" ? "All Departments" : data.filterDept],
    ["Manager Filter", data.filterManager === "all" ? "All Managers" : data.filterManager],
    [],
    ["Calibration Health Score", data.healthScore, data.healthScore >= 75 ? "Healthy" : data.healthScore >= 50 ? "Needs Review" : "At Risk"],
    [],
    ["Key Performance Indicators"],
    ["Metric", "Value"],
    ["Total Employees Reviewed", data.kpis.totalReviewed],
    ["Average Rating", Number(data.kpis.avgRating.toFixed(2))],
    ["Mean (μ)", Number(data.mean.toFixed(2))],
    ["Standard Deviation (σ)", Number(data.stdDev.toFixed(2))],
    ["High Performers (≥3.5)", `${data.kpis.highPerfPct}%`],
    ["Low Performers (<2.0)", `${data.kpis.lowPerfPct}%`],
    ["Meets Expectations (3.0–3.49)", `${data.kpis.meetsExpPct}%`],
    ["Top Performing Department", data.kpis.highestDept],
    ["Lowest Performing Department", data.kpis.lowestDept],
    ["Rating Compression Flag", data.kpis.compressedMgr],
  ];
  const wsSummary = XLSX.utils.aoa_to_sheet(summaryRows);
  wsSummary["!cols"] = [{ wch: 32 }, { wch: 24 }, { wch: 16 }];
  // Merge title row
  wsSummary["!merges"] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 2 } }];
  XLSX.utils.book_append_sheet(wb, wsSummary, "Executive Summary");

  // ═══ Sheet 2: Rating Distribution ═══
  const distHeader = ["Rating Band", "Score Range", "Employee Count", "% of Total", "Cumulative %", "Interpretation"];
  let cumPct = 0;
  const distRows = data.bands.map(b => {
    cumPct += b.pct;
    return [b.label, b.range, b.count, `${b.pct}%`, `${cumPct}%`, b.interpretation];
  });
  distRows.push(["TOTAL", "", data.total, "100%", "", ""]);
  const wsDist = XLSX.utils.aoa_to_sheet([distHeader, ...distRows]);
  wsDist["!cols"] = [{ wch: 24 }, { wch: 14 }, { wch: 16 }, { wch: 12 }, { wch: 14 }, { wch: 55 }];
  addAutoFilter(wsDist, `A1:F${distRows.length + 1}`);
  XLSX.utils.book_append_sheet(wb, wsDist, "Rating Distribution");

  // ═══ Sheet 3: Department Analysis ═══
  if (data.deptAnalysis.length > 0) {
    const deptHeader = ["Department", "Employee Count", "Average Rating", "Deviation from Mean", "Risk Signal", "Action Required"];
    const deptRows = data.deptAnalysis.map(d => {
      const deviation = Number((d.avg - data.mean).toFixed(2));
      const action = d.riskFlag.includes("Inflation") ? "Review for rating inflation — recalibrate with manager"
        : d.riskFlag.includes("Compression") ? "Investigate compressed ratings — encourage differentiation"
        : d.riskFlag.includes("Low") ? "Support underperforming team — development plans needed"
        : "No immediate action required";
      return [d.dept, d.count, Number(d.avg.toFixed(2)), deviation, d.riskFlag || "No Risk", action];
    });
    const wsDept = XLSX.utils.aoa_to_sheet([deptHeader, ...deptRows]);
    wsDept["!cols"] = [{ wch: 25 }, { wch: 16 }, { wch: 16 }, { wch: 20 }, { wch: 22 }, { wch: 55 }];
    addAutoFilter(wsDept, `A1:F${deptRows.length + 1}`);
    XLSX.utils.book_append_sheet(wb, wsDept, "Department Analysis");
  }

  // ═══ Sheet 4: Manager Calibration ═══
  if (data.managerAnalysis.length > 0) {
    const mgrHeader = ["Manager Name", "Direct Reports", "Avg Rating", "Rating Spread (σ)", "Calibration Flag", "Recommended Action"];
    const mgrRows = data.managerAnalysis.map(m => {
      const action = m.flag.includes("Inflation") ? "Calibration discussion needed — ratings may be inflated"
        : m.flag.includes("Compression") ? "Encourage rating differentiation across team"
        : m.flag.includes("Strictness") ? "Review if ratings reflect actual performance fairly"
        : m.flag.includes("Balanced") ? "No action — healthy distribution"
        : "Monitor in next cycle";
      return [m.name, m.directReports, Number(m.avgRating.toFixed(2)), Number(m.spread.toFixed(2)), m.flag, action];
    });
    // Sort by flag severity
    mgrRows.sort((a, b) => {
      const severity: Record<string, number> = { "Inflation": 0, "Compression": 1, "Strictness": 2, "Balanced": 3 };
      const aKey = Object.keys(severity).find(k => String(a[4]).includes(k)) || "";
      const bKey = Object.keys(severity).find(k => String(b[4]).includes(k)) || "";
      return (severity[aKey] ?? 4) - (severity[bKey] ?? 4);
    });
    const wsMgr = XLSX.utils.aoa_to_sheet([mgrHeader, ...mgrRows]);
    wsMgr["!cols"] = [{ wch: 25 }, { wch: 14 }, { wch: 12 }, { wch: 18 }, { wch: 22 }, { wch: 55 }];
    addAutoFilter(wsMgr, `A1:F${mgrRows.length + 1}`);
    XLSX.utils.book_append_sheet(wb, wsMgr, "Manager Calibration");
  }

  // ═══ Sheet 5: Employee Detail ═══
  if (data.employees && data.employees.length > 0) {
    const empHeader = ["Employee Name", "Department", "Line Manager", "Rating", "Rating Band", "Performance Level"];
    const empRows = data.employees
      .filter(e => e.rating !== null)
      .sort((a, b) => (b.rating || 0) - (a.rating || 0))
      .map(e => {
        const r = e.rating!;
        const band = r >= 4.0 ? "Top Performers" : r >= 3.5 ? "Exceeds Expectations" : r >= 3.0 ? "Meets Expectations" : r >= 2.0 ? "Below Expectations" : "Critical Low";
        const level = r >= 4.0 ? "High Performer" : r >= 3.5 ? "Strong Contributor" : r >= 3.0 ? "Solid Contributor" : r >= 2.0 ? "Needs Development" : "Immediate Action";
        return [e.employeeName, e.department, e.lineManager, Number(r.toFixed(2)), band, level];
      });
    const wsEmp = XLSX.utils.aoa_to_sheet([empHeader, ...empRows]);
    wsEmp["!cols"] = [{ wch: 28 }, { wch: 22 }, { wch: 22 }, { wch: 10 }, { wch: 22 }, { wch: 20 }];
    addAutoFilter(wsEmp, `A1:F${empRows.length + 1}`);
    XLSX.utils.book_append_sheet(wb, wsEmp, "Employee Detail");
  }

  // ═══ Sheet 6: AI Insights ═══
  if (data.aiInsights) {
    const lines = data.aiInsights.split("\n").map(line => [line]);
    const wsAI = XLSX.utils.aoa_to_sheet([["AI Calibration Insights"], [`Generated: ${dateStr}`], [], ...lines]);
    wsAI["!cols"] = [{ wch: 120 }];
    wsAI["!merges"] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 0 } }];
    XLSX.utils.book_append_sheet(wb, wsAI, "AI Insights");
  }

  XLSX.writeFile(wb, `Bell_Curve_Calibration_${new Date().toISOString().slice(0, 10)}.xlsx`);
}
