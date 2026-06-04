import { useState } from "react";
import { ArrowRight, Briefcase, Check, Loader2, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface CVCandidate {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  nationality: string | null;
  location: string | null;
  skills: string[];
  resume_file_name: string;
  resume_file_path: string;
  resume_file_type: string | null;
  resume_file_size: number | null;
}

interface Job {
  id: string;
  title: string;
  department: string;
  status: string;
}

interface Props {
  candidate: CVCandidate;
  jobs: Job[];
  sessionToken: string;
  onDone?: () => void;
}

export default function PipelineIntegration({ candidate, jobs, sessionToken, onDone }: Props) {
  const [open, setOpen] = useState(false);
  const [selectedJobId, setSelectedJobId] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const openJobs = jobs.filter(j => j.status === "open");
  const selectedJob = openJobs.find(j => j.id === selectedJobId);

  const handleAddToJob = async () => {
    if (!selectedJob || !candidate.email) {
      toast.error("Candidate must have an email to be added to a job");
      return;
    }

    setSubmitting(true);
    try {
      // Create applicant record from CV library candidate
      const applicantId = crypto.randomUUID();
      const now = new Date().toISOString();

      const { error } = await supabase.functions.invoke("update-applicant", {
        body: {
          sessionToken,
          action: "create",
          applicant: {
            id: applicantId,
            job_id: selectedJob.id,
            full_name: candidate.name || "Unknown",
            email: candidate.email,
            phone: candidate.phone || "",
            location: candidate.location || "",
            nationality: candidate.nationality,
            cv_file_name: candidate.resume_file_name,
            cv_storage_path: candidate.resume_file_path,
            cv_file_type: candidate.resume_file_type,
            cv_file_size: candidate.resume_file_size,
            status: "new",
            applied_date: now.split("T")[0],
            screening_answers: {},
            notes: [`Added from CV Library on ${new Date().toLocaleDateString()}`],
          },
        },
      });

      if (error) throw error;
      toast.success(`${candidate.name} added to ${selectedJob.title}`);
      setOpen(false);
      onDone?.();
    } catch (e: any) {
      console.error("Pipeline integration error:", e);
      toast.error("Failed to add candidate to job pipeline");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setOpen(true)}>
        <UserPlus className="w-3.5 h-3.5" />
        Add to Job
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-primary" />
              Add to Job Pipeline
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="rounded-lg bg-secondary/30 p-3">
              <p className="text-sm font-medium">{candidate.name || "Unknown"}</p>
              <p className="text-xs text-muted-foreground">{candidate.email}</p>
            </div>

            <div>
              <p className="text-sm text-muted-foreground mb-2">Select a job to add this candidate to:</p>
              <Select value={selectedJobId} onValueChange={setSelectedJobId}>
                <SelectTrigger><SelectValue placeholder="Select a job..." /></SelectTrigger>
                <SelectContent>
                  {openJobs.map(j => (
                    <SelectItem key={j.id} value={j.id}>
                      <span className="flex items-center gap-2">
                        <Briefcase className="w-3 h-3" />
                        {j.title} — {j.department}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {openJobs.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">No open jobs available</p>
            )}

            {!candidate.email && (
              <Badge variant="destructive" className="text-xs">Email required — please edit candidate first</Badge>
            )}
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleAddToJob} disabled={!selectedJobId || !candidate.email || submitting}>
              {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <ArrowRight className="w-4 h-4 mr-1" />}
              Add to Pipeline
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
