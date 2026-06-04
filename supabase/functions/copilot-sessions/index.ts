import { getCorsHeaders } from "../_shared/cors.ts";
import { getClientIp, isRateLimited, rateLimitResponse } from "../_shared/rate-limit.ts";
import { validateSession } from "../_shared/validate-session.ts";

Deno.serve(async (req) => {
  const cors = getCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  try {
    // Rate limit
    const ip = getClientIp(req);
    const rl = isRateLimited(`copilot-sessions:${ip}`, { maxRequests: 60, windowMs: 60_000 });
    if (rl.limited) return rateLimitResponse(cors, rl.retryAfterMs);

    const body = await req.json();
    const { sessionToken, action } = body;

    const auth = await validateSession(sessionToken, cors);
    if (!auth.valid) return auth.response;
    const sb = auth.supabase;

    // LIST sessions
    if (action === "list") {
      const { data, error } = await sb
        .from("copilot_sessions")
        .select("id, title, candidate_id, job_id, created_at, updated_at")
        .order("updated_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return new Response(JSON.stringify({ sessions: data }), {
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    // CREATE session
    if (action === "create") {
      const { title, candidateId, jobId } = body;
      const { data, error } = await sb
        .from("copilot_sessions")
        .insert({
          title: title || "New conversation",
          candidate_id: candidateId || null,
          job_id: jobId || null,
        })
        .select("id, title, candidate_id, job_id, created_at, updated_at")
        .single();
      if (error) throw error;
      return new Response(JSON.stringify({ session: data }), {
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    // GET session with messages
    if (action === "get") {
      const { sessionId } = body;
      const { data: sess, error: sessErr } = await sb
        .from("copilot_sessions")
        .select("*")
        .eq("id", sessionId)
        .single();
      if (sessErr) throw sessErr;

      const { data: msgs, error: msgsErr } = await sb
        .from("copilot_messages")
        .select("id, role, content, created_at")
        .eq("session_id", sessionId)
        .order("created_at", { ascending: true });
      if (msgsErr) throw msgsErr;

      return new Response(JSON.stringify({ session: sess, messages: msgs }), {
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    // SAVE messages (append)
    if (action === "saveMessages") {
      const { sessionId, messages } = body;
      if (!sessionId || !messages?.length) {
        return new Response(JSON.stringify({ error: "sessionId and messages required" }), {
          status: 400,
          headers: { ...cors, "Content-Type": "application/json" },
        });
      }

      const rows = messages.map((m: { role: string; content: string }) => ({
        session_id: sessionId,
        role: m.role,
        content: m.content,
      }));

      const { error } = await sb.from("copilot_messages").insert(rows);
      if (error) throw error;

      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    // UPDATE session title
    if (action === "updateTitle") {
      const { sessionId, title } = body;
      const { error } = await sb
        .from("copilot_sessions")
        .update({ title })
        .eq("id", sessionId);
      if (error) throw error;
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    // DELETE session
    if (action === "delete") {
      const { sessionId } = body;
      const { error } = await sb
        .from("copilot_sessions")
        .delete()
        .eq("id", sessionId);
      if (error) throw error;
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("copilot-sessions error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
    });
  }
});
