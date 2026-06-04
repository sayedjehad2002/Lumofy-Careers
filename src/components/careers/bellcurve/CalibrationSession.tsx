import { useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  GripVertical, Undo2, Redo2, Save, History, ArrowRight, Users, CheckCircle2
} from "lucide-react";
import { toast } from "sonner";

interface EmployeeRecord {
  employeeName: string;
  department: string;
  lineManager: string;
  selfRating: number | null;
  managerRating: number | null;
  [key: string]: any;
}

interface BandDef {
  id: string;
  label: string;
  shortLabel: string;
  range: string;
  min: number;
  max: number;
}

interface CalibrationSessionProps {
  employees: any[];
  bands: BandDef[];
  bandColors: string[];
  getRating: (emp: any) => number | null;
}

interface MoveAction {
  employeeName: string;
  fromBand: string;
  toBand: string;
  timestamp: number;
}

const CalibrationSession = ({ employees, bands, bandColors, getRating }: CalibrationSessionProps) => {
  const [moves, setMoves] = useState<MoveAction[]>([]);
  const [undoneStack, setUndoneStack] = useState<MoveAction[]>([]);
  const [draggedEmp, setDraggedEmp] = useState<string | null>(null);
  const [dragOverBand, setDragOverBand] = useState<string | null>(null);

  // Build band assignments considering moves
  const bandAssignments = useMemo(() => {
    const assignments: Record<string, string> = {};
    const rated = employees.filter(e => getRating(e) !== null);
    
    // Initial assignment based on rating
    rated.forEach(emp => {
      const r = getRating(emp)!;
      const band = bands.find(b => r >= b.min && r <= b.max);
      if (band) assignments[emp.employeeName] = band.id;
    });

    // Apply moves in order
    moves.forEach(move => {
      assignments[move.employeeName] = move.toBand;
    });

    return assignments;
  }, [employees, bands, getRating, moves]);

  const bandEmployees = useMemo(() => {
    const result: Record<string, EmployeeRecord[]> = {};
    bands.forEach(b => { result[b.id] = []; });
    
    employees.filter(e => getRating(e) !== null).forEach(emp => {
      const bandId = bandAssignments[emp.employeeName];
      if (bandId && result[bandId]) {
        result[bandId].push(emp);
      }
    });
    return result;
  }, [employees, bands, bandAssignments, getRating]);

  const handleDragStart = (empName: string) => {
    setDraggedEmp(empName);
  };

  const handleDragOver = (e: React.DragEvent, bandId: string) => {
    e.preventDefault();
    setDragOverBand(bandId);
  };

  const handleDrop = (toBandId: string) => {
    if (!draggedEmp) return;
    const fromBandId = bandAssignments[draggedEmp];
    if (fromBandId === toBandId) {
      setDraggedEmp(null);
      setDragOverBand(null);
      return;
    }

    const move: MoveAction = {
      employeeName: draggedEmp,
      fromBand: fromBandId,
      toBand: toBandId,
      timestamp: Date.now(),
    };
    setMoves(prev => [...prev, move]);
    setUndoneStack([]);
    setDraggedEmp(null);
    setDragOverBand(null);

    const fromLabel = bands.find(b => b.id === fromBandId)?.shortLabel;
    const toLabel = bands.find(b => b.id === toBandId)?.shortLabel;
    toast.success(`${draggedEmp}: ${fromLabel} → ${toLabel}`);
  };

  const handleUndo = () => {
    if (moves.length === 0) return;
    const last = moves[moves.length - 1];
    setMoves(prev => prev.slice(0, -1));
    setUndoneStack(prev => [...prev, last]);
    toast.info(`Undone: ${last.employeeName}`);
  };

  const handleRedo = () => {
    if (undoneStack.length === 0) return;
    const last = undoneStack[undoneStack.length - 1];
    setUndoneStack(prev => prev.slice(0, -1));
    setMoves(prev => [...prev, last]);
    toast.info(`Redone: ${last.employeeName}`);
  };

  const handleReset = () => {
    setMoves([]);
    setUndoneStack([]);
    toast.info("All calibration moves reset");
  };

  const uniqueMoves = useMemo(() => {
    const final: Record<string, MoveAction> = {};
    moves.forEach(m => { final[m.employeeName] = m; });
    return Object.values(final).filter(m => m.fromBand !== m.toBand);
  }, [moves]);

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
      {/* Session controls */}
      <Card className="border-border/50">
        <CardContent className="p-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h3 className="font-semibold text-sm flex items-center gap-2">
                <Users className="w-4 h-4 text-primary" />
                Calibration Session Mode
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Drag employees between bands · {uniqueMoves.length} adjustment{uniqueMoves.length !== 1 ? "s" : ""} made
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={handleUndo} disabled={moves.length === 0} className="h-8 text-xs">
                <Undo2 className="w-3.5 h-3.5 mr-1" /> Undo
              </Button>
              <Button size="sm" variant="outline" onClick={handleRedo} disabled={undoneStack.length === 0} className="h-8 text-xs">
                <Redo2 className="w-3.5 h-3.5 mr-1" /> Redo
              </Button>
              <Button size="sm" variant="outline" onClick={handleReset} disabled={moves.length === 0} className="h-8 text-xs">
                <History className="w-3.5 h-3.5 mr-1" /> Reset
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Band columns */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-3">
        {bands.map((band, bi) => (
          <Card
            key={band.id}
            className={`border-border/40 transition-all duration-200 ${
              dragOverBand === band.id ? "ring-2 ring-primary/50 border-primary/30 scale-[1.01]" : ""
            }`}
            onDragOver={(e) => handleDragOver(e, band.id)}
            onDragLeave={() => setDragOverBand(null)}
            onDrop={() => handleDrop(band.id)}
          >
            <CardHeader className="pb-2 pt-3 px-3">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: bandColors[bi] }} />
                <span className="text-xs font-semibold">{band.shortLabel}</span>
                <Badge variant="secondary" className="ml-auto text-[9px] py-0 border-0 bg-muted/50">
                  {bandEmployees[band.id]?.length || 0}
                </Badge>
              </div>
              <p className="text-[9px] text-muted-foreground">{band.range}</p>
            </CardHeader>
            <CardContent className="px-2 pb-2">
              <ScrollArea className="max-h-[400px]">
                <div className="space-y-1.5 p-1">
                  <AnimatePresence>
                    {(bandEmployees[band.id] || []).map(emp => {
                      const wasMoved = uniqueMoves.some(m => m.employeeName === emp.employeeName);
                      return (
                        <motion.div
                          key={emp.employeeName}
                          layout
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          draggable
                          onDragStart={() => handleDragStart(emp.employeeName)}
                          className={`flex items-center gap-2 p-2 rounded-lg border border-border/30 bg-card/80 cursor-grab active:cursor-grabbing hover:border-border/60 transition-colors ${
                            wasMoved ? "ring-1 ring-primary/30 bg-primary/5" : ""
                          } ${draggedEmp === emp.employeeName ? "opacity-40" : ""}`}
                        >
                          <GripVertical className="w-3 h-3 text-muted-foreground/40 flex-shrink-0" />
                          <div className="min-w-0 flex-1">
                            <p className="text-[11px] font-medium truncate">{emp.employeeName}</p>
                            <p className="text-[9px] text-muted-foreground truncate">{emp.department}</p>
                          </div>
                          <span className="text-[10px] font-semibold flex-shrink-0">
                            {getRating(emp)?.toFixed(1)}
                          </span>
                          {wasMoved && <CheckCircle2 className="w-3 h-3 text-primary flex-shrink-0" />}
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                  {(!bandEmployees[band.id] || bandEmployees[band.id].length === 0) && (
                    <div className="py-6 text-center text-[10px] text-muted-foreground/40">
                      Drop here
                    </div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Change log */}
      {uniqueMoves.length > 0 && (
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <History className="w-4 h-4 text-muted-foreground" />
              Change Log ({uniqueMoves.length} adjustments)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1.5 max-h-[200px] overflow-y-auto">
              {uniqueMoves.map((move, i) => (
                <motion.div
                  key={`${move.employeeName}-${move.timestamp}`}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.02 }}
                  className="flex items-center gap-3 p-2 rounded-lg bg-muted/20 text-xs"
                >
                  <span className="font-medium min-w-[120px] truncate">{move.employeeName}</span>
                  <Badge variant="outline" className="text-[9px] py-0" style={{ borderColor: bandColors[bands.findIndex(b => b.id === move.fromBand)] }}>
                    {bands.find(b => b.id === move.fromBand)?.shortLabel}
                  </Badge>
                  <ArrowRight className="w-3 h-3 text-muted-foreground" />
                  <Badge variant="outline" className="text-[9px] py-0" style={{ borderColor: bandColors[bands.findIndex(b => b.id === move.toBand)] }}>
                    {bands.find(b => b.id === move.toBand)?.shortLabel}
                  </Badge>
                  <span className="text-[9px] text-muted-foreground ml-auto">
                    {new Date(move.timestamp).toLocaleTimeString()}
                  </span>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </motion.div>
  );
};

export default CalibrationSession;
