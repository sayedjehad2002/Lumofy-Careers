import { useState, useMemo, useCallback } from "react";
import {
  Brain, Star, Clock, AlertTriangle, Users, Trophy,
  ArrowUpDown, Trash2, Search, Filter, ChevronRight, Zap, Eye,
  BarChart3, Activity, GitCompareArrows, CheckSquare, ClipboardList,
  Globe, RefreshCw, Pin,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { motion, AnimatePresence } from "framer-motion";
import { APPLICANT_STATUSES, STAGE_SLA_DAYS, type ApplicantStatus, type Applicant, type Job } from "@/types/careers";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import PipelineFunnel from "@/components/careers/applicants/PipelineFunnel";
import TimeToHire from "@/components/careers/applicants/TimeToHire";
import BulkComparison from "@/components/careers/applicants/BulkComparison";
import BatchActions from "@/components/careers/applicants/BatchActions";
import AdvancedFilters, { applyAdvancedFilters, DEFAULT_FILTERS, type AdvancedFiltersState } from "@/components/careers/applicants/AdvancedFilters";
import ActivityFeed from "@/components/careers/applicants/ActivityFeed";
import SourceAnalytics from "@/components/careers/applicants/SourceAnalytics";
import SmartRankingRefresh from "@/components/careers/applicants/SmartRankingRefresh";
import CandidateCompareView from "@/components/careers/applicants/CandidateCompareView";
import { tierSoft, TONE_SOFT, TONE_TEXT } from "@/components/careers/statusColors";

function getRankingTier(score: number): string {
  if (score >= 85) return "Top Match";
  if (score >= 70) return "Strong Match";
  if (score >= 50) return "Moderate Match";
  return "Weak Match";
}

interface ApplicantsListViewProps {
  applicants: Applicant[];
  jobs: Job[];
  selectedJobId: string;
  setSelectedJobId: (id: string) => void;
  onSelectApplicant: (a: Applicant) => void;
  onStatusUpdate: (id: string, status: ApplicantStatus) => Promise<void>;
  onDeleteApplicant: (id: string) => Promise<void>;
  getJobTitle: (jobId: string) => string;
  avgRating: (a: Applicant) => string | null;
}

type SortOption = "aiRanking" | "applicationDate" | "stage";
type ViewTab = "list" | "funnel" | "metrics" | "compare" | "feed" | "sources" | "ranking" | "pinned";

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { duration: 0.35, delay: Math.min(i * 0.03, 0.4), ease: [0.22, 1, 0.36, 1] as [number, number, number, number] },
  }),
};

export default function ApplicantsListView({
  applicants, jobs, selectedJobId, setSelectedJobId,
  onSelectApplicant, onStatusUpdate, onDeleteApplicant, getJobTitle, avgRating,
}: ApplicantsListViewProps) {
  const [sortBy, setSortBy] = useState<SortOption>("aiRanking");
  const [searchQuery, setSearchQuery] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<Applicant | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [activeTab, setActiveTab] = useState<ViewTab>("list");
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [advancedFilters, setAdvancedFilters] = useState<AdvancedFiltersState>(DEFAULT_FILTERS);
  const [batchSelected, setBatchSelected] = useState<Set<string>>(new Set());
  const [batchMode, setBatchMode] = useState(false);
  const [pinnedIds, setPinnedIds] = useState<Set<string>>(new Set());

  const selectedJob = useMemo(() => jobs.find(j => j.id === selectedJobId), [jobs, selectedJobId]);

  // Apply filters
  const filtered = useMemo(() => {
    let result = applicants;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(a =>
        a.fullName.toLowerCase().includes(q) ||
        a.email.toLowerCase().includes(q) ||
        a.phone.includes(q)
      );
    }
    result = applyAdvancedFilters(result, advancedFilters);
    return result;
  }, [applicants, searchQuery, advancedFilters]);

  const sorted = useMemo(() => {
    const arr = [...filtered];
    switch (sortBy) {
      case "aiRanking":
        return arr.sort((a, b) => (b.aiAnalysis?.fitScore ?? -1) - (a.aiAnalysis?.fitScore ?? -1));
      case "applicationDate":
        return arr.sort((a, b) => new Date(b.appliedDate).getTime() - new Date(a.appliedDate).getTime());
      case "stage":
        const order: ApplicantStatus[] = ["new", "reviewing", "shortlisted", "interview", "hired", "rejected"];
        return arr.sort((a, b) => order.indexOf(a.status) - order.indexOf(b.status));
      default:
        return arr;
    }
  }, [filtered, sortBy]);

  const getStatusInfo = (status: ApplicantStatus) =>
    APPLICANT_STATUSES.find((s) => s.value === status) || APPLICANT_STATUSES[0];

  // Stats
  const stats = useMemo(() => {
    const withAI = applicants.filter(a => a.aiAnalysis?.fitScore != null);
    const avgScore = withAI.length > 0 ? Math.round(withAI.reduce((s, a) => s + (a.aiAnalysis?.fitScore || 0), 0) / withAI.length) : null;
    const newCount = applicants.filter(a => a.status === "new").length;
    const overdue = applicants.filter(a => {
      const sla = STAGE_SLA_DAYS[a.status];
      if (sla === undefined || !a.stageEnteredAt) return false;
      return Math.floor((Date.now() - new Date(a.stageEnteredAt).getTime()) / (1000 * 60 * 60 * 24)) > sla;
    }).length;
    return { avgScore, newCount, overdue };
  }, [applicants]);

  // Batch actions
  const toggleBatchSelect = (id: string) => {
    setBatchSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleBatchStatusUpdate = async (ids: string[], status: ApplicantStatus) => {
    for (const id of ids) {
      await onStatusUpdate(id, status);
    }
  };

  const handleBatchDelete = async (ids: string[]) => {
    for (const id of ids) {
      await onDeleteApplicant(id);
    }
  };

  const tabs = [
    { id: "list" as const, label: "Candidates", icon: <Users className="w-3.5 h-3.5" /> },
    { id: "funnel" as const, label: "Funnel", icon: <BarChart3 className="w-3.5 h-3.5" /> },
    { id: "metrics" as const, label: "Metrics", icon: <Clock className="w-3.5 h-3.5" /> },
    { id: "sources" as const, label: "Sources", icon: <Globe className="w-3.5 h-3.5" /> },
    { id: "compare" as const, label: "AI Compare", icon: <GitCompareArrows className="w-3.5 h-3.5" /> },
    { id: "pinned" as const, label: `Pinned${pinnedIds.size > 0 ? ` (${pinnedIds.size})` : ""}`, icon: <Pin className="w-3.5 h-3.5" /> },
    { id: "ranking" as const, label: "Re-Rank", icon: <RefreshCw className="w-3.5 h-3.5" /> },
    { id: "feed" as const, label: "Activity", icon: <Activity className="w-3.5 h-3.5" /> },
  ];

  const hasActiveFilters = advancedFilters.scoreMin > 0 || advancedFilters.scoreMax < 100 ||
    advancedFilters.status !== "all" || advancedFilters.nationality !== "all" ||
    advancedFilters.dateFrom || advancedFilters.dateTo || advancedFilters.hasAIAnalysis !== null ||
    advancedFilters.tierFilter !== "all";

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Users className="w-5 h-5 text-primary" aria-hidden="true" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Applicants</h1>
            <p className="text-sm text-muted-foreground">AI-powered candidate ranking & intelligence</p>
          </div>
        </div>
      </div>

      {/* Stat chips */}
      <div className="flex flex-wrap gap-2 mb-5">
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-card border border-border text-xs font-medium">
          <Users className="w-3.5 h-3.5 text-primary" aria-hidden="true" />
          {applicants.length} total
        </div>
        {stats.avgScore !== null && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-card border border-border text-xs font-medium">
            <Brain className={`w-3.5 h-3.5 ${TONE_TEXT.ai}`} aria-hidden="true" />
            Avg Score: {stats.avgScore}
          </div>
        )}
        {stats.newCount > 0 && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-xs font-medium text-primary">
            <Zap className="w-3.5 h-3.5" aria-hidden="true" />
            {stats.newCount} new
          </div>
        )}
        {stats.overdue > 0 && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-destructive/10 border border-destructive/20 text-xs font-medium text-destructive">
            <AlertTriangle className="w-3.5 h-3.5" aria-hidden="true" />
            {stats.overdue} overdue
          </div>
        )}
      </div>

      {/* View Tabs */}
      <div className="flex gap-1 p-1.5 rounded-2xl bg-muted/40 border border-border/40 backdrop-blur-sm overflow-x-auto scrollbar-none mb-5">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-medium transition-all duration-300 whitespace-nowrap ${
              activeTab === tab.id
                ? "bg-primary text-primary-foreground shadow-md shadow-primary/25"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {/* ═══ FUNNEL TAB ═══ */}
        {activeTab === "funnel" && (
          <motion.div key="funnel" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
            <PipelineFunnel applicants={applicants} />
          </motion.div>
        )}

        {/* ═══ METRICS TAB ═══ */}
        {activeTab === "metrics" && (
          <motion.div key="metrics" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
            <TimeToHire applicants={applicants} />
          </motion.div>
        )}

        {/* ═══ COMPARE TAB ═══ */}
        {activeTab === "compare" && (
          <motion.div key="compare" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
            <BulkComparison applicants={applicants} job={selectedJob || jobs[0]} />
          </motion.div>
        )}

        {/* ═══ SOURCES TAB ═══ */}
        {activeTab === "sources" && (
          <motion.div key="sources" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
            <SourceAnalytics applicants={applicants} getJobTitle={getJobTitle} />
          </motion.div>
        )}

        {/* ═══ PINNED COMPARE TAB ═══ */}
        {activeTab === "pinned" && (
          <motion.div key="pinned" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
            <CandidateCompareView
              applicants={applicants}
              pinnedIds={pinnedIds}
              onUnpin={(id) => setPinnedIds(prev => { const next = new Set(prev); next.delete(id); return next; })}
              onClearAll={() => setPinnedIds(new Set())}
            />
          </motion.div>
        )}

        {/* ═══ RANKING TAB ═══ */}
        {activeTab === "ranking" && (
          <motion.div key="ranking" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
            <SmartRankingRefresh applicants={applicants} jobs={jobs} job={selectedJob || jobs[0]} />
          </motion.div>
        )}

        {/* ═══ ACTIVITY FEED TAB ═══ */}
        {activeTab === "feed" && (
          <motion.div key="feed" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
            <ActivityFeed applicants={applicants} getJobTitle={getJobTitle} />
          </motion.div>
        )}

        {/* ═══ LIST TAB ═══ */}
        {activeTab === "list" && (
          <motion.div key="list" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
            {/* Filters bar */}
            <Card className="mb-4 overflow-hidden">
              <CardContent className="p-3">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by name, email, or phone..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 bg-background h-10 text-sm rounded-xl"
                    />
                  </div>
                  <Select value={selectedJobId} onValueChange={setSelectedJobId}>
                    <SelectTrigger className="w-56 bg-background border-border h-10 text-sm rounded-xl">
                      <Filter className="w-3.5 h-3.5 mr-1.5 text-muted-foreground" />
                      <SelectValue placeholder="Filter by job" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Jobs</SelectItem>
                      {jobs.map((j) => (
                        <SelectItem key={j.id} value={j.id}>{j.title}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
                    <SelectTrigger className="w-44 bg-background border-border h-10 text-sm rounded-xl">
                      <ArrowUpDown className="w-3.5 h-3.5 mr-1.5 text-muted-foreground" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="aiRanking">AI Ranking</SelectItem>
                      <SelectItem value="applicationDate">Application Date</SelectItem>
                      <SelectItem value="stage">Stage</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    size="sm" variant={showAdvancedFilters ? "default" : "outline"}
                    className="h-10 text-xs rounded-xl"
                    onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                  >
                    <Filter className="w-3.5 h-3.5 mr-1.5" />
                    Filters
                    {hasActiveFilters && (
                      <Badge variant="secondary" className="ml-1 text-[8px] py-0 px-1 border-0 bg-primary-foreground/20">!</Badge>
                    )}
                  </Button>
                  <Button
                    size="sm" variant={batchMode ? "default" : "outline"}
                    className="h-10 text-xs rounded-xl"
                    onClick={() => { setBatchMode(!batchMode); setBatchSelected(new Set()); }}
                  >
                    <CheckSquare className="w-3.5 h-3.5 mr-1.5" />
                    Batch
                  </Button>
                  <span className="text-xs text-muted-foreground whitespace-nowrap font-medium">
                    {sorted.length}{sorted.length !== applicants.length ? ` of ${applicants.length}` : ""} applicant{applicants.length !== 1 ? "s" : ""}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Advanced Filters Panel */}
            <AnimatePresence>
              {showAdvancedFilters && (
                <div className="mb-4">
                  <AdvancedFilters
                    applicants={applicants}
                    filters={advancedFilters}
                    onFiltersChange={setAdvancedFilters}
                    onClose={() => setShowAdvancedFilters(false)}
                  />
                </div>
              )}
            </AnimatePresence>

            {/* Applicant cards */}
            <div className="space-y-2.5">
              {sorted.map((applicant, index) => {
                const statusInfo = getStatusInfo(applicant.status);
                const daysInStage = applicant.stageEnteredAt
                  ? Math.max(0, Math.floor((Date.now() - new Date(applicant.stageEnteredAt).getTime()) / (1000 * 60 * 60 * 24)))
                  : 0;
                const sla = STAGE_SLA_DAYS[applicant.status];
                const isOverdue = sla !== undefined && daysInStage > sla;
                const initials = applicant.fullName.trim().split(/\s+/).length >= 2
                  ? (applicant.fullName.trim().split(/\s+/)[0][0] + applicant.fullName.trim().split(/\s+/).pop()![0]).toUpperCase()
                  : applicant.fullName.substring(0, 2).toUpperCase();
                const score = applicant.aiAnalysis?.fitScore;
                const tier = score != null ? (applicant.aiAnalysis?.rankingTier || getRankingTier(score)) : null;
                const rank = sortBy === "aiRanking" ? index + 1 : null;
                const isTop3 = rank != null && rank <= 3 && score != null;
                const isSelected = batchSelected.has(applicant.id);

                return (
                  <motion.div
                    key={applicant.id}
                    variants={fadeUp}
                    initial="hidden"
                    animate="visible"
                    custom={index}
                    className={`group rounded-2xl bg-card border p-4 cursor-pointer transition-all duration-200 hover:shadow-lg ${
                      isSelected
                        ? "border-primary/50 bg-primary/5 ring-1 ring-primary/20"
                        : isTop3
                        ? "border-primary/30 bg-gradient-to-r from-primary/5 via-card to-card"
                        : isOverdue
                        ? "border-destructive/40 bg-gradient-to-r from-destructive/5 via-card to-card"
                        : "border-border hover:border-primary/20"
                    }`}
                    onClick={() => batchMode ? toggleBatchSelect(applicant.id) : onSelectApplicant(applicant)}
                  >
                    <div className="flex items-start sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        {/* Batch checkbox */}
                        {batchMode && (
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => toggleBatchSelect(applicant.id)}
                            onClick={(e) => e.stopPropagation()}
                          />
                        )}

                        {/* Rank */}
                        {rank != null && !batchMode && (
                          <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-[11px] font-bold flex-shrink-0 ${
                            rank === 1 ? TONE_SOFT.warning :
                            rank === 2 ? "bg-muted text-muted-foreground" :
                            rank === 3 ? TONE_SOFT.bronze :
                            "bg-secondary text-muted-foreground"
                          }`}>
                            {rank <= 3 ? <Trophy className="w-3.5 h-3.5" aria-hidden="true" /> : `#${rank}`}
                          </div>
                        )}

                        {/* Avatar */}
                        <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center text-xs font-bold flex-shrink-0">
                          {initials}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <h3 className="font-semibold text-sm truncate">{applicant.fullName}</h3>
                            {score != null && (
                              <div className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-primary/10 flex-shrink-0">
                                <Brain className="w-3 h-3 text-primary" aria-hidden="true" />
                                <span className="text-xs font-bold text-primary">{score}</span>
                              </div>
                            )}
                            {avgRating(applicant) && (
                              <span className={`flex items-center gap-0.5 text-[11px] flex-shrink-0 ${TONE_TEXT.warning}`}>
                                <Star className="w-3 h-3 fill-current" aria-hidden="true" />{avgRating(applicant)}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-xs text-muted-foreground truncate max-w-[180px]">{getJobTitle(applicant.jobId)}</span>
                            <span className="text-muted-foreground/30">·</span>
                            <Badge variant="secondary" className={`text-[10px] px-1.5 py-0 h-[18px] border-0 ${statusInfo.color}`}>
                              {statusInfo.label}
                            </Badge>
                            {tier && (
                              <Badge variant="secondary" className={`text-[10px] px-1.5 py-0 h-[18px] border-0 ${tierSoft(tier)}`}>
                                {tier}
                              </Badge>
                            )}
                            {!score && (
                              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-[18px] border-0 bg-muted text-muted-foreground">AI Pending</Badge>
                            )}
                          </div>

                          <div className="flex items-center gap-2.5 text-[11px] text-muted-foreground mt-1">
                            <span>{new Date(applicant.appliedDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
                            <span className="flex items-center gap-0.5">
                              <Clock className="w-2.5 h-2.5" aria-hidden="true" />{daysInStage}d
                            </span>
                            {isOverdue && (
                              <span className="flex items-center gap-0.5 text-destructive font-medium">
                                <AlertTriangle className="w-2.5 h-2.5" aria-hidden="true" />SLA Breach
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      {!batchMode && (
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <Select value={applicant.status} onValueChange={(v) => onStatusUpdate(applicant.id, v as ApplicantStatus)}>
                            <SelectTrigger className="w-32 bg-secondary border-border text-[11px] h-8 rounded-lg" onClick={(e) => e.stopPropagation()}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {APPLICANT_STATUSES.map((s) => (
                                <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Button
                            size="sm" variant="ghost"
                            className={`h-8 w-8 p-0 rounded-lg transition-colors ${pinnedIds.has(applicant.id) ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-primary hover:bg-primary/10"}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              setPinnedIds(prev => {
                                const next = new Set(prev);
                                if (next.has(applicant.id)) next.delete(applicant.id);
                                else next.add(applicant.id);
                                return next;
                              });
                            }}
                            title="Pin for comparison"
                            aria-label="Pin for comparison"
                          >
                            <Pin className="w-3.5 h-3.5" aria-hidden="true" />
                          </Button>
                          <Button
                            size="sm" variant="ghost"
                            className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                            onClick={(e) => { e.stopPropagation(); setDeleteTarget(applicant); }}
                            title="Delete applicant"
                            aria-label="Delete applicant"
                          >
                            <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                          </Button>
                          <ChevronRight className="w-4 h-4 text-muted-foreground/40 group-hover:text-primary group-hover:translate-x-0.5 transition-all" aria-hidden="true" />
                        </div>
                      )}
                    </div>
                  </motion.div>
                );
              })}
              {sorted.length === 0 && (
                <div className="text-center py-20 text-muted-foreground">
                  <div className="w-16 h-16 rounded-2xl bg-secondary flex items-center justify-center mx-auto mb-4">
                    <Users className="w-8 h-8 opacity-30" />
                  </div>
                  <p className="font-medium">{searchQuery || hasActiveFilters ? "No applicants match your filters" : "No applicants yet"}</p>
                  <p className="text-xs mt-1">
                    {searchQuery || hasActiveFilters ? "Try different search terms or filters" : "Applicants will appear here when candidates apply"}
                  </p>
                </div>
              )}
            </div>

            {/* Batch Actions Bar */}
            <AnimatePresence>
              {batchMode && batchSelected.size > 0 && (
                <motion.div key="batch-actions" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
                  <BatchActions
                    applicants={sorted}
                    selectedIds={batchSelected}
                    onToggle={toggleBatchSelect}
                    onSelectAll={() => setBatchSelected(new Set(sorted.map(a => a.id)))}
                    onClearSelection={() => setBatchSelected(new Set())}
                    onBatchStatusUpdate={handleBatchStatusUpdate}
                    onBatchDelete={handleBatchDelete}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Applicant</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to permanently delete <strong>{deleteTarget?.fullName}</strong>'s application? This will also remove their CV. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleting}
              onClick={async (e) => {
                e.preventDefault();
                if (!deleteTarget) return;
                setDeleting(true);
                try {
                  await onDeleteApplicant(deleteTarget.id);
                  toast.success(`${deleteTarget.fullName} has been removed`);
                  setDeleteTarget(null);
                } catch {
                  toast.error("Failed to delete applicant");
                } finally {
                  setDeleting(false);
                }
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
