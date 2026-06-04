import { useState, useEffect, useCallback, useMemo } from "react";
import {
  BarChart3, Plus, Trash2, Pencil, Check, X, Loader2, TrendingUp, TrendingDown,
  Users, Calendar, AlertTriangle, Sparkles, Save, LayoutGrid, Table as TableIcon,
  ArrowUpDown, ArrowDownAZ, Crown, Filter, RotateCcw
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";

interface TurnoverEntry {
  id: string;
  employee_name: string;
  department: string | null;
  line_manager: string | null;
  tier: string | null;
  termination_date: string;
  termination_type: string;
  notes: string | null;
  included: boolean;
  month: number;
  year: number;
}

const TIERS = ["Tier 0", "Tier 1", "Tier 2", "Tier 3"];
const tierColor = (tier: string | null) => {
  switch (tier) {
    case "Tier 0": return "bg-purple-500/15 text-purple-400";
    case "Tier 1": return "bg-primary/15 text-primary";
    case "Tier 2": return "bg-emerald-500/15 text-emerald-400";
    case "Tier 3": return "bg-yellow-500/15 text-yellow-400";
    default: return "bg-secondary text-muted-foreground";
  }
};

interface HeadcountRecord {
  id: string;
  month: number;
  year: number;
  starting_headcount: number;
  ending_headcount: number;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const TERMINATION_TYPES = ["Resignation", "Termination", "End of Contract"];
const CURRENT_YEAR = new Date().getFullYear();
const YEARS = [CURRENT_YEAR - 2, CURRENT_YEAR - 1, CURRENT_YEAR, CURRENT_YEAR + 1];

interface Props {
  sessionToken: string;
}

type ManagerSort = "count-desc" | "count-asc" | "alpha";

export default function TurnoverAnalytics({ sessionToken }: Props) {
  const [entries, setEntries] = useState<TurnoverEntry[]>([]);
  const [headcounts, setHeadcounts] = useState<HeadcountRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState(CURRENT_YEAR);
  const [selectedMonth, setSelectedMonth] = useState<number | "all">("all");
  const [selectedQuarter, setSelectedQuarter] = useState<number | "all">("all");
  const [selectedDept, setSelectedDept] = useState<string>("all");
  const [selectedType, setSelectedType] = useState<string>("all");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<TurnoverEntry>>({});
  const [addingNew, setAddingNew] = useState(false);
  const [newEntry, setNewEntry] = useState({
    employee_name: "", department: "", line_manager: "", tier: "",
    termination_date: "", termination_type: "Resignation", notes: "", included: true,
  });
  const [headcountEditing, setHeadcountEditing] = useState<number | null>(null);
  const [headcountForm, setHeadcountForm] = useState({ starting: 0, ending: 0 });
  const [analysisText, setAnalysisText] = useState<string | null>(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [viewMode, setViewMode] = useState<"table" | "infographic">("infographic");
  const [managerSort, setManagerSort] = useState<ManagerSort>("count-desc");
  const [tableSearch, setTableSearch] = useState("");

  const invoke = useCallback(async (action: string, data: any = {}) => {
    const { data: result, error } = await supabase.functions.invoke("turnover-manage", {
      body: { sessionToken, action, data },
    });
    if (error) throw error;
    if (result?.error) throw new Error(result.error);
    return result;
  }, [sessionToken]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [entriesRes, headcountRes] = await Promise.all([
        invoke("list_entries", { year: selectedYear }),
        invoke("get_headcount", { year: selectedYear }),
      ]);
      setEntries(entriesRes.entries || []);
      setHeadcounts(headcountRes.records || []);
    } catch (e: any) {
      import.meta.env.DEV && console.error("Fetch turnover data error:", e);
      toast.error("Failed to load turnover data");
    } finally {
      setLoading(false);
    }
  }, [invoke, selectedYear]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // All unique departments from entries
  const allDepartments = useMemo(() => {
    const set = new Set<string>();
    entries.forEach(e => { if (e.department) set.add(e.department); });
    return Array.from(set).sort();
  }, [entries]);

  // All unique managers from entries
  const allManagers = useMemo(() => {
    const set = new Set<string>();
    entries.forEach(e => { if (e.line_manager) set.add(e.line_manager); });
    return Array.from(set).sort();
  }, [entries]);

  // Filtered entries (respects all filters)
  const filteredEntries = useMemo(() => {
    return entries.filter(e => {
      if (selectedMonth !== "all" && e.month !== selectedMonth) return false;
      if (selectedQuarter !== "all") {
        const qStart = (selectedQuarter - 1) * 3 + 1;
        if (e.month < qStart || e.month > qStart + 2) return false;
      }
      if (selectedDept !== "all" && (e.department || "") !== selectedDept) return false;
      if (selectedType !== "all" && e.termination_type !== selectedType) return false;
      return true;
    });
  }, [entries, selectedMonth, selectedQuarter, selectedDept, selectedType]);

  // Filtered + included for charts
  const chartEntries = useMemo(() => filteredEntries.filter(e => e.included), [filteredEntries]);

  const handleAddEntry = async () => {
    if (!newEntry.employee_name.trim() || !newEntry.termination_date) {
      toast.error("Name and termination date are required");
      return;
    }
    const date = new Date(newEntry.termination_date);
    const month = date.getMonth() + 1;
    const year = date.getFullYear();
    setSaving(true);
    try {
      await invoke("add_entry", { ...newEntry, month, year });
      setAddingNew(false);
      setNewEntry({ employee_name: "", department: "", line_manager: "", tier: "", termination_date: "", termination_type: "Resignation", notes: "", included: true });
      await fetchData();
      toast.success("Entry added");
    } catch (e: any) {
      toast.error(e.message || "Failed to add entry");
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateEntry = async (id: string) => {
    setSaving(true);
    try {
      const updates = { ...editForm };
      if (updates.termination_date) {
        const d = new Date(updates.termination_date);
        updates.month = d.getMonth() + 1;
        updates.year = d.getFullYear();
      }
      await invoke("update_entry", { id, ...updates });
      setEditingId(null);
      await fetchData();
      toast.success("Entry updated");
    } catch (e: any) {
      toast.error(e.message || "Failed to update");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteEntry = async (id: string) => {
    try {
      await invoke("delete_entry", { id });
      setEntries(prev => prev.filter(e => e.id !== id));
      toast.success("Entry deleted");
    } catch (e: any) {
      toast.error(e.message || "Failed to delete");
    }
  };

  const handleSaveHeadcount = async (month: number) => {
    setSaving(true);
    try {
      await invoke("upsert_headcount", {
        month, year: selectedYear,
        starting_headcount: headcountForm.starting,
        ending_headcount: headcountForm.ending,
      });
      setHeadcountEditing(null);
      await fetchData();
      toast.success("Headcount saved");
    } catch (e: any) {
      toast.error(e.message || "Failed to save headcount");
    } finally {
      setSaving(false);
    }
  };

  const clearFilters = () => {
    setSelectedMonth("all");
    setSelectedQuarter("all");
    setSelectedDept("all");
    setSelectedType("all");
  };

  const hasActiveFilters = selectedMonth !== "all" || selectedQuarter !== "all" || selectedDept !== "all" || selectedType !== "all";

  // KPI calculations
  const monthlyStats = useMemo(() => {
    return MONTHS.map((_, i) => {
      const month = i + 1;
      const monthEntries = entries.filter(e => e.month === month && e.included);
      const leavers = monthEntries.length;
      const hc = headcounts.find(h => h.month === month);
      const avgHc = hc ? (hc.starting_headcount + hc.ending_headcount) / 2 : 0;
      const turnoverPct = avgHc > 0 ? (leavers / avgHc) * 100 : 0;
      return { month, leavers, avgHc, turnoverPct, startHc: hc?.starting_headcount || 0, endHc: hc?.ending_headcount || 0 };
    });
  }, [entries, headcounts]);

  const quarterlyStats = useMemo(() => {
    return [1, 2, 3, 4].map(q => {
      const qMonths = monthlyStats.slice((q - 1) * 3, q * 3);
      const totalLeavers = qMonths.reduce((s, m) => s + m.leavers, 0);
      const avgHcValues = qMonths.filter(m => m.avgHc > 0);
      const avgHc = avgHcValues.length > 0 ? avgHcValues.reduce((s, m) => s + m.avgHc, 0) / avgHcValues.length : 0;
      const turnoverPct = avgHc > 0 ? (totalLeavers / avgHc) * 100 : 0;
      return { quarter: q, totalLeavers, avgHc, turnoverPct };
    });
  }, [monthlyStats]);

  const totalLeavers = useMemo(() => chartEntries.length, [chartEntries]);

  // Line manager breakdown
  const managerBreakdown = useMemo(() => {
    const map: Record<string, { total: number; types: Record<string, number> }> = {};
    chartEntries.forEach(e => {
      const mgr = e.line_manager?.trim() || "Unassigned";
      if (!map[mgr]) map[mgr] = { total: 0, types: {} };
      map[mgr].total++;
      map[mgr].types[e.termination_type] = (map[mgr].types[e.termination_type] || 0) + 1;
    });
    let arr = Object.entries(map).map(([name, d]) => ({ name, ...d }));
    if (managerSort === "count-desc") arr.sort((a, b) => b.total - a.total);
    else if (managerSort === "count-asc") arr.sort((a, b) => a.total - b.total);
    else arr.sort((a, b) => a.name.localeCompare(b.name));
    return arr;
  }, [chartEntries, managerSort]);

  const maxManagerCount = useMemo(() => Math.max(...managerBreakdown.map(m => m.total), 1), [managerBreakdown]);

  // Top manager stats
  const topManager = managerBreakdown.length > 0 ? managerBreakdown.reduce((a, b) => a.total >= b.total ? a : b) : null;
  const topManagerPct = topManager && totalLeavers > 0 ? ((topManager.total / totalLeavers) * 100).toFixed(0) : "0";
  const top3Pct = useMemo(() => {
    if (totalLeavers === 0) return "0";
    const sorted = [...managerBreakdown].sort((a, b) => b.total - a.total);
    const top3Sum = sorted.slice(0, 3).reduce((s, m) => s + m.total, 0);
    return ((top3Sum / totalLeavers) * 100).toFixed(0);
  }, [managerBreakdown, totalLeavers]);

  // Department breakdown
  const deptBreakdown = useMemo(() => {
    const map: Record<string, number> = {};
    chartEntries.filter(e => e.department).forEach(e => {
      map[e.department!] = (map[e.department!] || 0) + 1;
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [chartEntries]);

  const topDept = deptBreakdown.length > 0 ? deptBreakdown[0] : null;

  // Type breakdown
  const typeBreakdown = useMemo(() => {
    const map: Record<string, number> = {};
    chartEntries.forEach(e => {
      map[e.termination_type] = (map[e.termination_type] || 0) + 1;
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [chartEntries]);

  // Tier breakdown
  const tierBreakdown = useMemo(() => {
    const map: Record<string, number> = {};
    TIERS.forEach(t => { map[t] = 0; });
    chartEntries.filter(e => e.tier).forEach(e => {
      map[e.tier!] = (map[e.tier!] || 0) + 1;
    });
    return TIERS.map(t => ({ tier: t, count: map[t] || 0 }));
  }, [chartEntries]);

  const maxMonthlyLeavers = useMemo(() => Math.max(...monthlyStats.map(m => m.leavers), 1), [monthlyStats]);
  const maxTierCount = useMemo(() => Math.max(...tierBreakdown.map(t => t.count), 1), [tierBreakdown]);

  // Table search
  const searchedEntries = useMemo(() => {
    if (!tableSearch.trim()) return filteredEntries;
    const q = tableSearch.toLowerCase();
    return filteredEntries.filter(e =>
      e.employee_name.toLowerCase().includes(q) ||
      (e.department || "").toLowerCase().includes(q) ||
      (e.line_manager || "").toLowerCase().includes(q) ||
      (e.notes || "").toLowerCase().includes(q)
    );
  }, [filteredEntries, tableSearch]);

  const handleGenerateAnalysis = async () => {
    setAnalysisLoading(true);
    setAnalysisText(null);
    try {
      const monthlyData = monthlyStats.map((m, i) => ({
        month: MONTHS[i], leavers: m.leavers, turnoverPct: m.turnoverPct.toFixed(1), avgHeadcount: m.avgHc,
      }));
      const quarterlyData = quarterlyStats.map(q => ({
        quarter: `Q${q.quarter}`, leavers: q.totalLeavers, turnoverPct: q.turnoverPct.toFixed(1),
      }));
      const deptMap: Record<string, number> = {};
      const typeMap: Record<string, number> = {};
      const mgrMap: Record<string, number> = {};
      entries.filter(e => e.included).forEach(e => {
        if (e.department) deptMap[e.department] = (deptMap[e.department] || 0) + 1;
        typeMap[e.termination_type] = (typeMap[e.termination_type] || 0) + 1;
        const mgr = e.line_manager || "Unassigned";
        mgrMap[mgr] = (mgrMap[mgr] || 0) + 1;
      });

      const prompt = `You are an HR analytics expert. Analyze this turnover data for ${selectedYear} and provide a concise analysis.

Monthly Data: ${JSON.stringify(monthlyData)}
Quarterly Data: ${JSON.stringify(quarterlyData)}
Department Breakdown: ${JSON.stringify(deptMap)}
Termination Type Breakdown: ${JSON.stringify(typeMap)}
Line Manager Breakdown: ${JSON.stringify(mgrMap)}
Total Leavers: ${totalLeavers}

Entry notes: ${entries.filter(e => e.notes).map(e => `${e.employee_name} (${e.termination_type}): ${e.notes}`).join("; ")}

Provide:
1. **Highest Turnover Period** and likely drivers
2. **Line Manager Concentration** – which managers have the most leavers and if there's a risk pattern
3. **Department Concentration** (if data available)
4. **Trend Analysis** (month-over-month and quarter-over-quarter)
5. **Termination Type Patterns**
6. **Action Suggestions** (generic HR best practices, based only on the data provided)

Keep it concise, professional, and data-driven. Use markdown formatting.`;

      const { data, error } = await supabase.functions.invoke("copilot-chat", {
        body: {
          sessionToken,
          messages: [{ role: "user", content: prompt }],
          sessionId: null,
        },
      });
      if (error) throw error;
      setAnalysisText(data?.reply || data?.message || "No analysis generated.");
    } catch (e: any) {
      toast.error("Failed to generate analysis");
      import.meta.env.DEV && console.error(e);
    } finally {
      setAnalysisLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  const typeColor = (type: string) =>
    type === "Resignation" ? "bg-yellow-500/15 text-yellow-400" :
    type === "Termination" ? "bg-red-500/15 text-red-400" :
    "bg-blue-500/15 text-blue-400";

  const cardHover = "transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5";

  return (
    <div className="space-y-6">
      {/* ─── Header ─── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold mb-1">Turnover Analytics</h1>
          <p className="text-sm text-muted-foreground">Track turnover trends and distribution across teams and managers.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center rounded-lg border border-border bg-secondary/50 p-0.5">
            <button
              onClick={() => setViewMode("infographic")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${viewMode === "infographic" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
            >
              <LayoutGrid className="w-3.5 h-3.5" /> Infographic
            </button>
            <button
              onClick={() => setViewMode("table")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${viewMode === "table" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
            >
              <TableIcon className="w-3.5 h-3.5" /> Table
            </button>
          </div>
          <Select value={String(selectedYear)} onValueChange={v => setSelectedYear(Number(v))}>
            <SelectTrigger className="w-28 bg-card border-border">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {YEARS.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* ─── Sticky Filters Row ─── */}
      <motion.div
        className="sticky top-0 z-10 rounded-xl bg-card/95 backdrop-blur-sm border border-border p-4"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <Filter className="w-3.5 h-3.5" /> Filters
          </div>
          <Select value={selectedQuarter === "all" ? "all" : String(selectedQuarter)} onValueChange={v => { setSelectedQuarter(v === "all" ? "all" : Number(v)); if (v !== "all") setSelectedMonth("all"); }}>
            <SelectTrigger className="w-28 h-8 text-xs bg-background border-border">
              <SelectValue placeholder="Quarter" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Quarters</SelectItem>
              {[1,2,3,4].map(q => <SelectItem key={q} value={String(q)}>Q{q}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={selectedMonth === "all" ? "all" : String(selectedMonth)} onValueChange={v => { setSelectedMonth(v === "all" ? "all" : Number(v)); if (v !== "all") setSelectedQuarter("all"); }}>
            <SelectTrigger className="w-28 h-8 text-xs bg-background border-border">
              <SelectValue placeholder="Month" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Months</SelectItem>
              {MONTHS.map((m, i) => <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={selectedDept} onValueChange={setSelectedDept}>
            <SelectTrigger className="w-36 h-8 text-xs bg-background border-border">
              <SelectValue placeholder="Department" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Departments</SelectItem>
              {allDepartments.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={selectedType} onValueChange={setSelectedType}>
            <SelectTrigger className="w-36 h-8 text-xs bg-background border-border">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {TERMINATION_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
            </SelectContent>
          </Select>
          <AnimatePresence>
            {hasActiveFilters && (
              <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}>
                <Button variant="ghost" size="sm" className="h-8 text-xs gap-1.5" onClick={clearFilters}>
                  <RotateCcw className="w-3 h-3" /> Clear
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      {/* ─── KPI Cards Row ─── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <motion.div className={`rounded-xl bg-card border border-border p-5 ${cardHover}`} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center gap-2 text-muted-foreground mb-2">
            <Users className="w-4 h-4" />
            <span className="text-xs font-medium">Total Leavers</span>
          </div>
          <p className="text-3xl font-bold">{totalLeavers}</p>
          <p className="text-xs text-muted-foreground mt-1">{hasActiveFilters ? "Filtered period" : String(selectedYear)}</p>
        </motion.div>

        <motion.div className={`rounded-xl bg-card border border-border p-5 ${cardHover}`} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          <div className="flex items-center gap-2 text-muted-foreground mb-2">
            <TrendingUp className="w-4 h-4" />
            <span className="text-xs font-medium">Yearly Turnover %</span>
          </div>
          <p className="text-3xl font-bold">
            {(() => {
              const totalHc = monthlyStats.filter(m => m.avgHc > 0);
              const avgHc = totalHc.length > 0 ? totalHc.reduce((s, m) => s + m.avgHc, 0) / totalHc.length : 0;
              return avgHc > 0 ? ((entries.filter(e => e.included).length / avgHc) * 100).toFixed(1) : "—";
            })()}
            {(() => {
              const totalHc = monthlyStats.filter(m => m.avgHc > 0);
              const avgHc = totalHc.length > 0 ? totalHc.reduce((s, m) => s + m.avgHc, 0) / totalHc.length : 0;
              return avgHc > 0 ? "%" : "";
            })()}
          </p>
          <p className="text-xs text-muted-foreground mt-1">Annualized rate</p>
        </motion.div>

        <motion.div className={`rounded-xl bg-card border border-border p-5 ${cardHover}`} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <div className="flex items-center gap-2 text-muted-foreground mb-2">
            <Crown className="w-4 h-4" />
            <span className="text-xs font-medium">Top Manager</span>
          </div>
          <p className="text-lg font-bold truncate">{topManager?.name || "—"}</p>
          <p className="text-xs text-muted-foreground mt-1">{topManager ? `${topManager.total} leavers (${topManagerPct}%)` : "No data"}</p>
        </motion.div>

        <motion.div className={`rounded-xl bg-card border border-border p-5 ${cardHover}`} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <div className="flex items-center gap-2 text-muted-foreground mb-2">
            <BarChart3 className="w-4 h-4" />
            <span className="text-xs font-medium">Top Department</span>
          </div>
          <p className="text-lg font-bold truncate">{topDept ? topDept[0] : "—"}</p>
          <p className="text-xs text-muted-foreground mt-1">{topDept ? `${topDept[1]} leavers` : "No data"}</p>
        </motion.div>
      </div>

      {/* ─── INFOGRAPHIC VIEW ─── */}
      {viewMode === "infographic" && (
        <div className="space-y-6">
          {/* ══════ PRIMARY: Turnover by Line Manager ══════ */}
          <motion.div
            className="rounded-xl bg-card border border-border p-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.5 }}
          >
            <div className="flex items-center justify-between mb-2">
              <h2 className="font-semibold flex items-center gap-2">
                <Users className="w-4 h-4 text-primary" />
                Turnover by Line Manager
              </h2>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="border-0 text-[10px] bg-primary/10 text-primary">
                  Top 3 = {top3Pct}% of total
                </Badge>
                <Select value={managerSort} onValueChange={v => setManagerSort(v as ManagerSort)}>
                  <SelectTrigger className="w-32 h-7 text-[11px] bg-secondary border-border">
                    <ArrowUpDown className="w-3 h-3 mr-1 opacity-60" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="count-desc">Highest First</SelectItem>
                    <SelectItem value="count-asc">Lowest First</SelectItem>
                    <SelectItem value="alpha">A–Z</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mb-6">Identify concentration and potential management risk areas.</p>

            {managerBreakdown.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-12">No manager data available. Add entries with a Line Manager.</p>
            ) : (
              <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
                {managerBreakdown.map((mgr, i) => {
                  const pct = totalLeavers > 0 ? (mgr.total / totalLeavers) * 100 : 0;
                  const barW = maxManagerCount > 0 ? (mgr.total / maxManagerCount) * 100 : 0;
                  const isTop = i === 0 && managerSort === "count-desc";
                  return (
                    <motion.div
                      key={mgr.name}
                      className={`group rounded-lg p-3 transition-colors ${isTop ? "bg-primary/5 border border-primary/20" : "hover:bg-secondary/40"}`}
                      initial={{ opacity: 0, x: -15 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.15 + i * 0.04 }}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {isTop && <Crown className="w-3.5 h-3.5 text-primary" />}
                          <span className="text-sm font-medium truncate max-w-[200px]">{mgr.name}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-1.5">
                            {Object.entries(mgr.types).map(([type, count]) => (
                              <Badge key={type} variant="secondary" className={`border-0 text-[9px] py-0 px-1.5 ${typeColor(type)}`}>
                                {type.substring(0, 3)} {count}
                              </Badge>
                            ))}
                          </div>
                          <span className="text-sm font-bold font-mono min-w-[40px] text-right">{mgr.total}</span>
                          <span className="text-[10px] text-muted-foreground min-w-[35px] text-right">({pct.toFixed(0)}%)</span>
                        </div>
                      </div>
                      <div className="w-full h-2 bg-secondary/60 rounded-full overflow-hidden">
                        <motion.div
                          className={`h-full rounded-full ${isTop ? "bg-gradient-to-r from-primary to-primary/60" : "bg-gradient-to-r from-primary/70 to-primary/40"}`}
                          initial={{ width: 0 }}
                          animate={{ width: `${barW}%` }}
                          transition={{ duration: 0.7, delay: 0.2 + i * 0.04, ease: "easeOut" }}
                        />
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </motion.div>

          {/* ══════ Monthly Leavers ══════ */}
          <motion.div
            className="rounded-xl bg-card border border-border p-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-semibold flex items-center gap-2">
                <Calendar className="w-4 h-4 text-primary" />
                Monthly Leavers
              </h2>
              <Badge variant="secondary" className="border-0 text-xs bg-primary/10 text-primary">
                {entries.filter(e => e.included).length} total
              </Badge>
            </div>
            <div className="flex items-end gap-1.5 h-40 px-1">
              {monthlyStats.map((m, i) => {
                const barH = maxMonthlyLeavers > 0 ? (m.leavers / maxMonthlyLeavers) * 100 : 0;
                return (
                  <motion.div
                    key={m.month}
                    className="flex-1 flex flex-col items-center gap-1.5 group"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2 + i * 0.04 }}
                  >
                    <motion.span
                      className="text-xs font-bold text-primary"
                      initial={{ opacity: 0, scale: 0.5 }}
                      animate={{ opacity: m.leavers > 0 ? 1 : 0, scale: 1 }}
                      transition={{ delay: 0.4 + i * 0.04 }}
                    >
                      {m.leavers > 0 ? m.leavers : ""}
                    </motion.span>
                    <div className="w-full relative">
                      <motion.div
                        className="w-full rounded-t-lg bg-gradient-to-t from-primary/60 to-primary/30 group-hover:from-primary/80 group-hover:to-primary/50 transition-colors"
                        initial={{ height: 0 }}
                        animate={{ height: `${Math.max(barH, 3)}%` }}
                        transition={{ delay: 0.25 + i * 0.04, duration: 0.5, ease: "easeOut" }}
                        style={{ minHeight: "4px", position: "absolute", bottom: 0, left: 0, right: 0 }}
                      />
                      <div style={{ height: "120px" }} />
                    </div>
                    <span className="text-[10px] font-medium text-muted-foreground">{MONTHS[i]}</span>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>

          {/* ══════ 4-Column Breakdown: Dept, Type, Tier, Manager KPI ══════ */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Department Breakdown */}
            <motion.div
              className="rounded-xl bg-card border border-border p-6"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.5 }}
            >
              <h2 className="font-semibold mb-4 text-sm flex items-center gap-2">
                <BarChart3 className="w-3.5 h-3.5 text-primary" />
                By Department
              </h2>
              {deptBreakdown.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-8">No department data</p>
              ) : (
                <div className="space-y-3">
                  {deptBreakdown.map(([dept, count], i) => {
                    const pct = totalLeavers > 0 ? (count / totalLeavers) * 100 : 0;
                    return (
                      <motion.div
                        key={dept}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.35 + i * 0.05 }}
                      >
                        <div className="flex justify-between text-xs mb-1.5">
                          <span className="font-medium truncate max-w-[100px]">{dept}</span>
                          <span className="text-muted-foreground font-mono">{count} <span className="text-[10px]">({pct.toFixed(0)}%)</span></span>
                        </div>
                        <div className="w-full h-2 bg-secondary/60 rounded-full overflow-hidden">
                          <motion.div
                            className="h-full bg-gradient-to-r from-primary/80 to-primary/50 rounded-full"
                            initial={{ width: 0 }}
                            animate={{ width: `${pct}%` }}
                            transition={{ duration: 0.6, delay: 0.4 + i * 0.05 }}
                          />
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </motion.div>

            {/* Termination Type Breakdown */}
            <motion.div
              className="rounded-xl bg-card border border-border p-6"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35, duration: 0.5 }}
            >
              <h2 className="font-semibold mb-4 text-sm flex items-center gap-2">
                <AlertTriangle className="w-3.5 h-3.5 text-yellow-400" />
                By Termination Type
              </h2>
              {typeBreakdown.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-8">No data</p>
              ) : (
                <div className="space-y-3">
                  {typeBreakdown.map(([type, count], i) => {
                    const pct = totalLeavers > 0 ? (count / totalLeavers) * 100 : 0;
                    const barColor = type === "Resignation" ? "from-yellow-500/70 to-yellow-400/40" :
                      type === "Termination" ? "from-red-500/70 to-red-400/40" : "from-blue-500/70 to-blue-400/40";
                    return (
                      <motion.div
                        key={type}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.4 + i * 0.05 }}
                      >
                        <div className="flex justify-between text-xs mb-1.5">
                          <Badge variant="secondary" className={`border-0 text-[10px] ${typeColor(type)}`}>{type}</Badge>
                          <span className="text-muted-foreground font-mono">{count} <span className="text-[10px]">({pct.toFixed(0)}%)</span></span>
                        </div>
                        <div className="w-full h-2 bg-secondary/60 rounded-full overflow-hidden">
                          <motion.div
                            className={`h-full rounded-full bg-gradient-to-r ${barColor}`}
                            initial={{ width: 0 }}
                            animate={{ width: `${pct}%` }}
                            transition={{ duration: 0.6, delay: 0.45 + i * 0.05 }}
                          />
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </motion.div>

            {/* Tier Breakdown */}
            <motion.div
              className="rounded-xl bg-card border border-border p-6"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.5 }}
            >
              <h2 className="font-semibold mb-4 text-sm flex items-center gap-2">
                <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                By Tier
              </h2>
              {tierBreakdown.every(t => t.count === 0) ? (
                <p className="text-xs text-muted-foreground text-center py-8">No tier data</p>
              ) : (
                <div className="flex items-end gap-3 h-36 pt-2">
                  {tierBreakdown.map((t, i) => {
                    const barH = maxTierCount > 0 ? (t.count / maxTierCount) * 100 : 0;
                    const colors = {
                      "Tier 0": { bar: "from-purple-500/80 to-purple-400/50", dot: "bg-purple-500" },
                      "Tier 1": { bar: "from-primary/80 to-primary/50", dot: "bg-primary" },
                      "Tier 2": { bar: "from-emerald-500/80 to-emerald-400/50", dot: "bg-emerald-500" },
                      "Tier 3": { bar: "from-yellow-500/80 to-yellow-400/50", dot: "bg-yellow-500" },
                    }[t.tier] || { bar: "from-secondary to-secondary", dot: "bg-secondary" };
                    return (
                      <div key={t.tier} className="flex-1 flex flex-col items-center gap-1.5 group">
                        <motion.span
                          className="text-sm font-bold"
                          initial={{ opacity: 0, scale: 0.5 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: 0.5 + i * 0.08 }}
                        >
                          {t.count}
                        </motion.span>
                        <div className="w-full relative">
                          <motion.div
                            className={`w-full rounded-t-lg bg-gradient-to-t ${colors.bar} group-hover:shadow-lg transition-shadow`}
                            initial={{ height: 0 }}
                            animate={{ height: `${Math.max(barH, 5)}%` }}
                            transition={{ delay: 0.45 + i * 0.08, duration: 0.6, ease: "easeOut" }}
                            style={{ minHeight: "6px", position: "absolute", bottom: 0, left: 0, right: 0 }}
                          />
                          <div style={{ height: "90px" }} />
                        </div>
                        <div className="flex items-center gap-1">
                          <span className={`w-2 h-2 rounded-full ${colors.dot}`} />
                          <span className="text-[10px] font-medium text-muted-foreground">{t.tier.replace("Tier ", "T")}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </motion.div>

            {/* Manager Concentration KPI */}
            <motion.div
              className="rounded-xl bg-card border border-border p-6"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.45, duration: 0.5 }}
            >
              <h2 className="font-semibold mb-4 text-sm flex items-center gap-2">
                <Crown className="w-3.5 h-3.5 text-primary" />
                Manager Risk
              </h2>
              <div className="space-y-4">
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Top 3 Concentration</p>
                  <p className="text-3xl font-bold">{top3Pct}%</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">of all turnover</p>
                </div>
                <div className="border-t border-border pt-3">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Highest</p>
                  <p className="text-sm font-semibold truncate">{topManager?.name || "—"}</p>
                  <p className="text-xs text-muted-foreground">{topManager?.total || 0} leavers</p>
                </div>
                <div className="border-t border-border pt-3">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Total Managers</p>
                  <p className="text-sm font-semibold">{managerBreakdown.length}</p>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      )}

      {/* ─── TABLE VIEW ─── */}
      {viewMode === "table" && (
        <>
          {/* Monthly Overview Table */}
          <motion.div className="rounded-xl bg-card border border-border overflow-hidden" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <div className="p-5 border-b border-border flex items-center justify-between">
              <h2 className="font-semibold flex items-center gap-2">
                <Calendar className="w-4 h-4 text-primary" />
                Monthly Headcount & Turnover
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-secondary/30">
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Month</th>
                    <th className="text-right px-4 py-3 font-medium text-muted-foreground">Start HC</th>
                    <th className="text-right px-4 py-3 font-medium text-muted-foreground">End HC</th>
                    <th className="text-right px-4 py-3 font-medium text-muted-foreground">Avg HC</th>
                    <th className="text-right px-4 py-3 font-medium text-muted-foreground">Leavers</th>
                    <th className="text-right px-4 py-3 font-medium text-muted-foreground">Turnover %</th>
                    <th className="text-right px-4 py-3 font-medium text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {monthlyStats.map((m, i) => {
                    const isEditing = headcountEditing === m.month;
                    return (
                      <tr key={m.month} className="border-b border-border/50 hover:bg-secondary/20 transition-colors">
                        <td className="px-4 py-3 font-medium">{MONTHS[i]}</td>
                        <td className="px-4 py-3 text-right">
                          {isEditing ? (
                            <Input type="number" className="w-20 h-7 text-right ml-auto" value={headcountForm.starting}
                              onChange={e => setHeadcountForm(f => ({ ...f, starting: Number(e.target.value) }))} />
                          ) : m.startHc || "—"}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {isEditing ? (
                            <Input type="number" className="w-20 h-7 text-right ml-auto" value={headcountForm.ending}
                              onChange={e => setHeadcountForm(f => ({ ...f, ending: Number(e.target.value) }))} />
                          ) : m.endHc || "—"}
                        </td>
                        <td className="px-4 py-3 text-right text-muted-foreground">{m.avgHc > 0 ? m.avgHc.toFixed(0) : "—"}</td>
                        <td className="px-4 py-3 text-right">
                          <span className={m.leavers > 0 ? "font-medium" : "text-muted-foreground"}>{m.leavers}</span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          {m.turnoverPct > 0 ? (
                            <Badge variant="secondary" className={`border-0 text-xs ${
                              m.turnoverPct > 10 ? "bg-red-500/15 text-red-400" :
                              m.turnoverPct > 5 ? "bg-yellow-500/15 text-yellow-400" :
                              "bg-emerald-500/15 text-emerald-400"
                            }`}>{m.turnoverPct.toFixed(1)}%</Badge>
                          ) : <span className="text-muted-foreground">—</span>}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {isEditing ? (
                            <div className="flex items-center gap-1 justify-end">
                              <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => handleSaveHeadcount(m.month)} disabled={saving}>
                                <Check className="w-3.5 h-3.5 text-primary" />
                              </Button>
                              <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setHeadcountEditing(null)}>
                                <X className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          ) : (
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => {
                              setHeadcountEditing(m.month);
                              setHeadcountForm({ starting: m.startHc, ending: m.endHc });
                            }}>
                              <Pencil className="w-3.5 h-3.5" />
                            </Button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </motion.div>

          {/* Turnover Entries */}
          <motion.div className="rounded-xl bg-card border border-border overflow-hidden" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
            <div className="p-5 border-b border-border flex items-center justify-between">
              <div>
                <h2 className="font-semibold flex items-center gap-2">
                  <TrendingDown className="w-4 h-4 text-primary" />
                  Turnover Entries
                </h2>
                <p className="text-xs text-muted-foreground mt-1">{searchedEntries.length} records</p>
              </div>
              <div className="flex items-center gap-3">
                <Input
                  placeholder="Search entries..."
                  value={tableSearch}
                  onChange={e => setTableSearch(e.target.value)}
                  className="w-48 h-8 text-xs bg-secondary border-border"
                />
                <Button size="sm" onClick={() => setAddingNew(true)} disabled={addingNew}>
                  <Plus className="w-3.5 h-3.5 mr-1" /> Add Entry
                </Button>
              </div>
            </div>

            {addingNew && (
              <div className="p-4 border-b border-border bg-secondary/20">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  <Input placeholder="Employee Name *" value={newEntry.employee_name}
                    onChange={e => setNewEntry(f => ({ ...f, employee_name: e.target.value }))} className="bg-background" />
                   <Input placeholder="Department" value={newEntry.department}
                    onChange={e => setNewEntry(f => ({ ...f, department: e.target.value }))} className="bg-background" />
                  <Input placeholder="Line Manager" value={newEntry.line_manager}
                    onChange={e => setNewEntry(f => ({ ...f, line_manager: e.target.value }))} className="bg-background"
                    list="manager-list"
                  />
                  <datalist id="manager-list">
                    {allManagers.map(m => <option key={m} value={m} />)}
                  </datalist>
                  <Select value={newEntry.tier || "none"} onValueChange={v => setNewEntry(f => ({ ...f, tier: v === "none" ? "" : v }))}>
                    <SelectTrigger className="bg-background"><SelectValue placeholder="Select Tier" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No Tier</SelectItem>
                      {TIERS.map(t => (
                        <SelectItem key={t} value={t}>
                          <span className="flex items-center gap-2">
                            <span className={`inline-block w-2 h-2 rounded-full ${
                              t === "Tier 0" ? "bg-purple-500" : t === "Tier 1" ? "bg-primary" : t === "Tier 2" ? "bg-emerald-500" : "bg-yellow-500"
                            }`} />
                            {t}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input type="date" value={newEntry.termination_date}
                    onChange={e => setNewEntry(f => ({ ...f, termination_date: e.target.value }))} className="bg-background" />
                  <Select value={newEntry.termination_type} onValueChange={v => setNewEntry(f => ({ ...f, termination_type: v }))}>
                    <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {TERMINATION_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Input placeholder="Notes (optional)" value={newEntry.notes}
                    onChange={e => setNewEntry(f => ({ ...f, notes: e.target.value }))} className="bg-background" />
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <Switch checked={newEntry.included} onCheckedChange={v => setNewEntry(f => ({ ...f, included: v }))} />
                      <span className="text-xs text-muted-foreground">Count in turnover</span>
                    </div>
                    <div className="flex items-center gap-2 ml-auto">
                      <Button size="sm" onClick={handleAddEntry} disabled={saving}>
                        {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5 mr-1" />}
                        Save
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setAddingNew(false)}>
                        <X className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-secondary/30">
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Employee</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Line Manager</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Department</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Tier</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Date</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Type</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Notes</th>
                    <th className="text-center px-4 py-3 font-medium text-muted-foreground">Included</th>
                    <th className="text-right px-4 py-3 font-medium text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {searchedEntries.map(entry => {
                    const isEditing = editingId === entry.id;
                    return (
                      <tr key={entry.id} className="border-b border-border/50 hover:bg-secondary/20 transition-colors">
                        <td className="px-4 py-3">
                          {isEditing ? (
                            <Input className="h-7 w-40" value={editForm.employee_name || ""} onChange={e => setEditForm(f => ({ ...f, employee_name: e.target.value }))} />
                          ) : <span className="font-medium">{entry.employee_name}</span>}
                        </td>
                        <td className="px-4 py-3">
                          {isEditing ? (
                            <Input className="h-7 w-32" value={editForm.line_manager || ""} onChange={e => setEditForm(f => ({ ...f, line_manager: e.target.value }))} />
                          ) : <span className="text-muted-foreground">{entry.line_manager || "—"}</span>}
                        </td>
                        <td className="px-4 py-3">
                          {isEditing ? (
                            <Input className="h-7 w-32" value={editForm.department || ""} onChange={e => setEditForm(f => ({ ...f, department: e.target.value }))} />
                          ) : <span className="text-muted-foreground">{entry.department || "—"}</span>}
                        </td>
                        <td className="px-4 py-3">
                          {isEditing ? (
                            <Select value={editForm.tier || "none"} onValueChange={v => setEditForm(f => ({ ...f, tier: v === "none" ? null : v }))}>
                              <SelectTrigger className="h-7 w-28"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">No Tier</SelectItem>
                                {TIERS.map(t => (
                                  <SelectItem key={t} value={t}>
                                    <span className="flex items-center gap-2">
                                      <span className={`inline-block w-2 h-2 rounded-full ${
                                        t === "Tier 0" ? "bg-purple-500" : t === "Tier 1" ? "bg-primary" : t === "Tier 2" ? "bg-emerald-500" : "bg-yellow-500"
                                      }`} />
                                      {t}
                                    </span>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : entry.tier ? (
                            <Badge variant="secondary" className={`border-0 text-xs ${tierColor(entry.tier)}`}>{entry.tier}</Badge>
                          ) : <span className="text-muted-foreground">—</span>}
                        </td>
                        <td className="px-4 py-3">
                          {isEditing ? (
                            <Input type="date" className="h-7 w-36" value={editForm.termination_date || ""} onChange={e => setEditForm(f => ({ ...f, termination_date: e.target.value }))} />
                          ) : new Date(entry.termination_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                        </td>
                        <td className="px-4 py-3">
                          {isEditing ? (
                            <Select value={editForm.termination_type || "Resignation"} onValueChange={v => setEditForm(f => ({ ...f, termination_type: v }))}>
                              <SelectTrigger className="h-7 w-36"><SelectValue /></SelectTrigger>
                              <SelectContent>{TERMINATION_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                            </Select>
                          ) : (
                            <Badge variant="secondary" className={`border-0 text-xs ${typeColor(entry.termination_type)}`}>{entry.termination_type}</Badge>
                          )}
                        </td>
                        <td className="px-4 py-3 max-w-[200px]">
                          {isEditing ? (
                            <Input className="h-7" value={editForm.notes || ""} onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))} />
                          ) : <span className="text-muted-foreground text-xs truncate block">{entry.notes || "—"}</span>}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {isEditing ? (
                            <Switch checked={editForm.included !== false} onCheckedChange={v => setEditForm(f => ({ ...f, included: v }))} />
                          ) : (
                            <span className={entry.included ? "text-emerald-400" : "text-muted-foreground"}>
                              {entry.included ? "✓" : "✕"}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {isEditing ? (
                            <div className="flex items-center gap-1 justify-end">
                              <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => handleUpdateEntry(entry.id)} disabled={saving}>
                                <Check className="w-3.5 h-3.5 text-primary" />
                              </Button>
                              <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setEditingId(null)}>
                                <X className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1 justify-end">
                              <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => {
                                setEditingId(entry.id);
                                setEditForm({ ...entry });
                              }}>
                                <Pencil className="w-3.5 h-3.5" />
                              </Button>
                              <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => handleDeleteEntry(entry.id)}>
                                <Trash2 className="w-3.5 h-3.5 text-destructive" />
                              </Button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {searchedEntries.length === 0 && (
                    <tr>
                      <td colSpan={9} className="px-4 py-12 text-center text-muted-foreground">
                        <AlertTriangle className="w-8 h-8 mx-auto mb-2 opacity-30" />
                        <p className="text-sm">No turnover entries for this period</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </motion.div>
        </>
      )}

      {/* Generate Analysis */}
      <motion.div className="rounded-xl bg-card border border-border p-6" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            AI Turnover Analysis
          </h2>
          <Button onClick={handleGenerateAnalysis} disabled={analysisLoading || entries.length === 0}>
            {analysisLoading ? (
              <><Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" /> Analyzing...</>
            ) : (
              <><Sparkles className="w-3.5 h-3.5 mr-2" /> Generate Analysis</>
            )}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mb-4">
          Refresh turnover analysis using the latest entries, headcount data, and termination patterns.
        </p>
        {analysisText && (
          <div className="prose prose-sm dark:prose-invert max-w-none bg-secondary/30 rounded-lg p-5 text-sm leading-relaxed">
            <ReactMarkdown>{analysisText}</ReactMarkdown>
          </div>
        )}
        {!analysisText && !analysisLoading && entries.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-6">Add turnover entries to generate analysis.</p>
        )}
      </motion.div>
    </div>
  );
}
