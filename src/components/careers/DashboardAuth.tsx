import { useState, useRef } from "react";
import { Lock, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface DashboardAuthProps {
  onAuthenticated: (sessionToken: string) => void;
}

const DashboardAuth = ({ onAuthenticated }: DashboardAuthProps) => {
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  // Uncontrolled field read via ref. This is deliberate: a *controlled* password
  // input desyncs from browser autofill / password managers (Chrome sets the DOM
  // value without firing React's onChange), so the value React submits can differ
  // from what the user sees on screen — which manifests as "I typed the right
  // password but it says invalid every time". Reading inputRef.current.value at
  // submit time guarantees we send exactly what is in the box.
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Trim stray whitespace that autofill/paste commonly appends.
    const typed = (inputRef.current?.value ?? "").trim();
    if (!typed) {
      toast.error("Please enter the admin password.");
      inputRef.current?.focus();
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("verify-password", {
        body: { password: typed },
      });

      const tooMany =
        error?.message?.includes("429") ||
        (typeof (data as { error?: string } | null)?.error === "string" &&
          (data as { error?: string }).error!.toLowerCase().includes("too many"));

      if (data?.success && data?.sessionToken) {
        onAuthenticated(data.sessionToken);
        toast.success("Welcome to the HR Dashboard");
      } else if (tooMany) {
        toast.error("Too many attempts. Please wait ~15 minutes and try again.");
      } else {
        toast.error("Invalid password. Access denied.");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "";
      if (msg.includes("429")) {
        toast.error("Too many attempts. Please wait ~15 minutes and try again.");
      } else {
        toast.error("Verification failed. Please check your connection and try again.");
      }
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="rounded-2xl bg-card border border-border p-8 glow-blue-sm">
          <div className="text-center mb-6">
            <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Lock className="w-7 h-7 text-primary" />
            </div>
            <h1 className="text-xl font-bold">HR Dashboard</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Enter admin password to access
            </p>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="admin-access-key">Password</Label>
              <div className="relative mt-1">
                <Input
                  ref={inputRef}
                  id="admin-access-key"
                  name="admin-access-key"
                  type={showPassword ? "text" : "password"}
                  defaultValue=""
                  placeholder="Enter admin password"
                  className="bg-secondary border-border pr-10"
                  autoComplete="new-password"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Verifying..." : "Access Dashboard"}
            </Button>
          </form>
          <p className="text-[11px] text-muted-foreground text-center mt-4">
            Contact Jhasan@lumofy.com for access
          </p>
        </div>
      </div>
    </div>
  );
};

export default DashboardAuth;
