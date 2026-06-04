import { getCorsHeaders } from "../_shared/cors.ts";
import { getClientIp, isRateLimited, rateLimitResponse } from "../_shared/rate-limit.ts";
import { validateSession } from "../_shared/validate-session.ts";
import { chatCompletion } from "../_shared/ai.ts";

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const ip = getClientIp(req);
    const rl = isRateLimited(`survey-ai-improve:${ip}`, { maxRequests: 30, windowMs: 3600_000 });
    if (rl.limited) return rateLimitResponse(corsHeaders, rl.retryAfterMs);

    // AI calls now route through the shared OpenRouter helper (see ../_shared/ai.ts)

    const body = await req.json();
    const { question_text, question_type, options, action } = body;
    const sessionToken = body.sessionToken || req.headers.get("x-session-token");

    // Require admin session
    const auth = await validateSession(sessionToken, corsHeaders);
    if (!auth.valid) return auth.response;

    if (!question_text || typeof question_text !== "string" || question_text.trim().length < 3) {
      return new Response(JSON.stringify({ error: "Question text too short" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const actionMap: Record<string, string> = {
      improve: "Improve the wording to be clearer, more professional, and better suited for HR surveys. Keep the same intent.",
      simplify: "Simplify the wording. Make it shorter, easier to understand, and more conversational while keeping the intent.",
      formal: "Make the wording more formal and corporate-appropriate for executive-level surveys.",
      friendly: "Rewrite in a warm, friendly, employee-friendly tone. Keep it professional but approachable.",
      candidate: "Rewrite for a candidate-facing survey. Make it welcoming and clear for job applicants.",
    };

    const instruction = actionMap[action] || actionMap.improve;

    const prompt = `You are an HR survey language expert. ${instruction}

Question type: ${question_type || "text"}
Original question: "${question_text}"
${options && options.length > 0 ? `Current options: ${JSON.stringify(options)}` : ""}

Return ONLY valid JSON:
{
  "improved_text": "The improved question text",
  "improved_options": ["Option 1", "Option 2"] or null if not applicable,
  "change_summary": "One sentence describing what changed"
}`;

    const response = await chatCompletion({
      model: "google/gemini-2.5-flash-lite",
      messages: [
        { role: "system", content: "You are an HR survey language expert. Return ONLY valid JSON." },
        { role: "user", content: prompt },
      ],
      hasImages: false,
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded, try again later." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: "AI analysis failed" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await response.json();
    const content = aiData.choices?.[0]?.message?.content || "{}";

    let result;
    try {
      const clean = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      result = JSON.parse(clean);
    } catch {
      return new Response(JSON.stringify({ error: "Failed to parse AI response" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("survey-ai-improve error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
