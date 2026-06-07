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

// Pre-filled so the operator never has to remember/mistype the admin address. The
// password — verified server-side against the hash in admin_passwords — is the real
// secret; the email is NOT a client-side gate (it's sent along but the server decides),
// so a blank/edited email can never lock someone out.
const DEFAULT_ADMIN_EMAIL = "jhasan@lumofy.com";

const DashboardAuth = ({ onAuthenticated }: DashboardAuthProps) => {
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  // Uncontrolled fields read via ref at submit time.
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const email = (emailRef.current?.value ?? "").trim() || DEFAULT_ADMIN_EMAIL;
    const password = (passwordRef.current?.value ?? "").trim();

    if (!password) {
      toast.error("Please enter your password.");
      passwordRef.current?.focus();
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("verify-password", {
        body: { email, password },
      });

      // On a non-2xx reply, supabase-js sets `error` to a FunctionsHttpError whose
      // .message is GENERIC (no status number) and leaves `data` null — the real status
      // and JSON body live on error.context (the underlying Response). Read those so a
      // rate-limit (429) isn't mislabeled as a bad password.
      const res = (error as { context?: Response } | null)?.context;
      let serverError = "";
      if (res) {
        try {
          serverError = ((await res.clone().json()) as { error?: string })?.error ?? "";
        } catch {
          /* body wasn't JSON — ignore */
        }
      }
      const tooMany = res?.status === 429 || serverError.toLowerCase().includes("too many");

      if (data?.success && data?.sessionToken) {
        onAuthenticated(data.sessionToken);
        toast.success("Welcome to the HR Dashboard");
      } else if (tooMany) {
        toast.error("Too many attempts — please wait a few minutes and try again.");
      } else {
        toast.error("Incorrect password. Please try again.");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "";
      if (msg.includes("429")) {
        toast.error("Too many attempts. Please wait a few minutes and try again.");
      } else {
        toast.error("Sign-in failed. Please check your connection and try again.");
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
              Sign in with your admin email and password
            </p>
          </div>
          {/* autocomplete="off" + a non-standard field name stop Chrome from injecting a
              stale saved password (e.g. an old/rotated one) behind the user's back. */}
          <form onSubmit={handleSubmit} className="space-y-4" autoComplete="off">
            <div>
              <Label htmlFor="admin-email">Email</Label>
              <div className="mt-1">
                <Input
                  ref={emailRef}
                  id="admin-email"
                  name="lumofy-admin-email"
                  type="email"
                  defaultValue={DEFAULT_ADMIN_EMAIL}
                  placeholder="you@lumofy.com"
                  className="bg-secondary border-border"
                  autoComplete="off"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="admin-access-key">Password</Label>
              <div className="relative mt-1">
                <Input
                  ref={passwordRef}
                  id="admin-access-key"
                  name="lumofy-admin-key"
                  type={showPassword ? "text" : "password"}
                  defaultValue=""
                  placeholder="Enter your password"
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
              {loading ? "Signing in..." : "Access Dashboard"}
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
