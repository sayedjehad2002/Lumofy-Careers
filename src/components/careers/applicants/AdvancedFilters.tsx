import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Filter, X, RotateCcw } from "lucide-react";
import type { Applicant, ApplicantStatus } from "@/types/careers";
import { APPLICANT_STATUSES } from "@/types/careers";

export interface AdvancedFiltersState {
  scoreMin: number;
  scoreMax: number;
  status: string;
  nationality: string;
  dateFrom: string;
  dateTo: string;
  hasAIAnalysis: boolean | null;
  tierFilter: string;
}

const DEFAULT_FILTERS: AdvancedFiltersState = {
  scoreMin: 0,
  scoreMax: 100,
  status: "all",
  nationality: "all",
  dateFrom: "",
  dateTo: "",
  hasAIAnalysis: null,
  tierFilter: "all",
};

interface AdvancedFiltersProps {
  applicants: Applicant[];
  filters: AdvancedFiltersState;
  onFiltersChange: (filters: AdvancedFiltersState) => void;
  onClose: () => void;
}

const TIERS = ["Top Match", "Strong Match", "Moderate Match", "Weak Match"];

const AdvancedFilters = ({ applicants, filters, onFiltersChange, onClose }: AdvancedFiltersProps) => {
  const nationalities = useMemo(() =>
    [...new Set(applicants.map(a => a.nationality).filter(Boolean))].sort() as string[],
    [applicants]
  );

  const activeCount = useMemo(() => {
    let count = 0;
    if (filters.scoreMin > 0 || filters.scoreMax < 100) count++;
    if (filters.status !== "all") count++;
    if (filters.nationality !== "all") count++;
    if (filters.dateFrom || filters.dateTo) count++;
    if (filters.hasAIAnalysis !== null) count++;
    if (filters.tierFilter !== "all") count++;
    return count;
  }, [filters]);

  return (
    <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
      <Card className="border-border/50">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <Filter className="w-4 h-4 text-primary" />
              Advanced Filters
              {activeCount > 0 && (
                <Badge variant="secondary" className="text-[9px] border-0 bg-primary/15 text-primary">{activeCount} active</Badge>
              )}
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="ghost" className="h-7 text-xs"
                onClick={() => onFiltersChange(DEFAULT_FILTERS)}>
                <RotateCcw className="w-3 h-3 mr-1" /> Reset
              </Button>
              <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={onClose}>
                <X className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {/* AI Score Range */}
            <div>
              <label className="text-[10px] text-muted-foreground uppercase tracking-widest font-medium mb-2 block">
                AI Score: {filters.scoreMin}–{filters.scoreMax}
              </label>
              <Slider
                value={[filters.scoreMin, filters.scoreMax]}
                onValueChange={([min, max]) => onFiltersChange({ ...filters, scoreMin: min, scoreMax: max })}
                min={0} max={100} step={5}
                className="mt-2"
              />
            </div>

            {/* Status */}
            <div>
              <label className="text-[10px] text-muted-foreground uppercase tracking-widest font-medium mb-1 block">Status</label>
              <Select value={filters.status} onValueChange={(v) => onFiltersChange({ ...filters, status: v })}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  {APPLICANT_STATUSES.map(s => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Nationality */}
            <div>
              <label className="text-[10px] text-muted-foreground uppercase tracking-widest font-medium mb-1 block">Nationality</label>
              <Select value={filters.nationality} onValueChange={(v) => onFiltersChange({ ...filters, nationality: v })}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  {nationalities.map(n => (
                    <SelectItem key={n} value={n}>{n}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Tier */}
            <div>
              <label className="text-[10px] text-muted-foreground uppercase tracking-widest font-medium mb-1 block">AI Tier</label>
              <Select value={filters.tierFilter} onValueChange={(v) => onFiltersChange({ ...filters, tierFilter: v })}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Tiers</SelectItem>
                  {TIERS.map(t => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Date range */}
            <div>
              <label className="text-[10px] text-muted-foreground uppercase tracking-widest font-medium mb-1 block">Applied From</label>
              <Input type="date" value={filters.dateFrom} onChange={e => onFiltersChange({ ...filters, dateFrom: e.target.value })} className="h-9 text-xs" />
            </div>
            <div>
              <label className="text-[10px] text-muted-foreground uppercase tracking-widest font-medium mb-1 block">Applied To</label>
              <Input type="date" value={filters.dateTo} onChange={e => onFiltersChange({ ...filters, dateTo: e.target.value })} className="h-9 text-xs" />
            </div>

            {/* AI Analysis filter */}
            <div className="flex items-end">
              <label className="flex items-center gap-2 cursor-pointer">
                <Switch
                  checked={filters.hasAIAnalysis === true}
                  onCheckedChange={(v) => onFiltersChange({ ...filters, hasAIAnalysis: v ? true : null })}
                />
                <span className="text-xs">Only with AI analysis</span>
              </label>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export function applyAdvancedFilters(applicants: Applicant[], filters: AdvancedFiltersState): Applicant[] {
  return applicants.filter(a => {
    const score = a.aiAnalysis?.fitScore;
    if (score != null && (score < filters.scoreMin || score > filters.scoreMax)) return false;
    if (filters.status !== "all" && a.status !== filters.status) return false;
    if (filters.nationality !== "all" && a.nationality !== filters.nationality) return false;
    if (filters.dateFrom && new Date(a.appliedDate) < new Date(filters.dateFrom)) return false;
    if (filters.dateTo && new Date(a.appliedDate) > new Date(filters.dateTo)) return false;
    if (filters.hasAIAnalysis === true && !a.aiAnalysis) return false;
    if (filters.tierFilter !== "all") {
      const tier = a.aiAnalysis?.rankingTier || (score != null ? (score >= 85 ? "Top Match" : score >= 70 ? "Strong Match" : score >= 50 ? "Moderate Match" : "Weak Match") : null);
      if (tier !== filters.tierFilter) return false;
    }
    return true;
  });
}

export { DEFAULT_FILTERS };
export default AdvancedFilters;
