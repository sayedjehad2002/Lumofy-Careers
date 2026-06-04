import { useState } from "react";
import { Download, FileSpreadsheet, FileText, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import * as XLSX from "xlsx";

interface CVCandidate {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  nationality: string | null;
  country: string | null;
  location: string | null;
  years_experience: string | null;
  skills: string[];
  industries: string[];
  status: string;
  suggested_department: string | null;
  manual_department: string | null;
  suggested_job_title: string | null;
  manual_job_title: string | null;
  classification_confidence: string | null;
  uploaded_at: string;
  ai_analysis?: { fitScore: number; fitLevel: string; recommendation: string } | null;
}

const COLUMNS = [
  { key: "name", label: "Name", default: true },
  { key: "email", label: "Email", default: true },
  { key: "phone", label: "Phone", default: true },
  { key: "nationality", label: "Nationality", default: true },
  { key: "country", label: "Country", default: false },
  { key: "location", label: "Location", default: true },
  { key: "years_experience", label: "Years Experience", default: true },
  { key: "skills", label: "Skills", default: true },
  { key: "industries", label: "Industries", default: false },
  { key: "department", label: "Department", default: true },
  { key: "job_title", label: "Job Title", default: true },
  { key: "confidence", label: "AI Confidence", default: true },
  { key: "fit_score", label: "AI Fit Score", default: true },
  { key: "recommendation", label: "AI Recommendation", default: false },
  { key: "status", label: "Status", default: true },
  { key: "uploaded_at", label: "Upload Date", default: false },
];

interface Props {
  candidates: CVCandidate[];
}

export default function ExportReporting({ candidates }: Props) {
  const [selectedCols, setSelectedCols] = useState<Set<string>>(
    new Set(COLUMNS.filter(c => c.default).map(c => c.key))
  );

  const toggleCol = (key: string) => {
    setSelectedCols(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const buildRow = (c: CVCandidate) => {
    const row: Record<string, string> = {};
    const cols = COLUMNS.filter(col => selectedCols.has(col.key));

    cols.forEach(col => {
      switch (col.key) {
        case "name": row[col.label] = c.name || ""; break;
        case "email": row[col.label] = c.email || ""; break;
        case "phone": row[col.label] = c.phone || ""; break;
        case "nationality": row[col.label] = c.nationality || ""; break;
        case "country": row[col.label] = c.country || ""; break;
        case "location": row[col.label] = c.location || ""; break;
        case "years_experience": row[col.label] = c.years_experience || ""; break;
        case "skills": row[col.label] = (c.skills || []).join(", "); break;
        case "industries": row[col.label] = (c.industries || []).join(", "); break;
        case "department": row[col.label] = c.manual_department || c.suggested_department || ""; break;
        case "job_title": row[col.label] = c.manual_job_title || c.suggested_job_title || ""; break;
        case "confidence": row[col.label] = c.classification_confidence || ""; break;
        case "fit_score": row[col.label] = c.ai_analysis?.fitScore?.toString() || ""; break;
        case "recommendation": row[col.label] = c.ai_analysis?.recommendation || ""; break;
        case "status": row[col.label] = c.status; break;
        case "uploaded_at": row[col.label] = new Date(c.uploaded_at).toLocaleDateString(); break;
      }
    });
    return row;
  };

  const exportExcel = () => {
    const data = candidates.map(buildRow);
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "CV Library");
    XLSX.writeFile(wb, `cv-library-export-${new Date().toISOString().slice(0, 10)}.xlsx`);
    toast.success(`Exported ${candidates.length} candidates to Excel`);
  };

  const exportCSV = () => {
    const data = candidates.map(buildRow);
    const ws = XLSX.utils.json_to_sheet(data);
    const csv = XLSX.utils.sheet_to_csv(ws);
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `cv-library-export-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${candidates.length} candidates to CSV`);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Download className="w-5 h-5 text-primary" />
        <h3 className="font-semibold text-lg">Export & Reporting</h3>
        <Badge variant="secondary" className="text-[10px]">{candidates.length} candidates</Badge>
      </div>

      <div className="rounded-xl bg-card border border-border p-4">
        <p className="text-sm text-muted-foreground mb-3">Select columns to include:</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {COLUMNS.map(col => (
            <label key={col.key} className="flex items-center gap-2 text-xs cursor-pointer">
              <Checkbox checked={selectedCols.has(col.key)} onCheckedChange={() => toggleCol(col.key)} />
              {col.label}
            </label>
          ))}
        </div>
      </div>

      <div className="flex gap-3">
        <Button onClick={exportExcel} className="gap-2">
          <FileSpreadsheet className="w-4 h-4" /> Export Excel
        </Button>
        <Button variant="outline" onClick={exportCSV} className="gap-2">
          <FileText className="w-4 h-4" /> Export CSV
        </Button>
      </div>
    </div>
  );
}
