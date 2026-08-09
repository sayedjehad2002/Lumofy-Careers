import { useEffect, useState } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, ShieldCheck, Eye, EyeOff, Mail } from "lucide-react";
import { toast } from "sonner";
import lumofyLogo from "@/assets/lumofy-mark.png";

type CheckResult =
  | { state: "checking" }
  | { state: "unknown" } // check call itself failed (e.g. network) — don't block, just show the form
  | { state: "valid"; email: string; role: string }
  | { state: "invalid"; reason: string };

const INVALID_MESSAGES: Record<string, string> = {
  missing: "This invite link is missing its token. Ask your admin to resend it.",
  not_found: "This invite link isn't valid. Ask your admin to send a new one.",
  expired: "This invite has expired. Ask your admin to send a new one.",
  revoked: "This invite has been revoked. Ask your admin to send a new one.",
  used: "This invite has already been used.",
};

// Invite-accept page: an invitee opens /hr/join?token=… , sets a password, and
// is added to the HR allowlist (server-side) then signed in.
const HrJoin = () => {
  const [params] = useSearchParams();
  const token = params.get("token") || "";
  const navigate = useNavigate();

  const [check, setCheck] = useState<CheckResult>(token ? { state: "checking" } : { state: "invalid", reason: "missing" });

  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Validate the token up front so a dead link fails immediately instead of
  // after the invitee fills out the whole form. Falls back to just showing the
  // form (state "unknown") on ANY failure — including a hung connection that
  // never errors — so a network hiccup can never trap the user on a spinner;
  // the real accept call still validates the token server-side regardless.
  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    const timeout = setTimeout(() => { if (!cancelled) setCheck({ state: "unknown" }); }, 8000);
    (async () => {
      try {
        const { data, error: fnErr } = await supabase.functions.invoke("hr-invite-accept", {
          body: { token, action: "check" },
        });
        if (cancelled) return;
        clearTimeout(timeout);
        if (fnErr || !data) { setCheck({ state: "unknown" }); return; }
        const d = data as { valid: boolean; email?: string; role?: string; reason?: string };
        if (d.valid) setCheck({ state: "valid", email: d.email || "", role: d.role || "admin" });
        else setCheck({ state: "invalid", reason: d.reason || "not_found" });
      } catch {
        if (!cancelled) { clearTimeout(timeout); setCheck({ state: "unknown" }); }
      }
    })();
    return () => { cancelled = true; clearTimeout(timeout); };
  }, [token]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    // Trim before validating/sending — DashboardAuth trims on login, so an
    // untrimmed password set here would silently become impossible to type
    // back in (a leading/trailing space is a common mobile-autocapitalize slip).
    const pwd = password.trim();
    const confirmTrimmed = confirm.trim();
    if (pwd.length < 8) { setError("Please choose a password of at least 8 characters."); return; }
    if (pwd !== confirmTrimmed) { setError("The two passwords don't match."); return; }
    setSubmitting(true);
    try {
      const { data, error: fnErr } = await supabase.functions.invoke("hr-invite-accept", {
        body: { token, password: pwd, fullName: fullName.trim() || undefined },
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
        const { error: signErr } = await supabase.auth.signInWithPassword({ email, password: pwd });
        if (signErr) { toast.success("Account created. Please sign in on the next screen."); navigate("/dashboard"); return; }
      }
      toast.success("Welcome to the team!");
      navigate("/dashboard");
    } catch {
      setError("Something went wrong. Please try again.");
      setSubmitting(false);
    }
  };

  const invalidReason = check.state === "invalid" ? check.reason : null;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex items-center justify-center gap-2">
          <img src={lumofyLogo} alt="Lumofy" className="h-8 w-8 object-contain" />
          <span className="text-xl font-extrabold tracking-tight">Lumofy</span>
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

          {check.state === "checking" ? (
            <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              Checking your invite…
            </div>
          ) : check.state === "invalid" ? (
            <div className="space-y-3">
              <p role="alert" className="text-sm text-destructive">{INVALID_MESSAGES[invalidReason || "not_found"]}</p>
              {invalidReason === "used" && (
                <Button asChild variant="outline" className="h-10 w-full rounded-xl">
                  <Link to="/dashboard">Go to sign in</Link>
                </Button>
              )}
            </div>
          ) : (
            <>
              {check.state === "valid" && (
                <div className="mb-4 flex items-center gap-2 rounded-lg border border-border bg-secondary/40 px-3 py-2 text-xs text-muted-foreground">
                  <Mail className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden="true" />
                  <span className="truncate">
                    Invited as <span className="font-medium capitalize text-foreground">{check.role}</span> · <span className="text-foreground">{check.email}</span>
                  </span>
                </div>
              )}
              <form onSubmit={submit} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="fullName">Full name <span className="text-muted-foreground">(optional)</span></Label>
                  <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Your name" autoComplete="name" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Input
                      id="password" type={showPassword ? "text" : "password"} value={password}
                      onChange={(e) => setPassword(e.target.value)} placeholder="At least 8 characters"
                      autoComplete="new-password" required className="pr-10"
                    />
                    <button
                      type="button" onClick={() => setShowPassword((s) => !s)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      aria-label={showPassword ? "Hide password" : "Show password"} tabIndex={-1}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="confirm">Confirm password</Label>
                  <Input
                    id="confirm" type={showPassword ? "text" : "password"} value={confirm}
                    onChange={(e) => setConfirm(e.target.value)} placeholder="Re-enter your password"
                    autoComplete="new-password" required
                  />
                </div>
                {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
                <Button type="submit" className="h-11 w-full rounded-xl" disabled={submitting}>
                  {submitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Activating…</> : "Activate my access"}
                </Button>
              </form>
            </>
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
