import { Link2, Copy, ExternalLink, Linkedin } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";

// Absolute, copy-able public apply link for a job. Uses the configured site URL
// (so a link copied from a preview/localhost still points at the real domain),
// falling back to the current origin.
export const siteUrl = () => (import.meta.env.VITE_SITE_URL as string) || window.location.origin;
export const jobApplyUrl = (jobId: string) => `${siteUrl()}/jobs/${jobId}`;

export async function copyJobLink(jobId: string) {
  const url = jobApplyUrl(jobId);
  try { await navigator.clipboard.writeText(url); toast.success("Apply link copied. Paste it into LinkedIn."); }
  catch { toast.error("Couldn't copy automatically. Use the dropdown to open the link."); }
}

const ShareJobLink = ({ jobId, jobTitle }: { jobId: string; jobTitle?: string }) => {
  const url = jobApplyUrl(jobId);
  const shareLinkedIn = () =>
    window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`, "_blank", "noopener,noreferrer");
  const openPage = () => window.open(url, "_blank", "noopener,noreferrer");

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          size="sm"
          variant="ghost"
          className="h-8 w-8 p-0 rounded-lg"
          aria-label={`Share / copy apply link for ${jobTitle || "this job"}`}
          title="Share / copy apply link"
        >
          <Link2 className="w-3.5 h-3.5" aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem onClick={() => copyJobLink(jobId)}>
          <Copy className="mr-2 h-4 w-4" aria-hidden="true" /> Copy apply link
        </DropdownMenuItem>
        <DropdownMenuItem onClick={shareLinkedIn}>
          <Linkedin className="mr-2 h-4 w-4" aria-hidden="true" /> Share to LinkedIn
        </DropdownMenuItem>
        <DropdownMenuItem onClick={openPage}>
          <ExternalLink className="mr-2 h-4 w-4" aria-hidden="true" /> Open page
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default ShareJobLink;
