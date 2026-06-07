import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Panel } from "./dashboard/primitives";
import { Loader2, UserPlus, Copy, Check, Link2, ShieldCheck, Ban, RotateCcw } from "lucide-react";
import { toast } from "sonner";

interface Member { id: string; email: string; role: string; status: string; created_at: string; }
interface Invite { id: string; email: string; role: string; expires_at: string; created_at: string; }

const siteUrl = () => (import.meta.env.VITE_SITE_URL as string) || window.location.origin;

const HrTeam = ({ sessionToken }: { sessionToken: string }) => {
  const [members, setMembers] = useState<Member[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [callerRole, setCallerRole] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"admin" | "viewer">("admin");
  const [creating, setCreating] = useState(false);
  const [lastLink, setLastLink] = useState("");
  const [copied, setCopied] = useState(false);

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
      setCallerRole((data.callerRole as string) || "");
    } catch (e) { toast.error((e as Error).message); }
    finally { setLoading(false); }
  }, [call]);

  useEffect(() => { refresh(); }, [refresh]);

  const canManage = callerRole === "owner" || callerRole === "admin";

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
      try { await navigator.clipboard.writeText(link); } catch { /* ignore */ }
      toast.success("Invite link created + copied — send it to your teammate.");
      refresh();
    } catch (e) { toast.error((e as Error).message); }
    finally { setCreating(false); }
  };

  const regen = async (inv: Invite) => {
    try {
      const data = await call({ action: "invite", email: inv.email, role: inv.role });
      const link = makeLink(data.token as string);
      setLastLink(link);
      try { await navigator.clipboard.writeText(link); } catch { /* ignore */ }
      toast.success("Fresh link created + copied.");
      refresh();
    } catch (e) { toast.error((e as Error).message); }
  };

  const copyLast = async () => {
    if (!lastLink) return;
    try { await navigator.clipboard.writeText(lastLink); setCopied(true); setTimeout(() => setCopied(false), 1500); toast.success("Copied"); }
    catch { toast.error("Couldn't copy — select the link manually."); }
  };

  const revoke = async (id: string) => {
    try { await call({ action: "revoke-invite", id }); toast.success("Invite revoked"); refresh(); }
    catch (e) { toast.error((e as Error).message); }
  };

  const setStatus = async (id: string, status: string) => {
    try { await call({ action: "set-status", id, status }); toast.success(status === "active" ? "Member re-enabled" : "Member disabled"); refresh(); }
    catch (e) { toast.error((e as Error).message); }
  };

  return (
    <div className="max-w-3xl space-y-5">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-foreground">HR Team</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">Invite teammates and control who can access the dashboard.</p>
      </div>

      {canManage && (
        <Panel title="Invite a teammate" icon={UserPlus}>
          <form onSubmit={createInvite} className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1 space-y-1.5">
              <label className="text-xs text-muted-foreground">Email</label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="teammate@company.com" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground">Role</label>
              <Select value={role} onValueChange={(v) => setRole(v as "admin" | "viewer")}>
                <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
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
          {lastLink && (
            <div className="mt-3 flex items-center gap-2 rounded-lg border border-border bg-secondary/40 p-2">
              <Link2 className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
              <code className="flex-1 truncate text-xs text-muted-foreground">{lastLink}</code>
              <Button size="sm" variant="outline" onClick={copyLast} className="shrink-0 rounded-lg">
                {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              </Button>
            </div>
          )}
          <p className="mt-2 text-[11px] text-muted-foreground">Send this link to your teammate — it expires in 7 days and can be used once.</p>
        </Panel>
      )}

      <Panel title={`Team members (${members.length})`} icon={ShieldCheck}>
        {loading ? (
          <div className="py-6 text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : (
          <div className="divide-y divide-border/60">
            {members.map((m) => (
              <div key={m.id} className="flex items-center gap-3 py-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-xs font-bold text-primary">{m.email.slice(0, 2).toUpperCase()}</div>
                <p className="min-w-0 flex-1 truncate text-sm text-foreground">{m.email}</p>
                <Badge variant="secondary" className="border-0 text-[10px] capitalize">{m.role}</Badge>
                <Badge variant="secondary" className={`border-0 text-[10px] capitalize ${m.status === "active" ? "bg-emerald-500/15 text-emerald-400" : "bg-muted text-muted-foreground"}`}>{m.status}</Badge>
                {canManage && m.role !== "owner" && (
                  m.status === "active"
                    ? <Button size="sm" variant="ghost" onClick={() => setStatus(m.id, "disabled")} className="h-7 text-xs text-destructive hover:text-destructive"><Ban className="mr-1 h-3.5 w-3.5" />Disable</Button>
                    : <Button size="sm" variant="ghost" onClick={() => setStatus(m.id, "active")} className="h-7 text-xs"><RotateCcw className="mr-1 h-3.5 w-3.5" />Enable</Button>
                )}
              </div>
            ))}
          </div>
        )}
      </Panel>

      {canManage && invites.length > 0 && (
        <Panel title={`Pending invites (${invites.length})`} icon={Link2}>
          <div className="divide-y divide-border/60">
            {invites.map((inv) => (
              <div key={inv.id} className="flex items-center gap-3 py-2.5">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-foreground">{inv.email}</p>
                  <p className="text-[11px] text-muted-foreground">expires {new Date(inv.expires_at).toLocaleDateString()}</p>
                </div>
                <Badge variant="secondary" className="border-0 text-[10px] capitalize">{inv.role}</Badge>
                <Button size="sm" variant="outline" onClick={() => regen(inv)} className="h-7 rounded-lg text-xs">New link</Button>
                <Button size="sm" variant="ghost" onClick={() => revoke(inv.id)} className="h-7 text-xs text-destructive hover:text-destructive">Revoke</Button>
              </div>
            ))}
          </div>
        </Panel>
      )}
    </div>
  );
};

export default HrTeam;
