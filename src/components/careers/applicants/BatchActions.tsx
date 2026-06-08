import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  CheckSquare, ArrowRight, Trash2, Users, Loader2
} from "lucide-react";
import { toast } from "sonner";
import type { Applicant, ApplicantStatus } from "@/types/careers";
import { APPLICANT_STATUSES } from "@/types/careers";

interface BatchActionsProps {
  applicants: Applicant[];
  selectedIds: Set<string>;
  onToggle: (id: string) => void;
  onSelectAll: () => void;
  onClearSelection: () => void;
  onBatchStatusUpdate: (ids: string[], status: ApplicantStatus) => Promise<void>;
  onBatchDelete: (ids: string[]) => Promise<void>;
}

const BatchActions = ({
  applicants, selectedIds, onToggle, onSelectAll, onClearSelection,
  onBatchStatusUpdate, onBatchDelete
}: BatchActionsProps) => {
  const [targetStatus, setTargetStatus] = useState<ApplicantStatus>("reviewing");
  const [processing, setProcessing] = useState(false);

  const count = selectedIds.size;

  const handleBatchMove = async () => {
    if (count === 0) return;
    setProcessing(true);
    try {
      await onBatchStatusUpdate(Array.from(selectedIds), targetStatus);
      toast.success(`${count} candidates moved to ${APPLICANT_STATUSES.find(s => s.value === targetStatus)?.label}`);
      onClearSelection();
    } catch {
      toast.error("Batch update failed");
    } finally {
      setProcessing(false);
    }
  };

  const handleBatchReject = async () => {
    if (count === 0) return;
    if (!window.confirm(`Reject ${count} candidates? This cannot be undone.`)) return;
    setProcessing(true);
    try {
      await onBatchStatusUpdate(Array.from(selectedIds), "rejected");
      toast.success(`${count} candidates rejected`);
      onClearSelection();
    } catch {
      toast.error("Batch reject failed");
    } finally {
      setProcessing(false);
    }
  };

  if (count === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8 }}
      className="sticky bottom-4 z-50"
    >
      <Card className="border-primary/30 bg-card/95 backdrop-blur-md shadow-xl shadow-primary/10">
        <CardContent className="p-3">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <CheckSquare className="w-4 h-4 text-primary" />
              <span className="text-sm font-semibold">{count} selected</span>
            </div>

            <div className="h-6 w-px bg-border" />

            <Button size="sm" variant="ghost" onClick={onSelectAll} className="text-xs h-8">
              Select all
            </Button>
            <Button size="sm" variant="ghost" onClick={onClearSelection} className="text-xs h-8">
              Clear
            </Button>

            <div className="h-6 w-px bg-border" />

            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Move to:</span>
              <Select value={targetStatus} onValueChange={(v) => setTargetStatus(v as ApplicantStatus)}>
                <SelectTrigger className="w-32 h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {APPLICANT_STATUSES.filter(s => s.value !== "rejected").map(s => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button size="sm" onClick={handleBatchMove} disabled={processing} className="h-8 text-xs">
                {processing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ArrowRight className="w-3.5 h-3.5 mr-1" />}
                Move
              </Button>
            </div>

            <Button size="sm" variant="outline" onClick={handleBatchReject} disabled={processing}
              className="h-8 text-xs text-destructive hover:bg-destructive/10 border-destructive/20 ml-auto">
              <Trash2 className="w-3.5 h-3.5 mr-1" />
              Reject all
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default BatchActions;
