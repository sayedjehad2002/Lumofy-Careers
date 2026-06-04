import { useState, useEffect, useMemo } from "react";
import { FileDown, Loader2, Sparkles, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { Survey, SurveyResponse, SurveyQuestion } from "@/types/surveys";
import { fetchEmployeeLookup, enrichResponses, getAnswerText } from "@/utils/surveyExportUtils";

interface Props {
  surveys: Survey[];
  sessionToken: string;
}

const ExecutiveSummaryExport = ({ surveys, sessionToken }: Props) => {
  const [surveyId, setSurveyId] = useState("");
  const [responses, setResponses] = useState<SurveyResponse[]>([]);
  const [questions, setQuestions] = useState<SurveyQuestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [aiSummary, setAiSummary] = useState("");
  const [aiLoading, setAiLoading] = useState(false);

  useEffect(() => {
    if (!surveyId || !sessionToken) return;
    const f = async () => {
      setLoading(true);
      setAiSummary("");
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
        setQuestions(surveyJson.survey?.questions || []);
      } catch {}
      setLoading(false);
    };
    f();
  }, [surveyId, sessionToken]);

  const selectedSurvey = surveys.find(s => s.id === surveyId);

  const analytics = useMemo(() => {
    if (!questions.length || !responses.length) return null;
    const results: { question: string; type: string; summary: string }[] = [];

    questions.filter(q => q.type !== "section_divider" && q.type !== "statement").forEach(q => {
      const answers = responses.flatMap(r => (r.answers || []).filter(a => a.question_id === q.id));
      const total = answers.length;

      if (["rating", "nps"].includes(q.type)) {
        const values = answers.map(a => parseFloat(a.answer_text || "0")).filter(v => !isNaN(v));
        const avg = values.length ? (values.reduce((s, v) => s + v, 0) / values.length).toFixed(1) : "N/A";
        if (q.type === "nps" && values.length > 0) {
          const p = values.filter(v => v >= 9).length;
          const d = values.filter(v => v <= 6).length;
          const nps = Math.round(((p - d) / values.length) * 100);
          results.push({ question: q.question_text, type: "NPS", summary: `eNPS: ${nps} (Avg: ${avg}, ${total} responses)` });
        } else {
          results.push({ question: q.question_text, type: "Rating", summary: `Average: ${avg}/5 (${total} responses)` });
        }
      } else if (["single_choice", "multiple_choice", "dropdown", "likert", "yes_no"].includes(q.type)) {
        const counts: Record<string, number> = {};
        answers.forEach(a => {
          if (a.answer_text) counts[a.answer_text] = (counts[a.answer_text] || 0) + 1;
          if (Array.isArray(a.answer_json)) a.answer_json.forEach((v: string) => { counts[v] = (counts[v] || 0) + 1; });
        });
        const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
        const top = sorted.slice(0, 3).map(([k, v]) => `${k} (${Math.round(v / total * 100)}%)`).join(", ");
        results.push({ question: q.question_text, type: q.type, summary: `Top: ${top} (${total} responses)` });
      } else {
        results.push({ question: q.question_text, type: "Text", summary: `${total} text responses collected` });
      }
    });

    return results;
  }, [questions, responses]);

  const generateAISummary = async () => {
    if (!analytics || analytics.length === 0) return;
    setAiLoading(true);
    try {
      const summaryData = analytics.map(a => `${a.question}: ${a.summary}`).join("\n");
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/survey-ai-insights`, {
        method: "POST",
        headers: { "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY, "Content-Type": "application/json" },
        body: JSON.stringify({
          responses: [summaryData],
          question_text: "Executive summary of all survey results",
          survey_title: selectedSurvey?.title || "Survey",
        }),
      });
      if (res.status === 429) { toast.error("Rate limit exceeded"); setAiLoading(false); return; }
      const json = await res.json();
      setAiSummary(json.insights?.summary || "AI summary could not be generated.");
    } catch {
      toast.error("Failed to generate AI summary");
    }
    setAiLoading(false);
  };

  const exportPDF = async () => {
    if (!analytics || !selectedSurvey) return;
    setLoading(true);
    try {
      const empLookup = await fetchEmployeeLookup(sessionToken);
      const enriched = enrichResponses(responses, questions, empLookup);
      const activeQuestions = questions.filter(q => q.type !== "section_divider" && q.type !== "statement");

      const doc = new jsPDF();
      const pageW = doc.internal.pageSize.getWidth();

      // Header
      doc.setFillColor(99, 102, 241);
      doc.rect(0, 0, pageW, 32, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.text("Executive Summary", 14, 16);
      doc.setFontSize(10);
      doc.text(selectedSurvey.title, 14, 24);
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.text(`${responses.length} responses · Generated ${new Date().toLocaleDateString()}`, 14, 30);
      doc.setTextColor(33, 33, 33);

      let y = 42;

      // AI Summary
      if (aiSummary) {
        doc.setFontSize(11);
        doc.setFont("helvetica", "bold");
        doc.text("AI-Generated Narrative", 14, y);
        y += 6;
        doc.setFontSize(8);
        doc.setFont("helvetica", "normal");
        const lines = doc.splitTextToSize(aiSummary, 180);
        doc.text(lines, 14, y);
        y += lines.length * 4 + 8;
      }

      // Score overview
      const scored = enriched.filter(r => r.total_scorable > 0);
      if (scored.length > 0) {
        const avgScore = Math.round(scored.reduce((s, r) => s + r.score_percent, 0) / scored.length);
        doc.setFontSize(11);
        doc.setFont("helvetica", "bold");
        doc.text("Score Overview", 14, y);
        y += 6;
        doc.setFontSize(9);
        doc.setFont("helvetica", "normal");
        doc.text(`Average Score: ${avgScore}% out of 100%`, 14, y); y += 5;
        doc.text(`Highest: ${scored.sort((a, b) => b.score_percent - a.score_percent)[0].respondent_name} (${scored[0].score_percent}%)`, 14, y); y += 5;
        doc.text(`Lowest: ${scored[scored.length - 1].respondent_name} (${scored[scored.length - 1].score_percent}%)`, 14, y); y += 8;
      }

      // Question summary table
      autoTable(doc, {
        startY: y,
        head: [["Question", "Type", "Summary"]],
        body: analytics.map(a => [a.question, a.type, a.summary]),
        styles: { fontSize: 7, cellPadding: 2 },
        headStyles: { fillColor: [99, 102, 241] },
      });

      // Individual scores page
      doc.addPage();
      doc.setFillColor(99, 102, 241);
      doc.rect(0, 0, pageW, 20, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("Individual Response Scores", 14, 14);
      doc.setTextColor(33, 33, 33);

      autoTable(doc, {
        startY: 28,
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
        columnStyles: { 6: { halign: "center", fontStyle: "bold" } },
      });

      // Footer
      const pages = doc.getNumberOfPages();
      for (let i = 1; i <= pages; i++) {
        doc.setPage(i);
        doc.setFontSize(7);
        doc.setTextColor(150);
        doc.text(`Lumofy HR Survey Report — Confidential — Page ${i}/${pages}`, 14, doc.internal.pageSize.getHeight() - 8);
      }

      doc.save(`executive-summary-${selectedSurvey.title.replace(/\s+/g, "-").toLowerCase()}.pdf`);
      toast.success("PDF exported with individual scores!");
    } catch {
      toast.error("PDF export failed");
    }
    setLoading(false);
  };

  const exportExcel = async () => {
    if (!analytics || !selectedSurvey) return;
    setLoading(true);
    try {
      const empLookup = await fetchEmployeeLookup(sessionToken);
      const enriched = enrichResponses(responses, questions, empLookup);
      const activeQuestions = questions.filter(q => q.type !== "section_divider" && q.type !== "statement");

      const wb = XLSX.utils.book_new();

      // Sheet 1: Executive Summary
      const ws = XLSX.utils.json_to_sheet(analytics.map(a => ({
        Question: a.question, Type: a.type, Summary: a.summary,
      })));
      XLSX.utils.book_append_sheet(wb, ws, "Executive Summary");

      // Sheet 2: Individual Scores
      const scoreData = enriched.map((r, i) => ({
        "#": i + 1,
        "Full Name": r.respondent_name,
        "Email": r.respondent_email,
        "Department": r.department,
        "Job Title": r.job_title,
        "Tier": r.tier,
        "Line Manager": r.line_manager,
        "Score (%)": r.total_scorable > 0 ? r.score_percent : "N/A",
        "Rating": r.score_label,
        "Submitted": r.completed_at ? new Date(r.completed_at).toLocaleString() : "In Progress",
      }));
      const ws2 = XLSX.utils.json_to_sheet(scoreData);
      ws2["!cols"] = [{ wch: 5 }, { wch: 25 }, { wch: 25 }, { wch: 20 }, { wch: 20 }, { wch: 10 }, { wch: 20 }, { wch: 12 }, { wch: 14 }, { wch: 20 }];
      XLSX.utils.book_append_sheet(wb, ws2, "Individual Scores");

      // Sheet 3: Raw Responses with all answers
      const rawData = enriched.map(r => {
        const row: Record<string, string> = {
          "Full Name": r.respondent_name,
          "Department": r.department,
          "Job Title": r.job_title,
          "Tier": r.tier,
          "Line Manager": r.line_manager,
          "Score (%)": r.total_scorable > 0 ? `${r.score_percent}` : "N/A",
        };
        (r.answers || []).forEach(a => {
          const q = questions.find(qq => qq.id === a.question_id);
          row[q?.question_text || "Q"] = getAnswerText(a);
        });
        return row;
      });
      const ws3 = XLSX.utils.json_to_sheet(rawData);
      XLSX.utils.book_append_sheet(wb, ws3, "Raw Responses");

      // Sheet 4: Department Breakdown
      const deptScores: Record<string, { scores: number[]; count: number }> = {};
      enriched.forEach(r => {
        const dept = r.department || "Unspecified";
        if (!deptScores[dept]) deptScores[dept] = { scores: [], count: 0 };
        deptScores[dept].count++;
        if (r.total_scorable > 0) deptScores[dept].scores.push(r.score_percent);
      });
      const deptData = Object.entries(deptScores).map(([dept, d]) => ({
        "Department": dept,
        "Respondents": d.count,
        "Avg Score (%)": d.scores.length > 0 ? Math.round(d.scores.reduce((a, b) => a + b, 0) / d.scores.length) : "N/A",
        "Highest (%)": d.scores.length > 0 ? Math.max(...d.scores) : "N/A",
        "Lowest (%)": d.scores.length > 0 ? Math.min(...d.scores) : "N/A",
      }));
      const ws4 = XLSX.utils.json_to_sheet(deptData);
      XLSX.utils.book_append_sheet(wb, ws4, "Department Breakdown");

      XLSX.writeFile(wb, `survey-report-${selectedSurvey.title.replace(/\s+/g, "-").toLowerCase()}.xlsx`);
      toast.success("Excel exported with individual scores!");
    } catch {
      toast.error("Excel export failed");
    }
    setLoading(false);
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-base font-semibold flex items-center gap-2">
          <FileDown className="w-5 h-5 text-primary" /> Executive Summary Export
        </h3>
        <p className="text-sm text-muted-foreground">One-click PDF/Excel reports with AI-generated narrative insights</p>
      </div>

      <Select value={surveyId} onValueChange={setSurveyId}>
        <SelectTrigger className="w-72"><SelectValue placeholder="Select a survey" /></SelectTrigger>
        <SelectContent>
          {surveys.filter(s => s.status !== "draft").map(s => (
            <SelectItem key={s.id} value={s.id}>{s.title}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {!surveyId ? (
        <Card className="border-dashed border-2">
          <CardContent className="py-12 text-center text-muted-foreground">
            <FileDown className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p>Select a survey to generate an executive report</p>
          </CardContent>
        </Card>
      ) : loading ? (
        <div className="text-center py-16"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></div>
      ) : (
        <>
          {/* Action buttons */}
          <div className="flex gap-3 flex-wrap">
            <Button onClick={generateAISummary} disabled={aiLoading || !analytics?.length} variant="outline">
              {aiLoading ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Sparkles className="w-4 h-4 mr-1" />}
              Generate AI Narrative
            </Button>
            <Button onClick={exportPDF} disabled={!analytics?.length}>
              <FileDown className="w-4 h-4 mr-1" /> Export PDF
            </Button>
            <Button onClick={exportExcel} disabled={!analytics?.length} variant="outline">
              <FileText className="w-4 h-4 mr-1" /> Export Excel
            </Button>
          </div>

          {/* AI Summary */}
          {aiSummary && (
            <Card className="border-primary/20 bg-primary/[0.02]">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-primary" /> AI-Generated Narrative
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{aiSummary}</p>
              </CardContent>
            </Card>
          )}

          {/* Summary Table */}
          {analytics && analytics.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Results Summary ({responses.length} responses)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-2 text-xs text-muted-foreground font-medium">Question</th>
                        <th className="text-center py-2 text-xs text-muted-foreground font-medium w-20">Type</th>
                        <th className="text-left py-2 text-xs text-muted-foreground font-medium">Summary</th>
                      </tr>
                    </thead>
                    <tbody>
                      {analytics.map((a, i) => (
                        <tr key={i} className="border-b border-border/50">
                          <td className="py-2 font-medium">{a.question}</td>
                          <td className="py-2 text-center"><Badge variant="secondary" className="text-[10px]">{a.type}</Badge></td>
                          <td className="py-2 text-muted-foreground">{a.summary}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
};

export default ExecutiveSummaryExport;
