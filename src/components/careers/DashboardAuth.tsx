import { useState, useRef } from "react";
import { Lock, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

// Real email+password sign-in via Supabase Auth. On success, the session is
// persisted by supabase-js and CareersContext's auth listener flips the dashboard
// into the authenticated view — so this component just triggers the sign-in.
const DashboardAuth = () => {
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const email = (emailRef.current?.value ?? "").trim();
    const password = (passwordRef.current?.value ?? "").trim();

    if (!email || !password) {
      toast.error("Enter your email and password.");
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);

    if (error) {
      const msg = error.message || "";
      if (/invalid login credentials/i.test(msg)) {
        toast.error("Incorrect email or password.");
      } else if (/email not confirmed/i.test(msg)) {
        toast.error("This account isn't confirmed yet — contact your admin.");
      } else {
        toast.error(msg || "Sign-in failed. Please try again.");
      }
      return;
    }
    toast.success("Welcome to the HR Dashboard");
  };

  const handleForgotPassword = async () => {
    const email = (emailRef.current?.value ?? "").trim();
    if (!email) {
      toast.error("Enter your email first, then tap “Forgot password?”.");
      emailRef.current?.focus();
      return;
    }
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/dashboard`,
    });
    if (error) toast.error(error.message || "Couldn't send the reset email.");
    else toast.success("Password reset link sent — check your email.");
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
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="admin-email">Email</Label>
              <div className="mt-1">
                <Input
                  ref={emailRef}
                  id="admin-email"
                  name="email"
                  type="email"
                  placeholder="you@lumofy.com"
                  className="bg-secondary border-border"
                  autoComplete="username"
                  autoFocus
                />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between">
                <Label htmlFor="admin-password">Password</Label>
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  className="text-[11px] text-muted-foreground hover:text-primary transition-colors"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative mt-1">
                <Input
                  ref={passwordRef}
                  id="admin-password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  className="bg-secondary border-border pr-10"
                  autoComplete="current-password"
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
            Contact hr@lumofy.com for access
          </p>
        </div>
      </div>
    </div>
  );
};

export default DashboardAuth;
