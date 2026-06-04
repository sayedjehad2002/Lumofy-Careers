import { useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { ArrowLeft, MapPin, Clock, Calendar, Share2, Copy, Mail, CheckCircle2, Download, FileText, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useCareers } from "@/contexts/CareersContext";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/careers/Navbar";
import { toast } from "sonner";

const JobDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { getJobById, loading } = useCareers();
  const job = getJobById(id || "");
  const [downloading, setDownloading] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="pt-24 text-center text-muted-foreground">
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="pt-24 text-center text-muted-foreground">
          <p>Job not found.</p>
          <Link to="/jobs" className="text-primary hover:underline mt-2 inline-block">
            Back to all positions
          </Link>
        </div>
      </div>
    );
  }

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success("Link copied to clipboard!");
  };

  const handleDownloadJd = async () => {
    if (!job.jdFilePath) return;
    setDownloading(true);
    try {
      const { data, error } = await supabase.functions.invoke("get-jd-url", {
        body: { jobId: job.id },
      });
      if (error || data?.error) throw new Error(data?.error || "Download failed");
      
      // Open signed URL to trigger download
      window.open(data.url, "_blank");
    } catch (e: any) {
      toast.error(e.message || "Failed to download JD");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-24 pb-20 px-4">
        <div className="max-w-6xl mx-auto">
          <Link
            to="/jobs"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to all positions
          </Link>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Header card */}
              <motion.div
                className="rounded-xl bg-card border border-border p-6 glow-blue-sm"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
              >
                <Badge variant="secondary" className="text-xs bg-primary/10 text-primary border-0 mb-3">
                  {job.department}
                </Badge>
                <h1 className="text-2xl sm:text-3xl font-bold mb-4">{job.title}</h1>
                <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mb-4">
                  <span className="flex items-center gap-1.5">
                    <MapPin className="w-4 h-4" /> {job.location}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-4 h-4" /> {job.type}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Calendar className="w-4 h-4" /> Posted {new Date(job.postedDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </span>
                </div>
                {job.salaryRange && (
                  <p className="text-sm font-medium text-primary mb-4">
                    Salary: {job.salaryRange} {job.salaryCurrency || "BHD"}
                  </p>
                )}
                <div className="flex flex-wrap gap-3">
                  <Button
                    size="lg"
                    onClick={() => navigate(`/jobs/${job.id}/apply`)}
                  >
                    Apply for This Position
                  </Button>
                  {job.jdFilePath && (
                    <Button
                      size="lg"
                      variant="outline"
                      onClick={handleDownloadJd}
                      disabled={downloading}
                    >
                      {downloading ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Download className="w-4 h-4 mr-2" />
                      )}
                      Download Job Description
                    </Button>
                  )}
                </div>
              </motion.div>

              {/* About the Role */}
              {job.description && (
                <motion.div
                  className="rounded-xl bg-card border border-border p-6"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.1 }}
                >
                  <h2 className="text-lg font-semibold mb-3">About the Role</h2>
                  <p className="text-muted-foreground leading-relaxed whitespace-pre-line">{job.description}</p>
                </motion.div>
              )}

              {/* Responsibilities */}
              {job.responsibilities.length > 0 && job.responsibilities.some(r => r.trim()) && (
                <motion.div
                  className="rounded-xl bg-card border border-border p-6"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.15 }}
                >
                  <h2 className="text-lg font-semibold mb-3">Key Responsibilities</h2>
                  <ul className="space-y-2">
                    {job.responsibilities.filter(r => r.trim()).map((r, i) => (
                      <li key={i} className="flex items-start gap-2 text-muted-foreground">
                        <CheckCircle2 className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                        {r}
                      </li>
                    ))}
                  </ul>
                </motion.div>
              )}

              {/* Requirements */}
              {job.requirements.length > 0 && job.requirements.some(r => r.trim()) && (
                <motion.div
                  className="rounded-xl bg-card border border-border p-6"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.2 }}
                >
                  <h2 className="text-lg font-semibold mb-3">Requirements</h2>
                  <ul className="space-y-2">
                    {job.requirements.filter(r => r.trim()).map((r, i) => (
                      <li key={i} className="flex items-start gap-2 text-muted-foreground">
                        <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
                        {r}
                      </li>
                    ))}
                  </ul>
                </motion.div>
              )}

              {/* Screening Questions Preview */}
              {job.screeningQuestions.length > 0 && (
                <motion.div
                  className="rounded-xl bg-card border border-border p-6"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.25 }}
                >
                  <h2 className="text-lg font-semibold mb-3">Screening Questions</h2>
                  <p className="text-sm text-muted-foreground mb-4">
                    You'll be asked these questions when you apply:
                  </p>
                  <ul className="space-y-2">
                    {job.screeningQuestions.map((q) => (
                      <li key={q.id} className="text-sm text-muted-foreground flex items-start gap-2">
                        <span className="text-primary">•</span>
                        {q.question}
                        {q.required && <span className="text-destructive text-xs">*</span>}
                      </li>
                    ))}
                  </ul>
                </motion.div>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              <motion.div
                className="rounded-xl bg-card border border-border p-5 sticky top-24"
                initial={{ opacity: 0, x: 15 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4, delay: 0.2 }}
              >
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <Share2 className="w-4 h-4 text-primary" />
                  Share This Job
                </h3>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full mb-4"
                  onClick={handleCopyLink}
                >
                  <Copy className="w-3.5 h-3.5 mr-2" />
                  Copy Link
                </Button>

                {job.jdFilePath && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full mb-4"
                    onClick={handleDownloadJd}
                    disabled={downloading}
                  >
                    {downloading ? (
                      <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />
                    ) : (
                      <FileText className="w-3.5 h-3.5 mr-2" />
                    )}
                    Download JD
                  </Button>
                )}

                <div className="border-t border-border pt-4 mt-4">
                  <h3 className="font-semibold mb-2">Questions?</h3>
                  <p className="text-xs text-muted-foreground mb-1">Talent Acquisition & Onboarding Specialist</p>
                  <p className="text-xs text-primary mb-3">Jhasan@lumofy.com</p>
                  <Button variant="outline" size="sm" className="w-full" asChild>
                    <a href="mailto:Jhasan@lumofy.com">
                      <Mail className="w-3.5 h-3.5 mr-2" />
                      Contact HR
                    </a>
                  </Button>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default JobDetails;
