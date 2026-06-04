import { useState, useMemo } from "react";
import { Sparkles, ArrowRight, Target, User, Briefcase, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";

interface CVCandidate {
  id: string;
  name: string | null;
  email: string | null;
  skills: string[];
  industries: string[];
  years_experience: string | null;
  suggested_department: string | null;
  manual_department: string | null;
  suggested_job_title: string | null;
  manual_job_title: string | null;
  ai_analysis?: { fitScore: number; fitLevel: string; detectedSkills?: string[] } | null;
}

interface Job {
  id: string;
  title: string;
  department: string;
  requirements: string[];
  status: string;
}

interface Props {
  candidates: CVCandidate[];
  jobs: Job[];
  onViewCandidate: (id: string) => void;
}

function computeMatchScore(candidate: CVCandidate, job: Job): number {
  let score = 0;
  const maxScore = 100;
  const candidateSkills = (candidate.skills || []).map(s => s.toLowerCase());
  const candidateDept = (candidate.manual_department || candidate.suggested_department || "").toLowerCase();
  const jobDept = job.department.toLowerCase();

  // Department match: 30 points
  if (candidateDept === jobDept) score += 30;
  else if (candidateDept.includes(jobDept) || jobDept.includes(candidateDept)) score += 15;

  // Skills overlap with requirements: 50 points
  const reqs = (job.requirements || []).map(r => r.toLowerCase());
  let skillHits = 0;
  for (const req of reqs) {
    if (candidateSkills.some(s => req.includes(s) || s.includes(req))) skillHits++;
  }
  if (reqs.length > 0) score += Math.round((skillHits / reqs.length) * 50);

  // Title similarity: 20 points
  const candidateTitle = (candidate.manual_job_title || candidate.suggested_job_title || "").toLowerCase();
  const jobTitle = job.title.toLowerCase();
  const titleWords = jobTitle.split(/\s+/);
  const titleHits = titleWords.filter(w => candidateTitle.includes(w)).length;
  if (titleWords.length > 0) score += Math.round((titleHits / titleWords.length) * 20);

  return Math.min(score, maxScore);
}

export default function AIJobMatching({ candidates, jobs, onViewCandidate }: Props) {
  const openJobs = jobs.filter(j => j.status === "open");
  const [selectedJobId, setSelectedJobId] = useState<string>(openJobs[0]?.id || "");

  const selectedJob = openJobs.find(j => j.id === selectedJobId);

  const matches = useMemo(() => {
    if (!selectedJob) return [];
    return candidates
      .map(c => ({ candidate: c, score: computeMatchScore(c, selectedJob) }))
      .filter(m => m.score > 10)
      .sort((a, b) => b.score - a.score)
      .slice(0, 20);
  }, [candidates, selectedJob]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 flex-wrap">
        <Sparkles className="w-5 h-5 text-primary" />
        <h3 className="font-semibold text-lg">AI Job Matching</h3>
      </div>

      <div className="rounded-xl bg-card border border-border p-4">
        <p className="text-sm text-muted-foreground mb-3">Select an open job to find matching candidates from your CV library:</p>
        <Select value={selectedJobId} onValueChange={setSelectedJobId}>
          <SelectTrigger className="w-full max-w-md">
            <SelectValue placeholder="Select a job..." />
          </SelectTrigger>
          <SelectContent>
            {openJobs.map(j => (
              <SelectItem key={j.id} value={j.id}>{j.title} — {j.department}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selectedJob && (
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            Found <strong className="text-foreground">{matches.length}</strong> potential matches for <strong className="text-foreground">{selectedJob.title}</strong>
          </p>

          {matches.length === 0 ? (
            <div className="rounded-xl bg-card border border-border p-8 text-center">
              <Target className="w-8 h-8 mx-auto mb-2 text-muted-foreground opacity-40" />
              <p className="text-sm text-muted-foreground">No strong matches found for this job</p>
            </div>
          ) : (
            <div className="space-y-2">
              {matches.map(({ candidate: c, score }) => (
                <div key={c.id} className="rounded-xl bg-card border border-border p-4 hover:border-primary/30 transition-colors cursor-pointer" onClick={() => onViewCandidate(c.id)}>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/15 text-primary flex items-center justify-center text-xs font-bold flex-shrink-0">
                      {score}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm">{c.name || "Unknown"}</span>
                        <Badge variant={score >= 60 ? "default" : "secondary"} className="text-[10px]">
                          {score >= 80 ? "Strong Match" : score >= 50 ? "Good Match" : "Partial Match"}
                        </Badge>
                      </div>
                      <div className="flex gap-3 text-xs text-muted-foreground mt-0.5">
                        {c.email && <span>{c.email}</span>}
                        <span>{c.manual_department || c.suggested_department || "Unclassified"}</span>
                        {c.years_experience && <span>{c.years_experience} yrs</span>}
                      </div>
                    </div>
                    <div className="w-24 flex-shrink-0">
                      <Progress value={score} className="h-1.5" />
                      <p className="text-[10px] text-muted-foreground text-right mt-0.5">{score}% match</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {openJobs.length === 0 && (
        <div className="rounded-xl bg-card border border-border p-8 text-center">
          <Briefcase className="w-8 h-8 mx-auto mb-2 text-muted-foreground opacity-40" />
          <p className="font-medium">No open jobs</p>
          <p className="text-xs text-muted-foreground mt-1">Create a job posting first to use AI matching</p>
        </div>
      )}
    </div>
  );
}
