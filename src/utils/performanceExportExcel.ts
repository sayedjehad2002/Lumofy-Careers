import * as XLSX from "xlsx";

// ─── Types (matching the component's EmployeeRecord) ───────
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
  functionHeadNotes: string;
  performanceComments: string;
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
    keyActions?: string[];
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
    immediate?: Array<{ action: string; rationale: string; owner?: string }>;
    mediumTerm?: Array<{ action: string; rationale: string; timeline?: string }>;
    longTerm?: Array<{ action: string; rationale: string; impact?: string }>;
  };
}

// ─── 9-Box helpers ─────────────────────────────────────────
type Band = "Low" | "Medium" | "High";

function getBand(rating: number | null): Band | null {
  if (rating === null) return null;
  if (rating < 3.0) return "Low";
  if (rating < 3.5) return "Medium";
  return "High";
}

const BOX_LABELS: Record<string, string> = {
  "High-High": "Star",
  "Medium-High": "Growth Engine",
  "Low-High": "Enigma",
  "High-Medium": "Strong Performer",
  "Medium-Medium": "Core Player",
  "Low-Medium": "Underperformer",
  "High-Low": "Workhorse",
  "Medium-Low": "Effective",
  "Low-Low": "Risk",
};

function classify9Box(emp: EmployeeRecord): { key: string; label: string } | null {
  const selfBand = getBand(emp.selfRating);
  const mgrBand = getBand(emp.managerRating);
  if (!selfBand || !mgrBand) return null;
  const key = `${selfBand}-${mgrBand}`;
  return { key, label: BOX_LABELS[key] || "Unclassified" };
}

// ─── Department stats helper ───────────────────────────────
function computeDeptStats(employees: EmployeeRecord[]) {
  const deptMap = new Map<string, EmployeeRecord[]>();
  employees.forEach(e => {
    const d = e.department || "Unknown";
    if (!deptMap.has(d)) deptMap.set(d, []);
    deptMap.get(d)!.push(e);
  });

  return Array.from(deptMap.entries()).map(([dept, emps]) => {
    const rated = emps.filter(e => e.managerRating !== null);
    const avgMgr = rated.length > 0 ? rated.reduce((s, e) => s + (e.managerRating || 0), 0) / rated.length : 0;
    const selfRated = emps.filter(e => e.selfRating !== null);
    const avgSelf = selfRated.length > 0 ? selfRated.reduce((s, e) => s + (e.selfRating || 0), 0) / selfRated.length : 0;
    const redFlags = emps.filter(e => {
      if (e.managerRating !== null && e.managerRating < 3.0) return true;
      if (e.selfRating !== null && e.managerRating !== null && Math.abs(e.selfRating - e.managerRating) >= 1.5) return true;
      return false;
    }).length;
    const highPerf = emps.filter(e => e.managerRating !== null && e.managerRating >= 3.5).length;
    return { dept, count: emps.length, avgMgr, avgSelf, redFlags, highPerf };
  });
}

// ─── Main export function ──────────────────────────────────
export function exportPerformanceToExcel(
  employees: EmployeeRecord[],
  aiAnalysis: AIAnalysisResult | null
): void {
  const wb = XLSX.utils.book_new();

  // ── Compute 9-box distribution + employee lists per box ──
  const boxEmployees = new Map<string, string[]>();
  const boxCounts: Record<string, number> = {};
  Object.keys(BOX_LABELS).forEach(k => { boxEmployees.set(k, []); boxCounts[k] = 0; });

  employees.forEach(emp => {
    const box = classify9Box(emp);
    if (box) {
      boxCounts[box.key] = (boxCounts[box.key] || 0) + 1;
      boxEmployees.get(box.key)?.push(emp.employeeName);
    }
  });

  // ── Compute KPIs internally ──────────────────────────────
  const totalEmployees = employees.length;
  const missingMgr = employees.filter(e => e.managerRating === null).length;
  const missingSelf = employees.filter(e => e.selfRating === null).length;
  const rated = employees.filter(e => e.managerRating !== null);
  const completionPct = totalEmployees > 0 ? Math.round((rated.length / totalEmployees) * 100) : 0;
  const highPerformers = employees.filter(e => e.managerRating !== null && e.managerRating >= 3.5).length;
  const redFlagCount = employees.filter(e => {
    if (e.managerRating !== null && e.managerRating < 3.0) return true;
    if (e.selfRating !== null && e.managerRating !== null && Math.abs(e.selfRating - e.managerRating) >= 1.5) return true;
    return false;
  }).length;

  const deptStats = computeDeptStats(employees);
  const highestRiskDept = deptStats.sort((a, b) => b.redFlags - a.redFlags)[0]?.dept || "N/A";
  const highestMisalignmentDept = deptStats.sort((a, b) => Math.abs(b.avgSelf - b.avgMgr) - Math.abs(a.avgSelf - a.avgMgr))[0]?.dept || "N/A";

  // ════════════════════════════════════════════════════════
  // Sheet 1: All Employee Data
  // ════════════════════════════════════════════════════════
  const empRows = employees.map(emp => {
    const box = classify9Box(emp);
    const gap = emp.selfRating !== null && emp.managerRating !== null
      ? (emp.selfRating - emp.managerRating).toFixed(2)
      : "";
    const isRedFlag = (emp.managerRating !== null && emp.managerRating < 3.0) ||
      (emp.selfRating !== null && emp.managerRating !== null && Math.abs(emp.selfRating - emp.managerRating) >= 1.5);
    return {
      "Employee Name": emp.employeeName,
      "Email": emp.email || "",
      "Department": emp.department,
      "Department Group": emp.departmentGroup || "",
      "Job Title": emp.jobTitle,
      "Line Manager": emp.lineManager,
      "Self Rating": emp.selfRating ?? "",
      "Manager Rating": emp.managerRating ?? "",
      "Rating Gap (Self − Mgr)": gap,
      "9-Box Placement": box?.label || "Unrated",
      "Red Flag": isRedFlag ? "⚠ YES" : "",
      "Performance Comments": emp.performanceComments,
    };
  });
  const wsEmp = XLSX.utils.json_to_sheet(empRows);
  wsEmp["!cols"] = [
    { wch: 25 }, { wch: 28 }, { wch: 20 }, { wch: 18 }, { wch: 25 }, { wch: 22 },
    { wch: 12 }, { wch: 14 }, { wch: 18 }, { wch: 18 }, { wch: 10 }, { wch: 40 },
  ];
  XLSX.utils.book_append_sheet(wb, wsEmp, "Employee Data");

  // ════════════════════════════════════════════════════════
  // Sheet 2: KPI Summary
  // ════════════════════════════════════════════════════════
  const kpiRows: any[][] = [
    ["PERFORMANCE MANAGEMENT ANALYSIS"],
    ["Generated", new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })],
    [],
    ["KEY PERFORMANCE INDICATORS", ""],
    ["Total Employees", totalEmployees],
    ["Rated Employees", rated.length],
    ["Rating Completion %", `${completionPct}%`],
    ["High Performers (≥3.5 mgr rating)", highPerformers],
    ["Red Flag Employees", redFlagCount],
    ["Missing Manager Ratings", missingMgr],
    ["Missing Self Ratings", missingSelf],
    ["Highest Risk Department", highestRiskDept],
    ["Highest Misalignment Department", highestMisalignmentDept],
  ];
  const wsKPI = XLSX.utils.aoa_to_sheet(kpiRows);
  wsKPI["!cols"] = [{ wch: 38 }, { wch: 30 }];
  XLSX.utils.book_append_sheet(wb, wsKPI, "KPI Summary");

  // ════════════════════════════════════════════════════════
  // Sheet 3: 9-Box Grid with Employee Names
  // ════════════════════════════════════════════════════════
  const boxOrder = [
    { key: "Low-High", row: "High Potential" },
    { key: "Medium-High", row: "High Potential" },
    { key: "High-High", row: "High Potential" },
    { key: "Low-Medium", row: "Medium Potential" },
    { key: "Medium-Medium", row: "Medium Potential" },
    { key: "High-Medium", row: "Medium Potential" },
    { key: "Low-Low", row: "Low Potential" },
    { key: "Medium-Low", row: "Low Potential" },
    { key: "High-Low", row: "Low Potential" },
  ];

  const nineBoxRows: any[][] = [
    ["9-BOX GRID — EMPLOYEE PLACEMENT"],
    [],
    ["Box Label", "Performance", "Potential", "Count", "Employee Names"],
  ];

  boxOrder.forEach(({ key }) => {
    const label = BOX_LABELS[key];
    const [perf, pot] = key.split("-");
    const names = boxEmployees.get(key) || [];
    nineBoxRows.push([
      label,
      `${perf} Performance`,
      `${pot} Potential`,
      names.length,
      names.join(", ") || "—",
    ]);
  });

  nineBoxRows.push([], ["TOTAL PLACED", "", "", Object.values(boxCounts).reduce((a, b) => a + b, 0)]);
  nineBoxRows.push(["UNRATED (missing data)", "", "", employees.filter(e => classify9Box(e) === null).length]);

  const wsBox = XLSX.utils.aoa_to_sheet(nineBoxRows);
  wsBox["!cols"] = [{ wch: 22 }, { wch: 20 }, { wch: 18 }, { wch: 8 }, { wch: 80 }];
  XLSX.utils.book_append_sheet(wb, wsBox, "9-Box Grid");

  // ════════════════════════════════════════════════════════
  // Sheet 4: Department Breakdown
  // ════════════════════════════════════════════════════════
  const freshDeptStats = computeDeptStats(employees);
  const deptRows = freshDeptStats.map(d => ({
    "Department": d.dept,
    "Headcount": d.count,
    "Avg Manager Rating": d.avgMgr.toFixed(2),
    "Avg Self Rating": d.avgSelf.toFixed(2),
    "Avg Gap (Self − Mgr)": (d.avgSelf - d.avgMgr).toFixed(2),
    "High Performers": d.highPerf,
    "Red Flags": d.redFlags,
  }));
  const wsDept = XLSX.utils.json_to_sheet(deptRows);
  wsDept["!cols"] = [{ wch: 22 }, { wch: 12 }, { wch: 18 }, { wch: 16 }, { wch: 20 }, { wch: 16 }, { wch: 12 }];
  XLSX.utils.book_append_sheet(wb, wsDept, "Department Breakdown");

  // ════════════════════════════════════════════════════════
  // Sheet 5: AI Executive Summary
  // ════════════════════════════════════════════════════════
  if (aiAnalysis?.executiveSummary) {
    const exec = aiAnalysis.executiveSummary;
    const execRows: any[][] = [
      ["AI EXECUTIVE SUMMARY"],
      [],
      ["Overall Health", exec.overallHealth || ""],
      ["Key Strength", exec.keyStrength || ""],
      ["Main Risk", exec.mainRisk || ""],
      ["Top Priority", exec.topPriority || ""],
      ["Strategic Outlook", exec.outlook || ""],
    ];
    const wsExec = XLSX.utils.aoa_to_sheet(execRows);
    wsExec["!cols"] = [{ wch: 20 }, { wch: 80 }];
    XLSX.utils.book_append_sheet(wb, wsExec, "Executive Summary");
  }

  // ════════════════════════════════════════════════════════
  // Sheet 6: Organizational Observations
  // ════════════════════════════════════════════════════════
  if (aiAnalysis?.organizationalObservations?.length) {
    const obsRows = aiAnalysis.organizationalObservations.map(o => ({
      "Category": o.category,
      "Title": o.title,
      "Insight": o.insight,
      "Severity": o.severity,
    }));
    const wsObs = XLSX.utils.json_to_sheet(obsRows);
    wsObs["!cols"] = [{ wch: 25 }, { wch: 30 }, { wch: 70 }, { wch: 12 }];
    XLSX.utils.book_append_sheet(wb, wsObs, "Observations");
  }

  // ════════════════════════════════════════════════════════
  // Sheet 7: AI Department Analysis
  // ════════════════════════════════════════════════════════
  if (aiAnalysis?.departmentAnalysis?.length) {
    const aiDeptRows = aiAnalysis.departmentAnalysis.map(d => ({
      "Department": d.department,
      "Health Score": d.healthScore,
      "Summary": d.summary,
      "Strengths": d.strengths?.join("; ") || "",
      "Risks": d.risks?.join("; ") || "",
      "Key Actions": d.keyActions?.join("; ") || "",
    }));
    const wsAiDept = XLSX.utils.json_to_sheet(aiDeptRows);
    wsAiDept["!cols"] = [{ wch: 22 }, { wch: 12 }, { wch: 50 }, { wch: 40 }, { wch: 40 }, { wch: 40 }];
    XLSX.utils.book_append_sheet(wb, wsAiDept, "AI Dept Analysis");
  }

  // ════════════════════════════════════════════════════════
  // Sheet 8: Red Flags
  // ════════════════════════════════════════════════════════
  if (aiAnalysis?.redFlags?.length) {
    const rfRows = aiAnalysis.redFlags.map(rf => ({
      "Employee Name": rf.employeeName,
      "Department": rf.department,
      "Risk Category": rf.riskCategory,
      "Urgency": rf.urgency,
      "Summary": rf.summary,
      "Recommended Action": rf.recommendedAction || "",
    }));
    const wsRF = XLSX.utils.json_to_sheet(rfRows);
    wsRF["!cols"] = [{ wch: 25 }, { wch: 20 }, { wch: 22 }, { wch: 12 }, { wch: 50 }, { wch: 40 }];
    XLSX.utils.book_append_sheet(wb, wsRF, "Red Flags");
  }

  // ════════════════════════════════════════════════════════
  // Sheet 9: High Potentials
  // ════════════════════════════════════════════════════════
  if (aiAnalysis?.highPotentials?.length) {
    const hpRows = aiAnalysis.highPotentials.map(hp => ({
      "Employee Name": hp.employeeName,
      "Department": hp.department,
      "Readiness Tag": hp.readinessTag,
      "Summary": hp.summary,
      "Development Action": hp.developmentAction || "",
    }));
    const wsHP = XLSX.utils.json_to_sheet(hpRows);
    wsHP["!cols"] = [{ wch: 25 }, { wch: 20 }, { wch: 22 }, { wch: 50 }, { wch: 40 }];
    XLSX.utils.book_append_sheet(wb, wsHP, "High Potentials");
  }

  // ════════════════════════════════════════════════════════
  // Sheet 10: Top Performers
  // ════════════════════════════════════════════════════════
  if (aiAnalysis?.topPerformers?.length) {
    const tpRows = aiAnalysis.topPerformers.map(tp => ({
      "Employee Name": tp.employeeName,
      "Department": tp.department,
      "Self Review": tp.selfReview ?? "",
      "Manager Review": tp.managerReview ?? "",
      "Consistency Tag": tp.consistencyTag,
      "Summary": tp.summary,
      "Retention Action": tp.retentionAction || "",
    }));
    const wsTP = XLSX.utils.json_to_sheet(tpRows);
    wsTP["!cols"] = [{ wch: 25 }, { wch: 20 }, { wch: 12 }, { wch: 14 }, { wch: 24 }, { wch: 50 }, { wch: 40 }];
    XLSX.utils.book_append_sheet(wb, wsTP, "Top Performers");
  }

  // ════════════════════════════════════════════════════════
  // Sheet 11: Strategic Recommendations
  // ════════════════════════════════════════════════════════
  if (aiAnalysis?.strategicRecommendations) {
    const recs = aiAnalysis.strategicRecommendations;
    const recsData: any[][] = [
      ["STRATEGIC RECOMMENDATIONS"],
      [],
      ["IMMEDIATE ACTIONS (0-30 DAYS)"],
      ["#", "Action", "Rationale", "Owner"],
    ];
    recs.immediate?.forEach((r, i) => {
      recsData.push([i + 1, r.action, r.rationale, r.owner || ""]);
    });
    recsData.push([], ["MEDIUM-TERM (30-90 DAYS)"], ["#", "Action", "Rationale", "Timeline"]);
    recs.mediumTerm?.forEach((r, i) => {
      recsData.push([i + 1, r.action, r.rationale, r.timeline || ""]);
    });
    recsData.push([], ["LONG-TERM STRATEGIC"], ["#", "Action", "Rationale", "Expected Impact"]);
    recs.longTerm?.forEach((r, i) => {
      recsData.push([i + 1, r.action, r.rationale, r.impact || ""]);
    });
    const wsRecs = XLSX.utils.aoa_to_sheet(recsData);
    wsRecs["!cols"] = [{ wch: 5 }, { wch: 45 }, { wch: 50 }, { wch: 25 }];
    XLSX.utils.book_append_sheet(wb, wsRecs, "Recommendations");
  }

  // ─── Save ────────────────────────────────────────────────
  const timestamp = new Date().toISOString().split("T")[0];
  XLSX.writeFile(wb, `Performance_Analysis_${timestamp}.xlsx`);
}
