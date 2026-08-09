import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Panel } from "./dashboard/primitives";
import { Loader2, UserPlus, Copy, Check, Link2, ShieldCheck, Ban, RotateCcw, Users } from "lucide-react";
import { toast } from "sonner";

interface Member { id: string; email: string; role: string; status: string; created_at: string; }
interface Invite { id: string; email: string; role: string; expires_at: string; created_at: string; invited_by_email?: string | null; }

const siteUrl = () => (import.meta.env.VITE_SITE_URL as string) || window.location.origin;

/** What each role actually grants, kept in step with _shared/validate-session.ts.
 *  Shown in the UI so nobody has to guess what they are handing out. */
const ROLE_INFO: Record<string, { label: string; blurb: string }> = {
  owner: { label: "Owner", blurb: "Full access, and can invite people or change their role." },
  admin: { label: "Admin", blurb: "Full access to jobs and candidates." },
  viewer: { label: "Viewer", blurb: "Can read everything and run AI analysis, but cannot change or delete anything." },
};
const roleInfo = (role: string) => ROLE_INFO[role] ?? { label: role, blurb: "" };

// navigator.clipboard can be undefined (non-secure origin, some embedded
// webviews) — accessing .writeText on it then throws SYNCHRONOUSLY, before any
// promise exists to .catch(). Wrap the whole thing so any failure (sync or
// async) degrades to false instead of escaping to the caller's try/catch.
const copyToClipboard = async (text: string): Promise<boolean> => {
  try { await navigator.clipboard.writeText(text); return true; }
  catch { return false; }
};

const initials = (email: string) => email.slice(0, 2).toUpperCase();

const HrTeam = ({ sessionToken }: { sessionToken: string }) => {
  const [members, setMembers] = useState<Member[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  // Whether THIS caller may change team access, and who they are — both decided
  // server-side from hr_users.role. Never derived on the client, so hiding a
  // control is only ever a UI courtesy on top of the real check.
  const [canManage, setCanManage] = useState(false);
  const [callerEmail, setCallerEmail] = useState("");
  const [callerRole, setCallerRole] = useState("");
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"admin" | "viewer">("admin");
  const [creating, setCreating] = useState(false);
  const [lastLink, setLastLink] = useState("");
  const [copied, setCopied] = useState(false);
  const [busyId, setBusyId] = useState("");
  const [toDisable, setToDisable] = useState<Member | null>(null);

  const call = useCallback(async (body: Record<string, unknown>) => {
    const { data, error } = await supabase.functions.invoke("hr-team", { body: { sessionToken, ...body } });
    const payload = data as { error?: string } | null;
    if (error || payload?.error) {
      let msg = payload?.error || "";
      if (!msg && error) {
        try { msg = ((await (error as { context?: { json?: () => Promise<{ error?: string }> } }).context?.json?.()) || {}).error || ""; } catch { /* ignore */ }
      }
      throw new Error(msg || "Request failed");
    }
    return data as Record<string, unknown>;
  }, [sessionToken]);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const data = await call({ action: "list" });
      setMembers((data.members as Member[]) || []);
      setInvites((data.invites as Invite[]) || []);
      setCanManage((data.canManage as boolean) ?? false);
      setCallerEmail((data.callerEmail as string) || "");
      setCallerRole((data.callerRole as string) || "");
    } catch (e) { toast.error((e as Error).message); }
    finally { setLoading(false); }
  }, [call]);

  useEffect(() => { refresh(); }, [refresh]);

  const makeLink = (token: string) => `${siteUrl()}/hr/join?token=${token}`;

  const createInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setCreating(true); setLastLink("");
    try {
      const data = await call({ action: "invite", email: email.trim(), role });
      const link = makeLink(data.token as string);
      setLastLink(link);
      setEmail("");
      const copiedOk = await copyToClipboard(link);
      toast.success(copiedOk ? "Invite link created and copied. Send it to your teammate." : "Invite link created. Copy it below to send to your teammate.");
      refresh();
    } catch (e) { toast.error((e as Error).message); }
    finally { setCreating(false); }
  };

  const regen = async (inv: Invite) => {
    try {
      const data = await call({ action: "invite", email: inv.email, role: inv.role });
      const link = makeLink(data.token as string);
      setLastLink(link);
      const copiedOk = await copyToClipboard(link);
      toast.success(copiedOk ? "Fresh link created + copied." : "Fresh link created. Copy it below.");
      refresh();
    } catch (e) { toast.error((e as Error).message); }
  };

  const copyLast = async () => {
    if (!lastLink) return;
    const ok = await copyToClipboard(lastLink);
    if (ok) { setCopied(true); setTimeout(() => setCopied(false), 1500); toast.success("Copied"); }
    else toast.error("Couldn't copy. Select the link manually.");
  };

  const revoke = async (id: string) => {
    try { await call({ action: "revoke-invite", id }); toast.success("Invite revoked"); refresh(); }
    catch (e) { toast.error((e as Error).message); }
  };

  const setStatus = async (m: Member, status: string) => {
    setBusyId(m.id);
    try { await call({ action: "set-status", id: m.id, status }); toast.success(status === "active" ? `${m.email} can sign in again` : `${m.email} can no longer sign in`); refresh(); }
    catch (e) { toast.error((e as Error).message); }
    finally { setBusyId(""); }
  };

  const changeRole = async (m: Member, next: string) => {
    if (next === m.role) return;
    setBusyId(m.id);
    try { await call({ action: "set-role", id: m.id, role: next }); toast.success(`${m.email} is now ${roleInfo(next).label.toLowerCase()}`); refresh(); }
    catch (e) { toast.error((e as Error).message); }
    finally { setBusyId(""); }
  };

  const you = roleInfo(callerRole);
  // Disabled accounts are history, not staff — they sit in their own group below
  // the people who can actually sign in, rather than interleaved by join date.
  const activeMembers = members.filter((m) => m.status === "active");
  const disabledMembers = members.filter((m) => m.status !== "active");

  const memberRow = (m: Member) => {
    const isYou = !!callerEmail && m.email === callerEmail;
    const isOwner = m.role === "owner";
    const busy = busyId === m.id;
    const disabled = m.status !== "active";
    return (
      <div key={m.id} className="flex flex-wrap items-center gap-x-3 gap-y-2 py-2.5">
        <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold ${disabled ? "bg-muted text-muted-foreground" : "bg-primary/10 text-primary"}`}>
          {initials(m.email)}
        </div>
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5 truncate text-sm">
            <span className={`truncate ${disabled ? "text-muted-foreground line-through decoration-muted-foreground/40" : "text-foreground"}`}>{m.email}</span>
            {isYou && <span className="shrink-0 rounded bg-secondary px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">You</span>}
          </p>
          <p className="truncate text-[11px] text-muted-foreground">
            {disabled ? "Cannot sign in." : roleInfo(m.role).blurb}
          </p>
        </div>

        {/* Owners can retune a member between Admin and Viewer in place. Owner
            rows stay a static badge — an owner is changed in the database on
            purpose, not from a dropdown. */}
        {canManage && !isOwner && !isYou && !disabled ? (
          <Select value={m.role} onValueChange={(v) => changeRole(m, v)} disabled={busy}>
            <SelectTrigger className="h-7 w-[104px] text-xs" aria-label={`Role for ${m.email}`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="admin">Admin</SelectItem>
              <SelectItem value="viewer">Viewer</SelectItem>
            </SelectContent>
          </Select>
        ) : (
          <Badge variant="secondary" className="border-0 text-[10px]">{roleInfo(m.role).label}</Badge>
        )}

        {canManage && !isOwner && !isYou && (
          busy ? (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          ) : disabled ? (
            <Button size="sm" variant="outline" onClick={() => setStatus(m, "active")} className="h-7 rounded-lg text-xs">
              <RotateCcw className="mr-1 h-3.5 w-3.5" aria-hidden="true" />Enable
            </Button>
          ) : (
            <Button size="sm" variant="ghost" onClick={() => setToDisable(m)} className="h-7 text-xs text-destructive hover:text-destructive">
              <Ban className="mr-1 h-3.5 w-3.5" aria-hidden="true" />Disable
            </Button>
          )
        )}
      </div>
    );
  };

  return (
    <div className="max-w-3xl space-y-5">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-foreground">HR Team</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Everyone who can sign in to the dashboard, and what each of them is allowed to do.
        </p>
      </div>

      {/* Who you are + what your role grants. Answers "am I allowed to do this?"
          before the person goes looking for a control that isn't there. */}
      {!loading && callerEmail && (
        <Panel title="Your access" icon={ShieldCheck}>
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-xs font-bold text-primary">
              {initials(callerEmail)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-foreground">{callerEmail}</p>
              <p className="text-xs text-muted-foreground">{you.blurb}</p>
            </div>
            <Badge variant="secondary" className="border-0 text-[10px]">{you.label}</Badge>
          </div>
          {!canManage && (
            <p className="mt-3 border-t border-border/60 pt-3 text-[11px] text-muted-foreground">
              Inviting people, changing roles and disabling accounts are owner-only, which is why those
              controls aren't shown here.
            </p>
          )}
        </Panel>
      )}

      {canManage && (
        <Panel title="Invite a teammate" icon={UserPlus}>
          <form onSubmit={createInvite} className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1 space-y-1.5">
              <label htmlFor="invite-email" className="text-xs text-muted-foreground">Email</label>
              <Input id="invite-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="teammate@company.com" disabled={creating} />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="invite-role" className="text-xs text-muted-foreground">Role</label>
              <Select value={role} onValueChange={(v) => setRole(v as "admin" | "viewer")} disabled={creating}>
                <SelectTrigger id="invite-role" className="w-32"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="viewer">Viewer</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" disabled={creating} className="rounded-lg">
              {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create invite link"}
            </Button>
          </form>
          <p className="mt-2 text-[11px] text-muted-foreground">{roleInfo(role).blurb}</p>
          {lastLink && (
            <div className="mt-3 flex items-center gap-2 rounded-lg border border-border bg-secondary/40 p-2">
              <Link2 className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
              <code className="flex-1 truncate text-xs text-muted-foreground">{lastLink}</code>
              <Button size="sm" variant="outline" onClick={copyLast} aria-label={copied ? "Copied" : "Copy invite link"} className="shrink-0 rounded-lg">
                {copied ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : <Copy className="h-3.5 w-3.5" aria-hidden="true" />}
              </Button>
            </div>
          )}
          <p className="mt-2 text-[11px] text-muted-foreground">
            Send this link to your teammate. It expires in 7 days, works once, and only the invited email can use it.
          </p>
        </Panel>
      )}

      <Panel title={`Team members (${activeMembers.length})`} icon={Users}>
        {loading ? (
          <div className="py-6 text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : (
          <>
            <div className="divide-y divide-border/60">{activeMembers.map(memberRow)}</div>

            {disabledMembers.length > 0 && (
              <div className="mt-4 border-t border-border pt-3">
                <div className="mb-1 flex items-center gap-2">
                  <Ban className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
                  <h3 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Disabled ({disabledMembers.length})
                  </h3>
                </div>
                <p className="mb-1 text-[11px] text-muted-foreground">
                  These accounts still exist but cannot sign in.
                  {canManage ? " Enable one to restore their access." : ""}
                </p>
                <div className="divide-y divide-border/60">{disabledMembers.map(memberRow)}</div>
              </div>
            )}
          </>
        )}
      </Panel>

      {canManage && invites.length > 0 && (
        <Panel title={`Pending invites (${invites.length})`} icon={Link2}>
          <div className="divide-y divide-border/60">
            {invites.map((inv) => (
              <div key={inv.id} className="flex flex-wrap items-center gap-x-3 gap-y-2 py-2.5">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-foreground">{inv.email}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {inv.invited_by_email ? `invited by ${inv.invited_by_email} · ` : ""}
                    expires {new Date(inv.expires_at).toLocaleDateString()}
                  </p>
                </div>
                <Badge variant="secondary" className="border-0 text-[10px]">{roleInfo(inv.role).label}</Badge>
                <Button size="sm" variant="outline" onClick={() => regen(inv)} className="h-7 rounded-lg text-xs">New link</Button>
                <Button size="sm" variant="ghost" onClick={() => revoke(inv.id)} className="h-7 text-xs text-destructive hover:text-destructive">Revoke</Button>
              </div>
            ))}
          </div>
        </Panel>
      )}

      {/* Removing someone's access is worth one deliberate beat. */}
      <AlertDialog open={!!toDisable} onOpenChange={(open) => !open && setToDisable(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Disable {toDisable?.email}?</AlertDialogTitle>
            <AlertDialogDescription>
              They will be signed out of the HR dashboard and won't be able to sign back in.
              Their account is kept, so you can re-enable them at any time.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => { const m = toDisable; setToDisable(null); if (m) setStatus(m, "disabled"); }}
            >
              Disable access
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default HrTeam;
