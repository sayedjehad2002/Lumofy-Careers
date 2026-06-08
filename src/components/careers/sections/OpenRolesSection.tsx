import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Mail } from "lucide-react";
import { motion } from "framer-motion";
import SectionShell from "./SectionShell";
import JobCard from "@/components/careers/JobCard";
import { Button } from "@/components/ui/button";
import { useCareers } from "@/contexts/CareersContext";
import { hiringSteps, recruiter } from "@/data/careers";
import { deptClasses } from "@/lib/deptColor";
import { fadeUp, staggerContainer, revealViewport } from "@/lib/motion";

// Curated live roles → full /jobs, with color-coded department pills and a
// premium empty state, plus "how hiring works" folded in (spec §8 §7).
const OpenRolesSection = () => {
  const { jobs } = useCareers();
  const openJobs = useMemo(() => jobs.filter((j) => j.status === "open"), [jobs]);
  const departments = useMemo(
    () => ["All", ...Array.from(new Set(openJobs.map((j) => j.department)))],
    [openJobs]
  );
  const [dept, setDept] = useState("All");
  const filtered = (dept === "All" ? openJobs : openJobs.filter((j) => j.department === dept)).slice(0, 6);

  return (
    <SectionShell
      id="roles"
      kicker="Open roles"
      title="Find your role"
      sub={
        openJobs.length > 0
          ? `${openJobs.length} open ${openJobs.length === 1 ? "role" : "roles"} across ${departments.length - 1} ${
              departments.length - 1 === 1 ? "team" : "teams"
            }.`
          : "We hire continuously. Don't see a fit? Introduce yourself."
      }
    >
      {openJobs.length > 0 ? (
        <>
          {/* Department pills (semantic, contrast-safe) */}
          <div className="mt-10 flex flex-wrap justify-center gap-2">
            {departments.map((d) => {
              const isAll = d === "All";
              const c = isAll ? null : deptClasses(d);
              const active = d === dept;
              return (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDept(d)}
                  aria-pressed={active}
                  className={`rounded-full border px-4 py-1.5 text-sm font-medium transition-colors ${
                    active
                      ? isAll
                        ? "border-primary/40 bg-primary/10 text-primary"
                        : `${c!.border} ${c!.bgSoft} ${c!.text}`
                      : "border-border text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {d}
                </button>
              );
            })}
          </div>

          {/* Roles */}
          <motion.div
            className="mt-8 grid gap-4 md:grid-cols-2"
            variants={staggerContainer()}
            initial="hidden"
            whileInView="show"
            viewport={revealViewport}
          >
            {filtered.map((job, idx) => (
              <JobCard key={job.id} job={job} index={idx} />
            ))}
          </motion.div>

          <div className="mt-10 text-center">
            <Button asChild size="lg" variant="outline" className="h-12 rounded-xl px-7">
              <Link to={dept === "All" ? "/jobs" : `/jobs?dept=${encodeURIComponent(dept)}`}>
                View all {openJobs.length} roles
                <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
              </Link>
            </Button>
          </div>
        </>
      ) : (
        // Premium empty state (honest — this env has no open jobs)
        <div className="mx-auto mt-10 max-w-xl rounded-2xl border border-border bg-card p-10 text-center light-glow">
          <p className="text-lg font-semibold text-foreground">No open roles right now</p>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            We're always glad to meet exceptional people. Tell us where you'd add the most value and we'll be in
            touch the moment something fits.
          </p>
          <Button asChild className="mt-6 h-11 rounded-xl btn-sheen">
            <a href={`mailto:${recruiter.email}`}>
              <Mail className="mr-2 h-4 w-4" aria-hidden="true" />
              Introduce yourself
            </a>
          </Button>
        </div>
      )}

      {/* How hiring works */}
      <div className="mt-20">
        <h3 className="text-center font-mono text-xs uppercase tracking-[0.2em] text-primary">How hiring works</h3>
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {hiringSteps.map((s) => (
            <div key={s.n} className="rounded-2xl border border-border bg-card/50 p-6">
              <span className="font-mono text-2xl font-extrabold text-primary/40">{s.n}</span>
              <h4 className="mt-2 font-bold text-foreground">{s.title}</h4>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </SectionShell>
  );
};

export default OpenRolesSection;
