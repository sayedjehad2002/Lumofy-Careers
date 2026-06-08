import { useCallback, useEffect, useState } from "react";
import { Loader2, RotateCcw, Trash2, AlertTriangle, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface TrashedCandidate {
  id: string;
  name: string | null;
  email: string | null;
  suggested_department: string | null;
  manual_department: string | null;
  suggested_job_title: string | null;
  manual_job_title: string | null;
  deleted_at: string | null;
  uploaded_at: string;
}

interface Props {
  sessionToken: string;
  /** Called after a restore so the parent can refresh the active library. */
  onChange?: () => void;
}

export default function TrashBin({ sessionToken, onChange }: Props) {
  const [items, setItems] = useState<TrashedCandidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const fetchTrash = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("cv-library-manage", {
        body: { action: "list-trash", sessionToken },
      });
      if (error) throw error;
      setItems((data?.candidates || []) as TrashedCandidate[]);
    } catch {
      toast.error("Failed to load Trash");
    } finally {
      setLoading(false);
    }
  }, [sessionToken]);

  useEffect(() => { fetchTrash(); }, [fetchTrash]);

  const handleRestore = async (id: string) => {
    setBusyId(id);
    try {
      const { error } = await supabase.functions.invoke("cv-library-manage", {
        body: { action: "restore", sessionToken, candidateId: id },
      });
      if (error) throw error;
      setItems(prev => prev.filter(c => c.id !== id));
      toast.success("Restored to library");
      onChange?.();
    } catch {
      toast.error("Restore failed");
    } finally {
      setBusyId(null);
    }
  };

  const handlePurge = async (id: string, name: string | null) => {
    if (!confirm(`Permanently delete the CV for ${name || "this candidate"}? This removes the file and record for good and cannot be undone.`)) return;
    setBusyId(id);
    try {
      const { error } = await supabase.functions.invoke("cv-library-manage", {
        body: { action: "purge", sessionToken, candidateId: id },
      });
      if (error) throw error;
      setItems(prev => prev.filter(c => c.id !== id));
      toast.success("Permanently deleted");
    } catch {
      toast.error("Delete failed");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Trash2 className="w-5 h-5 text-muted-foreground" aria-hidden="true" />
          <h3 className="font-semibold text-lg">Trash</h3>
          <Badge variant="secondary" className="text-xs">{items.length}</Badge>
        </div>
        <Button variant="outline" size="sm" onClick={fetchTrash} disabled={loading}>
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Refresh"}
        </Button>
      </div>

      <div className="rounded-xl bg-card border border-border p-4 text-xs text-muted-foreground flex items-start gap-2">
        <AlertTriangle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" aria-hidden="true" />
        <p>
          Deleted CVs are kept here so they can be recovered. <strong className="text-foreground">Restore</strong> returns
          a CV to the library. <strong className="text-foreground">Delete permanently</strong> erases the file and record
          for good (GDPR right to erasure).
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-xl bg-card border border-border p-10 text-center text-muted-foreground">
          <FileText className="w-10 h-10 mx-auto mb-3 opacity-30" aria-hidden="true" />
          <p className="font-medium">Trash is empty</p>
          <p className="text-sm mt-1">Deleted CVs appear here, recoverable until you permanently delete them.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map(c => {
            const dept = c.manual_department || c.suggested_department;
            const title = c.manual_job_title || c.suggested_job_title;
            const busy = busyId === c.id;
            return (
              <div key={c.id} className="rounded-xl bg-card border border-border p-4 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate">{c.name || "Unknown"}</p>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground mt-0.5">
                    {c.email && <span className="truncate">{c.email}</span>}
                    {dept && <span className="text-primary/80">{dept}</span>}
                    {title && <span>{title}</span>}
                  </div>
                  {c.deleted_at && (
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      Deleted {new Date(c.deleted_at).toLocaleDateString()}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <Button size="sm" variant="outline" className="gap-1.5" disabled={busy} onClick={() => handleRestore(c.id)}>
                    {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />}
                    Restore
                  </Button>
                  <Button size="sm" variant="ghost" className="gap-1.5 text-destructive hover:text-destructive" disabled={busy} onClick={() => handlePurge(c.id, c.name)}>
                    <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                    Delete permanently
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
