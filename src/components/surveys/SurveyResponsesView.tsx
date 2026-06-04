import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Separator } from "@/components/ui/separator";
import { Loader2, Users, Mail, Clock, Search, ChevronDown, ChevronUp, Eye, Download, User, MessageSquare, Calendar, Hash, FileText, FileSpreadsheet, Sparkles, Maximize2, Minimize2, Trash2 } from "lucide-react";
import ResponseAIAnalysis from "./ResponseAIAnalysis";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import type { Survey, SurveyResponse } from "@/types/surveys";
import { fetchEmployeeLookup, enrichResponses, getAnswerText, type EnrichedRespondent } from "@/utils/surveyExportUtils";

interface Props {
  surveys: Survey[];
  selectedSurveyId: string | null;
  sessionToken: string | null;
}

const SurveyResponsesView = ({ surveys, selectedSurveyId, sessionToken }: Props) => {
  const [surveyId, setSurveyId] = useState(selectedSurveyId || "");
  const [responses, setResponses] = useState<SurveyResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [surveyData, setSurveyData] = useState<Survey | null>(null);
  const [search, setSearch] = useState("");
  const [sortField, setSortField] = useState<"date" | "name">("date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [selectedResponse, setSelectedResponse] = useState<SurveyResponse | null>(null);
  const [aiAnalysisResponse, setAiAnalysisResponse] = useState<SurveyResponse | null>(null);
  const [detailFullscreen, setDetailFullscreen] = useState(false);
  const [aiFullscreen, setAiFullscreen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<SurveyResponse | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (selectedSurveyId) setSurveyId(selectedSurveyId);
  }, [selectedSurveyId]);

  useEffect(() => {
    if (!surveyId || !sessionToken) return;
    const fetchResponses = async () => {
      setLoading(true);
      try {
        const [respRes, surveyRes] = await Promise.all([
          fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/survey-manage?action=get_responses&id=${surveyId}`, {
            headers: { "x-session-token": sessionToken, "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY },
          }),
          fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/survey-manage?action=get&id=${surveyId}`, {
            headers: { "x-session-token": sessionToken, "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY },
          }),
        ]);
        const respJson = await respRes.json();
        const surveyJson = await surveyRes.json();
        setResponses(respJson.responses || []);
        setSurveyData(surveyJson.survey || null);
      } catch (err) {
        console.error(err);
      }
      setLoading(false);
    };
    fetchResponses();
  }, [surveyId, sessionToken]);

  const questions = surveyData?.questions || [];

  const filtered = useMemo(() => {
    let result = [...responses];
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(r =>
        (r.respondent_name || "anonymous").toLowerCase().includes(q) ||
        (r.respondent_email || "").toLowerCase().includes(q) ||
        (r.respondent_department || "").toLowerCase().includes(q)
      );
    }
    result.sort((a, b) => {
      if (sortField === "date") {
        const da = new Date(a.completed_at || a.started_at || 0).getTime();
        const db = new Date(b.completed_at || b.started_at || 0).getTime();
        return sortDir === "desc" ? db - da : da - db;
      }
      const na = (a.respondent_name || "zzz").toLowerCase();
      const nb = (b.respondent_name || "zzz").toLowerCase();
      return sortDir === "desc" ? nb.localeCompare(na) : na.localeCompare(nb);
    });
    return result;
  }, [responses, search, sortField, sortDir]);

  const anonymousCount = responses.filter(r => r.is_anonymous).length;
  const deptCounts = useMemo(() => {
    const map: Record<string, number> = {};
    responses.forEach(r => {
      const d = r.respondent_department || "Unspecified";
      map[d] = (map[d] || 0) + 1;
    });
    return map;
  }, [responses]);
  const topDept = Object.entries(deptCounts).sort((a, b) => b[1] - a[1])[0];

  const toggleSort = (field: "date" | "name") => {
    if (sortField === field) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortField(field); setSortDir("desc"); }
  };

  const handleDeleteResponse = async () => {
    if (!deleteTarget || !sessionToken) return;
    setDeleting(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/survey-manage?action=delete_response&id=${deleteTarget.id}`, {
        headers: { "x-session-token": sessionToken, "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY },
      });
      const json = await res.json();
      if (json.success) {
        setResponses(prev => prev.filter(r => r.id !== deleteTarget.id));
        if (selectedResponse?.id === deleteTarget.id) setSelectedResponse(null);
        toast.success("Response deleted successfully");
      } else {
        toast.error(json.error || "Failed to delete response");
      }
    } catch {
      toast.error("Failed to delete response");
    }
    setDeleting(false);
    setDeleteTarget(null);
  };

  const SortIcon = ({ field }: { field: "date" | "name" }) => {
    if (sortField !== field) return <ChevronDown className="w-3 h-3 opacity-30" />;
    return sortDir === "desc" ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />;
  };

  const getAnswerDisplay = (ans: any) => {
    if (ans.answer_text) return ans.answer_text;
    if (ans.answer_json) {
      if (Array.isArray(ans.answer_json)) return ans.answer_json.join(", ");
      if (typeof ans.answer_json === "object" && ans.answer_json !== null) {
        return Object.entries(ans.answer_json).map(([k, v]) => `${k}: ${v}`).join(", ");
      }
      return String(ans.answer_json);
    }
    return "—";
  };

  const [exporting, setExporting] = useState(false);

  const handleExportCSV = async () => {
    if (!responses.length || !questions.length || !sessionToken) return;
    setExporting(true);
    try {
      const empLookup = await fetchEmployeeLookup(sessionToken);
      const enriched = enrichResponses(filtered, questions, empLookup);
      const activeQ = questions.filter((q: any) => q.type !== "section_divider" && q.type !== "statement");
      const headers = ["#", "Full Name", "Email", "Department", "Job Title", "Tier", "Line Manager", "Score (%)", "Score Rating", "Date", ...activeQ.map((q: any) => q.question_text)];
      const rows = enriched.map((r, i) => {
        const answers = activeQ.map((q: any) => {
          const ans = (r.answers || []).find((a: any) => a.question_id === q.id);
          return ans ? getAnswerText(ans).replace(/,/g, ";") : "";
        });
        return [
          i + 1,
          r.respondent_name,
          r.respondent_email,
          r.department,
          r.job_title,
          r.tier,
          r.line_manager,
          r.total_scorable > 0 ? `${r.score_percent}%` : "N/A",
          r.score_label,
          r.completed_at ? new Date(r.completed_at).toLocaleDateString() : "",
          ...answers,
        ];
      });
      const csv = [headers, ...rows].map(r => r.join(",")).join("\n");
      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = `${surveyData?.title || "survey"}-responses.csv`; a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error("Export failed");
    }
    setExporting(false);
  };

  const handleExportExcel = async () => {
    if (!responses.length || !questions.length || !sessionToken) return;
    setExporting(true);
    try {
      const empLookup = await fetchEmployeeLookup(sessionToken);
      const enriched = enrichResponses(filtered, questions, empLookup);
      const activeQuestions = questions.filter((q: any) => q.type !== "section_divider" && q.type !== "statement");
      
      // Sheet 1: Individual Responses with employee details and scores
      const data = enriched.map((r, i) => {
        const row: Record<string, string | number> = {
          "#": i + 1,
          "Full Name": r.respondent_name,
          "Email": r.respondent_email,
          "Department": r.department,
          "Job Title": r.job_title,
          "Tier": r.tier,
          "Line Manager": r.line_manager,
          "Score (%)": r.total_scorable > 0 ? r.score_percent : "N/A" as any,
          "Score Rating": r.score_label,
          "Submitted": r.completed_at ? new Date(r.completed_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "In Progress",
        };
        activeQuestions.forEach((q: any) => {
          const ans = (r.answers || []).find((a: any) => a.question_id === q.id);
          row[q.question_text] = ans ? getAnswerText(ans) : "";
        });
        return row;
      });

      const ws = XLSX.utils.json_to_sheet(data);
      const colWidths = Object.keys(data[0] || {}).map(key => ({
        wch: Math.max(key.length, ...data.map(r => String(r[key] || "").length)).valueOf()
      }));
      ws["!cols"] = colWidths.map(w => ({ wch: Math.min(w.wch + 2, 50) }));

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Individual Responses");

      // Sheet 2: Score Ranking
      const scored = enriched
        .filter(r => r.total_scorable > 0)
        .sort((a, b) => b.score_percent - a.score_percent);
      if (scored.length > 0) {
        const rankData = scored.map((r, i) => ({
          "Rank": i + 1,
          "Full Name": r.respondent_name,
          "Department": r.department,
          "Job Title": r.job_title,
          "Tier": r.tier,
          "Line Manager": r.line_manager,
          "Score (%)": r.score_percent,
          "Rating": r.score_label,
        }));
        const wsRank = XLSX.utils.json_to_sheet(rankData);
        wsRank["!cols"] = [{ wch: 6 }, { wch: 25 }, { wch: 20 }, { wch: 20 }, { wch: 10 }, { wch: 20 }, { wch: 12 }, { wch: 14 }];
        XLSX.utils.book_append_sheet(wb, wsRank, "Score Rankings");
      }

      // Sheet 3: Department Breakdown
      const deptScores: Record<string, { scores: number[]; count: number }> = {};
      enriched.forEach(r => {
        const dept = r.department || "Unspecified";
        if (!deptScores[dept]) deptScores[dept] = { scores: [], count: 0 };
        deptScores[dept].count++;
        if (r.total_scorable > 0) deptScores[dept].scores.push(r.score_percent);
      });
      const deptData = Object.entries(deptScores).map(([dept, data]) => ({
        "Department": dept,
        "Respondents": data.count,
        "Avg Score (%)": data.scores.length > 0 ? Math.round(data.scores.reduce((a, b) => a + b, 0) / data.scores.length) : "N/A",
        "Highest (%)": data.scores.length > 0 ? Math.max(...data.scores) : "N/A",
        "Lowest (%)": data.scores.length > 0 ? Math.min(...data.scores) : "N/A",
      }));
      const wsDept = XLSX.utils.json_to_sheet(deptData);
      wsDept["!cols"] = [{ wch: 22 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 14 }];
      XLSX.utils.book_append_sheet(wb, wsDept, "Department Breakdown");

      // Sheet 4: Question Summary
      const summaryData = activeQuestions.map((q: any) => {
        const answers = responses.flatMap(r => (r.answers || []).filter((a: any) => a.question_id === q.id));
        const total = answers.length;
        let summary = `${total} responses`;
        
        if (["rating", "nps"].includes(q.type)) {
          const values = answers.map((a: any) => parseFloat(a.answer_text || "0")).filter((v: number) => !isNaN(v));
          if (values.length) summary = `Avg: ${(values.reduce((s: number, v: number) => s + v, 0) / values.length).toFixed(1)}`;
        } else if (["single_choice", "multiple_choice", "dropdown", "likert", "yes_no"].includes(q.type)) {
          const counts: Record<string, number> = {};
          answers.forEach((a: any) => {
            if (a.answer_text) counts[a.answer_text] = (counts[a.answer_text] || 0) + 1;
            if (Array.isArray(a.answer_json)) a.answer_json.forEach((v: string) => { counts[v] = (counts[v] || 0) + 1; });
          });
          const top = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 3)
            .map(([k, v]) => `${k} (${Math.round(v / total * 100)}%)`).join(", ");
          summary = top || summary;
        }
        return { Question: q.question_text, Type: q.type, Responses: total, Summary: summary };
      });
      const ws2 = XLSX.utils.json_to_sheet(summaryData);
      ws2["!cols"] = [{ wch: 40 }, { wch: 15 }, { wch: 12 }, { wch: 50 }];
      XLSX.utils.book_append_sheet(wb, ws2, "Question Summary");

      XLSX.writeFile(wb, `${surveyData?.title || "survey"}-responses.xlsx`);
      toast.success("Excel report with employee details downloaded!");
    } catch {
      toast.error("Export failed");
    }
    setExporting(false);
  };

  const handleExportPDF = async () => {
    if (!responses.length || !questions.length || !sessionToken) return;
    setExporting(true);
    try {
      const empLookup = await fetchEmployeeLookup(sessionToken);
      const enriched = enrichResponses(filtered, questions, empLookup);
      const activeQuestions = questions.filter((q: any) => q.type !== "section_divider" && q.type !== "statement");

      const doc = new jsPDF();
      const pageW = doc.internal.pageSize.getWidth();

      // Header
      doc.setFillColor(99, 102, 241);
      doc.rect(0, 0, pageW, 32, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.text(surveyData?.title || "Survey Report", 14, 18);
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.text(`${responses.length} responses · Generated ${new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}`, 14, 27);
      doc.setTextColor(33, 33, 33);

      // Overview stats
      let y = 42;
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("Response Overview", 14, y);
      y += 8;

      const scored = enriched.filter(r => r.total_scorable > 0);
      const avgScore = scored.length > 0 ? Math.round(scored.reduce((s, r) => s + r.score_percent, 0) / scored.length) : 0;
      const highestScorer = scored.length > 0 ? scored.sort((a, b) => b.score_percent - a.score_percent)[0] : null;

      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.text(`Total Responses: ${responses.length}`, 14, y); y += 5;
      if (scored.length > 0) {
        doc.text(`Average Score: ${avgScore}% out of 100%`, 14, y); y += 5;
        if (highestScorer) {
          doc.text(`Highest Scorer: ${highestScorer.respondent_name} (${highestScorer.score_percent}%)`, 14, y); y += 5;
        }
      }
      y += 5;

      // Individual Respondent Table
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("Individual Response Scores", 14, y);
      y += 4;

      autoTable(doc, {
        startY: y,
        head: [["#", "Full Name", "Dept", "Job Title", "Tier", "Line Manager", "Score (%)", "Rating"]],
        body: enriched.map((r, i) => [
          i + 1,
          r.respondent_name,
          r.department,
          r.job_title,
          r.tier,
          r.line_manager,
          r.total_scorable > 0 ? `${r.score_percent}%` : "N/A",
          r.score_label,
        ]),
        styles: { fontSize: 7, cellPadding: 2 },
        headStyles: { fillColor: [99, 102, 241], fontSize: 7 },
        alternateRowStyles: { fillColor: [245, 245, 255] },
        columnStyles: {
          0: { cellWidth: 8 },
          6: { halign: "center", fontStyle: "bold" },
          7: { halign: "center" },
        },
      });

      // Detailed answers table on new page
      doc.addPage();
      doc.setFillColor(99, 102, 241);
      doc.rect(0, 0, pageW, 20, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("Detailed Responses", 14, 14);
      doc.setTextColor(33, 33, 33);

      const detailHead = ["Name", "Score", ...activeQuestions.map((q: any) => q.question_text.substring(0, 25))];
      const detailBody = enriched.map(r => [
        r.respondent_name,
        r.total_scorable > 0 ? `${r.score_percent}%` : "N/A",
        ...activeQuestions.map((q: any) => {
          const ans = r.answers.find((a: any) => a.question_id === q.id);
          return ans ? getAnswerText(ans).substring(0, 40) : "";
        }),
      ]);

      autoTable(doc, {
        startY: 28,
        head: [detailHead],
        body: detailBody,
        styles: { fontSize: 6, cellPadding: 1.5 },
        headStyles: { fillColor: [99, 102, 241], fontSize: 6 },
        alternateRowStyles: { fillColor: [248, 248, 255] },
      });

      // Footer on all pages
      const pages = doc.getNumberOfPages();
      for (let i = 1; i <= pages; i++) {
        doc.setPage(i);
        doc.setFontSize(7);
        doc.setTextColor(150);
        doc.text(`Lumofy HR Survey Report — Confidential — Page ${i}/${pages}`, 14, doc.internal.pageSize.getHeight() - 8);
      }

      doc.save(`${surveyData?.title || "survey"}-detailed-report.pdf`);
      toast.success("PDF report with employee details downloaded!");
    } catch {
      toast.error("PDF export failed");
    }
    setExporting(false);
  };

  return (
    <div className="space-y-6">
      {/* Survey selector */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <Select value={surveyId} onValueChange={(v) => { setSurveyId(v); setSelectedResponse(null); setSearch(""); }}>
          <SelectTrigger className="w-80">
            <SelectValue placeholder="Select a survey to view responses" />
          </SelectTrigger>
          <SelectContent>
            {surveys.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                <span className="flex items-center gap-2">
                  <FileText className="w-3.5 h-3.5 text-muted-foreground" />
                  {s.title}
                  <Badge variant="secondary" className="text-[10px] ml-1">{s.response_count || 0}</Badge>
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {!surveyId ? (
        <Card className="border-dashed border-2">
          <CardContent className="py-20 text-center text-muted-foreground">
            <Users className="w-12 h-12 mx-auto mb-4 opacity-30" />
            <h3 className="text-base font-semibold mb-1">No Survey Selected</h3>
            <p className="text-sm">Choose a survey above to view its responses</p>
          </CardContent>
        </Card>
      ) : loading ? (
        <div className="text-center py-20">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary mb-3" />
          <p className="text-sm text-muted-foreground">Loading responses...</p>
        </div>
      ) : (
        <>
          {/* Stats Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { label: "Total Responses", value: responses.length, icon: MessageSquare, color: "text-primary" },
              { label: "Anonymous", value: anonymousCount, icon: User, color: "text-muted-foreground" },
              { label: "Questions", value: questions.length, icon: Hash, color: "text-amber-500" },
              { label: "Top Department", value: topDept ? topDept[0] : "—", icon: Users, color: "text-emerald-500", sub: topDept ? `${topDept[1]} responses` : undefined },
            ].map((stat, i) => (
              <motion.div key={stat.label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                <Card className="border-border">
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className={`p-2.5 rounded-xl bg-secondary/80 ${stat.color}`}>
                      <stat.icon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[11px] text-muted-foreground uppercase tracking-wider">{stat.label}</p>
                      <p className="text-lg font-bold truncate">{stat.value}</p>
                      {stat.sub && <p className="text-[10px] text-muted-foreground">{stat.sub}</p>}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>

          {responses.length === 0 ? (
            <Card className="border-dashed border-2">
              <CardContent className="py-16 text-center text-muted-foreground">
                <MessageSquare className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <h3 className="text-base font-semibold mb-1">No Responses Yet</h3>
                <p className="text-sm">Share the survey link to start collecting responses</p>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Toolbar */}
              <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by name, email, department..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleExportExcel} disabled={exporting} className="gap-1.5">
                    {exporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileSpreadsheet className="w-3.5 h-3.5" />} Excel
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleExportPDF} disabled={exporting} className="gap-1.5">
                    {exporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileText className="w-3.5 h-3.5" />} PDF Report
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleExportCSV} disabled={exporting} className="gap-1.5">
                    <Download className="w-3.5 h-3.5" /> CSV
                  </Button>
                </div>
              </div>

              {/* Responses Table */}
              <Card className="border-border overflow-hidden">
                <div className="max-h-[560px] overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-secondary/40 hover:bg-secondary/40">
                        <TableHead className="w-12 text-center">#</TableHead>
                        <TableHead>
                          <button onClick={() => toggleSort("name")} className="flex items-center gap-1 hover:text-foreground transition-colors">
                            Respondent <SortIcon field="name" />
                          </button>
                        </TableHead>
                        <TableHead className="hidden md:table-cell">Department</TableHead>
                        <TableHead>
                          <button onClick={() => toggleSort("date")} className="flex items-center gap-1 hover:text-foreground transition-colors">
                            Submitted <SortIcon field="date" />
                          </button>
                        </TableHead>
                        <TableHead className="text-center">Answers</TableHead>
                        <TableHead className="w-24 text-center">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <AnimatePresence>
                        {filtered.map((resp, i) => (
                          <motion.tr
                            key={resp.id}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ delay: i * 0.02 }}
                            className="border-b transition-colors hover:bg-muted/50 cursor-pointer"
                            onClick={() => setSelectedResponse(resp)}
                          >
                            <TableCell className="text-center text-muted-foreground text-xs font-mono">{i + 1}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                                  {resp.is_anonymous ? (
                                    <User className="w-3.5 h-3.5 text-muted-foreground" />
                                  ) : (
                                    <span className="text-xs font-bold text-primary">
                                      {(resp.respondent_name || "U")[0].toUpperCase()}
                                    </span>
                                  )}
                                </div>
                                <div className="min-w-0">
                                  <p className="text-sm font-medium truncate">
                                    {resp.is_anonymous ? (
                                      <span className="italic text-muted-foreground">Anonymous</span>
                                    ) : (
                                      resp.respondent_name || "Unknown"
                                    )}
                                  </p>
                                  {!resp.is_anonymous && resp.respondent_email && (
                                    <p className="text-[11px] text-muted-foreground truncate">{resp.respondent_email}</p>
                                  )}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="hidden md:table-cell">
                              {resp.respondent_department ? (
                                <Badge variant="secondary" className="text-[10px] font-normal">{resp.respondent_department}</Badge>
                              ) : (
                                <span className="text-xs text-muted-foreground">—</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <span className="text-xs text-muted-foreground flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {resp.completed_at ? new Date(resp.completed_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "In progress"}
                              </span>
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge variant="outline" className="text-[10px]">{(resp.answers || []).length}/{questions.length}</Badge>
                            </TableCell>
                            <TableCell className="text-center">
                              <div className="flex items-center justify-center gap-0.5">
                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); setSelectedResponse(resp); }} title="View responses">
                                  <Eye className="w-3.5 h-3.5" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-primary hover:text-primary hover:bg-primary/10"
                                  onClick={(e) => { e.stopPropagation(); setAiAnalysisResponse(resp); }}
                                  title="AI Analysis"
                                >
                                  <Sparkles className="w-3.5 h-3.5" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                                  onClick={(e) => { e.stopPropagation(); setDeleteTarget(resp); }}
                                  title="Delete response"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                              </div>
                            </TableCell>
                          </motion.tr>
                        ))}
                      </AnimatePresence>
                    </TableBody>
                  </Table>
                </div>
                {filtered.length > 0 && (
                  <div className="px-4 py-2.5 border-t border-border bg-secondary/20 text-xs text-muted-foreground flex items-center justify-between">
                    <span>Showing {filtered.length} of {responses.length} responses</span>
                    <span>{questions.length} questions</span>
                  </div>
                )}
              </Card>
            </>
          )}
        </>
      )}

      {/* Response Detail Dialog */}
      <Dialog open={!!selectedResponse} onOpenChange={(open) => { if (!open) { setSelectedResponse(null); setDetailFullscreen(false); } }}>
        <DialogContent className={`flex flex-col transition-all duration-300 ${
          detailFullscreen
            ? "max-w-[100vw] w-[100vw] h-[100vh] max-h-[100vh] rounded-none"
            : "max-w-2xl max-h-[90vh]"
        }`}>
          <DialogHeader className="shrink-0">
            <div className="flex items-center justify-between">
              <DialogTitle className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  {selectedResponse?.is_anonymous ? (
                    <User className="w-4 h-4 text-muted-foreground" />
                  ) : (
                    <span className="text-sm font-bold text-primary">
                      {(selectedResponse?.respondent_name || "U")[0].toUpperCase()}
                    </span>
                  )}
                </div>
                <div>
                  <p className="text-base font-semibold">
                    {selectedResponse?.is_anonymous ? "Anonymous Response" : (selectedResponse?.respondent_name || "Unknown Respondent")}
                  </p>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground font-normal flex-wrap">
                    {!selectedResponse?.is_anonymous && selectedResponse?.respondent_email && (
                      <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{selectedResponse.respondent_email}</span>
                    )}
                    {selectedResponse?.respondent_department && (
                      <Badge variant="secondary" className="text-[10px] font-normal">{selectedResponse.respondent_department}</Badge>
                    )}
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {selectedResponse?.completed_at
                        ? new Date(selectedResponse.completed_at).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" })
                        : "In progress"}
                    </span>
                    <Badge variant="outline" className="text-[10px]">{(selectedResponse?.answers || []).length}/{questions.length} answered</Badge>
                  </div>
                </div>
              </DialogTitle>
              <div className="flex items-center gap-1 shrink-0">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={() => { setDeleteTarget(selectedResponse); }}
                  title="Delete response"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-foreground"
                  onClick={() => setDetailFullscreen(f => !f)}
                  title={detailFullscreen ? "Exit fullscreen" : "Fullscreen"}
                >
                  {detailFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                </Button>
              </div>
            </div>
          </DialogHeader>

          <Separator />

          <div className="flex-1 overflow-y-auto pr-1 min-h-0">
            <div className="space-y-3 py-4">
              {questions.map((q: any, qi: number) => {
                const ans = (selectedResponse?.answers || []).find((a: any) => a.question_id === q.id);
                const hasAnswer = !!ans && (ans.answer_text || ans.answer_json);
                return (
                  <motion.div
                    key={q.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: qi * 0.03 }}
                    className={`rounded-lg border p-4 transition-colors ${
                      hasAnswer ? "border-border bg-secondary/20" : "border-border/50 bg-muted/10"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 mt-0.5 ${
                        hasAnswer ? "bg-primary/10" : "bg-muted/30"
                      }`}>
                        <span className={`text-[10px] font-bold ${hasAnswer ? "text-primary" : "text-muted-foreground"}`}>{qi + 1}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-medium text-foreground mb-1">{q.question_text}</p>
                          <div className="flex gap-1 shrink-0">
                            {q.is_required && (
                              <Badge variant="outline" className="text-[9px] text-destructive border-destructive/30">Required</Badge>
                            )}
                            <Badge variant="outline" className="text-[9px] capitalize text-muted-foreground">{q.type?.replace(/_/g, " ")}</Badge>
                          </div>
                        </div>
                        <div className={`mt-1.5 text-sm rounded-md px-3 py-2 border ${
                          hasAnswer
                            ? "text-foreground/90 bg-background border-border/50"
                            : "text-muted-foreground italic bg-muted/20 border-transparent"
                        }`}>
                          {ans ? getAnswerDisplay(ans) : "No answer provided"}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}

              {selectedResponse && sessionToken && (
                <ResponseAIAnalysis
                  answers={selectedResponse.answers || []}
                  questions={questions}
                  surveyTitle={surveyData?.title || "Survey"}
                  respondentName={selectedResponse.is_anonymous ? "Anonymous" : (selectedResponse.respondent_name || "Unknown")}
                  respondentDepartment={selectedResponse.respondent_department || undefined}
                  sessionToken={sessionToken}
                />
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* AI Analysis Dialog */}
      <Dialog open={!!aiAnalysisResponse} onOpenChange={(open) => { if (!open) { setAiAnalysisResponse(null); setAiFullscreen(false); } }}>
        <DialogContent className={`flex flex-col transition-all duration-300 ${
          aiFullscreen
            ? "max-w-[100vw] w-[100vw] h-[100vh] max-h-[100vh] rounded-none"
            : "max-w-2xl max-h-[90vh]"
        }`}>
          <DialogHeader className="shrink-0">
            <div className="flex items-center justify-between">
              <DialogTitle className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-primary/10">
                  <Sparkles className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-base font-semibold">AI Response Analysis</p>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground font-normal">
                    <span>
                      {aiAnalysisResponse?.is_anonymous ? "Anonymous" : (aiAnalysisResponse?.respondent_name || "Unknown")}
                    </span>
                    {aiAnalysisResponse?.respondent_department && (
                      <Badge variant="secondary" className="text-[10px] font-normal">{aiAnalysisResponse.respondent_department}</Badge>
                    )}
                  </div>
                </div>
              </DialogTitle>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground"
                onClick={() => setAiFullscreen(f => !f)}
                title={aiFullscreen ? "Exit fullscreen" : "Fullscreen"}
              >
                {aiFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </Button>
            </div>
          </DialogHeader>

          <Separator />

          <div className="flex-1 overflow-y-auto pr-1 min-h-0">
            <div className="py-4">
              {aiAnalysisResponse && sessionToken && (
                <ResponseAIAnalysis
                  answers={aiAnalysisResponse.answers || []}
                  questions={questions}
                  surveyTitle={surveyData?.title || "Survey"}
                  respondentName={aiAnalysisResponse.is_anonymous ? "Anonymous" : (aiAnalysisResponse.respondent_name || "Unknown")}
                  respondentDepartment={aiAnalysisResponse.respondent_department || undefined}
                  sessionToken={sessionToken}
                  autoRun
                />
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Response</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the response from{" "}
              <strong>{deleteTarget?.is_anonymous ? "Anonymous" : (deleteTarget?.respondent_name || "Unknown")}</strong>?
              This will permanently remove all their answers and cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteResponse}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? <><Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> Deleting...</> : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default SurveyResponsesView;
