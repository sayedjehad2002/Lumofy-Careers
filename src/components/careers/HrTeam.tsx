import { useCallback, useEffect, useMemo, useState } from "react";
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
import {
  Loader2, UserPlus, Copy, Check, Link2, ShieldCheck, Ban, RotateCcw,
  Users, UserCog,
} from "lucide-react";
import { toast } from "sonner";
import {
  activityOf, summarize, byLastActive, lastSignInStamp, DORMANT_DAYS,
  type TeamMember, type ActivityState,
} from "@/lib/teamMetrics";

type Member = TeamMember;
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

/** Activity dot colour. "unknown" stays neutral — an unavailable lookup is not
 *  evidence of anything, so it must never wear the warning tone. */
const ACTIVITY_DOT: Record<ActivityState, string> = {
  today: "bg-[hsl(var(--intel-success))]",
  recent: "bg-[hsl(var(--intel-success))]/50",
  dormant: "bg-[hsl(var(--intel-warning))]",
  never: "bg-muted-foreground/40",
  unknown: "bg-muted-foreground/25",
};

// navigator.clipboard can be undefined (non-secure origin, some embedded
// webviews) — accessing .writeText on it then throws SYNCHRONOUSLY, before any
// promise exists to .catch(). Wrap the whole thing so any failure (sync or
// async) degrades to false instead of escaping to the caller's try/catch.
const copyToClipboard = async (text: string): Promise<boolean> => {
  try { await navigator.clipboard.writeText(text); return true; }
  catch { return false; }
};

const initials = (email: string) => email.slice(0, 2).toUpperCase();

/** Compact number + label, used for the roster's summary strip. */
function Stat({ value, label, tone = "" }: { value: number; label: string; tone?: string }) {
  return (
    <div className="min-w-0">
      <p className={`font-mono text-lg font-semibold tabular-nums leading-none ${tone || "text-foreground"}`}>{value}</p>
      <p className="mt-1 truncate text-[11px] text-muted-foreground">{label}</p>
    </div>
  );
}

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

  // One clock read per render pass, shared by every derivation below, so two
  // rows can never disagree about what "today" means.
  const now = Date.now();
  const summary = useMemo(() => summarize(members, now), [members, now]);

  // Disabled accounts are history, not staff — they sit in their own group below
  // the people who can actually sign in, rather than interleaved by join date.
  const activeMembers = useMemo(
    () => byLastActive(members.filter((m) => m.status === "active"), now),
    [members, now],
  );
  const disabledMembers = useMemo(() => members.filter((m) => m.status !== "active"), [members]);

  const memberRow = (m: Member) => {
    const isYou = !!callerEmail && m.email === callerEmail;
    const isOwner = m.role === "owner";
    const busy = busyId === m.id;
    const disabled = m.status !== "active";
    const act = activityOf(m, now);
    const stamp = lastSignInStamp(m);
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

        {/* Last activity. Sits before the controls so the answer to "should this
            person still have access?" is next to the control that changes it.
            The exact stamp is shown, not just the relative phrase — an access
            review has to be able to cite a date, and "3 days ago" drifts the
            moment you screenshot it.

            Owner-only. The server already withholds the field from anyone else,
            so this check just keeps the column from reserving empty space. */}
        {canManage && !disabled && (
          <span className="w-[150px] shrink-0 text-right">
            <span className="flex items-center justify-end gap-1.5 text-[11px] text-muted-foreground">
              <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${ACTIVITY_DOT[act.state]}`} aria-hidden="true" />
              {act.label}
            </span>
            {stamp && (
              <span className="mt-0.5 block font-mono text-[10px] tabular-nums text-muted-foreground/70">
                {stamp}
              </span>
            )}
          </span>
        )}

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
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-foreground">HR Team</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Everyone who can sign in to the dashboard, and what each of them is allowed to do.
        </p>
      </div>

      {/* Two-column workspace. The roster is the work, so it takes the wide
          column; identity, invites and pending links are reference material and
          sit in a rail that sticks as the roster scrolls. Collapses to one
          column below xl so laptops keep full-width rows rather than two
          cramped halves. */}
      <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-5">
          <Panel
            title={`Users (${summary.total})`}
            icon={Users}
            action={
              !loading && (
                <span className="font-mono text-[11px] tabular-nums text-muted-foreground">
                  {summary.active} active
                </span>
              )
            }
          >
            {loading ? (
              <div className="py-10 text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" /></div>
            ) : (
              <>
                {/* What the roster adds up to, before the rows themselves. */}
                {/* The idle count is derived from sign-in times, which only an
                    owner receives — so it only appears for an owner. */}
                <div className={`grid gap-4 border-b border-border/60 pb-4 ${canManage ? "grid-cols-3 sm:grid-cols-5" : "grid-cols-2 sm:grid-cols-4"}`}>
                  <Stat value={summary.owners} label="Owners" />
                  <Stat value={summary.admins} label="Admins" />
                  <Stat value={summary.viewers} label="Viewers" />
                  {canManage && (
                    <Stat
                      value={summary.dormant.length}
                      label={`Idle ${DORMANT_DAYS}d+`}
                      tone={summary.dormant.length ? "text-[hsl(var(--intel-warning))]" : ""}
                    />
                  )}
                  <Stat value={summary.disabled} label="Disabled" />
                </div>

                <div className="mt-1 divide-y divide-border/60">{activeMembers.map(memberRow)}</div>

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

        </div>

        {/* Reference rail. `self-start` keeps sticky working inside a grid — a
            stretched grid item is already full height and would never stick. */}
        <div className="space-y-5 xl:sticky xl:top-4 xl:self-start">
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
              <form onSubmit={createInvite} className="space-y-3">
                <div className="space-y-1.5">
                  <label htmlFor="invite-email" className="text-xs text-muted-foreground">Email</label>
                  <Input id="invite-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="teammate@company.com" disabled={creating} />
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="invite-role" className="text-xs text-muted-foreground">Role</label>
                  <Select value={role} onValueChange={(v) => setRole(v as "admin" | "viewer")} disabled={creating}>
                    <SelectTrigger id="invite-role" className="w-full"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="viewer">Viewer</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-[11px] text-muted-foreground">{roleInfo(role).blurb}</p>
                </div>
                <Button type="submit" disabled={creating} className="w-full rounded-lg">
                  {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create invite link"}
                </Button>
              </form>
              {lastLink && (
                <div className="mt-3 flex items-center gap-2 rounded-lg border border-border bg-secondary/40 p-2">
                  <Link2 className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                  <code className="min-w-0 flex-1 truncate text-xs text-muted-foreground">{lastLink}</code>
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

          {canManage && invites.length > 0 && (
            <Panel title={`Pending invites (${invites.length})`} icon={Link2}>
              <div className="divide-y divide-border/60">
                {invites.map((inv) => (
                  <div key={inv.id} className="space-y-1.5 py-2.5 first:pt-0 last:pb-0">
                    <div className="flex items-center gap-2">
                      <p className="min-w-0 flex-1 truncate text-sm text-foreground">{inv.email}</p>
                      <Badge variant="secondary" className="border-0 text-[10px]">{roleInfo(inv.role).label}</Badge>
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      {inv.invited_by_email ? `invited by ${inv.invited_by_email} · ` : ""}
                      expires {new Date(inv.expires_at).toLocaleDateString()}
                    </p>
                    <div className="flex gap-1.5">
                      <Button size="sm" variant="outline" onClick={() => regen(inv)} className="h-7 rounded-lg text-xs">New link</Button>
                      <Button size="sm" variant="ghost" onClick={() => revoke(inv.id)} className="h-7 text-xs text-destructive hover:text-destructive">Revoke</Button>
                    </div>
                  </div>
                ))}
              </div>
            </Panel>
          )}

          {/* What the three roles mean, spelled out once. Saves an owner from
              guessing at the dropdown they are about to change someone with. */}
          <Panel title="What the roles mean" icon={UserCog}>
            <dl className="space-y-2.5">
              {(["owner", "admin", "viewer"] as const).map((r) => (
                <div key={r}>
                  <dt className="text-xs font-semibold text-foreground">{ROLE_INFO[r].label}</dt>
                  <dd className="text-[11px] leading-relaxed text-muted-foreground">{ROLE_INFO[r].blurb}</dd>
                </div>
              ))}
            </dl>
          </Panel>
        </div>
      </div>

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
