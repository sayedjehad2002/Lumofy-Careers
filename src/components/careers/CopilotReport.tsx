import { useState } from "react";
import { Download, Loader2, FileText, FileSpreadsheet, FileIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import jsPDF from "jspdf";
import * as XLSX from "xlsx";

export interface ReportRequest {
  type: "pdf" | "excel" | "word";
  title: string;
  sections: string[];
}

export function parseReportRequests(content: string): { cleanContent: string; reports: ReportRequest[] } {
  const reports: ReportRequest[] = [];
  let cleanContent = content;

  const regex = /```?\s*\n?REPORT_REQUEST:\s*(\{[\s\S]*?\})\s*\n?```?/g;
  let match;
  while ((match = regex.exec(content)) !== null) {
    try {
      const report = JSON.parse(match[1]) as ReportRequest;
      if (report.type && report.title) reports.push(report);
    } catch { /* skip */ }
    cleanContent = cleanContent.replace(match[0], "");
  }

  const regex2 = /REPORT_REQUEST:\s*(\{[^\n]+\})/g;
  while ((match = regex2.exec(content)) !== null) {
    try {
      const report = JSON.parse(match[1]) as ReportRequest;
      if (report.type && report.title && !reports.some(r => r.title === report.title)) {
        reports.push(report);
      }
    } catch { /* skip */ }
    cleanContent = cleanContent.replace(match[0], "");
  }

  return { cleanContent: cleanContent.trim(), reports };
}

interface ReportCardProps {
  report: ReportRequest;
  sessionToken: string;
}

export function ReportDownloadCard({ report, sessionToken }: ReportCardProps) {
  const [loading, setLoading] = useState(false);

  const iconMap = {
    pdf: <FileText className="w-4 h-4 text-red-400" />,
    excel: <FileSpreadsheet className="w-4 h-4 text-emerald-400" />,
    word: <FileIcon className="w-4 h-4 text-blue-400" />,
  };

  const colorMap = {
    pdf: "border-red-400/30 bg-red-400/5",
    excel: "border-emerald-400/30 bg-emerald-400/5",
    word: "border-blue-400/30 bg-blue-400/5",
  };

  const generate = async () => {
    setLoading(true);
    try {
      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/copilot-report`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          sessionToken,
          reportType: report.type,
          title: report.title,
          sections: report.sections,
        }),
      });

      if (!resp.ok) throw new Error("Failed to generate report");
      const data = await resp.json();
      const content = data.reportContent || "No content generated";

      if (report.type === "pdf") {
        generatePDF(report.title, content);
      } else if (report.type === "excel") {
        generateExcel(report.title, content);
      } else if (report.type === "word") {
        generateWord(report.title, content);
      }

      toast.success(`${report.type.toUpperCase()} report downloaded!`);
    } catch (err: any) {
      toast.error(err.message || "Failed to generate report");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`rounded-lg border p-3 my-2 ${colorMap[report.type]}`}>
      <div className="flex items-center gap-2.5">
        {iconMap[report.type]}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-xs font-semibold">{report.title}</span>
            <Badge variant="secondary" className="text-[9px] px-1.5 py-0 h-4 uppercase">
              {report.type}
            </Badge>
          </div>
          <p className="text-[10px] text-muted-foreground">
            {report.sections?.join(", ") || "Full report"}
          </p>
        </div>
        <Button
          size="sm"
          className="h-7 text-xs px-3"
          onClick={generate}
          disabled={loading}
        >
          {loading ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Download className="w-3 h-3 mr-1" />}
          {loading ? "Generating..." : "Download"}
        </Button>
      </div>
    </div>
  );
}

function generatePDF(title: string, content: string) {
  const pdf = new jsPDF();
  const pageWidth = pdf.internal.pageSize.getWidth();
  const margin = 20;
  const maxWidth = pageWidth - margin * 2;
  let y = 20;

  // Header
  pdf.setFillColor(99, 102, 241);
  pdf.rect(0, 0, pageWidth, 35, "F");
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(18);
  pdf.setFont("helvetica", "bold");
  pdf.text(title, margin, 22);
  pdf.setFontSize(9);
  pdf.setFont("helvetica", "normal");
  pdf.text(`Generated on ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}`, margin, 30);
  
  y = 45;
  pdf.setTextColor(33, 33, 33);

  const lines = content.split("\n");
  for (const line of lines) {
    if (y > pdf.internal.pageSize.getHeight() - 30) {
      pdf.addPage();
      y = 20;
    }

    const trimmed = line.trim();
    if (trimmed.startsWith("# ")) {
      pdf.setFontSize(16);
      pdf.setFont("helvetica", "bold");
      pdf.setTextColor(99, 102, 241);
      y += 5;
      pdf.text(trimmed.replace(/^#+\s*/, ""), margin, y);
      y += 8;
      pdf.setTextColor(33, 33, 33);
    } else if (trimmed.startsWith("## ")) {
      pdf.setFontSize(13);
      pdf.setFont("helvetica", "bold");
      y += 4;
      pdf.text(trimmed.replace(/^#+\s*/, ""), margin, y);
      y += 7;
    } else if (trimmed.startsWith("### ")) {
      pdf.setFontSize(11);
      pdf.setFont("helvetica", "bold");
      y += 3;
      pdf.text(trimmed.replace(/^#+\s*/, ""), margin, y);
      y += 6;
    } else if (trimmed.startsWith("- ") || trimmed.startsWith("• ") || trimmed.startsWith("* ")) {
      pdf.setFontSize(10);
      pdf.setFont("helvetica", "normal");
      const bulletText = trimmed.replace(/^[-•*]\s*/, "");
      const wrapped = pdf.splitTextToSize(`• ${bulletText}`, maxWidth - 5);
      for (const wl of wrapped) {
        if (y > pdf.internal.pageSize.getHeight() - 30) { pdf.addPage(); y = 20; }
        pdf.text(wl, margin + 5, y);
        y += 5;
      }
    } else if (trimmed.length > 0) {
      pdf.setFontSize(10);
      pdf.setFont("helvetica", "normal");
      // Remove markdown bold markers
      const cleanText = trimmed.replace(/\*\*/g, "");
      const wrapped = pdf.splitTextToSize(cleanText, maxWidth);
      for (const wl of wrapped) {
        if (y > pdf.internal.pageSize.getHeight() - 30) { pdf.addPage(); y = 20; }
        pdf.text(wl, margin, y);
        y += 5;
      }
    } else {
      y += 3;
    }
  }

  // Footer
  const pages = pdf.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    pdf.setPage(i);
    pdf.setFontSize(8);
    pdf.setTextColor(150);
    pdf.text(`Lumofy HR Intelligence Report — Confidential — Page ${i}/${pages}`, margin, pdf.internal.pageSize.getHeight() - 10);
  }

  pdf.save(`${title.replace(/[^a-zA-Z0-9]/g, "_")}.pdf`);
}

function generateExcel(title: string, content: string) {
  const wb = XLSX.utils.book_new();

  // Parse markdown content into sections
  const sections: { heading: string; rows: string[][] }[] = [];
  let currentSection: { heading: string; rows: string[][] } = { heading: "Summary", rows: [] };
  
  const lines = content.split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith("## ") || trimmed.startsWith("# ")) {
      if (currentSection.rows.length > 0) sections.push(currentSection);
      currentSection = { heading: trimmed.replace(/^#+\s*/, ""), rows: [] };
    } else if (trimmed.startsWith("- ") || trimmed.startsWith("• ") || trimmed.startsWith("* ")) {
      const text = trimmed.replace(/^[-•*]\s*/, "").replace(/\*\*/g, "");
      const parts = text.split(/:\s*/);
      if (parts.length >= 2) {
        currentSection.rows.push([parts[0].trim(), parts.slice(1).join(": ").trim()]);
      } else {
        currentSection.rows.push([text]);
      }
    } else if (trimmed.length > 0 && !trimmed.startsWith("###")) {
      currentSection.rows.push([trimmed.replace(/\*\*/g, "")]);
    }
  }
  if (currentSection.rows.length > 0) sections.push(currentSection);

  // Create one sheet per section (max 10)
  for (const section of sections.slice(0, 10)) {
    const sheetName = section.heading.substring(0, 31).replace(/[/\\?*[\]]/g, "");
    const ws = XLSX.utils.aoa_to_sheet([[section.heading], [], ...section.rows]);
    XLSX.utils.book_append_sheet(wb, ws, sheetName || "Data");
  }

  if (sections.length === 0) {
    const ws = XLSX.utils.aoa_to_sheet([[title], ["No data available"]]);
    XLSX.utils.book_append_sheet(wb, ws, "Report");
  }

  XLSX.writeFile(wb, `${title.replace(/[^a-zA-Z0-9]/g, "_")}.xlsx`);
}

function generateWord(title: string, content: string) {
  // Generate HTML-based .doc file
  const cleanContent = content.replace(/\*\*/g, "")
    .split("\n")
    .map(line => {
      const t = line.trim();
      if (t.startsWith("# ")) return `<h1>${t.replace(/^#+\s*/, "")}</h1>`;
      if (t.startsWith("## ")) return `<h2>${t.replace(/^#+\s*/, "")}</h2>`;
      if (t.startsWith("### ")) return `<h3>${t.replace(/^#+\s*/, "")}</h3>`;
      if (t.startsWith("- ") || t.startsWith("• ") || t.startsWith("* ")) return `<li>${t.replace(/^[-•*]\s*/, "")}</li>`;
      if (t.length > 0) return `<p>${t}</p>`;
      return "<br/>";
    })
    .join("\n");

  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>${title}</title>
<style>
  body { font-family: Calibri, Arial, sans-serif; max-width: 700px; margin: 40px auto; color: #333; }
  h1 { color: #6366f1; border-bottom: 2px solid #6366f1; padding-bottom: 8px; }
  h2 { color: #4f46e5; margin-top: 24px; }
  h3 { color: #555; }
  li { margin: 4px 0; }
  p { line-height: 1.6; }
  .footer { margin-top: 40px; font-size: 11px; color: #999; border-top: 1px solid #ddd; padding-top: 8px; }
</style></head>
<body>
  <h1>${title}</h1>
  <p style="color:#888;font-size:12px;">Generated on ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</p>
  ${cleanContent}
  <div class="footer">Lumofy HR Intelligence Report — Confidential</div>
</body></html>`;

  const blob = new Blob([html], { type: "application/msword" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `${title.replace(/[^a-zA-Z0-9]/g, "_")}.doc`;
  link.click();
  URL.revokeObjectURL(link.href);
}
