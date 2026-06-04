import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { X, Send, Sparkles, Brain, Loader2, MessageCircle, ChevronDown, History, Plus, Trash2, ChevronLeft, Pin, PinOff, Search, Users, BarChart3, FileQuestion, Zap, AlertTriangle, Bell, ArrowRight, StickyNote, UserCheck, UserX, CheckCircle2, XCircle, BookOpen, FileText, Download, PieChart, TrendingUp, Database, Maximize2, Minimize2, Mic, MicOff, ThumbsUp, ThumbsDown, Volume2, Globe, Image, Lightbulb, Mail, Eye } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { adminQuery } from "@/lib/adminQuery";
import { APPLICANT_STATUSES, type Applicant, type ApplicantStatus, type Job } from "@/types/careers";
import { toast } from "sonner";
import lumofyLogo from "@/assets/lumofy-mark.png";
import { parseChartBlocks, InlineChart, type ChartBlock } from "./CopilotChart";
import { parseReportRequests, ReportDownloadCard, type ReportRequest } from "./CopilotReport";

// Action card types for executable actions from chat
interface ActionCard {
  id: string;
  type: "move" | "note" | "reject" | "hire";
  candidateName: string;
  candidateId: string;
  description: string;
  targetStatus?: ApplicantStatus;
  noteText?: string;
  status: "pending" | "executing" | "done" | "failed";
}

interface SmartInsight {
  type: "risk" | "opportunity" | "action";
  priority: "high" | "medium" | "low";
  title: string;
  description: string;
  suggested_action: string;
}

interface EmailDraft {
  to: string;
  subject: string;
  body: string;
  type: "offer" | "rejection" | "followup" | "interview_invite";
}

type Msg = { role: "user" | "assistant"; content: string | MessageContent[]; followUps?: string[]; pinned?: boolean; actions?: ActionCard[]; charts?: ChartBlock[]; reports?: ReportRequest[]; reaction?: "up" | "down"; insights?: SmartInsight[]; emailDrafts?: EmailDraft[]; imageUrl?: string };

type MessageContent = { type: "text"; text: string } | { type: "image_url"; image_url: { url: string } };

export interface CopilotContext {
  candidateId?: string;
  jobId?: string;
  autoPrompt?: string;
  candidateData?: Record<string, any>;
}

interface SavedSession {
  id: string;
  title: string;
  candidate_id: string | null;
  job_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface CrossModuleData {
  surveys?: { id: string; title: string; status: string; responseCount: number; category: string }[];
  turnover?: { totalExits: number; voluntaryExits: number; topDepartments: { dept: string; count: number }[]; period: string }; 
  performance?: { totalEmployees: number; highPerformers: number; highPotential: number; redFlags: number; avgRating: number; snapshotName: string };
  cvLibrary?: { totalCVs: number; topSkills: { skill: string; count: number }[]; departments: { dept: string; count: number }[] };
}

interface ProactiveAlert {
  type: "warning" | "info" | "urgent";
  icon: React.ReactNode;
  message: string;
  action?: string;
}

interface CopilotWidgetProps {
  jobs: Job[];
  applicants: Applicant[];
  sessionToken: string;
  initialContext?: CopilotContext | null;
  onClearContext?: () => void;
  embedded?: boolean;
  onNavigateToCandidate?: (applicant: Applicant) => void;
  crossModuleData?: CrossModuleData;
  onUpdateStatus?: (applicantId: string, status: ApplicantStatus) => Promise<void>;
  onAddNote?: (applicantId: string, note: string) => Promise<void>;
  onRefreshData?: () => Promise<void>;
}

// ── Slash Commands ──
interface SlashCommand {
  command: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  buildPrompt: (ctx: { candidate?: Applicant; job?: Job; jobs: Job[]; applicants: Applicant[] }) => string;
}

const SLASH_COMMANDS: SlashCommand[] = [
  {
    command: "/compare",
    label: "Compare Candidates",
    description: "Side-by-side comparison of top candidates for a role",
    icon: <Users className="w-3.5 h-3.5" />,
    buildPrompt: ({ job }) => {
      if (job) return `Compare the top candidates for ${job.title}. Show a comparison table with scores, strengths, gaps, and a ranking.`;
      return `Compare the top candidates across all open roles. Show a comparison table with scores, strengths, gaps, and a ranking.`;
    },
  },
  {
    command: "/summarize",
    label: "Summarize Candidate",
    description: "Get a quick profile summary with strengths & gaps",
    icon: <Search className="w-3.5 h-3.5" />,
    buildPrompt: ({ candidate }) => {
      if (candidate) return `Summarize ${candidate.fullName}'s profile, strengths, gaps, and overall fit.`;
      return `Summarize the current hiring pipeline — how many candidates per stage, top-rated candidates, and any concerns.`;
    },
  },
  {
    command: "/interview-prep",
    label: "Interview Prep",
    description: "Generate tailored interview questions for a candidate",
    icon: <FileQuestion className="w-3.5 h-3.5" />,
    buildPrompt: ({ candidate }) => {
      if (candidate) return `Generate interview questions for ${candidate.fullName}. Target their specific gaps, validate their strengths, and assess risks.`;
      return `Generate general interview questions for the most common skill gaps across current candidates.`;
    },
  },
  {
    command: "/pipeline",
    label: "Pipeline Report",
    description: "Overview of hiring pipeline health and bottlenecks",
    icon: <BarChart3 className="w-3.5 h-3.5" />,
    buildPrompt: () => `Give me a pipeline health report. Include: candidates per stage, average time in stage, bottlenecks, overdue candidates, and recommendations. Include a funnel chart.`,
  },
  {
    command: "/top",
    label: "Top Matches",
    description: "Show the highest-rated candidates",
    icon: <Zap className="w-3.5 h-3.5" />,
    buildPrompt: ({ job }) => {
      if (job) return `Show the top 5 candidates for ${job.title} ranked by AI score. Include their score, recommendation, and key strengths.`;
      return `Show the top 10 candidates across all roles ranked by AI score. Include their score, role, recommendation, and key strengths.`;
    },
  },
  {
    command: "/alerts",
    label: "Proactive Alerts",
    description: "Show stalled candidates, SLA breaches, and pipeline issues",
    icon: <Bell className="w-3.5 h-3.5" />,
    buildPrompt: () => `Analyze the pipeline for proactive alerts. Identify: 1) Candidates stuck in a stage for too long (SLA breaches: New > 3 days, Reviewing > 7 days, Shortlisted > 5 days, Interview > 5 days), 2) Top candidates at risk of losing interest, 3) Jobs with no recent applicants, 4) Any other pipeline health concerns. Be specific with names and numbers.`,
  },
  {
    command: "/turnover",
    label: "Turnover Insights",
    description: "Analyze turnover trends and exit patterns",
    icon: <AlertTriangle className="w-3.5 h-3.5" />,
    buildPrompt: () => `Analyze the turnover data in detail. Show: turnover by department (chart), turnover by manager, turnover by termination type (chart), monthly trends (line chart), tier analysis, and actionable recommendations. Include multiple charts.`,
  },
  {
    command: "/surveys",
    label: "Survey Insights",
    description: "Overview of active surveys and response rates",
    icon: <Search className="w-3.5 h-3.5" />,
    buildPrompt: () => `Give me an overview of our surveys. What surveys are active? What are the response rates? Any surveys that need attention? Summarize the survey program health with charts.`,
  },
  {
    command: "/policy",
    label: "Policy Lookup",
    description: "Ask about any Lumofy HR policy",
    icon: <BookOpen className="w-3.5 h-3.5" />,
    buildPrompt: () => `Give me a summary of all Lumofy HR policies organized by category. Include key entitlements and rules for each.`,
  },
  {
    command: "/draft-jd",
    label: "Draft Job Description",
    description: "Auto-generate a job description based on a role title",
    icon: <FileQuestion className="w-3.5 h-3.5" />,
    buildPrompt: ({ job }) => {
      if (job) return `Draft a comprehensive job description for the "${job.title}" role in ${job.department} at ${job.location}. Include: summary, key responsibilities, required qualifications, preferred qualifications, and benefits. Use Lumofy's tone and format it professionally.`;
      return `I need help drafting a job description. Ask me for the role title, department, and location, then generate a comprehensive JD.`;
    },
  },
  {
    command: "/screening",
    label: "Generate Screening Questions",
    description: "Create screening questions based on job requirements",
    icon: <FileQuestion className="w-3.5 h-3.5" />,
    buildPrompt: ({ job }) => {
      if (job) return `Generate 5-8 screening questions for the "${job.title}" role based on the job requirements. Each question should: 1) Target a specific requirement or skill, 2) Be answerable in 2-3 sentences, 3) Help differentiate strong vs weak candidates. Include a mix of experience, technical, and situational questions.`;
      return `Generate screening questions for the hiring pipeline. Tell me which job role you'd like questions for, or I'll generate questions for all open roles.`;
    },
  },
  {
    command: "/feedback-summary",
    label: "Summarize Interview Feedback",
    description: "Aggregate ratings and notes into a hiring recommendation",
    icon: <BarChart3 className="w-3.5 h-3.5" />,
    buildPrompt: ({ candidate, job }) => {
      if (candidate) return `Summarize all available feedback for ${candidate.fullName}: AI analysis, screening answers, ratings, and any notes. Produce a structured interview feedback summary with: 1) Overall Assessment (one paragraph), 2) Strengths confirmed, 3) Concerns raised, 4) Rating breakdown, 5) Final hiring recommendation with confidence level.`;
      return `Summarize interview feedback for candidates in the interview stage. For each, aggregate their AI scores, ratings, and notes into a concise hiring recommendation.`;
    },
  },
  {
    command: "/move",
    label: "Move Candidate",
    description: "Move a candidate to a different pipeline stage",
    icon: <ArrowRight className="w-3.5 h-3.5" />,
    buildPrompt: ({ candidate }) => {
      if (candidate) return `I want to move ${candidate.fullName} to the next stage. Suggest the best next stage based on their profile and current status (${candidate.status}), and generate an ACTION_MOVE block.`;
      return `Which candidates should be moved to the next stage? Analyze the pipeline and suggest moves with ACTION_MOVE blocks.`;
    },
  },
  {
    command: "/note",
    label: "Add Note",
    description: "Add a note to a candidate's profile",
    icon: <StickyNote className="w-3.5 h-3.5" />,
    buildPrompt: ({ candidate }) => {
      if (candidate) return `Generate a professional note summarizing the current assessment of ${candidate.fullName} and output it as an ACTION_NOTE block.`;
      return `Generate assessment notes for the top candidates that need attention, with ACTION_NOTE blocks.`;
    },
  },
  {
    command: "/reject",
    label: "Reject Candidate",
    description: "Move a candidate to rejected status",
    icon: <UserX className="w-3.5 h-3.5" />,
    buildPrompt: ({ candidate }) => {
      if (candidate) return `Should ${candidate.fullName} be rejected? Analyze their profile and if yes, generate an ACTION_MOVE block to rejected status with justification.`;
      return `Which candidates should be rejected based on low AI scores and critical gaps? Generate ACTION_MOVE blocks for each.`;
    },
  },
  {
    command: "/hire",
    label: "Hire Candidate",
    description: "Move a candidate to hired status",
    icon: <UserCheck className="w-3.5 h-3.5" />,
    buildPrompt: ({ candidate }) => {
      if (candidate) return `Is ${candidate.fullName} ready to be hired? Analyze their profile, scores, and pipeline stage. If yes, generate an ACTION_MOVE block to hired status.`;
      return `Which candidates are ready to be hired? Show top candidates with scores above 80 who are in interview stage, with ACTION_MOVE blocks.`;
    },
  },
  {
    command: "/report",
    label: "Generate Report",
    description: "Create a downloadable PDF/Excel/Word HR report",
    icon: <Download className="w-3.5 h-3.5" />,
    buildPrompt: () => `Generate a comprehensive HR intelligence report covering: executive summary, recruitment pipeline health, turnover analysis, performance overview, survey insights, and recommendations. Include a REPORT_REQUEST block for PDF download.`,
  },
  {
    command: "/cv-library",
    label: "CV Library Analysis",
    description: "Analyze the talent pool in the CV library",
    icon: <Database className="w-3.5 h-3.5" />,
    buildPrompt: () => `Analyze our CV library. Show: total CVs, skills distribution (chart), experience levels (chart), department coverage, nationality breakdown (pie chart), and talent pool strength. Include multiple charts.`,
  },
  {
    command: "/overview",
    label: "Executive Overview",
    description: "Full HR dashboard intelligence summary",
    icon: <TrendingUp className="w-3.5 h-3.5" />,
    buildPrompt: () => `Give me an executive HR overview. Include: workforce headcount trends (line chart), recruitment pipeline status (funnel), turnover breakdown (bar chart), performance highlights, survey engagement, and CV library stats. Provide strategic recommendations.`,
  },
  {
    command: "/export-excel",
    label: "Export to Excel",
    description: "Generate an Excel data export",
    icon: <FileText className="w-3.5 h-3.5" />,
    buildPrompt: () => `Generate an HR data export in Excel format covering turnover metrics, recruitment pipeline, and performance analysis. Include a REPORT_REQUEST block for Excel download.`,
  },
  {
    command: "/workforce",
    label: "Workforce Analytics",
    description: "Headcount trends, growth rates, and demographics",
    icon: <Users className="w-3.5 h-3.5" />,
    buildPrompt: () => `Analyze our workforce data. Show headcount trends over time (line chart), growth rate, department sizes, and demographics. Provide insights on workforce health.`,
  },
  {
    command: "/performance",
    label: "Performance Analysis",
    description: "9-box, ratings, department performance, PIP risks",
    icon: <BarChart3 className="w-3.5 h-3.5" />,
    buildPrompt: () => `Give me a detailed performance analysis. Include: 9-box distribution (chart), department performance comparison (bar chart), high performers, PIP risks, manager vs self rating gaps, and recommendations.`,
  },
  {
    command: "/diversity",
    label: "Diversity Report",
    description: "Workforce diversity metrics and insights",
    icon: <PieChart className="w-3.5 h-3.5" />,
    buildPrompt: () => `Analyze workforce diversity from all available data: CV library nationalities, applicant locations, department distribution. Include pie charts for nationality and department diversity. Provide DEI recommendations.`,
  },
];

// Helper to get text content from a message
function getMsgText(content: string | MessageContent[]): string {
  if (typeof content === "string") return content;
  return content.filter(c => c.type === "text").map(c => (c as { type: "text"; text: string }).text).join("\n");
}

// Helper to get image from user message content
function getMsgImage(content: string | MessageContent[]): string | undefined {
  if (typeof content === "string") return undefined;
  const img = content.find(c => c.type === "image_url") as { type: "image_url"; image_url: { url: string } } | undefined;
  return img?.image_url?.url;
}

// Parse SMART_INSIGHT blocks from AI response
function parseSmartInsights(content: string): { cleanContent: string; insights: SmartInsight[] } {
  const insights: SmartInsight[] = [];
  let cleanContent = content;
  const regex = /SMART_INSIGHT:\s*(\{[\s\S]*?\})\s*(?:\n|$)/gi;
  let match;
  while ((match = regex.exec(content)) !== null) {
    try {
      const parsed = JSON.parse(match[1]);
      insights.push(parsed);
      cleanContent = cleanContent.replace(match[0], "");
    } catch {}
  }
  return { cleanContent: cleanContent.trim(), insights };
}

// Parse EMAIL_DRAFT blocks from AI response
function parseEmailDrafts(content: string): { cleanContent: string; emailDrafts: EmailDraft[] } {
  const emailDrafts: EmailDraft[] = [];
  let cleanContent = content;
  const regex = /EMAIL_DRAFT:\s*(\{[\s\S]*?\})\s*(?:\n|$)/gi;
  let match;
  while ((match = regex.exec(content)) !== null) {
    try {
      const parsed = JSON.parse(match[1]);
      emailDrafts.push(parsed);
      cleanContent = cleanContent.replace(match[0], "");
    } catch {}
  }
  return { cleanContent: cleanContent.trim(), emailDrafts };
}

// Smart Insight Card
function SmartInsightCard({ insight }: { insight: SmartInsight }) {
  const colorMap = {
    risk: { bg: "bg-destructive/10 border-destructive/20", icon: <AlertTriangle className="w-3.5 h-3.5 text-destructive" />, badge: "bg-destructive/20 text-destructive" },
    opportunity: { bg: "bg-emerald-500/10 border-emerald-500/20", icon: <Lightbulb className="w-3.5 h-3.5 text-emerald-500" />, badge: "bg-emerald-500/20 text-emerald-500" },
    action: { bg: "bg-primary/10 border-primary/20", icon: <Zap className="w-3.5 h-3.5 text-primary" />, badge: "bg-primary/20 text-primary" },
  };
  const priorityColors = { high: "text-destructive", medium: "text-yellow-500", low: "text-muted-foreground" };
  const style = colorMap[insight.type] || colorMap.action;

  return (
    <div className={`rounded-lg border p-3 my-2 ${style.bg}`}>
      <div className="flex items-start gap-2">
        {style.icon}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-xs font-semibold">{insight.title}</span>
            <Badge variant="secondary" className={`text-[9px] px-1.5 py-0 h-4 border-0 ${style.badge}`}>
              {insight.type}
            </Badge>
            <span className={`text-[9px] font-medium ${priorityColors[insight.priority]}`}>
              {insight.priority.toUpperCase()}
            </span>
          </div>
          <p className="text-[11px] text-muted-foreground">{insight.description}</p>
          <p className="text-[11px] mt-1 font-medium">💡 {insight.suggested_action}</p>
        </div>
      </div>
    </div>
  );
}

// Email Draft Card
function EmailDraftCard({ draft }: { draft: EmailDraft }) {
  const typeLabels = { offer: "Offer Letter", rejection: "Rejection", followup: "Follow-up", interview_invite: "Interview Invite" };
  const typeColors = { offer: "bg-emerald-500/10 border-emerald-500/20", rejection: "bg-destructive/10 border-destructive/20", followup: "bg-primary/10 border-primary/20", interview_invite: "bg-blue-500/10 border-blue-500/20" };

  return (
    <div className={`rounded-lg border p-3 my-2 ${typeColors[draft.type] || "bg-secondary/50 border-border"}`}>
      <div className="flex items-start gap-2">
        <Mail className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="secondary" className="text-[9px] px-1.5 py-0 h-4 border-0">
              {typeLabels[draft.type] || draft.type}
            </Badge>
            <span className="text-[10px] text-muted-foreground">To: {draft.to}</span>
          </div>
          <p className="text-xs font-medium mb-1">{draft.subject}</p>
          <div className="text-[11px] text-muted-foreground bg-background/50 rounded p-2 max-h-32 overflow-y-auto whitespace-pre-wrap">
            {draft.body}
          </div>
          <div className="flex gap-2 mt-2">
            <Button size="sm" className="h-6 text-[10px] px-2" onClick={() => {
              navigator.clipboard.writeText(draft.body);
              toast.success("Email body copied!");
            }}>
              Copy Email
            </Button>
            <Button size="sm" variant="ghost" className="h-6 text-[10px] px-2" onClick={() => {
              const mailto = `mailto:${draft.to}?subject=${encodeURIComponent(draft.subject)}&body=${encodeURIComponent(draft.body)}`;
              window.open(mailto);
            }}>
              Open in Email
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Parse ACTION blocks from AI response
function parseActionBlocks(content: string, applicants: Applicant[]): { cleanContent: string; actions: ActionCard[] } {
  const actions: ActionCard[] = [];
  let cleanContent = content;

  const moveRegex = /\*?\*?ACTION_MOVE\*?\*?:\s*(.+?)\s*\|\s*(new|reviewing|shortlisted|interview|rejected|hired)\s*\|\s*(.+?)(?:\n|$)/gi;
  let match;
  while ((match = moveRegex.exec(content)) !== null) {
    const name = match[1].trim();
    const targetStatus = match[2].trim() as ApplicantStatus;
    const reason = match[3].trim();
    const candidate = applicants.find(a => a.fullName.toLowerCase() === name.toLowerCase());
    if (candidate) {
      const typeLabel = targetStatus === "rejected" ? "reject" : targetStatus === "hired" ? "hire" : "move";
      actions.push({
        id: `action-${Date.now()}-${actions.length}`,
        type: typeLabel as ActionCard["type"],
        candidateName: candidate.fullName,
        candidateId: candidate.id,
        description: reason,
        targetStatus,
        status: "pending",
      });
    }
    cleanContent = cleanContent.replace(match[0], "");
  }

  const noteRegex = /\*?\*?ACTION_NOTE\*?\*?:\s*(.+?)\s*\|\s*(.+?)(?:\n|$)/gi;
  while ((match = noteRegex.exec(content)) !== null) {
    const name = match[1].trim();
    const noteText = match[2].trim();
    const candidate = applicants.find(a => a.fullName.toLowerCase() === name.toLowerCase());
    if (candidate) {
      actions.push({
        id: `action-${Date.now()}-${actions.length}`,
        type: "note",
        candidateName: candidate.fullName,
        candidateId: candidate.id,
        description: noteText,
        noteText,
        status: "pending",
      });
    }
    cleanContent = cleanContent.replace(match[0], "");
  }

  return { cleanContent: cleanContent.trim(), actions };
}

// ── Typing Indicator ──
function TypingIndicator() {
  return (
    <div className="flex justify-start">
      <div className="bg-secondary/70 rounded-xl px-4 py-3 flex items-center gap-1.5">
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: "0ms" }} />
          <span className="w-2 h-2 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: "150ms" }} />
          <span className="w-2 h-2 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: "300ms" }} />
        </div>
        <span className="text-[10px] text-muted-foreground ml-1.5">Copilot is thinking...</span>
      </div>
    </div>
  );
}

// ── Action Confirmation Card ──
function ActionConfirmCard({ action, onConfirm, onDismiss }: { action: ActionCard; onConfirm: () => void; onDismiss: () => void }) {
  const iconMap = {
    move: <ArrowRight className="w-4 h-4 text-primary" />,
    note: <StickyNote className="w-4 h-4 text-blue-400" />,
    reject: <UserX className="w-4 h-4 text-destructive" />,
    hire: <UserCheck className="w-4 h-4 text-emerald-400" />,
  };
  const bgMap = {
    move: "border-primary/30 bg-primary/5",
    note: "border-blue-400/30 bg-blue-400/5",
    reject: "border-destructive/30 bg-destructive/5",
    hire: "border-emerald-400/30 bg-emerald-400/5",
  };
  const labelMap = {
    move: `Move to ${action.targetStatus}`,
    note: "Add Note",
    reject: "Reject Candidate",
    hire: "Hire Candidate",
  };

  return (
    <div className={`rounded-lg border p-3 my-2 ${bgMap[action.type]}`}>
      <div className="flex items-start gap-2.5">
        <div className="mt-0.5">{iconMap[action.type]}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold">{labelMap[action.type]}</span>
            <Badge variant="secondary" className="text-[9px] px-1.5 py-0 h-4">{action.candidateName}</Badge>
          </div>
          <p className="text-[11px] text-muted-foreground leading-relaxed">{action.description}</p>
          {action.status === "pending" && (
            <div className="flex items-center gap-2 mt-2">
              <Button size="sm" className="h-7 text-xs px-3" onClick={onConfirm}>
                <CheckCircle2 className="w-3 h-3 mr-1" /> Confirm
              </Button>
              <Button size="sm" variant="ghost" className="h-7 text-xs px-3" onClick={onDismiss}>
                <XCircle className="w-3 h-3 mr-1" /> Dismiss
              </Button>
            </div>
          )}
          {action.status === "executing" && (
            <div className="flex items-center gap-1.5 mt-2 text-xs text-muted-foreground">
              <Loader2 className="w-3 h-3 animate-spin" /> Executing...
            </div>
          )}
          {action.status === "done" && (
            <div className="flex items-center gap-1.5 mt-2 text-xs text-emerald-500">
              <CheckCircle2 className="w-3 h-3" /> Done
            </div>
          )}
          {action.status === "failed" && (
            <div className="flex items-center gap-1.5 mt-2 text-xs text-destructive">
              <XCircle className="w-3 h-3" /> Failed
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/copilot-chat`;
const SESSIONS_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/copilot-sessions`;

async function invokeSessionsApi(sessionToken: string, body: any) {
  const resp = await fetch(SESSIONS_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
    },
    body: JSON.stringify({ sessionToken, ...body }),
  });
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    throw new Error(err.error || `Error ${resp.status}`);
  }
  return resp.json();
}

async function streamChat({
  sessionToken, messages, context, onDelta, onDone, onError, signal,
}: {
  sessionToken: string;
  messages: { role: string; content: any }[];
  context: any;
  onDelta: (text: string) => void;
  onDone: () => void;
  onError: (err: string) => void;
  signal?: AbortSignal;
}) {
  const resp = await fetch(CHAT_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
    },
    body: JSON.stringify({ sessionToken, messages, context }),
    signal,
  });

  if (!resp.ok) {
    const body = await resp.json().catch(() => ({}));
    onError(body.error || `Error ${resp.status}`);
    return;
  }
  if (!resp.body) { onError("No response body"); return; }

  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  let done = false;

  while (!done) {
    const { done: rd, value } = await reader.read();
    if (rd) break;
    buf += decoder.decode(value, { stream: true });

    let nl: number;
    while ((nl = buf.indexOf("\n")) !== -1) {
      let line = buf.slice(0, nl);
      buf = buf.slice(nl + 1);
      if (line.endsWith("\r")) line = line.slice(0, -1);
      if (line.startsWith(":") || line.trim() === "") continue;
      if (!line.startsWith("data: ")) continue;
      const json = line.slice(6).trim();
      if (json === "[DONE]") { done = true; break; }
      try {
        const parsed = JSON.parse(json);
        const content = parsed.choices?.[0]?.delta?.content;
        if (content) onDelta(content);
      } catch {
        // Incomplete JSON chunk — only retry if we haven't seen the full line yet
        // Check if more data might complete it (no newline after means it was split mid-chunk)
        if (buf.length === 0) {
          // No more data in buffer; put line back and wait for next read
          buf = line + "\n";
          break;
        }
        // Otherwise skip malformed line to avoid infinite loop
      }
    }
  }

  if (buf.trim()) {
    for (let raw of buf.split("\n")) {
      if (!raw) continue;
      if (raw.endsWith("\r")) raw = raw.slice(0, -1);
      if (!raw.startsWith("data: ")) continue;
      const json = raw.slice(6).trim();
      if (json === "[DONE]") continue;
      try {
        const parsed = JSON.parse(json);
        const c = parsed.choices?.[0]?.delta?.content;
        if (c) onDelta(c);
      } catch {}
    }
  }
  onDone();
}

// ── Rich Inline Cards ──

function CandidateInlineCard({ applicant, job, onClick }: { applicant: Applicant; job?: Job; onClick?: () => void }) {
  const statusInfo = APPLICANT_STATUSES.find(s => s.value === applicant.status);
  const score = applicant.aiAnalysis?.fitScore;
  const scoreColor = score != null ? (score >= 70 ? "text-emerald-400" : score >= 50 ? "text-yellow-400" : "text-red-400") : "text-muted-foreground";

  return (
    <div
      className={`rounded-lg border border-border bg-card/50 p-2.5 my-2 ${onClick ? "cursor-pointer hover:border-primary/30 transition-colors" : ""}`}
      onClick={onClick}
    >
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-full bg-primary/15 text-primary flex items-center justify-center text-xs font-semibold flex-shrink-0">
          {applicant.fullName.charAt(0)}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium truncate">{applicant.fullName}</p>
          <p className="text-[10px] text-muted-foreground truncate">{job?.title || "Unknown Role"} · {applicant.location}</p>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {score != null && (
            <div className={`flex items-center gap-0.5 text-xs font-semibold ${scoreColor}`}>
              <Brain className="w-3 h-3" />
              {score}
            </div>
          )}
          {statusInfo && (
            <Badge variant="secondary" className={`text-[9px] px-1.5 py-0 h-4 border-0 ${statusInfo.color}`}>
              {statusInfo.label}
            </Badge>
          )}
        </div>
      </div>
      {applicant.aiAnalysis && (
        <div className="mt-2 flex gap-1 flex-wrap">
          {applicant.aiAnalysis.recommendation && (
            <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4">
              {applicant.aiAnalysis.recommendation}
            </Badge>
          )}
          {applicant.aiAnalysis.strengths?.slice(0, 2).map((s: string, i: number) => (
            <Badge key={i} variant="secondary" className="text-[9px] px-1.5 py-0 h-4 bg-emerald-500/10 text-emerald-400 border-0">
              {s.length > 30 ? s.slice(0, 30) + "…" : s}
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}

// Detect candidate mentions in content and render inline cards
function RichMessage({
  content, applicants, jobs, onNavigateToCandidate, charts, reports, sessionToken,
}: {
  content: string;
  applicants: Applicant[];
  jobs: Job[];
  onNavigateToCandidate?: (a: Applicant) => void;
  charts?: ChartBlock[];
  reports?: ReportRequest[];
  sessionToken?: string;
}) {
  const mentionedCandidates = useMemo(() => {
    const found: Applicant[] = [];
    for (const a of applicants) {
      if (content.includes(a.fullName) && a.aiAnalysis) {
        if (!found.find(f => f.id === a.id)) found.push(a);
      }
    }
    return found.slice(0, 5);
  }, [content, applicants]);

  return (
    <div>
      <div className="prose prose-sm dark:prose-invert max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0 [&_p]:my-1.5 [&_ul]:my-1.5 [&_ol]:my-1.5 [&_li]:my-0.5 [&_h1]:text-base [&_h2]:text-sm [&_h3]:text-sm [&_h2]:mt-3 [&_h3]:mt-2 [&_table]:text-xs [&_th]:px-2 [&_th]:py-1 [&_td]:px-2 [&_td]:py-1 [&_table]:w-full [&_table]:border-collapse [&_th]:border [&_th]:border-border [&_td]:border [&_td]:border-border [&_th]:bg-secondary/50">
        <ReactMarkdown>{content}</ReactMarkdown>
      </div>

      {charts && charts.length > 0 && (
        <div className="mt-2 space-y-2">
          {charts.map((chart, i) => (
            <InlineChart key={i} chart={chart} />
          ))}
        </div>
      )}

      {reports && reports.length > 0 && sessionToken && (
        <div className="mt-2 space-y-1">
          {reports.map((report, i) => (
            <ReportDownloadCard key={i} report={report} sessionToken={sessionToken} />
          ))}
        </div>
      )}

      {mentionedCandidates.length > 0 && (
        <div className="mt-2 space-y-1">
          {mentionedCandidates.map(a => (
            <CandidateInlineCard
              key={a.id}
              applicant={a}
              job={jobs.find(j => j.id === a.jobId)}
              onClick={onNavigateToCandidate ? () => onNavigateToCandidate(a) : undefined}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function CopilotWidget({
  jobs, applicants, sessionToken, initialContext, onClearContext, embedded, onNavigateToCandidate, crossModuleData,
  onUpdateStatus, onAddNote, onRefreshData,
}: CopilotWidgetProps) {
  const [isOpen, setIsOpen] = useState(embedded ? true : false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const autoPromptFired = useRef<string | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [pendingImage, setPendingImage] = useState<string | null>(null);

  // New UI states
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [voiceMode, setVoiceMode] = useState(false);
  const [copilotLang, setCopilotLang] = useState<string>("en");
  const recognitionRef = useRef<any>(null);
  const sendMessageRef = useRef<(text: string) => void>(() => {});
  const memoryLoadedRef = useRef(false);
  const [greeting, setGreeting] = useState<string>("");

  // Slash command state
  const [showSlashMenu, setShowSlashMenu] = useState(false);
  const [slashFilter, setSlashFilter] = useState("");
  const [slashSelectedIdx, setSlashSelectedIdx] = useState(0);

  // Persistence state
  const [showHistory, setShowHistory] = useState(false);
  const [savedSessions, setSavedSessions] = useState<SavedSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [sessionsLoading, setSessLoading] = useState(false);
  const [savedMsgCount, setSavedMsgCount] = useState(0);

  // Derive context
  const contextCandidate = useMemo(
    () => initialContext?.candidateId ? applicants.find(a => a.id === initialContext.candidateId) : undefined,
    [initialContext?.candidateId, applicants]
  );
  const contextJob = useMemo(
    () => initialContext?.jobId ? jobs.find(j => j.id === initialContext.jobId) : contextCandidate ? jobs.find(j => j.id === contextCandidate.jobId) : undefined,
    [initialContext?.jobId, jobs, contextCandidate]
  );

  // ── Language Config ──
  const LANGUAGES = [
    { code: "en", label: "English", flag: "🇺🇸" },
    { code: "ar", label: "العربية", flag: "🇸🇦" },
    { code: "fr", label: "Français", flag: "🇫🇷" },
    { code: "es", label: "Español", flag: "🇪🇸" },
    { code: "hi", label: "हिन्दी", flag: "🇮🇳" },
    { code: "ur", label: "اردو", flag: "🇵🇰" },
  ];

  // ── Memory: Load preferences & track interactions ──
  useEffect(() => {
    if (memoryLoadedRef.current) return;
    memoryLoadedRef.current = true;

    (async () => {
      try {
        const { data: profile } = await adminQuery(sessionToken, "select", "copilot_memory", { eq: { key: "user_profile" }, maybeSingle: true });
        const { data: stats } = await adminQuery(sessionToken, "select", "copilot_memory", { eq: { key: "interaction_stats" }, maybeSingle: true });

        if (profile?.value) {
          const p = profile.value as any;
          if (p.preferred_language) setCopilotLang(p.preferred_language);
        }

        // Build time-aware greeting
        const hour = new Date().getHours();
        const timeGreeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
        const userName = (profile?.value as any)?.name;
        const totalConvos = (stats?.value as any)?.total_conversations || 0;
        const lastTopics = (stats?.value as any)?.last_topics || [];

        let greetMsg = userName ? `${timeGreeting}, ${userName}!` : `${timeGreeting}!`;
        if (totalConvos > 0) {
          greetMsg += ` You've had ${totalConvos} conversation${totalConvos > 1 ? "s" : ""}.`;
        }
        if (lastTopics.length > 0) {
          greetMsg += ` Last time we discussed: ${lastTopics.slice(0, 2).join(", ")}.`;
        }
        setGreeting(greetMsg);

        // Increment interaction count — use upsert so the row is created if missing
        const newStats = {
          ...(stats?.value as any || {}),
          total_conversations: totalConvos + 1,
          last_active: new Date().toISOString(),
        };
        await adminQuery(sessionToken, "upsert", "copilot_memory", {
          data: { key: "interaction_stats", value: newStats, updated_at: new Date().toISOString() },
          onConflict: "key",
        });
      } catch (e) {
        import.meta.env.DEV && console.error("Memory load error:", e);
      }
    })();
  }, []);

  // ── Save language preference when changed (skip initial load) ──
  const langInitializedRef = useRef(false);
  useEffect(() => {
    if (!langInitializedRef.current) {
      langInitializedRef.current = true;
      return; // Skip the first render (initial value or value loaded from memory)
    }
    // Use upsert so the row is created if it doesn't exist yet
    adminQuery(sessionToken, "select", "copilot_memory", { eq: { key: "user_profile" }, maybeSingle: true }).then(({ data }) => {
      const existingProfile = (data?.value as any) || {};
      adminQuery(sessionToken, "upsert", "copilot_memory", {
        data: { key: "user_profile", value: { ...existingProfile, preferred_language: copilotLang }, updated_at: new Date().toISOString() },
        onConflict: "key",
      });
    });
  }, [copilotLang]);


  const speakText = useCallback((text: string) => {
    if (!voiceMode || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    // Strip markdown formatting for cleaner speech
    const clean = text
      .replace(/```[\s\S]*?```/g, "code block omitted")
      .replace(/\*\*(.*?)\*\*/g, "$1")
      .replace(/\*(.*?)\*/g, "$1")
      .replace(/#{1,6}\s/g, "")
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
      .replace(/[|\-]{3,}/g, "")
      .replace(/\n{2,}/g, ". ");
    const utterance = new SpeechSynthesisUtterance(clean.slice(0, 3000));
    utterance.rate = 1.05;
    utterance.pitch = 1;
    utterance.lang = "en-US";
    window.speechSynthesis.speak(utterance);
  }, [voiceMode]);

  // ── Voice Input via MediaRecorder + Server-side Transcription ──
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const toggleVoiceInput = useCallback(async () => {
    // Stop recording if already listening
    if (isListening) {
      mediaRecorderRef.current?.stop();
      setIsListening(false);
      return;
    }

    try {
      // Request microphone — works in iframes unlike SpeechRecognition
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, sampleRate: 16000 },
      });

      const mimeType = MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "audio/mp4";
      const recorder = new MediaRecorder(stream, { mimeType });
      audioChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        // Stop all tracks to release microphone
        stream.getTracks().forEach((t) => t.stop());

        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        audioChunksRef.current = [];

        if (audioBlob.size < 1000) {
          toast.error("Recording too short. Please try again.");
          return;
        }

        // Show transcribing state
        setInput("🎙️ Transcribing...");

        try {
          const formData = new FormData();
          formData.append("audio", audioBlob, `recording.${mimeType === "audio/webm" ? "webm" : "mp4"}`);

          const res = await fetch(
            `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/transcribe-audio`,
            {
              method: "POST",
              headers: {
                apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
                Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
              },
              body: formData,
            }
          );

          const data = await res.json();
          const transcript = data.transcript?.trim() || "";

          if (!transcript) {
            setInput("");
            toast.error("Couldn't understand the audio. Try again.");
            return;
          }

          setInput(transcript);

          // Auto-send in voice mode
          if (voiceMode) {
            setInput("");
            setTimeout(() => sendMessageRef.current(transcript), 50);
          }
        } catch (err) {
          import.meta.env.DEV && console.error("Transcription failed:", err);
          setInput("");
          toast.error("Transcription failed. Please try again.");
        }
      };

      recorder.onerror = () => {
        setIsListening(false);
        stream.getTracks().forEach((t) => t.stop());
        toast.error("Recording failed. Try again.");
      };

      mediaRecorderRef.current = recorder;
      recorder.start(1000); // collect data every second
      setIsListening(true);
      toast.success("🎙️ Listening... tap again to stop");
    } catch (err: any) {
      if (err?.name === "NotAllowedError") {
        toast.error("Microphone access denied. Check browser permissions.");
      } else {
        toast.error("Microphone not available in this environment.");
        import.meta.env.DEV && console.error("getUserMedia error:", err);
      }
    }
  }, [isListening, voiceMode]);

  // ── Proactive Alerts ──
  const proactiveAlerts = useMemo<ProactiveAlert[]>(() => {
    const alerts: ProactiveAlert[] = [];
    const now = new Date();
    const SLA: Record<string, number> = { new: 3, reviewing: 7, shortlisted: 5, interview: 5 };

    const stalledCandidates: string[] = [];
    for (const a of applicants) {
      const sla = SLA[a.status];
      if (!sla || !a.stageEnteredAt) continue;
      const daysInStage = (now.getTime() - new Date(a.stageEnteredAt).getTime()) / 86400000;
      if (daysInStage > sla) stalledCandidates.push(`${a.fullName} (${a.status}, ${Math.floor(daysInStage)}d)`);
    }
    if (stalledCandidates.length > 0) {
      alerts.push({
        type: "urgent",
        icon: <AlertTriangle className="w-3.5 h-3.5" />,
        message: `${stalledCandidates.length} candidate${stalledCandidates.length > 1 ? "s" : ""} breaching SLA`,
        action: `Show me all candidates breaching SLA deadlines with details.`,
      });
    }

    const atRisk = applicants.filter(a => {
      const score = a.aiAnalysis?.fitScore;
      if (!score || score < 70) return false;
      if (!["new", "reviewing"].includes(a.status)) return false;
      if (!a.stageEnteredAt) return false;
      return (now.getTime() - new Date(a.stageEnteredAt).getTime()) / 86400000 > 3;
    });
    if (atRisk.length > 0) {
      alerts.push({
        type: "warning",
        icon: <Zap className="w-3.5 h-3.5" />,
        message: `${atRisk.length} top candidate${atRisk.length > 1 ? "s" : ""} may lose interest`,
        action: `Which top-rated candidates are at risk of losing interest? They have high scores but are stuck in early stages.`,
      });
    }

    const emptyJobs = jobs.filter(j => j.status === "open" && !applicants.some(a => a.jobId === j.id));
    if (emptyJobs.length > 0) {
      alerts.push({
        type: "info",
        icon: <Search className="w-3.5 h-3.5" />,
        message: `${emptyJobs.length} open job${emptyJobs.length > 1 ? "s" : ""} with no applicants`,
        action: `Which open jobs have zero applicants? What can we do to attract more candidates?`,
      });
    }

    return alerts;
  }, [applicants, jobs]);

  // Filter slash commands
  const filteredSlashCommands = useMemo(() => {
    if (!slashFilter) return SLASH_COMMANDS;
    return SLASH_COMMANDS.filter(c => c.command.includes(slashFilter) || c.label.toLowerCase().includes(slashFilter.toLowerCase()));
  }, [slashFilter]);

  const handleInputChange = (val: string) => {
    setInput(val);
    if (val.startsWith("/")) {
      const filter = val.slice(1).split(" ")[0];
      if (!val.includes(" ") || val === "/" + filter) {
        setShowSlashMenu(true);
        setSlashFilter(filter);
        setSlashSelectedIdx(0);
        return;
      }
    }
    setShowSlashMenu(false);
  };

  const executeSlashCommand = (cmd: SlashCommand) => {
    const prompt = cmd.buildPrompt({ candidate: contextCandidate, job: contextJob, jobs, applicants });
    setInput("");
    setShowSlashMenu(false);
    sendMessage(prompt);
  };

  const buildContext = useCallback(() => {
    const ctx: any = {};
    if (initialContext?.candidateData) {
      ctx.candidate = initialContext.candidateData;
    } else if (contextCandidate) {
      const screeningQuestions: Record<string, string> = {};
      const job = jobs.find(j => j.id === contextCandidate.jobId);
      if (job) job.screeningQuestions.forEach(q => { screeningQuestions[q.id] = q.question; });
      ctx.candidate = {
        fullName: contextCandidate.fullName, email: contextCandidate.email,
        location: contextCandidate.location, nationality: contextCandidate.nationality,
        status: contextCandidate.status, cvFileName: contextCandidate.cvFileName,
        appliedDate: contextCandidate.appliedDate, screeningAnswers: contextCandidate.screeningAnswers,
        aiAnalysis: contextCandidate.aiAnalysis,
      };
      ctx.screeningQuestions = screeningQuestions;
    }
    if (contextJob) {
      ctx.job = {
        title: contextJob.title, department: contextJob.department, location: contextJob.location,
        type: contextJob.type, status: contextJob.status, summary: contextJob.summary,
        description: contextJob.description, responsibilities: contextJob.responsibilities,
        requirements: contextJob.requirements, salaryRange: contextJob.salaryRange,
        salaryCurrency: contextJob.salaryCurrency,
      };
    }
    ctx.allJobs = jobs.map(j => ({
      title: j.title, department: j.department, location: j.location, status: j.status,
      applicantCount: applicants.filter(a => a.jobId === j.id).length,
    }));
    ctx.allApplicants = applicants.map(a => {
      const daysInStage = a.stageEnteredAt ? Math.floor((Date.now() - new Date(a.stageEnteredAt).getTime()) / 86400000) : null;
      return {
        fullName: a.fullName, jobTitle: jobs.find(j => j.id === a.jobId)?.title || "Unknown",
        jobId: a.jobId, status: a.status, aiScore: a.aiAnalysis?.fitScore ?? null,
        recommendation: a.aiAnalysis?.recommendation ?? null,
        strengths: a.aiAnalysis?.strengths?.slice(0, 3) ?? [],
        gaps: a.aiAnalysis?.gaps?.slice(0, 3) ?? [],
        riskIndicators: a.aiAnalysis?.riskIndicators?.slice(0, 2) ?? [],
        skillsCoverage: a.aiAnalysis?.skillsCoveragePercent ?? null,
        daysInStage,
        stageEnteredAt: a.stageEnteredAt,
      };
    });

    if (crossModuleData?.surveys) ctx.surveys = crossModuleData.surveys;
    if (crossModuleData?.turnover) ctx.turnover = crossModuleData.turnover;
    if (crossModuleData?.performance) ctx.performance = crossModuleData.performance;
    if (crossModuleData?.cvLibrary) ctx.cvLibrary = crossModuleData.cvLibrary;

    // Pass language preference
    ctx.language = copilotLang;

    return ctx;
  }, [contextCandidate, contextJob, jobs, applicants, initialContext?.candidateData, crossModuleData, copilotLang]);

  // Load sessions
  const loadSessions = useCallback(async () => {
    setSessLoading(true);
    try {
      const data = await invokeSessionsApi(sessionToken, { action: "list" });
      setSavedSessions(data.sessions || []);
    } catch { /* silent */ }
    finally { setSessLoading(false); }
  }, [sessionToken]);

  const loadSession = useCallback(async (sessId: string) => {
    try {
      const data = await invokeSessionsApi(sessionToken, { action: "get", sessionId: sessId });
      const msgs: Msg[] = (data.messages || []).map((m: any) => ({ role: m.role, content: m.content }));
      setMessages(msgs);
      setActiveSessionId(sessId);
      setSavedMsgCount(msgs.length);
      setShowHistory(false);
      setError(null);
    } catch { setError("Failed to load conversation"); }
  }, [sessionToken]);

  const persistMessages = useCallback(async (allMsgs: Msg[], sessId: string | null) => {
    const newMsgs = allMsgs.slice(savedMsgCount);
    if (newMsgs.length === 0) return sessId;

    let sid = sessId;
    if (!sid) {
      const title = getMsgText(allMsgs[0]?.content || "").substring(0, 60) || "New conversation";
      const res = await invokeSessionsApi(sessionToken, {
        action: "create", title,
        candidateId: initialContext?.candidateId || null,
        jobId: initialContext?.jobId || null,
      });
      sid = res.session.id;
      setActiveSessionId(sid);
    }

    // Serialize messages for persistence - strip image data to avoid huge payloads
    const serializableMsgs = newMsgs.map(m => ({
      role: m.role,
      content: getMsgText(m.content),
    }));

    await invokeSessionsApi(sessionToken, {
      action: "saveMessages", sessionId: sid, messages: serializableMsgs,
    });
    setSavedMsgCount(allMsgs.length);

    if (!sessId && allMsgs.length > 0) {
      const firstUser = allMsgs.find(m => m.role === "user");
      if (firstUser) {
        const txt = getMsgText(firstUser.content);
        const title = txt.substring(0, 60) + (txt.length > 60 ? "..." : "");
        await invokeSessionsApi(sessionToken, { action: "updateTitle", sessionId: sid, title }).catch(() => {});
      }
    }

    return sid;
  }, [sessionToken, savedMsgCount, initialContext]);

  const deleteSession = useCallback(async (sessId: string) => {
    try {
      await invokeSessionsApi(sessionToken, { action: "delete", sessionId: sessId });
      setSavedSessions(prev => prev.filter(s => s.id !== sessId));
      if (activeSessionId === sessId) {
        setMessages([]); setActiveSessionId(null); setSavedMsgCount(0);
      }
    } catch { /* silent */ }
  }, [sessionToken, activeSessionId]);

  const pinInsight = useCallback(async (msgContent: string, msgIdx: number) => {
    const candidateId = initialContext?.candidateId || contextCandidate?.id;
    if (!candidateId) {
      toast.error("No candidate selected to pin this insight to.");
      return;
    }
    const candidate = applicants.find(a => a.id === candidateId);
    if (!candidate) return;

    const pinNote = `📌 Copilot Insight (${new Date().toLocaleDateString()}):\n${msgContent.substring(0, 500)}${msgContent.length > 500 ? "..." : ""}`;

    try {
      const updatedNotes = [...(candidate.notes || []), pinNote];
      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/update-applicant`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          sessionToken,
          applicantId: candidateId,
          updates: { notes: updatedNotes },
        }),
      });
      if (!resp.ok) throw new Error("Failed to pin");
      setMessages(prev => prev.map((m, i) => i === msgIdx ? { ...m, pinned: true } : m));
      toast.success("Insight pinned to candidate profile!");
    } catch {
      toast.error("Failed to pin insight.");
    }
  }, [initialContext?.candidateId, contextCandidate?.id, applicants, sessionToken]);

  // Message reactions
  const setReaction = useCallback((msgIdx: number, reaction: "up" | "down") => {
    setMessages(prev => prev.map((m, i) => i === msgIdx ? { ...m, reaction: m.reaction === reaction ? undefined : reaction } : m));
  }, []);

  const executeAction = useCallback(async (actionId: string, msgIdx: number) => {
    setMessages(prev => prev.map((m, i) => i === msgIdx ? {
      ...m, actions: m.actions?.map(a => a.id === actionId ? { ...a, status: "executing" as const } : a),
    } : m));

    const msg = messages[msgIdx];
    const action = msg?.actions?.find(a => a.id === actionId);
    if (!action) return;

    try {
      if ((action.type === "move" || action.type === "reject" || action.type === "hire") && action.targetStatus && onUpdateStatus) {
        await onUpdateStatus(action.candidateId, action.targetStatus);
        if (onAddNote) {
          await onAddNote(action.candidateId, `🤖 Copilot Action: Moved to ${action.targetStatus} — ${action.description}`);
        }
      } else if (action.type === "note" && action.noteText && onAddNote) {
        await onAddNote(action.candidateId, `🤖 Copilot Note: ${action.noteText}`);
      }

      setMessages(prev => prev.map((m, i) => i === msgIdx ? {
        ...m, actions: m.actions?.map(a => a.id === actionId ? { ...a, status: "done" as const } : a),
      } : m));
      toast.success(`Action completed: ${action.type} for ${action.candidateName}`);
      onRefreshData?.();
    } catch (e: any) {
      setMessages(prev => prev.map((m, i) => i === msgIdx ? {
        ...m, actions: m.actions?.map(a => a.id === actionId ? { ...a, status: "failed" as const } : a),
      } : m));
      toast.error(`Action failed: ${e.message || "Unknown error"}`);
    }
  }, [messages, onUpdateStatus, onAddNote, onRefreshData]);

  const dismissAction = useCallback((actionId: string, msgIdx: number) => {
    setMessages(prev => prev.map((m, i) => i === msgIdx ? {
      ...m, actions: m.actions?.filter(a => a.id !== actionId),
    } : m));
  }, []);

  useEffect(() => {
    if (initialContext && initialContext.autoPrompt && autoPromptFired.current !== initialContext.autoPrompt) {
      setIsOpen(true);
      setMessages([]); setActiveSessionId(null); setSavedMsgCount(0); setError(null); setShowHistory(false);
      autoPromptFired.current = initialContext.autoPrompt;
      setTimeout(() => sendMessage(initialContext.autoPrompt!), 100);
    } else if (initialContext && !initialContext.autoPrompt) {
      setIsOpen(true);
    }
  }, [initialContext]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, isStreaming]);

  const parseFollowUps = (content: string): { cleanContent: string; followUps: string[] } => {
    const marker = "**SUGGESTED_FOLLOWUPS**";
    const idx = content.indexOf(marker);
    if (idx === -1) return { cleanContent: content, followUps: [] };
    const cleanContent = content.substring(0, content.lastIndexOf("---", idx) !== -1 ? content.lastIndexOf("---", idx) : idx).trim();
    const followUpBlock = content.substring(idx + marker.length).trim();
    const followUps = followUpBlock
      .split("\n")
      .map(l => l.replace(/^[-•*]\s*/, "").replace(/^\[/, "").replace(/\]$/, "").trim())
      .filter(l => l.length > 5 && l.length < 100);
    return { cleanContent, followUps: followUps.slice(0, 3) };
  };

  // Handle image upload
  const handleImageUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { toast.error("Please upload an image file."); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error("Image must be under 5MB."); return; }
    const reader = new FileReader();
    reader.onload = () => {
      setPendingImage(reader.result as string);
      toast.success("Image attached! Type your question about it.");
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  }, []);

  const sendMessage = async (text: string) => {
    if ((!text.trim() && !pendingImage) || isStreaming) return;
    
    // Build user message content - with or without image
    let userContent: string | MessageContent[];
    if (pendingImage) {
      userContent = [
        ...(text.trim() ? [{ type: "text" as const, text: text.trim() }] : [{ type: "text" as const, text: "Analyze this image and provide HR-relevant insights." }]),
        { type: "image_url" as const, image_url: { url: pendingImage } },
      ];
    } else {
      userContent = text.trim();
    }
    
    const userMsg: Msg = { role: "user", content: userContent, imageUrl: pendingImage || undefined };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setPendingImage(null);
    setShowSlashMenu(false);
    setIsStreaming(true);
    setError(null);

    let assistantSoFar = "";
    const upsert = (chunk: string) => {
      assistantSoFar += chunk;
      setMessages(prev => {
        const last = prev[prev.length - 1];
        if (last?.role === "assistant") {
          return prev.map((m, i) => i === prev.length - 1 ? { ...m, content: assistantSoFar } : m);
        }
        return [...prev, { role: "assistant", content: assistantSoFar }];
      });
    };

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      await streamChat({
        sessionToken,
        messages: newMessages.map(m => ({ role: m.role, content: m.content as any })),
        context: buildContext(),
        onDelta: upsert,
        onDone: () => {
          setIsStreaming(false);
          const { cleanContent: afterFollowUps, followUps } = parseFollowUps(assistantSoFar);
          const { cleanContent: afterActions, actions } = parseActionBlocks(afterFollowUps, applicants);
          const { cleanContent: afterCharts, charts } = parseChartBlocks(afterActions);
          const { cleanContent: afterReports, reports } = parseReportRequests(afterCharts);
          const { cleanContent: afterInsights, insights } = parseSmartInsights(afterReports);
          const { cleanContent, emailDrafts } = parseEmailDrafts(afterInsights);
          const finalMsg: Msg = {
            role: "assistant", content: cleanContent, followUps,
            actions: actions.length > 0 ? actions : undefined,
            charts: charts.length > 0 ? charts : undefined,
            reports: reports.length > 0 ? reports : undefined,
            insights: insights.length > 0 ? insights : undefined,
            emailDrafts: emailDrafts.length > 0 ? emailDrafts : undefined,
          };
          const finalMsgs = [...newMessages, finalMsg];
          setMessages(finalMsgs);
          persistMessages(finalMsgs, activeSessionId).catch(() => {});
          // Speak the response if voice mode is active
          speakText(cleanContent);
          // Save last topic to memory
          const topic = text.trim().slice(0, 80);
          adminQuery(sessionToken, "select", "copilot_memory", { eq: { key: "interaction_stats" }, maybeSingle: true }).then(({ data }) => {
            const stats = (data?.value as any) || {};
            const lastTopics = [topic, ...(stats.last_topics || [])].slice(0, 5);
            adminQuery(sessionToken, "upsert", "copilot_memory", {
              data: { key: "interaction_stats", value: { ...stats, last_topics: lastTopics, last_active: new Date().toISOString() }, updated_at: new Date().toISOString() },
              onConflict: "key",
            });
          });
        },
        onError: (err) => { setError(err); setIsStreaming(false); },
        signal: controller.signal,
      });
    } catch (e: any) {
      if (e.name !== "AbortError") setError(e.message || "Failed to connect");
      setIsStreaming(false);
    }
  };
  sendMessageRef.current = sendMessage;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (showSlashMenu && filteredSlashCommands.length > 0) {
      executeSlashCommand(filteredSlashCommands[slashSelectedIdx]);
      return;
    }
    sendMessage(input);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (showSlashMenu) {
      if (e.key === "ArrowDown") { e.preventDefault(); setSlashSelectedIdx(i => Math.min(i + 1, filteredSlashCommands.length - 1)); return; }
      if (e.key === "ArrowUp") { e.preventDefault(); setSlashSelectedIdx(i => Math.max(i - 1, 0)); return; }
      if (e.key === "Tab" || (e.key === "Enter" && !e.shiftKey)) {
        e.preventDefault();
        if (filteredSlashCommands.length > 0) executeSlashCommand(filteredSlashCommands[slashSelectedIdx]);
        return;
      }
      if (e.key === "Escape") { setShowSlashMenu(false); return; }
    }
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSubmit(e); }
  };

  const startNewConversation = () => {
    setMessages([]); setActiveSessionId(null); setSavedMsgCount(0); setError(null); setShowHistory(false);
    onClearContext?.(); autoPromptFired.current = null;
  };

  const quickActions = useMemo(() => {
    const actions: string[] = [];
    if (contextCandidate && contextCandidate.aiAnalysis) {
      actions.push(`Explain why ${contextCandidate.fullName} is rated ${contextCandidate.aiAnalysis.fitScore}/100.`);
      actions.push(`Generate interview questions for ${contextCandidate.fullName}.`);
      actions.push(`Summarize all feedback for ${contextCandidate.fullName} into a hiring recommendation.`);
    }
    if (contextCandidate) {
      actions.push(`Summarize ${contextCandidate.fullName}'s profile and fit.`);
      actions.push("What risks should I consider for this candidate?");
    }
    if (contextJob) {
      actions.push(`Compare top candidates for ${contextJob.title}.`);
      actions.push(`Draft a job description for ${contextJob.title}.`);
      actions.push(`Generate screening questions for ${contextJob.title}.`);
    }
    if (!contextCandidate && !contextJob) {
      actions.push("Give me an executive HR overview with charts.");
      actions.push("Show turnover analysis with department breakdown.");
      actions.push("Analyze the recruitment pipeline health.");
      actions.push("What skills are in our CV library?");
      actions.push("Generate an HR intelligence report as PDF.");
      actions.push("Compare top candidates across all roles.");
      actions.push("Which candidates are overdue in the pipeline?");
    }
    return actions;
  }, [contextCandidate, contextJob]);

  const statusInfo = contextCandidate ? APPLICANT_STATUSES.find(s => s.value === contextCandidate.status) : null;

  const formatTime = (d: string) => {
    const date = new Date(d);
    const now = new Date();
    const diffH = (now.getTime() - date.getTime()) / 3600000;
    if (diffH < 1) return "Just now";
    if (diffH < 24) return `${Math.floor(diffH)}h ago`;
    if (diffH < 48) return "Yesterday";
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const canPin = !!initialContext?.candidateId || !!contextCandidate?.id;

  const renderHeader = () => (
    <div className="px-4 py-3 border-b border-border bg-card flex items-center justify-between flex-shrink-0">
      <div className="flex items-center gap-2">
        {showHistory && (
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setShowHistory(false)}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
        )}
        <img src={lumofyLogo} alt="" className="w-7 h-7 rounded-full object-contain bg-white/90 p-0.5" />
        <div>
          <h3 className="text-sm font-semibold flex items-center gap-1.5">
            {showHistory ? "Chat History" : "Lumofy Copilot"}
            <Badge variant="secondary" className="text-[8px] px-1.5 py-0 h-3.5 bg-primary/15 text-primary border-0 font-bold">
              PRO
            </Badge>
          </h3>
          <p className="text-[10px] text-muted-foreground">
            {showHistory ? "Your saved conversations" : "GPT-5.2 · Type / for commands"}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-1">
        {!showHistory && (
          <>
            {/* Language selector */}
            <select
              value={copilotLang}
              onChange={(e) => setCopilotLang(e.target.value)}
              className="h-7 text-[10px] bg-transparent border border-border rounded-md px-1 text-foreground cursor-pointer focus:outline-none focus:ring-1 focus:ring-ring"
              title="Copilot language"
            >
              {LANGUAGES.map(l => (
                <option key={l.code} value={l.code}>{l.flag} {l.label}</option>
              ))}
            </select>
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => { setShowHistory(true); loadSessions(); }} title="Chat history">
              <History className="w-3.5 h-3.5" />
            </Button>
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={startNewConversation} title="New conversation">
              <Plus className="w-3.5 h-3.5" />
            </Button>
            {!embedded && (
              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setIsFullscreen(!isFullscreen)} title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}>
                {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
              </Button>
            )}
          </>
        )}
        {!embedded && (
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => { setIsOpen(false); setShowHistory(false); setIsFullscreen(false); }}>
            <ChevronDown className="w-4 h-4" />
          </Button>
        )}
      </div>
    </div>
  );

  const renderBody = () => (
    <>
      {showHistory ? (
        <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
          {sessionsLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-5 h-5 animate-spin text-primary" />
            </div>
          ) : savedSessions.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <History className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No saved conversations yet.</p>
              <p className="text-xs mt-1">Start chatting and your conversations will be saved automatically.</p>
            </div>
          ) : (
            savedSessions.map((sess) => {
              const candidate = sess.candidate_id ? applicants.find(a => a.id === sess.candidate_id) : null;
              const job = sess.job_id ? jobs.find(j => j.id === sess.job_id) : null;
              return (
                <div
                  key={sess.id}
                  className={`rounded-lg border p-3 cursor-pointer transition-colors group ${
                    activeSessionId === sess.id ? "border-primary/40 bg-primary/5" : "border-border hover:border-primary/20 hover:bg-secondary/30"
                  }`}
                  onClick={() => loadSession(sess.id)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">{sess.title}</p>
                      <div className="flex items-center gap-2 mt-1 text-[10px] text-muted-foreground">
                        {candidate && <span>{candidate.fullName}</span>}
                        {job && <span>· {job.title}</span>}
                        <span className="ml-auto">{formatTime(sess.updated_at)}</span>
                      </div>
                    </div>
                    <button
                      className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive p-1"
                      onClick={(e) => { e.stopPropagation(); deleteSession(sess.id); }}
                      title="Delete conversation"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      ) : (
        <>
          {contextCandidate && (
            <div className="px-4 py-2 border-b border-border bg-secondary/30 flex-shrink-0">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-7 h-7 rounded-full bg-primary/15 text-primary flex items-center justify-center text-[10px] font-semibold flex-shrink-0">
                    {contextCandidate.fullName.charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-medium truncate">{contextCandidate.fullName}</p>
                    <p className="text-[10px] text-muted-foreground truncate">{contextJob?.title || "Unknown Job"}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  {statusInfo && (
                    <Badge variant="secondary" className={`text-[10px] px-1.5 py-0 h-5 border-0 ${statusInfo.color}`}>
                      {statusInfo.label}
                    </Badge>
                  )}
                  {contextCandidate.aiAnalysis && (
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-5 bg-primary/15 text-primary border-0">
                      <Brain className="w-3 h-3 mr-0.5" />
                      {contextCandidate.aiAnalysis.fitScore}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          )}

          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* Proactive Alerts Banner */}
            {messages.length === 0 && !isStreaming && proactiveAlerts.length > 0 && (
              <div className="space-y-1.5 mb-2">
                {proactiveAlerts.map((alert, i) => (
                  <button
                    key={i}
                    onClick={() => alert.action && sendMessage(alert.action)}
                    className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left text-[11px] transition-colors border ${
                      alert.type === "urgent"
                        ? "bg-destructive/10 border-destructive/20 text-destructive hover:bg-destructive/15"
                        : alert.type === "warning"
                        ? "bg-yellow-500/10 border-yellow-500/20 text-yellow-600 dark:text-yellow-400 hover:bg-yellow-500/15"
                        : "bg-primary/5 border-primary/10 text-muted-foreground hover:bg-primary/10"
                    }`}
                  >
                    {alert.icon}
                    <span className="flex-1">{alert.message}</span>
                    <span className="text-[9px] opacity-60">Click to investigate</span>
                  </button>
                ))}
              </div>
            )}

            {messages.length === 0 && !isStreaming && (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center mb-3 shadow-lg shadow-primary/10">
                  <Sparkles className="w-7 h-7 text-primary" />
                </div>
                <p className="text-sm font-semibold mb-1">
                  {greeting || "How can I help?"}
                </p>
                <p className="text-xs text-muted-foreground mb-4">
                  {copilotLang !== "en" 
                    ? `AI-powered HR intelligence · ${LANGUAGES.find(l => l.code === copilotLang)?.flag} ${LANGUAGES.find(l => l.code === copilotLang)?.label}`
                    : "AI-powered HR intelligence across all modules"
                  }
                </p>

                {/* Slash command grid */}
                <div className="grid grid-cols-2 gap-1.5 w-full max-w-sm mb-3">
                  {SLASH_COMMANDS.slice(0, 6).map(cmd => (
                    <button
                      key={cmd.command}
                      onClick={() => executeSlashCommand(cmd)}
                      className="text-[10px] px-2.5 py-2 rounded-lg bg-secondary/50 hover:bg-secondary text-foreground border border-border/50 hover:border-primary/20 transition-all flex items-center gap-1.5 text-left"
                    >
                      <div className="w-5 h-5 rounded-md bg-primary/10 flex items-center justify-center flex-shrink-0">
                        {cmd.icon}
                      </div>
                      <div className="min-w-0">
                        <span className="font-medium block truncate">{cmd.label}</span>
                      </div>
                    </button>
                  ))}
                </div>

                <div className="flex flex-wrap gap-1.5 justify-center max-w-sm">
                  {quickActions.slice(0, 5).map((action, i) => (
                    <button
                      key={i}
                      onClick={() => sendMessage(action)}
                      className="text-[11px] px-2.5 py-1.5 rounded-full bg-secondary hover:bg-secondary/80 text-foreground transition-colors text-left"
                    >
                      {action}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg, i) => (
              <div key={i} className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start"} group/msg`}>
                <div
                  className={`max-w-[88%] rounded-2xl px-4 py-3 text-sm ${
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary/60 border border-border/50"
                  }`}
                >
                  {msg.role === "assistant" ? (
                    <>
                      <RichMessage
                        content={getMsgText(msg.content)}
                        applicants={applicants}
                        jobs={jobs}
                        onNavigateToCandidate={onNavigateToCandidate}
                        charts={msg.charts}
                        reports={msg.reports}
                        sessionToken={sessionToken}
                      />
                      {msg.insights && msg.insights.length > 0 && (
                        <div className="mt-2">{msg.insights.map((ins, ii) => <SmartInsightCard key={ii} insight={ins} />)}</div>
                      )}
                      {msg.emailDrafts && msg.emailDrafts.length > 0 && (
                        <div className="mt-2">{msg.emailDrafts.map((ed, ei) => <EmailDraftCard key={ei} draft={ed} />)}</div>
                      )}
                    </>
                  ) : (
                    <div>
                      {getMsgImage(msg.content) && (
                        <div className="mb-2 relative">
                          <img src={getMsgImage(msg.content)} alt="Uploaded" className="max-w-[200px] max-h-[150px] rounded-lg object-cover" />
                          <Badge variant="secondary" className="absolute top-1 right-1 text-[8px] px-1 py-0 h-4">
                            <Eye className="w-2.5 h-2.5 mr-0.5" /> Vision
                          </Badge>
                        </div>
                      )}
                      <p className="whitespace-pre-wrap">{getMsgText(msg.content)}</p>
                    </div>
                  )}
                </div>

                {/* Action bar for assistant messages */}
                {msg.role === "assistant" && !isStreaming && (
                  <div className="flex items-center gap-0.5 mt-1 opacity-0 group-hover/msg:opacity-100 transition-opacity">
                    {/* Reactions */}
                    <button
                      onClick={() => setReaction(i, "up")}
                      className={`p-1 rounded transition-colors ${msg.reaction === "up" ? "text-emerald-500 bg-emerald-500/10" : "text-muted-foreground hover:text-emerald-500"}`}
                      title="Helpful"
                    >
                      <ThumbsUp className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => setReaction(i, "down")}
                      className={`p-1 rounded transition-colors ${msg.reaction === "down" ? "text-destructive bg-destructive/10" : "text-muted-foreground hover:text-destructive"}`}
                      title="Not helpful"
                    >
                      <ThumbsDown className="w-3 h-3" />
                    </button>
                    <div className="w-px h-3 bg-border mx-0.5" />
                    {canPin && (
                      <button
                        onClick={() => pinInsight(getMsgText(msg.content), i)}
                        className={`p-1 rounded transition-colors ${msg.pinned ? "text-primary" : "text-muted-foreground hover:text-primary"}`}
                        title={msg.pinned ? "Pinned to candidate" : "Pin to candidate profile"}
                      >
                        {msg.pinned ? <PinOff className="w-3 h-3" /> : <Pin className="w-3 h-3" />}
                      </button>
                    )}
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(getMsgText(msg.content));
                        toast.success("Copied to clipboard");
                      }}
                      className="p-1 rounded text-muted-foreground hover:text-foreground transition-colors"
                      title="Copy"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                      </svg>
                    </button>
                  </div>
                )}

                {/* Action cards */}
                {msg.role === "assistant" && msg.actions && msg.actions.length > 0 && !isStreaming && (
                  <div className="max-w-[88%] mt-1">
                    {msg.actions.map(action => (
                      <ActionConfirmCard
                        key={action.id}
                        action={action}
                        onConfirm={() => executeAction(action.id, i)}
                        onDismiss={() => dismissAction(action.id, i)}
                      />
                    ))}
                  </div>
                )}

                {/* Follow-up chips */}
                {msg.role === "assistant" && msg.followUps && msg.followUps.length > 0 && i === messages.length - 1 && !isStreaming && (
                  <div className="flex flex-wrap gap-1.5 mt-2 max-w-[88%]">
                    {msg.followUps.map((fu, fi) => (
                      <button
                        key={fi}
                        onClick={() => sendMessage(fu)}
                        className="text-[11px] px-2.5 py-1.5 rounded-full bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 transition-colors text-left"
                      >
                        {fu}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {isStreaming && messages[messages.length - 1]?.role !== "assistant" && (
              <TypingIndicator />
            )}

            {error && (
              <div className="text-xs text-destructive bg-destructive/10 rounded-lg p-2.5 text-center">
                {error}
              </div>
            )}
          </div>

          <form onSubmit={handleSubmit} className="p-3 border-t border-border flex-shrink-0 relative">
            {/* Slash command menu */}
            {showSlashMenu && filteredSlashCommands.length > 0 && (
              <div className="absolute bottom-full left-3 right-3 mb-1 bg-popover border border-border rounded-lg shadow-xl overflow-hidden z-10">
                <div className="p-1.5 border-b border-border">
                  <p className="text-[10px] text-muted-foreground font-medium px-2">Commands ({filteredSlashCommands.length})</p>
                </div>
                <div className="py-1 max-h-56 overflow-y-auto">
                  {filteredSlashCommands.map((cmd, idx) => (
                    <button
                      key={cmd.command}
                      type="button"
                      className={`w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors ${
                        idx === slashSelectedIdx ? "bg-primary/10 text-primary" : "hover:bg-secondary/50"
                      }`}
                      onClick={() => executeSlashCommand(cmd)}
                      onMouseEnter={() => setSlashSelectedIdx(idx)}
                    >
                      <div className={`w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0 ${
                        idx === slashSelectedIdx ? "bg-primary/20" : "bg-secondary"
                      }`}>
                        {cmd.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono font-medium">{cmd.command}</span>
                          <span className="text-[11px] font-medium">{cmd.label}</span>
                        </div>
                        <p className="text-[10px] text-muted-foreground truncate">{cmd.description}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Pending image preview */}
            {pendingImage && (
              <div className="mb-2 flex items-center gap-2 bg-secondary/50 rounded-lg p-2">
                <img src={pendingImage} alt="Attached" className="w-12 h-12 rounded object-cover" />
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-medium flex items-center gap-1"><Eye className="w-3 h-3 text-primary" /> Image attached (Vision mode)</p>
                  <p className="text-[10px] text-muted-foreground">Ask a question about this image</p>
                </div>
                <button type="button" onClick={() => setPendingImage(null)} className="text-muted-foreground hover:text-destructive p-1">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            <div className="flex gap-2 items-end">
              {/* Image upload button */}
              <button
                type="button"
                onClick={() => imageInputRef.current?.click()}
                className="h-10 w-10 flex-shrink-0 rounded-xl flex items-center justify-center transition-colors border bg-background text-muted-foreground border-input hover:text-primary hover:border-primary"
                title="Upload image for AI vision analysis"
              >
                <Image className="w-4 h-4" />
              </button>
              <input
                ref={imageInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImageUpload}
              />
              <div className="flex-1 relative">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => handleInputChange(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={pendingImage ? "What would you like to know about this image?" : "Type / for commands or ask a question..."}
                  rows={1}
                  className="w-full resize-none rounded-xl border border-input bg-background px-3 py-2.5 pr-10 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50"
                  disabled={isStreaming}
                />
                {/* Voice input button inside textarea */}
                <button
                  type="button"
                  onClick={toggleVoiceInput}
                  className={`absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg transition-colors ${
                    isListening 
                      ? "text-destructive bg-destructive/10 animate-pulse" 
                      : "text-muted-foreground hover:text-primary hover:bg-primary/10"
                  }`}
                  title={isListening ? "Stop listening" : "Voice input"}
                >
                  {isListening ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
                </button>
              </div>
              {/* Voice mode toggle */}
              <button
                type="button"
                onClick={() => {
                  setVoiceMode(v => !v);
                  if (voiceMode) window.speechSynthesis.cancel();
                  toast.success(voiceMode ? "Voice mode off" : "Voice mode on — speak and AI will respond aloud");
                }}
                className={`h-10 w-10 flex-shrink-0 rounded-xl flex items-center justify-center transition-colors border ${
                  voiceMode
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background text-muted-foreground border-input hover:text-primary hover:border-primary"
                }`}
                title={voiceMode ? "Voice mode ON" : "Voice mode OFF"}
              >
                <Volume2 className="w-4 h-4" />
              </button>
              <Button type="submit" size="icon" disabled={isStreaming || (!input.trim() && !pendingImage)} className="h-10 w-10 flex-shrink-0 rounded-xl">
                {isStreaming ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </Button>
            </div>
            <p className="text-[9px] text-muted-foreground text-center mt-1.5 opacity-60">Powered by GPT-5.2 · Vision · Smart Actions · Evidence-based</p>
          </form>
        </>
      )}
    </>
  );

  if (embedded) {
    return (
      <div className="flex flex-col h-[calc(100vh-8rem)] bg-card border border-border rounded-2xl overflow-hidden">
        {renderHeader()}
        {renderBody()}
      </div>
    );
  }

  // Fullscreen or normal floating mode
  const widgetClasses = isFullscreen
    ? "fixed inset-4 z-50 bg-card border border-border rounded-2xl shadow-2xl flex flex-col overflow-hidden"
    : "fixed bottom-6 right-6 z-50 w-[440px] max-w-[calc(100vw-48px)] h-[600px] max-h-[calc(100vh-48px)] bg-card border border-border rounded-2xl shadow-2xl flex flex-col overflow-hidden";

  return (
    <>
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-full bg-primary text-primary-foreground shadow-lg hover:shadow-xl transition-all hover:scale-105 group"
        >
          <img src={lumofyLogo} alt="" className="w-6 h-6 rounded-full object-contain bg-white/90 p-0.5" />
          <span className="text-sm font-medium">Lumofy Copilot</span>
          <Sparkles className="w-4 h-4 opacity-70 group-hover:opacity-100 transition-opacity" />
        </button>
      )}
      {isOpen && (
        <div className={widgetClasses}>
          {renderHeader()}
          {renderBody()}
        </div>
      )}
    </>
  );
}
