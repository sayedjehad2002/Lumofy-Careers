import jsPDF from "jspdf";
import "jspdf-autotable";
import * as XLSX from "xlsx";
import { Employee, getEmployeeTags, getTimeAtOrg } from "@/types/headcount";

export function exportHeadcountPdf(employees: Employee[]) {
  const doc = new jsPDF({ orientation: "landscape" });
  
  // Header
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, 297, 32, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("Lumofy – Headcount Report", 14, 18);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(`Generated: ${new Date().toLocaleDateString()} · ${employees.length} employees`, 14, 26);

  const headers = ["Name", "Status", "Tags", "ID/Iqama", "Email", "Job Title", "Department", "Tier", "Joining Date", "Time at Org", "Reports To"];
  const rows = employees.map(e => [
    e.fullName,
    e.status,
    getEmployeeTags(e).join(", ") || "—",
    e.idIqamaNumber || "—",
    e.email || "—",
    e.jobTitle || "—",
    e.department || "—",
    e.tier || "—",
    e.joiningDate || "—",
    getTimeAtOrg(e.joiningDate),
    e.reportsTo || "—",
  ]);

  (doc as any).autoTable({
    head: [headers],
    body: rows,
    startY: 36,
    theme: "grid",
    styles: { fontSize: 7, cellPadding: 2 },
    headStyles: { fillColor: [59, 130, 246], textColor: 255, fontStyle: "bold", fontSize: 7 },
    alternateRowStyles: { fillColor: [248, 250, 252] },
  });

  // Footer
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor(150);
    doc.text("Confidential – Lumofy Talent Hub", 14, doc.internal.pageSize.height - 8);
    doc.text(`Page ${i} of ${pageCount}`, doc.internal.pageSize.width - 30, doc.internal.pageSize.height - 8);
  }

  doc.save(`Lumofy_Headcount_${new Date().toISOString().slice(0, 10)}.pdf`);
}

export function exportHeadcountExcel(employees: Employee[]) {
  const data = employees.map(e => ({
    "Full Name": e.fullName,
    "Status": e.status,
    "Tags": getEmployeeTags(e).join(", ") || "",
    "ID / Iqama": e.idIqamaNumber || "",
    "Email": e.email || "",
    "Phone": e.phone || "",
    "Job Title": e.jobTitle || "",
    "Department": e.department || "",
    "Tier": e.tier || "",
    "Nationality": e.nationality || "",
    "Joining Date": e.joiningDate || "",
    "Time at Org": getTimeAtOrg(e.joiningDate),
    "Reports To": e.reportsTo || "",
  }));

  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Headcount");
  
  // Auto column widths
  const colWidths = Object.keys(data[0] || {}).map(key => ({
    wch: Math.max(key.length, ...data.map(r => String((r as any)[key]).length)).toString().length + 4
  }));
  ws["!cols"] = colWidths;

  XLSX.writeFile(wb, `Lumofy_Headcount_${new Date().toISOString().slice(0, 10)}.xlsx`);
}
