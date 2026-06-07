import { useState } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import lumofyLogo from "@/assets/lumofy-mark.png";

// Invite-accept page: an invitee opens /hr/join?token=… , sets a password, and
// is added to the HR allowlist (server-side) then signed in.
const HrJoin = () => {
  const [params] = useSearchParams();
  const token = params.get("token") || "";
  const navigate = useNavigate();

  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (password.length < 8) { setError("Please choose a password of at least 8 characters."); return; }
    if (password !== confirm) { setError("The two passwords don't match."); return; }
    setSubmitting(true);
    try {
      const { data, error: fnErr } = await supabase.functions.invoke("hr-invite-accept", {
        body: { token, password, fullName: fullName.trim() || undefined },
      });
      let serverErr = (data as { error?: string })?.error || "";
      if (!serverErr && fnErr) {
        try { serverErr = ((await (fnErr as { context?: { json?: () => Promise<{ error?: string }> } }).context?.json?.()) || {}).error || ""; } catch { /* ignore */ }
      }
      if (serverErr || fnErr) {
        setError(serverErr || "Could not accept this invite. The link may be invalid or expired.");
        setSubmitting(false);
        return;
      }
      const email = (data as { email?: string })?.email;
      if (email) {
        const { error: signErr } = await supabase.auth.signInWithPassword({ email, password });
        if (signErr) { toast.success("Account created — please sign in."); navigate("/dashboard"); return; }
      }
      toast.success("Welcome to the team!");
      navigate("/dashboard");
    } catch {
      setError("Something went wrong. Please try again.");
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex items-center justify-center gap-2">
          <img src={lumofyLogo} alt="Lumofy" className="h-8 w-8 object-contain" />
          <span className="font-['Urbanist'] text-xl font-extrabold tracking-tight">Lumofy</span>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 sm:p-8">
          <div className="mb-5 flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
              <ShieldCheck className="h-5 w-5 text-primary" aria-hidden="true" />
            </div>
            <div>
              <h1 className="text-lg font-semibold tracking-tight">Join the HR team</h1>
              <p className="text-xs text-muted-foreground">Set a password to activate your access.</p>
            </div>
          </div>

          {!token ? (
            <p className="text-sm text-destructive">This invite link is missing its token. Ask your admin to resend it.</p>
          ) : (
            <form onSubmit={submit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="fullName">Full name <span className="text-muted-foreground">(optional)</span></Label>
                <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Your name" autoComplete="name" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password">Password</Label>
                <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 8 characters" autoComplete="new-password" required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="confirm">Confirm password</Label>
                <Input id="confirm" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="Re-enter your password" autoComplete="new-password" required />
              </div>
              {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
              <Button type="submit" className="h-11 w-full rounded-xl" disabled={submitting}>
                {submitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Activating…</> : "Activate my access"}
              </Button>
            </form>
          )}
        </div>

        <p className="mt-4 text-center text-xs text-muted-foreground">
          <Link to="/" className="hover:text-foreground">← Back to careers site</Link>
        </p>
      </div>
    </div>
  );
};

export default HrJoin;
