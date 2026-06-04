import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users, Filter, X, AlertTriangle, Sparkles, Target, ChevronRight,
  Settings, CheckCircle2, XCircle, Search, Eye, TrendingUp
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

// ─── Types ─────────────────────────────────────────────────────────────────────
export interface EmployeeRecord {
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
  reviewStatus: string;
}

type RatingBand = "Low" | "Medium" | "High";

interface PlacedEmployee {
  employee: EmployeeRecord;
  selfBand: RatingBand;
  managerBand: RatingBand;
  selfAvg: number;
  managerAvg: number;
}

interface ThresholdConfig {
  lowMax: number;
  mediumMax: number;
}

const DEFAULT_THRESHOLDS: ThresholdConfig = { lowMax: 3.00, mediumMax: 3.50 };

function classifyRating(rating: number, thresholds: ThresholdConfig): RatingBand {
  if (rating < thresholds.lowMax) return "Low";
  if (rating < thresholds.mediumMax) return "Medium";
  return "High";
}

// ─── Grid Cell Configuration ──────────────────────────────────────────────────
const GRID_CELLS: {
  selfBand: RatingBand;
  managerBand: RatingBand;
  boxNumber: number;
  label: string;
  insight: string;
  color: string; // semantic accent
}[] = [
  // High Manager Row (Top)
  { selfBand: "Low", managerBand: "High", boxNumber: 7, label: "Confidence Risk", insight: "Underrates themselves", color: "amber" },
  { selfBand: "Medium", managerBand: "High", boxNumber: 8, label: "Underrated Performer", insight: "Manager sees more potential", color: "emerald" },
  { selfBand: "High", managerBand: "High", boxNumber: 9, label: "Strong Alignment", insight: "High performer — aligned", color: "emerald" },
  // Medium Manager Row
  { selfBand: "Low", managerBand: "Medium", boxNumber: 4, label: "Low Confidence", insight: "May need encouragement", color: "muted" },
  { selfBand: "Medium", managerBand: "Medium", boxNumber: 5, label: "Aligned Moderate", insight: "Consistent self-awareness", color: "primary" },
  { selfBand: "High", managerBand: "Medium", boxNumber: 6, label: "Slight Overconfidence", insight: "Minor perception gap", color: "amber" },
  // Low Manager Row (Bottom)
  { selfBand: "Low", managerBand: "Low", boxNumber: 1, label: "Performance Concern", insight: "Confirmed low — aligned", color: "destructive" },
  { selfBand: "Medium", managerBand: "Low", boxNumber: 2, label: "Misaligned Low", insight: "Self-perception gap", color: "destructive" },
  { selfBand: "High", managerBand: "Low", boxNumber: 3, label: "Perception Gap Risk", insight: "Major overconfidence", color: "destructive" },
];

function getCellStyles(color: string) {
  const map: Record<string, { bg: string; border: string; text: string }> = {
    emerald: { bg: "bg-emerald-500/8 dark:bg-emerald-500/10", border: "border-emerald-500/25", text: "text-emerald-600 dark:text-emerald-400" },
    amber: { bg: "bg-amber-500/8 dark:bg-amber-500/10", border: "border-amber-500/25", text: "text-amber-600 dark:text-amber-400" },
    destructive: { bg: "bg-destructive/8 dark:bg-destructive/10", border: "border-destructive/25", text: "text-destructive" },
    primary: { bg: "bg-primary/8 dark:bg-primary/10", border: "border-primary/20", text: "text-primary" },
    muted: { bg: "bg-muted/40", border: "border-border", text: "text-muted-foreground" },
  };
  return map[color] || map.muted;
}

// ─── Component Props ──────────────────────────────────────────────────────────
interface NineBoxGridProps {
  employees: EmployeeRecord[];
  maxRating?: number;
}

const NineBoxGrid = ({ employees }: NineBoxGridProps) => {
  const [thresholds, setThresholds] = useState<ThresholdConfig>(DEFAULT_THRESHOLDS);
  const [filterDept, setFilterDept] = useState("all");
  const [filterDeptGroup, setFilterDeptGroup] = useState("all");
  const [filterManager, setFilterManager] = useState("all");
  const [filterBand, setFilterBand] = useState("all");
  const [showMisalignedOnly, setShowMisalignedOnly] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedEmployee, setSelectedEmployee] = useState<PlacedEmployee | null>(null);
  const [cellViewEmployees, setCellViewEmployees] = useState<{ cell: typeof GRID_CELLS[0]; employees: PlacedEmployee[] } | null>(null);
  const [showSettings, setShowSettings] = useState(false);

  const departments = useMemo(() => [...new Set(employees.map(e => e.department).filter(Boolean))].sort(), [employees]);
  const departmentGroups = useMemo(() => [...new Set(employees.map(e => e.departmentGroup).filter(Boolean))].sort(), [employees]);
  const managers = useMemo(() => [...new Set(employees.map(e => e.lineManager).filter(Boolean))].sort(), [employees]);

  // ─── Aggregate duplicates ───────────────────────────────────────────────────
  const aggregatedEmployees = useMemo(() => {
    const empMap = new Map<string, {
      employee: EmployeeRecord;
      selfRatings: number[];
      managerRatings: number[];
    }>();

    employees.forEach(emp => {
      const key = (emp.email?.toLowerCase().trim() || emp.employeeName.toLowerCase().trim());
      if (!empMap.has(key)) {
        empMap.set(key, { employee: { ...emp }, selfRatings: [], managerRatings: [] });
      }
      const existing = empMap.get(key)!;
      if (emp.selfRating !== null && !isNaN(emp.selfRating)) existing.selfRatings.push(emp.selfRating);
      if (emp.managerRating !== null && !isNaN(emp.managerRating)) existing.managerRatings.push(emp.managerRating);
      if (emp.department && !existing.employee.department) existing.employee.department = emp.department;
      if (emp.lineManager && !existing.employee.lineManager) existing.employee.lineManager = emp.lineManager;
    });

    return Array.from(empMap.values()).map(({ employee, selfRatings, managerRatings }) => ({
      ...employee,
      selfRating: selfRatings.length > 0 ? selfRatings.reduce((a, b) => a + b, 0) / selfRatings.length : null,
      managerRating: managerRatings.length > 0 ? managerRatings.reduce((a, b) => a + b, 0) / managerRatings.length : null,
    }));
  }, [employees]);

  // ─── Validation Stats ───────────────────────────────────────────────────────
  const validationStats = useMemo(() => {
    const unique = aggregatedEmployees.length;
    const missingSelf = aggregatedEmployees.filter(e => e.selfRating === null && e.managerRating !== null);
    const missingManager = aggregatedEmployees.filter(e => e.managerRating === null && e.selfRating !== null);
    const missingBoth = aggregatedEmployees.filter(e => e.selfRating === null && e.managerRating === null);
    const placed = aggregatedEmployees.filter(e => e.selfRating !== null && e.managerRating !== null);

    return {
      totalRows: employees.length,
      uniqueEmployees: unique,
      placed: placed.length,
      missingSelf: missingSelf.length,
      missingManager: missingManager.length,
      incomplete: missingBoth.length,
      duplicates: employees.length > unique ? employees.length - unique : 0,
    };
  }, [employees, aggregatedEmployees]);

  // ─── Categorize ─────────────────────────────────────────────────────────────
  const { placed, missingSelfReview, missingManagerReview, incompleteRecords } = useMemo(() => {
    const placed: PlacedEmployee[] = [];
    const missingSelfReview: EmployeeRecord[] = [];
    const missingManagerReview: EmployeeRecord[] = [];
    const incompleteRecords: EmployeeRecord[] = [];

    aggregatedEmployees.forEach(emp => {
      const hasSelf = emp.selfRating !== null;
      const hasManager = emp.managerRating !== null;

      if (!hasSelf && !hasManager) incompleteRecords.push(emp);
      else if (!hasSelf) missingSelfReview.push(emp);
      else if (!hasManager) missingManagerReview.push(emp);
      else {
        placed.push({
          employee: emp,
          selfBand: classifyRating(emp.selfRating!, thresholds),
          managerBand: classifyRating(emp.managerRating!, thresholds),
          selfAvg: emp.selfRating!,
          managerAvg: emp.managerRating!,
        });
      }
    });

    return { placed, missingSelfReview, missingManagerReview, incompleteRecords };
  }, [aggregatedEmployees, thresholds]);

  // ─── Filters ────────────────────────────────────────────────────────────────
  const filteredPlaced = useMemo(() => {
    return placed.filter(p => {
      if (filterDept !== "all" && p.employee.department !== filterDept) return false;
      if (filterDeptGroup !== "all" && p.employee.departmentGroup !== filterDeptGroup) return false;
      if (filterManager !== "all" && p.employee.lineManager !== filterManager) return false;
      if (filterBand !== "all" && p.managerBand !== filterBand) return false;
      if (showMisalignedOnly && p.selfBand === p.managerBand) return false;
      if (searchQuery && !p.employee.employeeName.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      return true;
    });
  }, [placed, filterDept, filterDeptGroup, filterManager, filterBand, showMisalignedOnly, searchQuery]);

  const hasFilters = filterDept !== "all" || filterDeptGroup !== "all" || filterManager !== "all" || filterBand !== "all" || showMisalignedOnly || searchQuery;

  const clearFilters = () => {
    setFilterDept("all");
    setFilterDeptGroup("all");
    setFilterManager("all");
    setFilterBand("all");
    setShowMisalignedOnly(false);
    setSearchQuery("");
  };

  // ─── Alignment Insights ─────────────────────────────────────────────────────
  const insights = useMemo(() => ({
    perceptionGap: placed.filter(p => p.selfBand === "High" && p.managerBand === "Low"),
    confidenceRisk: placed.filter(p => p.selfBand === "Low" && (p.managerBand === "Medium" || p.managerBand === "High")),
    underrated: placed.filter(p => p.selfBand === "Medium" && p.managerBand === "High"),
    strongAlignment: placed.filter(p => p.selfBand === "High" && p.managerBand === "High"),
    confirmedConcern: placed.filter(p => p.selfBand === "Low" && p.managerBand === "Low"),
  }), [placed]);

  const getCellEmployees = (selfBand: RatingBand, managerBand: RatingBand) =>
    filteredPlaced.filter(p => p.selfBand === selfBand && p.managerBand === managerBand);

  const getCell = (selfBand: RatingBand, managerBand: RatingBand) =>
    GRID_CELLS.find(c => c.selfBand === selfBand && c.managerBand === managerBand)!;

  // ─── Empty State ────────────────────────────────────────────────────────────
  if (employees.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-12 text-center text-muted-foreground">
          <Target className="w-10 h-10 mx-auto mb-3 opacity-50" />
          <p>Upload performance data to view the 9-Box Grid</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="space-y-5">
        {/* Validation Strip */}
        <div className="grid grid-cols-3 md:grid-cols-7 gap-2">
          {[
            { label: "Rows", value: validationStats.totalRows, color: "" },
            { label: "Unique", value: validationStats.uniqueEmployees, color: "" },
            { label: "Placed", value: validationStats.placed, color: "text-emerald-500" },
            { label: "Missing Mgr", value: validationStats.missingManager, color: validationStats.missingManager > 0 ? "text-amber-500" : "" },
            { label: "Missing Self", value: validationStats.missingSelf, color: validationStats.missingSelf > 0 ? "text-amber-500" : "" },
            { label: "Incomplete", value: validationStats.incomplete, color: validationStats.incomplete > 0 ? "text-destructive" : "" },
            { label: "Merged", value: validationStats.duplicates, color: "" },
          ].map(s => (
            <div key={s.label} className="p-3 rounded-xl bg-muted/30 border border-border/50 text-center">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">{s.label}</p>
              <p className={`text-lg font-bold ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* 9-Box Grid Card */}
        <Card className="glass-card overflow-hidden">
          <CardHeader className="pb-3">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary/20 to-purple-500/15 flex items-center justify-center">
                  <Target className="w-4.5 h-4.5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-base">Performance Alignment Grid</CardTitle>
                  <CardDescription className="text-xs">
                    {filteredPlaced.length} placed · X: Self Review · Y: Manager Review
                  </CardDescription>
                </div>
              </div>

              <Popover open={showSettings} onOpenChange={setShowSettings}>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="h-8 text-xs">
                    <Settings className="w-3.5 h-3.5 mr-1.5" />Thresholds
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-72" align="end">
                  <div className="space-y-3">
                    <div>
                      <h4 className="font-semibold text-sm">Rating Bands</h4>
                      <p className="text-xs text-muted-foreground">Customize classification thresholds</p>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs">Low (below)</Label>
                        <Input
                          type="number" step="0.1" min="1" max="5"
                          value={thresholds.lowMax}
                          onChange={(e) => setThresholds(prev => ({ ...prev, lowMax: parseFloat(e.target.value) || 3 }))}
                          className="w-20 h-7 text-sm"
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label className="text-xs">High (at or above)</Label>
                        <Input
                          type="number" step="0.1" min="1" max="5"
                          value={thresholds.mediumMax}
                          onChange={(e) => setThresholds(prev => ({ ...prev, mediumMax: parseFloat(e.target.value) || 3.5 }))}
                          className="w-20 h-7 text-sm"
                        />
                      </div>
                    </div>
                    <div className="pt-2 border-t text-[11px] text-muted-foreground">
                      <strong>Low:</strong> &lt; {thresholds.lowMax.toFixed(2)} · <strong>Med:</strong> {thresholds.lowMax.toFixed(2)}–{(thresholds.mediumMax - 0.01).toFixed(2)} · <strong>High:</strong> ≥ {thresholds.mediumMax.toFixed(2)}
                    </div>
                    <Button variant="ghost" size="sm" className="w-full h-7 text-xs" onClick={() => setThresholds(DEFAULT_THRESHOLDS)}>
                      Reset Defaults
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            {/* Filters */}
            <div className="flex flex-wrap items-center gap-2 p-2.5 rounded-lg bg-muted/20 border border-border/40">
              <Filter className="w-3.5 h-3.5 text-muted-foreground" />

              {departmentGroups.length > 0 && (
                <Select value={filterDeptGroup} onValueChange={setFilterDeptGroup}>
                  <SelectTrigger className="w-[140px] h-8 text-xs"><SelectValue placeholder="Dept Group" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Groups</SelectItem>
                    {departmentGroups.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                  </SelectContent>
                </Select>
              )}

              <Select value={filterDept} onValueChange={setFilterDept}>
                <SelectTrigger className="w-[130px] h-8 text-xs"><SelectValue placeholder="Department" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Depts</SelectItem>
                  {departments.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                </SelectContent>
              </Select>

              <Select value={filterManager} onValueChange={setFilterManager}>
                <SelectTrigger className="w-[130px] h-8 text-xs"><SelectValue placeholder="Manager" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Managers</SelectItem>
                  {managers.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                </SelectContent>
              </Select>

              <Select value={filterBand} onValueChange={setFilterBand}>
                <SelectTrigger className="w-[110px] h-8 text-xs"><SelectValue placeholder="Band" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Bands</SelectItem>
                  <SelectItem value="Low">Low</SelectItem>
                  <SelectItem value="Medium">Medium</SelectItem>
                  <SelectItem value="High">High</SelectItem>
                </SelectContent>
              </Select>

              <div className="flex items-center gap-1.5 px-2">
                <Switch checked={showMisalignedOnly} onCheckedChange={setShowMisalignedOnly} id="misaligned" className="scale-90" />
                <Label htmlFor="misaligned" className="text-[11px]">Misaligned</Label>
              </div>

              <div className="relative flex-1 min-w-[160px]">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <Input
                  placeholder="Search employee…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 h-8 text-xs"
                />
              </div>

              {hasFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters} className="h-8 text-xs">
                  <X className="w-3.5 h-3.5 mr-1" />Clear
                </Button>
              )}
            </div>

            {/* Grid */}
            <div className="relative">
              <div className="absolute -left-1 top-1/2 -translate-y-1/2 -rotate-90 text-[10px] font-semibold text-muted-foreground tracking-widest uppercase whitespace-nowrap origin-center">
                Manager Review →
              </div>

              <div className="ml-8">
                {/* Column Headers */}
                <div className="grid grid-cols-3 gap-2.5 mb-2.5">
                  {(["Low", "Medium", "High"] as RatingBand[]).map(band => (
                    <div key={band} className="text-center">
                      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{band} Self</span>
                      <span className="text-[9px] text-muted-foreground block">
                        {band === "Low" && `< ${thresholds.lowMax}`}
                        {band === "Medium" && `${thresholds.lowMax}–${(thresholds.mediumMax - 0.01).toFixed(2)}`}
                        {band === "High" && `≥ ${thresholds.mediumMax}`}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Grid Rows */}
                {(["High", "Medium", "Low"] as RatingBand[]).map((managerBand, rowIdx) => (
                  <div key={managerBand} className="grid grid-cols-[auto_1fr_1fr_1fr] gap-2.5 mb-2.5">
                    <div className="w-7 flex items-center justify-center">
                      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider -rotate-90 whitespace-nowrap">
                        {managerBand}
                      </span>
                    </div>

                    {(["Low", "Medium", "High"] as RatingBand[]).map(selfBand => {
                      const cell = getCell(selfBand, managerBand);
                      const styles = getCellStyles(cell.color);
                      const cellEmps = getCellEmployees(selfBand, managerBand);

                      return (
                        <motion.div
                          key={`${selfBand}-${managerBand}`}
                          initial={{ opacity: 0, scale: 0.96 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: rowIdx * 0.04 }}
                          className={`${styles.bg} ${styles.border} border rounded-xl p-3.5 min-h-[150px] relative group cursor-pointer hover:shadow-md hover:scale-[1.01] transition-all duration-200`}
                          onClick={() => cellEmps.length > 0 && setCellViewEmployees({ cell, employees: cellEmps })}
                        >
                          <div className="mb-2.5">
                            <span className="text-[10px] font-bold text-muted-foreground">Box {cell.boxNumber}</span>
                            <p className={`text-xs font-bold ${styles.text}`}>{cell.label}</p>
                            <p className="text-[10px] text-muted-foreground leading-tight">{cell.insight}</p>
                          </div>

                          <div className="absolute top-2.5 right-2.5 px-2 py-0.5 text-xs font-bold bg-background/90 backdrop-blur-sm text-foreground border rounded-lg">
                            {cellEmps.length}
                          </div>

                          <div className="flex flex-wrap gap-1">
                            {cellEmps.slice(0, 4).map((p, i) => (
                              <button
                                key={i}
                                onClick={(e) => { e.stopPropagation(); setSelectedEmployee(p); }}
                                className="inline-flex items-center px-2 py-1 rounded-md text-[10px] font-medium bg-background/80 border border-border/50 text-foreground hover:border-primary/40 hover:bg-primary/5 transition-all"
                              >
                                <span className="max-w-[65px] truncate">{p.employee.employeeName}</span>
                              </button>
                            ))}
                            {cellEmps.length > 4 && (
                              <span className="inline-flex items-center px-2 py-1 rounded-md text-[10px] font-medium bg-muted/60 text-muted-foreground">
                                +{cellEmps.length - 4}
                                <ChevronRight className="w-2.5 h-2.5 ml-0.5" />
                              </span>
                            )}
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                ))}

                <div className="text-center mt-1.5">
                  <span className="text-[10px] font-bold text-muted-foreground tracking-widest uppercase">Self Review →</span>
                </div>
              </div>
            </div>

            {/* Legend */}
            <div className="flex flex-wrap gap-3 pt-3 border-t border-border/40">
              {[
                { label: "Strong Alignment", cls: "bg-emerald-500/12 border-emerald-500/25" },
                { label: "Perception Gap", cls: "bg-destructive/12 border-destructive/25" },
                { label: "Confidence Risk", cls: "bg-amber-500/10 border-amber-500/25" },
                { label: "Core / Aligned", cls: "bg-primary/10 border-primary/20" },
              ].map(item => (
                <div key={item.label} className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                  <div className={`w-3 h-3 rounded border ${item.cls}`} />
                  {item.label}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Alignment Insights */}
        <Card className="glass-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Eye className="w-4 h-4 text-primary" />
              Alignment Insights
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2.5">
              {[
                { label: "Perception Gap", count: insights.perceptionGap.length, desc: "High Self · Low Mgr", icon: AlertTriangle, accent: "destructive" },
                { label: "Confidence Risk", count: insights.confidenceRisk.length, desc: "Low Self · Med/High Mgr", icon: Eye, accent: "amber" },
                { label: "Underrated", count: insights.underrated.length, desc: "Med Self · High Mgr", icon: Sparkles, accent: "purple" },
                { label: "Strong Alignment", count: insights.strongAlignment.length, desc: "High Self · High Mgr", icon: TrendingUp, accent: "emerald" },
                { label: "Confirmed Concern", count: insights.confirmedConcern.length, desc: "Low Self · Low Mgr", icon: XCircle, accent: "muted" },
              ].map(item => {
                const accentBg = item.accent === "destructive" ? "bg-destructive/8" : item.accent === "amber" ? "bg-amber-500/8" : item.accent === "purple" ? "bg-purple-500/8" : item.accent === "emerald" ? "bg-emerald-500/8" : "bg-muted/40";
                const accentBorder = item.accent === "destructive" ? "border-destructive/20" : item.accent === "amber" ? "border-amber-500/20" : item.accent === "purple" ? "border-purple-500/20" : item.accent === "emerald" ? "border-emerald-500/20" : "border-border";
                const accentText = item.accent === "destructive" ? "text-destructive" : item.accent === "amber" ? "text-amber-600 dark:text-amber-400" : item.accent === "purple" ? "text-purple-600 dark:text-purple-400" : item.accent === "emerald" ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground";

                return (
                  <div key={item.label} className={`p-3 rounded-xl ${accentBg} border ${accentBorder}`}>
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <item.icon className={`w-3.5 h-3.5 ${accentText}`} />
                      <span className={`text-[11px] font-semibold ${accentText}`}>{item.label}</span>
                    </div>
                    <p className="text-xl font-bold">{item.count}</p>
                    <p className="text-[10px] text-muted-foreground">{item.desc}</p>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Missing Data */}
        {(missingManagerReview.length > 0 || missingSelfReview.length > 0 || incompleteRecords.length > 0) && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
            {missingManagerReview.length > 0 && (
              <Card className="border-amber-500/25">
                <CardHeader className="pb-2 pt-4 px-4">
                  <CardTitle className="text-xs flex items-center gap-2">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                    Missing Manager Review
                    <Badge variant="secondary" className="ml-auto text-[10px]">{missingManagerReview.length}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0 px-4 pb-4">
                  <ScrollArea className="h-32">
                    <div className="space-y-1.5">
                      {missingManagerReview.map((emp, i) => (
                        <div key={i} className="p-2 rounded-lg bg-amber-500/5 border border-amber-500/10 flex items-center justify-between">
                          <div className="min-w-0">
                            <p className="text-xs font-medium truncate">{emp.employeeName}</p>
                            <p className="text-[10px] text-muted-foreground truncate">{emp.department}</p>
                          </div>
                          <Badge variant="outline" className="text-[9px] shrink-0 border-amber-500/30 text-amber-600">Unplaced</Badge>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            )}

            {missingSelfReview.length > 0 && (
              <Card className="border-amber-500/25">
                <CardHeader className="pb-2 pt-4 px-4">
                  <CardTitle className="text-xs flex items-center gap-2">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                    Missing Self Review
                    <Badge variant="secondary" className="ml-auto text-[10px]">{missingSelfReview.length}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0 px-4 pb-4">
                  <ScrollArea className="h-32">
                    <div className="space-y-1.5">
                      {missingSelfReview.map((emp, i) => (
                        <div key={i} className="p-2 rounded-lg bg-amber-500/5 border border-amber-500/10 flex items-center justify-between">
                          <div className="min-w-0">
                            <p className="text-xs font-medium truncate">{emp.employeeName}</p>
                            <p className="text-[10px] text-muted-foreground truncate">{emp.department}</p>
                          </div>
                          <Badge variant="outline" className="text-[9px] shrink-0 border-amber-500/30 text-amber-600">Unplaced</Badge>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            )}

            {incompleteRecords.length > 0 && (
              <Card className="border-destructive/25">
                <CardHeader className="pb-2 pt-4 px-4">
                  <CardTitle className="text-xs flex items-center gap-2">
                    <XCircle className="w-3.5 h-3.5 text-destructive" />
                    Incomplete Records
                    <Badge variant="secondary" className="ml-auto text-[10px]">{incompleteRecords.length}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0 px-4 pb-4">
                  <ScrollArea className="h-32">
                    <div className="space-y-1.5">
                      {incompleteRecords.map((emp, i) => (
                        <div key={i} className="p-2 rounded-lg bg-destructive/5 border border-destructive/10 flex items-center justify-between">
                          <div className="min-w-0">
                            <p className="text-xs font-medium truncate">{emp.employeeName}</p>
                            <p className="text-[10px] text-muted-foreground truncate">{emp.department}</p>
                          </div>
                          <Badge variant="outline" className="text-[9px] shrink-0 border-destructive/30 text-destructive">Invalid</Badge>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>

      {/* Employee Detail Dialog */}
      <Dialog open={!!selectedEmployee} onOpenChange={() => setSelectedEmployee(null)}>
        <DialogContent className="max-w-md">
          {selectedEmployee && (() => {
            const cell = getCell(selectedEmployee.selfBand, selectedEmployee.managerBand);
            const styles = getCellStyles(cell.color);
            return (
              <>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-primary" />
                    {selectedEmployee.employee.employeeName}
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="p-3 rounded-lg bg-muted/40">
                      <p className="text-[10px] text-muted-foreground">Department</p>
                      <p className="text-sm font-medium">{selectedEmployee.employee.department || "—"}</p>
                    </div>
                    <div className="p-3 rounded-lg bg-muted/40">
                      <p className="text-[10px] text-muted-foreground">Manager</p>
                      <p className="text-sm font-medium">{selectedEmployee.employee.lineManager || "—"}</p>
                    </div>
                    {selectedEmployee.employee.email && (
                      <div className="p-3 rounded-lg bg-muted/40 col-span-2">
                        <p className="text-[10px] text-muted-foreground">Email</p>
                        <p className="text-sm font-medium">{selectedEmployee.employee.email}</p>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="p-4 rounded-lg bg-muted/40 text-center">
                      <p className="text-[10px] text-muted-foreground mb-1">Self Review</p>
                      <p className="text-2xl font-bold">{selectedEmployee.selfAvg.toFixed(2)}</p>
                      <Badge variant="secondary" className="mt-1.5 text-[10px]">{selectedEmployee.selfBand}</Badge>
                    </div>
                    <div className="p-4 rounded-lg bg-muted/40 text-center">
                      <p className="text-[10px] text-muted-foreground mb-1">Manager Review</p>
                      <p className="text-2xl font-bold">{selectedEmployee.managerAvg.toFixed(2)}</p>
                      <Badge variant="secondary" className="mt-1.5 text-[10px]">{selectedEmployee.managerBand}</Badge>
                    </div>
                  </div>

                  <div className={`p-3 rounded-lg border ${styles.bg} ${styles.border}`}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] font-bold text-muted-foreground">Box {cell.boxNumber}</span>
                      <span className={`text-xs font-semibold ${styles.text}`}>{cell.label}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">{cell.insight}</p>
                  </div>

                  {selectedEmployee.selfBand !== selectedEmployee.managerBand && (
                    <div className="p-3 rounded-lg bg-amber-500/8 border border-amber-500/20">
                      <div className="flex items-center gap-1.5 mb-1">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                        <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">Alignment Gap</span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Self ({selectedEmployee.selfBand}) ≠ Manager ({selectedEmployee.managerBand}). Consider calibration.
                      </p>
                    </div>
                  )}
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* Cell View Dialog */}
      <Dialog open={!!cellViewEmployees} onOpenChange={() => setCellViewEmployees(null)}>
        <DialogContent className="max-w-xl max-h-[80vh]">
          {cellViewEmployees && (() => {
            const styles = getCellStyles(cellViewEmployees.cell.color);
            return (
              <>
                <DialogHeader>
                  <DialogTitle className={`flex items-center gap-2 ${styles.text}`}>
                    Box {cellViewEmployees.cell.boxNumber} · {cellViewEmployees.cell.label}
                    <Badge variant="secondary" className="text-[10px]">{cellViewEmployees.employees.length}</Badge>
                  </DialogTitle>
                  <p className="text-xs text-muted-foreground">{cellViewEmployees.cell.insight}</p>
                </DialogHeader>
                <ScrollArea className="max-h-[60vh]">
                  <div className="space-y-1.5 pr-4">
                    {cellViewEmployees.employees.map((p, i) => (
                      <button
                        key={i}
                        onClick={() => { setCellViewEmployees(null); setSelectedEmployee(p); }}
                        className="w-full p-3 rounded-lg bg-muted/20 hover:bg-muted/40 transition-colors text-left flex items-center justify-between"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-medium">{p.employee.employeeName}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            {p.employee.department}
                            {p.employee.lineManager && ` · ${p.employee.lineManager}`}
                          </p>
                        </div>
                        <div className="text-right shrink-0 ml-4">
                          <p className="text-[10px] text-muted-foreground">Self: <span className="font-bold text-foreground">{p.selfAvg.toFixed(2)}</span></p>
                          <p className="text-[10px] text-muted-foreground">Mgr: <span className="font-bold text-foreground">{p.managerAvg.toFixed(2)}</span></p>
                        </div>
                      </button>
                    ))}
                  </div>
                </ScrollArea>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default NineBoxGrid;
