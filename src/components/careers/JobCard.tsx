import { Link } from "react-router-dom";
import { MapPin, Clock, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { Job } from "@/types/careers";
import { useRef } from "react";

interface JobCardProps {
  job: Job;
  index: number;
}

const JobCard = ({ job, index }: JobCardProps) => {
  const cardRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const card = cardRef.current;
    if (!card) return;
    const rect = card.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    card.style.setProperty("--mouse-x", `${x}%`);
    card.style.setProperty("--mouse-y", `${y}%`);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.06, ease: [0.4, 0, 0.2, 1] }}
    >
      <Link to={`/jobs/${job.id}`} className="block group">
        <div
          ref={cardRef}
          onMouseMove={handleMouseMove}
          className="rounded-2xl glass-card p-6 hover:-translate-y-1 transition-transform duration-300 relative flex"
        >
          {/* Left accent line */}
          <div className="absolute left-0 top-3 bottom-3 w-[3px] rounded-full bg-primary/20 group-hover:bg-primary transition-all duration-300" />

          <div className="flex-1 min-w-0 pl-4 relative z-10">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2.5">
                  <Badge variant="secondary" className="text-[11px] bg-primary/10 text-primary border-0 font-medium px-3 py-0.5 backdrop-blur-sm">
                    {job.department}
                  </Badge>
                  {job.status === "open" && (
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                    </span>
                  )}
                </div>
                <h3 className="text-lg font-semibold text-foreground group-hover:text-primary transition-colors duration-200 mb-2 truncate">
                  {job.title}
                </h3>
                <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mb-2.5">
                  <span className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5" />
                    {job.location}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" />
                    {job.type}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
                  {job.summary}
                </p>
                {job.salaryRange && (
                  <p className="text-xs text-primary/80 mt-2 font-medium tracking-wide">
                    {job.salaryRange} {job.salaryCurrency || "BHD"}
                  </p>
                )}
              </div>
              <div className="flex-shrink-0 self-center">
                <Button
                  size="sm"
                  variant="outline"
                  className="rounded-xl group-hover:bg-primary group-hover:text-primary-foreground group-hover:border-primary transition-all duration-300 group-hover:shadow-lg group-hover:shadow-primary/20"
                >
                  View Details
                  <ArrowRight className="w-3.5 h-3.5 ml-1 transition-transform duration-300 group-hover:translate-x-1" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
};

export default JobCard;
