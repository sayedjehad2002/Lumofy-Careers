import { useState, useMemo, useCallback } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import {
  Users, Star, TrendingUp, TrendingDown, AlertTriangle, Flag,
  Award, ArrowUpRight, ArrowDownRight, Minus, Briefcase
} from "lucide-react";
import { toast } from "sonner";

interface EmployeeRecord {
  employeeName: string;
  email?: string;
  department: string;
  jobTitle?: string;
  lineManager: string;
  selfRating: number | null;
  managerRating: number | null;
  potentialScore?: string | null;
  reviewStatus?: string;
  [key: string]: any;
}

interface DrillDownModalProps {
  open: boolean;
  onClose: () => void;
  bandLabel: string;
  bandRange: string;
  bandColor: string;
  employees: any[];
  getRating: (emp: any) => number | null;
}

const DrillDownModal = ({ open, onClose, bandLabel, bandRange, bandColor, employees, getRating }: DrillDownModalProps) => {
  const [selectedAction, setSelectedAction] = useState<Record<string, string>>({});

  const sorted = useMemo(() =>
    [...employees].sort((a, b) => (getRating(b) || 0) - (getRating(a) || 0)),
  [employees, getRating]);

  const handleAction = (empName: string, action: string) => {
    setSelectedAction(prev => ({ ...prev, [empName]: action }));
    toast.success(`${empName} flagged: ${action}`);
  };

  const avgRating = sorted.length > 0
    ? sorted.reduce((s, e) => s + (getRating(e) || 0), 0) / sorted.length : 0;

  const withBothRatings = sorted.filter(e => e.selfRating !== null && e.managerRating !== null);
  const avgGap = withBothRatings.length > 0
    ? withBothRatings.reduce((s, e) => s + Math.abs((e.selfRating || 0) - (e.managerRating || 0)), 0) / withBothRatings.length : 0;

  return (
    <Dialog open={open} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-3xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: bandColor + "20" }}>
              <Users className="w-5 h-5" style={{ color: bandColor }} />
            </div>
            <div>
              <span className="text-lg">{bandLabel}</span>
              <p className="text-xs font-normal text-muted-foreground mt-0.5">
                {sorted.length} employees · {bandRange}
              </p>
            </div>
          </DialogTitle>
          <DialogDescription>
            Click actions to flag employees for PIP, promotion nomination, or calibration review.
          </DialogDescription>
        </DialogHeader>

        {/* Band Stats */}
        <div className="grid grid-cols-4 gap-3 p-3 rounded-xl bg-muted/20 border border-border/30">
          <div className="text-center">
            <p className="text-lg font-bold">{sorted.length}</p>
            <p className="text-[9px] text-muted-foreground uppercase">Employees</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold">{avgRating.toFixed(2)}</p>
            <p className="text-[9px] text-muted-foreground uppercase">Avg Rating</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold">{avgGap.toFixed(2)}</p>
            <p className="text-[9px] text-muted-foreground uppercase">Avg Gap</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold">{new Set(sorted.map(e => e.department)).size}</p>
            <p className="text-[9px] text-muted-foreground uppercase">Departments</p>
          </div>
        </div>

        <Separator />

        <ScrollArea className="max-h-[50vh]">
          <div className="space-y-2 pr-2">
            {sorted.map((emp, i) => {
              const rating = getRating(emp);
              const gap = emp.selfRating !== null && emp.managerRating !== null
                ? emp.selfRating - emp.managerRating : null;
              const action = selectedAction[emp.employeeName];

              return (
                <motion.div key={i}
                  initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.02 }}
                  className="p-3 rounded-xl border border-border/30 hover:border-border/60 bg-card/50 transition-all"
                >
                  <div className="flex items-start gap-3">
                    {/* Avatar */}
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center text-sm font-bold flex-shrink-0"
                      style={{ borderLeft: `3px solid ${bandColor}` }}
                    >
                      {emp.employeeName.split(" ").map((n: string) => n[0]).join("").slice(0, 2)}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-sm truncate">{emp.employeeName}</p>
                        {action && (
                          <Badge variant="secondary" className="text-[9px] border-0 bg-primary/15 text-primary">{action}</Badge>
                        )}
                      </div>
                      <p className="text-[11px] text-muted-foreground truncate">
                        {emp.jobTitle || "—"} · {emp.department}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        Reports to: {emp.lineManager || "—"}
                        {emp.reviewStatus && <> · Status: {emp.reviewStatus}</>}
                      </p>

                      {/* Ratings row */}
                      <div className="flex items-center gap-4 mt-2">
                        <div className="flex items-center gap-1">
                          <Star className="w-3 h-3 text-primary" />
                          <span className="text-xs font-semibold">{rating?.toFixed(2) ?? "—"}</span>
                          <span className="text-[9px] text-muted-foreground">final</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-xs">{emp.selfRating?.toFixed(2) ?? "—"}</span>
                          <span className="text-[9px] text-muted-foreground">self</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-xs">{emp.managerRating?.toFixed(2) ?? "—"}</span>
                          <span className="text-[9px] text-muted-foreground">mgr</span>
                        </div>
                        {gap !== null && (
                          <div className="flex items-center gap-1">
                            {Math.abs(gap) >= 0.5 ? (
                              gap > 0 ? <ArrowUpRight className="w-3 h-3 text-amber-400" /> : <ArrowDownRight className="w-3 h-3 text-primary" />
                            ) : (
                              <Minus className="w-3 h-3 text-emerald-400" />
                            )}
                            <span className={`text-xs font-medium ${Math.abs(gap) >= 1 ? "text-destructive" : ""}`}>
                              gap: {gap > 0 ? "+" : ""}{gap.toFixed(2)}
                            </span>
                          </div>
                        )}
                        {emp.potentialScore && (
                          <Badge variant="outline" className="text-[9px] py-0">
                            Potential: {emp.potentialScore}
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Quick Actions */}
                    <div className="flex flex-col gap-1 flex-shrink-0">
                      <Button size="sm" variant="ghost" className="h-7 text-[10px] px-2 hover:bg-destructive/10 hover:text-destructive"
                        onClick={() => handleAction(emp.employeeName, "PIP Flag")}
                      >
                        <Flag className="w-3 h-3 mr-1" /> PIP
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7 text-[10px] px-2 hover:bg-emerald-500/10 hover:text-emerald-400"
                        onClick={() => handleAction(emp.employeeName, "Promotion Nominee")}
                      >
                        <Award className="w-3 h-3 mr-1" /> Promote
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7 text-[10px] px-2 hover:bg-amber-500/10 hover:text-amber-400"
                        onClick={() => handleAction(emp.employeeName, "Calibration Review")}
                      >
                        <AlertTriangle className="w-3 h-3 mr-1" /> Review
                      </Button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

export default DrillDownModal;
