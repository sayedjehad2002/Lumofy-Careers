import { Link, useLocation } from "react-router-dom";
import { MapPin, Clock, ArrowRight, Bookmark, BookmarkCheck } from "lucide-react";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { useSavedJobs } from "@/hooks/use-saved-jobs";
import { deptClasses } from "@/lib/deptColor";
import { brandEase, durations } from "@/lib/motion";
import type { Job } from "@/types/careers";

interface JobCardProps {
  job: Job;
  index: number;
}

const JobCard = ({ job, index }: JobCardProps) => {
  const { isSaved, toggle } = useSavedJobs();
  const saved = isSaved(job.id);
  const c = deptClasses(job.department); // semantic hue per department
  // Carry the list's active filters so JobDetails' back link can restore them.
  const { search } = useLocation();

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: durations.slow, delay: Math.min(index, 6) * 0.06, ease: brandEase }}
    >
      <Link to={`/jobs/${job.id}`} state={{ search }} className="group block">
        <div className="lx-card relative flex p-5 transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-[0_2px_4px_hsl(228_45%_8%/0.05),0_24px_48px_-12px_hsl(228_45%_8%/0.18)] sm:p-6">
          {/* Save / bookmark toggle (does not navigate) */}
          <button
            type="button"
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggle(job.id); }}
            aria-label={saved ? `Remove ${job.title} from saved jobs` : `Save ${job.title}`}
            aria-pressed={saved}
            className="absolute right-2.5 top-2.5 z-10 flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            {saved
              ? <BookmarkCheck className="h-4 w-4 text-primary" aria-hidden="true" />
              : <Bookmark className="h-4 w-4" aria-hidden="true" />}
          </button>

          <div className="min-w-0 flex-1">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
              <div className="min-w-0 flex-1">
                <div className="mb-2.5 flex items-center gap-2">
                  <Badge
                    variant="secondary"
                    className={`rounded-full border-0 ${c.bgSoft} px-3 py-0.5 font-display text-[11px] font-bold uppercase tracking-[0.08em] ${c.textReadable}`}
                  >
                    {job.department}
                  </Badge>
                  {job.status === "open" && (
                    <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
                      <span className={`h-1.5 w-1.5 rounded-full ${c.bg}`} />
                      Open
                    </span>
                  )}
                </div>

                <h3 className="mb-2 truncate text-lg font-bold tracking-tight text-foreground transition-colors duration-200 group-hover:text-primary">
                  {job.title}
                </h3>

                <div className="mb-2.5 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[12px] font-medium text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
                    {job.location}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                    {job.type}
                  </span>
                </div>

                <p className="line-clamp-2 text-sm leading-relaxed text-muted-foreground">
                  {job.summary}
                </p>

                {job.salaryRange && (
                  <p className="mt-2.5 text-xs font-semibold text-primary-readable">
                    {job.salaryRange} {job.salaryCurrency || "BHD"}
                  </p>
                )}
              </div>

              <div className="shrink-0 self-center">
                <span className="inline-flex h-10 items-center rounded-full border border-input bg-background px-4 text-sm font-semibold text-foreground transition-colors duration-300 group-hover:border-primary group-hover:bg-primary group-hover:text-primary-foreground">
                  View details
                  <ArrowRight className="ml-1.5 h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-0.5" aria-hidden="true" />
                </span>
              </div>
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
};

export default JobCard;
