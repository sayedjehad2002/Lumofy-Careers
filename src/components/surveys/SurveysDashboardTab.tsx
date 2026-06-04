import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Sparkles, Search, FileText, BarChart3, Clock, Users, Trash2, Copy, ExternalLink, Eye, Pencil, Library, Send, TrendingUp, Activity, Building2, FileDown, QrCode, LayoutGrid, List, MoreHorizontal, Star, Share2, Brain } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import type { Survey, SurveyQuestion, SurveyTemplate } from "@/types/surveys";
import { SURVEY_STATUSES, SURVEY_CATEGORIES } from "@/types/surveys";
import FormsStyleBuilder from "./FormsStyleBuilder";
import AISurveyImportModal from "./AISurveyImportModal";
import SurveyResponsesView from "./SurveyResponsesView";
import SurveyAnalyticsView from "./SurveyAnalyticsView";
import QuestionBank from "./QuestionBank";
import QRCodeGenerator from "./QRCodeGenerator";
import EmailCampaign from "./EmailCampaign";
import CrossSurveyTrends from "./CrossSurveyTrends";
import DepartmentDrillDown from "./DepartmentDrillDown";
import RealTimeDashboard from "./RealTimeDashboard";
import ExecutiveSummaryExport from "./ExecutiveSummaryExport";
import SurveyIntelligence from "./SurveyIntelligence";

import SurveyCreationWizard from "./SurveyCreationWizard";

type View = "home" | "builder" | "responses" | "analytics" | "create_wizard" | "intelligence";
type SubTab = "surveys" | "question_bank" | "analytics_hub" | "distribution";
type AnalyticsSubTab = "single" | "trends" | "department" | "realtime" | "export";
type DistributionSubTab = "qr" | "email";
type SurveyFilter = "recent" | "draft" | "published" | "closed" | "favorites";

interface Props {
  sessionToken: string;
}

const SurveysDashboardTab = ({ sessionToken }: Props) => {
  const [view, setView] = useState<View>("home");
  const [subTab, setSubTab] = useState<SubTab>("surveys");
  const [analyticsSubTab, setAnalyticsSubTab] = useState<AnalyticsSubTab>("single");
  const [distributionSubTab, setDistributionSubTab] = useState<DistributionSubTab>("qr");
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingSurvey, setEditingSurvey] = useState<Survey | null>(null);
  const [viewingSurveyId, setViewingSurveyId] = useState<string | null>(null);
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [surveyFilter, setSurveyFilter] = useState<SurveyFilter>("recent");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [intelligenceSurvey, setIntelligenceSurvey] = useState<Survey | null>(null);
  const [intelligenceResponses, setIntelligenceResponses] = useState<any[]>([]);
  const [intelligenceLoading, setIntelligenceLoading] = useState(false);

  const fetchSurveys = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/survey-manage?action=list`,
        {
          headers: {
            "x-session-token": sessionToken,
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            "Content-Type": "application/json",
          },
        }
      );
      if (res.status === 401) { toast.error("Session expired."); return; }
      const json = await res.json();
      if (json.surveys) setSurveys(json.surveys);
    } catch (err) {
      console.error("Failed to fetch surveys:", err);
    }
    setLoading(false);
  }, [sessionToken]);

  useEffect(() => { fetchSurveys(); }, [fetchSurveys]);

  const handleSaveSurvey = async (survey: Partial<Survey>, questions: Omit<SurveyQuestion, "id" | "survey_id" | "created_at">[]) => {
    const isUpdate = !!survey.id;
    try {
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/survey-manage?action=${isUpdate ? "update" : "create"}`,
        {
          method: "POST",
          headers: { "x-session-token": sessionToken, apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY, "Content-Type": "application/json" },
          body: JSON.stringify({ survey, questions }),
        }
      );
      const json = await res.json();
      if (json.success) {
        toast.success(isUpdate ? "Survey updated" : "Survey created");
        setEditingSurvey(null);
        setView("home");
        fetchSurveys();
      } else {
        toast.error(json.error || "Failed to save survey");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to save");
    }
  };

  const handleDeleteSurvey = async (id: string) => {
    try {
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/survey-manage?action=delete&id=${id}`, {
        method: "POST",
        headers: { "x-session-token": sessionToken, apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY, "Content-Type": "application/json" },
      });
      if (res.ok) { toast.success("Survey deleted"); fetchSurveys(); }
    } catch { toast.error("Failed to delete survey"); }
  };

  const handleStatusChange = async (id: string, status: string) => {
    try {
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/survey-manage?action=update_status`, {
        method: "POST",
        headers: { "x-session-token": sessionToken, apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY, "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      });
      if (res.ok) { toast.success(`Survey ${status}`); fetchSurveys(); }
    } catch { toast.error("Failed to update status"); }
  };

  const handleEditSurvey = async (id: string) => {
    try {
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/survey-manage?action=get&id=${id}`, {
        headers: { "x-session-token": sessionToken, apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY },
      });
      const json = await res.json();
      if (json.survey) { setEditingSurvey(json.survey); setView("builder"); }
    } catch { toast.error("Failed to load survey"); }
  };

  const handleAICreate = (survey: Partial<Survey>, questions: Omit<SurveyQuestion, "id" | "survey_id" | "created_at">[]) => {
    const fakeSurvey = {
      ...survey, id: "",
      questions: questions.map((q) => ({ ...q, id: crypto.randomUUID(), survey_id: "", created_at: "" })),
    } as Survey;
    setEditingSurvey(fakeSurvey);
    setAiModalOpen(false);
    setView("builder");
  };

  const copyLink = (id: string) => {
    navigator.clipboard.writeText(`${window.location.origin}/survey/${id}/respond`);
    toast.success("Survey link copied!");
  };

  const openIntelligence = async (surveyId: string) => {
    setIntelligenceLoading(true);
    setView("intelligence");
    setViewingSurveyId(surveyId);
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
      setIntelligenceResponses(respJson.responses || []);
      setIntelligenceSurvey(surveyJson.survey || null);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load survey data");
    }
    setIntelligenceLoading(false);
  };

  // CREATE WIZARD VIEW
  if (view === "create_wizard") {
    return (
      <SurveyCreationWizard
        onSelect={(survey, questions) => {
          const fakeSurvey = {
            ...survey, id: "",
            questions: questions.map((q) => ({ ...q, id: crypto.randomUUID(), survey_id: "", created_at: "" })),
          } as Survey;
          setEditingSurvey(fakeSurvey);
          setView("builder");
        }}
        onCancel={() => setView("home")}
      />
    );
  }

  // BUILDER VIEW
  if (view === "builder") {
    return (
      <FormsStyleBuilder
        survey={editingSurvey}
        onSave={handleSaveSurvey}
        onBack={() => { setEditingSurvey(null); setView("home"); }}
        sessionToken={sessionToken}
      />
    );
  }

  // RESPONSES VIEW
  if (view === "responses") {
    return (
      <div className="space-y-4">
        <Button variant="ghost" onClick={() => setView("home")} className="mb-2">← Back to Surveys</Button>
        <SurveyResponsesView surveys={surveys} selectedSurveyId={viewingSurveyId} sessionToken={sessionToken} />
      </div>
    );
  }

  // ANALYTICS VIEW (single survey - old flow)
  if (view === "analytics") {
    return (
      <div className="space-y-4">
        <Button variant="ghost" onClick={() => setView("home")} className="mb-2">← Back to Surveys</Button>
        <SurveyAnalyticsView surveys={surveys} selectedSurveyId={viewingSurveyId} sessionToken={sessionToken} />
      </div>
    );
  }

  // INTELLIGENCE VIEW
  if (view === "intelligence") {
    return (
      <div className="space-y-4">
        <Button variant="ghost" onClick={() => { setView("home"); setIntelligenceSurvey(null); setIntelligenceResponses([]); }} className="mb-2">← Back to Surveys</Button>
        {intelligenceLoading ? (
          <div className="text-center py-20">
            <motion.div
              className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-primary/10 flex items-center justify-center"
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            >
              <Brain className="w-8 h-8 text-primary" />
            </motion.div>
            <p className="text-sm text-muted-foreground">Loading survey data for AI analysis...</p>
          </div>
        ) : intelligenceSurvey ? (
          <SurveyIntelligence
            survey={intelligenceSurvey}
            responses={intelligenceResponses}
            sessionToken={sessionToken}
          />
        ) : (
          <div className="text-center py-20 text-muted-foreground">Failed to load survey data</div>
        )}
      </div>
    );
  }

  // HOME VIEW
  const publishedCount = surveys.filter((s) => s.status === "published").length;
  const totalResponses = surveys.reduce((sum, s) => sum + (s.response_count || 0), 0);

  const SUB_TABS = [
    { id: "surveys" as const, label: "Surveys", icon: FileText },
    { id: "question_bank" as const, label: "Question Bank", icon: Library },
    { id: "analytics_hub" as const, label: "Analytics Hub", icon: BarChart3 },
    { id: "distribution" as const, label: "Distribution", icon: Send },
  ];

  const ANALYTICS_SUB_TABS = [
    { id: "single" as const, label: "Survey Analytics", icon: BarChart3 },
    { id: "trends" as const, label: "Cross-Survey Trends", icon: TrendingUp },
    { id: "department" as const, label: "Department Drill-Down", icon: Building2 },
    { id: "realtime" as const, label: "Real-Time", icon: Activity },
    { id: "export" as const, label: "Executive Export", icon: FileDown },
  ];

  const DISTRIBUTION_SUB_TABS = [
    { id: "qr" as const, label: "QR Code", icon: QrCode },
    { id: "email" as const, label: "Email Campaign", icon: Send },
  ];

  return (
    <div className="space-y-6">
      {/* AI Import Modal */}
      <AISurveyImportModal
        open={aiModalOpen}
        onClose={() => setAiModalOpen(false)}
        onCreateSurvey={handleAICreate}
        sessionToken={sessionToken}
      />

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold">Surveys</h2>
          <p className="text-sm text-muted-foreground">Create, share, and analyze feedback</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setAiModalOpen(true)} className="gap-1.5 border-primary/30 text-primary hover:bg-primary/10">
            <Sparkles className="w-4 h-4" /> Quick Import
          </Button>
          <Button onClick={() => setView("create_wizard")}>
            <Plus className="w-4 h-4 mr-1" /> New Survey
          </Button>
        </div>
      </div>

      {/* Sub-Tab Navigation */}
      <div className="flex gap-1 p-1 bg-secondary/50 rounded-lg w-fit">
        {SUB_TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setSubTab(tab.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
              subTab === tab.id
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <tab.icon className="w-3.5 h-3.5" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Surveys Tab */}
      {subTab === "surveys" && (() => {
        const FILTER_TABS = [
          { id: "recent" as const, label: "Recent", icon: Clock },
          { id: "draft" as const, label: "Drafts", icon: FileText },
          { id: "published" as const, label: "Published", icon: Users },
          { id: "closed" as const, label: "Closed", icon: BarChart3 },
        ];

        const filteredSurveys = surveys
          .filter((s) => {
            if (surveyFilter !== "recent" && s.status !== surveyFilter) return false;
            if (searchQuery && !s.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
            return true;
          })
          .sort((a, b) => new Date(b.updated_at || b.created_at).getTime() - new Date(a.updated_at || a.created_at).getTime());

        const COVER_GRADIENTS = [
          "from-primary/80 to-primary/40",
          "from-emerald-600/80 to-teal-500/40",
          "from-violet-600/80 to-purple-500/40",
          "from-amber-600/80 to-orange-500/40",
          "from-rose-600/80 to-pink-500/40",
          "from-cyan-600/80 to-blue-500/40",
        ];

        return (
          <>
            {/* Filter tabs + search bar */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-1">
                {FILTER_TABS.map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setSurveyFilter(tab.id)}
                    className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 transition-all ${
                      surveyFilter === tab.id
                        ? "border-primary text-foreground"
                        : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
                    }`}
                  >
                    <tab.icon className="w-4 h-4" />
                    {tab.label}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Filter by keyword"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8 h-9 w-48 text-sm"
                  />
                </div>
                <div className="flex border border-border rounded-md overflow-hidden">
                  <button
                    onClick={() => setViewMode("list")}
                    className={`p-1.5 transition-colors ${viewMode === "list" ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                  >
                    <List className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setViewMode("grid")}
                    className={`p-1.5 transition-colors ${viewMode === "grid" ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                  >
                    <LayoutGrid className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Content */}
            {loading ? (
              <div className="text-center py-16 text-muted-foreground">Loading surveys...</div>
            ) : filteredSurveys.length === 0 ? (
              <Card className="border-dashed border-2">
                <CardContent className="py-16 text-center">
                  <FileText className="w-10 h-10 mx-auto mb-3 text-muted-foreground/40" />
                  <h3 className="text-base font-semibold mb-1">
                    {surveys.length === 0 ? "No surveys yet" : "No matching surveys"}
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    {surveys.length === 0 ? "Create your first survey or import one with AI" : "Try a different filter or search term"}
                  </p>
                  {surveys.length === 0 && (
                    <div className="flex gap-2 justify-center">
                      <Button variant="outline" onClick={() => setAiModalOpen(true)}>
                        <Sparkles className="w-4 h-4 mr-1" /> Quick Import
                      </Button>
                      <Button onClick={() => setView("create_wizard")}>
                        <Plus className="w-4 h-4 mr-1" /> New Survey
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ) : viewMode === "grid" ? (
              /* ===== GRID VIEW (MS Forms style) ===== */
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {filteredSurveys.map((survey, i) => {
                  const statusDef = SURVEY_STATUSES.find((s) => s.value === survey.status);
                  const gradient = COVER_GRADIENTS[i % COVER_GRADIENTS.length];
                  const catDef = SURVEY_CATEGORIES.find((c) => c.value === survey.category);
                  return (
                    <motion.div
                      key={survey.id}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: i * 0.03, duration: 0.2 }}
                    >
                      <Card
                        className="group border-border hover:border-primary/30 hover:shadow-lg transition-all duration-200 cursor-pointer overflow-hidden"
                        onClick={() => handleEditSurvey(survey.id)}
                      >
                        {/* Cover image area */}
                        <div className={`relative h-28 bg-gradient-to-br ${gradient} flex items-center justify-center overflow-hidden`}>
                          {survey.cover_image_url ? (
                            <img src={survey.cover_image_url} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="flex flex-col items-center gap-1 text-white/80">
                              <FileText className="w-8 h-8" />
                            </div>
                          )}
                          {/* Status badge overlay */}
                          <div className="absolute top-2 right-2">
                            <Badge className={`text-[10px] px-1.5 py-0 ${statusDef?.color || ""} border-0`}>
                              {statusDef?.label}
                            </Badge>
                          </div>
                          {/* Hover actions overlay */}
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 dark:group-hover:bg-black/60 transition-colors duration-200 flex items-center justify-center gap-1.5 opacity-0 group-hover:opacity-100" onClick={(e) => e.stopPropagation()}>
                            <Button variant="secondary" size="icon" className="h-8 w-8 bg-white hover:bg-white/90 text-gray-900 dark:bg-white dark:hover:bg-white/90 dark:text-gray-900 shadow-md" onClick={() => { setViewingSurveyId(survey.id); setView("responses"); }} title="Responses">
                              <Eye className="w-3.5 h-3.5" />
                            </Button>
                            <Button variant="secondary" size="icon" className="h-8 w-8 bg-white hover:bg-white/90 text-gray-900 dark:bg-white dark:hover:bg-white/90 dark:text-gray-900 shadow-md" onClick={() => { setViewingSurveyId(survey.id); setView("analytics"); }} title="Analytics">
                              <BarChart3 className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              variant="secondary"
                              size="icon"
                              className="h-8 w-8 bg-gradient-to-br from-violet-500 to-primary text-white hover:from-violet-400 hover:to-primary/90 shadow-lg border-0 ring-2 ring-white/20"
                              onClick={() => openIntelligence(survey.id)}
                              title="AI Intelligence"
                            >
                              <Brain className="w-3.5 h-3.5" />
                            </Button>
                            {survey.status === "published" && (
                              <Button variant="secondary" size="icon" className="h-8 w-8 bg-white hover:bg-white/90 text-gray-900 dark:bg-white dark:hover:bg-white/90 dark:text-gray-900 shadow-md" onClick={() => copyLink(survey.id)} title="Copy link">
                                <Share2 className="w-3.5 h-3.5" />
                              </Button>
                            )}
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="secondary" size="icon" className="h-8 w-8 bg-white hover:bg-white/90 text-gray-900 dark:bg-white dark:hover:bg-white/90 dark:text-gray-900 shadow-md">
                                  <MoreHorizontal className="w-3.5 h-3.5" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-44">
                                <DropdownMenuItem onClick={() => handleEditSurvey(survey.id)}>
                                  <Pencil className="w-3.5 h-3.5 mr-2" /> Edit
                                </DropdownMenuItem>
                                {survey.status === "published" && (
                                  <DropdownMenuItem onClick={() => window.open(`/survey/${survey.id}/respond`, '_blank')}>
                                    <ExternalLink className="w-3.5 h-3.5 mr-2" /> Open
                                  </DropdownMenuItem>
                                )}
                                {survey.status === "draft" && (
                                  <DropdownMenuItem onClick={() => handleStatusChange(survey.id, "published")}>
                                    <Send className="w-3.5 h-3.5 mr-2" /> Publish
                                  </DropdownMenuItem>
                                )}
                                {survey.status === "published" && (
                                  <DropdownMenuItem onClick={() => handleStatusChange(survey.id, "closed")}>
                                    <Clock className="w-3.5 h-3.5 mr-2" /> Close
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => handleDeleteSurvey(survey.id)} className="text-destructive focus:text-destructive">
                                  <Trash2 className="w-3.5 h-3.5 mr-2" /> Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>

                        {/* Card body */}
                        <CardContent className="p-3">
                          <h3 className="font-medium text-sm truncate mb-1 leading-tight">{survey.title}</h3>
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            {catDef && <span className="truncate">{catDef.label}</span>}
                            {catDef && <span>·</span>}
                            <span>{survey.response_count || 0} responses</span>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  );
                })}
              </div>
            ) : (
              /* ===== LIST VIEW ===== */
              <div className="space-y-2">
                {filteredSurveys.map((survey, i) => {
                  const statusDef = SURVEY_STATUSES.find((s) => s.value === survey.status);
                  const catDef = SURVEY_CATEGORIES.find((c) => c.value === survey.category);
                  return (
                    <motion.div key={survey.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
                      <Card className="border-border hover:border-primary/20 transition-colors cursor-pointer" onClick={() => handleEditSurvey(survey.id)}>
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-0.5">
                                <h3 className="font-medium truncate text-sm">{survey.title}</h3>
                                <Badge variant="outline" className={`text-[10px] ${statusDef?.color || ""}`}>{statusDef?.label}</Badge>
                                {catDef && <Badge variant="secondary" className="text-[10px]">{catDef.label}</Badge>}
                              </div>
                              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                <span>{survey.response_count || 0} responses</span>
                                <span>{new Date(survey.created_at).toLocaleDateString()}</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                              {survey.status === "published" && (
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => copyLink(survey.id)} title="Copy link">
                                  <Copy className="w-3.5 h-3.5" />
                                </Button>
                              )}
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setViewingSurveyId(survey.id); setView("responses"); }} title="Responses">
                                <Eye className="w-3.5 h-3.5" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setViewingSurveyId(survey.id); setView("analytics"); }} title="Analytics">
                                <BarChart3 className="w-3.5 h-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-primary hover:text-primary hover:bg-primary/10"
                                onClick={() => openIntelligence(survey.id)}
                                title="AI Intelligence"
                              >
                                <Brain className="w-3.5 h-3.5" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDeleteSurvey(survey.id)} title="Delete">
                                <Trash2 className="w-3.5 h-3.5 text-destructive" />
                              </Button>
                              {survey.status === "draft" && (
                                <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => handleStatusChange(survey.id, "published")}>Publish</Button>
                              )}
                              {survey.status === "published" && (
                                <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => handleStatusChange(survey.id, "closed")}>Close</Button>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </>
        );
      })()}

      {/* Question Bank Tab */}
      {subTab === "question_bank" && <QuestionBank />}

      {/* Analytics Hub Tab */}
      {subTab === "analytics_hub" && (
        <div className="space-y-4">
          <div className="flex gap-1 p-1 bg-secondary/30 rounded-lg w-fit">
            {ANALYTICS_SUB_TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setAnalyticsSubTab(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                  analyticsSubTab === tab.id
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <tab.icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            ))}
          </div>

          {analyticsSubTab === "single" && (
            <SurveyAnalyticsView surveys={surveys} selectedSurveyId={null} sessionToken={sessionToken} />
          )}
          {analyticsSubTab === "trends" && (
            <CrossSurveyTrends surveys={surveys} sessionToken={sessionToken} />
          )}
          {analyticsSubTab === "department" && (
            <DepartmentDrillDown surveys={surveys} sessionToken={sessionToken} />
          )}
          {analyticsSubTab === "realtime" && (
            <RealTimeDashboard surveys={surveys} sessionToken={sessionToken} />
          )}
          {analyticsSubTab === "export" && (
            <ExecutiveSummaryExport surveys={surveys} sessionToken={sessionToken} />
          )}
        </div>
      )}

      {/* Distribution Tab */}
      {subTab === "distribution" && (
        <div className="space-y-4">
          <div className="flex gap-1 p-1 bg-secondary/30 rounded-lg w-fit">
            {DISTRIBUTION_SUB_TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setDistributionSubTab(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                  distributionSubTab === tab.id
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <tab.icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            ))}
          </div>

          {distributionSubTab === "qr" && <QRCodeGenerator surveys={surveys} />}
          {distributionSubTab === "email" && <EmailCampaign surveys={surveys} />}
        </div>
      )}
    </div>
  );
};

export default SurveysDashboardTab;
