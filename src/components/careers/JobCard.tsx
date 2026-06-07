import { Link } from "react-router-dom";
import { MapPin, Clock, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import type { Job } from "@/types/careers";

const ease = [0.22, 1, 0.36, 1] as [number, number, number, number];

interface JobCardProps {
  job: Job;
  index: number;
}

const JobCard = ({ job, index }: JobCardProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.6, delay: Math.min(index, 6) * 0.06, ease }}
    >
      <Link to={`/jobs/${job.id}`} className="group block">
        <div className="flex rounded-2xl border border-border bg-card p-5 light-glow transition-transform duration-300 hover:-translate-y-1 sm:p-6">
          {/* Left accent line */}
          <div className="w-[3px] shrink-0 rounded-full bg-primary/15 transition-colors duration-300 group-hover:bg-primary" />

          <div className="min-w-0 flex-1 pl-4 sm:pl-5">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
              <div className="min-w-0 flex-1">
                <div className="mb-2.5 flex items-center gap-2">
                  <Badge
                    variant="secondary"
                    className="border-0 bg-primary/10 px-3 py-0.5 text-[11px] font-medium text-primary"
                  >
                    {job.department}
                  </Badge>
                  {job.status === "open" && (
                    <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
                      <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                      Open
                    </span>
                  )}
                </div>

                <h3 className="mb-2 truncate text-lg font-bold tracking-tight text-foreground transition-colors duration-200 group-hover:text-primary">
                  {job.title}
                </h3>

                <div className="mb-2.5 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-muted-foreground">
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
                  <p className="mt-2.5 text-xs font-semibold text-primary">
                    {job.salaryRange} {job.salaryCurrency || "BHD"}
                  </p>
                )}
              </div>

              <div className="shrink-0 self-center">
                <span className="inline-flex h-9 items-center rounded-xl border border-input bg-background px-3 text-sm font-medium text-foreground transition-colors duration-300 group-hover:border-primary group-hover:bg-primary group-hover:text-primary-foreground">
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
