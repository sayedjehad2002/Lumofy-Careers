import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";

// Durable brute-force protection (fix #7): 5 failures per 15-minute window per IP,
// tracked in the `login_attempts` table via SECURITY DEFINER RPCs so the lockout
// survives cold starts and is shared across function instances. The in-memory Map
// below is kept ONLY as a cheap additional first line of defense — the DB-backed
// check is authoritative.
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_WINDOW_SECONDS = 15 * 60; // 15 minutes
const MAX_PASSWORD_LENGTH = 128;

// In-memory rate limiting (best-effort, per-instance only).
const attempts = new Map<string, { count: number; resetAt: number }>();
const IN_MEM_WINDOW_MS = 60 * 60 * 1000; // 1 hour

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const record = attempts.get(ip);
  if (!record || now > record.resetAt) {
    attempts.set(ip, { count: 1, resetAt: now + IN_MEM_WINDOW_MS });
    return false;
  }
  record.count++;
  return record.count > MAX_FAILED_ATTEMPTS;
}

// Use Web Crypto for bcrypt-like password hashing with PBKDF2
async function hashPassword(password: string, salt?: Uint8Array): Promise<{ hash: string; salt: string }> {
  const encoder = new TextEncoder();
  if (!salt) {
    salt = new Uint8Array(16);
    crypto.getRandomValues(salt);
  }
  const keyMaterial = await crypto.subtle.importKey(
    "raw", encoder.encode(password), "PBKDF2", false, ["deriveBits"]
  );
  const derived = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations: 100000, hash: "SHA-256" },
    keyMaterial, 256
  );
  const hashHex = Array.from(new Uint8Array(derived)).map(b => b.toString(16).padStart(2, "0")).join("");
  const saltHex = Array.from(salt).map(b => b.toString(16).padStart(2, "0")).join("");
  return { hash: hashHex, salt: saltHex };
}

async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  // PBKDF2 format: pbkdf2$<salt>$<hash>
  if (storedHash.startsWith("pbkdf2$")) {
    const parts = storedHash.split("$");
    if (parts.length !== 3) return false;
    const saltHex = parts[1];
    const salt = new Uint8Array(saltHex.match(/.{2}/g)!.map(b => parseInt(b, 16)));
    const result = await hashPassword(password, salt);
    return result.hash === parts[2];
  }

  // Legacy bcrypt format (starts with $2) — compare using SHA-256 fallback
  // since bcrypt doesn't work in Deno edge runtime
  if (storedHash.startsWith("$2")) {
    // Can't verify bcrypt without Worker support; fall through to SHA-256
    // This will fail, and the user will need to reset the password
    return false;
  }

  // Legacy SHA-256
  const encoder = new TextEncoder();
  const hashBuffer = await crypto.subtle.digest("SHA-256", encoder.encode(password));
  const sha256Hash = Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return sha256Hash === storedHash;
}

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const ip = (req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()) || req.headers.get("cf-connecting-ip") || "unknown";

    // First line (per-instance, best effort).
    if (isRateLimited(ip)) {
      return new Response(
        JSON.stringify({ success: false, error: "Too many attempts. Try again later." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Authoritative durable lockout check (survives cold starts / multiple instances).
    // If we can't reach the counter we fail OPEN here (the in-memory limiter and the
    // post-failure recording still apply) so a transient DB hiccup can't lock everyone out.
    try {
      const { data: failures, error: failErr } = await supabase.rpc("get_login_failures", {
        p_ip: ip,
        p_window_seconds: LOCKOUT_WINDOW_SECONDS,
      });
      if (!failErr && typeof failures === "number" && failures >= MAX_FAILED_ATTEMPTS) {
        return new Response(
          JSON.stringify({ success: false, error: "Too many failed attempts. Try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    } catch (e) {
      console.error("Lockout check failed (failing open):", e);
    }

    const { password } = await req.json();

    if (!password || typeof password !== "string") {
      return new Response(
        JSON.stringify({ success: false, error: "Password is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (password.length > MAX_PASSWORD_LENGTH) {
      return new Response(
        JSON.stringify({ success: false, error: "Password too long" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data, error } = await supabase
      .from("admin_passwords")
      .select("password_hash")
      .eq("label", "default")
      .single();

    if (error || !data) {
      console.error("DB error:", error);
      return new Response(
        JSON.stringify({ success: false, error: "Verification failed" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const success = await verifyPassword(password, data.password_hash);

    // Auto-migrate legacy hashes to PBKDF2 on success
    if (success && !data.password_hash.startsWith("pbkdf2$")) {
      try {
        const { hash, salt } = await hashPassword(password);
        const pbkdf2Hash = `pbkdf2$${salt}$${hash}`;
        await supabase
          .from("admin_passwords")
          .update({ password_hash: pbkdf2Hash })
          .eq("label", "default");
        console.log("Password auto-migrated to PBKDF2");
      } catch (e) {
        console.error("PBKDF2 migration failed:", e);
      }
    }

    if (success) {
      // Clear durable failure counter for this IP on a successful login.
      try {
        await supabase.rpc("clear_login_failures", { p_ip: ip });
      } catch (e) {
        console.error("clear_login_failures failed:", e);
      }

      const sessionToken = crypto.randomUUID();
      const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();

      const { error: sessionError } = await supabase
        .from("admin_sessions")
        .insert({ token: sessionToken, expires_at: expiresAt });

      if (sessionError) {
        console.error("Session creation error:", sessionError);
        return new Response(
          JSON.stringify({ success: false, error: "Session creation failed" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Cleanup expired sessions
      await supabase
        .from("admin_sessions")
        .delete()
        .lt("expires_at", new Date().toISOString());

      return new Response(
        JSON.stringify({ success: true, sessionToken }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Failed login — record the failure in the durable counter, then return 401.
    try {
      const { data: newCount } = await supabase.rpc("record_login_failure", {
        p_ip: ip,
        p_window_seconds: LOCKOUT_WINDOW_SECONDS,
      });
      // If this failure tips the IP over the threshold, lock it out immediately.
      if (typeof newCount === "number" && newCount >= MAX_FAILED_ATTEMPTS) {
        return new Response(
          JSON.stringify({ success: false, error: "Too many failed attempts. Try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    } catch (e) {
      console.error("record_login_failure failed:", e);
    }

    return new Response(
      JSON.stringify({ success: false, error: "Invalid credentials" }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Error:", err);
    return new Response(
      JSON.stringify({ success: false, error: "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
