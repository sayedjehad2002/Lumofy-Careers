import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";

// NOTE: The previous brute-force lockout (5 failures / 15 min, via the in-memory Map and
// the `login_attempts` table) was REMOVED at the team's request — it was locking out the
// legitimate admin. The `login_attempts` table + RPCs still exist in the DB but are no
// longer used here; reintroduce a corrected, less-aggressive limiter if abuse appears.
// The admin password remains the real secret.
const MAX_PASSWORD_LENGTH = 128;

// Single authorized admin email. The password (checked against admin_passwords) is the
// real secret; this just ties sign-in to a known address. Override with the ADMIN_EMAIL
// function secret to change it without editing code.
const ADMIN_EMAIL = (Deno.env.get("ADMIN_EMAIL") ?? "jhasan@lumofy.com").trim().toLowerCase();

// PBKDF2 password hashing (Web Crypto).
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
    const salt = new Uint8Array(parts[1].match(/.{2}/g)!.map(b => parseInt(b, 16)));
    const result = await hashPassword(password, salt);
    return result.hash === parts[2];
  }
  // Legacy bcrypt ($2…) is unsupported in the Deno edge runtime.
  if (storedHash.startsWith("$2")) return false;

  // Legacy SHA-256 (hex) — accepted so a freshly-seeded SHA-256 works; it is upgraded to
  // salted PBKDF2 on the first successful login (below).
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(password));
  const sha256Hash = Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
  return sha256Hash === storedHash;
}

function json(payload: unknown, status: number, corsHeaders: Record<string, string>) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({} as Record<string, unknown>));
    const password = typeof body?.password === "string" ? body.password : "";
    const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";

    if (!password) {
      return json({ success: false, error: "Password is required" }, 400, corsHeaders);
    }
    if (password.length > MAX_PASSWORD_LENGTH) {
      return json({ success: false, error: "Password too long" }, 400, corsHeaders);
    }
    // Email is enforced when supplied. Kept optional so a client that sends only a
    // password (e.g. a not-yet-redeployed build) still works during a staged rollout.
    if (email && email !== ADMIN_EMAIL) {
      return json({ success: false, error: "Invalid credentials" }, 401, corsHeaders);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data, error } = await supabase
      .from("admin_passwords")
      .select("password_hash")
      .eq("label", "default")
      .single();

    if (error || !data) {
      console.error("DB error:", error);
      return json({ success: false, error: "Verification failed" }, 500, corsHeaders);
    }

    const success = await verifyPassword(password, data.password_hash);
    if (!success) {
      return json({ success: false, error: "Invalid credentials" }, 401, corsHeaders);
    }

    // Upgrade a legacy (SHA-256) hash to salted PBKDF2 on first successful login.
    if (!data.password_hash.startsWith("pbkdf2$")) {
      try {
        const { hash, salt } = await hashPassword(password);
        await supabase
          .from("admin_passwords")
          .update({ password_hash: `pbkdf2$${salt}$${hash}` })
          .eq("label", "default");
      } catch (e) {
        console.error("PBKDF2 upgrade failed:", e);
      }
    }

    const sessionToken = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();
    const { error: sessionError } = await supabase
      .from("admin_sessions")
      .insert({ token: sessionToken, expires_at: expiresAt });
    if (sessionError) {
      console.error("Session creation error:", sessionError);
      return json({ success: false, error: "Session creation failed" }, 500, corsHeaders);
    }
    // Best-effort cleanup of expired sessions.
    await supabase.from("admin_sessions").delete().lt("expires_at", new Date().toISOString());

    return json({ success: true, sessionToken }, 200, corsHeaders);
  } catch (err) {
    console.error("Error:", err);
    return json({ success: false, error: "Internal error" }, 500, corsHeaders);
  }
});
