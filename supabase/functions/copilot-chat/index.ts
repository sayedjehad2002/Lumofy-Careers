import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getCorsHeaders } from "../_shared/cors.ts";
import { isRateLimited, rateLimitResponse } from "../_shared/rate-limit.ts";
import { chatCompletion } from "../_shared/ai.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { buildSystemPrompt } from "./system-prompt.ts";
import { fetchAllContext } from "./data-context.ts";

serve(async (req) => {
  const cors = getCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  try {
    const { sessionToken, messages, context } = await req.json();

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const sb = createClient(supabaseUrl, serviceKey);

    // Validate session
    const { data: session } = await sb
      .from("admin_sessions")
      .select("id")
      .eq("token", sessionToken)
      .gt("expires_at", new Date().toISOString())
      .maybeSingle();
    if (!session) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    // Rate limit: 40 copilot messages per hour per session
    const rl = isRateLimited(`copilot-chat:${sessionToken}`, { maxRequests: 40, windowMs: 3_600_000 });
    if (rl.limited) return rateLimitResponse(cors, rl.retryAfterMs);

    // AI requests go through OpenRouter via the shared chatCompletion helper.

    // Fetch all data context
    const { policyContext, contextSections } = await fetchAllContext(sb, context);
    const systemPrompt = buildSystemPrompt(policyContext, contextSections);

    // Check if any message contains images (vision mode)
    const hasImages = messages.some((m: any) => Array.isArray(m.content));
    
    // Use gemini-2.5-pro for vision (multimodal), gpt-5.2 for text-only
    const model = hasImages ? "google/gemini-2.5-pro" : "openai/gpt-5.2";

    const response = await chatCompletion({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        ...messages,
      ],
      stream: true,
      hasImages,
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
          status: 429, headers: { ...cors, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI usage limit reached. Please add credits." }), {
          status: 402, headers: { ...cors, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI service error" }), {
        status: 500, headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...cors, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("copilot-chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
    });
  }
});
