import { useCallback, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { AIAnalysis, Applicant, Job } from "@/types/careers";

export type BulkAnalysisFailure = { id: string; name: string; reason: string };

export type BulkAnalysisProgress = {
  total: number;
  done: number;
  current: string | null;
};

export type BulkAnalysisResult = {
  scored: number;
  /** Candidates the AI cannot read at all — reported separately from failures. */
  skipped: BulkAnalysisFailure[];
  failed: BulkAnalysisFailure[];
  cancelled: boolean;
};

/** Gemini cannot read Word documents — see the AI notes in CLAUDE.md. */
const isUnreadableCv = (path?: string) => /\.docx?$/i.test(path ?? "");

/**
 * Score a selection of candidates, one at a time.
 *
 * STRICTLY SEQUENTIAL, and that is not a performance oversight: concurrent
 * Gemini calls on this key cause sustained overload 5xx (documented in
 * CLAUDE.md, and relearned in commit c196237 which made the CV Library's bulk
 * re-parse serial for the same reason). Every bulk AI flow in this app processes
 * one candidate at a time.
 *
 * Per-item try/catch so one bad CV cannot abort the run, and a cancel flag
 * checked between items. Work already committed stays committed — the caller
 * reports what landed rather than pretending the whole run failed.
 */
export function useBulkAnalysis(
  sessionToken: string | null,
  jobFor: (jobId: string) => Job | undefined,
  onScored: (applicantId: string, analysis: AIAnalysis) => void,
) {
  const [progress, setProgress] = useState<BulkAnalysisProgress | null>(null);
  const cancelRef = useRef(false);

  const cancel = useCallback(() => { cancelRef.current = true; }, []);

  const run = useCallback(
    async (items: Applicant[]): Promise<BulkAnalysisResult> => {
      cancelRef.current = false;
      const skipped: BulkAnalysisFailure[] = [];
      const failed: BulkAnalysisFailure[] = [];
      let scored = 0;

      // Snapshot up front: the underlying list re-sorts as scores land.
      const queue = [...items];
      setProgress({ total: queue.length, done: 0, current: null });

      for (let i = 0; i < queue.length; i++) {
        if (cancelRef.current) {
          setProgress(null);
          return { scored, skipped, failed, cancelled: true };
        }

        const a = queue[i];
        const name = a.fullName?.trim() || "Unnamed candidate";
        setProgress({ total: queue.length, done: i, current: name });

        const job = jobFor(a.jobId);
        if (!job) {
          skipped.push({ id: a.id, name, reason: "the role this application belongs to no longer exists" });
          continue;
        }
        if (!a.cvStoragePath) {
          skipped.push({ id: a.id, name, reason: "no CV file was stored" });
          continue;
        }
        if (isUnreadableCv(a.cvStoragePath)) {
          skipped.push({ id: a.id, name, reason: "Word CVs cannot be read by the AI" });
          continue;
        }

        try {
          // Same call shape as the single-candidate panel (AIAnalysisPanel).
          const { data, error } = await supabase.functions.invoke("analyze-cv", {
            body: {
              cvStoragePath: a.cvStoragePath,
              cvFileName: a.cvFileName,
              candidateName: a.fullName,
              jobTitle: job.title,
              jobDescription: job.description,
              responsibilities: job.responsibilities,
              requirements: job.requirements,
              screeningAnswers: a.screeningAnswers,
              sessionToken,
              aiScoringWeights: job.aiScoringWeights,
            },
          });
          if (error) throw error;
          if (data?.error) throw new Error(data.error);

          onScored(a.id, { ...data.analysis, analyzedAt: data.analyzedAt } as AIAnalysis);
          scored += 1;
        } catch (e) {
          failed.push({ id: a.id, name, reason: e instanceof Error ? e.message : "analysis failed" });
        }
      }

      setProgress(null);
      return { scored, skipped, failed, cancelled: false };
    },
    [sessionToken, jobFor, onScored],
  );

  return { progress, run, cancel };
}
